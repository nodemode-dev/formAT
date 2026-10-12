import type { AppState, ArtifactRef, ContentBlock, Message } from '../state/app-state';
import type { Composer } from './composer';
import { el, esc, q, setAttr, setText } from './dom';
import { ui } from './icons-ft';
import { StreamRenderer } from './markdown';
import { type Answer, type Approve, ArtifactCard, FileCard, type OpenArtifact, RESULT_TYPES, resultView, TOOL_TYPES, ToolCard, ToolGroup } from './tool-cards';

interface PartApi {
  set(text: string, done: boolean): void;
  value(): string;
}

interface AssistantView {
  root: HTMLElement;
  blocks: HTMLElement;
  parts: Array<{ type: string; api: PartApi } | null>;
  status: HTMLElement;
  actions: HTMLElement;
  group: ToolGroup | null;
  cards: Map<string, { card: ToolCard; group: ToolGroup }>;
  files: Map<string, FileCard>;
  arts: Map<string, ArtifactCard>;
}

export interface ChatHooks {
  retry(): void;
  edit(text: string, id: string): void;
  branch(id: string): void;
  approve: Approve;
  answer: Answer;
  openArtifact: OpenArtifact;
  openFile(path: string): void;
  leaveProject(): void;
  chatId(): string;
}

const NOOP: PartApi = { set: () => undefined, value: () => '' };

function greeting(): string {
  const h = new Date().getHours();
  return h < 5 ? 'Up late?' : h < 12 ? 'Good morning' : h < 18 ? 'Good afternoon' : 'Good evening';
}

export class ChatView {
  readonly root: HTMLElement;
  private scroller: HTMLElement;
  private thread: HTMLElement;
  private note: HTMLElement;
  private toBottom: HTMLButtonElement;
  private nodes = new Map<string, HTMLElement>();
  private assistants = new Map<string, AssistantView>();
  private shownFor: string | null = null;

  constructor(private state: AppState, composer: Composer, private hooks: ChatHooks) {
    this.root = el(`<section class="ft-chat is-empty" aria-label="Conversation">
      <div class="ft-chat-scroll" tabindex="-1">
        <div class="ft-greeting"><span class="ft-greeting-project" aria-hidden="true">${ui('projects', 14)}<span>New chat in <b></b></span><button type="button" aria-label="Start outside the project" title="Start outside the project">${ui('close', 12)}</button></span><span class="ft-greeting-text">${esc(greeting())}</span></div>
        <div class="ft-thread" role="log" aria-live="polite"></div>
        <p class="ft-thread-note" hidden>No reply: add an Anthropic API key in Settings, or install Claude Code and sign in with claude, then retry.</p>
      </div>
      <div class="ft-chat-dock">
        <button type="button" class="ft-to-bottom" aria-label="Scroll to the latest message" hidden>${ui('arrowDown', 16)}</button>
      </div>
    </section>`);
    this.scroller = q(this.root, '.ft-chat-scroll');
    this.thread = q(this.root, '.ft-thread');
    this.note = q(this.root, '.ft-thread-note');
    this.toBottom = q(this.root, '.ft-to-bottom');
    q(this.root, '.ft-chat-dock').appendChild(composer.root);
    this.toBottom.addEventListener('click', () => this.scroller.scrollTo({ top: this.scroller.scrollHeight, behavior: 'smooth' }));
    q(this.root, '.ft-greeting-project button').addEventListener('click', () => this.hooks.leaveProject());
    this.scroller.addEventListener('scroll', () => this.updateToBottom(), { passive: true });
    this.thread.addEventListener('click', (e) => {
      const btn = (e.target as HTMLElement).closest<HTMLButtonElement>('.ft-code-copy');
      if (!btn) return;
      const code = btn.closest('.ft-code')?.querySelector('code')?.textContent ?? '';
      void navigator.clipboard?.writeText(code).then(() => { btn.textContent = 'Copied'; window.setTimeout(() => { btn.textContent = 'Copy'; }, 1500); });
    });
    state.on('messages', () => this.render());
    state.on('active', () => this.render());
    state.on('running', () => this.render());
  }

  setDraftProject(name: string | null): void {
    const chip = q(this.root, '.ft-greeting-project');
    setText(q(chip, 'b'), name ?? '');
    chip.classList.toggle('is-on', !!name);
    setAttr(chip, 'aria-hidden', name ? null : 'true');
  }

  private nearBottom(): boolean {
    return this.scroller.scrollHeight - this.scroller.scrollTop - this.scroller.clientHeight < 48;
  }

  private updateToBottom(): void {
    const hide = this.nearBottom() || this.state.messages.length === 0;
    if (this.toBottom.hidden !== hide) this.toBottom.hidden = hide;
  }

  private node(m: Message): HTMLElement {
    let n = this.nodes.get(m.id);
    if (n) return n;
    if (m.role === 'user') {
      const text = m.content.filter((b) => b.type === 'text').map((b) => b.text ?? '').join('\n\n');
      const files = m.meta?.files ?? [];
      const notes = m.meta?.comments ?? [];
      n = el(`<article class="ft-msg is-user" data-id="${esc(m.id)}">
        ${files.length ? `<div class="ft-msg-files">${files.map((f) => `<span class="ft-file-chip" title="${esc(f.name)}"><span class="ft-file-chip-name">${esc(f.name)}</span><span class="ft-file-chip-kind">${esc(f.kind.toUpperCase())}</span></span>`).join('')}</div>` : ''}
        ${notes.length ? `<div class="ft-msg-comments">${notes.map((c) => `<button type="button" class="ft-comment-card" data-path="${esc(c.path)}" title="Open ${esc(c.path)}"><span class="ft-comment-file">${ui('comment', 14)}<span>${esc(c.path.startsWith('artifact:') ? (c.path.split('#')[1] || 'Document') : c.path)}</span></span>${c.quote ? `<span class="ft-comment-quote">${esc(c.quote.slice(0, 280))}</span>` : ''}<span class="ft-comment-note">${esc(c.note)}</span></button>`).join('')}</div>` : ''}
        <div class="ft-msg-bubble"><div class="ft-msg-body"></div></div>
        <div class="ft-msg-tools"><span class="ft-branch" hidden><button type="button" class="ft-icon-btn ft-branch-prev" title="Previous version" aria-label="Previous version">${ui('chevronLeft', 14)}</button><span class="ft-branch-count"></span><button type="button" class="ft-icon-btn ft-branch-next" title="Next version" aria-label="Next version">${ui('chevronRight', 14)}</button></span>
        <button type="button" class="ft-icon-btn ft-msg-edit" title="Edit" aria-label="Edit this message">${ui('pencil', 16)}</button></div></article>`);
      q(n, '.ft-msg-body').textContent = text;
      const id = m.id;
      q(n, '.ft-msg-edit').addEventListener('click', () => this.hooks.edit(text, id));
      n.querySelectorAll<HTMLElement>('.ft-comment-card').forEach((c) => c.addEventListener('click', () => this.hooks.openFile(c.dataset.path as string)));
      const step = (d: number): void => {
        const b = this.state.messages.find((x) => x.id === id)?.branch;
        const to = b?.ids[b.index + d];
        if (to) this.hooks.branch(to);
      };
      q(n, '.ft-branch-prev').addEventListener('click', () => step(-1));
      q(n, '.ft-branch-next').addEventListener('click', () => step(1));
      if (!text) (q(n, '.ft-msg-bubble') as HTMLElement).hidden = true;
    } else if (m.meta?.compaction) {
      n = el(`<article class="ft-msg is-compaction" data-id="${esc(m.id)}"><div class="ft-compact-line"><span class="ft-compact-rule"></span><span class="ft-compact-label"></span><span class="ft-compact-rule"></span></div>
        <details class="ft-compact-body" hidden><summary>Show the summary</summary><div class="ft-compact-text"></div></details></article>`);
      this.nodes.set(m.id, n);
      this.paintCompaction(n, m);
      return n;
    } else {
      n = el(`<article class="ft-msg is-assistant" data-id="${esc(m.id)}"><div class="ft-msg-blocks"></div><div class="ft-msg-status" hidden></div>
        <div class="ft-msg-actions" hidden>
          <button type="button" class="ft-icon-btn ft-act-copy" title="Copy" aria-label="Copy reply">${ui('copy', 16)}</button>
          <button type="button" class="ft-icon-btn ft-act-retry" title="Retry" aria-label="Retry reply">${ui('retry', 16)}</button>
          <span class="ft-msg-model"></span>
        </div></article>`);
      const view: AssistantView = { root: n, blocks: q(n, '.ft-msg-blocks'), parts: [], status: q(n, '.ft-msg-status'), actions: q(n, '.ft-msg-actions'), group: null, cards: new Map(), files: new Map(), arts: new Map() };
      this.assistants.set(m.id, view);
      q(n, '.ft-act-copy').addEventListener('click', () => void navigator.clipboard?.writeText(this.plainText(m.id)));
      q(n, '.ft-act-retry').addEventListener('click', () => this.hooks.retry());
      m.content.forEach((b, i) => this.ensurePart(view, i, b.type, b).set(b.type === 'thinking' ? b.thinking ?? '' : b.text ?? '', m.meta?.status !== 'streaming'));
      this.applyStatuses(view, m);
      this.finishView(m);
    }
    this.nodes.set(m.id, n);
    return n;
  }

  private applyStatuses(view: AssistantView, m: Message): void {
    for (const [parent, a] of Object.entries(m.meta?.agents ?? {})) {
      a.blocks.forEach((b, i) => this.nested(view, parent, i, RESULT_TYPES.has(b.type) ? resultView(b) : b));
    }
    for (const [id, s] of Object.entries(m.meta?.tools ?? {})) {
      view.cards.get(id)?.card.setStatus(s.status);
      if (s.status !== 'done') view.files.get(id)?.setStatus(s.status);
    }
    for (const [id, a] of Object.entries(m.meta?.answers ?? {})) view.cards.get(id)?.card.setAnswer(a);
    for (const [id, a] of Object.entries(m.meta?.artifacts ?? {})) view.arts.get(id)?.setArtifact(a);
  }

  artifactPublished(id: string, toolUseId: string, ref: ArtifactRef): void {
    const m = this.state.messages.find((x) => x.id === id);
    if (m) m.meta.artifacts = { ...(m.meta.artifacts ?? {}), [toolUseId]: ref };
    this.assistants.get(id)?.arts.get(toolUseId)?.setArtifact(ref);
  }

  private ensurePart(view: AssistantView, index: number, type: string, block?: ContentBlock): { set(text: string, done: boolean): void } {
    while (view.parts.length <= index) view.parts.push(null);
    const existing = view.parts[index];
    if (type === 'tool_use' && block?.name === 'send_file' && block.id) {
      const known = view.files.get(block.id);
      if (known) { known.update(block); return NOOP; }
      const file = new FileCard(block, this.hooks.chatId(), this.hooks.openFile);
      view.group = null;
      view.blocks.appendChild(file.root);
      view.files.set(block.id, file);
      view.parts[index] = { type, api: NOOP };
      return NOOP;
    }
    if (type === 'tool_use' && block?.name === 'write_document' && block.id && !view.arts.has(block.id) && !view.cards.has(block.id)
        && !Object.keys((block.input as Record<string, unknown> | undefined) ?? {}).length) {
      return NOOP;
    }
    if (type === 'tool_use' && block?.id && (block.name === 'publish_artifact' || (block.name === 'write_document' && !(block.input as Record<string, unknown> | undefined)?.artifact_id))) {
      const known = view.arts.get(block.id);
      if (known) { known.update(block); return NOOP; }
      const card = new ArtifactCard(block, this.hooks.openArtifact);
      view.group = null;
      view.blocks.appendChild(card.root);
      view.arts.set(block.id, card);
      view.parts[index] = { type, api: NOOP };
      return NOOP;
    }
    if (TOOL_TYPES.has(type) && block?.id) {
      const known = view.cards.get(block.id);
      if (known) { known.card.update(block); return NOOP; }
      if (!view.group) {
        view.group = new ToolGroup();
        view.blocks.appendChild(view.group.root);
      }
      const group = view.group;
      const card = new ToolCard(block, this.hooks.approve, () => group.refresh(), this.hooks.answer);
      group.add(card);
      view.cards.set(block.id, { card, group });
      view.parts[index] = { type, api: NOOP };
      return NOOP;
    }
    if (RESULT_TYPES.has(type)) {
      if (block?.tool_use_id) {
        view.cards.get(block.tool_use_id)?.card.setResult(resultView(block));
        view.files.get(block.tool_use_id)?.setResult(resultView(block));
        view.arts.get(block.tool_use_id)?.setResult(resultView(block));
      }
      view.parts[index] = { type, api: NOOP };
      return NOOP;
    }
    if (existing) return existing.api;
    view.group = null;
    if (type === 'thinking') {
      const box = el(`<details class="ft-thinking"><summary><span>Thinking</span></summary><div class="ft-thinking-body"></div></details>`);
      const body = q(box, '.ft-thinking-body');
      const text = document.createTextNode('');
      body.appendChild(text);
      view.blocks.appendChild(box);
      const api = { set: (t: string) => { if (text.data !== t) text.data = t; box.hidden = !t; }, value: () => '' };
      view.parts[index] = { type, api };
      box.hidden = true;
      return api;
    }
    if (type !== 'text') {
      const note = el(`<div class="ft-block-note">${esc(type.replace(/_/g, ' '))}</div>`);
      view.blocks.appendChild(note);
      const api = { set: () => undefined, value: () => '' };
      view.parts[index] = { type, api };
      return api;
    }
    const r = new StreamRenderer();
    view.blocks.appendChild(r.root);
    const api = { set: (t: string, done: boolean) => r.set(t, done), value: () => r.value };
    view.parts[index] = { type, api };
    return api;
  }

  private plainText(id: string): string {
    const view = this.assistants.get(id);
    return view ? view.parts.filter((p) => p?.type === 'text').map((p) => p!.api.value()).join('\n\n') : '';
  }

  private finishView(m: Message): void {
    const view = this.assistants.get(m.id);
    if (!view) return;
    const status = m.meta?.status;
    const streaming = status === 'streaming';
    view.root.classList.toggle('is-streaming', streaming);
    if (view.actions.hidden !== streaming) view.actions.hidden = streaming;
    setText(q(view.actions, '.ft-msg-model'), `${m.meta?.model ?? ''}${(m.meta as { research?: boolean } | undefined)?.research ? ' · research' : ''}`);
    const note = status === 'error' ? (m.meta.error ?? 'The reply failed') : status === 'stopped' ? 'Stopped' : '';
    view.status.classList.toggle('is-error', status === 'error');
    setText(view.status, note);
    if (view.status.hidden === !note) return;
    view.status.hidden = !note;
  }

  applyDelta(id: string, index: number, kind: string, text: string): void {
    const view = this.assistants.get(id);
    const m = this.state.messages.find((x) => x.id === id);
    if (!view || !m) return;
    while (m.content.length <= index) m.content.push({ type: kind === 'thinking' ? 'thinking' : 'text', text: '' });
    const block = m.content[index];
    if (kind === 'thinking') block.thinking = (block.thinking ?? '') + text;
    else block.text = (block.text ?? '') + text;
    const stick = this.nearBottom();
    this.ensurePart(view, index, block.type).set(kind === 'thinking' ? block.thinking ?? '' : block.text ?? '', false);
    if (stick) this.scroller.scrollTop = this.scroller.scrollHeight;
  }

  private nested(view: AssistantView, parent: string, index: number, block: ContentBlock): void {
    const owner = view.cards.get(parent);
    if (!owner) return;
    const agent = owner.card;
    if (block.type === 'text') { agent.agentText(index, block.text ?? ''); return; }
    if (RESULT_TYPES.has(block.type)) {
      if (block.tool_use_id) view.cards.get(block.tool_use_id)?.card.setResult(resultView(block));
      return;
    }
    if (!TOOL_TYPES.has(block.type) || !block.id) return;
    const known = view.cards.get(block.id);
    if (known) { known.card.update(block); return; }
    const group = agent.agentSteps();
    const outer = owner.group;
    let made: ToolCard | null = null;
    const card = new ToolCard(block, this.hooks.approve, () => {
      group.refresh();
      if (made && (made.status === 'waiting' || made.status === 'asking') && !outer.root.open) outer.root.open = true;
    }, this.hooks.answer);
    made = card;
    group.add(card);
    view.cards.set(block.id, { card, group });
  }

  applyBlock(id: string, index: number, block: ContentBlock, parent?: string): void {
    const view = this.assistants.get(id);
    const m = this.state.messages.find((x) => x.id === id);
    if (!view || !m) return;
    if (parent) {
      const stick = this.nearBottom();
      this.nested(view, parent, index, block);
      if (stick) this.scroller.scrollTop = this.scroller.scrollHeight;
      return;
    }
    while (m.content.length <= index) m.content.push({ type: 'text', text: '' });
    const known = m.content[index];
    m.content[index] = TOOL_TYPES.has(block.type) || RESULT_TYPES.has(block.type) ? { ...block } : known && known.type === block.type ? known : { type: block.type, text: '', thinking: '' };
    const stick = this.nearBottom();
    this.ensurePart(view, index, block.type, block);
    if (stick) this.scroller.scrollTop = this.scroller.scrollHeight;
  }

  toolStatus(id: string, toolUseId: string, status: string): void {
    const m = this.state.messages.find((x) => x.id === id);
    if (m) m.meta.tools = { ...(m.meta.tools ?? {}), [toolUseId]: { status } };
    this.assistants.get(id)?.cards.get(toolUseId)?.card.setStatus(status);
    if (status !== 'done') this.assistants.get(id)?.files.get(toolUseId)?.setStatus(status);
    this.assistants.get(id)?.arts.get(toolUseId)?.setStatus(status);
  }

  toolOutput(id: string, toolUseId: string, text: string): void {
    const stick = this.nearBottom();
    this.assistants.get(id)?.cards.get(toolUseId)?.card.appendOutput(text);
    if (stick) this.scroller.scrollTop = this.scroller.scrollHeight;
  }

  private paintCompaction(n: HTMLElement, m: Message): void {
    const status = m.meta?.status;
    const summary = m.content.find((b) => b.type === 'compaction') as { content?: string } | undefined;
    const label = status === 'streaming' ? 'Summarizing earlier messages' : status === 'done' ? 'Earlier messages summarized; Claude continues from the summary'
      : status === 'stopped' ? 'Summary stopped' : (m.meta?.error ?? 'Earlier messages were not summarized');
    n.classList.toggle('is-streaming', status === 'streaming');
    n.classList.toggle('is-error', status === 'error');
    setText(q(n, '.ft-compact-label'), label);
    const body = q(n, '.ft-compact-body') as HTMLDetailsElement;
    const text = summary?.content ?? '';
    setText(q(body, '.ft-compact-text'), text);
    if (body.hidden === !!text) body.hidden = !text;
  }

  complete(m: Message): void {
    const shown = this.nodes.get(m.id);
    if (shown && m.meta?.compaction) {
      this.paintCompaction(shown, m);
      this.render();
      return;
    }
    const view = this.assistants.get(m.id);
    if (!view) return;
    m.content.forEach((b, i) => this.ensurePart(view, i, b.type, b).set(b.type === 'thinking' ? b.thinking ?? '' : b.text ?? '', true));
    this.applyStatuses(view, m);
    this.finishView(m);
    this.render();
  }

  private render(): void {
    const switching = this.shownFor !== this.state.activeId;
    const stick = switching || this.nearBottom();
    if (switching) {
      this.nodes.forEach((n) => n.remove());
      this.nodes.clear();
      this.assistants.clear();
      this.shownFor = this.state.activeId;
    }
    const msgs = this.state.messages;
    const live = new Set(msgs.map((m) => m.id));
    for (const [id, n] of this.nodes) if (!live.has(id)) { n.remove(); this.nodes.delete(id); this.assistants.delete(id); }
    msgs.forEach((m, i) => {
      const n = this.node(m);
      if (this.thread.children[i] !== n) this.thread.insertBefore(n, this.thread.children[i] ?? null);
    });
    const busy = !!this.state.activeId && this.state.running.has(this.state.activeId);
    for (const m of msgs) {
      if (m.role !== 'user') continue;
      const n = this.nodes.get(m.id);
      const btn = n?.querySelector<HTMLButtonElement>('.ft-msg-edit');
      if (!n || !btn) continue;
      if (btn.disabled !== busy) btn.disabled = busy;
      const pager = q(n, '.ft-branch');
      const b = m.branch;
      const showPager = !!b && b.count > 1;
      if (pager.hidden === showPager) pager.hidden = !showPager;
      if (!b) continue;
      setText(q(pager, '.ft-branch-count'), `${b.index + 1} / ${b.count}`);
      const prev = q(pager, '.ft-branch-prev') as HTMLButtonElement, next = q(pager, '.ft-branch-next') as HTMLButtonElement;
      if (prev.disabled !== (busy || b.index === 0)) prev.disabled = busy || b.index === 0;
      if (next.disabled !== (busy || b.index === b.count - 1)) next.disabled = busy || b.index === b.count - 1;
    }
    const empty = msgs.length === 0;
    this.root.classList.toggle('is-empty', empty);
    const last = msgs[msgs.length - 1];
    const showNote = !!last && last.role === 'user' && !this.state.route();
    if (this.note.hidden === showNote) this.note.hidden = !showNote;
    if (stick) this.scroller.scrollTop = this.scroller.scrollHeight;
    this.updateToBottom();
  }
}
