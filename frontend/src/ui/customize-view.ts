import { run } from '../engine-client/api';
import type { AppState, FileInfo, SkillSummary } from '../state/app-state';
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
        <section class="ft-cz-section">
          <div class="ft-cz-section-head"><h2>${ui('plug', 16)}<span>Connectors</span></h2></div>
          <p class="ft-set-note">MCP servers by URL and local ones bridged, with Connect, Reconnect and per-tool approval, arrive in v0.6.2.</p>
        </section>
      </div>
      <div class="ft-cz-detail" hidden>
        <button type="button" class="ft-text-btn ft-cz-back">${ui('back', 14)}<span>Customize</span></button>
        <div class="ft-cz-detail-head"><h1 class="ft-cz-name"></h1><label class="ft-field ft-check"><input type="checkbox" class="ft-cz-on"><span>On</span></label><button type="button" class="ft-btn ft-cz-delete">Delete skill</button></div>
        <p class="ft-cz-desc"></p>
        <div class="ft-cz-files"></div>
        <div class="ft-md ft-cz-body"></div>
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
    if (this.detail.hidden) this.detail.hidden = false;
  }

  showList(): void {
    ++this.seq;
    this.current = null;
    if (!this.detail.hidden) this.detail.hidden = true;
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
