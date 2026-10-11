import { run } from './engine-client/api';
import { EventStream, type EngineEvent } from './engine-client/events';
import { AppState, type Conversation, type Message, type Model, type Settings, type View } from './state/app-state';
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
  private settingsView = new SettingsView();
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
          <button type="button" class="ft-icon-btn ft-panel-toggle" aria-label="Toggle side panel" title="Side panel (${modKey}.)">${ui('panelRight')}</button>
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
    });
    this.composer = new Composer(this.state, { send: (t) => this.send(t), openCustomize: () => this.setView('customize') });
    this.chat = new ChatView(this.state, this.composer);
    const panel = new SidePanel(() => this.toggle('panel', false));
    this.dock = new TerminalDock(() => this.toggle('term', false));
    this.palette = new Palette(this.state, () => [
      { label: 'New chat', icon: 'plus', hint: `${modKey}⇧O`, run: () => this.newChat() },
      { label: 'Toggle sidebar', icon: 'sidebar', hint: `${modKey}B`, run: () => this.toggle('sidebar') },
      { label: 'Toggle side panel', icon: 'panelRight', hint: `${modKey}.`, run: () => this.toggle('panel') },
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
    const [list, models, settings, info] = await Promise.all([
      run<{ conversations: Conversation[] }>('conversation.list'),
      run<{ models: Model[]; efforts: string[] }>('models.list'),
      run<Settings>('settings.get'),
      run<InfoLike>('app.info'),
    ]);
    list.conversations.forEach((c) => this.state.conversations.set(c.id, c));
    this.state.models = models.models;
    this.state.efforts = models.efforts;
    this.state.settings = settings;
    this.state.anthropicKey = !!info.providers.anthropic;
    this.sidebar.setKey(this.state.anthropicKey);
    this.settingsView.fill(info);
    this.state.emit('conversations');
    this.state.emit('settings');
    this.state.emit('view');
    this.stream.on((e) => this.onEvent(e));
    this.stream.start();
  }

  private onEvent(e: EngineEvent): void {
    if (e.type === 'conversation.created' || e.type === 'conversation.updated') {
      const c = e.conversation as Conversation;
      this.state.conversations.set(c.id, c);
      this.state.emit('conversations');
    } else if (e.type === 'conversation.deleted') {
      this.state.conversations.delete(e.id as string);
      if (this.state.activeId === e.id) this.newChat();
      this.state.emit('conversations');
    } else if (e.type === 'message.added') {
      const m = e.message as Message;
      const c = this.state.conversations.get(m.conversation_id);
      if (c) { c.updated = m.created; this.state.emit('conversations'); }
      if (m.conversation_id === this.state.activeId && !this.state.messages.some((x) => x.id === m.id)) {
        this.state.messages.push(m);
        this.state.emit('messages');
      }
    } else if (e.type === 'settings.changed') {
      this.state.settings = e.settings as Settings;
      this.state.emit('settings');
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
    this.setView('chat');
    this.state.emit('active');
  }

  private async send(text: string): Promise<void> {
    let id = this.state.activeId;
    if (!id) {
      const title = text.split('\n')[0].slice(0, 60);
      const conv = await run<Conversation>('conversation.create', { title });
      this.state.conversations.set(conv.id, conv);
      this.state.activeId = conv.id;
      this.state.messages = [];
      id = conv.id;
      this.state.emit('conversations');
      this.state.emit('active');
    }
    const message = await run<Message>('message.add', { conversationId: id, text });
    if (!this.state.messages.some((m) => m.id === message.id)) {
      this.state.messages.push(message);
      this.state.emit('messages');
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
    else if (k === 'u' && !e.shiftKey && this.state.view === 'chat') { e.preventDefault(); this.composer.openFilePicker(); }
  }
}
