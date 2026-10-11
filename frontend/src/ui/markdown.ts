import hljs from 'highlight.js/lib/common';
import katex from 'katex';
import 'katex/dist/katex.min.css';
import MarkdownIt from 'markdown-it';

const md = new MarkdownIt({ html: false, linkify: true, breaks: false, typographer: false });

if (typeof document !== 'undefined' && document.fonts) {
  for (const face of ['16px KaTeX_Main', 'italic 16px KaTeX_Math', 'bold 16px KaTeX_Main']) void document.fonts.load(face).catch(() => undefined);
}

function tex(source: string, display: boolean): string {
  return katex.renderToString(source, { displayMode: display, throwOnError: false, output: 'htmlAndMathml', strict: 'ignore', trust: false });
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
  const source = t.content.replace(/\n$/, '');
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

export function renderMarkdown(text: string): string {
  return md.render(text);
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
  private doneCount = 0;
  private tailEl: HTMLElement;
  private tailText = '';

  constructor() {
    this.root = document.createElement('div');
    this.root.className = 'ft-md';
    this.tailEl = document.createElement('div');
    this.tailEl.className = 'ft-md-tail';
    this.root.appendChild(this.tailEl);
  }

  set(full: string, finished: boolean): void {
    this.text = full;
    const { done, tail } = splitBlocks(full);
    while (this.doneCount < done.length) {
      const block = document.createElement('div');
      block.className = 'ft-md-block';
      block.innerHTML = renderMarkdown(done[this.doneCount]);
      this.root.insertBefore(block, this.tailEl);
      this.doneCount++;
    }
    const tailSource = tail.trim();
    if (tailSource !== this.tailText) {
      this.tailText = tailSource;
      this.tailEl.innerHTML = tailSource ? renderMarkdown(tailSource) : '';
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
