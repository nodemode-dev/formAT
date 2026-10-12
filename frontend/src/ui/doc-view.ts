import type { FileComment } from '../state/app-state';
import { el, q, setAttr, setText } from './dom';
import { ui } from './icons-ft';
import { renderMarkdown } from './markdown';

export type DocKind = 'doc' | 'sheet' | 'deck';

export interface DocHooks {
  comment(c: FileComment): void;
}

function splitDoc(text: string): string[] {
  const parts: string[] = [];
  let cur: string[] = [];
  for (const line of text.replace(/\r\n/g, '\n').split('\n')) {
    if (line.startsWith('## ') && cur.length) { parts.push(cur.join('\n').trim()); cur = []; }
    cur.push(line);
  }
  if (cur.length) parts.push(cur.join('\n').trim());
  return parts.filter((p) => p);
}

function splitDeck(text: string): string[] {
  return text.replace(/\r\n/g, '\n').split(/^---\s*$/m).map((s) => s.trim()).filter((s) => s);
}

function heading(section: string): string {
  return (section.split('\n', 1)[0] || '').replace(/^#+\s*/, '').trim();
}

function parseCsv(text: string): string[][] {
  const rows: string[][] = [];
  let row: string[] = [];
  let cell = '';
  let quoted = false;
  const s = text.replace(/\r\n/g, '\n').replace(/\n+$/, '');
  for (let i = 0; i < s.length; i++) {
    const ch = s[i];
    if (quoted) {
      if (ch === '"' && s[i + 1] === '"') { cell += '"'; i++; }
      else if (ch === '"') quoted = false;
      else cell += ch;
    } else if (ch === '"') quoted = true;
    else if (ch === ',') { row.push(cell); cell = ''; }
    else if (ch === '\n') { row.push(cell); rows.push(row); row = []; cell = ''; }
    else cell += ch;
  }
  row.push(cell);
  rows.push(row);
  return rows;
}

export class DocView {
  readonly root: HTMLElement;
  private kind: DocKind | null = null;
  private artifactId = '';
  private parts = new Map<string, { node: HTMLElement; src: string }>();
  private slide = 0;
  private slides = 0;
  private table: HTMLTableElement | null = null;
  private commentFor: string | null = null;

  constructor(private hooks: DocHooks) {
    this.root = el(`<div class="ft-doc" hidden>
      <div class="ft-doc-page"></div>
      <div class="ft-deck-bar" hidden>
        <button type="button" class="ft-icon-btn ft-deck-prev" aria-label="Previous slide">${ui('chevronLeft', 16)}</button>
        <span class="ft-deck-count"></span>
        <button type="button" class="ft-icon-btn ft-deck-next" aria-label="Next slide">${ui('chevronRight', 16)}</button>
        <button type="button" class="ft-text-btn ft-deck-present">Present</button>
      </div>
      <div class="ft-doc-note" hidden>
        <p class="ft-doc-note-on"></p>
        <textarea class="ft-input" rows="3" placeholder="What should change here? It goes to Claude with your next message."></textarea>
        <div class="ft-set-actions"><button type="button" class="ft-btn ft-btn-primary ft-doc-note-add">Add comment</button><button type="button" class="ft-btn ft-doc-note-cancel">Cancel</button></div>
      </div>
    </div>`);
    const page = q(this.root, '.ft-doc-page');
    page.addEventListener('click', (e) => {
      const btn = (e.target as HTMLElement).closest<HTMLElement>('.ft-doc-comment');
      if (btn) this.openNote(btn.dataset.section || '');
    });
    q(this.root, '.ft-deck-prev').addEventListener('click', () => this.go(this.slide - 1));
    q(this.root, '.ft-deck-next').addEventListener('click', () => this.go(this.slide + 1));
    q(this.root, '.ft-deck-present').addEventListener('click', () => { void q(this.root, '.ft-doc-page').requestFullscreen?.().catch(() => undefined); });
    this.root.addEventListener('keydown', (e) => {
      if (this.kind !== 'deck' || (e.target as HTMLElement).closest('textarea')) return;
      if (e.key === 'ArrowRight' || e.key === 'PageDown') { e.preventDefault(); this.go(this.slide + 1); }
      else if (e.key === 'ArrowLeft' || e.key === 'PageUp') { e.preventDefault(); this.go(this.slide - 1); }
    });
    q(this.root, '.ft-doc-note-cancel').addEventListener('click', () => this.closeNote());
    q(this.root, '.ft-doc-note-add').addEventListener('click', () => this.addNote());
  }

  show(kind: DocKind, artifactId: string, content: string): void {
    if (this.kind !== kind || this.artifactId !== artifactId) {
      const page = q(this.root, '.ft-doc-page');
      page.replaceChildren();
      this.parts.clear();
      this.table = null;
      this.slide = 0;
      this.closeNote();
      this.kind = kind;
      this.artifactId = artifactId;
      setAttr(this.root, 'data-kind', kind);
      setAttr(this.root, 'tabindex', kind === 'deck' ? '0' : null);
    }
    if (kind === 'sheet') this.paintSheet(content);
    else this.paintParts(kind === 'doc' ? splitDoc(content) : splitDeck(content));
    const bar = q(this.root, '.ft-deck-bar');
    if (bar.hidden === (kind === 'deck')) bar.hidden = kind !== 'deck';
    if (kind === 'deck') this.go(Math.min(this.slide, this.slides - 1));
    if (this.root.hidden) this.root.hidden = false;
  }

  hide(): void {
    if (!this.root.hidden) this.root.hidden = true;
  }

  private paintParts(parts: string[]): void {
    const page = q(this.root, '.ft-doc-page');
    const seen = new Set<string>();
    parts.forEach((src, i) => {
      const key = String(i);
      seen.add(key);
      let p = this.parts.get(key);
      if (!p) {
        const node = el(`<section class="${this.kind === 'deck' ? 'ft-slide' : 'ft-doc-sec'}" data-key="${key}"><div class="ft-doc-body"></div>${this.kind === 'doc' ? `<button type="button" class="ft-text-btn ft-doc-comment" title="Comment on this section">${ui('comment', 14)}<span>Comment</span></button>` : ''}</section>`);
        p = { node, src: '' };
        this.parts.set(key, p);
      }
      if (p.src !== src) {
        p.src = src;
        q(p.node, '.ft-doc-body').innerHTML = renderMarkdown(src);
        const c = p.node.querySelector<HTMLElement>('.ft-doc-comment');
        if (c) c.dataset.section = heading(src);
      }
      if (page.children[i] !== p.node) page.insertBefore(p.node, page.children[i] ?? null);
    });
    for (const [key, p] of this.parts) if (!seen.has(key)) { p.node.remove(); this.parts.delete(key); }
    this.slides = parts.length;
  }

  private paintSheet(content: string): void {
    const page = q(this.root, '.ft-doc-page');
    const rows = parseCsv(content);
    if (!this.table) {
      this.table = el<HTMLTableElement>('<table class="ft-sheet-grid"><thead></thead><tbody></tbody></table>');
      page.appendChild(this.table);
    }
    const width = Math.max(...rows.map((r) => r.length));
    const sync = (parent: HTMLElement, data: string[][], tag: 'th' | 'td') => {
      while (parent.children.length > data.length) parent.lastElementChild?.remove();
      data.forEach((r, i) => {
        let tr = parent.children[i] as HTMLElement | undefined;
        if (!tr) { tr = document.createElement('tr'); parent.appendChild(tr); }
        while (tr.children.length > width + 1) tr.lastElementChild?.remove();
        for (let j = 0; j <= width; j++) {
          let cell = tr.children[j] as HTMLElement | undefined;
          if (!cell) { cell = document.createElement(j === 0 ? 'th' : tag); tr.appendChild(cell); }
          setText(cell, j === 0 ? (tag === 'th' ? '' : String(i + 1)) : (r[j - 1] ?? ''));
          cell.classList.toggle('is-num', j > 0 && /^-?\d+(\.\d+)?$/.test((r[j - 1] ?? '').trim()));
        }
      });
    };
    sync(q(this.table, 'thead'), rows.slice(0, 1), 'th');
    sync(q(this.table, 'tbody'), rows.slice(1), 'td');
  }

  private go(n: number): void {
    if (this.kind !== 'deck' || !this.slides) return;
    this.slide = Math.max(0, Math.min(this.slides - 1, n));
    let i = 0;
    for (const p of this.parts.values()) {
      const on = i === this.slide;
      if (p.node.hidden === on) p.node.hidden = !on;
      i++;
    }
    setText(q(this.root, '.ft-deck-count'), `${this.slide + 1} / ${this.slides}`);
    q<HTMLButtonElement>(this.root, '.ft-deck-prev').disabled = this.slide === 0;
    q<HTMLButtonElement>(this.root, '.ft-deck-next').disabled = this.slide >= this.slides - 1;
  }

  private openNote(section: string): void {
    this.commentFor = section;
    const box = q(this.root, '.ft-doc-note');
    setText(q(box, '.ft-doc-note-on'), `Comment on "${section || 'the document'}"`);
    if (box.hidden) box.hidden = false;
    q<HTMLTextAreaElement>(box, 'textarea').focus();
  }

  private closeNote(): void {
    this.commentFor = null;
    const box = q(this.root, '.ft-doc-note');
    q<HTMLTextAreaElement>(box, 'textarea').value = '';
    if (!box.hidden) box.hidden = true;
  }

  private addNote(): void {
    const note = q<HTMLTextAreaElement>(this.root, '.ft-doc-note textarea').value.trim();
    if (!note || this.commentFor === null) return;
    const section = this.commentFor;
    const src = [...this.parts.values()].find((p) => heading(p.src) === section)?.src ?? '';
    this.hooks.comment({ path: `artifact:${this.artifactId}#${section}`, quote: src.slice(0, 600), note });
    this.closeNote();
  }
}

export function kindLabel(kind: string | undefined): string {
  return kind === 'doc' ? 'Document' : kind === 'sheet' ? 'Spreadsheet' : kind === 'deck' ? 'Slides' : 'HTML';
}

export function exportsFor(kind: string | undefined): Array<[string, string]> {
  if (kind === 'doc') return [['docx', 'Word (.docx)'], ['pdf', 'PDF'], ['md', 'Markdown']];
  if (kind === 'sheet') return [['xlsx', 'Excel (.xlsx)'], ['csv', 'CSV']];
  if (kind === 'deck') return [['pptx', 'PowerPoint (.pptx)'], ['pdf', 'PDF'], ['md', 'Markdown']];
  return [['html', 'HTML']];
}
