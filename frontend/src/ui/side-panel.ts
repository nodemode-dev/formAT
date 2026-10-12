import { el, esc, q, setAttr, setText } from './dom';
import { ui } from './icons-ft';
import { type TaskItem, taskListHtml } from './tool-cards';

export interface OutputFile { name: string; path: string; size: number; caption?: string; url: string }
export interface Used { uploads: number; web_search: number; web_fetch: number; bash: number; files: number; connectors?: number }

function count(n: number, one: string, many: string): string {
  return n ? `${n} ${n === 1 ? one : many}` : 'none';
}

export class SidePanel {
  readonly root: HTMLElement;
  private progress: HTMLElement;
  private tasks: HTMLElement;
  private files: HTMLElement;
  private empty: HTMLElement;
  private all: HTMLAnchorElement;

  constructor(onClose: () => void, onOpen: (path: string) => void = () => undefined) {
    this.root = el(`<aside class="ft-panel" aria-label="Outputs">
      <div class="ft-panel-head">
        <span class="ft-panel-title">Outputs</span>
        <button type="button" class="ft-icon-btn ft-panel-close" aria-label="Close panel" title="Close panel">${ui('close', 16)}</button>
      </div>
      <div class="ft-panel-body">
        <section class="ft-panel-section ft-panel-progress" hidden>
          <h3 class="ft-panel-sub">Progress <span class="ft-muted ft-progress-count"></span></h3>
          <ul class="ft-tasks"></ul>
        </section>
        <section class="ft-panel-section">
          <div class="ft-panel-files-head"><h3 class="ft-panel-sub">Files</h3><a class="ft-text-btn ft-download-all" download hidden>Download all</a></div>
          <ul class="ft-panel-files"></ul>
          <div class="ft-panel-empty">${ui('outputs', 20)}<p>Files Claude makes in this chat appear here.</p></div>
        </section>
        <section class="ft-panel-section">
          <h3 class="ft-panel-sub">Used in this session</h3>
          <div class="ft-used-row" data-u="uploads">${ui('paperclip', 16)}<span>Uploads</span><span class="ft-muted">none</span></div>
          <div class="ft-used-row" data-u="web">${ui('globe', 16)}<span>Web</span><span class="ft-muted">none</span></div>
          <div class="ft-used-row" data-u="bash">${ui('terminal', 16)}<span>Commands</span><span class="ft-muted">none</span></div>
          <div class="ft-used-row" data-u="files">${ui('pencil', 16)}<span>File changes</span><span class="ft-muted">none</span></div>
          <div class="ft-used-row" data-u="connectors">${ui('plug', 16)}<span>Connectors</span><span class="ft-muted">none</span></div>
        </section>
      </div>
    </aside>`);
    q(this.root, '.ft-panel-close').addEventListener('click', onClose);
    this.progress = q(this.root, '.ft-panel-progress');
    this.tasks = q(this.progress, '.ft-tasks');
    this.files = q(this.root, '.ft-panel-files');
    this.files.addEventListener('click', (e) => {
      const path = (e.target as HTMLElement).closest<HTMLElement>('.ft-panel-file-name')?.dataset.path;
      if (path) onOpen(path);
    });
    this.empty = q(this.root, '.ft-panel-empty');
    this.all = q<HTMLAnchorElement>(this.root, '.ft-download-all');
  }

  setTasks(tasks: TaskItem[]): void {
    const show = tasks.length > 0;
    if (this.progress.hidden === show) this.progress.hidden = !show;
    const html = taskListHtml(tasks);
    if (this.tasks.dataset.v !== html) { this.tasks.dataset.v = html; this.tasks.innerHTML = html; }
    setText(q(this.progress, '.ft-progress-count'), show ? `${tasks.filter((t) => t.status === 'completed').length} of ${tasks.length}` : '');
  }

  setOutputs(files: OutputFile[], zip: string | null, used: Used): void {
    const html = files.map((f) => `<li class="ft-panel-file"><span class="ft-panel-file-icon">${ui('file', 16)}</span><button type="button" class="ft-panel-file-name" data-path="${esc(f.path)}" title="Preview ${esc(f.caption || f.path)}">${esc(f.name)}</button><a class="ft-icon-btn" href="${esc(f.url)}" download title="Download ${esc(f.name)}" aria-label="Download ${esc(f.name)}">${ui('arrowDown', 14)}</a></li>`).join('');
    if (this.files.dataset.v !== html) { this.files.dataset.v = html; this.files.innerHTML = html; }
    if (this.empty.hidden !== files.length > 0) this.empty.hidden = files.length > 0;
    if (this.all.hidden === !!zip) this.all.hidden = !zip;
    if (zip) setAttr(this.all, 'href', zip);
    const row = (k: string, text: string) => setText(q(this.root, `[data-u="${k}"] .ft-muted`), text);
    row('uploads', count(used.uploads, 'file', 'files'));
    row('web', used.web_search + used.web_fetch ? [used.web_search ? count(used.web_search, 'search', 'searches') : '', used.web_fetch ? count(used.web_fetch, 'page', 'pages') : ''].filter(Boolean).join(', ') : 'none');
    row('bash', count(used.bash, 'command', 'commands'));
    row('files', count(used.files, 'change', 'changes'));
    row('connectors', count(used.connectors ?? 0, 'call', 'calls'));
  }
}
