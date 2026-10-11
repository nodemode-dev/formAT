import type { ContentBlock } from '../state/app-state';
import { el, esc, q, setAttr, setText } from './dom';
import { ui } from './icons-ft';

export type Approve = (toolUseId: string, decision: 'allow' | 'always' | 'deny') => void;

export const TOOL_TYPES = new Set(['tool_use', 'server_tool_use']);
export const RESULT_TYPES = new Set(['tool_result', 'web_search_tool_result', 'web_fetch_tool_result', 'code_execution_tool_result',
  'bash_code_execution_tool_result', 'text_editor_code_execution_tool_result']);

const ICON: Record<string, Parameters<typeof ui>[0]> = {
  bash: 'terminal', write: 'file', edit: 'pencil', read: 'file', glob: 'search', grep: 'search', web_search: 'globe', web_fetch: 'globe',
};
const STATE_TEXT: Record<string, string> = {
  input: 'preparing', waiting: 'needs approval', running: 'running', done: '', error: 'failed', denied: 'not run',
};

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
    case 'edit': return { title: 'Edited a file', sub: String(input.path ?? ''), short: `edited ${base(input.path)}` };
    case 'read': return { title: 'Read a file', sub: String(input.path ?? ''), short: `read ${base(input.path)}` };
    case 'glob': return { title: 'Listed files', sub: String(input.pattern ?? ''), short: 'listed files' };
    case 'grep': return { title: 'Searched files', sub: String(input.pattern ?? ''), short: 'searched files' };
    case 'web_search': return { title: 'Searched the web', sub: String(input.query ?? ''), short: 'searched the web' };
    case 'web_fetch': return { title: 'Read a page', sub: String(input.url ?? ''), short: `read ${host(input.url)}` };
    default: return { title: `Used ${name.replace(/_/g, ' ')}`, sub: '', short: `used ${name.replace(/_/g, ' ')}` };
  }
}

export function resultView(b: ContentBlock): ContentBlock {
  if (b.results || b.text !== undefined || b.url !== undefined) return b;
  const c = b.content as unknown;
  const v: ContentBlock = { type: b.type, tool_use_id: b.tool_use_id, is_error: !!b.is_error };
  if (typeof c === 'string') v.text = c;
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

  constructor(b: ContentBlock, private approve: Approve, private changed: () => void) {
    this.id = b.id ?? '';
    this.name = b.name ?? 'tool';
    this.root = el(`<div class="ft-tool" data-status="input">
      <details class="ft-tool-d"><summary class="ft-tool-head"><span class="ft-tool-icon">${ui(ICON[this.name] ?? 'skills', 14)}</span><span class="ft-tool-title"></span><span class="ft-tool-sub"></span><span class="ft-tool-state"></span></summary>
        <div class="ft-tool-body"><pre class="ft-tool-input" hidden></pre><pre class="ft-tool-out" hidden></pre><ul class="ft-tool-links" hidden></ul></div></details>
      <div class="ft-tool-ask" hidden><span class="ft-tool-ask-text"></span><button type="button" class="ft-btn ft-btn-primary" data-d="allow">Allow once</button><button type="button" class="ft-btn" data-d="always">Always allow</button><button type="button" class="ft-btn" data-d="deny">Deny</button></div>
    </div>`);
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
      const d = (e.target as HTMLElement).closest<HTMLElement>('[data-d]')?.dataset.d as 'allow' | 'always' | 'deny' | undefined;
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
    const detail = this.name === 'bash' ? String(this.input.command ?? '') : this.name === 'write' ? String(this.input.content ?? '') : this.name === 'edit' ? `${String(this.input.old_string ?? '')}\n\n${String(this.input.new_string ?? '')}` : '';
    setText(this.inputEl, detail.slice(0, 20000));
    if (this.inputEl.hidden === !!detail) this.inputEl.hidden = !detail;
    if (b.status) this.setStatus(b.status);
    else if (this.status === 'input' && Object.keys(this.input).length) this.setStatus(this.name.startsWith('web_') ? 'running' : 'input');
    this.changed();
  }

  setStatus(status: string): void {
    this.status = status;
    if (this.root.dataset.status !== status) this.root.dataset.status = status;
    setText(this.state, STATE_TEXT[status] ?? status);
    const waiting = status === 'waiting';
    if (this.ask.hidden === waiting) this.ask.hidden = !waiting;
    if (waiting) {
      setText(q(this.ask, '.ft-tool-ask-text'), this.name === 'bash' ? 'Allow Claude to run this command?' : `Allow Claude to ${this.name} ${base(this.input.path)}?`);
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
      if (this.outBox.hidden === !t) this.outBox.hidden = !t;
    }
    if (v.results?.length) {
      this.links.innerHTML = v.results.map((r) => `<li><a href="${esc(r.url ?? '')}" target="_blank" rel="noopener noreferrer">${esc(r.title || r.url || '')}</a><span>${esc(host(r.url))}${r.page_age ? ` · ${esc(r.page_age)}` : ''}</span></li>`).join('');
      this.links.hidden = false;
    } else if (v.url) {
      this.links.innerHTML = `<li><a href="${esc(v.url)}" target="_blank" rel="noopener noreferrer">${esc(v.title || v.url)}</a><span>${esc(host(v.url))}</span></li>`;
      this.links.hidden = false;
    }
    if (this.name.startsWith('web_') || this.status === 'input' || this.status === 'running') this.setStatus(v.is_error ? 'error' : 'done');
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
    const busy = this.cards.some((c) => c.status === 'running' || c.status === 'input' || c.status === 'waiting');
    const waiting = this.cards.some((c) => c.status === 'waiting');
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
