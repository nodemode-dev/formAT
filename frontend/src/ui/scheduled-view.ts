import { run } from '../engine-client/api';
import type { AppState } from '../state/app-state';
import { askDeleteSchedule } from './confirm';
import { el, esc, q, setAttr, setText } from './dom';
import { ui } from './icons-ft';

export type Cadence = 'manual' | 'once' | 'hourly' | 'daily' | 'weekdays' | 'weekly';

export interface ScheduleSummary {
  id: string; name: string; prompt: string; cadence: Cadence; at: string; weekday: number; runAt: number | null;
  projectId: string | null; enabled: boolean; nextRun: number | null; lastRun: number | null; runs: number; lastStatus: string | null;
}

export interface ScheduleRun { id: string; scheduleId: string; conversationId: string | null; trigger: string; started: number; error: string; status: string }

interface ScheduleDetail extends ScheduleSummary { history: ScheduleRun[] }

export interface ScheduledHooks {
  openChat(id: string): void;
}

const DAYS = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'];
const STATUS: Record<string, string> = { running: 'Running', waiting: 'Waiting for you', done: 'Done', failed: 'Failed', stopped: 'Stopped', deleted: 'Chat deleted' };

function clock(at: string): string {
  const [h, m] = at.split(':').map(Number);
  return new Date(2000, 0, 1, h, m).toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' });
}

function stamp(ts: number): string {
  const d = new Date(ts * 1000);
  const today = new Date();
  const time = d.toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' });
  if (d.toDateString() === today.toDateString()) return `today ${time}`;
  const tomorrow = new Date(today.getFullYear(), today.getMonth(), today.getDate() + 1);
  if (d.toDateString() === tomorrow.toDateString()) return `tomorrow ${time}`;
  return `${d.toLocaleDateString([], { weekday: 'short', month: 'short', day: 'numeric' })} ${time}`;
}

export function cadenceText(s: ScheduleSummary): string {
  switch (s.cadence) {
    case 'manual': return 'When you run it';
    case 'once': return s.runAt ? `Once, ${stamp(s.runAt)}` : 'Once';
    case 'hourly': return `Every hour at :${s.at.split(':')[1]}`;
    case 'daily': return `Every day at ${clock(s.at)}`;
    case 'weekdays': return `Weekdays at ${clock(s.at)}`;
    default: return `${DAYS[s.weekday]}s at ${clock(s.at)}`;
  }
}

function nextText(s: ScheduleSummary): string {
  if (!s.enabled) return 'Paused';
  if (s.nextRun) return `Next ${stamp(s.nextRun)}`;
  return s.cadence === 'manual' ? 'Run it from here' : 'No run ahead';
}

function localInput(ts: number): string {
  const d = new Date(ts * 1000);
  const p = (n: number) => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())}T${p(d.getHours())}:${p(d.getMinutes())}`;
}

export class ScheduledView {
  readonly root: HTMLElement;
  private listMode: HTMLElement;
  private list: HTMLElement;
  private empty: HTMLElement;
  private form: HTMLElement;
  private detail: HTMLElement;
  private history: HTMLElement;
  private items = new Map<string, ScheduleSummary>();
  private rows = new Map<string, HTMLElement>();
  private runRows = new Map<string, HTMLElement>();
  private current: ScheduleDetail | null = null;
  private editing: string | null = null;
  private seq = 0;
  private loaded = false;
  private timer = 0;

  constructor(private state: AppState, private hooks: ScheduledHooks) {
    this.root = el(`<section class="ft-page ft-scheduled" data-view="scheduled" hidden>
      <div class="ft-sch-list-mode">
        <header class="ft-sch-head"><h1>Scheduled</h1><button type="button" class="ft-btn ft-btn-primary ft-sch-new">${ui('plus', 16)}<span>New task</span></button></header>
        <p class="ft-set-note ft-sch-lede">Claude runs each task on its schedule while FormAT is open, every run in a new chat. A run missed while FormAT was closed runs once when it opens. Runs follow your permission mode; one that needs an answer waits for you in Background.</p>
        <div class="ft-sch-form" hidden>
          <label class="ft-field"><span>Name</span><input class="ft-input" data-f="name" maxlength="80" placeholder="Morning summary"></label>
          <label class="ft-field"><span>What Claude should do</span><textarea class="ft-input" data-f="prompt" rows="4" maxlength="20000" placeholder="Summarize what changed in the workspace since yesterday and list anything that needs me"></textarea></label>
          <div class="ft-field-row">
            <label class="ft-field"><span>How often</span><select class="ft-input" data-f="cadence"><option value="daily">Every day</option><option value="weekdays">Weekdays</option><option value="weekly">Every week</option><option value="hourly">Every hour</option><option value="once">Once</option><option value="manual">Only when I run it</option></select></label>
            <label class="ft-field ft-sch-at"><span>Time</span><input class="ft-input" type="time" data-f="at" value="09:00"></label>
            <label class="ft-field ft-sch-day" hidden><span>Day</span><select class="ft-input" data-f="weekday">${DAYS.map((d, i) => `<option value="${i}">${d}</option>`).join('')}</select></label>
            <label class="ft-field ft-sch-once" hidden><span>When</span><input class="ft-input" type="datetime-local" data-f="runAt"></label>
          </div>
          <label class="ft-field"><span>Project</span><select class="ft-input" data-f="projectId"><option value="">No project</option></select></label>
          <div class="ft-set-actions"><button type="button" class="ft-btn ft-btn-primary ft-sch-save">Create task</button><button type="button" class="ft-btn ft-sch-cancel">Cancel</button><span class="ft-sch-msg" aria-live="polite"></span></div>
        </div>
        <div class="ft-sch-list" role="list" hidden></div>
        <div class="ft-page-empty" hidden>${ui('clock', 28)}<p>No scheduled tasks yet. A task is a prompt Claude runs every hour, day or week, or once at a set time.</p></div>
      </div>
      <div class="ft-sch-detail" hidden>
        <button type="button" class="ft-text-btn ft-sch-back">${ui('back', 14)}<span>All scheduled tasks</span></button>
        <h1 class="ft-sch-name"></h1>
        <p class="ft-sch-when"></p>
        <div class="ft-sch-actions">
          <button type="button" class="ft-btn ft-btn-primary ft-sch-run">${ui('send', 14)}<span>Run now</span></button>
          <button type="button" class="ft-btn ft-sch-edit">Edit</button>
          <button type="button" class="ft-btn ft-sch-pause">Pause</button>
          <button type="button" class="ft-btn ft-sch-delete">Delete</button>
          <span class="ft-sch-msg ft-sch-detail-msg" aria-live="polite"></span>
        </div>
        <section class="ft-sch-prompt-card"><h2 class="ft-sch-sub">Prompt</h2><p class="ft-sch-prompt"></p><p class="ft-sch-none ft-sch-project"></p></section>
        <h2 class="ft-sch-sub">Runs</h2>
        <div class="ft-sch-history" role="list"></div>
        <p class="ft-sch-none ft-sch-history-none">No runs yet. Each run opens as a chat here.</p>
      </div>
    </section>`);
    this.listMode = q(this.root, '.ft-sch-list-mode');
    this.list = q(this.root, '.ft-sch-list');
    this.empty = q(this.listMode, '.ft-page-empty');
    this.form = q(this.root, '.ft-sch-form');
    this.detail = q(this.root, '.ft-sch-detail');
    this.history = q(this.root, '.ft-sch-history');

    q(this.root, '.ft-sch-new').addEventListener('click', () => this.openForm(null));
    q(this.root, '.ft-sch-cancel').addEventListener('click', () => this.closeForm());
    q(this.root, '.ft-sch-save').addEventListener('click', () => void this.save());
    q(this.form, '[data-f=cadence]').addEventListener('change', () => this.syncFields());
    this.list.addEventListener('click', (e) => {
      const t = e.target as HTMLElement;
      const id = t.closest<HTMLElement>('[data-sch]')?.dataset.sch;
      if (!id) return;
      if (t.closest('.ft-sch-toggle')) return;
      void this.open(id);
    });
    this.list.addEventListener('change', (e) => {
      const box = e.target as HTMLInputElement;
      const id = box.closest<HTMLElement>('[data-sch]')?.dataset.sch;
      if (id && box.type === 'checkbox') void run('schedule.update', { id, enabled: box.checked }).catch(() => { box.checked = !box.checked; });
    });
    q(this.root, '.ft-sch-back').addEventListener('click', () => this.showList());
    q(this.root, '.ft-sch-run').addEventListener('click', () => void this.runNow());
    q(this.root, '.ft-sch-edit').addEventListener('click', () => { if (this.current) { this.showList(); this.openForm(this.current); } });
    q(this.root, '.ft-sch-pause').addEventListener('click', () => { if (this.current) void run('schedule.update', { id: this.current.id, enabled: !this.current.enabled }).catch((err) => this.detailMsg(err)); });
    q(this.root, '.ft-sch-delete').addEventListener('click', () => void this.remove());
    this.history.addEventListener('click', (e) => {
      const id = (e.target as HTMLElement).closest<HTMLElement>('[data-chat]')?.dataset.chat;
      if (id) this.hooks.openChat(id);
    });
    state.on('projects', () => this.fillProjects());
  }

  async load(): Promise<void> {
    const got = await run<{ schedules: ScheduleSummary[] }>('schedule.list');
    this.items = new Map(got.schedules.map((s) => [s.id, s]));
    this.loaded = true;
    this.renderList();
  }

  shown(): void {
    if (!this.loaded) void this.load().catch(() => undefined);
    else if (this.current && !this.detail.hidden) this.refreshSoon(0);
  }

  changed(s: ScheduleSummary): void {
    this.items.set(s.id, s);
    this.renderList();
    if (this.current?.id === s.id) this.refreshSoon(0);
  }

  deleted(id: string): void {
    this.items.delete(id);
    this.renderList();
    if (this.current?.id === id) this.showList();
  }

  conversationChanged(cid: string): void {
    if (this.current && !this.detail.hidden && !this.root.hidden && this.current.history.some((r) => r.conversationId === cid)) this.refreshSoon(300);
  }

  private refreshSoon(ms: number): void {
    window.clearTimeout(this.timer);
    this.timer = window.setTimeout(() => { if (this.current) void this.open(this.current.id); }, ms);
  }

  private fillProjects(): void {
    const sel = q<HTMLSelectElement>(this.form, '[data-f=projectId]');
    const projects = [...this.state.projects.values()].sort((a, b) => a.name.localeCompare(b.name));
    const key = projects.map((p) => `${p.id}:${p.name}`).join('|');
    if (sel.dataset.v === key) return;
    const keep = sel.value;
    sel.dataset.v = key;
    sel.innerHTML = `<option value="">No project</option>${projects.map((p) => `<option value="${esc(p.id)}">${esc(p.name)}</option>`).join('')}`;
    sel.value = projects.some((p) => p.id === keep) ? keep : '';
  }

  private syncFields(): void {
    const c = q<HTMLSelectElement>(this.form, '[data-f=cadence]').value as Cadence;
    const show = (sel: string, on: boolean) => { const n = q(this.form, sel); if (n.hidden === on) n.hidden = !on; };
    show('.ft-sch-at', c !== 'once' && c !== 'manual');
    show('.ft-sch-day', c === 'weekly');
    show('.ft-sch-once', c === 'once');
  }

  private openForm(s: ScheduleSummary | null): void {
    this.fillProjects();
    this.editing = s?.id ?? null;
    const f = (k: string) => q<HTMLInputElement>(this.form, `[data-f=${k}]`);
    f('name').value = s?.name ?? '';
    q<HTMLTextAreaElement>(this.form, '[data-f=prompt]').value = s?.prompt ?? '';
    q<HTMLSelectElement>(this.form, '[data-f=cadence]').value = s?.cadence ?? 'daily';
    f('at').value = s?.at ?? '09:00';
    q<HTMLSelectElement>(this.form, '[data-f=weekday]').value = String(s?.weekday ?? 0);
    f('runAt').value = localInput(s?.runAt ?? Date.now() / 1000 + 3600);
    q<HTMLSelectElement>(this.form, '[data-f=projectId]').value = s?.projectId ?? '';
    setText(q(this.form, '.ft-sch-save'), s ? 'Save task' : 'Create task');
    setText(q(this.form, '.ft-sch-msg'), '');
    this.syncFields();
    if (this.form.hidden) this.form.hidden = false;
    f('name').focus();
  }

  private closeForm(): void {
    this.editing = null;
    if (!this.form.hidden) this.form.hidden = true;
  }

  private async save(): Promise<void> {
    const f = (k: string) => q<HTMLInputElement>(this.form, `[data-f=${k}]`).value;
    const cadence = f('cadence') as Cadence;
    const params: Record<string, unknown> = { name: f('name').trim(), prompt: q<HTMLTextAreaElement>(this.form, '[data-f=prompt]').value, cadence, projectId: f('projectId') };
    if (!params.name) { setText(q(this.form, '.ft-sch-msg'), 'Give the task a name.'); return; }
    if (!String(params.prompt).trim()) { setText(q(this.form, '.ft-sch-msg'), 'Say what Claude should do.'); return; }
    if (cadence !== 'once' && cadence !== 'manual') params.at = f('at') || '09:00';
    if (cadence === 'weekly') params.weekday = Number(f('weekday'));
    if (cadence === 'once') {
      const t = new Date(f('runAt')).getTime();
      if (!Number.isFinite(t)) { setText(q(this.form, '.ft-sch-msg'), 'Pick when it should run.'); return; }
      params.runAt = t / 1000;
    }
    try {
      const s = this.editing ? await run<ScheduleSummary>('schedule.update', { id: this.editing, ...params }) : await run<ScheduleSummary>('schedule.create', params);
      this.changed(s);
      this.closeForm();
      void this.open(s.id);
    } catch (err) {
      setText(q(this.form, '.ft-sch-msg'), err instanceof Error ? err.message : String(err));
    }
  }

  renderList(): void {
    const items = [...this.items.values()];
    for (const [id, row] of this.rows) if (!this.items.has(id)) { row.remove(); this.rows.delete(id); }
    items.forEach((s, i) => {
      let row = this.rows.get(s.id);
      if (!row) {
        row = el(`<div class="ft-sch-row" role="listitem" data-sch="${esc(s.id)}"><span class="ft-sch-icon">${ui('clock', 16)}</span>
          <button type="button" class="ft-sch-text"><span class="ft-sch-row-name"></span><span class="ft-sch-row-desc"></span><span class="ft-sch-row-meta"></span></button>
          <label class="ft-sch-toggle" title="On or paused"><input type="checkbox" aria-label="Run ${esc(s.name)} on its schedule"></label></div>`);
        this.rows.set(s.id, row);
      }
      setText(q(row, '.ft-sch-row-name'), s.name);
      setText(q(row, '.ft-sch-row-desc'), cadenceText(s));
      setText(q(row, '.ft-sch-row-meta'),[nextText(s), s.lastStatus ? `last: ${(STATUS[s.lastStatus] ?? s.lastStatus).toLowerCase()}` : ''].filter(Boolean).join(' · '));
      row.classList.toggle('is-off', !s.enabled);
      const box = q<HTMLInputElement>(row, 'input');
      if (box.checked !== s.enabled) box.checked = s.enabled;
      if (this.list.children[i] !== row) this.list.insertBefore(row, this.list.children[i] ?? null);
    });
    const any = items.length > 0;
    if (this.list.hidden === any) this.list.hidden = !any;
    if (this.empty.hidden !== (any || !this.loaded)) this.empty.hidden = any || !this.loaded;
  }

  showList(): void {
    ++this.seq;
    this.current = null;
    window.clearTimeout(this.timer);
    if (!this.detail.hidden) this.detail.hidden = true;
    if (this.listMode.hidden) this.listMode.hidden = false;
  }

  async open(id: string): Promise<void> {
    const seq = ++this.seq;
    const s = await run<ScheduleDetail>('schedule.get', { id });
    if (seq !== this.seq) return;
    const fresh = this.current?.id !== id;
    this.current = s;
    this.items.set(s.id, s);
    setText(q(this.detail, '.ft-sch-name'), s.name);
    setText(q(this.detail, '.ft-sch-when'), `${cadenceText(s)} · ${nextText(s)}`);
    setText(q(this.detail, '.ft-sch-prompt'), s.prompt);
    const project = s.projectId ? this.state.projects.get(s.projectId)?.name : null;
    setText(q(this.detail, '.ft-sch-project'), project ? `Runs in the project ${project}.` : 'Runs outside any project.');
    setText(q(this.detail, '.ft-sch-pause'), s.enabled ? 'Pause' : 'Resume');
    if (fresh) setText(q(this.detail, '.ft-sch-detail-msg'), '');
    this.renderHistory(s.history);
    if (fresh) {
      if (!this.listMode.hidden) this.listMode.hidden = true;
      if (this.detail.hidden) this.detail.hidden = false;
    }
    if (s.history.some((r) => r.status === 'running' || r.status === 'waiting')) this.refreshSoon(4000);
  }

  private renderHistory(runs: ScheduleRun[]): void {
    const ids = new Set(runs.map((r) => r.id));
    for (const [id, row] of this.runRows) if (!ids.has(id)) { row.remove(); this.runRows.delete(id); }
    runs.forEach((r, i) => {
      let row = this.runRows.get(r.id);
      if (!row) {
        row = el(`<button type="button" class="ft-sch-run-row" role="listitem"><span class="ft-sch-run-dot"></span><span class="ft-sch-run-title"></span><span class="ft-sch-run-when"></span></button>`);
        this.runRows.set(r.id, row);
      }
      setAttr(row, 'data-chat', r.conversationId);
      setAttr(row, 'data-status', r.status);
      row.toggleAttribute('disabled', !r.conversationId);
      setText(q(row, '.ft-sch-run-title'), `${STATUS[r.status] ?? r.status}${r.error ? `: ${r.error}` : ''} · ${r.trigger === 'manual' ? 'run by you' : 'on schedule'}`);
      setText(q(row, '.ft-sch-run-when'), stamp(r.started));
      if (this.history.children[i] !== row) this.history.insertBefore(row, this.history.children[i] ?? null);
    });
    const none = q(this.detail, '.ft-sch-history-none');
    if (none.hidden !== runs.length > 0) none.hidden = runs.length > 0;
  }

  private detailMsg(err: unknown): void {
    setText(q(this.detail, '.ft-sch-detail-msg'), err instanceof Error ? err.message : String(err));
  }

  private async runNow(): Promise<void> {
    if (!this.current) return;
    try {
      await run<ScheduleRun>('schedule.run', { id: this.current.id });
      setText(q(this.detail, '.ft-sch-detail-msg'), 'Started; the run is a new chat below.');
    } catch (err) {
      this.detailMsg(err);
    }
  }

  private async remove(): Promise<void> {
    const s = this.current;
    if (!s || !(await askDeleteSchedule(s.name))) return;
    try {
      await run('schedule.delete', { id: s.id });
    } catch (err) {
      this.detailMsg(err);
    }
  }
}
