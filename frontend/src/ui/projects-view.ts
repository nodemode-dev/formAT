import { run } from '../engine-client/api';
import { keyHeaders } from '../engine-client/window-key';
import type { AppState, FileInfo, ProjectDetail, ProjectSummary } from '../state/app-state';
import { askDeleteProject } from './confirm';
import { el, esc, q, setAttr, setText } from './dom';
import { ui } from './icons-ft';

export interface ProjectsHooks {
  openChat(id: string): void;
  newChatIn(projectId: string): void;
}

function when(ts: number): string {
  const d = new Date(ts * 1000);
  const today = new Date();
  return d.toDateString() === today.toDateString() ? d.toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' })
    : d.toLocaleDateString([], { month: 'short', day: 'numeric', year: d.getFullYear() === today.getFullYear() ? undefined : 'numeric' });
}

function size(n: number): string {
  return n < 1024 ? `${n} B` : n < 1024 * 1024 ? `${(n / 1024).toFixed(1)} KB` : `${(n / 1024 / 1024).toFixed(1)} MB`;
}

export class ProjectsView {
  readonly root: HTMLElement;
  private listMode: HTMLElement;
  private grid: HTMLElement;
  private empty: HTMLElement;
  private createForm: HTMLElement;
  private detail: HTMLElement;
  private editForm: HTMLElement;
  private instr: HTMLTextAreaElement;
  private instrMsg: HTMLElement;
  private toast: HTMLElement;
  private toastTimer = 0;
  private files: HTMLElement;
  private chats: HTMLElement;
  private picker: HTMLInputElement;
  private current: ProjectDetail | null = null;
  private seq = 0;
  private uploads: string[] = [];
  private dirty = false;
  private tiles = new Map<string, HTMLElement>();
  private chatRows = new Map<string, HTMLElement>();

  constructor(private state: AppState, private hooks: ProjectsHooks) {
    this.root = el(`<section class="ft-page ft-projects" data-view="projects" hidden>
      <div class="ft-proj-toast-wrap"><p class="ft-proj-toast" role="alert" hidden></p></div>
      <div class="ft-proj-list">
        <header class="ft-proj-head"><h1>Projects</h1><button type="button" class="ft-btn ft-btn-primary ft-proj-new">${ui('plus', 16)}<span>New project</span></button></header>
        <div class="ft-proj-form ft-proj-create" hidden>
          <label class="ft-field"><span>Name</span><input class="ft-input" data-f="name" maxlength="120" placeholder="What is this project about?"></label>
          <label class="ft-field"><span>Description</span><textarea class="ft-input" data-f="description" rows="2" maxlength="2000" placeholder="Optional; for you, not sent to Claude"></textarea></label>
          <div class="ft-set-actions"><button type="button" class="ft-btn ft-btn-primary ft-proj-create-go">Create project</button><button type="button" class="ft-btn ft-proj-create-cancel">Cancel</button><span class="ft-proj-msg" aria-live="polite"></span></div>
        </div>
        <div class="ft-proj-grid" role="list" hidden></div>
        <div class="ft-page-empty" hidden>${ui('projects', 28)}<p>Projects keep instructions, knowledge files and their chats together. Every chat in a project receives its instructions and files.</p></div>
      </div>
      <div class="ft-proj-detail" hidden>
        <button type="button" class="ft-text-btn ft-proj-back">${ui('back', 14)}<span>All projects</span></button>
        <div class="ft-proj-cols">
          <div class="ft-proj-main">
            <h1 class="ft-proj-name"></h1>
            <p class="ft-proj-desc"></p>
            <div class="ft-proj-form ft-proj-edit" hidden>
              <label class="ft-field"><span>Name</span><input class="ft-input" data-f="name" maxlength="120"></label>
              <label class="ft-field"><span>Description</span><textarea class="ft-input" data-f="description" rows="2" maxlength="2000"></textarea></label>
              <div class="ft-set-actions"><button type="button" class="ft-btn ft-btn-primary ft-proj-edit-go">Save</button><button type="button" class="ft-btn ft-proj-edit-cancel">Cancel</button></div>
            </div>
            <div class="ft-proj-actions"><button type="button" class="ft-btn ft-btn-primary ft-proj-chat">${ui('plus', 16)}<span>New chat in this project</span></button><button type="button" class="ft-btn ft-proj-edit-open">Edit details</button><button type="button" class="ft-btn ft-proj-delete">Delete project</button></div>
            <h2 class="ft-proj-sub">Chats</h2>
            <div class="ft-proj-chats" role="list"></div>
            <p class="ft-proj-none ft-proj-chats-none">No chats yet. Start one, or move a chat here from its title menu.</p>
          </div>
          <aside class="ft-proj-side">
            <section class="ft-proj-card">
              <h2 class="ft-proj-sub">Instructions</h2>
              <textarea class="ft-input ft-proj-instr" rows="7" maxlength="20000" placeholder="How Claude should work in this project: tone, format, what to assume"></textarea>
              <div class="ft-set-actions"><button type="button" class="ft-btn ft-proj-instr-save">Save instructions</button><span class="ft-proj-msg ft-proj-instr-msg" aria-live="polite"></span></div>
            </section>
            <section class="ft-proj-card">
              <div class="ft-proj-files-head"><h2 class="ft-proj-sub">Files</h2><button type="button" class="ft-text-btn ft-proj-add">${ui('plus', 14)}<span>Add files</span></button></div>
              <ul class="ft-proj-files"></ul>
              <p class="ft-proj-none ft-proj-files-none">Files here go to Claude at the start of every chat in the project: text inline, images and PDFs as pages.</p>
              <input type="file" class="ft-proj-picker" multiple hidden>
            </section>
          </aside>
        </div>
      </div>
    </section>`);
    this.listMode = q(this.root, '.ft-proj-list');
    this.grid = q(this.root, '.ft-proj-grid');
    this.empty = q(this.listMode, '.ft-page-empty');
    this.createForm = q(this.root, '.ft-proj-create');
    this.detail = q(this.root, '.ft-proj-detail');
    this.editForm = q(this.root, '.ft-proj-edit');
    this.instr = q<HTMLTextAreaElement>(this.root, '.ft-proj-instr');
    this.instrMsg = q(this.root, '.ft-proj-instr-msg');
    this.toast = q(this.root, '.ft-proj-toast');
    this.files = q(this.root, '.ft-proj-files');
    this.chats = q(this.root, '.ft-proj-chats');
    this.picker = q<HTMLInputElement>(this.root, '.ft-proj-picker');

    q(this.root, '.ft-proj-new').addEventListener('click', () => this.openCreate());
    q(this.root, '.ft-proj-create-cancel').addEventListener('click', () => { this.createForm.hidden = true; });
    q(this.root, '.ft-proj-create-go').addEventListener('click', () => void this.create());
    q<HTMLInputElement>(this.createForm, '[data-f=name]').addEventListener('keydown', (e) => { if (e.key === 'Enter') void this.create(); });
    this.grid.addEventListener('click', (e) => {
      const id = (e.target as HTMLElement).closest<HTMLElement>('[data-id]')?.dataset.id;
      if (id) void this.open(id).catch((err) => this.say(err));
    });
    q(this.root, '.ft-proj-back').addEventListener('click', () => this.showList());
    q(this.root, '.ft-proj-chat').addEventListener('click', () => { if (this.current) this.hooks.newChatIn(this.current.id); });
    q(this.root, '.ft-proj-edit-open').addEventListener('click', () => this.openEdit());
    q(this.root, '.ft-proj-edit-cancel').addEventListener('click', () => { this.editForm.hidden = true; });
    q(this.root, '.ft-proj-edit-go').addEventListener('click', () => void this.saveEdit());
    q(this.root, '.ft-proj-delete').addEventListener('click', () => void this.remove());
    q(this.root, '.ft-proj-instr-save').addEventListener('click', () => void this.saveInstructions());
    this.instr.addEventListener('input', () => {
      this.dirty = this.instr.value !== (this.current?.instructions ?? '');
      setText(this.instrMsg, this.dirty ? 'Not saved' : '');
    });
    q(this.root, '.ft-proj-add').addEventListener('click', () => this.picker.click());
    this.picker.addEventListener('change', () => { void this.addFiles([...(this.picker.files ?? [])]); this.picker.value = ''; });
    this.files.addEventListener('click', (e) => {
      const id = (e.target as HTMLElement).closest<HTMLElement>('[data-remove]')?.dataset.remove;
      if (id && this.current) void run('project.removeFile', { id: this.current.id, uploadId: id }).catch((err) => this.say(err));
    });
    this.chats.addEventListener('click', (e) => {
      const id = (e.target as HTMLElement).closest<HTMLElement>('[data-chat]')?.dataset.chat;
      if (id) this.hooks.openChat(id);
    });
    this.root.addEventListener('dragover', (e) => { if (this.current) e.preventDefault(); });
    this.root.addEventListener('drop', (e) => {
      if (!this.current) return;
      e.preventDefault();
      void this.addFiles([...(e.dataTransfer?.files ?? [])]);
    });
    state.on('projects', () => this.renderList());
    state.on('conversations', () => { if (this.current && !this.detail.hidden && !this.root.hidden) void this.reload(); });
  }

  get openId(): string | null {
    return this.detail.hidden ? null : this.current?.id ?? null;
  }

  say(err: unknown): void {
    const text = err instanceof Error ? err.message : String(err);
    setText(this.toast, text);
    setAttr(this.toast, 'title', text);
    if (this.toast.hidden) this.toast.hidden = false;
    window.clearTimeout(this.toastTimer);
    this.toastTimer = window.setTimeout(() => this.hush(), 8000);
  }

  private hush(): void {
    window.clearTimeout(this.toastTimer);
    if (!this.toast.hidden) this.toast.hidden = true;
  }

  private openCreate(): void {
    q<HTMLInputElement>(this.createForm, '[data-f=name]').value = '';
    q<HTMLTextAreaElement>(this.createForm, '[data-f=description]').value = '';
    setText(q(this.createForm, '.ft-proj-msg'), '');
    this.createForm.hidden = false;
    q<HTMLInputElement>(this.createForm, '[data-f=name]').focus();
  }

  private async create(): Promise<void> {
    const name = q<HTMLInputElement>(this.createForm, '[data-f=name]').value.trim();
    const description = q<HTMLTextAreaElement>(this.createForm, '[data-f=description]').value.trim();
    if (!name) { setText(q(this.createForm, '.ft-proj-msg'), 'Give the project a name.'); return; }
    let p: ProjectSummary;
    try {
      p = await run<ProjectSummary>('project.create', { name, description });
    } catch (err) {
      setText(q(this.createForm, '.ft-proj-msg'), err instanceof Error ? err.message : String(err));
      return;
    }
    this.state.projects.set(p.id, p);
    this.state.emit('projects');
    this.createForm.hidden = true;
    await this.open(p.id).catch((err) => this.say(err));
  }

  renderList(): void {
    const items = [...this.state.projects.values()].sort((a, b) => b.updated - a.updated);
    for (const [id, tile] of this.tiles) if (!this.state.projects.has(id)) { tile.remove(); this.tiles.delete(id); }
    items.forEach((p, i) => {
      let tile = this.tiles.get(p.id);
      if (!tile) {
        tile = el(`<button type="button" class="ft-proj-tile" role="listitem" data-id="${esc(p.id)}"><span class="ft-proj-tile-name"></span><span class="ft-proj-tile-desc"></span><span class="ft-proj-tile-meta"></span></button>`);
        this.tiles.set(p.id, tile);
      }
      setText(q(tile, '.ft-proj-tile-name'), p.name);
      setText(q(tile, '.ft-proj-tile-desc'), p.description || ' ');
      setText(q(tile, '.ft-proj-tile-meta'), `${p.chats} chat${p.chats === 1 ? '' : 's'} · ${p.files} file${p.files === 1 ? '' : 's'} · ${when(p.updated)}`);
      if (this.grid.children[i] !== tile) this.grid.insertBefore(tile, this.grid.children[i] ?? null);
    });
    const any = items.length > 0;
    if (this.grid.hidden === any) this.grid.hidden = !any;
    if (this.empty.hidden !== any) this.empty.hidden = any;
    if (this.current && !this.state.projects.has(this.current.id)) this.showList();
    else if (this.current && !this.detail.hidden && !this.root.hidden) void this.reload();
  }

  showList(): void {
    this.hush();
    ++this.seq;
    this.current = null;
    if (this.detail.hidden === false) this.detail.hidden = true;
    if (this.listMode.hidden) this.listMode.hidden = false;
  }

  async open(id: string): Promise<void> {
    const seq = ++this.seq;
    const p = await run<ProjectDetail>('project.get', { id });
    if (seq !== this.seq) return;
    const fresh = this.current?.id !== id;
    if (fresh) this.dirty = false;
    this.current = p;
    this.paint(fresh);
    if (!this.listMode.hidden) this.listMode.hidden = true;
    if (this.detail.hidden) this.detail.hidden = false;
    this.root.scrollTop = 0;
  }

  private async reload(): Promise<void> {
    if (!this.current) return;
    const seq = ++this.seq;
    try {
      const p = await run<ProjectDetail>('project.get', { id: this.current.id });
      if (seq !== this.seq) return;
      this.current = p;
      this.paint(false);
    } catch {
      return;
    }
  }

  private paint(fresh: boolean): void {
    const p = this.current;
    if (!p) return;
    setText(q(this.root, '.ft-proj-name'), p.name);
    const desc = q(this.root, '.ft-proj-desc');
    setText(desc, p.description);
    if (desc.hidden === !!p.description) desc.hidden = !p.description;
    if (fresh || !this.dirty) {
      if (this.instr.value !== p.instructions) this.instr.value = p.instructions;
      if (fresh) setText(this.instrMsg, '');
    }
    if (fresh) this.editForm.hidden = true;
    const fileHtml = p.fileList.map((f) => `<li class="ft-proj-file"><span class="ft-files-icon">${ui('file', 16)}</span><span class="ft-proj-file-name" title="${esc(f.name)}">${esc(f.name)}</span><span class="ft-files-size">${esc(f.kind.toUpperCase())} · ${size(f.size)}</span><button type="button" class="ft-icon-btn" data-remove="${esc(f.id)}" aria-label="Remove ${esc(f.name)}" title="Remove from the project">${ui('close', 14)}</button></li>`).join('')
      + this.uploads.map((n) => `<li class="ft-proj-file is-loading"><span class="ft-files-icon">${ui('file', 16)}</span><span class="ft-proj-file-name">${esc(n)}</span><span class="ft-files-size">uploading</span><span></span></li>`).join('');
    if (this.files.dataset.v !== fileHtml) { this.files.dataset.v = fileHtml; this.files.innerHTML = fileHtml; }
    const noFiles = q(this.root, '.ft-proj-files-none');
    const anyFiles = p.fileList.length + this.uploads.length > 0;
    if (noFiles.hidden !== anyFiles) noFiles.hidden = anyFiles;
    const live = new Set(p.chatList.map((c) => c.id));
    for (const [id, row] of this.chatRows) if (!live.has(id) || fresh) { row.remove(); this.chatRows.delete(id); }
    p.chatList.forEach((c, i) => {
      let row = this.chatRows.get(c.id);
      if (!row) {
        row = el(`<button type="button" class="ft-proj-chat-row" role="listitem" data-chat="${esc(c.id)}"><span class="ft-proj-chat-title"></span><span class="ft-proj-chat-when"></span></button>`);
        this.chatRows.set(c.id, row);
      }
      setText(q(row, '.ft-proj-chat-title'), c.title);
      setText(q(row, '.ft-proj-chat-when'), when(c.updated));
      if (this.chats.children[i] !== row) this.chats.insertBefore(row, this.chats.children[i] ?? null);
    });
    const noChats = q(this.root, '.ft-proj-chats-none');
    if (noChats.hidden !== p.chatList.length > 0) noChats.hidden = p.chatList.length > 0;
  }

  private openEdit(): void {
    if (!this.current) return;
    q<HTMLInputElement>(this.editForm, '[data-f=name]').value = this.current.name;
    q<HTMLTextAreaElement>(this.editForm, '[data-f=description]').value = this.current.description;
    this.editForm.hidden = false;
    q<HTMLInputElement>(this.editForm, '[data-f=name]').focus();
  }

  private async saveEdit(): Promise<void> {
    if (!this.current) return;
    const name = q<HTMLInputElement>(this.editForm, '[data-f=name]').value.trim();
    const description = q<HTMLTextAreaElement>(this.editForm, '[data-f=description]').value.trim();
    try {
      await run('project.update', { id: this.current.id, name, description });
      this.editForm.hidden = true;
    } catch (err) {
      this.say(err);
    }
  }

  private async saveInstructions(): Promise<void> {
    if (!this.current) return;
    try {
      await run('project.update', { id: this.current.id, instructions: this.instr.value });
      this.dirty = false;
      setText(this.instrMsg, 'Saved. The next reply in each chat uses them.');
    } catch (err) {
      setText(this.instrMsg, err instanceof Error ? err.message : String(err));
    }
  }

  private async remove(): Promise<void> {
    const p = this.current;
    if (!p || !(await askDeleteProject(p.name))) return;
    try {
      await run('project.delete', { id: p.id });
    } catch (err) {
      this.say(err);
    }
  }

  private async addFiles(list: File[]): Promise<void> {
    const pid = this.current?.id;
    if (!pid || !list.length) return;
    this.uploads.push(...list.map((f) => f.name));
    this.paint(false);
    for (const f of list) {
      const form = new FormData();
      form.append('file', f, f.name);
      try {
        const res = await fetch('/api/uploads', { method: 'POST', body: form, headers: keyHeaders() });
        const body = await res.json();
        if (!res.ok || !body.ok) throw new Error(body.error || `upload failed (${res.status})`);
        await run('project.addFile', { id: pid, uploadId: (body.file as FileInfo).id });
      } catch (err) {
        this.say(`${f.name}: ${err instanceof Error ? err.message : String(err)}`);
      }
      this.uploads.splice(this.uploads.indexOf(f.name), 1);
    }
    await this.reload();
  }
}
