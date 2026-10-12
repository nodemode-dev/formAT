import { run } from '../engine-client/api';
import type { AppState } from '../state/app-state';
import { el, esc, q, setAttr, setText } from './dom';
import { ui } from './icons-ft';

interface BackgroundItem { conversationId: string; title: string; status: 'running' | 'waiting'; started: number | null; schedule: { id: string; name: string } | null }

export interface BackgroundHooks {
  openChat(id: string): void;
}

function since(ts: number | null): string {
  if (!ts) return '';
  const s = Math.max(0, Math.round(Date.now() / 1000 - ts));
  return s < 60 ? `${s} s` : s < 3600 ? `${Math.floor(s / 60)} min` : `${Math.floor(s / 3600)} h ${Math.floor((s % 3600) / 60)} min`;
}

export class BackgroundPanel {
  readonly root: HTMLElement;
  private list: HTMLElement;
  private none: HTMLElement;
  private rows = new Map<string, HTMLElement>();
  private items: BackgroundItem[] = [];
  private seq = 0;
  private tick = 0;
  private anchor: HTMLElement | null = null;

  constructor(private state: AppState, private hooks: BackgroundHooks) {
    this.root = el(`<div class="ft-bg-pop" role="dialog" aria-label="Background work" hidden>
      <div class="ft-bg-head"><h2>Background</h2><span class="ft-bg-count"></span></div>
      <div class="ft-bg-list" role="list"></div>
      <p class="ft-bg-none">Nothing is running. Replies, summaries and scheduled runs show here while they work, and stay here while they wait for you.</p>
    </div>`);
    this.list = q(this.root, '.ft-bg-list');
    this.none = q(this.root, '.ft-bg-none');
    this.list.addEventListener('click', (e) => {
      const t = e.target as HTMLElement;
      const row = t.closest<HTMLElement>('[data-cid]');
      if (!row) return;
      const cid = row.dataset.cid as string;
      if (t.closest('.ft-bg-stop')) { void run('chat.stop', { conversationId: cid }).catch(() => undefined); return; }
      this.close();
      this.hooks.openChat(cid);
    });
    document.addEventListener('pointerdown', (e) => {
      if (this.root.hidden) return;
      const t = e.target as Node;
      if (this.root.contains(t) || this.anchor?.contains(t)) return;
      this.close();
    });
    document.addEventListener('keydown', (e) => { if (e.key === 'Escape' && !this.root.hidden) this.close(); });
    state.on('running', () => { if (!this.root.hidden) void this.refresh(); });
    state.on('conversations', () => { if (!this.root.hidden) this.paint(); });
  }

  get open(): boolean {
    return !this.root.hidden;
  }

  toggle(anchor: HTMLElement): void {
    if (!this.root.hidden) { this.close(); return; }
    this.anchor = anchor;
    const r = anchor.getBoundingClientRect();
    this.root.style.top = `${Math.round(r.bottom + 6)}px`;
    this.root.style.right = `${Math.max(8, Math.round(window.innerWidth - r.right))}px`;
    this.items = this.fromState();
    this.paint();
    this.root.hidden = false;
    setAttr(anchor, 'aria-expanded', 'true');
    void this.refresh();
    this.tick = window.setInterval(() => this.paint(), 5000);
  }

  close(): void {
    if (this.root.hidden) return;
    this.root.hidden = true;
    window.clearInterval(this.tick);
    if (this.anchor) setAttr(this.anchor, 'aria-expanded', 'false');
  }

  private fromState(): BackgroundItem[] {
    const ids = new Set([...this.state.running, ...this.state.waiting.keys()]);
    const known = new Map(this.items.map((i) => [i.conversationId, i]));
    return [...ids].map((cid) => known.get(cid) ?? { conversationId: cid, title: this.state.conversations.get(cid)?.title ?? 'Chat', status: this.state.waiting.has(cid) ? 'waiting' : 'running', started: null, schedule: null });
  }

  async refresh(): Promise<void> {
    const seq = ++this.seq;
    try {
      const got = await run<{ items: BackgroundItem[] }>('background.list');
      if (seq !== this.seq) return;
      this.items = got.items;
    } catch {
      this.items = this.fromState();
    }
    this.paint();
  }

  private paint(): void {
    const ids = new Set(this.items.map((i) => i.conversationId));
    for (const [id, row] of this.rows) if (!ids.has(id)) { row.remove(); this.rows.delete(id); }
    this.items.forEach((it, i) => {
      let row = this.rows.get(it.conversationId);
      if (!row) {
        row = el(`<div class="ft-bg-row" role="listitem" data-cid="${esc(it.conversationId)}"><span class="ft-bg-dot"></span>
          <button type="button" class="ft-bg-text"><span class="ft-bg-title"></span><span class="ft-bg-meta"></span></button>
          <button type="button" class="ft-icon-btn ft-bg-stop" aria-label="Stop" title="Stop">${ui('stop', 14)}</button></div>`);
        this.rows.set(it.conversationId, row);
      }
      const title = this.state.conversations.get(it.conversationId)?.title ?? it.title;
      setAttr(row, 'data-status', it.status);
      setText(q(row, '.ft-bg-title'), title);
      setText(q(row, '.ft-bg-meta'), [it.status === 'waiting' ? 'Waiting for you' : 'Working', it.schedule ? `scheduled: ${it.schedule.name}` : '', since(it.started)].filter(Boolean).join(' · '));
      if (this.list.children[i] !== row) this.list.insertBefore(row, this.list.children[i] ?? null);
    });
    const any = this.items.length > 0;
    if (this.none.hidden !== any) this.none.hidden = any;
    setText(q(this.root, '.ft-bg-count'), any ? String(this.items.length) : '');
  }
}
