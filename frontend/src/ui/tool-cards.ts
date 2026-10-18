import type { ArtifactRef, ContentBlock } from '../state/app-state';
import { el, esc, q, setAttr, setText } from './dom';
import { ui } from './icons-ft';

export type Approve = (toolUseId: string, decision: 'allow' | 'always' | 'all' | 'deny') => void;
export type Answer = (toolUseId: string, answer: string | string[]) => void;
export interface TaskItem { title: string; status: 'pending' | 'in_progress' | 'completed' }

export function taskListHtml(tasks: TaskItem[]): string {
  return tasks.map((t) => `<li class="ft-task" data-s="${esc(t.status)}"><span class="ft-task-box">${t.status === 'completed' ? ui('check', 12) : ''}</span><span>${esc(t.title)}</span></li>`).join('');
}

function size(n: number | undefined): string {
  if (n === undefined) return '';
  return n < 1024 ? `${n} B` : n < 1024 * 1024 ? `${(n / 1024).toFixed(1)} KB` : `${(n / 1024 / 1024).toFixed(1)} MB`;
}

export class FileCard {
  readonly root: HTMLElement;
  readonly id: string;
  private name: HTMLElement;
  private meta: HTMLElement;
  private caption: HTMLElement;
  private link: HTMLAnchorElement;
  private path = '';

  private open: HTMLButtonElement;

  constructor(b: ContentBlock, private chatId: string, onOpen: (path: string) => void = () => undefined) {
    this.id = b.id ?? '';
    this.root = el(`<div class="ft-file-card" data-status="input"><span class="ft-file-card-icon">${ui('file', 20)}</span>
      <button type="button" class="ft-file-card-text" disabled title="Preview"><span class="ft-file-card-name"></span><span class="ft-file-card-meta"></span><span class="ft-file-card-caption" hidden></span></button>
      <a class="ft-btn ft-file-card-dl" download aria-disabled="true" tabindex="-1">Download</a></div>`);
    this.name = q(this.root, '.ft-file-card-name');
    this.meta = q(this.root, '.ft-file-card-meta');
    this.caption = q(this.root, '.ft-file-card-caption');
    this.link = q<HTMLAnchorElement>(this.root, '.ft-file-card-dl');
    this.open = q<HTMLButtonElement>(this.root, '.ft-file-card-text');
    this.open.addEventListener('click', () => { if (this.path) onOpen(this.path); });
    this.update(b);
  }

  update(b: ContentBlock): void {
    const input = b.input ?? {};
    if (input.path) this.path = String(input.path);
    setText(this.name, this.path.split(/[\\/]/).pop() || 'Preparing a file');
    const cap = String(input.caption ?? '');
    setText(this.caption, cap);
    if (this.caption.hidden === !!cap) this.caption.hidden = !cap;
    if (b.status) this.setStatus(b.status);
  }

  setStatus(status: string, bytes?: number): void {
    if (this.root.dataset.status !== status) this.root.dataset.status = status;
    const ok = status === 'done';
    const kind = (this.path.split('.').pop() ?? '').toUpperCase();
    setText(this.meta, status === 'error' ? 'Could not send this file' : [kind, size(bytes)].filter(Boolean).join(' · '));
    if (ok && this.path) {
      const href = `/api/chats/${encodeURIComponent(this.chatId)}/files/${this.path.split('/').map(encodeURIComponent).join('/')}`;
      if (this.link.getAttribute('href') !== href) this.link.setAttribute('href', href);
      this.link.removeAttribute('aria-disabled');
      this.link.removeAttribute('tabindex');
      if (this.open.disabled) this.open.disabled = false;
    }
  }

  setResult(v: ContentBlock): void {
    const m = /\((\d+) bytes\)/.exec(v.text ?? '');
    this.setStatus(v.is_error ? 'error' : 'done', m ? Number(m[1]) : undefined);
  }
}

export type OpenArtifact = (id: string, version?: number) => void;

export class ArtifactCard {
  readonly root: HTMLElement;
  readonly id: string;
  private name: HTMLElement;
  private meta: HTMLElement;
  private open: HTMLButtonElement;
  private ref: ArtifactRef | null = null;
  private title = '';
  private status = 'input';

  constructor(b: ContentBlock, private onOpen: OpenArtifact) {
    this.id = b.id ?? '';
    this.root = el(`<div class="ft-art-card" data-status="input"><span class="ft-art-card-icon">${ui('artifacts', 20)}</span>
      <div class="ft-art-card-text"><span class="ft-art-card-name"></span><span class="ft-art-card-meta"></span></div>
      <button type="button" class="ft-btn ft-art-card-open" disabled>Open</button></div>`);
    this.name = q(this.root, '.ft-art-card-name');
    this.meta = q(this.root, '.ft-art-card-meta');
    this.open = q<HTMLButtonElement>(this.root, '.ft-art-card-open');
    this.open.addEventListener('click', () => { if (this.ref) this.onOpen(this.ref.id, this.ref.kind && this.ref.kind !== 'html' ? undefined : this.ref.version); });
    this.update(b);
  }

  update(b: ContentBlock): void {
    const t = String(b.input?.title ?? '');
    if (t) this.title = t;
    if (b.artifact) this.setArtifact(b.artifact);
    if (b.status) this.setStatus(b.status);
    else this.paint();
  }

  setArtifact(ref: ArtifactRef): void {
    this.ref = ref;
    if (ref.title) this.title = ref.title;
    this.setStatus('done');
  }

  setStatus(status: string): void {
    if (status !== 'done' || this.ref) this.status = status;
    this.paint();
  }

  setResult(v: ContentBlock): void {
    if (v.is_error) this.setStatus('error');
  }

  isFor(artifactId: string): boolean {
    return this.ref?.id === artifactId;
  }

  private paint(): void {
    if (this.root.dataset.status !== this.status) this.root.dataset.status = this.status;
    setText(this.name, this.title || 'Writing a page');
    const label = this.ref?.kind === 'doc' ? 'Document' : this.ref?.kind === 'sheet' ? 'Spreadsheet' : this.ref?.kind === 'deck' ? 'Slides' : 'HTML';
    const meta = this.status === 'error' ? 'Could not publish this page' : this.ref ? `Version ${this.ref.version} · ${label}` : 'Writing the page';
    setText(this.meta, meta);
    const off = !this.ref;
    if (this.open.disabled !== off) this.open.disabled = off;
  }
}

export const TOOL_TYPES = new Set(['tool_use', 'server_tool_use', 'mcp_tool_use']);
export const RESULT_TYPES = new Set(['tool_result', 'web_search_tool_result', 'web_fetch_tool_result', 'code_execution_tool_result',
  'bash_code_execution_tool_result', 'text_editor_code_execution_tool_result', 'mcp_tool_result']);

export function connectorParts(name: string): { connector: string; tool: string } | null {
  const m = /^mcp__([a-z0-9_-]+?)__(.+)$/.exec(name);
  return m ? { connector: m[1], tool: m[2] } : null;
}

const ICON: Record<string, Parameters<typeof ui>[0]> = {
  bash: 'terminal', write: 'file', edit: 'pencil', read: 'file', glob: 'search', grep: 'search', web_search: 'globe', web_fetch: 'globe',
  ask_user: 'chat', task_list: 'check', spawn_agent: 'skills', memory: 'file', skill: 'skills', write_document: 'pencil', browser: 'globe',
};
const STATE_TEXT: Record<string, string> = {
  input: 'preparing', waiting: 'needs approval', asking: 'waiting for you', running: 'running', done: '', error: 'failed', denied: 'not run',
};

const diffShown = new WeakMap<HTMLElement, string>();

function diffHtml(input: Record<string, unknown>): string {
  const pairs = Array.isArray(input.edits) ? (input.edits as Array<Record<string, unknown>>) : [input];
  const lines = (text: unknown, cls: string, mark: string): string => String(text ?? '').split('\n').map((l) => `<span class="${cls}"><span class="ft-diff-mark">${mark}</span>${esc(l)}</span>`).join('');
  return pairs.slice(0, 50).map((p) => lines(p.old_string, 'ft-diff-del', '-') + lines(p.new_string, 'ft-diff-add', '+')).join('<span class="ft-diff-gap"></span>').slice(0, 200000);
}

function base(path: unknown): string {
  const s = String(path ?? '');
  return s.split(/[\\/]/).pop() || s;
}

function host(url: unknown): string {
  try { return new URL(String(url)).host; } catch { return String(url ?? ''); }
}

export function describe(name: string, input: Record<string, unknown>): { title: string; sub: string; short: string } {
  switch (name) {
    case 'bash': return { title: 'Ran a command', sub: String(input.command ?? ''), short: 'ran a command' };
    case 'write': return { title: 'Wrote a file', sub: String(input.path ?? ''), short: `wrote ${base(input.path)}` };
    case 'write_document': return { title: input.section ? 'Wrote a section' : 'Revised the document', sub: String(input.section ?? input.title ?? ''), short: input.section ? `wrote ${String(input.section)}` : 'revised the document' };
    case 'edit': return { title: 'Edited a file', sub: String(input.path ?? ''), short: `edited ${base(input.path)}` };
    case 'read': return { title: 'Read a file', sub: String(input.path ?? ''), short: `read ${base(input.path)}` };
    case 'glob': return { title: 'Listed files', sub: String(input.pattern ?? ''), short: 'listed files' };
    case 'grep': return { title: 'Searched files', sub: String(input.pattern ?? ''), short: 'searched files' };
    case 'web_search': return { title: 'Searched the web', sub: String(input.query ?? ''), short: 'searched the web' };
    case 'web_fetch': return { title: 'Read a page', sub: String(input.url ?? ''), short: `read ${host(input.url)}` };
    case 'ask_user': return { title: 'Asked you', sub: String(input.question ?? ''), short: 'asked you' };
    case 'browser': {
      const a = String(input.action ?? '');
      const map: Record<string, [string, string]> = {
        navigate: ['Opened a page in the browser', `opened ${host(input.url)}`], click: ['Clicked in the browser', 'clicked'], type: ['Typed in the browser', 'typed'],
        select: ['Chose an option in the browser', 'chose an option'], press: ['Pressed a key in the browser', `pressed ${String(input.key ?? '')}`],
        scroll: ['Scrolled the page', 'scrolled'], back: ['Went back', 'went back'], forward: ['Went forward', 'went forward'], reload: ['Reloaded the page', 'reloaded'],
      };
      const [title, short] = map[a] ?? ['Looked at the page', 'looked at the page'];
      return { title, sub: a === 'navigate' ? String(input.url ?? '') : a === 'type' ? String(input.text ?? '') : input.ref ? `element ${String(input.ref)}` : '', short };
    }
    case 'memory': {
      const path = String(input.path ?? input.old_path ?? '');
      return input.command === 'view' ? { title: 'Checked memory', sub: path, short: 'checked memory' }
        : { title: 'Updated memory', sub: `${String(input.command ?? '')} ${path}`.trim(), short: 'updated memory' };
    }
    case 'skill': return { title: 'Read a skill', sub: `${String(input.name ?? '')}${input.file ? `/${String(input.file)}` : ''}`, short: `read the ${String(input.name ?? '')} skill` };
    case 'spawn_agent': return { title: 'Ran a sub-agent', sub: String(input.title || String(input.task ?? '').split('\n')[0]), short: 'ran a sub-agent' };
    case 'task_list': {
      const tasks = (Array.isArray(input.tasks) ? input.tasks : []) as TaskItem[];
      const done = tasks.filter((t) => t.status === 'completed').length;
      return { title: 'Updated the plan', sub: tasks.length ? `${done} of ${tasks.length} done` : '', short: 'updated the plan' };
    }
    default: {
      const c = connectorParts(name);
      if (c) return { title: `Used ${c.tool}`, sub: `${c.connector} connector`, short: `used ${c.tool}` };
      return { title: `Used ${name.replace(/_/g, ' ')}`, sub: '', short: `used ${name.replace(/_/g, ' ')}` };
    }
  }
}

export function resultView(b: ContentBlock): ContentBlock {
  if (b.results || b.text !== undefined || b.url !== undefined) return b;
  const c = b.content as unknown;
  const v: ContentBlock = { type: b.type, tool_use_id: b.tool_use_id, is_error: !!b.is_error };
  if (typeof c === 'string') v.text = c;
  else if (Array.isArray(c) && b.type === 'mcp_tool_result') v.text = c.filter((x) => x?.type === 'text').map((x) => String(x.text ?? '')).join('\n');
  else if (Array.isArray(c) && b.type === 'web_search_tool_result') v.results = c.map((r) => ({ title: r?.title, url: r?.url, page_age: r?.page_age }));
  else if (c && typeof c === 'object') {
    const o = c as Record<string, unknown>;
    if (o.error_code) { v.is_error = true; v.text = String(o.error_code).replace(/_/g, ' '); }
    else if (b.type === 'web_fetch_tool_result') { v.url = String(o.url ?? ''); v.title = String(((o.content as Record<string, unknown>) ?? {}).title ?? ''); }
    else v.text = String(o.stdout ?? o.content ?? '');
  }
  return v;
}

export class ToolCard {
  readonly root: HTMLElement;
  readonly id: string;
  name: string;
  remote = false;
  input: Record<string, unknown> = {};
  status = 'input';
  failed = false;
  private title: HTMLElement;
  private sub: HTMLElement;
  private state: HTMLElement;
  private ask: HTMLElement;
  private inputEl: HTMLElement;
  private out: Text;
  private outBox: HTMLElement;
  private links: HTMLElement;

  private question!: HTMLElement;
  private multi = false;
  private builtQuestion = false;
  private answered: string[] = [];

  private agentEl: HTMLElement | null = null;
  private agentGroup: ToolGroup | null = null;
  private agentTexts = new Map<number, Text>();

  agentBox(): HTMLElement {
    if (!this.agentEl) {
      this.agentEl = el('<div class="ft-agent"></div>');
      this.root.insertBefore(this.agentEl, this.ask);
    }
    return this.agentEl;
  }

  agentSteps(): ToolGroup {
    if (!this.agentGroup) {
      this.agentGroup = new ToolGroup();
      this.agentBox().appendChild(this.agentGroup.root);
    }
    return this.agentGroup;
  }

  agentText(index: number, text: string): void {
    let node = this.agentTexts.get(index);
    if (!node) {
      const p = el('<p class="ft-agent-text"></p>');
      node = document.createTextNode('');
      p.appendChild(node);
      this.agentBox().appendChild(p);
      this.agentTexts.set(index, node);
      this.agentGroup = null;
    }
    if (node.data !== text) node.data = text;
  }

  setAnswer(value: string[]): void {
    if (!value.length || value.join('\u0000') === this.answered.join('\u0000')) return;
    this.answered = value;
    setText(this.sub, `${describe(this.name, this.input).sub} · ${value.join(', ')}`);
  }

  private sendAnswer(value: string | string[]): void {
    this.question.querySelectorAll<HTMLButtonElement | HTMLInputElement>('button, input').forEach((x) => { x.disabled = true; });
    this.answered = Array.isArray(value) ? value : [value];
    this.answer(this.id, value);
  }

  private buildQuestion(): void {
    const opts = (Array.isArray(this.input.options) ? this.input.options : []) as Array<{ label?: string; description?: string }>;
    if (this.builtQuestion || !opts.length) return;
    this.builtQuestion = true;
    this.multi = !!this.input.multiSelect;
    setText(q(this.question, '.ft-tool-q-text'), String(this.input.question ?? ''));
    q(this.question, '.ft-tool-q-opts').innerHTML = opts.map((o) => this.multi
      ? `<label class="ft-tool-q-opt"><input type="checkbox" value="${esc(o.label ?? '')}"><span><b>${esc(o.label ?? '')}</b>${o.description ? `<small>${esc(o.description)}</small>` : ''}</span></label>`
      : `<button type="button" class="ft-tool-q-opt" data-o="${esc(o.label ?? '')}"><b>${esc(o.label ?? '')}</b>${o.description ? `<small>${esc(o.description)}</small>` : ''}</button>`).join('');
  }

  constructor(b: ContentBlock, private approve: Approve, private changed: () => void, private answer: Answer = () => undefined) {
    this.id = b.id ?? '';
    this.name = b.type === 'mcp_tool_use' ? `mcp__${b.server ?? b.server_name ?? 'remote'}__${b.name ?? 'tool'}` : b.name ?? 'tool';
    this.remote = b.type === 'mcp_tool_use';
    this.root = el(`<div class="ft-tool" data-status="input">
      <details class="ft-tool-d"><summary class="ft-tool-head"><span class="ft-tool-icon">${ui(ICON[this.name] ?? (connectorParts(this.name) ? 'plug' : 'skills'), 14)}</span><span class="ft-tool-title"></span><span class="ft-tool-sub"></span><span class="ft-tool-state"></span></summary>
        <div class="ft-tool-body"><pre class="ft-tool-input" hidden></pre><pre class="ft-tool-out" hidden></pre><ul class="ft-tool-links" hidden></ul></div></details>
      <div class="ft-tool-ask" hidden><span class="ft-tool-ask-text"></span><button type="button" class="ft-btn ft-btn-primary" data-d="allow">Allow once</button><button type="button" class="ft-btn" data-d="always">Always allow</button><button type="button" class="ft-btn" data-d="all" title="Switch to Allow all: every tool runs without asking, in every chat, until you change the mode">Allow all</button><button type="button" class="ft-btn" data-d="deny">Deny</button></div>
      <div class="ft-tool-q" hidden><p class="ft-tool-q-text"></p><div class="ft-tool-q-opts"></div>
        <div class="ft-tool-q-other"><input class="ft-input" maxlength="2000" placeholder="Or type your own answer" aria-label="Your own answer"><button type="button" class="ft-btn ft-btn-primary ft-tool-q-send">Send</button></div></div>
    </div>`);
    this.question = q(this.root, '.ft-tool-q');
    this.question.addEventListener('click', (e) => {
      const t = e.target as HTMLElement;
      const opt = t.closest<HTMLButtonElement>('button[data-o]');
      if (opt && !this.multi) { this.sendAnswer(opt.dataset.o as string); return; }
      if (t.closest('.ft-tool-q-send')) {
        const picked = [...this.question.querySelectorAll<HTMLInputElement>('input[type=checkbox]:checked')].map((x) => x.value);
        const own = q<HTMLInputElement>(this.question, '.ft-tool-q-other input').value.trim();
        if (own) picked.push(own);
        if (picked.length) this.sendAnswer(this.multi ? picked : picked[picked.length - 1]);
      }
    });
    q<HTMLInputElement>(this.question, '.ft-tool-q-other input').addEventListener('keydown', (e) => {
      if (e.key === 'Enter') { e.preventDefault(); (q(this.question, '.ft-tool-q-send') as HTMLButtonElement).click(); }
    });
    this.title = q(this.root, '.ft-tool-title');
    this.sub = q(this.root, '.ft-tool-sub');
    this.state = q(this.root, '.ft-tool-state');
    this.ask = q(this.root, '.ft-tool-ask');
    this.inputEl = q(this.root, '.ft-tool-input');
    this.outBox = q(this.root, '.ft-tool-out');
    this.out = document.createTextNode('');
    this.outBox.appendChild(this.out);
    this.links = q(this.root, '.ft-tool-links');
    this.ask.addEventListener('click', (e) => {
      const d = (e.target as HTMLElement).closest<HTMLElement>('[data-d]')?.dataset.d as 'allow' | 'always' | 'all' | 'deny' | undefined;
      if (!d) return;
      this.ask.querySelectorAll('button').forEach((x) => { x.disabled = true; });
      this.approve(this.id, d);
    });
    this.update(b);
  }

  update(b: ContentBlock): void {
    if (b.input && Object.keys(b.input).length) this.input = b.input;
    const d = describe(this.name, this.input);
    setText(this.title, d.title);
    setText(this.sub, d.sub.split('\n')[0].slice(0, 160));
    setAttr(this.sub, 'title', d.sub.slice(0, 2000));
    const detail = this.name === 'bash' ? String(this.input.command ?? '') : this.name === 'write' ? String(this.input.content ?? '') : this.name === 'edit' ? `${String(this.input.old_string ?? '')}\n\n${String(this.input.new_string ?? '')}`
      : this.name === 'memory' ? String(this.input.file_text ?? this.input.new_str ?? this.input.insert_text ?? '')
        : connectorParts(this.name) && Object.keys(this.input).length ? JSON.stringify(this.input, null, 2) : '';
    if (this.name === 'edit' && (detail.trim() || Array.isArray(this.input.edits))) {
      const html = diffHtml(this.input);
      if (diffShown.get(this.inputEl) !== html) { diffShown.set(this.inputEl, html); this.inputEl.innerHTML = html; }
      if (!this.inputEl.classList.contains('is-diff')) this.inputEl.classList.add('is-diff');
    } else setText(this.inputEl, detail.slice(0, 20000));
    if (this.inputEl.hidden === !!detail) this.inputEl.hidden = !detail;
    if (this.name === 'ask_user') {
      this.buildQuestion();
      const got = (b as ContentBlock & { answer?: string[] }).answer;
      if (got?.length) this.answered = got;
      if (this.answered.length) setText(this.sub, `${d.sub} · ${this.answered.join(', ')}`);
    }
    if (this.name === 'task_list' && Array.isArray(this.input.tasks)) {
      const html = taskListHtml(this.input.tasks as TaskItem[]);
      if (this.links.dataset.v !== html) {
        this.links.dataset.v = html;
        this.links.innerHTML = html;
        this.links.classList.add('ft-tasks');
      }
      if (this.links.hidden) this.links.hidden = false;
    }
    if (b.status) this.setStatus(b.status);
    else if (this.status === 'input' && (Object.keys(this.input).length || this.remote)) this.setStatus(this.name.startsWith('web_') || this.remote ? 'running' : 'input');
    this.changed();
  }

  setStatus(status: string): void {
    this.status = status;
    if (this.root.dataset.status !== status) this.root.dataset.status = status;
    setText(this.state, STATE_TEXT[status] ?? status);
    const waiting = status === 'waiting';
    if (this.ask.hidden === waiting) this.ask.hidden = !waiting;
    const asking = status === 'asking';
    if (this.question && this.question.hidden === asking) this.question.hidden = !asking;
    if (asking) {
      this.buildQuestion();
      this.question.querySelectorAll<HTMLButtonElement | HTMLInputElement>('button, input').forEach((x) => { x.disabled = false; });
    }
    if (waiting) {
      const c = connectorParts(this.name);
      setText(q(this.ask, '.ft-tool-ask-text'), this.name === 'bash' ? 'Allow Claude to run this command?' : c ? `Allow Claude to use ${c.tool} from the ${c.connector} connector?` : `Allow Claude to ${this.name} ${base(this.input.path)}?`);
      this.ask.querySelectorAll('button').forEach((x) => { x.disabled = false; });
    }
    this.failed = status === 'error';
    this.changed();
  }

  appendOutput(text: string): void {
    this.out.appendData(text);
    if (this.outBox.hidden) this.outBox.hidden = false;
  }

  setResult(v: ContentBlock): void {
    if (v.text !== undefined) {
      const t = v.text.slice(-20000);
      if (this.out.data !== t) this.out.data = t;
      if (this.outBox.hidden !== !t) this.outBox.hidden = !t;
    }
    if (v.results?.length) {
      this.links.innerHTML = v.results.map((r) => `<li><a href="${esc(r.url ?? '')}" target="_blank" rel="noopener noreferrer">${esc(r.title || r.url || '')}</a><span>${esc(host(r.url))}${r.page_age ? ` · ${esc(r.page_age)}` : ''}</span></li>`).join('');
      this.links.hidden = false;
    } else if (v.url) {
      this.links.innerHTML = `<li><a href="${esc(v.url)}" target="_blank" rel="noopener noreferrer">${esc(v.title || v.url)}</a><span>${esc(host(v.url))}</span></li>`;
      this.links.hidden = false;
    }
    if (this.name.startsWith('web_') || this.remote || this.status === 'input' || this.status === 'running') this.setStatus(v.is_error ? 'error' : 'done');
    else if (v.is_error && this.status === 'done') this.setStatus('error');
  }
}

export class ToolGroup {
  readonly root: HTMLDetailsElement;
  private summary: HTMLElement;
  private list: HTMLElement;
  private cards: ToolCard[] = [];

  constructor() {
    this.root = el(`<details class="ft-tools"><summary class="ft-tools-summary"><span class="ft-tools-dot"></span><span class="ft-tools-text"></span></summary><div class="ft-tools-list"></div></details>`) as HTMLDetailsElement;
    this.summary = q(this.root, '.ft-tools-text');
    this.list = q(this.root, '.ft-tools-list');
  }

  add(card: ToolCard): void {
    this.cards.push(card);
    this.list.appendChild(card.root);
    this.refresh();
  }

  refresh(): void {
    const shorts = this.cards.map((c) => describe(c.name, c.input).short);
    const failed = this.cards.filter((c) => c.status === 'error').length;
    const busy = this.cards.some((c) => c.status === 'running' || c.status === 'input' || c.status === 'waiting' || c.status === 'asking');
    const waiting = this.cards.some((c) => c.status === 'waiting' || c.status === 'asking');
    let text = shorts.slice(0, 2).join(', ');
    const more = shorts.length - 2;
    if (more > 0) text += `, and ${more} more step${more === 1 ? '' : 's'}`;
    if (failed) text += `, ${failed} failed`;
    text = text.charAt(0).toUpperCase() + text.slice(1);
    setText(this.summary, text);
    this.root.classList.toggle('is-busy', busy);
    this.root.classList.toggle('has-failed', failed > 0);
    if (waiting && !this.root.open) this.root.open = true;
  }
}
