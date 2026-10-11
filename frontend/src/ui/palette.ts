import { run } from '../engine-client/api';
import type { AppState } from '../state/app-state';
import { el, esc, modKey, q } from './dom';
import { ui, type UiIcon } from './icons-ft';

export interface PaletteAction {
  label: string;
  icon: UiIcon;
  hint?: string;
  run(): void;
}

export class Palette {
  readonly root: HTMLElement;
  private input: HTMLInputElement;
  private list: HTMLElement;
  private items: PaletteAction[] = [];
  private index = 0;
  private hits = new Set<string>();
  private searchTimer = 0;

  constructor(private state: AppState, private actions: () => PaletteAction[], private openChat: (id: string) => void) {
    this.root = el(`<div class="ft-palette-scrim" hidden>
      <div class="ft-palette" role="dialog" aria-label="Command palette">
        <div class="ft-palette-field">${ui('search', 16)}<input class="ft-palette-input" placeholder="Search chats and commands" aria-label="Search chats and commands"></div>
        <div class="ft-palette-list" role="listbox"></div>
      </div>
    </div>`);
    this.input = q(this.root, '.ft-palette-input');
    this.list = q(this.root, '.ft-palette-list');
    this.root.addEventListener('pointerdown', (e) => { if (e.target === this.root) this.close(); });
    this.input.addEventListener('input', () => {
      this.index = 0;
      this.render();
      window.clearTimeout(this.searchTimer);
      const needle = this.input.value.trim();
      if (needle.length < 3) { this.hits = new Set(); return; }
      this.searchTimer = window.setTimeout(() => {
        void run<{ conversations: Array<{ id: string }> }>('conversation.list', { query: needle, limit: 50 }).then((res) => {
          if (this.input.value.trim() !== needle) return;
          this.hits = new Set(res.conversations.map((c) => c.id));
          this.render();
        }).catch(() => undefined);
      }, 180);
    });
    this.input.addEventListener('keydown', (e) => {
      if (e.key === 'ArrowDown') { e.preventDefault(); this.move(1); }
      else if (e.key === 'ArrowUp') { e.preventDefault(); this.move(-1); }
      else if (e.key === 'Enter') { e.preventDefault(); this.choose(this.index); }
      else if (e.key === 'Escape') { e.preventDefault(); this.close(); }
    });
    this.list.addEventListener('click', (e) => {
      const row = (e.target as HTMLElement).closest<HTMLElement>('[data-i]');
      if (row) this.choose(Number(row.dataset.i));
    });
  }

  get isOpen(): boolean {
    return !this.root.hidden;
  }

  open(): void {
    this.input.value = '';
    this.index = 0;
    this.render();
    this.root.hidden = false;
    this.input.focus();
  }

  close(): void {
    this.root.hidden = true;
  }

  private move(d: number): void {
    if (!this.items.length) return;
    this.index = (this.index + d + this.items.length) % this.items.length;
    this.list.querySelectorAll('.ft-palette-row').forEach((r, i) => r.classList.toggle('is-on', i === this.index));
    (this.list.children[this.index] as HTMLElement | undefined)?.scrollIntoView({ block: 'nearest' });
  }

  private choose(i: number): void {
    const item = this.items[i];
    if (!item) return;
    this.close();
    item.run();
  }

  private render(): void {
    const needle = this.input.value.trim().toLowerCase();
    const convs = this.state.sortedConversations();
    const chats: PaletteAction[] = convs.filter((c) => !needle || c.title.toLowerCase().includes(needle) || this.hits.has(c.id))
      .map((c) => ({ label: c.title, icon: 'chat' as const, hint: needle && !c.title.toLowerCase().includes(needle) ? 'in messages' : undefined, run: () => this.openChat(c.id) }));
    const actions = this.actions().filter((a) => !needle || a.label.toLowerCase().includes(needle));
    this.items = [...actions, ...chats].slice(0, 50);
    this.list.innerHTML = this.items.length
      ? this.items.map((a, i) => `<button type="button" class="ft-palette-row${i === this.index ? ' is-on' : ''}" data-i="${i}" role="option">${ui(a.icon, 16)}<span>${esc(a.label)}</span>${a.hint ? `<kbd>${esc(a.hint)}</kbd>` : ''}</button>`).join('')
      : `<div class="ft-palette-none">Nothing matches. ${esc(modKey)}K closes.</div>`;
  }
}
