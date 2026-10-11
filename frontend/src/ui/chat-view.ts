import type { AppState, Message } from '../state/app-state';
import type { Composer } from './composer';
import { el, esc, q, setText } from './dom';
import { ui } from './icons-ft';
import { StreamRenderer } from './markdown';

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
}

export interface ChatHooks {
  retry(): void;
}

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
        <div class="ft-greeting"><span class="ft-greeting-text">${esc(greeting())}</span></div>
        <div class="ft-thread" role="log" aria-live="polite"></div>
        <p class="ft-thread-note" hidden>No reply: add an Anthropic API key in Settings, then retry.</p>
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
    this.scroller.addEventListener('scroll', () => this.updateToBottom(), { passive: true });
    this.thread.addEventListener('click', (e) => {
      const btn = (e.target as HTMLElement).closest<HTMLButtonElement>('.ft-code-copy');
      if (!btn) return;
      const code = btn.closest('.ft-code')?.querySelector('code')?.textContent ?? '';
      void navigator.clipboard?.writeText(code).then(() => { btn.textContent = 'Copied'; window.setTimeout(() => { btn.textContent = 'Copy'; }, 1500); });
    });
    state.on('messages', () => this.render());
    state.on('active', () => this.render());
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
      n = el(`<article class="ft-msg is-user" data-id="${esc(m.id)}">
        ${files.length ? `<div class="ft-msg-files">${files.map((f) => `<span class="ft-file-chip" title="${esc(f.name)}"><span class="ft-file-chip-name">${esc(f.name)}</span><span class="ft-file-chip-kind">${esc(f.kind.toUpperCase())}</span></span>`).join('')}</div>` : ''}
        <div class="ft-msg-bubble"><div class="ft-msg-body"></div></div></article>`);
      q(n, '.ft-msg-body').textContent = text;
      if (!text) (q(n, '.ft-msg-bubble') as HTMLElement).hidden = true;
    } else {
      n = el(`<article class="ft-msg is-assistant" data-id="${esc(m.id)}"><div class="ft-msg-blocks"></div><div class="ft-msg-status" hidden></div>
        <div class="ft-msg-actions" hidden>
          <button type="button" class="ft-icon-btn ft-act-copy" title="Copy" aria-label="Copy reply">${ui('copy', 16)}</button>
          <button type="button" class="ft-icon-btn ft-act-retry" title="Retry" aria-label="Retry reply">${ui('retry', 16)}</button>
          <span class="ft-msg-model"></span>
        </div></article>`);
      const view: AssistantView = { root: n, blocks: q(n, '.ft-msg-blocks'), parts: [], status: q(n, '.ft-msg-status'), actions: q(n, '.ft-msg-actions') };
      this.assistants.set(m.id, view);
      q(n, '.ft-act-copy').addEventListener('click', () => void navigator.clipboard?.writeText(this.plainText(m.id)));
      q(n, '.ft-act-retry').addEventListener('click', () => this.hooks.retry());
      m.content.forEach((b, i) => this.ensurePart(view, i, b.type).set(b.type === 'thinking' ? b.thinking ?? '' : b.text ?? '', m.meta?.status !== 'streaming'));
      this.finishView(m);
    }
    this.nodes.set(m.id, n);
    return n;
  }

  private ensurePart(view: AssistantView, index: number, type: string): { set(text: string, done: boolean): void } {
    while (view.parts.length <= index) view.parts.push(null);
    const existing = view.parts[index];
    if (existing) return existing.api;
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
    setText(q(view.actions, '.ft-msg-model'), m.meta?.model ?? '');
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

  applyBlock(id: string, index: number, type: string): void {
    const view = this.assistants.get(id);
    const m = this.state.messages.find((x) => x.id === id);
    if (!view || !m) return;
    while (m.content.length <= index) m.content.push({ type: 'text', text: '' });
    m.content[index] = { type, text: '', thinking: '' };
    this.ensurePart(view, index, type);
  }

  complete(m: Message): void {
    const view = this.assistants.get(m.id);
    if (!view) return;
    m.content.forEach((b, i) => this.ensurePart(view, i, b.type).set(b.type === 'thinking' ? b.thinking ?? '' : b.text ?? '', true));
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
    const empty = msgs.length === 0;
    this.root.classList.toggle('is-empty', empty);
    const last = msgs[msgs.length - 1];
    const showNote = !!last && last.role === 'user' && !this.state.anthropicKey;
    if (this.note.hidden === showNote) this.note.hidden = !showNote;
    if (stick) this.scroller.scrollTop = this.scroller.scrollHeight;
    this.updateToBottom();
  }
}
