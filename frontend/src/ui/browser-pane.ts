import { run } from '../engine-client/api';
import { el, q, setAttr, setText } from './dom';
import { ui } from './icons-ft';

export interface BrowserStatus { available: boolean; open: boolean; url: string; title: string; seq: number; error: string; busy: boolean }

const KEYS = new Set(['Enter', 'Backspace', 'Tab', 'Escape', 'ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight', 'Delete', 'Home', 'End', 'PageUp', 'PageDown']);

export class BrowserPane {
  readonly root: HTMLElement;
  private input: HTMLInputElement;
  private body: HTMLElement;
  private img: HTMLImageElement;
  private empty: HTMLElement;
  private note: HTMLElement;
  private msg: HTMLElement;
  private shownSeq = -1;
  private wantSeq = 0;
  private loading = false;
  private objectUrl = '';
  private typed = '';
  private typeTimer = 0;
  private wheelAt = 0;
  private status: BrowserStatus | null = null;
  private visible = false;

  constructor(private close: () => void, private onStatus: (s: BrowserStatus) => void = () => undefined) {
    this.root = el(`<aside class="ft-browser" aria-label="Browser">
      <div class="ft-art-head ft-br-head">
        <button type="button" class="ft-icon-btn" data-br="back" title="Back" aria-label="Back">${ui('back', 16)}</button>
        <button type="button" class="ft-icon-btn" data-br="forward" title="Forward" aria-label="Forward">${ui('chevronRight', 16)}</button>
        <button type="button" class="ft-icon-btn" data-br="reload" title="Reload" aria-label="Reload">${ui('retry', 16)}</button>
        <form class="ft-br-url" role="search"><input class="ft-input ft-br-input" aria-label="Address" placeholder="Type a URL" spellcheck="false" autocomplete="off"></form>
        <button type="button" class="ft-icon-btn ft-br-close" title="Close" aria-label="Close the browser">${ui('close', 16)}</button>
      </div>
      <div class="ft-br-body" tabindex="0" aria-label="Page; click and type to use it">
        <img class="ft-br-frame" alt="" draggable="false" hidden>
        <div class="ft-page-empty ft-br-empty">${ui('globe', 28)}<p class="ft-br-note"></p></div>
        <p class="ft-br-msg" aria-live="polite" hidden></p>
      </div>
    </aside>`);
    this.input = q<HTMLInputElement>(this.root, '.ft-br-input');
    this.body = q(this.root, '.ft-br-body');
    this.img = q<HTMLImageElement>(this.root, '.ft-br-frame');
    this.empty = q(this.root, '.ft-br-empty');
    this.note = q(this.root, '.ft-br-note');
    this.msg = q(this.root, '.ft-br-msg');
    q(this.root, '.ft-br-close').addEventListener('click', () => this.close());
    q(this.root, '.ft-br-url').addEventListener('submit', (e) => {
      e.preventDefault();
      const url = this.input.value.trim();
      if (url) void this.act('browser.open', { url });
      this.body.focus();
    });
    this.root.querySelectorAll<HTMLElement>('[data-br]').forEach((b) => b.addEventListener('click', () => void this.act('browser.act', { action: b.dataset.br })));
    this.img.addEventListener('click', (e) => {
      const r = this.img.getBoundingClientRect();
      if (!r.width || !r.height) return;
      this.flushTyping();
      void this.act('browser.act', { action: 'click_at', x: (e.clientX - r.left) / r.width, y: (e.clientY - r.top) / r.height });
      this.body.focus();
    });
    this.body.addEventListener('wheel', (e) => {
      if (this.img.hidden) return;
      e.preventDefault();
      const now = performance.now();
      if (now - this.wheelAt < 250) return;
      this.wheelAt = now;
      void this.act('browser.act', { action: 'scroll', direction: e.deltaY < 0 ? 'up' : 'down' });
    }, { passive: false });
    this.body.addEventListener('keydown', (e) => {
      if (this.img.hidden || e.metaKey || e.ctrlKey || e.altKey) return;
      if (e.key.length === 1) {
        e.preventDefault();
        this.typed += e.key;
        window.clearTimeout(this.typeTimer);
        this.typeTimer = window.setTimeout(() => this.flushTyping(), 150);
      } else if (KEYS.has(e.key)) {
        e.preventDefault();
        this.flushTyping();
        void this.act('browser.act', { action: 'press', key: e.key });
      }
    });
  }

  get isVisible(): boolean {
    return this.visible;
  }

  async show(): Promise<void> {
    this.visible = true;
    try {
      this.update(await run<BrowserStatus>('browser.status'));
    } catch (err) {
      this.say(err instanceof Error ? err.message : String(err));
    }
  }

  hide(): void {
    this.visible = false;
  }

  update(s: BrowserStatus): void {
    this.status = s;
    this.onStatus(s);
    if (document.activeElement !== this.input && this.input.value !== s.url) this.input.value = s.url;
    setAttr(this.input, 'title', s.title || null);
    if ((this.body.dataset.busy === '1') !== s.busy) {
      if (s.busy) this.body.dataset.busy = '1';
      else delete this.body.dataset.busy;
    }
    const note = !s.available ? 'The built-in browser is not installed. Run ./format install-browser, then restart Format.'
      : s.error ? s.error : 'Type a URL above to browse here. Claude uses this same browser when it needs to click through a site, and you can watch and take over.';
    setText(this.note, note);
    if (s.seq > 0 && s.open) {
      this.wantSeq = s.seq;
      if (this.visible) void this.loadFrame();
    } else if (!s.open && !this.img.hidden) {
      this.img.hidden = true;
      this.empty.hidden = false;
      this.shownSeq = -1;
    }
  }

  private async loadFrame(): Promise<void> {
    if (this.loading || this.wantSeq === this.shownSeq) return;
    this.loading = true;
    const seq = this.wantSeq;
    try {
      const res = await fetch(`/api/browser/frame?s=${seq}`, { cache: 'no-store' });
      if (res.status === 200) {
        const url = URL.createObjectURL(await res.blob());
        const pre = new Image();
        pre.src = url;
        await pre.decode();
        this.img.src = url;
        if (this.objectUrl) URL.revokeObjectURL(this.objectUrl);
        this.objectUrl = url;
        this.shownSeq = seq;
        if (this.img.hidden) { this.img.hidden = false; this.empty.hidden = true; }
      }
    } catch {
      this.shownSeq = seq;
    } finally {
      this.loading = false;
    }
    if (this.wantSeq !== this.shownSeq && this.visible) void this.loadFrame();
  }

  private flushTyping(): void {
    window.clearTimeout(this.typeTimer);
    if (!this.typed) return;
    const text = this.typed;
    this.typed = '';
    void this.act('browser.act', { action: 'keys', text });
  }

  private async act(cmd: string, params: Record<string, unknown>): Promise<void> {
    this.say('');
    try {
      this.update(await run<BrowserStatus>(cmd, params));
    } catch (err) {
      this.say(err instanceof Error ? err.message : String(err));
    }
  }

  private say(text: string): void {
    setText(this.msg, text);
    if (this.msg.hidden === !!text) this.msg.hidden = !text;
  }

  get current(): BrowserStatus | null {
    return this.status;
  }
}
