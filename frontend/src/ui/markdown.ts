import MarkdownIt from 'markdown-it';

const md = new MarkdownIt({ html: false, linkify: true, breaks: false, typographer: false });

const defaultLink = md.renderer.rules.link_open ?? ((tokens, idx, options, _env, self) => self.renderToken(tokens, idx, options));
md.renderer.rules.link_open = (tokens, idx, options, env, self) => {
  tokens[idx].attrSet('target', '_blank');
  tokens[idx].attrSet('rel', 'noopener noreferrer');
  return defaultLink(tokens, idx, options, env, self);
};

md.renderer.rules.fence = (tokens, idx) => {
  const t = tokens[idx];
  const lang = (t.info || '').trim().split(/\s+/)[0];
  const body = md.utils.escapeHtml(t.content.replace(/\n$/, ''));
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
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    const isLast = i === lines.length - 1;
    const marker = line.match(/^\s{0,3}(`{3,}|~{3,})/);
    if (marker) {
      if (fence === null) fence = marker[1][0].repeat(marker[1].length);
      else if (line.trim().startsWith(fence)) fence = null;
    }
    current.push(line);
    if (fence === null && line.trim() === '' && !isLast) {
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
