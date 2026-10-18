import { run } from '../engine-client/api';
import type { AppState, ConnectorInfo, FileInfo, PluginSummary, SkillSummary } from '../state/app-state';
import { el, esc, q, setAttr, setText } from './dom';
import { ui } from './icons-ft';
import { renderMarkdown } from './markdown';
import { openMenu } from './menu';

export interface CustomizeHooks { tryInChat(skill: string): void }

export async function signIn(id: string): Promise<void> {
  const tab = window.open('', '_blank');
  try {
    const r = await run<{ url: string }>('connector.signin', { id });
    if (tab) { tab.opener = null; tab.location.href = r.url; } else window.open(r.url, '_blank', 'noopener');
  } catch (err) {
    tab?.close();
    throw err;
  }
}

interface SkillDetail extends SkillSummary { skillMd: string; fileList: string[] }

export class CustomizeView {
  readonly root: HTMLElement;
  private list: HTMLElement;
  private empty: HTMLElement;
  private msg: HTMLElement;
  private writeForm: HTMLElement;
  private detail: HTMLElement;
  private main: HTMLElement;
  private picker: HTMLInputElement;
  private rows = new Map<string, HTMLElement>();
  private skHeads: { own: HTMLElement; plugin: HTMLElement } | null = null;
  private current: SkillDetail | null = null;
  private seq = 0;

  constructor(private state: AppState, private hooks: CustomizeHooks = { tryInChat: () => undefined }) {
    this.root = el(`<section class="ft-page ft-customize" data-view="customize" data-tab="skills" hidden>
      <div class="ft-cz-main">
        <header class="ft-proj-head"><h1>Customize</h1></header>
        <nav class="ft-cz-tabs" role="tablist" aria-label="Customize">
          <button type="button" role="tab" class="ft-cz-tab" data-tab="skills" aria-selected="true">${ui('skills', 16)}<span>Skills</span><span class="ft-cz-count" data-count="skills"></span></button>
          <button type="button" role="tab" class="ft-cz-tab" data-tab="connectors" aria-selected="false">${ui('plug', 16)}<span>Connectors</span><span class="ft-cz-count" data-count="connectors"></span></button>
          <button type="button" role="tab" class="ft-cz-tab" data-tab="plugins" aria-selected="false">${ui('plugin', 16)}<span>Plugins</span><span class="ft-cz-count" data-count="plugins"></span></button>
        </nav>
        <section class="ft-cz-section ft-pl-section" data-sec="plugins">
          <div class="ft-cz-section-head"><h2>${ui('plugin', 16)}<span>Your plugins</span></h2>
            <div class="ft-cz-actions"><input class="ft-input ft-cz-search" type="search" placeholder="Search plugins" aria-label="Search plugins"><button type="button" class="ft-btn ft-pl-upload">${ui('plus', 14)}<span>Upload plugin</span></button></div></div>
          <p class="ft-set-note">A plugin bundles skills, commands and connectors for one kind of work, in the Claude plugin format (a folder with .claude-plugin/plugin.json). Add one as a .zip of its folder: its skills and commands appear under Skills and its MCP servers under Connectors, and they turn on and off together.</p>
          <span class="ft-proj-msg ft-pl-msg" aria-live="polite"></span>
          <div class="ft-cz-list ft-pl-list" role="list"></div>
          <p class="ft-proj-none ft-pl-empty">No plugins yet.</p>
          <input type="file" class="ft-pl-picker" accept=".zip" hidden>
        </section>
        <section class="ft-cz-section" data-sec="skills">
          <div class="ft-cz-section-head"><h2>${ui('skills', 16)}<span>Your skills</span></h2>
            <div class="ft-cz-actions"><input class="ft-input ft-cz-search" type="search" placeholder="Search skills" aria-label="Search skills"><button type="button" class="ft-btn ft-cz-add" data-menu-anchor>${ui('plus', 14)}<span>Add</span></button></div></div>
          <p class="ft-set-note">A skill is a folder of instructions, with a SKILL.md whose name and description tell Claude when to use it. Claude sees every skill that is on and loads one when a task matches it. Type / in a message to pick one, or open a skill to read its files and try it in a chat.</p>
          <span class="ft-proj-msg ft-cz-msg" aria-live="polite"></span>
          <div class="ft-proj-form ft-cz-form" hidden>
            <label class="ft-field"><span>Name</span><input class="ft-input" data-f="name" maxlength="64" placeholder="lowercase-with-hyphens"></label>
            <label class="ft-field"><span>Description: when should Claude use it?</span><textarea class="ft-input" data-f="description" rows="2" maxlength="1024" placeholder="For example: Use when the person asks for release notes"></textarea></label>
            <label class="ft-field"><span>Instructions</span><textarea class="ft-input" data-f="instructions" rows="8" placeholder="What Claude should do, step by step, in Markdown"></textarea></label>
            <div class="ft-set-actions"><button type="button" class="ft-btn ft-btn-primary ft-cz-create">Save skill</button><button type="button" class="ft-btn ft-cz-cancel">Cancel</button></div>
          </div>
          <div class="ft-cz-list ft-sk-list" role="list"></div>
          <div class="ft-page-empty ft-cz-empty" hidden>${ui('skills', 28)}<p>No skills yet.</p></div>
          <input type="file" class="ft-cz-picker" accept=".zip,.md" hidden>
        </section>
        <section class="ft-cz-section ft-cn-section" data-sec="connectors">
          <div class="ft-cz-section-head"><h2>${ui('plug', 16)}<span>Your connectors</span></h2>
            <div class="ft-cz-actions"><input class="ft-input ft-cz-search" type="search" placeholder="Search connectors" aria-label="Search connectors"><button type="button" class="ft-btn ft-cn-addopen">${ui('plus', 14)}<span>Add custom connector</span></button></div></div>
          <p class="ft-set-note">A connector is an MCP server that gives Claude more tools. A public https URL goes to Claude through Anthropic's MCP connector; a server on this computer or your network, or one started by a command, runs in Format's engine, and its tools ask before they run in Ask mode. Turn single tools off in a connector's page.</p>
          <span class="ft-proj-msg ft-cn-msg" aria-live="polite"></span>
          <div class="ft-proj-form ft-cn-form" hidden>
            <label class="ft-field"><span>Name</span><input class="ft-input" data-c="name" maxlength="40" placeholder="lowercase, for example docs or github"></label>
            <div class="ft-cn-kind" role="radiogroup" aria-label="Kind"><label class="ft-field ft-check"><input type="radio" name="ft-cn-kind" value="url" checked><span>By URL</span></label><label class="ft-field ft-check"><input type="radio" name="ft-cn-kind" value="command"><span>By command (a local server)</span></label></div>
            <label class="ft-field ft-cn-url"><span>Server URL</span><input class="ft-input" data-c="url" placeholder="https://example.com/mcp" spellcheck="false"></label>
            <fieldset class="ft-cn-set ft-cn-auth"><legend>Authentication</legend><div class="ft-cn-kind" role="radiogroup" aria-label="Authentication"><label class="ft-field ft-check"><input type="radio" name="ft-cn-auth" value="needed" checked><span>Sign in when needed</span></label><label class="ft-field ft-check"><input type="radio" name="ft-cn-auth" value="now"><span>Sign in now</span></label><label class="ft-field ft-check"><input type="radio" name="ft-cn-auth" value="none"><span>No sign-in</span></label></div><p class="ft-set-note ft-cn-auth-note"></p></fieldset>
            <fieldset class="ft-cn-set ft-cn-client"><legend>OAuth client</legend><div class="ft-cn-kind" role="radiogroup" aria-label="OAuth client"><label class="ft-field ft-check"><input type="radio" name="ft-cn-client" value="register" checked><span>Register automatically</span></label><label class="ft-field ft-check"><input type="radio" name="ft-cn-client" value="own"><span>Use your own OAuth client</span></label></div>
              <div class="ft-cn-own" hidden><label class="ft-field"><span>Client ID</span><input class="ft-input" data-c="clientId" autocomplete="off" spellcheck="false"></label><label class="ft-field"><span>Client secret (only if the server requires one)</span><input class="ft-input" data-c="clientSecret" type="password" autocomplete="off"></label></div></fieldset>
            <label class="ft-field ft-cn-token"><span>Access token (optional)</span><input class="ft-input" data-c="token" type="password" autocomplete="off" placeholder="Sent as a Bearer token, if the server needs one"></label>
            <label class="ft-field ft-cn-headers"><span>Request headers (optional, one per line)</span><textarea class="ft-input" data-c="headers" rows="2" spellcheck="false" placeholder="X-Api-Key: your-key"></textarea></label>
            <details class="ft-cn-adv"><summary>Advanced</summary><label class="ft-field"><span>Transport</span><select class="ft-input" data-c="transport"><option value="">Automatic: SSE for a URL ending in /sse, otherwise Streamable HTTP</option><option value="http">Streamable HTTP</option><option value="sse">SSE (older servers)</option></select></label></details>
            <label class="ft-field ft-cn-cmd" hidden><span>Command</span><input class="ft-input" data-c="command" placeholder="npx -y @modelcontextprotocol/server-filesystem ~/notes" spellcheck="false"></label>
            <div class="ft-set-actions"><button type="button" class="ft-btn ft-btn-primary ft-cn-add">Add and connect</button><button type="button" class="ft-btn ft-cn-cancel">Cancel</button></div>
          </div>
          <div class="ft-cz-list ft-cn-list" role="list"></div>
          <p class="ft-proj-none ft-cn-empty">No connectors yet.</p>
        </section>
      </div>
      <div class="ft-cz-detail" hidden>
        <button type="button" class="ft-text-btn ft-cz-back">${ui('back', 14)}<span>Customize</span></button>
        <div class="ft-cz-detail-head"><h1 class="ft-cz-name"></h1><label class="ft-field ft-check ft-switch-label" title="Claude can use this skill while it is on"><input type="checkbox" role="switch" class="ft-cz-on ft-switch"><span>Enabled</span></label><button type="button" class="ft-btn ft-btn-primary ft-cz-try">${ui('chat', 14)}<span>Try in chat</span></button><button type="button" class="ft-btn ft-danger-btn ft-cz-delete" hidden>Delete? This cannot be undone</button><button type="button" class="ft-icon-btn ft-cz-more" data-menu-anchor aria-label="More actions" title="More actions">${ui('more', 16)}</button></div>
        <p class="ft-cz-desc"></p>
        <div class="ft-cz-browser">
          <nav class="ft-cz-tree" aria-label="Files in this skill"></nav>
          <div class="ft-cz-viewer"><div class="ft-cz-viewer-head"></div><div class="ft-md ft-cz-body"></div><pre class="ft-cz-raw" hidden></pre></div>
        </div>
      </div>
      <div class="ft-cz-detail ft-cn-detail" hidden>
        <button type="button" class="ft-text-btn ft-cn-back">${ui('back', 14)}<span>Customize</span></button>
        <div class="ft-cz-detail-head"><h1 class="ft-cz-name ft-cn-name"></h1><span class="ft-cn-chip"></span><button type="button" class="ft-btn ft-cn-power"></button><button type="button" class="ft-btn ft-danger-btn ft-cn-delete" hidden>Remove? Claude loses its tools</button><button type="button" class="ft-icon-btn ft-cn-more" data-menu-anchor aria-label="More actions" title="More actions">${ui('more', 16)}</button></div>
        <p class="ft-cz-desc ft-cn-where"></p>
        <p class="ft-cn-state"></p>
        <div class="ft-cn-perm-head"><h2 class="ft-proj-sub">Tool permissions</h2><label class="ft-cn-perm-all"><span>All tools</span><select class="ft-input ft-cn-perm" data-tool="*" aria-label="Permission for all tools"><option value="">Mixed</option><option value="allow">Always allow</option><option value="ask">Needs approval</option><option value="block">Blocked</option></select></label></div>
        <p class="ft-set-note ft-cn-perm-note"></p>
        <div class="ft-cn-tools" role="list"></div>
        <p class="ft-proj-none ft-cn-notools">No tools listed yet. Reconnect to list them.</p>
      </div>
      <div class="ft-cz-pick" aria-hidden="true">${ui('customize', 28)}<p>Pick a skill, connector or plugin to see it here.</p></div>
      <div class="ft-cz-detail ft-pl-detail" hidden>
        <button type="button" class="ft-text-btn ft-pl-back">${ui('back', 14)}<span>Customize</span></button>
        <div class="ft-cz-detail-head"><h1 class="ft-cz-name ft-pl-name"></h1><label class="ft-field ft-check ft-switch-label" title="Turn the plugin and everything it adds on or off"><input type="checkbox" role="switch" class="ft-pl-on ft-switch"><span>Enabled</span></label><button type="button" class="ft-btn ft-danger-btn ft-pl-delete" hidden>Remove with its skills and connectors?</button><button type="button" class="ft-icon-btn ft-pl-more" data-menu-anchor aria-label="More actions" title="More actions">${ui('more', 16)}</button></div>
        <p class="ft-cz-desc ft-pl-by"></p>
        <p class="ft-cz-desc ft-pl-desc"></p>
        <h2 class="ft-proj-sub">Skills and commands</h2>
        <div class="ft-cz-files ft-pl-skills"></div>
        <p class="ft-proj-none ft-pl-noskills">None.</p>
        <h2 class="ft-proj-sub">Connectors</h2>
        <div class="ft-cz-files ft-pl-conns"></div>
        <p class="ft-proj-none ft-pl-noconns">None.</p>
      </div>
    </section>`);
    this.main = q(this.root, '.ft-cz-main');
    this.list = q(this.root, '.ft-sk-list');
    this.empty = q(this.root, '.ft-cz-empty');
    this.msg = q(this.root, '.ft-cz-msg');
    this.writeForm = q(this.root, '.ft-cz-form');
    this.detail = q(this.root, '.ft-cz-detail');
    this.picker = q<HTMLInputElement>(this.root, '.ft-cz-picker');
    q(this.root, '.ft-cz-add').addEventListener('click', (e) => openMenu(e.currentTarget as HTMLElement, [
      { label: 'Upload a skill', desc: 'A .zip of a skill folder, or a SKILL.md', icon: 'paperclip', action: () => this.picker.click() },
      { label: 'Write a skill', desc: 'A name, when to use it, and the instructions', icon: 'pencil', action: () => { this.writeForm.hidden = false; q<HTMLInputElement>(this.writeForm, '[data-f=name]').focus(); } },
    ], 'down'));
    this.picker.addEventListener('change', () => { const f = this.picker.files?.[0]; this.picker.value = ''; if (f) void this.upload(f); });
    q(this.root, '.ft-cz-tabs').addEventListener('click', (e) => {
      const tab = (e.target as HTMLElement).closest<HTMLElement>('[data-tab]')?.dataset.tab;
      if (tab) this.showTab(tab);
    });
    this.root.addEventListener('input', (e) => {
      const box = (e.target as HTMLElement).closest<HTMLInputElement>('.ft-cz-search');
      if (box) this.filterSection(box);
    });
    q(this.root, '.ft-cz-try').addEventListener('click', () => { if (this.current) this.hooks.tryInChat(this.current.name); });
    q(this.root, '.ft-cz-tree').addEventListener('click', (e) => {
      const file = (e.target as HTMLElement).closest<HTMLElement>('[data-file]')?.dataset.file;
      if (file) void this.showFile(file);
    });
    q(this.root, '.ft-cz-cancel').addEventListener('click', () => { this.writeForm.hidden = true; });
    q(this.root, '.ft-cz-create').addEventListener('click', () => void this.create());
    this.list.addEventListener('click', (e) => {
      const t = e.target as HTMLElement;
      const row = t.closest<HTMLElement>('[data-skill]');
      if (!row) return;
      if (t.closest('.ft-cz-toggle')) return;
      void this.open(row.dataset.skill as string);
    });
    this.list.addEventListener('change', (e) => {
      const box = (e.target as HTMLElement).closest<HTMLInputElement>('.ft-cz-toggle input');
      const name = box?.closest<HTMLElement>('[data-skill]')?.dataset.skill;
      if (box && name) void run('skill.enable', { name, enabled: box.checked }).catch((err) => this.say(String(err instanceof Error ? err.message : err)));
    });
    q(this.root, '.ft-cz-back').addEventListener('click', () => this.showList());
    q<HTMLInputElement>(this.root, '.ft-cz-on').addEventListener('change', (e) => {
      if (this.current) void run('skill.enable', { name: this.current.name, enabled: (e.target as HTMLInputElement).checked }).catch(() => undefined);
    });
    q(this.root, '.ft-cz-delete').addEventListener('click', () => void this.remove());
    q(this.root, '.ft-cz-more').addEventListener('click', (e) => openMenu(e.currentTarget as HTMLElement, [
      { label: 'Delete', desc: 'Remove this skill and its files from Format', icon: 'trash', disabled: !!this.current?.plugin, action: () => { const del = q<HTMLButtonElement>(this.root, '.ft-cz-delete'); if (del.hidden) del.hidden = false; del.focus(); } },
      ...(this.current?.plugin ? [{ note: `From the ${this.current.plugin} plugin: remove the plugin to remove it` }] : []),
    ], 'down'));
    this.root.addEventListener('dragover', (e) => e.preventDefault());
    this.root.addEventListener('drop', (e) => { e.preventDefault(); const f = e.dataTransfer?.files?.[0]; if (f) void this.upload(f); });
    state.on('skills', () => this.render());
    this.cnDetail = q(this.root, '.ft-cn-detail');
    this.wireConnectors();
    state.on('connectors', () => this.renderConnectors());
    this.plDetail = q(this.root, '.ft-pl-detail');
    this.wirePlugins();
    state.on('plugins', () => this.renderPlugins());
  }

  private plDetail: HTMLElement;
  private plRows = new Map<string, HTMLElement>();
  private plOpen: string | null = null;

  private wirePlugins(): void {
    const picker = q<HTMLInputElement>(this.root, '.ft-pl-picker');
    const msg = q(this.root, '.ft-pl-msg');
    q(this.root, '.ft-pl-upload').addEventListener('click', () => picker.click());
    picker.addEventListener('change', async () => {
      const f = picker.files?.[0];
      picker.value = '';
      if (!f) return;
      setText(msg, `Adding ${f.name}`);
      const form = new FormData();
      form.append('file', f, f.name);
      try {
        const res = await fetch('/api/uploads', { method: 'POST', body: form });
        const body = await res.json();
        if (!res.ok || !body.ok) throw new Error(body.error || `upload failed (${res.status})`);
        const p = await run<PluginSummary>('plugin.add', { uploadId: (body.file as FileInfo).id });
        setText(msg, `Added ${p.name}: ${p.skills.length} skill${p.skills.length === 1 ? '' : 's'}, ${p.connectors.length} connector${p.connectors.length === 1 ? '' : 's'}.`);
      } catch (err) {
        setText(msg, err instanceof Error ? err.message : String(err));
      }
    });
    const list = q(this.root, '.ft-pl-list');
    list.addEventListener('click', (e) => {
      const t = e.target as HTMLElement;
      const name = t.closest<HTMLElement>('[data-pl]')?.dataset.pl;
      if (name && !t.closest('.ft-cz-toggle')) this.openPlugin(name);
    });
    list.addEventListener('change', (e) => {
      const box = (e.target as HTMLElement).closest<HTMLInputElement>('.ft-cz-toggle input');
      const name = box?.closest<HTMLElement>('[data-pl]')?.dataset.pl;
      if (box && name) void run('plugin.enable', { name, enabled: box.checked }).catch((err) => setText(msg, err instanceof Error ? err.message : String(err)));
    });
    q(this.root, '.ft-pl-back').addEventListener('click', () => this.showList());
    q<HTMLInputElement>(this.root, '.ft-pl-on').addEventListener('change', (e) => {
      if (this.plOpen) void run('plugin.enable', { name: this.plOpen, enabled: (e.target as HTMLInputElement).checked }).catch(() => undefined);
    });
    q(this.root, '.ft-pl-delete').addEventListener('click', async () => {
      if (this.plOpen) await run('plugin.delete', { name: this.plOpen }).catch(() => undefined);
    });
    q(this.root, '.ft-pl-more').addEventListener('click', (e) => openMenu(e.currentTarget as HTMLElement, [
      { label: 'Remove', desc: 'Uninstall the plugin with its skills and connectors', icon: 'trash', action: () => { const del = q<HTMLButtonElement>(this.root, '.ft-pl-delete'); if (del.hidden) del.hidden = false; del.focus(); } },
    ], 'down'));
    q(this.root, '.ft-pl-skills').addEventListener('click', (e) => {
      const s = (e.target as HTMLElement).closest<HTMLElement>('[data-skill-link]')?.dataset.skillLink;
      if (s) void this.open(s);
    });
    q(this.root, '.ft-pl-conns').addEventListener('click', (e) => {
      const c = (e.target as HTMLElement).closest<HTMLElement>('[data-cn-link]')?.dataset.cnLink;
      if (c) this.openConnector(c);
    });
  }

  renderPlugins(): void {
    const items = this.state.plugins;
    const list = q(this.root, '.ft-pl-list');
    const live = new Set(items.map((p) => p.name));
    for (const [n, r] of this.plRows) if (!live.has(n)) { r.remove(); this.plRows.delete(n); }
    items.forEach((p, i) => {
      let row = this.plRows.get(p.name);
      if (!row) {
        row = el(`<div class="ft-cz-row" role="listitem" data-pl="${esc(p.name)}"><span class="ft-cz-icon">${ui('plugin', 16)}</span><button type="button" class="ft-cz-text"><span class="ft-cz-row-name"></span><span class="ft-cz-row-desc"></span></button><span class="ft-cz-row-meta"></span><label class="ft-cz-toggle" title="Enabled"><input type="checkbox" role="switch" class="ft-switch" aria-label="Plugin enabled"></label></div>`);
        this.plRows.set(p.name, row);
      }
      setText(q(row, '.ft-cz-row-name'), p.name);
      setText(q(row, '.ft-cz-row-desc'), p.description);
      setText(q(row, '.ft-cz-row-meta'), `${p.skills.length} skill${p.skills.length === 1 ? '' : 's'} · ${p.connectors.length} connector${p.connectors.length === 1 ? '' : 's'}`);
      const box = q<HTMLInputElement>(row, '.ft-cz-toggle input');
      if (box.checked !== p.enabled) box.checked = p.enabled;
      row.classList.toggle('is-off', !p.enabled);
      if (list.children[i] !== row) list.insertBefore(row, list.children[i] ?? null);
    });
    const empty = q(this.root, '.ft-pl-empty');
    if (empty.hidden !== items.length > 0) empty.hidden = items.length > 0;
    this.counts();
    if (this.plOpen) {
      if (!live.has(this.plOpen)) this.showList();
      else this.paintPlugin();
    }
  }

  private openPlugin(name: string): void {
    this.plOpen = name;
    const del = q<HTMLButtonElement>(this.root, '.ft-pl-delete');
    if (!del.hidden) del.hidden = true;
    this.paintPlugin();
    if (!this.detail.hidden) this.detail.hidden = true;
    if (!this.cnDetail.hidden) this.cnDetail.hidden = true;
    if (this.plDetail.hidden) this.plDetail.hidden = false;
    this.setDetail('plugin');
  }

  private paintPlugin(): void {
    const p = this.state.plugins.find((x) => x.name === this.plOpen);
    if (!p) return;
    setText(q(this.root, '.ft-pl-name'), p.name);
    setText(q(this.root, '.ft-pl-by'), [p.version && `Version ${p.version}`, p.author && `by ${p.author}`, p.commands ? `${p.commands} command${p.commands === 1 ? '' : 's'} installed as skills` : ''].filter(Boolean).join(' · '));
    setText(q(this.root, '.ft-pl-desc'), p.description);
    const on = q<HTMLInputElement>(this.root, '.ft-pl-on');
    if (on.checked !== p.enabled) on.checked = p.enabled;
    const sk = p.skills.map((s) => `<button type="button" class="ft-chip ft-cz-file" data-skill-link="${esc(s)}">${ui('skills', 12)} ${esc(s)}</button>`).join('');
    const sbox = q(this.root, '.ft-pl-skills');
    if (sbox.dataset.v !== sk) { sbox.dataset.v = sk; sbox.innerHTML = sk; }
    const cn = p.connectors.map((c) => `<button type="button" class="ft-chip ft-cz-file" data-cn-link="${esc(c.id)}">${ui('plug', 12)} ${esc(c.name)}</button>`).join('');
    const cbox = q(this.root, '.ft-pl-conns');
    if (cbox.dataset.v !== cn) { cbox.dataset.v = cn; cbox.innerHTML = cn; }
    const ns = q(this.root, '.ft-pl-noskills');
    if (ns.hidden !== p.skills.length > 0) ns.hidden = p.skills.length > 0;
    const nc = q(this.root, '.ft-pl-noconns');
    if (nc.hidden !== p.connectors.length > 0) nc.hidden = p.connectors.length > 0;
  }

  private cnDetail: HTMLElement;
  private cnRows = new Map<string, HTMLElement>();
  private cnOpen: string | null = null;

  private wireConnectors(): void {
    const form = q(this.root, '.ft-cn-form');
    const kind = () => (form.querySelector<HTMLInputElement>('input[name=ft-cn-kind]:checked')?.value ?? 'url');
    const auth = () => (form.querySelector<HTMLInputElement>('input[name=ft-cn-auth]:checked')?.value ?? 'needed');
    const client = () => (form.querySelector<HTMLInputElement>('input[name=ft-cn-client]:checked')?.value ?? 'register');
    const notes: Record<string, string> = {
      needed: 'Format connects without credentials and asks you to sign in when the server asks for it.',
      now: 'You sign in through the server\'s own page before Claude uses the connector.',
      none: 'Anyone with the URL can use it. For an API key, add it as a request header or the access token.',
    };
    const syncKind = () => {
      const url = kind() === 'url';
      const signs = url && auth() !== 'none';
      for (const [sel, hide] of [['.ft-cn-url', !url], ['.ft-cn-auth', !url], ['.ft-cn-client', !signs], ['.ft-cn-own', !signs || client() !== 'own'], ['.ft-cn-token', !url || signs],
        ['.ft-cn-headers', !url], ['.ft-cn-adv', !url], ['.ft-cn-cmd', url]] as const) {
        const node = q(form, sel);
        if (node.hidden !== hide) node.hidden = hide;
      }
      setText(q(form, '.ft-cn-auth-note'), notes[auth()] ?? '');
    };
    syncKind();
    form.addEventListener('change', (e) => { if (['ft-cn-kind', 'ft-cn-auth', 'ft-cn-client'].includes((e.target as HTMLInputElement).name)) syncKind(); });
    q(this.root, '.ft-cn-addopen').addEventListener('click', () => { form.hidden = false; q<HTMLInputElement>(form, '[data-c=name]').focus(); });
    q(this.root, '.ft-cn-cancel').addEventListener('click', () => { form.hidden = true; });
    q(this.root, '.ft-cn-add').addEventListener('click', async () => {
      const get = (k: string) => q<HTMLInputElement>(form, `[data-c=${k}]`).value.trim();
      const headers = Object.fromEntries(get('headers').split('\n').map((l) => l.trim()).filter(Boolean).map((l) => { const i = l.indexOf(':'); return i > 0 ? [l.slice(0, i).trim(), l.slice(i + 1).trim()] : [l, '']; }));
      const signs = auth() !== 'none';
      const params = kind() === 'url' ? { name: get('name').toLowerCase(), url: get('url'), auth: auth(), ...(signs ? {} : { token: get('token') }), ...(Object.keys(headers).length ? { headers } : {}),
        ...(signs ? { oauthClient: client(), ...(client() === 'own' ? { clientId: get('clientId'), clientSecret: get('clientSecret') } : {}) } : {}), ...(get('transport') ? { transport: get('transport') } : {}) }
        : { name: get('name').toLowerCase(), command: get('command') };
      const msg = q(this.root, '.ft-cn-msg');
      try {
        const c = await run<{ id: string; name: string }>('connector.add', params);
        form.hidden = true;
        form.querySelectorAll<HTMLInputElement>('[data-c]').forEach((x) => { x.value = ''; });
        if (kind() === 'url' && auth() === 'now') {
          setText(msg, `Sign in to ${c.name} on the page that opened, then come back here.`);
          await signIn(c.id);
          return;
        }
        setText(msg, `Connecting ${c.name}`);
        const done = await run<{ status: string; error: string; tools: unknown[] }>('connector.connect', { id: c.id });
        setText(msg, done.status === 'connected' ? `${c.name} is connected with ${done.tools.length} tools.` : done.status === 'needs_auth' ? `${c.name} asks you to sign in: select Sign in on its row.`
          : `${c.name} was added but did not connect: ${done.error}`);
      } catch (err) {
        setText(msg, err instanceof Error ? err.message : String(err));
      }
    });
    const list = q(this.root, '.ft-cn-list');
    list.addEventListener('click', (e) => {
      const t = e.target as HTMLElement;
      const id = t.closest<HTMLElement>('[data-cn]')?.dataset.cn;
      if (!id) return;
      if (t.closest('.ft-cn-rowconnect')) {
        const c = this.state.connectors.find((x) => x.id === id);
        if (c?.enabled && c.status === 'needs_auth') this.startSignIn(id);
        else void this.powerConnector(id, true);
        return;
      }
      this.openConnector(id);
    });
    q(this.root, '.ft-cn-back').addEventListener('click', () => this.showList());
    q(this.root, '.ft-cn-power').addEventListener('click', () => {
      const c = this.state.connectors.find((x) => x.id === this.cnOpen);
      if (c?.enabled && c.status === 'needs_auth') this.startSignIn(c.id);
      else if (c) void this.powerConnector(c.id, !c.enabled);
    });
    q(this.root, '.ft-cn-more').addEventListener('click', (e) => openMenu(e.currentTarget as HTMLElement, [
      { label: 'Reconnect', desc: 'Connect again and list its tools', icon: 'retry', action: () => { if (this.cnOpen) void run('connector.connect', { id: this.cnOpen }).catch(() => undefined); } },
      { label: 'Remove', desc: 'Delete this connector from Format', icon: 'trash', action: () => { const del = q<HTMLButtonElement>(this.root, '.ft-cn-delete'); if (del.hidden) del.hidden = false; del.focus(); } },
    ], 'down'));
    q(this.root, '.ft-cn-delete').addEventListener('click', async () => {
      if (this.cnOpen) await run('connector.delete', { id: this.cnOpen }).catch(() => undefined);
    });
    this.cnDetail.addEventListener('change', (e) => {
      const sel = (e.target as HTMLElement).closest<HTMLSelectElement>('.ft-cn-perm');
      const c = this.state.connectors.find((x) => x.id === this.cnOpen);
      if (!sel || !c || !sel.dataset.tool || !sel.value) return;
      void run('connector.update', { id: c.id, toolPermissions: { [sel.dataset.tool]: sel.value } }).catch(() => undefined);
    });
  }

  private async powerConnector(id: string, on: boolean): Promise<void> {
    try {
      await run('connector.update', { id, enabled: on });
      if (on) await run('connector.connect', { id });
    } catch (err) {
      setText(q(this.root, '.ft-cn-msg'), err instanceof Error ? err.message : String(err));
    }
  }

  private startSignIn(id: string): void {
    const msg = q(this.root, '.ft-cn-msg');
    signIn(id).then(() => setText(msg, 'Sign in on the page that opened; the connector connects when you come back.'))
      .catch((err) => setText(msg, err instanceof Error ? err.message : String(err)));
  }

  private lost(c: ConnectorInfo): boolean {
    return c.error.startsWith('The server no longer');
  }

  private chipText(c: ConnectorInfo): string {
    if (!c.enabled) return 'Disconnected';
    if (c.status === 'needs_auth') return this.lost(c) ? 'Needs reconnecting' : 'Sign-in needed';
    if (c.status === 'connected') return 'Connected';
    if (c.status === 'connecting') return 'Connecting';
    if (c.status === 'error') return c.route === 'api' ? 'Connected through Anthropic' : 'Needs reconnecting';
    return c.route === 'api' ? 'Connected through Anthropic' : 'Not connected yet';
  }

  private stateText(c: ConnectorInfo): string {
    if (!c.enabled) return 'Disconnected';
    if (c.status === 'needs_auth') return this.lost(c) ? 'Sign in again to use its tools' : 'Sign in to use its tools';
    if (c.status === 'connected') return `${c.tools.filter((t) => t.enabled).length} of ${c.tools.length} tools on`;
    if (c.status === 'connecting') return 'Connecting';
    if (c.status === 'error') return c.route === 'api' ? 'Sent through Anthropic; tools not listed here' : 'Not connected';
    return c.route === 'api' ? 'Sent through Anthropic' : 'Not connected yet';
  }

  renderConnectors(): void {
    const items = this.state.connectors;
    const list = q(this.root, '.ft-cn-list');
    const live = new Set(items.map((c) => c.id));
    for (const [id, r] of this.cnRows) if (!live.has(id)) { r.remove(); this.cnRows.delete(id); }
    items.forEach((c, i) => {
      let row = this.cnRows.get(c.id);
      if (!row) {
        row = el(`<div class="ft-cz-row" role="listitem" data-cn="${esc(c.id)}"><span class="ft-cz-icon">${ui('plug', 16)}</span><button type="button" class="ft-cz-text"><span class="ft-cz-row-name"></span><span class="ft-cz-row-desc"></span></button><span class="ft-cn-badge"></span><span class="ft-cn-rowstate"><span class="ft-cn-chip"></span><button type="button" class="ft-btn ft-cn-rowconnect">Connect</button></span></div>`);
        this.cnRows.set(c.id, row);
      }
      setText(q(row, '.ft-cz-row-name'), c.name);
      setText(q(row, '.ft-cz-row-desc'), `${this.stateText(c)} · ${c.kind === 'url' ? c.url : c.command}`);
      setText(q(row, '.ft-cn-badge'), c.route === 'api' ? 'Anthropic' : 'Engine');
      const badge = q(row, '.ft-cn-badge');
      if (badge.dataset.s !== c.status) badge.dataset.s = c.status;
      setAttr(badge, 'title', c.route === 'api' ? 'Claude reaches this server through Anthropic\'s MCP connector' : 'Format\'s engine runs this server\'s tools; they ask before running in Ask mode');
      const chip = q(row, '.ft-cn-chip');
      setText(chip, this.chipText(c));
      if (chip.dataset.s !== (c.enabled ? c.status : 'off')) chip.dataset.s = c.enabled ? c.status : 'off';
      const conn = q<HTMLButtonElement>(row, '.ft-cn-rowconnect');
      const asks = c.enabled && c.status === 'needs_auth';
      setText(conn, asks ? (this.lost(c) ? 'Reconnect' : 'Sign in') : 'Connect');
      if (conn.hidden !== (c.enabled && !asks)) conn.hidden = c.enabled && !asks;
      if (chip.hidden !== (!c.enabled || asks)) chip.hidden = !c.enabled || asks;
      row.classList.toggle('is-off', !c.enabled);
      row.classList.toggle('is-error', c.status === 'error' && c.route === 'local');
      if (list.children[i] !== row) list.insertBefore(row, list.children[i] ?? null);
    });
    const empty = q(this.root, '.ft-cn-empty');
    if (empty.hidden !== items.length > 0) empty.hidden = items.length > 0;
    this.counts();
    if (this.cnOpen) {
      if (!live.has(this.cnOpen)) this.showList();
      else this.paintConnector();
    }
  }

  private openConnector(id: string): void {
    this.cnOpen = id;
    const del = q<HTMLButtonElement>(this.root, '.ft-cn-delete');
    if (!del.hidden) del.hidden = true;
    this.paintConnector();
    if (!this.detail.hidden) this.detail.hidden = true;
    if (!this.plDetail.hidden) this.plDetail.hidden = true;
    if (this.cnDetail.hidden) this.cnDetail.hidden = false;
    this.setDetail('connector');
  }

  private paintConnector(): void {
    const c = this.state.connectors.find((x) => x.id === this.cnOpen);
    if (!c) return;
    setText(q(this.root, '.ft-cn-name'), c.name);
    const how = c.auth && c.auth !== 'none' ? ` · ${c.signedIn ? 'signed in' : 'sign-in'} with ${c.oauthClient === 'own' ? 'your OAuth client' : 'a client Format registered'}` : c.hasToken ? ' · with a token' : '';
    setText(q(this.root, '.ft-cn-where'), `${c.kind === 'url' ? c.url : c.command}${how}${c.transport === 'sse' ? ' · SSE' : ''} · ${c.route === 'api' ? 'through Anthropic\'s MCP connector' : 'run by Format\'s engine'}`);
    const st = q(this.root, '.ft-cn-state');
    setText(st, c.status === 'needs_auth' && c.error && !this.lost(c) && c.error !== 'Sign in to use it' ? `Sign-in could not start: ${c.error}` : c.status !== 'error' ? this.stateText(c) : c.route === 'api'
      ? `Its tools could not be listed from this computer (${c.error}); Claude still reaches the server through Anthropic.` : `Last connection failed: ${c.error}`);
    st.classList.toggle('is-error', c.status === 'error');
    const chip = q(this.cnDetail, '.ft-cn-chip');
    setText(chip, this.chipText(c));
    if (chip.dataset.s !== (c.enabled ? c.status : 'off')) chip.dataset.s = c.enabled ? c.status : 'off';
    setText(q(this.root, '.ft-cn-power'), !c.enabled ? 'Connect' : c.status === 'needs_auth' ? (this.lost(c) ? 'Reconnect' : 'Sign in') : 'Disconnect');
    const perm = (t: { enabled: boolean; permission?: string }): string => t.permission ?? (t.enabled ? c.defaultPermission ?? 'ask' : 'block');
    const box = q(this.root, '.ft-cn-tools');
    const key = JSON.stringify(c.tools.map((t) => t.name));
    if (box.dataset.v !== `${c.id}:${key}`) {
      box.dataset.v = `${c.id}:${key}`;
      box.innerHTML = c.tools.map((t) => `<div class="ft-cn-tool" role="listitem"><span><b>${esc(t.name)}</b><small>${esc(t.description)}</small></span><select class="ft-input ft-cn-perm" data-tool="${esc(t.name)}" aria-label="Permission for ${esc(t.name)}"><option value="allow">Always allow</option><option value="ask">Needs approval</option><option value="block">Blocked</option></select></div>`).join('');
    }
    c.tools.forEach((t) => {
      const sel = box.querySelector<HTMLSelectElement>(`select[data-tool="${CSS.escape(t.name)}"]`);
      if (sel && sel.value !== perm(t)) sel.value = perm(t);
    });
    const kinds = new Set(c.tools.map(perm));
    const all = q<HTMLSelectElement>(this.cnDetail, '.ft-cn-perm[data-tool="*"]');
    const allValue = kinds.size === 1 ? [...kinds][0] : '';
    if (all.value !== allValue) all.value = allValue;
    const head = q(this.cnDetail, '.ft-cn-perm-head');
    if (head.hidden === !c.tools.length) head.hidden = !c.tools.length;
    setText(q(this.cnDetail, '.ft-cn-perm-note'), c.kind === 'url' && c.route === 'local' && !(c.headerNames ?? []).length && kinds.has('ask')
      ? 'A tool needs approval, so Format runs this server itself and the approval card waits for you; with every tool on Always allow or Blocked, Claude reaches it through Anthropic again.'
      : c.route === 'api' ? 'Claude reaches this server through Anthropic\'s MCP connector. Set a tool to Needs approval to have Format run the server and ask before each use.'
        : 'Always allow runs a tool without a card, Needs approval asks in the chat first (unless Allow all or Allow for this chat is on), Blocked hides it from Claude.');
    const none = q(this.root, '.ft-cn-notools');
    if (none.hidden !== c.tools.length > 0) none.hidden = c.tools.length > 0;
  }

  private say(text: string): void {
    setText(this.msg, text);
  }

  showTab(tab: string): void {
    if (this.root.dataset.tab !== tab) this.root.dataset.tab = tab;
    this.root.querySelectorAll<HTMLElement>('.ft-cz-tab').forEach((b) => setAttr(b, 'aria-selected', String(b.dataset.tab === tab)));
    this.showList();
  }

  private filterSection(box: HTMLInputElement): void {
    const words = box.value.trim().toLowerCase();
    const section = box.closest('.ft-cz-section');
    section?.querySelectorAll<HTMLElement>('.ft-cz-list > .ft-cz-row').forEach((row) => {
      const show = !words || (row.textContent ?? '').toLowerCase().includes(words);
      if (row.hidden === show) row.hidden = !show;
    });
    section?.querySelectorAll<HTMLElement>('.ft-cz-list > .ft-cz-group').forEach((head) => {
      const show = !!section.querySelector(`.ft-cz-list > .ft-cz-row[data-group="${head.dataset.group}"]:not([hidden])`);
      if (head.hidden === show) head.hidden = !show;
    });
  }

  private counts(): void {
    const set = (k: string, n: number): void => setText(q(this.root, `[data-count="${k}"]`), n ? String(n) : '');
    set('skills', this.state.skills.length);
    set('connectors', this.state.connectors.length);
    set('plugins', this.state.plugins.length);
    this.setDetail(this.root.dataset.detail ?? '');
  }

  private async showFile(path: string): Promise<void> {
    const s = this.current;
    if (!s) return;
    const seq = this.seq;
    const md = path.toLowerCase().endsWith('.md');
    const text = path === 'SKILL.md' ? s.skillMd.replace(/^---\s*\n[\s\S]*?\n---\s*\n?/, '') : (await run<{ text: string }>('skill.read', { name: s.name, path }).catch((err) => ({ text: err instanceof Error ? err.message : String(err) }))).text;
    if (seq !== this.seq || this.current !== s) return;
    this.root.querySelectorAll<HTMLElement>('.ft-cz-tree [data-file]').forEach((b) => b.classList.toggle('is-on', b.dataset.file === path));
    setText(q(this.root, '.ft-cz-viewer-head'), path);
    const body = q(this.root, '.ft-cz-body');
    const raw = q(this.root, '.ft-cz-raw');
    if (md) {
      if (body.dataset.v !== text) { body.dataset.v = text; body.innerHTML = renderMarkdown(text); }
    } else setText(raw, text);
    if (body.hidden === !md) body.hidden = !md;
    if (raw.hidden === md) raw.hidden = md;
  }

  render(): void {
    const items = this.state.skills;
    const live = new Set(items.map((s) => s.name));
    for (const [n, r] of this.rows) if (!live.has(n)) { r.remove(); this.rows.delete(n); }
    const heads = this.skHeads ?? (this.skHeads = {
      own: el(`<div class="ft-cz-group" data-group="own" role="presentation">Created by you</div>`),
      plugin: el(`<div class="ft-cz-group" data-group="plugin" role="presentation">From plugins</div>`),
    });
    const seq: HTMLElement[] = [];
    [...items.filter((s) => !s.plugin), ...items.filter((s) => s.plugin)].forEach((s) => {
      const group = s.plugin ? 'plugin' : 'own';
      if (!seq.some((n) => n.dataset.group === group)) seq.push(heads[group]);
      let row = this.rows.get(s.name);
      if (!row) {
        row = el(`<div class="ft-cz-row" role="listitem" data-skill="${esc(s.name)}"><span class="ft-cz-icon">${ui('skills', 16)}</span><button type="button" class="ft-cz-text"><span class="ft-cz-row-name"></span><span class="ft-cz-row-desc"></span></button><span class="ft-cz-row-meta"></span><label class="ft-cz-toggle" title="Enabled"><input type="checkbox" role="switch" class="ft-switch" aria-label="Skill enabled"></label></div>`);
        this.rows.set(s.name, row);
      }
      setText(q(row, '.ft-cz-row-name'), s.name);
      setText(q(row, '.ft-cz-row-desc'), s.description);
      setText(q(row, '.ft-cz-row-meta'), `${s.plugin ? `${s.plugin} · ` : ''}${s.files} file${s.files === 1 ? '' : 's'}`);
      const box = q<HTMLInputElement>(row, '.ft-cz-toggle input');
      if (box.checked !== s.enabled) box.checked = s.enabled;
      row.classList.toggle('is-off', !s.enabled);
      if (row.dataset.group !== group) row.dataset.group = group;
      seq.push(row);
    });
    for (const head of Object.values(heads)) if (!seq.includes(head) && head.parentElement) head.remove();
    seq.forEach((n, i) => { if (this.list.children[i] !== n) this.list.insertBefore(n, this.list.children[i] ?? null); });
    if (this.empty.hidden !== items.length > 0) this.empty.hidden = items.length > 0;
    this.counts();
    if (this.current) {
      const now = items.find((s) => s.name === this.current?.name);
      if (!now) this.showList();
      else if (now.modified !== this.current.modified || now.enabled !== this.current.enabled) void this.open(now.name);
    }
  }

  private async upload(f: File): Promise<void> {
    this.say(`Adding ${f.name}`);
    const form = new FormData();
    form.append('file', f, f.name);
    try {
      const res = await fetch('/api/uploads', { method: 'POST', body: form });
      const body = await res.json();
      if (!res.ok || !body.ok) throw new Error(body.error || `upload failed (${res.status})`);
      const s = await run<SkillDetail>('skill.add', { uploadId: (body.file as FileInfo).id });
      this.say(`Added ${s.name}.`);
    } catch (err) {
      this.say(err instanceof Error ? err.message : String(err));
    }
  }

  private async create(): Promise<void> {
    const get = (k: string) => (q<HTMLInputElement>(this.writeForm, `[data-f=${k}]`)).value.trim();
    try {
      const s = await run<SkillDetail>('skill.create', { name: get('name').toLowerCase(), description: get('description'), instructions: get('instructions') });
      this.writeForm.hidden = true;
      this.writeForm.querySelectorAll<HTMLInputElement>('[data-f]').forEach((x) => { x.value = ''; });
      this.say(`Saved ${s.name}.`);
    } catch (err) {
      this.say(err instanceof Error ? err.message : String(err));
    }
  }

  async open(name: string): Promise<void> {
    const seq = ++this.seq;
    const s = await run<SkillDetail>('skill.get', { name });
    if (seq !== this.seq) return;
    this.current = s;
    setText(q(this.root, '.ft-cz-name'), s.name);
    setText(q(this.root, '.ft-cz-desc'), s.description);
    const on = q<HTMLInputElement>(this.root, '.ft-cz-on');
    if (on.checked !== s.enabled) on.checked = s.enabled;
    const order = ['SKILL.md', ...s.fileList.filter((f) => f !== 'SKILL.md')];
    const tree = order.map((f) => `<button type="button" class="ft-cz-tree-item" data-file="${esc(f)}" title="${esc(f)}">${ui('file', 14)}<span>${esc(f)}</span></button>`).join('');
    const tbox = q(this.root, '.ft-cz-tree');
    if (tbox.dataset.v !== tree) { tbox.dataset.v = tree; tbox.innerHTML = tree; }
    void this.showFile('SKILL.md');
    const del = q<HTMLButtonElement>(this.root, '.ft-cz-delete');
    if (!del.hidden && del.dataset.for !== s.name) del.hidden = true;
    del.dataset.for = s.name;
    if (!this.cnDetail.hidden) this.cnDetail.hidden = true;
    if (!this.plDetail.hidden) this.plDetail.hidden = true;
    if (this.detail.hidden) this.detail.hidden = false;
    this.setDetail('skill');
  }

  showList(): void {
    ++this.seq;
    this.current = null;
    this.cnOpen = null;
    this.plOpen = null;
    if (!this.detail.hidden) this.detail.hidden = true;
    if (!this.cnDetail.hidden) this.cnDetail.hidden = true;
    if (!this.plDetail.hidden) this.plDetail.hidden = true;
    if (this.main.hidden) this.main.hidden = false;
    this.setDetail('');
  }

  private setDetail(kind: string): void {
    if ((this.root.dataset.detail ?? '') !== kind) this.root.dataset.detail = kind;
    const pick = (list: string, attr: string, on: string | null): void => {
      this.root.querySelectorAll<HTMLElement>(`${list} > [${attr}]`).forEach((row) => {
        const sel = kind !== '' && row.getAttribute(attr) === on;
        if (row.classList.contains('is-selected') !== sel) row.classList.toggle('is-selected', sel);
        if ((row.getAttribute('aria-current') === 'true') !== sel) setAttr(row, 'aria-current', sel ? 'true' : null);
      });
    };
    pick('.ft-sk-list', 'data-skill', kind === 'skill' ? this.current?.name ?? null : null);
    pick('.ft-cn-list', 'data-cn', kind === 'connector' ? this.cnOpen : null);
    pick('.ft-pl-list', 'data-pl', kind === 'plugin' ? this.plOpen : null);
  }

  private async remove(): Promise<void> {
    if (!this.current) return;
    try { await run('skill.delete', { name: this.current.name }); } catch (err) { this.say(err instanceof Error ? err.message : String(err)); }
  }
}
