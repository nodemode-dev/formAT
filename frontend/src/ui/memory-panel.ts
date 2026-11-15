import { run } from '../engine-client/api';
import type { AppState } from '../state/app-state';
import { el, esc, q, setText } from './dom';
import { ui } from './icons-ft';

interface MemFile { path: string; size: number; modified: number }

export class MemoryPanel {
  readonly root: HTMLElement;
  private toggle: HTMLInputElement;
  private scope: HTMLSelectElement;
  private list: HTMLElement;
  private empty: HTMLElement;
  private editor: HTMLElement;
  private pathInput: HTMLInputElement;
  private text: HTMLTextAreaElement;
  private msg: HTMLElement;
  private rows = new Map<string, HTMLElement>();
  private seq = 0;
  private editing: string | null = null;

  constructor(private state: AppState) {
    this.root = el(`<div class="ft-prefs-part">
      <p class="ft-set-note">With memory on, Claude keeps notes in a memory folder with Anthropic's memory tool and checks it at the start of each reply, so what it learns in one chat carries into the next. Chats outside projects share one memory; each project has its own. You can read, change and delete everything here; deleting a project deletes its memory.</p>
      <section class="ft-prefs-group">
        <h3 class="ft-prefs-label">Memory</h3>
        <label class="ft-field ft-check"><input type="checkbox" class="ft-mem-on"><span>Let Claude remember across chats</span></label>
      </section>
      <section class="ft-prefs-group">
        <h3 class="ft-prefs-label">Memory files</h3>
        <label class="ft-field"><span>Memory of</span><select class="ft-input ft-mem-scope"><option value="">Chats outside projects</option></select></label>
      <div class="ft-set-actions"><button type="button" class="ft-btn ft-mem-new">New memory file</button></div>
      <div class="ft-mem-editor" hidden>
        <input class="ft-input ft-mem-path" aria-label="Memory file path" spellcheck="false">
        <textarea class="ft-input ft-mem-text" rows="8" aria-label="Memory file text"></textarea>
        <div class="ft-set-actions"><button type="button" class="ft-btn ft-btn-primary ft-mem-save">Save</button><button type="button" class="ft-btn ft-mem-delete">Delete</button><button type="button" class="ft-btn ft-mem-close">Close</button><span class="ft-proj-msg ft-mem-msg" aria-live="polite"></span></div>
      </div>
      <div class="ft-mem-list" role="list"></div>
      <p class="ft-proj-none ft-mem-empty">Nothing remembered here yet.</p>
      </section>
    </div>`);
    this.toggle = q<HTMLInputElement>(this.root, '.ft-mem-on');
    this.scope = q<HTMLSelectElement>(this.root, '.ft-mem-scope');
    this.list = q(this.root, '.ft-mem-list');
    this.empty = q(this.root, '.ft-mem-empty');
    this.editor = q(this.root, '.ft-mem-editor');
    this.pathInput = q<HTMLInputElement>(this.root, '.ft-mem-path');
    this.text = q<HTMLTextAreaElement>(this.root, '.ft-mem-text');
    this.msg = q(this.root, '.ft-mem-msg');
    this.toggle.addEventListener('change', () => void run('settings.set', { key: 'memory', value: this.toggle.checked }).catch(() => undefined));
    this.scope.addEventListener('change', () => {
      this.close();
      this.rows.forEach((r) => r.remove());
      this.rows.clear();
      void this.refresh();
    });
    this.list.addEventListener('click', (e) => {
      const path = (e.target as HTMLElement).closest<HTMLElement>('[data-path]')?.dataset.path;
      if (path) void this.edit(path);
    });
    q(this.root, '.ft-mem-new').addEventListener('click', () => this.openEditor('/memories/notes.md', '', true));
    q(this.root, '.ft-mem-close').addEventListener('click', () => this.close());
    q(this.root, '.ft-mem-save').addEventListener('click', () => void this.save());
    q(this.root, '.ft-mem-delete').addEventListener('click', () => void this.remove());
    state.on('settings', () => { const on = !!this.state.settings.memory; if (this.toggle.checked !== on) this.toggle.checked = on; });
    state.on('projects', () => this.fillScopes());
    state.on('memory', () => void this.refresh());
  }

  private projectId(): string | undefined {
    return this.scope.value || undefined;
  }

  private fillScopes(): void {
    const items = [...this.state.projects.values()].sort((a, b) => a.name.localeCompare(b.name));
    const html = `<option value="">Chats outside projects</option>${items.map((p) => `<option value="${esc(p.id)}">Project: ${esc(p.name)}</option>`).join('')}`;
    if (this.scope.dataset.v === html) return;
    const keep = this.scope.value;
    this.scope.dataset.v = html;
    this.scope.innerHTML = html;
    this.scope.value = items.some((p) => p.id === keep) ? keep : '';
    if (keep !== this.scope.value) { this.close(); void this.refresh(); }
  }

  async refresh(): Promise<void> {
    const seq = ++this.seq;
    let files: MemFile[];
    try { files = (await run<{ files: MemFile[] }>('memory.list', this.projectId() ? { projectId: this.projectId() } : {})).files; } catch { return; }
    if (seq !== this.seq) return;
    const live = new Set(files.map((f) => f.path));
    for (const [p, r] of this.rows) if (!live.has(p)) { r.remove(); this.rows.delete(p); }
    files.forEach((f, i) => {
      let row = this.rows.get(f.path);
      if (!row) {
        row = el(`<button type="button" class="ft-mem-row" role="listitem" data-path="${esc(f.path)}"><span class="ft-files-icon">${ui('file', 14)}</span><span class="ft-mem-row-path"></span><span class="ft-files-size"></span></button>`);
        this.rows.set(f.path, row);
      }
      setText(q(row, '.ft-mem-row-path'), f.path.replace(/^\/memories\//, ''));
      setText(q(row, '.ft-files-size'), f.size < 1024 ? `${f.size} B` : `${(f.size / 1024).toFixed(1)} KB`);
      if (this.list.children[i] !== row) this.list.insertBefore(row, this.list.children[i] ?? null);
    });
    if (this.empty.hidden !== files.length > 0) this.empty.hidden = files.length > 0;
    if (this.editing && !live.has(this.editing)) this.close();
  }

  private openEditor(path: string, text: string, fresh: boolean): void {
    this.editing = fresh ? null : path;
    this.pathInput.value = path;
    this.pathInput.readOnly = !fresh;
    this.text.value = text;
    setText(this.msg, '');
    if (this.editor.hidden) this.editor.hidden = false;
    q<HTMLButtonElement>(this.root, '.ft-mem-delete').hidden = fresh;
    (fresh ? this.pathInput : this.text).focus();
  }

  private async edit(path: string): Promise<void> {
    try {
      const got = await run<{ text: string }>('memory.read', { path, ...(this.projectId() ? { projectId: this.projectId() } : {}) });
      this.openEditor(path, got.text, false);
    } catch (err) {
      setText(this.msg, err instanceof Error ? err.message : String(err));
    }
  }

  private async save(): Promise<void> {
    const path = this.pathInput.value.trim();
    try {
      await run('memory.write', { path, text: this.text.value, ...(this.projectId() ? { projectId: this.projectId() } : {}) });
      this.editing = path;
      this.pathInput.readOnly = true;
      q<HTMLButtonElement>(this.root, '.ft-mem-delete').hidden = false;
      setText(this.msg, 'Saved.');
      void this.refresh();
    } catch (err) {
      setText(this.msg, err instanceof Error ? err.message : String(err));
    }
  }

  private async remove(): Promise<void> {
    if (!this.editing) return;
    const path = this.editing;
    this.rows.get(path)?.remove();
    this.rows.delete(path);
    if (this.empty.hidden && !this.rows.size) this.empty.hidden = false;
    try {
      await run('memory.delete', { path, ...(this.projectId() ? { projectId: this.projectId() } : {}) });
      this.close();
      void this.refresh();
    } catch (err) {
      setText(this.msg, err instanceof Error ? err.message : String(err));
    }
  }

  private close(): void {
    this.editing = null;
    if (!this.editor.hidden) this.editor.hidden = true;
  }
}
