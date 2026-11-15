import { run } from '../engine-client/api';
import type { Account, AppState, Conversation, View } from '../state/app-state';
import { el, esc, modKey, q, setAttr, setText } from './dom';
import { icon, ui, type UiIcon } from './icons-ft';
import { openMenu } from './menu';

export interface SidebarHooks {
  newChat(): void;
  openChat(id: string): void;
  setView(view: View): void;
  toggle(): void;
  toggleTerminal(): void;
  openPalette(): void;
  renamed(id: string): void;
  openSettings(section: 'account' | 'keys' | 'about'): void;
}

const NAV: Array<[View | 'new', string, UiIcon]> = [
  ['new', 'New chat', 'plus'],
  ['projects', 'Projects', 'projects'],
  ['artifacts', 'Artifacts', 'artifacts'],
  ['scheduled', 'Scheduled', 'clock'],
  ['customize', 'Customize', 'customize'],
];

function bucket(ts: number): string {
  const d = new Date(ts * 1000);
  const now = new Date();
  const start = new Date(now.getFullYear(), now.getMonth(), now.getDate()).getTime();
  const t = d.getTime();
  if (t >= start) return 'Today';
  if (t >= start - 86400000) return 'Yesterday';
  if (t >= start - 6 * 86400000) return 'Previous 7 days';
  return 'Older';
}

export class Sidebar {
  readonly root: HTMLElement;
  private list: HTMLElement;
  private rows = new Map<string, HTMLElement>();
  private heads = new Map<string, HTMLElement>();
  private lastInput = 0;
  private deferred = false;
  private keyLine: HTMLElement;
  private moreOpen = false;

  constructor(private state: AppState, private hooks: SidebarHooks) {
    this.root = el(`<aside class="ft-sidebar" aria-label="Sidebar">
      <div class="ft-side-head">
        <button type="button" class="ft-icon-btn ft-side-toggle" title="Toggle sidebar (${modKey}B)" aria-label="Toggle sidebar">${ui('sidebar')}</button>
        <span class="ft-wordmark"><span class="ft-wordmark-home" data-cmd="home" role="button" tabindex="0" title="Home: a new chat"><span class="ft-wordmark-mark">${icon('mark', 18)}</span><span class="ft-label">Format</span></span></span>
        <div class="ft-seg ft-label" role="group" aria-label="Mode">
          <button type="button" class="ft-seg-btn is-on" data-mode="chat" title="Chat" aria-pressed="true">${ui('chat', 16)}</button>
          <button type="button" class="ft-seg-btn" data-mode="terminal" title="Terminal (${modKey}J)" aria-pressed="false">${ui('terminal', 16)}</button>
        </div>
      </div>
      <button type="button" class="ft-search" title="Search (${modKey}K)"><span class="ft-search-ico">${ui('search', 16)}</span><span class="ft-label">Search</span><kbd class="ft-label">${modKey}K</kbd></button>
      <nav class="ft-nav" aria-label="Main">
        ${NAV.map(([id, label, ic]) => `<button type="button" class="ft-nav-row" data-nav="${id}" title="${label}"><span class="ft-nav-ico">${ui(ic)}</span><span class="ft-label">${label}</span></button>`).join('')}
        <button type="button" class="ft-nav-row" data-nav="more" title="More" aria-expanded="false"><span class="ft-nav-ico ft-more-ico">${ui('chevronRight')}</span><span class="ft-label">More</span></button>
        <div class="ft-nav-more" hidden>
          <button type="button" class="ft-nav-row" data-nav="terminal" title="Terminal"><span class="ft-nav-ico">${ui('terminal')}</span><span class="ft-label">Terminal</span></button>
          <button type="button" class="ft-nav-row" data-nav="settings" title="Settings"><span class="ft-nav-ico">${ui('settings')}</span><span class="ft-label">Settings</span></button>
        </div>
      </nav>
      <div class="ft-recents ft-label" role="list" aria-label="Chats"></div>
      <div class="ft-side-foot">
        <button type="button" class="ft-account" data-menu-anchor title="Account and settings" aria-label="Account and settings">
          <span class="ft-avatar">F</span>
          <span class="ft-account-text ft-label"><span class="ft-account-name">Local</span><span class="ft-account-sub">checking key</span></span>
          <span class="ft-account-chev ft-label">${ui('chevronDown', 14)}</span>
        </button>
      </div>
    </aside>`);
    this.list = q(this.root, '.ft-recents');
    this.keyLine = q(this.root, '.ft-account-sub');
    q(this.root, '.ft-side-toggle').addEventListener('click', () => hooks.toggle());
    q(this.root, '.ft-search').addEventListener('click', () => hooks.openPalette());
    q(this.root, '.ft-account').addEventListener('click', (e) => this.accountMenu(e.currentTarget as HTMLElement));
    this.root.querySelectorAll<HTMLButtonElement>('.ft-seg-btn').forEach((b) =>
      b.addEventListener('click', () => (b.dataset.mode === 'terminal' ? hooks.toggleTerminal() : hooks.setView('chat'))),
    );
    this.root.addEventListener('click', (e) => {
      const nav = (e.target as HTMLElement).closest<HTMLElement>('[data-nav]');
      if (!nav) return;
      const id = nav.dataset.nav as string;
      if (id === 'new') hooks.newChat();
      else if (id === 'more') this.toggleMore(nav);
      else if (id === 'terminal') hooks.toggleTerminal();
      else hooks.setView(id as View);
    });
    this.list.addEventListener('click', (e) => {
      const target = e.target as HTMLElement;
      const row = target.closest<HTMLElement>('[data-id]');
      if (!row) return;
      if (target.closest('.ft-recent-more')) {
        e.stopPropagation();
        this.rowMenu(row.dataset.id as string, target.closest('.ft-recent-more') as HTMLElement);
        return;
      }
      hooks.openChat(row.dataset.id as string);
    });
    state.on('conversations', () => this.renderList());
    const input = () => {
      this.lastInput = performance.now();
      if (this.deferred) { this.deferred = false; this.renderList(); }
    };
    document.addEventListener('pointerdown', input, true);
    document.addEventListener('keydown', input, true);
    state.on('active', () => this.markActive());
    state.on('view', () => this.markView());
    state.on('running', () => this.markActivity());
    state.on('settings', () => this.setKey(this.state.anthropicKey));
  }

  setTerminalOpen(open: boolean): void {
    this.root.querySelectorAll<HTMLButtonElement>('.ft-seg-btn').forEach((b) => {
      const on = b.dataset.mode === 'terminal' ? open : !open;
      b.classList.toggle('is-on', on);
      setAttr(b, 'aria-pressed', String(on));
    });
  }

  setKey(present: boolean): void {
    const via = this.state.route();
    setText(this.keyLine, present && via === 'api' ? 'Anthropic key set' : via === 'claude-code' ? 'Through Claude Code' : present ? 'Anthropic key set' : 'No API key yet');
  }

  setAccount(a: Account): void {
    const name = a.displayName.trim() || 'Local';
    setText(q(this.root, '.ft-account-name'), name);
    setText(q(this.root, '.ft-avatar'), name.slice(0, 1).toUpperCase());
  }

  private accountMenu(anchor: HTMLElement): void {
    openMenu(anchor, [
      { note: this.state.account.displayName || 'Local account' },
      { label: 'Account', icon: 'user', action: () => this.hooks.openSettings('account') },
      { label: 'API keys', icon: 'key', value: this.state.anthropicKey ? 'set' : 'add', action: () => this.hooks.openSettings('keys') },
      { label: 'Settings', icon: 'settings', action: () => this.hooks.openSettings('about') },
      { divider: true },
      { label: 'Command palette', icon: 'search', hint: `${modKey}K`, action: () => this.hooks.openPalette() },
    ], 'up');
  }

  private toggleMore(btn: HTMLElement): void {
    this.moreOpen = !this.moreOpen;
    (q(this.root, '.ft-nav-more') as HTMLElement).hidden = !this.moreOpen;
    setAttr(btn, 'aria-expanded', String(this.moreOpen));
    btn.classList.toggle('is-open', this.moreOpen);
  }

  private head(name: string): HTMLElement {
    let h = this.heads.get(name);
    if (!h) {
      h = el(`<div class="ft-recent-head" role="presentation">${esc(name)}</div>`);
      this.heads.set(name, h);
    }
    return h;
  }

  private row(c: Conversation): HTMLElement {
    let r = this.rows.get(c.id);
    if (!r) {
      r = el(`<div class="ft-recent" role="listitem" data-id="${esc(c.id)}"><button type="button" class="ft-recent-title"></button><span class="ft-recent-dot" aria-hidden="true"></span><button type="button" class="ft-recent-more" aria-label="Chat options">${ui('more', 16)}</button></div>`);
      this.rows.set(c.id, r);
      this.paintActivity(c.id, r);
    }
    setText(q(r, '.ft-recent-title'), c.title);
    setAttr(q(r, '.ft-recent-title'), 'title', c.title);
    r.classList.toggle('is-pinned', c.pinned);
    return r;
  }

  private renderList(): void {
    const ordered = this.state.sortedConversations();
    const active = this.state.activeId;
    const activeNew = !!active && !this.rows.has(active) && this.state.conversations.has(active);
    const stale = [...this.rows.keys()].some((id) => !this.state.conversations.has(id));
    const wanted: HTMLElement[] = [];
    let last = '';
    for (const c of ordered) {
      const group = c.pinned ? 'Pinned' : bucket(c.updated);
      if (group !== last) {
        wanted.push(this.head(group));
        last = group;
      }
      wanted.push(this.row(c));
    }
    const quiet = performance.now() - this.lastInput > 450;
    const moves = wanted.some((node, i) => this.list.children[i] !== node);
    if (moves && quiet && !activeNew && !stale && this.list.childElementCount > 0 && this.list.offsetParent !== null) {
      this.deferred = true;
      this.markActive();
      return;
    }
    this.deferred = false;
    for (const [id, r] of this.rows) if (!this.state.conversations.has(id)) { r.remove(); this.rows.delete(id); }
    for (const [name, h] of this.heads) if (!wanted.includes(h)) h.remove();
    wanted.forEach((node, i) => {
      if (this.list.children[i] !== node) this.list.insertBefore(node, this.list.children[i] ?? null);
    });
    this.markActive();
  }

  private paintActivity(id: string, r: HTMLElement): void {
    const want = this.state.waiting.get(id)?.size ? 'waiting' : this.state.running.has(id) ? 'running' : '';
    if ((r.dataset.activity ?? '') === want) return;
    if (want) r.dataset.activity = want;
    else delete r.dataset.activity;
    setAttr(q(r, '.ft-recent-dot'), 'title', want === 'waiting' ? 'Waiting for you' : want === 'running' ? 'Working' : null);
  }

  private markActivity(): void {
    for (const [id, r] of this.rows) this.paintActivity(id, r);
  }

  private markActive(): void {
    for (const [id, r] of this.rows) r.classList.toggle('is-active', id === this.state.activeId && this.state.view === 'chat');
  }

  private markView(): void {
    this.root.querySelectorAll<HTMLElement>('.ft-nav-row[data-nav]').forEach((b) => b.classList.toggle('is-active', b.dataset.nav === this.state.view));
    this.markActive();
  }

  private rowMenu(id: string, anchor: HTMLElement): void {
    const c = this.state.conversations.get(id);
    if (!c) return;
    openMenu(anchor, [
      { label: c.pinned ? 'Unpin' : 'Pin', icon: 'pin', action: () => void run('conversation.pin', { id, pinned: !c.pinned }) },
      { label: 'Rename', icon: 'pencil', action: () => this.rename(id) },
      { divider: true },
      { label: 'Delete', icon: 'trash', action: () => void run('conversation.delete', { id }) },
    ], 'down');
  }

  rename(id: string): void {
    const r = this.rows.get(id);
    const c = this.state.conversations.get(id);
    if (!r || !c) {
      this.hooks.renamed(id);
      return;
    }
    const title = q<HTMLButtonElement>(r, '.ft-recent-title');
    const input = el<HTMLInputElement>(`<input class="ft-recent-input" aria-label="Chat name">`);
    input.value = c.title;
    title.hidden = true;
    r.insertBefore(input, title);
    input.focus();
    input.select();
    let done = false;
    const finish = (commit: boolean) => {
      if (done) return;
      done = true;
      const value = input.value.trim();
      input.remove();
      title.hidden = false;
      if (commit && value && value !== c.title) void run('conversation.rename', { id, title: value });
    };
    input.addEventListener('keydown', (e) => {
      if (e.key === 'Enter') finish(true);
      if (e.key === 'Escape') finish(false);
    });
    input.addEventListener('blur', () => finish(true));
  }
}
