import { run } from '../engine-client/api';
import type { AppState, ConnectorInfo, FileInfo, SkillSummary } from '../state/app-state';
import { el, esc, q, setAttr, setText } from './dom';
import { ui } from './icons-ft';
import { renderMarkdown } from './markdown';

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
  private current: SkillDetail | null = null;
  private seq = 0;

  constructor(private state: AppState) {
    this.root = el(`<section class="ft-page ft-customize" data-view="customize" hidden>
      <div class="ft-cz-main">
        <header class="ft-proj-head"><h1>Customize</h1></header>
        <section class="ft-cz-section">
          <div class="ft-cz-section-head"><h2>${ui('skills', 16)}<span>Skills</span></h2>
            <div class="ft-cz-actions"><button type="button" class="ft-btn ft-cz-upload">${ui('paperclip', 14)}<span>Add from a file</span></button><button type="button" class="ft-btn ft-cz-write">${ui('pencil', 14)}<span>Write a skill</span></button></div></div>
          <p class="ft-set-note">A skill is a folder of instructions, with a SKILL.md whose name and description tell Claude when to use it. Claude sees every skill that is on and loads one when a task matches it; you can also pick one from the + menu. Add a .zip of a skill folder or a SKILL.md, or write one here.</p>
          <span class="ft-proj-msg ft-cz-msg" aria-live="polite"></span>
          <div class="ft-proj-form ft-cz-form" hidden>
            <label class="ft-field"><span>Name</span><input class="ft-input" data-f="name" maxlength="64" placeholder="lowercase-with-hyphens"></label>
            <label class="ft-field"><span>Description: when should Claude use it?</span><textarea class="ft-input" data-f="description" rows="2" maxlength="1024" placeholder="For example: Use when the person asks for release notes"></textarea></label>
            <label class="ft-field"><span>Instructions</span><textarea class="ft-input" data-f="instructions" rows="8" placeholder="What Claude should do, step by step, in Markdown"></textarea></label>
            <div class="ft-set-actions"><button type="button" class="ft-btn ft-btn-primary ft-cz-create">Save skill</button><button type="button" class="ft-btn ft-cz-cancel">Cancel</button></div>
          </div>
          <div class="ft-cz-list" role="list"></div>
          <div class="ft-page-empty ft-cz-empty" hidden>${ui('skills', 28)}<p>No skills yet.</p></div>
          <input type="file" class="ft-cz-picker" accept=".zip,.md" hidden>
        </section>
        <section class="ft-cz-section ft-cn-section">
          <div class="ft-cz-section-head"><h2>${ui('plug', 16)}<span>Connectors</span></h2>
            <div class="ft-cz-actions"><button type="button" class="ft-btn ft-cn-addopen">${ui('plus', 14)}<span>Add connector</span></button></div></div>
          <p class="ft-set-note">A connector is an MCP server that gives Claude more tools. A public https URL goes to Claude through Anthropic's MCP connector; a server on this computer or your network, or one started by a command, runs in Format's engine, and its tools ask before they run in Ask mode. Turn single tools off in a connector's page.</p>
          <span class="ft-proj-msg ft-cn-msg" aria-live="polite"></span>
          <div class="ft-proj-form ft-cn-form" hidden>
            <label class="ft-field"><span>Name</span><input class="ft-input" data-c="name" maxlength="40" placeholder="lowercase, for example docs or github"></label>
            <div class="ft-cn-kind" role="radiogroup" aria-label="Kind"><label class="ft-field ft-check"><input type="radio" name="ft-cn-kind" value="url" checked><span>By URL</span></label><label class="ft-field ft-check"><input type="radio" name="ft-cn-kind" value="command"><span>By command (a local server)</span></label></div>
            <label class="ft-field ft-cn-url"><span>Server URL</span><input class="ft-input" data-c="url" placeholder="https://example.com/mcp" spellcheck="false"></label>
            <label class="ft-field ft-cn-token"><span>Token (optional)</span><input class="ft-input" data-c="token" type="password" autocomplete="off" placeholder="Bearer token, if the server needs one"></label>
            <label class="ft-field ft-cn-cmd" hidden><span>Command</span><input class="ft-input" data-c="command" placeholder="npx -y @modelcontextprotocol/server-filesystem ~/notes" spellcheck="false"></label>
            <div class="ft-set-actions"><button type="button" class="ft-btn ft-btn-primary ft-cn-add">Add and connect</button><button type="button" class="ft-btn ft-cn-cancel">Cancel</button></div>
          </div>
          <div class="ft-cz-list ft-cn-list" role="list"></div>
          <p class="ft-proj-none ft-cn-empty">No connectors yet.</p>
        </section>
      </div>
      <div class="ft-cz-detail" hidden>
        <button type="button" class="ft-text-btn ft-cz-back">${ui('back', 14)}<span>Customize</span></button>
        <div class="ft-cz-detail-head"><h1 class="ft-cz-name"></h1><label class="ft-field ft-check"><input type="checkbox" class="ft-cz-on"><span>On</span></label><button type="button" class="ft-btn ft-cz-delete">Delete skill</button></div>
        <p class="ft-cz-desc"></p>
        <div class="ft-cz-files"></div>
        <div class="ft-md ft-cz-body"></div>
      </div>
      <div class="ft-cz-detail ft-cn-detail" hidden>
        <button type="button" class="ft-text-btn ft-cn-back">${ui('back', 14)}<span>Customize</span></button>
        <div class="ft-cz-detail-head"><h1 class="ft-cz-name ft-cn-name"></h1><label class="ft-field ft-check"><input type="checkbox" class="ft-cn-on"><span>On</span></label><button type="button" class="ft-btn ft-cn-reconnect">Reconnect</button><button type="button" class="ft-btn ft-cn-delete">Remove</button></div>
        <p class="ft-cz-desc ft-cn-where"></p>
        <p class="ft-cn-state"></p>
        <h2 class="ft-proj-sub">Tools</h2>
        <div class="ft-cn-tools" role="list"></div>
        <p class="ft-proj-none ft-cn-notools">No tools listed yet. Reconnect to list them.</p>
      </div>
    </section>`);
    this.main = q(this.root, '.ft-cz-main');
    this.list = q(this.root, '.ft-cz-list');
    this.empty = q(this.root, '.ft-cz-empty');
    this.msg = q(this.root, '.ft-cz-msg');
    this.writeForm = q(this.root, '.ft-cz-form');
    this.detail = q(this.root, '.ft-cz-detail');
    this.picker = q<HTMLInputElement>(this.root, '.ft-cz-picker');
    q(this.root, '.ft-cz-upload').addEventListener('click', () => this.picker.click());
    this.picker.addEventListener('change', () => { const f = this.picker.files?.[0]; this.picker.value = ''; if (f) void this.upload(f); });
    q(this.root, '.ft-cz-write').addEventListener('click', () => { this.writeForm.hidden = false; q<HTMLInputElement>(this.writeForm, '[data-f=name]').focus(); });
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
    q(this.root, '.ft-cz-delete').addEventListener('click', (e) => void this.remove(e.currentTarget as HTMLButtonElement));
    this.root.addEventListener('dragover', (e) => e.preventDefault());
    this.root.addEventListener('drop', (e) => { e.preventDefault(); const f = e.dataTransfer?.files?.[0]; if (f) void this.upload(f); });
    state.on('skills', () => this.render());
    this.cnDetail = q(this.root, '.ft-cn-detail');
    this.wireConnectors();
    state.on('connectors', () => this.renderConnectors());
  }

  private cnDetail: HTMLElement;
  private cnRows = new Map<string, HTMLElement>();
  private cnOpen: string | null = null;

  private wireConnectors(): void {
    const form = q(this.root, '.ft-cn-form');
    const kind = () => (form.querySelector<HTMLInputElement>('input[name=ft-cn-kind]:checked')?.value ?? 'url');
    const syncKind = () => {
      const url = kind() === 'url';
      for (const [sel, hide] of [['.ft-cn-url', !url], ['.ft-cn-token', !url], ['.ft-cn-cmd', url]] as const) {
        const node = q(form, sel);
        if (node.hidden !== hide) node.hidden = hide;
      }
    };
    form.addEventListener('change', (e) => { if ((e.target as HTMLInputElement).name === 'ft-cn-kind') syncKind(); });
    q(this.root, '.ft-cn-addopen').addEventListener('click', () => { form.hidden = false; q<HTMLInputElement>(form, '[data-c=name]').focus(); });
    q(this.root, '.ft-cn-cancel').addEventListener('click', () => { form.hidden = true; });
    q(this.root, '.ft-cn-add').addEventListener('click', async () => {
      const get = (k: string) => q<HTMLInputElement>(form, `[data-c=${k}]`).value.trim();
      const params = kind() === 'url' ? { name: get('name').toLowerCase(), url: get('url'), token: get('token') } : { name: get('name').toLowerCase(), command: get('command') };
      const msg = q(this.root, '.ft-cn-msg');
      try {
        const c = await run<{ id: string; name: string }>('connector.add', params);
        form.hidden = true;
        form.querySelectorAll<HTMLInputElement>('[data-c]').forEach((x) => { x.value = ''; });
        setText(msg, `Connecting ${c.name}`);
        const done = await run<{ status: string; error: string; tools: unknown[] }>('connector.connect', { id: c.id });
        setText(msg, done.status === 'connected' ? `${c.name} is connected with ${done.tools.length} tools.` : `${c.name} was added but did not connect: ${done.error}`);
      } catch (err) {
        setText(msg, err instanceof Error ? err.message : String(err));
      }
    });
    const list = q(this.root, '.ft-cn-list');
    list.addEventListener('click', (e) => {
      const t = e.target as HTMLElement;
      const id = t.closest<HTMLElement>('[data-cn]')?.dataset.cn;
      if (id && !t.closest('.ft-cz-toggle')) this.openConnector(id);
    });
    list.addEventListener('change', (e) => {
      const box = (e.target as HTMLElement).closest<HTMLInputElement>('.ft-cz-toggle input');
      const id = box?.closest<HTMLElement>('[data-cn]')?.dataset.cn;
      if (box && id) void run('connector.update', { id, enabled: box.checked }).catch(() => undefined);
    });
    q(this.root, '.ft-cn-back').addEventListener('click', () => this.showList());
    q<HTMLInputElement>(this.root, '.ft-cn-on').addEventListener('change', (e) => {
      if (this.cnOpen) void run('connector.update', { id: this.cnOpen, enabled: (e.target as HTMLInputElement).checked }).catch(() => undefined);
    });
    q(this.root, '.ft-cn-reconnect').addEventListener('click', () => { if (this.cnOpen) void run('connector.connect', { id: this.cnOpen }).catch(() => undefined); });
    q(this.root, '.ft-cn-delete').addEventListener('click', async (e) => {
      const btn = e.currentTarget as HTMLButtonElement;
      if (!this.cnOpen) return;
      if (!btn.dataset.armed) { btn.dataset.armed = '1'; btn.textContent = 'Remove? Claude loses its tools'; return; }
      await run('connector.delete', { id: this.cnOpen }).catch(() => undefined);
    });
    q(this.root, '.ft-cn-tools').addEventListener('change', (e) => {
      const box = e.target as HTMLInputElement;
      const c = this.state.connectors.find((x) => x.id === this.cnOpen);
      if (!c || !box.dataset.tool) return;
      const off = new Set(c.tools.filter((t) => !t.enabled).map((t) => t.name));
      if (box.checked) off.delete(box.dataset.tool); else off.add(box.dataset.tool);
      void run('connector.update', { id: c.id, disabledTools: [...off] }).catch(() => undefined);
    });
  }

  private stateText(c: ConnectorInfo): string {
    if (!c.enabled) return 'Off';
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
        row = el(`<div class="ft-cz-row" role="listitem" data-cn="${esc(c.id)}"><span class="ft-cz-icon">${ui('plug', 16)}</span><button type="button" class="ft-cz-text"><span class="ft-cz-row-name"></span><span class="ft-cz-row-desc"></span></button><span class="ft-cn-badge"></span><label class="ft-cz-toggle" title="On or off"><input type="checkbox" aria-label="Connector on"></label></div>`);
        this.cnRows.set(c.id, row);
      }
      setText(q(row, '.ft-cz-row-name'), c.name);
      setText(q(row, '.ft-cz-row-desc'), `${this.stateText(c)} · ${c.kind === 'url' ? c.url : c.command}`);
      setText(q(row, '.ft-cn-badge'), c.route === 'api' ? 'Anthropic' : 'Engine');
      const badge = q(row, '.ft-cn-badge');
      if (badge.dataset.s !== c.status) badge.dataset.s = c.status;
      setAttr(badge, 'title', c.route === 'api' ? 'Claude reaches this server through Anthropic\'s MCP connector' : 'Format\'s engine runs this server\'s tools; they ask before running in Ask mode');
      const box = q<HTMLInputElement>(row, '.ft-cz-toggle input');
      if (box.checked !== c.enabled) box.checked = c.enabled;
      row.classList.toggle('is-off', !c.enabled);
      row.classList.toggle('is-error', c.status === 'error' && c.route === 'local');
      if (list.children[i] !== row) list.insertBefore(row, list.children[i] ?? null);
    });
    const empty = q(this.root, '.ft-cn-empty');
    if (empty.hidden !== items.length > 0) empty.hidden = items.length > 0;
    if (this.cnOpen) {
      if (!live.has(this.cnOpen)) this.showList();
      else this.paintConnector();
    }
  }

  private openConnector(id: string): void {
    this.cnOpen = id;
    const del = q<HTMLButtonElement>(this.root, '.ft-cn-delete');
    if (del.dataset.armed) { delete del.dataset.armed; del.textContent = 'Remove'; }
    this.paintConnector();
    if (!this.main.hidden) this.main.hidden = true;
    if (!this.detail.hidden) this.detail.hidden = true;
    if (this.cnDetail.hidden) this.cnDetail.hidden = false;
  }

  private paintConnector(): void {
    const c = this.state.connectors.find((x) => x.id === this.cnOpen);
    if (!c) return;
    setText(q(this.root, '.ft-cn-name'), c.name);
    setText(q(this.root, '.ft-cn-where'), `${c.kind === 'url' ? c.url : c.command}${c.hasToken ? ' · with a token' : ''} · ${c.route === 'api' ? 'through Anthropic\'s MCP connector' : 'run by Format\'s engine'}`);
    const st = q(this.root, '.ft-cn-state');
    setText(st, c.status !== 'error' ? this.stateText(c) : c.route === 'api'
      ? `Its tools could not be listed from this computer (${c.error}); Claude still reaches the server through Anthropic.` : `Last connection failed: ${c.error}`);
    st.classList.toggle('is-error', c.status === 'error');
    const on = q<HTMLInputElement>(this.root, '.ft-cn-on');
    if (on.checked !== c.enabled) on.checked = c.enabled;
    const box = q(this.root, '.ft-cn-tools');
    const key = JSON.stringify(c.tools.map((t) => t.name));
    if (box.dataset.v !== `${c.id}:${key}`) {
      box.dataset.v = `${c.id}:${key}`;
      box.innerHTML = c.tools.map((t) => `<label class="ft-cn-tool" role="listitem"><input type="checkbox" data-tool="${esc(t.name)}"><span><b>${esc(t.name)}</b><small>${esc(t.description)}</small></span></label>`).join('');
    }
    c.tools.forEach((t) => {
      const input = box.querySelector<HTMLInputElement>(`input[data-tool="${CSS.escape(t.name)}"]`);
      if (input && input.checked !== t.enabled) input.checked = t.enabled;
    });
    const none = q(this.root, '.ft-cn-notools');
    if (none.hidden !== c.tools.length > 0) none.hidden = c.tools.length > 0;
  }

  private say(text: string): void {
    setText(this.msg, text);
  }

  render(): void {
    const items = this.state.skills;
    const live = new Set(items.map((s) => s.name));
    for (const [n, r] of this.rows) if (!live.has(n)) { r.remove(); this.rows.delete(n); }
    items.forEach((s, i) => {
      let row = this.rows.get(s.name);
      if (!row) {
        row = el(`<div class="ft-cz-row" role="listitem" data-skill="${esc(s.name)}"><span class="ft-cz-icon">${ui('skills', 16)}</span><button type="button" class="ft-cz-text"><span class="ft-cz-row-name"></span><span class="ft-cz-row-desc"></span></button><span class="ft-cz-row-meta"></span><label class="ft-cz-toggle" title="On or off"><input type="checkbox" aria-label="Skill on"></label></div>`);
        this.rows.set(s.name, row);
      }
      setText(q(row, '.ft-cz-row-name'), s.name);
      setText(q(row, '.ft-cz-row-desc'), s.description);
      setText(q(row, '.ft-cz-row-meta'), `${s.files} file${s.files === 1 ? '' : 's'}`);
      const box = q<HTMLInputElement>(row, '.ft-cz-toggle input');
      if (box.checked !== s.enabled) box.checked = s.enabled;
      row.classList.toggle('is-off', !s.enabled);
      if (this.list.children[i] !== row) this.list.insertBefore(row, this.list.children[i] ?? null);
    });
    if (this.empty.hidden !== items.length > 0) this.empty.hidden = items.length > 0;
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
    const files = s.fileList.map((f) => `<span class="ft-chip ft-cz-file">${ui('file', 12)} ${esc(f)}</span>`).join('');
    const fbox = q(this.root, '.ft-cz-files');
    if (fbox.dataset.v !== files) { fbox.dataset.v = files; fbox.innerHTML = files; }
    const body = s.skillMd.replace(/^---\s*\n[\s\S]*?\n---\s*\n?/, '');
    const box = q(this.root, '.ft-cz-body');
    if (box.dataset.v !== body) { box.dataset.v = body; box.innerHTML = renderMarkdown(body); }
    const del = q<HTMLButtonElement>(this.root, '.ft-cz-delete');
    if (del.dataset.armed) { delete del.dataset.armed; del.textContent = 'Delete skill'; }
    if (!this.main.hidden) this.main.hidden = true;
    if (!this.cnDetail.hidden) this.cnDetail.hidden = true;
    if (this.detail.hidden) this.detail.hidden = false;
  }

  showList(): void {
    ++this.seq;
    this.current = null;
    this.cnOpen = null;
    if (!this.detail.hidden) this.detail.hidden = true;
    if (!this.cnDetail.hidden) this.cnDetail.hidden = true;
    if (this.main.hidden) this.main.hidden = false;
  }

  private async remove(btn: HTMLButtonElement): Promise<void> {
    if (!this.current) return;
    if (!btn.dataset.armed) {
      btn.dataset.armed = '1';
      btn.textContent = 'Delete? This cannot be undone';
      setAttr(btn, 'aria-label', 'Confirm deleting the skill');
      return;
    }
    try { await run('skill.delete', { name: this.current.name }); } catch (err) { this.say(err instanceof Error ? err.message : String(err)); }
  }
}
