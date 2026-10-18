import hljs from 'highlight.js/lib/common';
import katex from 'katex';
import 'katex/dist/katex.min.css';
import MarkdownIt from 'markdown-it';
import type { Citation } from '../state/app-state';

const md = new MarkdownIt({ html: false, linkify: true, breaks: false, typographer: false });

const MARK = /(\d+)/g;
export const citeMark = (n: number): string => `${n}`;

function host(url: string): string {
  try { return new URL(url).hostname.replace(/^www\./, ''); } catch { return url; }
}

function chip(c: Citation): { label: string; href: string; hint: string } {
  const link = [c.url, c.source].find((u) => /^https?:\/\//i.test(u ?? '')) ?? '';
  const pages = c.start_page_number ? (c.end_page_number && c.end_page_number - c.start_page_number > 1 ? ` pp. ${c.start_page_number}-${c.end_page_number - 1}` : ` p. ${c.start_page_number}`) : '';
  const named = c.document_title || c.title || c.source || (c.document_index !== undefined ? `Document ${c.document_index + 1}` : 'Source');
  const label = link ? host(link) : `${named.length > 22 ? `${named.slice(0, 21).trimEnd()}…` : named}${pages}`;
  const quote = (c.cited_text ?? '').trim();
  return { label, href: link, hint: [c.title || c.document_title || link, quote ? `"${quote}"` : ''].filter(Boolean).join('\n') };
}

function chips(list: Citation[] | undefined): string {
  const seen = new Map<string, ReturnType<typeof chip>>();
  for (const c of list ?? []) {
    const v = chip(c);
    const key = v.href || v.label;
    if (!seen.has(key)) seen.set(key, v);
  }
  const all = [...seen.values()];
  if (!all.length) return '';
  const e = md.utils.escapeHtml;
  const one = (v: ReturnType<typeof chip>) => v.href
    ? `<a class="ft-cite" href="${e(v.href)}" target="_blank" rel="noopener noreferrer" title="${e(v.hint)}">${e(v.label)}</a>`
    : `<span class="ft-cite" title="${e(v.hint)}">${e(v.label)}</span>`;
  const rest = all.slice(2);
  const more = rest.length ? `<span class="ft-cite is-more" title="${e(rest.map((v) => v.href || v.label).join('\n'))}">+${rest.length}</span>` : '';
  return `<span class="ft-cites">${all.slice(0, 2).map(one).join('')}${more}</span>`;
}

if (typeof document !== 'undefined' && document.fonts) {
  for (const face of ['16px KaTeX_Main', 'italic 16px KaTeX_Math', 'bold 16px KaTeX_Main', '16px KaTeX_Size1', '16px KaTeX_Size2', '16px KaTeX_AMS']) void document.fonts.load(face).catch(() => undefined);
}

function tex(source: string, display: boolean): string {
  return katex.renderToString(source.replace(MARK, ''), { displayMode: display, throwOnError: false, output: 'htmlAndMathml', strict: 'ignore', trust: false });
}

md.inline.ruler.before('escape', 'math_inline', (state, silent) => {
  const src = state.src, start = state.pos;
  let open = '', close = '';
  if (src.startsWith('\\(', start)) { open = '\\('; close = '\\)'; }
  else if (src[start] === '$' && src[start + 1] !== '$') { open = '$'; close = '$'; }
  else return false;
  const from = start + open.length;
  if (open === '$' && (from >= state.posMax || /[\s\d]/.test(src[from]))) return false;
  let end = src.indexOf(close, from);
  while (end > -1 && open === '$' && (src[end - 1] === '\\' || /\s/.test(src[end - 1]) || /\d/.test(src[end + 1] ?? ''))) end = src.indexOf(close, end + 1);
  if (end < 0 || end === from || end > state.posMax) return false;
  if (!silent) {
    const token = state.push('math_inline', 'math', 0);
    token.content = src.slice(from, end);
  }
  state.pos = end + close.length;
  return true;
});

md.block.ruler.before('fence', 'math_block', (state, startLine, endLine, silent) => {
  const first = state.src.slice(state.bMarks[startLine] + state.tShift[startLine], state.eMarks[startLine]).trim();
  const close = first.startsWith('$$') ? '$$' : first.startsWith('\\[') ? '\\]' : '';
  if (!close) return false;
  const rest = first.slice(2);
  let content = '', line = startLine;
  if (rest.trimEnd().endsWith(close)) content = rest.trimEnd().slice(0, -close.length);
  else {
    const parts = [rest];
    let found = false;
    while (++line < endLine) {
      const text = state.src.slice(state.bMarks[line] + state.tShift[line], state.eMarks[line]);
      const at = text.indexOf(close);
      if (at > -1) { parts.push(text.slice(0, at)); found = true; break; }
      parts.push(text);
    }
    if (!found) return false;
    content = parts.join('\n');
  }
  if (silent) return true;
  const token = state.push('math_block', 'math', 0);
  token.block = true;
  token.content = content.trim();
  token.map = [startLine, line + 1];
  state.line = line + 1;
  return true;
});

md.renderer.rules.math_inline = (tokens, idx) => tex(tokens[idx].content, false);
md.renderer.rules.math_block = (tokens, idx) => `<div class="ft-math">${tex(tokens[idx].content, true)}</div>`;

const defaultLink = md.renderer.rules.link_open ?? ((tokens, idx, options, _env, self) => self.renderToken(tokens, idx, options));
md.renderer.rules.link_open = (tokens, idx, options, env, self) => {
  tokens[idx].attrSet('target', '_blank');
  tokens[idx].attrSet('rel', 'noopener noreferrer');
  return defaultLink(tokens, idx, options, env, self);
};

md.renderer.rules.fence = (tokens, idx) => {
  const t = tokens[idx];
  const lang = (t.info || '').trim().split(/\s+/)[0];
  const source = t.content.replace(/\n$/, '').replace(MARK, '');
  let body = md.utils.escapeHtml(source);
  if (lang && hljs.getLanguage(lang)) {
    try {
      body = hljs.highlight(source, { language: lang, ignoreIllegals: true }).value;
    } catch {
      body = md.utils.escapeHtml(source);
    }
  }
  return `<div class="ft-code"><div class="ft-code-head"><span>${md.utils.escapeHtml(lang || 'text')}</span><button type="button" class="ft-code-copy">Copy</button></div><pre><code>${body}</code></pre></div>`;
};

export function renderMarkdown(text: string, cites?: Array<Citation[] | undefined>): string {
  const html = md.render(text);
  return html.includes('') ? html.replace(MARK, (_, n: string) => chips(cites?.[Number(n)])) : html;
}

function splitBlocks(text: string): { done: string[]; tail: string } {
  const lines = text.split('\n');
  const done: string[] = [];
  let current: string[] = [];
  let fence: string | null = null;
  let math: string | null = null;
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    const isLast = i === lines.length - 1;
    const marker = math === null ? line.match(/^\s{0,3}(`{3,}|~{3,})/) : null;
    if (marker) {
      if (fence === null) fence = marker[1][0].repeat(marker[1].length);
      else if (line.trim().startsWith(fence)) fence = null;
    }
    if (fence === null) {
      const t = line.trim();
      if (math === null) {
        if (t.startsWith('$$') && !t.slice(2).includes('$$')) math = '$$';
        else if (t.startsWith('\\[') && !t.includes('\\]')) math = '\\]';
      } else if (line.includes(math)) math = null;
    }
    current.push(line);
    if (fence === null && math === null && line.trim() === '' && !isLast) {
      const block = current.join('\n').trim();
      if (block) done.push(block);
      current = [];
    }
  }
  return { done, tail: current.join('\n') };
}

export class StreamRenderer {
  readonly root: HTMLElement;
  private text = '';
  private shown: Array<{ el: HTMLElement; source: string }> = [];
  private tailEl: HTMLElement;
  private tailText = '';

  constructor() {
    this.root = document.createElement('div');
    this.root.className = 'ft-md';
    this.tailEl = document.createElement('div');
    this.tailEl.className = 'ft-md-tail';
    this.root.appendChild(this.tailEl);
  }

  set(full: string, finished: boolean, cites?: Array<Citation[] | undefined>): void {
    this.text = full;
    if (this.tailEl.parentNode !== this.root) {
      this.tailEl = document.createElement('div');
      this.tailText = '';
      this.root.appendChild(this.tailEl);
    }
    if (!finished && this.tailEl.className !== 'ft-md-tail') this.tailEl.className = 'ft-md-tail';
    const { done, tail } = splitBlocks(full);
    for (let i = 0; i < this.shown.length && i < done.length; i++) {
      const s = this.shown[i];
      if (s.source !== done[i]) { s.source = done[i]; s.el.innerHTML = renderMarkdown(done[i], cites); }
    }
    while (this.shown.length < done.length) {
      const block = this.tailEl;
      block.className = 'ft-md-block';
      const source = done[this.shown.length];
      if (source !== this.tailText) block.innerHTML = renderMarkdown(source, cites);
      this.shown.push({ el: block, source });
      this.tailEl = document.createElement('div');
      this.tailEl.className = 'ft-md-tail';
      this.tailText = '';
      block.after(this.tailEl);
    }
    const tailSource = tail.trim();
    if (tailSource !== this.tailText) {
      this.tailText = tailSource;
      this.tailEl.innerHTML = tailSource ? renderMarkdown(tailSource, cites) : '';
    }
    if (finished) {
      if (tailSource) this.tailEl.className = 'ft-md-block';
      else this.tailEl.remove();
    }
  }

  get value(): string {
    return this.text;
  }
}
