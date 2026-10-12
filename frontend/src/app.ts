import { run } from './engine-client/api';
import { EventStream, type EngineEvent } from './engine-client/events';
import { AppState, type Account, type ArtifactRef, type ArtifactSummary, type ContentBlock, type FileComment, type ProjectSummary, type SkillSummary, type ConnectorInfo, type Conversation, type FileInfo, type KeyStatus, type Message, type Model, type Settings, type View } from './state/app-state';
import { ChatView } from './ui/chat-view';
import { Composer } from './ui/composer';
import { el, modKey, q, setAttr, setText, writePref } from './ui/dom';
import { ui } from './ui/icons-ft';
import { closeMenus, openMenu } from './ui/menu';
import { Palette } from './ui/palette';
import { type OutputFile, SidePanel, type Used } from './ui/side-panel';
import type { TaskItem } from './ui/tool-cards';
import { Sidebar } from './ui/sidebar';
import { TerminalDock } from './ui/terminal-dock';
import { ArtifactPanel } from './ui/artifact-panel';
import { FilesPane } from './ui/files-pane';
import { ProjectsView } from './ui/projects-view';
import { CustomizeView } from './ui/customize-view';
import { MemoryPanel } from './ui/memory-panel';
import { ArtifactsView, pageView, SettingsView, type InfoLike } from './ui/views';

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
  private panel: SidePanel;
  private artifact: ArtifactPanel;
  private filesPane: FilesPane;
  private projectsView: ProjectsView;
  private customizeView: CustomizeView;
  private memoryPanel: MemoryPanel;
  private gallery: ArtifactsView;
  private outputsSeq = 0;
  private settingsView: SettingsView;
  private pages = new Map<View, HTMLElement>();
  private title: HTMLElement;
  private stream = new EventStream();

  constructor(host: HTMLElement) {
    const html = document.documentElement;
    this.shell = el(`<div class="ft-app">
      <div class="ft-main">
        <header class="ft-topbar">
          <button type="button" class="ft-crumb" title="Open the project" hidden></button><span class="ft-crumb-sep" aria-hidden="true" hidden>/</span>
          <button type="button" class="ft-title-btn" data-menu-anchor aria-label="Chat options"><span class="ft-title-text">New chat</span>${ui('chevronDown', 14)}</button>
          <span class="ft-topbar-spacer"></span>
          <button type="button" class="ft-icon-btn ft-term-toggle" aria-label="Toggle terminal" title="Terminal (${modKey}J)">${ui('terminal')}</button>
          <button type="button" class="ft-icon-btn ft-files-toggle" aria-label="Files" title="Files in this chat's folder">${ui('folder')}</button>
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
      send: (t, f, c) => this.send(t, f, c),
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
      approve: (toolUseId, decision) => {
        run('tool.approve', { toolUseId, decision }).catch((err) => this.composer.showError(err instanceof Error ? err.message : String(err)));
      },
      answer: (toolUseId, answer) => {
        run('tool.answer', { toolUseId, answer }).catch((err) => this.composer.showError(err instanceof Error ? err.message : String(err)));
      },
      openArtifact: (id, version) => this.openArtifact(id, version),
      openFile: (path) => this.openFiles(path),
      leaveProject: () => this.setDraftProject(null),
      chatId: () => this.state.activeId ?? '',
    });
    this.customizeView = new CustomizeView(this.state);
    this.memoryPanel = new MemoryPanel(this.state);
    this.projectsView = new ProjectsView(this.state, {
      openChat: (id) => void this.openChat(id),
      newChatIn: (pid) => { this.newChat(); this.setDraftProject(pid); },
      showError: (m) => this.composer.showError(m),
    });
    this.artifact = new ArtifactPanel(() => this.closeArtifact());
    this.filesPane = new FilesPane({ close: () => this.closeSide(), comment: (c) => this.composer.addComment(c) });
    this.state.on('active', () => {
      this.composer.dropComments();
      if (this.filesPane.conversationId && this.filesPane.conversationId !== this.state.activeId) {
        if (this.side() === 'files') this.closeSide();
        this.filesPane.reset();
      }
    });
    this.gallery = new ArtifactsView((a) => void this.openFromGallery(a), (id) => void this.openChat(id));
    this.state.on('active', () => {
      if (this.artifact.conversationId && this.artifact.conversationId !== this.state.activeId) this.closeArtifact();
    });
    this.state.on('messages', () => this.updateContext());
    this.state.on('active', () => this.updateContext());
    this.state.on('settings', () => this.updateContext());
    this.settingsView = new SettingsView(this.state);
    const panel = new SidePanel(() => this.toggle('panel', false), (p) => this.openFiles(p));
    this.panel = panel;
    this.state.on('active', () => this.refreshOutputs());
    this.dock = new TerminalDock(() => this.toggle('term', false));
    this.palette = new Palette(this.state, () => [
      { label: 'New chat', icon: 'plus', hint: `${modKey}⇧O`, run: () => this.newChat() },
      { label: 'Toggle sidebar', icon: 'sidebar', hint: `${modKey}B`, run: () => this.toggle('sidebar') },
      { label: 'Toggle outputs', icon: 'outputs', hint: `${modKey}.`, run: () => this.toggle('panel') },
      { label: 'Artifacts', icon: 'artifacts', run: () => this.setView('artifacts') },
      { label: 'Projects', icon: 'projects', run: () => this.setView('projects') },
      { label: 'Files in this chat', icon: 'folder', run: () => this.toggleFiles() },
      { label: 'API keys', icon: 'key', run: () => this.openSettings('keys') },
      { label: 'Keyboard shortcuts', icon: 'customize', hint: `${modKey}/`, run: () => this.shortcuts() },
      { label: 'Summarize earlier messages', icon: 'compress', run: () => this.compactNow() },
      { label: 'Account', icon: 'user', run: () => this.openSettings('account') },
      { label: 'Toggle terminal', icon: 'terminal', hint: `${modKey}J`, run: () => this.toggle('term') },
      { label: 'Settings', icon: 'settings', run: () => this.setView('settings') },
      { label: 'Customize', icon: 'customize', run: () => this.setView('customize') },
    ], (id) => void this.openChat(id));

    this.shell.insertBefore(this.sidebar.root, this.shell.firstChild);
    const center = q(this.shell, '.ft-center');
    center.appendChild(this.chat.root);
    (['scheduled'] as const).forEach((v) => {
      const p = pageView(v);
      this.pages.set(v, p);
      center.appendChild(p);
    });
    this.pages.set('customize', this.customizeView.root);
    center.appendChild(this.customizeView.root);
    this.settingsView.root.appendChild(this.memoryPanel.root);
    this.pages.set('projects', this.projectsView.root);
    center.appendChild(this.projectsView.root);
    this.pages.set('artifacts', this.gallery.root);
    center.appendChild(this.gallery.root);
    this.pages.set('settings', this.settingsView.root);
    center.appendChild(this.settingsView.root);
    q(this.shell, '.ft-body').appendChild(this.artifact.root);
    q(this.shell, '.ft-body').appendChild(this.filesPane.root);
    q(this.shell, '.ft-body').appendChild(panel.root);
    q(this.shell, '.ft-main').appendChild(this.dock.root);
    host.appendChild(this.shell);
    (document.getElementById('overlay-root') as HTMLElement).appendChild(this.palette.root);

    q(this.shell, '.ft-panel-toggle').addEventListener('click', () => this.toggle('panel'));
    q(this.shell, '.ft-files-toggle').addEventListener('click', () => this.toggleFiles());
    q(this.shell, '.ft-term-toggle').addEventListener('click', () => this.toggle('term'));
    q(this.shell, '.ft-title-btn').addEventListener('click', (e) => this.titleMenu(e.currentTarget as HTMLElement));
    q(this.shell, '.ft-crumb').addEventListener('click', () => {
      const pid = this.state.activeId ? this.state.conversations.get(this.state.activeId)?.project_id : null;
      if (pid) this.openProject(pid);
    });
    this.state.on('projects', () => this.renderTitle());
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
    const projects = await run<{ projects: ProjectSummary[] }>('project.list').catch(() => ({ projects: [] as ProjectSummary[] }));
    projects.projects.forEach((p) => this.state.projects.set(p.id, p));
    this.state.emit('projects');
    const skills = await run<{ skills: SkillSummary[] }>('skill.list').catch(() => ({ skills: [] as SkillSummary[] }));
    this.state.skills = skills.skills;
    this.state.emit('skills');
    const conns = await run<{ connectors: ConnectorInfo[] }>('connector.list').catch(() => ({ connectors: [] as ConnectorInfo[] }));
    this.state.connectors = conns.connectors;
    this.state.emit('connectors');
    void this.memoryPanel.refresh();
    list.conversations.forEach((c) => {
      this.state.conversations.set(c.id, c);
      if (c.activity) this.state.running.add(c.id);
      if (c.activity === 'waiting') this.state.waiting.set(c.id, new Set(['*']));
    });
    this.state.settings = settings;
    this.state.account = account;
    this.state.keys = keys;
    this.state.anthropicKey = !!keys.anthropic?.set;
    this.sidebar.setKey(this.state.anthropicKey);
    this.sidebar.setAccount(account);
    this.settingsView.fill(info, voice.engines);
    await this.loadModels();
    void this.gallery.refresh();
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

  private refreshOutputs(): void {
    const cid = this.state.activeId;
    const seq = ++this.outputsSeq;
    if (!cid) { this.panel.setTasks([]); this.panel.setOutputs([], null, { uploads: 0, web_search: 0, web_fetch: 0, bash: 0, files: 0 }); return; }
    void Promise.all([run<{ tasks: TaskItem[] }>('tasks.get', { conversationId: cid }), run<{ files: OutputFile[]; zip: string | null; used: Used }>('outputs.list', { conversationId: cid })])
      .then(([t, o]) => {
        if (seq !== this.outputsSeq || cid !== this.state.activeId) return;
        this.panel.setTasks(t.tasks);
        this.panel.setOutputs(o.files, o.zip, o.used);
      }).catch(() => undefined);
  }

  private compactNow(): void {
    if (!this.state.activeId) { this.composer.showError('Open a chat to summarize it'); return; }
    run('chat.compact', { conversationId: this.state.activeId }).catch((err) => this.composer.showError(err instanceof Error ? err.message : String(err)));
  }

  private setRunning(conversationId: string, on: boolean): void {
    if (this.state.running.has(conversationId) === on) return;
    if (on) this.state.running.add(conversationId);
    else this.state.running.delete(conversationId);
    this.state.emit('running');
  }

  private setWaiting(conversationId: string, toolUseId: string | null, on: boolean): void {
    const set = this.state.waiting.get(conversationId);
    const before = set?.size ?? 0;
    if (on && toolUseId) {
      if (set) set.add(toolUseId);
      else this.state.waiting.set(conversationId, new Set([toolUseId]));
    } else if (set) {
      if (toolUseId) { set.delete(toolUseId); set.delete('*'); } else set.clear();
      if (!set.size) this.state.waiting.delete(conversationId);
    }
    if ((this.state.waiting.get(conversationId)?.size ?? 0) !== before) this.state.emit('running');
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
        this.setDraftProject(null);
      }
      this.state.emit('conversations');
    } else if (e.type === 'project.changed') {
      const p = e.project as ProjectSummary;
      if (p?.id) { this.state.projects.set(p.id, p); this.state.emit('projects'); }
    } else if (e.type === 'skills.changed') {
      this.state.skills = e.skills as SkillSummary[];
      this.state.emit('skills');
    } else if (e.type === 'connectors.changed') {
      this.state.connectors = e.connectors as ConnectorInfo[];
      this.state.emit('connectors');
    } else if (e.type === 'memory.changed') {
      this.state.emit('memory');
    } else if (e.type === 'project.deleted') {
      this.state.projects.delete(e.id as string);
      if (this.state.draftProject === e.id) this.setDraftProject(null);
      this.state.emit('projects');
    } else if (e.type === 'conversation.deleted') {
      this.state.conversations.delete(e.id as string);
      if (this.state.activeId === e.id) this.newChat();
      void this.gallery.refresh();
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
      if (e.conversationId === this.state.activeId) this.chat.applyBlock(e.id as string, e.index as number, e.block as ContentBlock, e.parent as string | undefined);
    } else if (e.type === 'message.tool') {
      this.setWaiting(e.conversationId as string, e.toolUseId as string, e.status === 'waiting' || e.status === 'asking');
      if (e.conversationId === this.state.activeId) this.chat.toolStatus(e.id as string, e.toolUseId as string, e.status as string);
    } else if (e.type === 'files.changed') {
      if (e.conversationId === this.filesPane.conversationId) void this.filesPane.refresh().catch(() => undefined);
    } else if (e.type === 'tool.output') {
      if (e.conversationId === this.state.activeId) this.chat.toolOutput(e.id as string, e.toolUseId as string, e.text as string);
    } else if (e.type === 'message.artifact') {
      if (e.conversationId === this.state.activeId) this.chat.artifactPublished(e.id as string, e.toolUseId as string, e.artifact as ArtifactRef);
    } else if (e.type === 'artifact.changed') {
      this.artifact.changed(e.artifact as ArtifactSummary, e.version as number);
      void this.gallery.refresh();
    } else if (e.type === 'artifact.deleted') {
      if (this.artifact.artifactId === e.id) this.closeArtifact();
      void this.gallery.refresh();
    } else if (e.type === 'tasks.changed') {
      if (e.conversationId === this.state.activeId) this.panel.setTasks(e.tasks as TaskItem[]);
    } else if (e.type === 'outputs.changed') {
      if (e.conversationId === this.state.activeId) this.refreshOutputs();
      if (e.conversationId === this.filesPane.conversationId) void this.filesPane.refresh().catch(() => undefined);
    } else if (e.type === 'message.delta') {
      if (e.conversationId === this.state.activeId) this.chat.applyDelta(e.id as string, e.index as number, e.kind as string, e.text as string);
    } else if (e.type === 'message.completed') {
      const m = e.message as Message;
      const more = !!m.meta?.compactNext;
      this.setWaiting(m.conversation_id, null, false);
      if (!more) this.setRunning(m.conversation_id, false);
      if (m.conversation_id === this.state.activeId) {
        const i = this.state.messages.findIndex((x) => x.id === m.id);
        if (i >= 0) this.state.messages[i] = m;
        this.chat.complete(m);
        this.updateContext();
        this.refreshOutputs();
        const next = more ? undefined : this.composer.nextQueued();
        if (next) void this.send(next.text, next.files, next.comments);
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

  private openArtifact(id: string, version?: number): void {
    void this.artifact.show(id, version).then((ok) => {
      if (ok) this.setSide('artifact');
    }).catch((err) => this.composer.showError(err instanceof Error ? err.message : String(err)));
  }

  private closeArtifact(): void {
    if (this.side() === 'artifact') this.setSide(null);
    this.artifact.reset();
  }

  private side(): string | null {
    return document.documentElement.dataset.ftSide ?? null;
  }

  private setSide(which: 'artifact' | 'files' | null): void {
    const html = document.documentElement;
    if ((html.dataset.ftSide ?? null) === which) return;
    if (which) html.dataset.ftSide = which;
    else delete html.dataset.ftSide;
    if (which !== 'artifact' && this.artifact.artifactId) this.artifact.reset();
    if (which !== 'files') this.filesPane.pause();
    setAttr(q(this.shell, '.ft-files-toggle'), 'aria-pressed', String(which === 'files'));
  }

  private closeSide(): void {
    if (this.side() === 'artifact') this.closeArtifact();
    else this.setSide(null);
  }

  private openFiles(path?: string): void {
    const cid = this.state.activeId;
    if (!cid) { this.composer.showError('Open a chat to see the files in its folder'); return; }
    void this.filesPane.show(cid, path).then((ok) => {
      if (ok && cid === this.state.activeId) this.setSide('files');
    }).catch((err) => this.composer.showError(err instanceof Error ? err.message : String(err)));
  }

  private toggleFiles(): void {
    if (this.side() === 'files') this.closeSide();
    else this.openFiles();
  }

  private async openFromGallery(a: ArtifactSummary): Promise<void> {
    if (this.state.activeId !== a.conversationId) await this.openChat(a.conversationId);
    else this.setView('chat');
    this.openArtifact(a.id);
  }

  setView(view: View): void {
    closeMenus();
    if (view !== 'chat' && this.side()) this.closeSide();
    if (view === 'artifacts') void this.gallery.refresh();
    if (view === 'customize') {
      void run<{ skills: SkillSummary[] }>('skill.list').then((s) => {
        if (JSON.stringify(s.skills) === JSON.stringify(this.state.skills)) return;
        this.state.skills = s.skills;
        this.state.emit('skills');
      }).catch(() => undefined);
    }
    this.state.view = view;
    this.chat.root.hidden = view !== 'chat';
    for (const [v, p] of this.pages) if (p.hidden === (v === view)) p.hidden = v !== view;
    this.state.emit('view');
    this.renderTitle();
    if (view === 'chat') this.composer.focus();
  }

  newChat(): void {
    this.setDraftProject(null);
    this.state.activeId = null;
    this.state.messages = [];
    this.setView('chat');
    this.state.emit('active');
  }

  private setDraftProject(pid: string | null): void {
    this.state.draftProject = pid && this.state.projects.has(pid) ? pid : null;
    this.chat.setDraftProject(this.state.draftProject ? this.state.projects.get(this.state.draftProject)?.name ?? null : null);
    this.renderTitle();
  }

  private openProject(pid: string): void {
    this.setView('projects');
    void this.projectsView.open(pid).catch((err) => this.composer.showError(err instanceof Error ? err.message : String(err)));
  }

  async openChat(id: string): Promise<void> {
    const conv = await run<Conversation & { messages: Message[] }>('conversation.get', { id });
    this.state.activeId = id;
    this.state.messages = conv.messages;
    const last = conv.messages[conv.messages.length - 1];
    this.setRunning(id, !!last && last.role === 'assistant' && last.meta?.status === 'streaming');
    this.state.draftProject = null;
    this.chat.setDraftProject(null);
    this.setView('chat');
    this.state.emit('active');
  }

  private claimNext = false;

  private async send(text: string, files: FileInfo[] = [], comments: FileComment[] = []): Promise<void> {
    const id = this.state.activeId;
    if (!id) this.claimNext = true;
    try {
      const project = !id && this.state.draftProject ? { projectId: this.state.draftProject } : {};
      await run('chat.send', { text, conversationId: id ?? undefined, attachments: files.map((f) => f.id), ...(comments.length ? { comments } : {}), ...project });
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
    const pid = this.state.view === 'chat' ? (c ? c.project_id : this.state.draftProject) : null;
    const project = pid ? this.state.projects.get(pid) : undefined;
    const crumb = q(this.shell, '.ft-crumb');
    setText(crumb, project?.name ?? '');
    const show = !!project;
    if (crumb.hidden === show) crumb.hidden = !show;
    const sep = q(this.shell, '.ft-crumb-sep');
    if (sep.hidden === show) sep.hidden = !show;
  }

  private titleMenu(anchor: HTMLElement): void {
    const id = this.state.activeId;
    const c = id ? this.state.conversations.get(id) : null;
    if (!id || !c || this.state.view !== 'chat') return;
    openMenu(anchor, [
      { label: c.pinned ? 'Unpin' : 'Pin', icon: 'pin', action: () => void run('conversation.pin', { id, pinned: !c.pinned }) },
      { label: 'Rename', icon: 'pencil', action: () => { if (this.layout('sidebar') === 'rail') this.toggle('sidebar', true); this.sidebar.rename(id); } },
      {
        label: 'Move to project', icon: 'projects', submenu: () => {
          const all = [...this.state.projects.values()].sort((a, b) => a.name.localeCompare(b.name));
          const move = (projectId: string | null) => void run('conversation.move', { id, ...(projectId ? { projectId } : {}) }).catch((err) => this.composer.showError(err instanceof Error ? err.message : String(err)));
          return [
            ...(all.length ? all.map((p) => ({ label: p.name, checked: c.project_id === p.id, action: () => move(p.id) })) : [{ note: 'No projects yet' }]),
            { divider: true },
            ...(c.project_id ? [{ label: 'Take out of the project', action: () => move(null) }] : []),
            { label: 'New project', icon: 'plus' as const, action: () => this.setView('projects') },
          ];
        },
      },
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
