import { run } from '../engine-client/api';
import { keyHeaders } from '../engine-client/window-key';
import type { AppState, ConnectorInfo, FileInfo, MarketplaceInfo, PluginSummary, SkillSummary } from '../state/app-state';
import { el, esc, q, setAttr, setText } from './dom';
import { ui } from './icons-ft';
import { renderMarkdown } from './markdown';
import { openMenu } from './menu';

export interface CustomizeHooks { tryInChat(skill: string): void; createPlugin(): void; skillChat(skill: string): void }

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
  private skHeads: { own: HTMLElement; official: HTMLElement; market: HTMLElement; plugin: HTMLElement } | null = null;
  private current: SkillDetail | null = null;
  private seq = 0;

  constructor(private state: AppState, private hooks: CustomizeHooks = { tryInChat: () => undefined, createPlugin: () => undefined, skillChat: () => undefined }) {
    this.root = el(`<section class="ft-page ft-customize" data-view="customize" data-tab="skills" hidden>
      <div class="ft-cz-main">
        <header class="ft-proj-head"><h1>Customize</h1></header>
        <nav class="ft-cz-tabs" role="tablist" aria-label="Customize">
          <button type="button" role="tab" class="ft-cz-tab" data-tab="skills" aria-selected="true">${ui('skills', 16)}<span>Skills</span><span class="ft-cz-count" data-count="skills"></span></button>
          <button type="button" role="tab" class="ft-cz-tab" data-tab="connectors" aria-selected="false">${ui('plug', 16)}<span>Connectors</span><span class="ft-cz-count" data-count="connectors"></span></button>
          <button type="button" role="tab" class="ft-cz-tab" data-tab="plugins" aria-selected="false">${ui('plugin', 16)}<span>Plugins</span><span class="ft-cz-count" data-count="plugins"></span></button>
        </nav>
        <section class="ft-cz-section ft-pl-section" data-sec="plugins">
          <div class="ft-cz-section-head"><div class="ft-pl-views" role="tablist" aria-label="Plugins"><button type="button" role="tab" class="ft-pl-view" data-plv="yours" aria-selected="true">Your plugins</button><button type="button" role="tab" class="ft-pl-view" data-plv="discover" aria-selected="false">Discover</button></div>
            <div class="ft-cz-actions"><input class="ft-input ft-cz-search" type="search" placeholder="Search plugins" aria-label="Search plugins"><button type="button" class="ft-btn ft-pl-addmenu" data-menu-anchor>${ui('plus', 14)}<span>Add</span></button></div></div>
          <p class="ft-set-note">A plugin bundles skills, commands, connectors and agents for one kind of work, in the Claude plugin format (a folder with .claude-plugin/plugin.json). Its skills and commands appear under Skills and turn on and off with it; its connectors are listed on its page for you to add. Add plugins from a marketplace in Discover, or upload one as a .zip.</p>
          <span class="ft-proj-msg ft-pl-msg" aria-live="polite"></span>
          <div class="ft-proj-form ft-pl-mform" hidden>
            <label class="ft-field"><span>Marketplace</span><input class="ft-input ft-pl-msource" placeholder="owner/repo, https://github.com/your-org/your-plugins, or a folder" spellcheck="false"></label>
            <label class="ft-field"><span>GitHub access token (only for a private repository)</span><input class="ft-input ft-pl-mtoken" type="password" autocomplete="off" placeholder="A token that can read the repository; your git sign-in also works"></label>
            <p class="ft-set-note">A marketplace is a Git repository (or a folder) with .claude-plugin/marketplace.json. FormAT copies its catalog and lists its plugins in Discover; nothing is installed until you add one. Only add marketplaces you trust: their plugins are not reviewed.</p>
            <div class="ft-set-actions"><button type="button" class="ft-btn ft-btn-primary ft-pl-madd">Add marketplace</button><button type="button" class="ft-btn ft-pl-mcancel">Cancel</button></div>
          </div>
          <div class="ft-proj-form ft-pl-cform" hidden>
            <h3 class="ft-proj-sub ft-pl-ctitle">Create a plugin</h3>
            <label class="ft-field"><span>Name</span><input class="ft-input ft-pl-cname" maxlength="64" placeholder="lowercase, for example weekly-report" spellcheck="false"></label>
            <label class="ft-field"><span>Description</span><input class="ft-input ft-pl-cdesc" placeholder="What the plugin is for"></label>
            <p class="ft-set-note">Its files: a skill is skills/&lt;name&gt;/SKILL.md, a command is commands/&lt;name&gt;.md, MCP servers go in .mcp.json. plugin.json is written from the name and description.</p>
            <div class="ft-pl-cfiles"></div>
            <div class="ft-set-actions"><button type="button" class="ft-btn ft-pl-cfile">${ui('plus', 14)}<span>Add file</span></button></div>
            <div class="ft-set-actions"><button type="button" class="ft-btn ft-btn-primary ft-pl-csave">Create plugin</button><button type="button" class="ft-btn ft-pl-ccancel">Cancel</button></div>
          </div>
          <div class="ft-pl-yours">
            <div class="ft-cz-list ft-pl-list" role="list"></div>
            <p class="ft-proj-none ft-pl-empty">No plugins yet. Find one in Discover, or upload one.</p>
          </div>
          <div class="ft-pl-discover" hidden>
            <div class="ft-cz-list ft-pl-offers" role="list"></div>
            <p class="ft-proj-none ft-pl-nooffers">No marketplaces yet. Add one with Add, then Add marketplace.</p>
            <h3 class="ft-proj-sub ft-pl-mhead">Marketplaces</h3>
            <div class="ft-cz-list ft-pl-markets" role="list"></div>
          </div>
          <input type="file" class="ft-pl-picker" accept=".zip,.plugin" hidden>
        </section>
        <section class="ft-cz-section" data-sec="skills">
          <div class="ft-cz-section-head"><div class="ft-pl-views" role="tablist" aria-label="Skills"><button type="button" role="tab" class="ft-pl-view ft-sk-view" data-skv="yours" aria-selected="true">Your skills</button><button type="button" role="tab" class="ft-pl-view ft-sk-view" data-skv="discover" aria-selected="false">Discover</button></div>
            <div class="ft-cz-actions"><input class="ft-input ft-cz-search" type="search" placeholder="Search skills" aria-label="Search skills"><button type="button" class="ft-btn ft-cz-add" data-menu-anchor>${ui('plus', 14)}<span>Add</span></button></div></div>
          <p class="ft-set-note">A skill is a folder of instructions, with a SKILL.md whose name and description tell Claude when to use it. Claude sees every skill that is on and loads one when a task matches it. Type / in a message to pick one, or open a skill to read its files and try it in a chat.</p>
          <span class="ft-proj-msg ft-cz-msg" aria-live="polite"></span>
          <div class="ft-proj-form ft-cz-form" hidden>
            <label class="ft-field"><span>Name</span><input class="ft-input" data-f="name" maxlength="64" placeholder="lowercase-with-hyphens"></label>
            <label class="ft-field"><span>Description: when should Claude use it?</span><textarea class="ft-input" data-f="description" rows="2" maxlength="1024" placeholder="For example: Use when the person asks for release notes"></textarea></label>
            <label class="ft-field"><span>Instructions</span><textarea class="ft-input" data-f="instructions" rows="8" placeholder="What Claude should do, step by step, in Markdown"></textarea></label>
            <div class="ft-set-actions"><button type="button" class="ft-btn ft-btn-primary ft-cz-create">Save skill</button><button type="button" class="ft-btn ft-cz-cancel">Cancel</button></div>
          </div>
          <div class="ft-sk-yours"><div class="ft-cz-list ft-sk-list" role="list"></div>
          <div class="ft-page-empty ft-cz-empty" hidden>${ui('skills', 28)}<p>No skills yet.</p></div></div>
          <div class="ft-sk-discover" hidden>
            <p class="ft-set-note">Skills the marketplaces you added offer, each added on its own without its plugin. Add marketplaces under Plugins; Anthropic's own skills are in the anthropics/skills marketplace.</p>
            <div class="ft-set-actions ft-sk-anthropic" hidden><button type="button" class="ft-btn ft-sk-addofficial">${ui('plus', 14)}<span>Add Anthropic's skills marketplace</span></button></div>
            <div class="ft-cz-list ft-sk-offers" role="list"></div>
            <p class="ft-proj-none ft-sk-nooffers" hidden>No skills to discover yet.</p>
          </div>
          <input type="file" class="ft-cz-picker" accept=".zip,.md" hidden>
        </section>
        <section class="ft-cz-section ft-cn-section" data-sec="connectors">
          <div class="ft-cz-section-head"><div class="ft-pl-views" role="tablist" aria-label="Connectors"><button type="button" role="tab" class="ft-pl-view ft-cn-view" data-cnv="yours" aria-selected="true">Your connectors</button><button type="button" role="tab" class="ft-pl-view ft-cn-view" data-cnv="discover" aria-selected="false">Discover</button></div>
            <div class="ft-cz-actions"><input class="ft-input ft-cz-search" type="search" placeholder="Search connectors" aria-label="Search connectors"><button type="button" class="ft-btn ft-cn-addopen">${ui('plus', 14)}<span>Add custom connector</span></button></div></div>
          <p class="ft-set-note">A connector is an MCP server that gives Claude more tools. A public https URL goes to Claude through Anthropic's MCP connector; a server on this computer or your network, or one started by a command, runs in FormAT's engine, and its tools ask before they run in Ask mode. Turn single tools off in a connector's page.</p>
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
          <div class="ft-cn-yours"><div class="ft-cz-list ft-cn-list" role="list"></div>
          <p class="ft-proj-none ft-cn-empty">No connectors yet.</p></div>
          <div class="ft-cn-discover" hidden>
            <p class="ft-set-note">Remote MCP servers their makers publish, each with the URL from the maker's own page (Docs). They are not reviewed by Anthropic or FormAT: connect only services you trust.</p>
            <div class="ft-cn-cats" role="group" aria-label="Categories"></div>
            <div class="ft-cz-list ft-cn-dir" role="list"></div>
          </div>
        </section>
      </div>
      <div class="ft-cz-detail" hidden>
        <button type="button" class="ft-text-btn ft-cz-back">${ui('back', 14)}<span>Customize</span></button>
        <div class="ft-cz-detail-head"><h1 class="ft-cz-name"></h1><label class="ft-field ft-check ft-switch-label" title="Claude can use this skill while it is on"><input type="checkbox" role="switch" class="ft-cz-on ft-switch"><span>Enabled</span></label><button type="button" class="ft-btn ft-btn-primary ft-cz-try">${ui('chat', 14)}<span>Try in chat</span></button><button type="button" class="ft-btn ft-cz-edit">${ui('pencil', 14)}<span>Edit with Claude</span></button><button type="button" class="ft-btn ft-danger-btn ft-cz-delete" hidden>Delete? This cannot be undone</button><button type="button" class="ft-icon-btn ft-cz-more" data-menu-anchor aria-label="More actions" title="More actions">${ui('more', 16)}</button></div>
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
        <div class="ft-pl-tabs" role="tablist" aria-label="What the plugin adds">${(['skills', 'commands', 'connectors', 'agents'] as const).map((k, i) => `<button type="button" role="tab" class="ft-pl-tab" data-plt="${k}" aria-selected="${i === 0}">${k[0].toUpperCase()}${k.slice(1)}<span class="ft-cz-count" data-plcount="${k}"></span></button>`).join('')}</div>
        <div class="ft-pl-pane" data-pane="skills"><div class="ft-cz-files ft-pl-skills"></div><p class="ft-proj-none ft-pl-noskills">No skills.</p></div>
        <div class="ft-pl-pane" data-pane="commands" hidden><p class="ft-set-note">In chat a command loads as a skill: pick it from the / menu.</p><div class="ft-cz-files ft-pl-cmds"></div><p class="ft-proj-none ft-pl-nocmds">No commands.</p></div>
        <div class="ft-pl-pane" data-pane="connectors" hidden><p class="ft-set-note">Adding a plugin adds none of its connectors. Add one here, then connect it; its skills load either way.</p><div class="ft-cz-list ft-pl-conns" role="list"></div><p class="ft-proj-none ft-pl-noconns">No connectors.</p></div>
        <div class="ft-pl-pane" data-pane="agents" hidden><p class="ft-set-note ft-pl-agentnote">Agents run in Cowork and Claude Code; FormAT lists them but does not run them in chat.</p><div class="ft-cz-files ft-pl-agents"></div><p class="ft-proj-none ft-pl-noagents">No agents.</p></div>
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
      { label: 'Create with Claude', desc: 'A chat where Claude writes the skill with you', icon: 'chat', action: () => this.hooks.skillChat('') },
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
    q(this.root, '.ft-cz-edit').addEventListener('click', () => { if (this.current && !this.current.plugin) this.hooks.skillChat(this.current.name); });
    this.root.querySelectorAll<HTMLElement>('.ft-sk-view').forEach((b) => b.addEventListener('click', () => this.setSkillView(b.dataset.skv ?? 'yours')));
    q(this.root, '.ft-sk-addofficial').addEventListener('click', async () => {
      setText(this.msg, 'Adding the anthropics/skills marketplace');
      try { await run('marketplace.add', { source: 'anthropics/skills' }); setText(this.msg, 'Added Anthropic\'s skills marketplace.'); void this.refreshSkillOffers(); } catch (err) { setText(this.msg, err instanceof Error ? err.message : String(err)); }
    });
    q(this.root, '.ft-sk-offers').addEventListener('click', async (e) => {
      const t = e.target as HTMLElement;
      const row = t.closest<HTMLElement>('[data-skoffer]');
      if (!row || !t.closest('.ft-sk-get')) return;
      const [marketplace, path] = (row.dataset.skoffer ?? '').split('\n');
      try {
        const s = await run<SkillSummary>('skill.installFrom', { marketplace, path });
        setText(this.msg, `Added the ${s.name} skill.`);
        void this.refreshSkillOffers();
      } catch (err) { setText(this.msg, err instanceof Error ? err.message : String(err)); }
    });
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
      { label: 'Delete', desc: 'Remove this skill and its files from FormAT', icon: 'trash', disabled: !!this.current?.plugin, action: () => { const del = q<HTMLButtonElement>(this.root, '.ft-cz-delete'); if (del.hidden) del.hidden = false; del.focus(); } },
      ...(this.current?.plugin ? [{ note: `From the ${this.current.plugin} plugin: remove the plugin to remove it` }] : []),
    ], 'down'));
    this.root.addEventListener('dragover', (e) => e.preventDefault());
    this.root.addEventListener('drop', (e) => { e.preventDefault(); const f = e.dataTransfer?.files?.[0]; if (f) void this.upload(f); });
    state.on('skills', () => { this.render(); if (!q(this.root, '.ft-sk-discover').hidden) this.renderSkillOffers(); });
    this.cnDetail = q(this.root, '.ft-cn-detail');
    this.wireConnectors();
    state.on('connectors', () => { this.renderConnectors(); if (this.plOpen) this.paintPlugin(); if (this.directory.length) this.renderDirectory(); });
    this.plDetail = q(this.root, '.ft-pl-detail');
    this.wirePlugins();
    this.root.querySelectorAll<HTMLElement>('.ft-proj-msg').forEach((m) => new MutationObserver(() => { const t = m.textContent ?? ''; if (m.title !== t) m.title = t; })
      .observe(m, { childList: true, characterData: true, subtree: true }));
    state.on('plugins', () => { this.renderPlugins(); this.renderMarkets(); });
    state.on('marketplaces', () => { this.renderMarkets(); if (!q(this.root, '.ft-sk-discover').hidden) void this.refreshSkillOffers(); });
  }

  private plDetail: HTMLElement;
  private plRows = new Map<string, HTMLElement>();
  private plOpen: string | null = null;

  private wirePlugins(): void {
    const picker = q<HTMLInputElement>(this.root, '.ft-pl-picker');
    const msg = q(this.root, '.ft-pl-msg');
    const mform = q(this.root, '.ft-pl-mform');
    const say = (err: unknown): void => setText(msg, err instanceof Error ? err.message : String(err));
    q(this.root, '.ft-pl-addmenu').addEventListener('click', (e) => openMenu(e.currentTarget as HTMLElement, [
      { label: 'Add marketplace', desc: 'A Git repository or folder that lists plugins', icon: 'plugin', action: () => { if (mform.hidden) mform.hidden = false; q<HTMLInputElement>(mform, '.ft-pl-msource').focus(); } },
      { label: 'Upload plugin', desc: 'A .zip or .plugin of a plugin folder', icon: 'paperclip', action: () => picker.click() },
      { divider: true },
      { label: 'Create with Claude', desc: 'A chat where Claude builds the plugin with you', icon: 'chat', action: () => this.hooks.createPlugin() },
      { label: 'Create a plugin', desc: 'Write its files here', icon: 'file', action: () => this.openEditor(null) },
    ], 'down'));
    const cform = q(this.root, '.ft-pl-cform');
    q(this.root, '.ft-pl-cfile').addEventListener('click', () => { const row = this.fileRow('', ''); q(cform, '.ft-pl-cfiles').appendChild(row); q<HTMLInputElement>(row, '.ft-pl-cpath').focus(); });
    q(cform, '.ft-pl-cfiles').addEventListener('click', (e) => { const del = (e.target as HTMLElement).closest('.ft-pl-cdel'); if (del) del.closest('.ft-pl-cf')?.remove(); });
    q(this.root, '.ft-pl-ccancel').addEventListener('click', () => { cform.hidden = true; });
    q(this.root, '.ft-pl-csave').addEventListener('click', async () => {
      const name = q<HTMLInputElement>(cform, '.ft-pl-cname').value.trim().toLowerCase();
      const files = [...cform.querySelectorAll<HTMLElement>('.ft-pl-cf')].map((f) => ({ path: q<HTMLInputElement>(f, '.ft-pl-cpath').value.trim(), content: q<HTMLTextAreaElement>(f, '.ft-pl-cbody').value })).filter((f) => f.path);
      try {
        const p = await run<PluginSummary>('plugin.create', { name, description: q<HTMLInputElement>(cform, '.ft-pl-cdesc').value.trim(), files });
        cform.hidden = true;
        setText(msg, `Saved ${p.name}: ${p.skills.length} skill${p.skills.length === 1 ? '' : 's'} and commands.`);
        this.setPluginView('yours');
        this.openPlugin(p.name);
      } catch (err) { say(err); }
    });
    q(this.root, '.ft-pl-mcancel').addEventListener('click', () => { mform.hidden = true; });
    q(this.root, '.ft-pl-madd').addEventListener('click', async () => {
      const src = q<HTMLInputElement>(mform, '.ft-pl-msource');
      setText(msg, `Adding ${src.value.trim()}`);
      try {
        const tok = q<HTMLInputElement>(mform, '.ft-pl-mtoken');
        const m = await run<MarketplaceInfo>('marketplace.add', { source: src.value.trim(), ...(tok.value.trim() ? { token: tok.value.trim() } : {}) });
        src.value = '';
        tok.value = '';
        mform.hidden = true;
        setText(msg, `Added the ${m.name} marketplace: ${m.plugins.length} plugin${m.plugins.length === 1 ? '' : 's'} in Discover.`);
        this.setPluginView('discover');
      } catch (err) { say(err); }
    });
    this.root.querySelectorAll<HTMLElement>('.ft-pl-view[data-plv]').forEach((b) => b.addEventListener('click', () => this.setPluginView(b.dataset.plv ?? 'yours')));
    q(this.root, '.ft-pl-offers').addEventListener('click', async (e) => {
      const t = e.target as HTMLElement;
      const row = t.closest<HTMLElement>('[data-offer]');
      if (!row) return;
      const [market, name] = (row.dataset.offer ?? '').split('\n');
      if (t.closest('.ft-pl-get')) {
        const offer = this.state.marketplaces.find((m) => m.name === market)?.plugins.find((o) => o.name === name);
        if (offer?.command && row.dataset.confirm !== '1') {
          row.dataset.confirm = '1';
          setText(q(row, '.ft-cz-row-desc'), `Adding it runs this command on this computer: ${offer.command}`);
          setText(q(row, '.ft-pl-get'), 'Run and add');
          return;
        }
        setText(msg, `Adding ${name} from ${market}`);
        try {
          const p = await run<PluginSummary>('plugin.install', { marketplace: market, plugin: name, ...(offer?.command ? { confirm: true } : {}) });
          setText(msg, `Added ${p.name}: ${p.skills.length} skill${p.skills.length === 1 ? '' : 's'}${p.servers?.length ? `, ${p.servers.length} connector${p.servers.length === 1 ? '' : 's'} to add on its page` : ''}.`);
        } catch (err) { say(err); }
        return;
      }
      if (this.state.plugins.some((p) => p.name === name)) this.openPlugin(name);
    });
    const markets = q(this.root, '.ft-pl-markets');
    markets.addEventListener('click', async (e) => {
      const t = e.target as HTMLElement;
      const row = t.closest<HTMLElement>('[data-market]');
      const name = row?.dataset.market;
      if (!row || !name) return;
      if (t.closest('.ft-pl-check')) {
        setText(msg, `Checking ${name} for updates`);
        try {
          const r = await run<{ updated: string[]; marketplace: MarketplaceInfo }>('marketplace.update', { name });
          setText(msg, r.marketplace.error ? `Checked ${name}: ${r.marketplace.error}` : r.updated.length ? `Updated ${r.updated.join(', ')}.` : `${name} is up to date.`);
        } catch (err) { say(err); }
      } else if (t.closest('.ft-pl-mremove')) {
        try { await run('marketplace.remove', { name }); setText(msg, `Removed the ${name} marketplace and its plugins.`); } catch (err) { say(err); }
      } else if (t.closest('.ft-pl-mmore')) {
        openMenu(t.closest('.ft-pl-mmore') as HTMLElement, [
          { label: 'Remove', desc: 'Remove the marketplace and uninstall its plugins', icon: 'trash', action: () => { const del = q<HTMLButtonElement>(row, '.ft-pl-mremove'); if (del.hidden) del.hidden = false; del.focus(); } },
        ], 'down');
      }
    });
    markets.addEventListener('change', (e) => {
      const box = (e.target as HTMLElement).closest<HTMLInputElement>('.ft-pl-sync input');
      const name = box?.closest<HTMLElement>('[data-market]')?.dataset.market;
      if (box && name) void run('marketplace.sync', { name, on: box.checked }).catch(say);
    });
    this.root.querySelectorAll<HTMLElement>('.ft-pl-tab').forEach((b) => b.addEventListener('click', () => this.setPluginTab(b.dataset.plt ?? 'skills')));
    q(this.root, '.ft-pl-cmds').addEventListener('click', (e) => {
      const s = (e.target as HTMLElement).closest<HTMLElement>('[data-skill-link]')?.dataset.skillLink;
      if (s) void this.open(s);
    });
    picker.addEventListener('change', async () => {
      const f = picker.files?.[0];
      picker.value = '';
      if (!f) return;
      setText(msg, `Adding ${f.name}`);
      const form = new FormData();
      form.append('file', f, f.name);
      try {
        const res = await fetch('/api/uploads', { method: 'POST', body: form, headers: keyHeaders() });
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
      ...(this.state.plugins.find((x) => x.name === this.plOpen)?.origin?.kind === 'created'
        ? [{ label: 'Edit files', desc: 'Change its description, skills and commands', icon: 'file' as const, action: () => { if (this.plOpen) void this.openEditor(this.plOpen); } }] : []),
      { label: 'Remove', desc: 'Uninstall the plugin with its skills and connectors', icon: 'trash', action: () => { const del = q<HTMLButtonElement>(this.root, '.ft-pl-delete'); if (del.hidden) del.hidden = false; del.focus(); } },
    ], 'down'));
    q(this.root, '.ft-pl-skills').addEventListener('click', (e) => {
      const s = (e.target as HTMLElement).closest<HTMLElement>('[data-skill-link]')?.dataset.skillLink;
      if (s) void this.open(s);
    });
    q(this.root, '.ft-pl-conns').addEventListener('click', async (e) => {
      const t = e.target as HTMLElement;
      const row = t.closest<HTMLElement>('[data-srv]');
      const p = this.state.plugins.find((x) => x.name === this.plOpen);
      const srv = p?.servers?.find((s) => s.name === row?.dataset.srv);
      if (!p || !srv) return;
      try {
        if (t.closest('.ft-pl-srvadd')) {
          const r = await run<{ added?: string }>('plugin.addConnector', { name: p.name, server: srv.name });
          if (r.added) await run('connector.connect', { id: r.added });
        } else if (t.closest('.ft-pl-srvconnect') && srv.connectorId) {
          await this.powerConnector(srv.connectorId, true);
        } else if (srv.connectorId) {
          this.openConnector(srv.connectorId);
        }
      } catch (err) { say(err); }
    });
  }

  private fileRow(path: string, content: string): HTMLElement {
    const row = el(`<div class="ft-pl-cf"><div class="ft-pl-cf-head"><input class="ft-input ft-pl-cpath" placeholder="skills/name/SKILL.md" spellcheck="false" aria-label="File path"><button type="button" class="ft-icon-btn ft-pl-cdel" aria-label="Remove this file" title="Remove this file">${ui('close', 14)}</button></div><textarea class="ft-input ft-pl-cbody" rows="8" spellcheck="false" aria-label="File contents"></textarea></div>`);
    q<HTMLInputElement>(row, '.ft-pl-cpath').value = path;
    q<HTMLTextAreaElement>(row, '.ft-pl-cbody').value = content;
    return row;
  }

  private async openEditor(name: string | null): Promise<void> {
    const cform = q(this.root, '.ft-pl-cform');
    const box = q(cform, '.ft-pl-cfiles');
    const nameIn = q<HTMLInputElement>(cform, '.ft-pl-cname');
    const p = name ? this.state.plugins.find((x) => x.name === name) : null;
    let files = [{ path: 'skills/example/SKILL.md', content: '---\nname: example\ndescription: Say exactly when Claude should use this skill.\n---\n\nWrite the instructions Claude follows here.\n' }];
    if (name) {
      try { files = (await run<{ files: Array<{ path: string; content: string }> }>('plugin.files', { name })).files; } catch (err) { setText(q(this.root, '.ft-pl-msg'), err instanceof Error ? err.message : String(err)); return; }
    }
    setText(q(cform, '.ft-pl-ctitle'), name ? `Edit ${name}` : 'Create a plugin');
    setText(q(cform, '.ft-pl-csave'), name ? 'Save changes' : 'Create plugin');
    nameIn.value = name ?? '';
    nameIn.readOnly = !!name;
    q<HTMLInputElement>(cform, '.ft-pl-cdesc').value = p?.description ?? '';
    box.replaceChildren(...files.map((f) => this.fileRow(f.path, f.content)));
    if (this.plOpen) this.showList();
    this.setPluginView('yours');
    if (cform.hidden) cform.hidden = false;
    (name ? q<HTMLInputElement>(cform, '.ft-pl-cdesc') : nameIn).focus();
  }

  private directory: Array<{ name: string; url: string; transport: string; auth: string; category: string; description: string; docs: string; checked: string; added: boolean; connectorId: string }> = [];
  private dirRows = new Map<string, HTMLElement>();
  private dirCat = '';

  private setConnectorView(view: string): void {
    this.root.querySelectorAll<HTMLElement>('.ft-cn-view').forEach((b) => setAttr(b, 'aria-selected', String(b.dataset.cnv === view)));
    const yours = q(this.root, '.ft-cn-yours');
    const disc = q(this.root, '.ft-cn-discover');
    if (yours.hidden !== (view !== 'yours')) yours.hidden = view !== 'yours';
    if (disc.hidden !== (view !== 'discover')) disc.hidden = view !== 'discover';
    if (view === 'discover') void this.refreshDirectory();
  }

  private async refreshDirectory(): Promise<void> {
    try { this.directory = (await run<{ connectors: CustomizeView['directory'] }>('connector.directory')).connectors; } catch { return; }
    this.renderDirectory();
  }

  private renderDirectory(): void {
    const cats = [...new Set(this.directory.map((d) => d.category))].sort();
    const cbox = q(this.root, '.ft-cn-cats');
    const ckey = cats.join('\n');
    if (cbox.dataset.v !== ckey) {
      cbox.dataset.v = ckey;
      cbox.innerHTML = ['', ...cats].map((c) => `<button type="button" class="ft-chip ft-cn-cat" data-cat="${esc(c)}" aria-pressed="false">${esc(c || 'All')}</button>`).join('');
    }
    cbox.querySelectorAll<HTMLElement>('.ft-cn-cat').forEach((b) => setAttr(b, 'aria-pressed', String((b.dataset.cat ?? '') === this.dirCat)));
    const box = q(this.root, '.ft-cn-dir');
    const urls = new Map(this.state.connectors.filter((c) => c.url).map((c) => [c.url.replace(/\/$/, ''), c]));
    this.directory.forEach((d, i) => {
      let row = this.dirRows.get(d.url);
      if (!row) {
        row = el(`<div class="ft-cz-row ft-pl-offer" role="listitem"><span class="ft-cz-icon">${ui('plug', 16)}</span><span class="ft-cz-text"><span class="ft-cz-row-name"></span><span class="ft-cz-row-desc"></span><span class="ft-cz-row-meta"></span></span><button type="button" class="ft-btn ft-cn-dirget"></button></div>`);
        row.dataset.dir = d.url;
        this.dirRows.set(d.url, row);
      }
      const have = urls.get(d.url.replace(/\/$/, ''));
      setText(q(row, '.ft-cz-row-name'), d.name);
      setText(q(row, '.ft-cz-row-desc'), d.description);
      q(row, '.ft-cz-row-meta').innerHTML = `${esc(d.category)} · ${d.auth === 'oauth' ? 'Sign in' : d.auth === 'token' ? 'Needs a key' : 'No sign-in'} · <a href="${esc(d.docs)}" target="_blank" rel="noopener noreferrer">Docs</a>`;
      const get = q<HTMLButtonElement>(row, '.ft-cn-dirget');
      setText(get, have ? 'Added' : 'Connect');
      if (get.disabled !== !!have) get.disabled = !!have;
      const show = !this.dirCat || d.category === this.dirCat;
      if (row.hidden === show) row.hidden = !show;
      if (box.children[i] !== row) box.insertBefore(row, box.children[i] ?? null);
    });
  }

  private skillOffers: Array<{ marketplace: string; plugin: string; name: string; description: string; path: string; official: boolean; installed: boolean; taken: boolean }> = [];
  private skOfferRows = new Map<string, HTMLElement>();

  private setSkillView(view: string): void {
    this.root.querySelectorAll<HTMLElement>('.ft-sk-view').forEach((b) => setAttr(b, 'aria-selected', String(b.dataset.skv === view)));
    const yours = q(this.root, '.ft-sk-yours');
    const disc = q(this.root, '.ft-sk-discover');
    if (yours.hidden !== (view !== 'yours')) yours.hidden = view !== 'yours';
    if (disc.hidden !== (view !== 'discover')) disc.hidden = view !== 'discover';
    if (view === 'discover') {
      this.renderSkillOffers();
      void this.refreshSkillOffers();
    }
  }

  private skillOffersLoaded = false;

  private async refreshSkillOffers(): Promise<void> {
    try { this.skillOffers = (await run<{ skills: CustomizeView['skillOffers'] }>('skill.discover')).skills; } catch { return; }
    this.skillOffersLoaded = true;
    this.renderSkillOffers();
  }

  private renderSkillOffers(): void {
    const box = q(this.root, '.ft-sk-offers');
    const mine = new Map(this.state.skills.map((s) => [s.name, s]));
    const live = new Set(this.skillOffers.map((o) => `${o.marketplace}\n${o.path}`));
    for (const [k, r] of this.skOfferRows) if (!live.has(k)) { r.remove(); this.skOfferRows.delete(k); }
    this.skillOffers.forEach((o, i) => {
      const key = `${o.marketplace}\n${o.path}`;
      let row = this.skOfferRows.get(key);
      if (!row) {
        row = el(`<div class="ft-cz-row ft-pl-offer" role="listitem"><span class="ft-cz-icon">${ui('skills', 16)}</span><span class="ft-cz-text"><span class="ft-cz-row-name"></span><span class="ft-cz-row-desc"></span><span class="ft-cz-row-meta"></span></span><button type="button" class="ft-btn ft-sk-get"></button></div>`);
        row.dataset.skoffer = key;
        this.skOfferRows.set(key, row);
      }
      const have = mine.get(o.name);
      const here = !!have && have.source?.marketplace === o.marketplace;
      setText(q(row, '.ft-cz-row-name'), o.name);
      setText(q(row, '.ft-cz-row-desc'), o.description);
      setText(q(row, '.ft-cz-row-meta'), [o.official ? 'Anthropic' : o.marketplace, o.plugin].filter(Boolean).join(' · '));
      const get = q<HTMLButtonElement>(row, '.ft-sk-get');
      setText(get, here ? 'Added' : have ? 'Replace' : 'Add');
      if (get.disabled !== here) get.disabled = here;
      if (box.children[i] !== row) box.insertBefore(row, box.children[i] ?? null);
    });
    const none = q(this.root, '.ft-sk-nooffers');
    const hideNone = !this.skillOffersLoaded || this.skillOffers.length > 0;
    if (none.hidden !== hideNone) none.hidden = hideNone;
    const official = q(this.root, '.ft-sk-anthropic');
    const hasOfficial = this.state.marketplaces.some((m) => /^(anthropics\/|https:\/\/github\.com\/anthropics\/)/.test(m.source));
    if (official.hidden !== hasOfficial) official.hidden = hasOfficial;
  }

  private setPluginView(view: string): void {
    this.root.querySelectorAll<HTMLElement>('.ft-pl-view[data-plv]').forEach((b) => setAttr(b, 'aria-selected', String(b.dataset.plv === view)));
    const yours = q(this.root, '.ft-pl-yours');
    const disc = q(this.root, '.ft-pl-discover');
    if (yours.hidden !== (view !== 'yours')) yours.hidden = view !== 'yours';
    if (disc.hidden !== (view !== 'discover')) disc.hidden = view !== 'discover';
  }

  private setPluginTab(tab: string): void {
    this.root.querySelectorAll<HTMLElement>('.ft-pl-tab').forEach((b) => setAttr(b, 'aria-selected', String(b.dataset.plt === tab)));
    this.root.querySelectorAll<HTMLElement>('.ft-pl-pane').forEach((pane) => { if (pane.hidden !== (pane.dataset.pane !== tab)) pane.hidden = pane.dataset.pane !== tab; });
  }

  private offerRows = new Map<string, HTMLElement>();
  private marketRows = new Map<string, HTMLElement>();

  renderMarkets(): void {
    const box = q(this.root, '.ft-pl-offers');
    const mine = new Map(this.state.plugins.map((p) => [p.name, p]));
    const offers = this.state.marketplaces.flatMap((m) => m.plugins.map((o) => ({ m, o })));
    const live = new Set(offers.map(({ m, o }) => `${m.name}\n${o.name}`));
    for (const [k, r] of this.offerRows) if (!live.has(k)) { r.remove(); this.offerRows.delete(k); }
    offers.forEach(({ m, o }, i) => {
      const key = `${m.name}\n${o.name}`;
      let row = this.offerRows.get(key);
      if (!row) {
        row = el(`<div class="ft-cz-row ft-pl-offer" role="listitem"><span class="ft-cz-icon">${ui('plugin', 16)}</span><button type="button" class="ft-cz-text"><span class="ft-cz-row-name"></span><span class="ft-cz-row-desc"></span><span class="ft-cz-row-meta"></span></button><button type="button" class="ft-btn ft-pl-get"></button></div>`);
        row.dataset.offer = key;
        this.offerRows.set(key, row);
      }
      const have = mine.get(o.name);
      const here = !!have && have.origin?.marketplace === m.name;
      setText(q(row, '.ft-cz-row-name'), o.name);
      setText(q(row, '.ft-cz-row-desc'), o.description);
      setText(q(row, '.ft-cz-row-meta'), [m.name, o.version && `v${o.version}`, o.category].filter(Boolean).join(' · '));
      const get = q<HTMLButtonElement>(row, '.ft-pl-get');
      const label = here ? (o.update ? 'Update' : 'Added') : have ? 'Replace' : 'Add';
      setText(get, label);
      if (get.disabled !== (label === 'Added')) get.disabled = label === 'Added';
      setAttr(get, 'title', have && !here ? `A plugin named ${o.name} is already installed; adding this one replaces it` : null);
      if (box.children[i] !== row) box.insertBefore(row, box.children[i] ?? null);
    });
    const none = q(this.root, '.ft-pl-nooffers');
    const empty = this.state.marketplaces.length === 0;
    if (none.hidden !== !empty) none.hidden = !empty;
    const head = q(this.root, '.ft-pl-mhead');
    if (head.hidden !== empty) head.hidden = empty;
    const mbox = q(this.root, '.ft-pl-markets');
    const names = new Set(this.state.marketplaces.map((m) => m.name));
    for (const [k, r] of this.marketRows) if (!names.has(k)) { r.remove(); this.marketRows.delete(k); }
    this.state.marketplaces.forEach((m, i) => {
      let row = this.marketRows.get(m.name);
      if (!row) {
        row = el(`<div class="ft-cz-row ft-pl-market" role="listitem"><span class="ft-cz-icon">${ui('folder', 16)}</span><span class="ft-cz-text"><span class="ft-cz-row-name"></span><span class="ft-cz-row-desc"></span></span><button type="button" class="ft-icon-btn ft-pl-mmore" data-menu-anchor aria-label="More actions" title="More actions">${ui('more', 16)}</button><span class="ft-pl-mactions"><label class="ft-field ft-check ft-switch-label ft-pl-sync" title="Check for updates every hour"><input type="checkbox" role="switch" class="ft-switch"><span>Sync automatically</span></label><button type="button" class="ft-btn ft-pl-check">Check for updates</button><button type="button" class="ft-btn ft-danger-btn ft-pl-mremove" hidden>Remove with its plugins?</button></span></div>`);
        row.dataset.market = m.name;
        this.marketRows.set(m.name, row);
      }
      setText(q(row, '.ft-cz-row-name'), m.name);
      setText(q(row, '.ft-cz-row-desc'), m.error ? `Last check failed: ${m.error}` : `${m.plugins.length} plugin${m.plugins.length === 1 ? '' : 's'} · ${m.source}`);
      row.classList.toggle('is-error', !!m.error);
      const sync = q(row, '.ft-pl-sync');
      if (sync.hidden !== (m.kind !== 'git')) sync.hidden = m.kind !== 'git';
      const box2 = q<HTMLInputElement>(sync, 'input');
      if (box2.checked !== m.sync) box2.checked = m.sync;
      if (mbox.children[i] !== row) mbox.insertBefore(row, mbox.children[i] ?? null);
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
    setText(q(this.root, '.ft-pl-by'), [p.version && `Version ${p.version}`, p.author && `by ${p.author}`, p.origin?.kind === 'marketplace' ? `from the ${p.origin.marketplace} marketplace` : p.origin?.kind === 'created' ? 'created in FormAT' : 'uploaded'].filter(Boolean).join(' · '));
    setText(q(this.root, '.ft-pl-desc'), p.description);
    const on = q<HTMLInputElement>(this.root, '.ft-pl-on');
    if (on.checked !== p.enabled) on.checked = p.enabled;
    const cmds = new Set(p.commandSkills ?? []);
    const skillNames = p.skills.filter((s) => !cmds.has(s));
    const servers = p.servers ?? p.connectors.map((c) => ({ name: c.name, kind: 'command' as const, target: '', connectorId: c.id, state: 'not_connected' as const }));
    const agents = p.agents ?? [];
    const fill = (sel: string, html: string): void => { const box = q(this.root, sel); if (box.dataset.v !== html) { box.dataset.v = html; box.innerHTML = html; } };
    const none = (sel: string, empty: boolean): void => { const n = q(this.root, sel); if (n.hidden !== !empty) n.hidden = !empty; };
    fill('.ft-pl-skills', skillNames.map((s) => `<button type="button" class="ft-chip ft-cz-file" data-skill-link="${esc(s)}">${ui('skills', 12)} ${esc(s)}</button>`).join(''));
    fill('.ft-pl-cmds', [...cmds].map((s) => `<button type="button" class="ft-chip ft-cz-file" data-skill-link="${esc(s)}">/${esc(s)}</button>`).join(''));
    fill('.ft-pl-agents', agents.map((a) => `<span class="ft-chip ft-cz-file">${esc(a)}</span>`).join(''));
    const word: Record<string, string> = { connected: 'Connected', not_connected: 'Not connected', not_added: 'Not added' };
    const cbox = q(this.root, '.ft-pl-conns');
    const ckey = servers.map((s) => s.name).join('\n');
    if (cbox.dataset.v !== ckey) {
      cbox.dataset.v = ckey;
      cbox.innerHTML = servers.map((s) => `<div class="ft-cz-row ft-pl-srv" role="listitem" data-srv="${esc(s.name)}"><span class="ft-cz-icon">${ui('plug', 16)}</span><button type="button" class="ft-cz-text"><span class="ft-cz-row-name">${esc(s.name)}</span><span class="ft-cz-row-desc"></span></button><span class="ft-pl-srvstate"><button type="button" class="ft-btn ft-pl-srvadd">Add</button><button type="button" class="ft-btn ft-pl-srvconnect">Connect</button><span class="ft-cn-chip"></span></span></div>`).join('');
    }
    servers.forEach((s0) => {
      const row = cbox.querySelector<HTMLElement>(`[data-srv="${CSS.escape(s0.name)}"]`);
      if (!row) return;
      const live = this.state.connectors.find((x) => x.id === s0.connectorId);
      const s = { ...s0, state: !live ? 'not_added' as const : live.enabled && live.status === 'connected' ? 'connected' as const : 'not_connected' as const };
      setText(q(row, '.ft-cz-row-desc'), s.target ? `${s.kind === 'url' ? 'URL' : 'Command'}: ${s.target}` : '');
      const chip = q(row, '.ft-cn-chip');
      setText(chip, word[s.state] ?? s.state);
      if (chip.dataset.s !== s.state) chip.dataset.s = s.state === 'connected' ? 'connected' : s.state;
      const add = q<HTMLButtonElement>(row, '.ft-pl-srvadd');
      if (add.hidden !== (s.state !== 'not_added')) add.hidden = s.state !== 'not_added';
      const conn = q<HTMLButtonElement>(row, '.ft-pl-srvconnect');
      if (conn.hidden !== (s.state !== 'not_connected')) conn.hidden = s.state !== 'not_connected';
    });
    none('.ft-pl-noskills', !skillNames.length);
    none('.ft-pl-nocmds', !cmds.size);
    none('.ft-pl-noconns', !servers.length);
    none('.ft-pl-noagents', !agents.length);
    setText(q(this.root, '.ft-pl-agentnote'), `Agents run in Cowork and Claude Code; FormAT lists them but does not run them in chat.${p.hooks ? ' This plugin also has hooks, kept but not run.' : ''}`);
    const counts: Record<string, number> = { skills: skillNames.length, commands: cmds.size, connectors: servers.length, agents: agents.length };
    for (const [k, n] of Object.entries(counts)) setText(q(this.root, `[data-plcount="${k}"]`), n ? String(n) : '');
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
      needed: 'FormAT connects without credentials and asks you to sign in when the server asks for it.',
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
    this.root.querySelectorAll<HTMLElement>('.ft-cn-view').forEach((b) => b.addEventListener('click', () => this.setConnectorView(b.dataset.cnv ?? 'yours')));
    q(this.root, '.ft-cn-cats').addEventListener('click', (e) => {
      const b = (e.target as HTMLElement).closest<HTMLElement>('.ft-cn-cat');
      if (!b) return;
      this.dirCat = b.dataset.cat ?? '';
      this.renderDirectory();
    });
    q(this.root, '.ft-cn-dir').addEventListener('click', async (e) => {
      const t = e.target as HTMLElement;
      const d = this.directory.find((x) => x.url === t.closest<HTMLElement>('[data-dir]')?.dataset.dir);
      if (!d || !t.closest('.ft-cn-dirget')) return;
      const msg = q(this.root, '.ft-cn-msg');
      const taken = new Set(this.state.connectors.map((c) => c.name));
      let name = d.name.toLowerCase().replace(/[^a-z0-9_-]+/g, '-').replace(/^-+|-+$/g, '').slice(0, 40) || 'connector';
      for (let n = 2; taken.has(name); n += 1) name = `${name.slice(0, 36)}-${n}`;
      if (d.auth === 'token') {
        this.setConnectorView('yours');
        if (form.hidden) form.hidden = false;
        q<HTMLInputElement>(form, '[data-c=name]').value = name;
        q<HTMLInputElement>(form, '[data-c=url]').value = d.url;
        form.querySelector<HTMLInputElement>('input[name=ft-cn-auth][value=none]')?.click();
        setText(msg, `${d.name} needs a key: add it as the access token or a request header, then Add and connect.`);
        q<HTMLInputElement>(form, '[data-c=token]').focus();
        return;
      }
      const tab = d.auth === 'oauth' ? window.open('', '_blank') : null;
      try {
        const c = await run<{ id: string; name: string }>('connector.add', { name, url: d.url, auth: d.auth === 'oauth' ? 'now' : 'none', ...(d.transport === 'sse' ? { transport: 'sse' } : {}) });
        if (d.auth === 'oauth') {
          const r = await run<{ url: string }>('connector.signin', { id: c.id });
          if (tab) { tab.opener = null; tab.location.href = r.url; } else window.open(r.url, '_blank', 'noopener');
          setText(msg, `Sign in to ${d.name} on the page that opened, then come back here.`);
        } else {
          tab?.close();
          const done = await run<{ status: string; error: string }>('connector.connect', { id: c.id });
          setText(msg, done.status === 'connected' ? `${d.name} is connected.` : `${d.name} was added but did not connect: ${done.error}`);
        }
      } catch (err) {
        tab?.close();
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
      { label: 'Remove', desc: 'Delete this connector from FormAT', icon: 'trash', action: () => { const del = q<HTMLButtonElement>(this.root, '.ft-cn-delete'); if (del.hidden) del.hidden = false; del.focus(); } },
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
      setAttr(badge, 'title', c.route === 'api' ? 'Claude reaches this server through Anthropic\'s MCP connector' : 'FormAT\'s engine runs this server\'s tools; they ask before running in Ask mode');
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
    const how = c.auth && c.auth !== 'none' ? ` · ${c.signedIn ? 'signed in' : 'sign-in'} with ${c.oauthClient === 'own' ? 'your OAuth client' : 'a client FormAT registered'}` : c.hasToken ? ' · with a token' : '';
    setText(q(this.root, '.ft-cn-where'), `${c.kind === 'url' ? c.url : c.command}${how}${c.transport === 'sse' ? ' · SSE' : ''} · ${c.route === 'api' ? 'through Anthropic\'s MCP connector' : 'run by FormAT\'s engine'}`);
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
      ? 'A tool needs approval, so FormAT runs this server itself and the approval card waits for you; with every tool on Always allow or Blocked, Claude reaches it through Anthropic again.'
      : c.route === 'api' ? 'Claude reaches this server through Anthropic\'s MCP connector. Set a tool to Needs approval to have FormAT run the server and ask before each use.'
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
      official: el(`<div class="ft-cz-group" data-group="official" role="presentation">From Anthropic and partners</div>`),
      market: el(`<div class="ft-cz-group" data-group="market" role="presentation">From marketplaces</div>`),
      plugin: el(`<div class="ft-cz-group" data-group="plugin" role="presentation">From plugins</div>`),
    });
    const groupOf = (s: SkillSummary): 'own' | 'official' | 'market' | 'plugin' => (s.plugin ? 'plugin' : s.source?.official ? 'official' : s.source?.marketplace ? 'market' : 'own');
    const order = ['own', 'official', 'market', 'plugin'];
    const seq: HTMLElement[] = [];
    [...items].sort((a, b) => order.indexOf(groupOf(a)) - order.indexOf(groupOf(b))).forEach((s) => {
      const group = groupOf(s);
      if (!seq.some((n) => n.dataset.group === group)) seq.push(heads[group]);
      let row = this.rows.get(s.name);
      if (!row) {
        row = el(`<div class="ft-cz-row" role="listitem" data-skill="${esc(s.name)}"><span class="ft-cz-icon">${ui('skills', 16)}</span><button type="button" class="ft-cz-text"><span class="ft-cz-row-name"></span><span class="ft-cz-row-desc"></span></button><span class="ft-cz-row-meta"></span><label class="ft-cz-toggle" title="Enabled"><input type="checkbox" role="switch" class="ft-switch" aria-label="Skill enabled"></label></div>`);
        this.rows.set(s.name, row);
      }
      setText(q(row, '.ft-cz-row-name'), s.name);
      setText(q(row, '.ft-cz-row-desc'), s.description);
      setText(q(row, '.ft-cz-row-meta'), `${s.plugin ? `${s.plugin} · ` : s.source?.marketplace ? `${s.source.marketplace} · ` : ''}${s.files} file${s.files === 1 ? '' : 's'}`);
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
      const res = await fetch('/api/uploads', { method: 'POST', body: form, headers: keyHeaders() });
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
    const edit = q<HTMLButtonElement>(this.root, '.ft-cz-edit');
    if (edit.hidden !== !!s.plugin) edit.hidden = !!s.plugin;
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
