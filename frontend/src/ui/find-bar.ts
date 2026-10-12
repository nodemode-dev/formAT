import { el, q, setText } from './dom';
import { ui } from './icons-ft';

type Scope = () => { root: HTMLElement; scroller: HTMLElement } | null;

const SKIP = new Set(['SCRIPT', 'STYLE', 'TEXTAREA', 'INPUT', 'SELECT', 'NOSCRIPT']);

export class FindBar {
  readonly root: HTMLElement;
  private input: HTMLInputElement;
  private count: HTMLElement;
  private ranges: Range[] = [];
  private index = -1;
  private timer = 0;
  private supported = typeof CSS !== 'undefined' && 'highlights' in CSS && typeof Highlight !== 'undefined';

  constructor(private scope: Scope) {
    this.root = el(`<div class="ft-find" role="search" aria-label="Find in page" hidden>
      ${ui('search', 14)}
      <input class="ft-find-input" type="search" placeholder="Find in this view" aria-label="Find" spellcheck="false" autocomplete="off">
      <span class="ft-find-count" aria-live="polite"></span>
      <button type="button" class="ft-icon-btn ft-find-prev" aria-label="Previous match" title="Previous (Shift+Enter)">${ui('chevronDown', 14)}</button>
      <button type="button" class="ft-icon-btn ft-find-next" aria-label="Next match" title="Next (Enter)">${ui('chevronDown', 14)}</button>
      <button type="button" class="ft-icon-btn ft-find-close" aria-label="Close find" title="Close (Esc)">${ui('close', 14)}</button>
    </div>`);
    this.input = q<HTMLInputElement>(this.root, '.ft-find-input');
    this.count = q(this.root, '.ft-find-count');
    this.input.addEventListener('input', () => { window.clearTimeout(this.timer); this.timer = window.setTimeout(() => this.search(), 120); });
    this.input.addEventListener('keydown', (e) => {
      if (e.key === 'Enter') { e.preventDefault(); this.step(e.shiftKey ? -1 : 1); }
      else if (e.key === 'Escape') { e.preventDefault(); this.close(); }
    });
    q(this.root, '.ft-find-prev').addEventListener('click', () => this.step(-1));
    q(this.root, '.ft-find-next').addEventListener('click', () => this.step(1));
    q(this.root, '.ft-find-close').addEventListener('click', () => this.close());
  }

  get isOpen(): boolean {
    return !this.root.hidden;
  }

  open(): void {
    if (this.root.hidden) this.root.hidden = false;
    const sel = window.getSelection()?.toString().trim();
    if (sel && sel.length < 80 && !sel.includes('\n')) this.input.value = sel;
    this.input.focus();
    this.input.select();
    this.search();
  }

  close(): void {
    if (this.root.hidden) return;
    this.root.hidden = true;
    this.clear();
  }

  refresh(): void {
    if (!this.root.hidden) this.search(true);
  }

  private clear(): void {
    this.ranges = [];
    this.index = -1;
    if (this.supported) { CSS.highlights.delete('ft-find'); CSS.highlights.delete('ft-find-current'); }
    setText(this.count, '');
  }

  private search(keep = false): void {
    const term = this.input.value.trim().toLowerCase();
    const where = this.scope();
    const before = this.index;
    this.clear();
    if (!term || !where) return;
    const walker = document.createTreeWalker(where.root, NodeFilter.SHOW_TEXT, {
      acceptNode: (n) => {
        const p = n.parentElement;
        if (!p || SKIP.has(p.tagName) || p.closest('[hidden], .ft-find, [aria-hidden="true"]') || !p.getClientRects().length) return NodeFilter.FILTER_REJECT;
        return n.nodeValue && n.nodeValue.toLowerCase().includes(term) ? NodeFilter.FILTER_ACCEPT : NodeFilter.FILTER_SKIP;
      },
    });
    for (let n = walker.nextNode(); n && this.ranges.length < 2000; n = walker.nextNode()) {
      const text = (n.nodeValue as string).toLowerCase();
      for (let i = text.indexOf(term); i >= 0 && this.ranges.length < 2000; i = text.indexOf(term, i + term.length)) {
        const r = new Range();
        r.setStart(n, i);
        r.setEnd(n, i + term.length);
        this.ranges.push(r);
      }
    }
    if (!this.ranges.length) { setText(this.count, 'No matches'); return; }
    if (this.supported) CSS.highlights.set('ft-find', new Highlight(...this.ranges));
    this.index = keep && before >= 0 ? Math.min(before, this.ranges.length - 1) : 0;
    this.show(!keep);
  }

  private step(d: number): void {
    if (!this.ranges.length) { this.search(); return; }
    this.index = (this.index + d + this.ranges.length) % this.ranges.length;
    this.show(true);
  }

  private show(scroll: boolean): void {
    const r = this.ranges[this.index];
    const fold = r.startContainer.parentElement?.closest('details');
    if (fold && !fold.open && scroll) fold.open = true;
    setText(this.count, `${this.index + 1} of ${this.ranges.length}${this.ranges.length >= 2000 ? '+' : ''}`);
    if (this.supported) CSS.highlights.set('ft-find-current', new Highlight(r));
    const where = this.scope();
    if (!scroll || !where) return;
    const box = r.getBoundingClientRect();
    const view = where.scroller.getBoundingClientRect();
    if (box.top < view.top + 48 || box.bottom > view.bottom - 48) {
      where.scroller.scrollBy({ top: box.top - view.top - view.height / 3, behavior: 'auto' });
    }
  }
}
