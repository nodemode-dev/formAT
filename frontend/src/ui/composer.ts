import { run } from '../engine-client/api';
import type { AppState, FileComment, FileInfo, Settings } from '../state/app-state';
import { el, esc, modKey, q, setAttr, setText } from './dom';
import { ui } from './icons-ft';
import { closeMenus, openMenu, type MenuItem } from './menu';
import { Dictation } from './dictation';

export interface ComposerHooks {
  send(text: string, files: FileInfo[], comments: FileComment[]): Promise<void>;
  edit(text: string, id: string): Promise<void>;
  stop(): void;
  isRunning(): boolean;
  openCustomize(): void;
  openKeys(): void;
}

interface Pending {
  key: string;
  name: string;
  file?: FileInfo;
  comment?: FileComment;
  error?: string;
  card?: HTMLElement;
}

const EFFORT_LABEL: Record<string, string> = { low: 'Low', medium: 'Medium', high: 'High', xhigh: 'Extra', max: 'Max' };
const MODES: Array<[string, string, string]> = [
  ['ask', 'Ask', 'Asks before each tool runs'],
  ['auto', 'Allow all', 'Runs every tool without asking, and allows anything already waiting'],
  ['plan', 'Plan', 'Plans first, changes nothing until you approve'],
];

export class Composer {
  readonly root: HTMLElement;
  private input: HTMLTextAreaElement;
  private sendBtn: HTMLButtonElement;
  private modelBtn: HTMLButtonElement;
  private modeBtn: HTMLButtonElement;
  private slash: HTMLElement | null = null;
  private notice: HTMLElement;
  private attachRow: HTMLElement;
  private files: Pending[] = [];
  private research = false;
  private output: 'doc' | 'sheet' | 'deck' | null = null;
  private picker: HTMLInputElement;
  private queueRow: HTMLElement;
  private queued: Array<{ text: string; files: FileInfo[]; comments: FileComment[] }> = [];
  private micBtn: HTMLButtonElement;
  private dictation: Dictation;
  private seq = 0;
  private editBar!: HTMLElement;
  private contextEl!: HTMLElement;
  private editing = false;
  private editId = '';

  startEdit(text: string, id: string): void {
    this.editing = true;
    this.editId = id;
    this.editBar.hidden = false;
    this.input.value = text;
    this.autosize();
    this.input.focus();
  }

  private cancelEdit(): void {
    this.editing = false;
    this.editBar.hidden = true;
    this.input.value = '';
    this.autosize();
  }

  get researchOn(): boolean {
    return this.research;
  }

  setResearch(on: boolean): void {
    this.research = on;
    const pill = q(this.root, '.ft-research-pill');
    if (pill.hidden === on) pill.hidden = !on;
    this.input.focus();
  }

  setContext(text: string, title: string, high: boolean): void {
    this.contextEl.classList.toggle('is-empty', !text);
    setText(this.contextEl, text);
    setAttr(this.contextEl, 'title', title);
    this.contextEl.classList.toggle('is-high', high);
  }

  constructor(private state: AppState, private hooks: ComposerHooks) {
    this.root = el(`<div class="ft-composer">
      <div class="ft-queue" hidden></div>
      <div class="ft-editing" hidden><span>Editing a message; sending adds a new version and keeps the old one.</span><button type="button" class="ft-text-btn ft-edit-cancel">Cancel</button></div>
      <div class="ft-composer-box">
        <div class="ft-attach-row" hidden></div>
        <textarea class="ft-composer-input" rows="1" placeholder="How can Format help?" aria-label="Message"></textarea>
        <div class="ft-composer-send-row"><button type="button" class="ft-send" aria-label="Send" title="Send (Enter)" disabled>${ui('send')}</button></div>
      </div>
      <div class="ft-composer-bar">
        <div class="ft-bar-left">
          <button type="button" class="ft-icon-btn ft-plus" data-menu-anchor aria-label="Add" title="Add files, skills, connectors">${ui('plus')}</button>
          <button type="button" class="ft-icon-btn ft-mic" aria-label="Dictation" aria-pressed="false" title="Dictation">${ui('mic')}</button>
          <button type="button" class="ft-pill ft-output-pill" title="The answer comes as this kind of artifact. Click to turn it off." hidden>${ui('file', 14)}<span></span>${ui('close', 12)}</button>
          <button type="button" class="ft-pill ft-research-pill" title="Research mode is on: Claude searches and reads many sources and writes a cited report. Click to turn it off." hidden>${ui('research', 14)}<span>Research</span>${ui('close', 12)}</button>
        </div>
        <div class="ft-bar-notice"></div>
        <div class="ft-bar-right">
          <span class="ft-context is-empty"></span>
          <button type="button" class="ft-text-btn ft-model" data-menu-anchor aria-label="Model and effort"><span class="ft-model-name"></span><span class="ft-muted ft-model-effort"></span>${ui('chevronDown', 14)}</button>
          <button type="button" class="ft-text-btn ft-mode" data-menu-anchor aria-label="Permission mode"></button>
        </div>
      </div>
      <input type="file" class="ft-hidden-file" multiple hidden>
    </div>`);
    this.input = q(this.root, '.ft-composer-input');
    this.sendBtn = q(this.root, '.ft-send');
    this.modelBtn = q(this.root, '.ft-model');
    this.modeBtn = q(this.root, '.ft-mode');
    this.notice = q(this.root, '.ft-bar-notice');
    this.attachRow = q(this.root, '.ft-attach-row');
    this.picker = q(this.root, '.ft-hidden-file');
    this.queueRow = q(this.root, '.ft-queue');
    this.micBtn = q(this.root, '.ft-mic');
    this.dictation = new Dictation(() => this.state.account.voiceLanguage, {
      state: (on, label) => {
        this.micBtn.classList.toggle('is-live', on);
        setAttr(this.micBtn, 'aria-pressed', String(on));
        setAttr(this.micBtn, 'title', label);
      },
      text: (t) => this.insertText(t),
      error: (msg) => this.flash(msg),
    }, () => this.state.account.voiceEngine ?? 'auto');
    this.micBtn.addEventListener('click', () => this.dictation.toggle());
    q(this.root, '.ft-research-pill').addEventListener('click', () => this.setResearch(false));
    q(this.root, '.ft-output-pill').addEventListener('click', () => this.setOutput(null));
    this.editBar = q(this.root, '.ft-editing');
    this.contextEl = q(this.root, '.ft-context');
    q(this.root, '.ft-edit-cancel').addEventListener('click', () => this.cancelEdit());
    this.input.addEventListener('paste', (e) => {
      const files = [...(e.clipboardData?.files ?? [])];
      if (!files.length) return;
      e.preventDefault();
      this.addFiles(files);
    });
    this.input.addEventListener('input', () => {
      this.autosize();
      if (this.input.value === '/') this.slashMenu();
      else if (this.slash?.isConnected && !/^\/[a-z0-9-]*$/i.test(this.input.value)) closeMenus();
    });
    this.input.addEventListener('keydown', (e) => {
      if (this.slash?.isConnected && (e.key === 'ArrowDown' || e.key === 'ArrowUp' || e.key === 'Tab')) {
        e.preventDefault();
        this.slash.querySelector<HTMLButtonElement>('.ft-menu-item')?.focus();
        return;
      }
      if (e.key === 'Enter' && !e.isComposing && this.slash?.isConnected && /^\/[a-z0-9-]*$/i.test(this.input.value)) {
        const typed = this.input.value.slice(1).toLowerCase();
        const hit = this.state.skills.find((s) => s.enabled && s.name.startsWith(typed));
        if (hit) { e.preventDefault(); closeMenus(); this.pickSlash(hit.name); return; }
      }
      if (e.key !== 'Enter' || e.isComposing) return;
      const modWanted = this.state.account.sendKey === 'modEnter';
      const mod = e.metaKey || e.ctrlKey;
      if (e.shiftKey || (modWanted && !mod)) return;
      e.preventDefault();
      void this.submit();
    });
    this.sendBtn.addEventListener('click', () => {
      if (this.hooks.isRunning() && !this.input.value.trim()) this.hooks.stop();
      else void this.submit();
    });
    this.queueRow.addEventListener('click', (e) => {
      const t = e.target as HTMLElement;
      const row = t.closest<HTMLElement>('[data-q]');
      if (!row) return;
      const i = Number(row.dataset.q);
      if (t.closest('.ft-queue-now')) this.hooks.stop();
      else if (t.closest('.ft-queue-x')) { this.queued.splice(i, 1); this.renderQueue(); }
    });
    state.on('running', () => this.renderRunning());
    state.on('keys', () => this.renderSettings());
    q(this.root, '.ft-plus').addEventListener('click', (e) => this.plusMenu(e.currentTarget as HTMLElement));
    this.modelBtn.addEventListener('click', () => this.modelMenu());
    this.modeBtn.addEventListener('click', () => this.modeMenu());
    this.picker.addEventListener('change', () => {
      this.addFiles([...(this.picker.files ?? [])]);
      this.picker.value = '';
    });
    this.root.addEventListener('dragover', (e) => e.preventDefault());
    this.root.addEventListener('drop', (e) => {
      e.preventDefault();
      this.addFiles([...(e.dataTransfer?.files ?? [])]);
    });
    state.on('settings', () => this.renderSettings());
    state.on('active', () => this.renderSettings());
    state.on('conversations', () => this.renderSettings());
  }

  focus(): void {
    this.input.focus();
  }

  openFilePicker(): void {
    this.picker.click();
  }

  private autosize(): void {
    this.input.style.height = 'auto';
    this.input.style.height = `${Math.min(this.input.scrollHeight, 240)}px`;
    this.renderRunning();
  }

  private insertText(t: string): void {
    const start = this.input.selectionStart ?? this.input.value.length;
    const end = this.input.selectionEnd ?? start;
    const before = this.input.value.slice(0, start);
    const glue = before && !/\s$/.test(before) ? ' ' : '';
    this.input.setRangeText(glue + t, start, end, 'end');
    this.autosize();
    this.input.focus();
  }

  showError(msg: string): void {
    this.flash(msg);
  }

  private flash(msg: string): void {
    setText(this.notice, msg);
    this.notice.classList.add('is-alert');
    window.setTimeout(() => { this.notice.classList.remove('is-alert'); this.renderSettings(); }, 6000);
  }

  renderRunning(): void {
    const running = this.hooks.isRunning();
    const typed = !!this.input.value.trim();
    const uploading = this.files.some((f) => !f.file && !f.error);
    const stopMode = running && !typed;
    this.sendBtn.classList.toggle('is-stop', stopMode);
    setAttr(this.sendBtn, 'aria-label', stopMode ? 'Stop' : running ? 'Queue message' : 'Send');
    setAttr(this.sendBtn, 'title', stopMode ? 'Stop the reply' : running ? 'Queue (sends when the reply finishes)' : 'Send (Enter)');
    const want = stopMode ? 'stop' : 'send';
    if (this.sendBtn.dataset.icon !== want) { this.sendBtn.dataset.icon = want; this.sendBtn.innerHTML = ui(want); }
    this.sendBtn.disabled = !stopMode && (!(typed || this.files.some((f) => f.file || f.comment)) || uploading);
  }

  private slashMenu(): void {
    const on = this.state.skills.filter((s) => s.enabled);
    if (!on.length) return;
    this.slash = openMenu(this.input, on.map((s) => ({ label: `/${s.name}`, desc: s.description.slice(0, 90), icon: 'skills' as const, action: () => this.pickSlash(s.name) })), 'up', 0, 'Skills');
  }

  private pickSlash(name: string): void {
    this.input.value = `/${name} ${this.input.value.replace(/^\/[a-z0-9-]*\s?/i, '')}`;
    this.input.setSelectionRange(this.input.value.length, this.input.value.length);
    this.autosize();
    this.input.focus();
  }

  private useSkill(name: string): void {
    const lead = `Use the ${name} skill. `;
    if (!this.input.value.startsWith(lead)) this.input.value = lead + this.input.value;
    this.input.setSelectionRange(this.input.value.length, this.input.value.length);
    this.autosize();
    this.input.focus();
  }

  addComment(c: FileComment): void {
    const name = c.path.startsWith('artifact:') ? (c.path.split('#')[1] || 'the document') : (c.path.split('/').pop() || c.path);
    this.files.push({ key: `c${++this.seq}`, name: `Comment on ${name}`, comment: c });
    this.renderFiles();
    this.renderRunning();
    this.input.focus();
  }

  dropComments(): void {
    if (!this.files.some((f) => f.comment)) return;
    this.files = this.files.filter((f) => !f.comment);
    this.renderFiles();
    this.renderRunning();
  }

  private async submit(): Promise<void> {
    const text = this.input.value.trim();
    const files = this.files.filter((f) => f.file).map((f) => f.file as FileInfo);
    const comments = this.files.filter((f) => f.comment).map((f) => f.comment as FileComment);
    if ((!text && !files.length && !comments.length) || this.files.some((f) => !f.file && !f.comment && !f.error)) return;
    if (this.editing) {
      if (!text || this.hooks.isRunning()) return;
      this.editing = false;
      this.editBar.hidden = true;
      this.input.value = '';
      this.autosize();
      await this.hooks.edit(text, this.editId);
      return;
    }
    this.input.value = '';
    this.files = [];
    this.renderFiles();
    this.autosize();
    if (this.hooks.isRunning()) {
      this.queued.push({ text, files, comments });
      this.renderQueue();
      return;
    }
    await this.hooks.send(text, files, comments);
  }

  nextQueued(): { text: string; files: FileInfo[]; comments: FileComment[] } | undefined {
    const next = this.queued.shift();
    this.renderQueue();
    return next;
  }

  private renderQueue(): void {
    this.queueRow.hidden = this.queued.length === 0;
    this.queueRow.innerHTML = this.queued.map((m, i) => `<div class="ft-queue-row" data-q="${i}"><span class="ft-queue-text">${esc(m.text || (m.files.length ? `${m.files.length} file(s)` : `${m.comments.length} comment(s)`))}</span>${i === 0 ? '<button type="button" class="ft-text-btn ft-queue-now">Send now</button>' : ''}<button type="button" class="ft-icon-btn ft-queue-x" aria-label="Remove from queue">${ui('close', 14)}</button></div>`).join('');
  }

  addFiles(files: File[]): void {
    for (const f of files) {
      const p: Pending = { key: `f${++this.seq}`, name: f.name };
      this.files.push(p);
      void this.upload(p, f);
    }
    this.renderFiles();
    this.renderRunning();
  }

  private async upload(p: Pending, f: File): Promise<void> {
    const form = new FormData();
    form.append('file', f, f.name);
    try {
      const res = await fetch('/api/uploads', { method: 'POST', body: form });
      const body = await res.json();
      if (!res.ok || !body.ok) throw new Error(body.error || `upload failed (${res.status})`);
      p.file = body.file as FileInfo;
    } catch (e) {
      p.error = e instanceof Error ? e.message : String(e);
    }
    this.renderCard(p);
    this.renderRunning();
  }

  private renderCard(p: Pending): void {
    if (!p.card) return;
    if (p.comment) {
      p.card.classList.add('is-comment');
      setText(q(p.card, '.ft-attach-type'), 'COMMENT');
      setAttr(p.card, 'title', `${p.comment.quote ? `“${p.comment.quote.slice(0, 200)}”\n` : ''}${p.comment.note}`);
      return;
    }
    p.card.classList.toggle('is-loading', !p.file && !p.error);
    p.card.classList.toggle('is-error', !!p.error);
    const label = p.error ? 'FAILED' : p.file ? (p.file.kind === 'zip' ? `ZIP ${p.file.entries ?? 0}` : p.file.kind.toUpperCase()) : 'UPLOADING';
    setText(q(p.card, '.ft-attach-type'), label);
    if (p.error) setAttr(p.card, 'title', p.error);
  }

  private renderFiles(): void {
    if (this.attachRow.hidden !== (this.files.length === 0)) this.attachRow.hidden = this.files.length === 0;
    const wanted = new Set(this.files.map((p) => p.key));
    [...this.attachRow.children].forEach((c) => { if (!wanted.has((c as HTMLElement).dataset.key ?? '')) c.remove(); });
    for (const p of this.files) {
      if (!p.card) {
        p.card = el(`<div class="ft-attach" data-key="${p.key}"><span class="ft-attach-name">${esc(p.name)}</span><span class="ft-attach-type"></span><button type="button" class="ft-attach-x" aria-label="Remove ${esc(p.name)}">${ui('close', 12)}</button></div>`);
        q(p.card, '.ft-attach-x').addEventListener('click', () => {
          this.files = this.files.filter((x) => x !== p);
          this.renderFiles();
          this.renderRunning();
        });
        this.attachRow.appendChild(p.card);
      }
      this.renderCard(p);
    }
  }

  private plusMenu(anchor: HTMLElement): void {
    const empty = (what: string): MenuItem[] => [{ note: `No ${what} yet` }, { label: 'Open Customize', icon: 'customize', action: () => this.hooks.openCustomize() }];
    openMenu(anchor, [
      { label: 'Add files or photos', icon: 'paperclip', hint: `${modKey}U`, action: () => this.openFilePicker() },
      {
        label: 'Skills', icon: 'skills', submenu: () => {
          const on = this.state.skills.filter((s) => s.enabled);
          if (!on.length) return empty('skills');
          return [...on.map((s) => ({ label: s.name, desc: s.description.slice(0, 90), action: () => this.useSkill(s.name) })),
            { divider: true }, { label: 'Manage skills', icon: 'customize' as const, action: () => this.hooks.openCustomize() }];
        },
      },
      {
        label: 'Connectors', icon: 'plug', submenu: () => {
          const all = this.state.connectors;
          if (!all.length) return empty('connectors');
          return [...all.map((c) => ({ label: c.name, desc: c.status === 'error' && c.route === 'local' ? 'Not connected' : c.route === 'api' ? 'Through Anthropic' : `${c.tools.filter((t) => t.enabled).length} tools`,
            checked: c.enabled, action: () => void run('connector.update', { id: c.id, enabled: !c.enabled }) })),
          { divider: true }, { label: 'Manage connectors', icon: 'customize' as const, action: () => this.hooks.openCustomize() }];
        },
      },
      {
        label: 'Create', icon: 'file', submenu: () => ([['doc', 'Document', 'Written section by section, with comments; Word or PDF'], ['sheet', 'Spreadsheet', 'A table you can export to Excel or CSV'],
          ['deck', 'Slides', 'A deck you can present or export to PowerPoint or PDF']] as const).map(([k, label, desc]) => ({ label, desc, checked: this.output === k, action: () => this.setOutput(this.output === k ? null : k) })),
      },
      { divider: true },
      { label: 'Research', icon: 'research', checked: this.research, action: () => this.setResearch(!this.research) },
    ], 'up');
  }

  get outputKind(): 'doc' | 'sheet' | 'deck' | null {
    return this.output;
  }

  setOutput(kind: 'doc' | 'sheet' | 'deck' | null): void {
    this.output = kind;
    const pill = q(this.root, '.ft-output-pill');
    setText(q(pill, 'span'), kind === 'doc' ? 'Document' : kind === 'sheet' ? 'Spreadsheet' : kind === 'deck' ? 'Slides' : '');
    if (pill.hidden === !!kind) pill.hidden = !kind;
    this.input.focus();
  }

  private modelMenu(): void {
    const s = this.state.settings;
    const model = this.state.model();
    const set = (key: keyof Settings, value: unknown) => void run('settings.set', { key, value });
    const levels = model?.efforts?.length ? model.efforts : this.state.efforts;
    const items: MenuItem[] = [
      { label: model?.name ?? s.model, desc: model?.description || model?.id, checked: true },
    ];
    if (levels.length) {
      items.push({
        label: 'Effort', value: EFFORT_LABEL[s.effort] ?? s.effort, submenu: () => [
          { note: 'Higher effort means more thorough answers, but takes longer and uses more tokens.' },
          ...levels.map((e) => ({
            label: EFFORT_LABEL[e] ?? e, checked: e === s.effort,
            chip: e === 'medium' ? 'Recommended' : e === 'max' ? 'Most usage' : undefined,
            chipTone: e === 'max' ? 'warn' as const : 'plain' as const,
            action: () => set('effort', e),
          })),
        ],
      });
    }
    items.push({ label: 'Show thinking', desc: 'Summaries of Claude’s reasoning, above the reply', checked: s.thinking, action: () => set('thinking', !s.thinking) });
    items.push({
      label: 'More models', submenu: () => [
        ...(this.state.modelSource === 'fallback' ? [{ note: this.state.modelError ? `Built-in list: ${this.state.modelError}` : 'Built-in list until an API key is added' }] : []),
        ...this.state.models.map((m) => ({ label: m.name, desc: m.id, checked: m.id === s.model, action: () => set('model', m.id) })),
      ],
    });
    if (this.state.keys['claude-code']?.set) {
      const engine = s.chatEngine ?? 'auto';
      items.push({ divider: true }, {
        label: 'Answer through', submenu: () => ([['auto', 'Automatic', 'Your API key when set, otherwise Claude Code'], ['api', 'Anthropic API key', 'Billed to your API key'], ['claude-code', 'Claude Code', 'Your Claude plan, through the claude CLI']] as const)
          .map(([id, label, desc]) => ({ label, desc, checked: engine === id, action: () => set('chatEngine', id) })),
      });
    }
    if (!this.state.anthropicKey) items.push({ divider: true }, { label: 'Add an API key', icon: 'key', action: () => this.hooks.openKeys() });
    openMenu(this.modelBtn, items, 'up');
  }

  private modeMenu(): void {
    const chat = this.state.activeId;
    const chatOn = !!chat && !!this.state.conversations.get(chat)?.allow_all;
    openMenu(this.modeBtn, [...MODES.map(([id, label, desc]) => ({
      label, desc, checked: this.state.settings.permissionMode === id, icon: 'shield' as const,
      action: () => void run('settings.set', { key: 'permissionMode', value: id }),
    })), ...(chat ? [{ divider: true }, {
      label: 'Allow for this chat', desc: 'Every tool in this chat runs without asking; other chats keep the mode above', checked: chatOn, icon: 'shield' as const,
      action: () => void run('conversation.allowAll', { id: chat, on: !chatOn }),
    }] : [])], 'up');
  }

  renderSettings(): void {
    const s = this.state.settings;
    const model = this.state.model();
    const name = model?.name ?? s.model;
    setText(q(this.modelBtn, '.ft-model-name'), name);
    setText(q(this.modelBtn, '.ft-model-effort'), EFFORT_LABEL[s.effort] ?? s.effort);
    const mode = MODES.find(([id]) => id === s.permissionMode);
    const chatOn = s.permissionMode === 'ask' && !!this.state.activeId && !!this.state.conversations.get(this.state.activeId)?.allow_all;
    setText(this.modeBtn, chatOn ? 'Chat allowed' : mode ? mode[1] : s.permissionMode);
    const tone = chatOn ? 'chat' : s.permissionMode;
    if (this.modeBtn.dataset.mode !== tone) this.modeBtn.dataset.mode = tone;
    if (this.notice.classList.contains('is-alert')) return;
    const via = this.state.route();
    setText(this.notice, via === 'api' ? `${name} through the Anthropic API can make mistakes.` : via === 'claude-code' ? `${name} through Claude Code can make mistakes.` : 'Add an Anthropic API key in Settings, or install Claude Code, to start chatting.');
  }
}
