import { el, esc, setAttr, setText } from './dom';
import { ui, type UiIcon } from './icons-ft';

export interface SlashItem {
  id: string;
  label: string;
  desc: string;
  group: string;
  icon: UiIcon;
  hint?: string;
  run(): void;
}

interface Row { item: SlashItem; node: HTMLButtonElement; text: string }

export class SlashMenu {
  readonly root: HTMLElement;
  private list: HTMLElement;
  private none: HTMLElement;
  private rows: Row[] = [];
  private heads = new Map<string, HTMLElement>();
  private active = -1;
  private visible: Row[] = [];
  query = '';

  constructor(private onPick: (item: SlashItem) => void) {
    this.root = el(`<div class="ft-slash" role="listbox" aria-label="Commands and skills" hidden>
      <div class="ft-slash-list"></div>
      <p class="ft-slash-none" hidden>No command or skill matches</p>
      <div class="ft-slash-foot"><span><kbd>Up</kbd><kbd>Down</kbd> to move</span><span><kbd>Enter</kbd> or <kbd>Tab</kbd> to pick</span><span><kbd>Esc</kbd> to close</span></div>
    </div>`);
    this.list = this.root.querySelector('.ft-slash-list') as HTMLElement;
    this.none = this.root.querySelector('.ft-slash-none') as HTMLElement;
    this.root.addEventListener('pointerdown', (e) => e.preventDefault());
    this.list.addEventListener('pointermove', (e) => {
      const node = (e.target as HTMLElement).closest<HTMLButtonElement>('.ft-slash-item');
      const i = node ? this.visible.findIndex((r) => r.node === node) : -1;
      if (i >= 0 && i !== this.active) this.mark(i, false);
    });
    this.list.addEventListener('click', (e) => {
      const node = (e.target as HTMLElement).closest<HTMLButtonElement>('.ft-slash-item');
      const row = node && this.rows.find((r) => r.node === node);
      if (row) this.pick(row.item);
    });
  }

  get isOpen(): boolean {
    return !this.root.hidden;
  }

  setItems(items: SlashItem[]): void {
    const want = new Set(items.map((i) => i.id));
    for (const r of this.rows) if (!want.has(r.item.id)) r.node.remove();
    const known = new Map(this.rows.filter((r) => want.has(r.item.id)).map((r) => [r.item.id, r]));
    const next: Row[] = [];
    let anchor: Element | null = null;
    let group = '';
    for (const item of items) {
      if (item.group !== group) {
        group = item.group;
        let head = this.heads.get(group);
        if (!head) {
          head = el(`<div class="ft-slash-group" role="presentation">${esc(group)}</div>`);
          this.heads.set(group, head);
        }
        if (head.parentElement !== this.list || head.previousElementSibling !== anchor) this.list.insertBefore(head, anchor ? anchor.nextSibling : this.list.firstChild);
        anchor = head;
      }
      let row = known.get(item.id);
      if (!row) {
        const node = el<HTMLButtonElement>(`<button type="button" class="ft-slash-item" role="option" aria-selected="false" tabindex="-1">
          <span class="ft-slash-icon"></span><span class="ft-slash-text"><span class="ft-slash-label"></span><span class="ft-slash-desc"></span></span><span class="ft-slash-hint"></span></button>`);
        row = { item, node, text: '' };
      }
      row.item = item;
      row.text = `${item.label} ${item.desc} ${item.group}`.toLowerCase();
      const icon = row.node.querySelector('.ft-slash-icon') as HTMLElement;
      if (icon.dataset.icon !== item.icon) { icon.dataset.icon = item.icon; icon.innerHTML = ui(item.icon, 16); }
      setText(row.node.querySelector('.ft-slash-label') as HTMLElement, item.label);
      setText(row.node.querySelector('.ft-slash-desc') as HTMLElement, item.desc);
      setText(row.node.querySelector('.ft-slash-hint') as HTMLElement, item.hint ?? '');
      setAttr(row.node, 'data-group', item.group);
      if (row.node.parentElement !== this.list || row.node.previousElementSibling !== anchor) this.list.insertBefore(row.node, anchor ? anchor.nextSibling : this.list.firstChild);
      anchor = row.node;
      next.push(row);
    }
    for (const [g, head] of this.heads) if (!items.some((i) => i.group === g)) { head.remove(); this.heads.delete(g); }
    this.rows = next;
    if (this.isOpen) this.filter(this.query);
  }

  open(query: string): void {
    if (this.root.hidden) {
      const top = this.root.parentElement?.getBoundingClientRect().top ?? window.innerHeight;
      const room = Math.max(96, Math.min(340, Math.floor(top) - 120));
      if (this.list.style.maxHeight !== `${room}px`) this.list.style.maxHeight = `${room}px`;
      this.root.hidden = false;
    }
    this.filter(query);
  }

  close(): void {
    if (!this.root.hidden) this.root.hidden = true;
    this.active = -1;
  }

  filter(query: string): void {
    this.query = query;
    const qy = query.toLowerCase();
    const starts = this.rows.filter((r) => r.item.label.toLowerCase().replace(/^\//, '').startsWith(qy));
    const prev = this.visible[this.active]?.item.id;
    this.visible = [];
    for (const r of this.rows) {
      const show = !qy || r.text.includes(qy);
      if (r.node.hidden === show) r.node.hidden = !show;
      if (show) this.visible.push(r);
    }
    for (const [g, head] of this.heads) {
      const show = this.visible.some((r) => r.item.group === g);
      if (head.hidden === show) head.hidden = !show;
    }
    if (this.none.hidden === !!this.visible.length) this.none.hidden = !!this.visible.length;
    const keep = this.visible.findIndex((r) => r.item.id === prev);
    const first = starts.length ? this.visible.indexOf(starts[0]) : 0;
    this.mark(qy ? Math.max(first, 0) : keep >= 0 ? keep : 0, true);
  }

  key(e: KeyboardEvent): boolean {
    if (!this.isOpen) return false;
    if (e.key === 'ArrowDown' || e.key === 'ArrowUp') {
      if (this.visible.length) this.mark((this.active + (e.key === 'ArrowDown' ? 1 : -1) + this.visible.length) % this.visible.length, true);
      return true;
    }
    if ((e.key === 'Enter' || e.key === 'Tab') && !e.shiftKey && !e.isComposing) {
      const row = this.visible[this.active];
      if (!row) return false;
      this.pick(row.item);
      return true;
    }
    if (e.key === 'Escape') {
      this.close();
      return true;
    }
    return false;
  }

  private pick(item: SlashItem): void {
    this.close();
    this.onPick(item);
  }

  private mark(i: number, reveal: boolean): void {
    const old = this.visible[this.active]?.node;
    const row = this.visible[i];
    this.active = row ? i : -1;
    for (const r of this.rows) {
      const on = r === row;
      if (r.node.classList.contains('is-active') !== on) r.node.classList.toggle('is-active', on);
      if ((r.node.getAttribute('aria-selected') === 'true') !== on) r.node.setAttribute('aria-selected', String(on));
    }
    if (!row || !reveal || row.node === old) return;
    const top = row.node.offsetTop;
    const bottom = top + row.node.offsetHeight;
    if (top < this.list.scrollTop) this.list.scrollTop = top - 28;
    else if (bottom > this.list.scrollTop + this.list.clientHeight) this.list.scrollTop = bottom - this.list.clientHeight;
  }
}
