import { FitAddon } from '@xterm/addon-fit';
import { Terminal } from '@xterm/xterm';
import '@xterm/xterm/css/xterm.css';
import { run } from '../engine-client/api';
import { el, esc, modKey, q, setText } from './dom';
import { ui } from './icons-ft';

interface Tab {
  id: string;
  title: string;
  term: Terminal;
  fit: FitAddon;
  host: HTMLElement;
  tab: HTMLElement;
  socket: WebSocket | null;
}

function token(name: string, fallback: string): string {
  return getComputedStyle(document.documentElement).getPropertyValue(name).trim() || fallback;
}

export class TerminalDock {
  readonly root: HTMLElement;
  private tabsEl: HTMLElement;
  private stage: HTMLElement;
  private tabs = new Map<string, Tab>();
  private active: string | null = null;
  private ro: ResizeObserver;

  constructor(onClose: () => void) {
    this.root = el(`<section class="ft-dock" aria-label="Terminal">
      <div class="ft-dock-head">
        <div class="ft-dock-tabs" role="tablist"></div>
        <button type="button" class="ft-icon-btn ft-dock-new" aria-label="New terminal" title="New terminal">${ui('plus', 16)}</button>
        <span class="ft-dock-spacer"></span>
        <button type="button" class="ft-text-btn ft-dock-restart" aria-label="Restart terminal" title="Restart this terminal's shell">${ui('retry', 16)}<span>Restart</span></button>
        <button type="button" class="ft-text-btn ft-dock-close" aria-label="Hide terminal" title="Hide terminal (${modKey}J); the shells keep running">${ui('hide', 16)}<span>Hide</span></button>
      </div>
      <div class="ft-dock-stage"></div>
    </section>`);
    this.tabsEl = q(this.root, '.ft-dock-tabs');
    this.stage = q(this.root, '.ft-dock-stage');
    q(this.root, '.ft-dock-new').addEventListener('click', () => void this.open());
    q(this.root, '.ft-dock-close').addEventListener('click', onClose);
    q(this.root, '.ft-dock-restart').addEventListener('click', () => void this.restart());
    this.ro = new ResizeObserver(() => this.fitActive());
    this.ro.observe(this.stage);
  }

  async ensure(): Promise<void> {
    if (this.tabs.size === 0) await this.open();
    else this.fitActive();
    this.focus();
  }

  focus(): void {
    if (this.active) this.tabs.get(this.active)?.term.focus();
  }

  private theme() {
    return {
      background: token('--surface-0', '#111111'),
      foreground: token('--text-primary', '#f7f7f7'),
      cursor: token('--accent-color', '#f97316'),
      cursorAccent: token('--surface-0', '#111111'),
      selectionBackground: token('--accent-color-dim', '#f9731633'),
    };
  }

  async open(): Promise<void> {
    const info = await run<{ id: string; title: string }>('terminal.open', { cols: 100, rows: 24 });
    const term = new Terminal({
      fontFamily: token('--font-mono', 'monospace'), fontSize: 13, lineHeight: 1.25, cursorBlink: true,
      scrollback: 5000, allowProposedApi: false, theme: this.theme(), overviewRuler: { width: 0 },
    });
    const fit = new FitAddon();
    term.loadAddon(fit);
    const host = el(`<div class="ft-term" data-id="${esc(info.id)}" hidden></div>`);
    const tab = el(`<button type="button" class="ft-dock-tab" role="tab" data-id="${esc(info.id)}"><span class="ft-dock-tab-title"></span><span class="ft-dock-tab-x" aria-label="Close terminal">${ui('close', 12)}</span></button>`);
    setText(q(tab, '.ft-dock-tab-title'), info.title);
    tab.addEventListener('click', (e) => {
      if ((e.target as HTMLElement).closest('.ft-dock-tab-x')) void this.close(info.id);
      else this.select(info.id);
    });
    this.stage.appendChild(host);
    this.tabsEl.appendChild(tab);
    const t: Tab = { id: info.id, title: info.title, term, fit, host, tab, socket: null };
    this.tabs.set(info.id, t);
    term.open(host);
    this.select(info.id);
    this.connect(t);
  }

  private connect(t: Tab): void {
    const proto = location.protocol === 'https:' ? 'wss:' : 'ws:';
    const socket = new WebSocket(`${proto}//${location.host}/api/terminal/${t.id}`);
    t.socket = socket;
    socket.addEventListener('open', () => this.sendSize(t));
    socket.addEventListener('message', (msg) => {
      const data = String(msg.data);
      if (data.startsWith('{"type": "exit"}') || data === '{"type":"exit"}') {
        t.term.write('\r\n\x1b[2m[shell exited]\x1b[0m\r\n');
        return;
      }
      t.term.write(data);
    });
    t.term.onData((data) => {
      if (socket.readyState === WebSocket.OPEN) socket.send(JSON.stringify({ type: 'input', data }));
    });
  }

  private sendSize(t: Tab): void {
    if (t.socket?.readyState === WebSocket.OPEN) t.socket.send(JSON.stringify({ type: 'resize', cols: t.term.cols, rows: t.term.rows }));
  }

  private fitActive(): void {
    const t = this.active ? this.tabs.get(this.active) : null;
    if (!t || t.host.hidden || this.stage.clientHeight < 20) return;
    const before = `${t.term.cols}x${t.term.rows}`;
    t.fit.fit();
    if (`${t.term.cols}x${t.term.rows}` !== before) this.sendSize(t);
  }

  private select(id: string): void {
    this.active = id;
    for (const [tid, t] of this.tabs) {
      const on = tid === id;
      if (t.host.hidden === on) t.host.hidden = !on;
      t.tab.classList.toggle('is-on', on);
      t.tab.setAttribute('aria-selected', String(on));
    }
    this.fitActive();
    this.focus();
  }

  async restart(): Promise<void> {
    const t = this.active ? this.tabs.get(this.active) : null;
    if (!t) return;
    await run('terminal.restart', { id: t.id }).catch(() => undefined);
    this.sendSize(t);
    t.term.focus();
  }

  private async close(id: string): Promise<void> {
    const t = this.tabs.get(id);
    if (!t) return;
    t.socket?.close();
    t.term.dispose();
    t.host.remove();
    t.tab.remove();
    this.tabs.delete(id);
    await run('terminal.close', { id }).catch(() => undefined);
    if (this.active === id) {
      const next = [...this.tabs.keys()].pop();
      this.active = null;
      if (next) this.select(next);
    }
  }
}
