import { run } from './engine-client/api';
import { EventStream, type EngineEvent } from './engine-client/events';
import { AppState, type Account, type Conversation, type FileInfo, type KeyStatus, type Message, type Model, type Settings, type View } from './state/app-state';
import { ChatView } from './ui/chat-view';
import { Composer } from './ui/composer';
import { el, modKey, q, setAttr, setText, writePref } from './ui/dom';
import { ui } from './ui/icons-ft';
import { closeMenus, openMenu } from './ui/menu';
import { Palette } from './ui/palette';
import { SidePanel } from './ui/side-panel';
import { Sidebar } from './ui/sidebar';
import { TerminalDock } from './ui/terminal-dock';
import { pageView, SettingsView, type InfoLike } from './ui/views';

type Layout = 'sidebar' | 'panel' | 'term';
const PREF: Record<Layout, string> = { sidebar: 'format.sidebar', panel: 'format.panel', term: 'format.terminal' };

export class App {
  readonly state = new AppState();
  private shell: HTMLElement;
  private sidebar: Sidebar;
  private composer: Composer;
  private chat: ChatView;
  private dock: TerminalDock;
  private palette: Palette;
  private settingsView: SettingsView;
  private pages = new Map<View, HTMLElement>();
  private title: HTMLElement;
  private stream = new EventStream();

  constructor(host: HTMLElement) {
    const html = document.documentElement;
    this.shell = el(`<div class="ft-app">
      <div class="ft-main">
        <header class="ft-topbar">
          <button type="button" class="ft-title-btn" data-menu-anchor aria-label="Chat options"><span class="ft-title-text">New chat</span>${ui('chevronDown', 14)}</button>
          <span class="ft-topbar-spacer"></span>
          <button type="button" class="ft-icon-btn ft-term-toggle" aria-label="Toggle terminal" title="Terminal (${modKey}J)">${ui('terminal')}</button>
          <button type="button" class="ft-icon-btn ft-panel-toggle" aria-label="Outputs" title="Outputs (${modKey}.)">${ui('outputs')}</button>
        </header>
        <div class="ft-body"><div class="ft-center"></div></div>
      </div>
    </div>`);
    this.title = q(this.shell, '.ft-title-text');
    this.sidebar = new Sidebar(this.state, {
      newChat: () => this.newChat(),
      openChat: (id) => void this.openChat(id),
      setView: (v) => this.setView(v),
      toggle: () => this.toggle('sidebar'),
      toggleTerminal: () => this.toggle('term'),
      openPalette: () => this.palette.open(),
      renamed: () => undefined,
      openSettings: (s) => this.openSettings(s),
    });
    this.composer = new Composer(this.state, {
      send: (t, f) => this.send(t, f),
      edit: async (t, id) => {
        if (!this.state.activeId) return;
        try { await run('chat.edit', { conversationId: this.state.activeId, text: t, messageId: id }); } catch (err) { this.composer.showError(err instanceof Error ? err.message : String(err)); }
      },
      stop: () => { if (this.state.activeId) void run('chat.stop', { conversationId: this.state.activeId }); },
      isRunning: () => !!this.state.activeId && this.state.running.has(this.state.activeId),
      openCustomize: () => this.setView('customize'),
      openKeys: () => this.openSettings('keys'),
    });
    this.chat = new ChatView(this.state, this.composer, {
      retry: () => { if (this.state.activeId) void run('chat.retry', { conversationId: this.state.activeId }); },
      edit: (t, id) => this.composer.startEdit(t, id),
      branch: (id) => {
        if (!this.state.activeId) return;
        run('chat.branch', { conversationId: this.state.activeId, messageId: id }).catch((err) => this.composer.showError(err instanceof Error ? err.message : String(err)));
      },
    });
    this.state.on('messages', () => this.updateContext());
    this.state.on('active', () => this.updateContext());
    this.state.on('settings', () => this.updateContext());
    this.settingsView = new SettingsView(this.state);
    const panel = new SidePanel(() => this.toggle('panel', false));
    this.dock = new TerminalDock(() => this.toggle('term', false));
    this.palette = new Palette(this.state, () => [
      { label: 'New chat', icon: 'plus', hint: `${modKey}⇧O`, run: () => this.newChat() },
      { label: 'Toggle sidebar', icon: 'sidebar', hint: `${modKey}B`, run: () => this.toggle('sidebar') },
      { label: 'Toggle outputs', icon: 'outputs', hint: `${modKey}.`, run: () => this.toggle('panel') },
      { label: 'API keys', icon: 'key', run: () => this.openSettings('keys') },
      { label: 'Keyboard shortcuts', icon: 'customize', hint: `${modKey}/`, run: () => this.shortcuts() },
      { label: 'Account', icon: 'user', run: () => this.openSettings('account') },
      { label: 'Toggle terminal', icon: 'terminal', hint: `${modKey}J`, run: () => this.toggle('term') },
      { label: 'Settings', icon: 'settings', run: () => this.setView('settings') },
      { label: 'Customize', icon: 'customize', run: () => this.setView('customize') },
    ], (id) => void this.openChat(id));

    this.shell.insertBefore(this.sidebar.root, this.shell.firstChild);
    const center = q(this.shell, '.ft-center');
    center.appendChild(this.chat.root);
    (['projects', 'artifacts', 'scheduled', 'customize'] as const).forEach((v) => {
      const p = pageView(v);
      this.pages.set(v, p);
      center.appendChild(p);
    });
    this.pages.set('settings', this.settingsView.root);
    center.appendChild(this.settingsView.root);
    q(this.shell, '.ft-body').appendChild(panel.root);
    q(this.shell, '.ft-main').appendChild(this.dock.root);
    host.appendChild(this.shell);
    (document.getElementById('overlay-root') as HTMLElement).appendChild(this.palette.root);

    q(this.shell, '.ft-panel-toggle').addEventListener('click', () => this.toggle('panel'));
    q(this.shell, '.ft-term-toggle').addEventListener('click', () => this.toggle('term'));
    q(this.shell, '.ft-title-btn').addEventListener('click', (e) => this.titleMenu(e.currentTarget as HTMLElement));
    document.addEventListener('keydown', (e) => this.keys(e));
    this.state.on('active', () => this.renderTitle());
    this.state.on('conversations', () => this.renderTitle());
    this.sidebar.setTerminalOpen(html.dataset.ftTerm === 'open');
    this.syncToggles();
    if (html.dataset.ftTerm === 'open') void this.dock.ensure();
  }

  async load(): Promise<void> {
    const [list, settings, info, account, keys, voice] = await Promise.all([
      run<{ conversations: Conversation[] }>('conversation.list'),
      run<Settings>('settings.get'),
      run<InfoLike>('app.info'),
      run<Account>('account.get'),
      run<Record<string, KeyStatus>>('keys.status'),
      fetch('/api/voice').then((r) => r.json()).catch(() => ({ engines: undefined })),
    ]);
    list.conversations.forEach((c) => this.state.conversations.set(c.id, c));
    this.state.settings = settings;
    this.state.account = account;
    this.state.keys = keys;
    this.state.anthropicKey = !!keys.anthropic?.set;
    this.sidebar.setKey(this.state.anthropicKey);
    this.sidebar.setAccount(account);
    this.settingsView.fill(info, voice.engines);
    await this.loadModels();
    this.state.emit('conversations');
    this.state.emit('account');
    this.state.emit('keys');
    this.state.emit('view');
    this.stream.on((e) => this.onEvent(e));
    this.stream.start();
  }

  private async loadModels(): Promise<void> {
    const models = await run<{ models: Model[]; efforts: string[]; source: string; error: string | null }>('models.list');
    this.state.models = models.models;
    this.state.efforts = models.efforts;
    this.state.modelSource = models.source;
    this.state.modelError = models.error;
    this.state.emit('settings');
  }

  private updateContext(): void {
    const last = [...this.state.messages].reverse().find((m) => m.role === 'assistant' && m.meta?.usage);
    const u = (last?.meta?.usage ?? {}) as Record<string, number | null>;
    const used = ['input_tokens', 'cache_creation_input_tokens', 'cache_read_input_tokens', 'output_tokens'].reduce((a, k) => a + (Number(u[k]) || 0), 0);
    const windowSize = this.state.models.find((m) => m.id === (last?.meta?.model ?? this.state.settings.model))?.contextWindow ?? 0;
    if (!used || !windowSize) { this.composer.setContext('', '', false); return; }
    const pct = Math.max(1, Math.round((100 * used) / windowSize));
    this.composer.setContext(`${pct}% context`, `${used.toLocaleString()} of ${windowSize.toLocaleString()} tokens used by the last turn`, pct >= 80);
  }

  private shortcuts(): void {
    let sheet = document.getElementById('ft-shortcuts');
    if (!sheet) {
      const rows: Array<[string, string]> = [['New chat', `${modKey}⇧O`], ['Command palette and search', `${modKey}K`], ['Sidebar open or rail', `${modKey}B`], ['Terminal', `${modKey}J`], ['Outputs', `${modKey}.`], ['Add files', `${modKey}U`], ['Keyboard shortcuts', `${modKey}/`], ['Send', 'Enter'], ['New line', '⇧Enter'], ['Close a menu or dialog', 'Esc']];
      sheet = el(`<div class="ft-sheet-scrim" id="ft-shortcuts" hidden><div class="ft-sheet" role="dialog" aria-label="Keyboard shortcuts"><h2>Keyboard shortcuts</h2><dl>${rows.map(([a, k]) => `<dt>${a}</dt><dd>${k}</dd>`).join('')}</dl></div></div>`);
      sheet.addEventListener('pointerdown', (e) => { if (e.target === sheet) sheet!.hidden = true; });
      document.addEventListener('keydown', (e) => { if (e.key === 'Escape' && sheet && !sheet.hidden) sheet.hidden = true; });
      (document.getElementById('overlay-root') as HTMLElement).appendChild(sheet);
    }
    sheet.hidden = !sheet.hidden;
  }

  openSettings(section: 'account' | 'keys' | 'about'): void {
    this.setView('settings');
    this.settingsView.scrollTo(section);
  }

  private setRunning(conversationId: string, on: boolean): void {
    if (this.state.running.has(conversationId) === on) return;
    if (on) this.state.running.add(conversationId);
    else this.state.running.delete(conversationId);
    this.state.emit('running');
  }

  private onEvent(e: EngineEvent): void {
    if (e.type === 'conversation.created' || e.type === 'conversation.updated') {
      const c = e.conversation as Conversation;
      this.state.conversations.set(c.id, c);
      if (e.type === 'conversation.created' && this.claimNext) {
        this.claimNext = false;
        this.state.activeId = c.id;
        this.state.messages = [];
        this.setView('chat');
        this.state.emit('active');
      }
      this.state.emit('conversations');
    } else if (e.type === 'conversation.deleted') {
      this.state.conversations.delete(e.id as string);
      if (this.state.activeId === e.id) this.newChat();
      this.state.emit('conversations');
    } else if (e.type === 'message.added') {
      const m = e.message as Message;
      const c = this.state.conversations.get(m.conversation_id);
      if (c) { c.updated = m.created; this.state.emit('conversations'); }
      if (m.role === 'assistant' && m.meta?.status === 'streaming') this.setRunning(m.conversation_id, true);
      if (m.conversation_id === this.state.activeId && !this.state.messages.some((x) => x.id === m.id)) {
        this.state.messages.push(m);
        this.state.emit('messages');
      }
    } else if (e.type === 'message.block') {
      if (e.conversationId === this.state.activeId) this.chat.applyBlock(e.id as string, e.index as number, (e.block as { type: string }).type);
    } else if (e.type === 'message.delta') {
      if (e.conversationId === this.state.activeId) this.chat.applyDelta(e.id as string, e.index as number, e.kind as string, e.text as string);
    } else if (e.type === 'message.completed') {
      const m = e.message as Message;
      this.setRunning(m.conversation_id, false);
      if (m.conversation_id === this.state.activeId) {
        const i = this.state.messages.findIndex((x) => x.id === m.id);
        if (i >= 0) this.state.messages[i] = m;
        this.chat.complete(m);
        this.updateContext();
        const next = this.composer.nextQueued();
        if (next) void this.send(next.text, next.files);
      }
    } else if (e.type === 'message.deleted') {
      if (e.conversationId === this.state.activeId) {
        this.state.messages = this.state.messages.filter((x) => x.id !== e.id);
        this.state.emit('messages');
      }
    } else if (e.type === 'conversation.path') {
      if (e.conversationId === this.state.activeId) {
        this.state.messages = e.messages as Message[];
        this.state.emit('messages');
      }
    } else if (e.type === 'settings.changed') {
      this.state.settings = e.settings as Settings;
      this.state.emit('settings');
    } else if (e.type === 'account.changed') {
      this.state.account = e.account as Account;
      this.sidebar.setAccount(this.state.account);
      this.state.emit('account');
    } else if (e.type === 'keys.changed') {
      this.state.keys = e.keys as Record<string, KeyStatus>;
      this.state.anthropicKey = !!this.state.keys.anthropic?.set;
      this.sidebar.setKey(this.state.anthropicKey);
      this.state.emit('keys');
      void this.loadModels();
    }
  }

  private layout(which: Layout): string {
    const html = document.documentElement;
    return which === 'sidebar' ? html.dataset.ftSidebar ?? 'open' : which === 'panel' ? html.dataset.ftPanel ?? 'closed' : html.dataset.ftTerm ?? 'closed';
  }

  toggle(which: Layout, force?: boolean): void {
    const html = document.documentElement;
    const cur = this.layout(which);
    const openWord = 'open';
    const closedWord = which === 'sidebar' ? 'rail' : 'closed';
    const next = force === undefined ? (cur === openWord ? closedWord : openWord) : force ? openWord : closedWord;
    if (next === cur) return;
    const key = which === 'sidebar' ? 'ftSidebar' : which === 'panel' ? 'ftPanel' : 'ftTerm';
    html.dataset[key] = next;
    writePref(PREF[which], next);
    if (which === 'term') {
      this.sidebar.setTerminalOpen(next === 'open');
      if (next === 'open') void this.dock.ensure();
      else this.composer.focus();
    }
    this.syncToggles();
  }

  private syncToggles(): void {
    setAttr(q(this.shell, '.ft-panel-toggle'), 'aria-pressed', String(this.layout('panel') === 'open'));
    setAttr(q(this.shell, '.ft-term-toggle'), 'aria-pressed', String(this.layout('term') === 'open'));
  }

  setView(view: View): void {
    closeMenus();
    this.state.view = view;
    this.chat.root.hidden = view !== 'chat';
    for (const [v, p] of this.pages) if (p.hidden === (v === view)) p.hidden = v !== view;
    this.state.emit('view');
    this.renderTitle();
    if (view === 'chat') this.composer.focus();
  }

  newChat(): void {
    this.state.activeId = null;
    this.state.messages = [];
    this.setView('chat');
    this.state.emit('active');
  }

  async openChat(id: string): Promise<void> {
    const conv = await run<Conversation & { messages: Message[] }>('conversation.get', { id });
    this.state.activeId = id;
    this.state.messages = conv.messages;
    const last = conv.messages[conv.messages.length - 1];
    this.setRunning(id, !!last && last.role === 'assistant' && last.meta?.status === 'streaming');
    this.setView('chat');
    this.state.emit('active');
  }

  private claimNext = false;

  private async send(text: string, files: FileInfo[] = []): Promise<void> {
    const id = this.state.activeId;
    if (!id) this.claimNext = true;
    try {
      await run('chat.send', { text, conversationId: id ?? undefined, attachments: files.map((f) => f.id) });
    } catch (err) {
      this.claimNext = false;
      this.composer.showError(err instanceof Error ? err.message : String(err));
    }
  }

  private renderTitle(): void {
    const c = this.state.activeId ? this.state.conversations.get(this.state.activeId) : null;
    const pageTitle: Record<View, string> = { chat: c?.title ?? 'New chat', projects: 'Projects', artifacts: 'Artifacts', scheduled: 'Scheduled', customize: 'Customize', settings: 'Settings' };
    setText(this.title, pageTitle[this.state.view]);
    document.title = this.state.view === 'chat' && c ? `${c.title} · Format` : 'Format';
  }

  private titleMenu(anchor: HTMLElement): void {
    const id = this.state.activeId;
    const c = id ? this.state.conversations.get(id) : null;
    if (!id || !c || this.state.view !== 'chat') return;
    openMenu(anchor, [
      { label: c.pinned ? 'Unpin' : 'Pin', icon: 'pin', action: () => void run('conversation.pin', { id, pinned: !c.pinned }) },
      { label: 'Rename', icon: 'pencil', action: () => { if (this.layout('sidebar') === 'rail') this.toggle('sidebar', true); this.sidebar.rename(id); } },
      { divider: true },
      { label: 'Delete', icon: 'trash', action: () => void run('conversation.delete', { id }) },
    ], 'down');
  }

  private keys(e: KeyboardEvent): void {
    const mod = e.metaKey || e.ctrlKey;
    if (!mod) return;
    const k = e.key.toLowerCase();
    if (k === 'b' && !e.shiftKey) { e.preventDefault(); this.toggle('sidebar'); }
    else if (k === 'k') { e.preventDefault(); if (this.palette.isOpen) this.palette.close(); else this.palette.open(); }
    else if (k === 'j') { e.preventDefault(); this.toggle('term'); }
    else if (k === '.') { e.preventDefault(); this.toggle('panel'); }
    else if (k === 'o' && e.shiftKey) { e.preventDefault(); this.newChat(); }
    else if (k === '/') { e.preventDefault(); this.shortcuts(); }
    else if (k === 'u' && !e.shiftKey && this.state.view === 'chat') { e.preventDefault(); this.composer.openFilePicker(); }
  }
}
