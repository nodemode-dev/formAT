import { el, q, readPref, writePref } from './dom';
import { ui, type UiIcon } from './icons-ft';

const RAIL_KEY = 'format.prefsRailCollapsed';
const SPOT_KEY = 'format.prefsSpot';
const FOCUSABLE = 'a[href], button:not(:disabled), input:not(:disabled), select:not(:disabled), textarea:not(:disabled)';

const setClass = (node: Element, name: string, on: boolean): void => { if (node.classList.contains(name) !== on) node.classList.toggle(name, on); };

export class PrefsWindow {
  readonly scrim: HTMLElement;
  readonly pages: HTMLElement;
  private frame: HTMLElement;
  private head: HTMLElement;
  private nav: HTMLElement;
  private rail: HTMLElement;
  private port: HTMLElement;
  private shade: SVGPathElement;
  private line: SVGPathElement;
  private sections = new Map<string, HTMLElement>();
  private current = '';
  private spyRaf = 0;
  private wireRaf = 0;
  private wireReveal = false;
  private spyMuted = 0;
  private wireD = '';
  private portY = -1;
  private lastFocus: HTMLElement | null = null;
  private spot = { x: 0, y: 0 };
  private offset = { x: 0, y: 0 };

  constructor(title: string) {
    this.scrim = el(`<div class="ft-prefs-scrim" hidden><div class="ft-prefs-dlg" role="dialog" aria-modal="true" aria-labelledby="ft-prefs-title" tabindex="-1">
      <div class="ft-prefs-head"><span class="ft-prefs-headicon">${ui('settings', 16)}</span><span class="ft-prefs-title" id="ft-prefs-title"></span><button class="ft-prefs-close" type="button" data-close title="Close" aria-label="Close">${ui('close', 16)}</button></div>
      <div class="ft-prefs-body"><div class="ft-prefs"><div class="ft-prefs-pages"></div></div></div>
      <div class="ft-prefs-foot"><button class="ft-btn ft-btn-primary" type="button" data-close>Done</button></div>
      <div class="ft-prefs-rail"><div class="ft-prefs-nav" role="tablist" aria-label="Settings sections"></div><button class="ft-prefs-fold" type="button">${ui('chevronsLeft', 16)}</button></div>
      <svg class="ft-prefs-wire" aria-hidden="true"><path class="ft-prefs-wire-shade"></path><path class="ft-prefs-wire-line"></path></svg>
      <span class="ft-prefs-port" aria-hidden="true"></span>
    </div></div>`);
    this.frame = q(this.scrim, '.ft-prefs-dlg');
    this.head = q(this.scrim, '.ft-prefs-head');
    this.pages = q(this.scrim, '.ft-prefs-pages');
    this.nav = q(this.scrim, '.ft-prefs-nav');
    this.rail = q(this.scrim, '.ft-prefs-rail');
    this.port = q(this.scrim, '.ft-prefs-port');
    this.shade = this.scrim.querySelector('.ft-prefs-wire-shade') as SVGPathElement;
    this.line = this.scrim.querySelector('.ft-prefs-wire-line') as SVGPathElement;
    q(this.scrim, '.ft-prefs-title').textContent = title;
    this.scrim.querySelectorAll<HTMLElement>('[data-close]').forEach((b) => b.addEventListener('click', () => this.close()));
    this.scrim.addEventListener('pointerdown', (e) => { if (e.target === this.scrim) this.close(); });
    this.scrim.addEventListener('keydown', (e) => {
      e.stopPropagation();
      if (e.key === 'Escape') { e.preventDefault(); this.close(); }
      if (e.key === 'Tab' && !e.altKey && !e.ctrlKey && !e.metaKey) this.tab(e);
    });

    let collapsed = readPref(RAIL_KEY, '0') === '1';
    const fold = q<HTMLButtonElement>(this.scrim, '.ft-prefs-fold');
    const paintRail = (): void => {
      setClass(this.frame, 'is-rail-collapsed', collapsed);
      fold.title = collapsed ? 'Expand tabs' : 'Collapse tabs';
      fold.setAttribute('aria-label', fold.title);
      fold.setAttribute('aria-expanded', String(!collapsed));
    };
    fold.addEventListener('click', () => {
      collapsed = !collapsed;
      writePref(RAIL_KEY, collapsed ? '1' : '0');
      paintRail();
      this.queueWire();
    });
    paintRail();

    try {
      const s = JSON.parse(readPref(SPOT_KEY, '{}')) as { x?: unknown; y?: unknown };
      if (typeof s.x === 'number' && typeof s.y === 'number') this.spot = { x: s.x, y: s.y };
    } catch {
      this.spot = { x: 0, y: 0 };
    }
    this.bindMove();

    this.pages.addEventListener('scroll', () => this.queueSpy(), { passive: true });
    this.nav.addEventListener('scroll', () => this.queueWire(false), { passive: true });
    new ResizeObserver(() => this.queueWire()).observe(this.frame);
    window.addEventListener('resize', () => this.queueWire());
    document.getElementById('overlay-root')?.appendChild(this.scrim);
  }

  get isOpen(): boolean { return !this.scrim.hidden; }

  add(name: string, icon: UiIcon, ...content: Array<string | HTMLElement>): void {
    const tab = el<HTMLButtonElement>(`<button class="ft-prefs-railtab" type="button" role="tab" aria-selected="false"><span class="ft-prefs-tabicon">${ui(icon, 18)}</span><span class="ft-prefs-tablabel"></span></button>`);
    tab.dataset.section = name;
    tab.title = name;
    q(tab, '.ft-prefs-tablabel').textContent = name;
    tab.addEventListener('click', () => this.showSection(name, 'smooth'));
    this.nav.appendChild(tab);
    const page = el(`<section class="ft-prefs-page ft-prefs-sec" role="tabpanel"><button class="ft-prefs-sechead" type="button" aria-expanded="true"><span class="ft-prefs-secicon">${ui(icon, 16)}</span><span class="ft-prefs-seclabel"></span><span class="ft-prefs-chev">${ui('chevronDown', 16)}</span></button><div class="ft-prefs-secbody"></div></section>`);
    page.dataset.section = name;
    page.setAttribute('aria-label', name);
    q(page, '.ft-prefs-seclabel').textContent = name;
    q(page, '.ft-prefs-sechead').addEventListener('click', () => this.foldSection(name));
    const body = q(page, '.ft-prefs-secbody');
    for (const part of content) {
      if (typeof part !== 'string') { body.appendChild(part); continue; }
      const t = document.createElement('template');
      t.innerHTML = part.trim();
      body.appendChild(t.content);
    }
    this.pages.appendChild(page);
    this.sections.set(name, page);
    if (!this.current) this.markSection(name);
  }

  arrange(names: string[]): void {
    const cards = new Map<string, HTMLElement>();
    for (const name of names) {
      const tab = this.nav.querySelector<HTMLElement>(`[data-section="${name}"]`), card = this.sections.get(name);
      if (!tab || !card) continue;
      this.nav.appendChild(tab);
      this.pages.appendChild(card);
      cards.set(name, card);
    }
    for (const [name, card] of this.sections) if (!cards.has(name)) cards.set(name, card);
    this.sections = cards;
  }

  show(section?: string): void {
    const to = section && this.sections.has(section) ? section : '';
    if (to) this.markSection(to);
    const opening = this.scrim.hidden;
    if (opening) {
      this.lastFocus = document.activeElement instanceof HTMLElement ? document.activeElement : null;
      this.scrim.hidden = false;
      if (this.spot.x || this.spot.y) this.moveFrame(this.spot.x, this.spot.y);
    }
    if (to) this.scrollToSection(to, 'auto');
    this.wireReveal = true;
    this.drawWire();
    if (opening || to) {
      const target = this.sections.get(this.current)?.querySelector<HTMLElement>('.ft-prefs-secbody input:not(:disabled), .ft-prefs-secbody select:not(:disabled), .ft-prefs-secbody textarea') ?? q(this.scrim, '.ft-prefs-foot .ft-btn-primary');
      target.focus({ preventScroll: true });
      if (!this.scrim.contains(document.activeElement)) this.frame.focus();
    }
    this.queueWire();
  }

  close(): void {
    if (!this.isOpen) return;
    this.scrim.hidden = true;
    if (this.scrim.contains(document.activeElement)) (document.activeElement as HTMLElement).blur();
    if (this.lastFocus?.isConnected) this.lastFocus.focus();
    this.lastFocus = null;
  }

  private tab(e: KeyboardEvent): void {
    const items = Array.from(this.frame.querySelectorAll<HTMLElement>(FOCUSABLE)).filter((n) => n.getClientRects().length > 0);
    if (!items.length) return;
    const first = items[0], last = items[items.length - 1], at = document.activeElement;
    if (e.shiftKey && (at === first || at === this.frame)) { e.preventDefault(); last.focus(); }
    else if (!e.shiftKey && at === last) { e.preventDefault(); first.focus(); }
  }

  private moveFrame(x: number, y: number): void {
    const was = this.offset, r = this.frame.getBoundingClientRect();
    if (!r.width) return;
    const left = r.left - was.x, top = r.top - was.y;
    const nx = Math.round(Math.min(Math.max(x, 48 - r.width - left), window.innerWidth - 48 - left)), ny = Math.round(Math.min(Math.max(y, -top), window.innerHeight - 44 - top));
    this.offset = { x: nx, y: ny };
    this.spot = { x: nx, y: ny };
    const want = nx || ny ? `${nx}px ${ny}px` : '';
    if (this.frame.style.translate !== want) this.frame.style.translate = want;
  }

  private bindMove(): void {
    const head = this.head;
    head.addEventListener('pointerdown', (e) => {
      if (e.button !== 0 || (e.target as HTMLElement).closest('button')) return;
      const at = { ...this.spot }, sx = e.clientX, sy = e.clientY;
      head.setPointerCapture(e.pointerId);
      const move = (ev: PointerEvent): void => this.moveFrame(at.x + ev.clientX - sx, at.y + ev.clientY - sy);
      const up = (): void => {
        head.removeEventListener('pointermove', move);
        head.removeEventListener('pointerup', up);
        head.removeEventListener('pointercancel', up);
        writePref(SPOT_KEY, JSON.stringify(this.spot));
      };
      head.addEventListener('pointermove', move);
      head.addEventListener('pointerup', up);
      head.addEventListener('pointercancel', up);
    });
  }

  private showSection(name: string, scroll: ScrollBehavior | null = null): void {
    if (!this.sections.has(name)) return;
    this.markSection(name);
    if (scroll) this.scrollToSection(name, scroll);
  }

  private markSection(name: string): void {
    if (this.current === name) return;
    this.current = name;
    for (const [n, page] of this.sections) setClass(page, 'is-current', n === name);
    for (const tab of Array.from(this.nav.children) as HTMLElement[]) {
      const on = tab.dataset.section === name;
      setClass(tab, 'is-active', on);
      tab.setAttribute('aria-selected', String(on));
    }
    this.queueWire();
  }

  private scrollToSection(name: string, behavior: ScrollBehavior): void {
    const sec = this.sections.get(name);
    if (!sec) return;
    if (sec.classList.contains('is-folded')) this.foldSection(name);
    const top = sec.getBoundingClientRect().top - this.pages.getBoundingClientRect().top + this.pages.scrollTop - 12;
    this.spyMuted = performance.now() + 700;
    this.pages.scrollTo({ top, behavior });
  }

  private foldSection(name: string): void {
    const sec = this.sections.get(name);
    if (!sec) return;
    const folded = !sec.classList.contains('is-folded');
    setClass(sec, 'is-folded', folded);
    q(sec, '.ft-prefs-secbody').hidden = folded;
    q(sec, '.ft-prefs-sechead').setAttribute('aria-expanded', String(!folded));
    this.queueWire();
    this.queueSpy();
  }

  private queueSpy(): void {
    if (this.spyRaf) return;
    this.spyRaf = requestAnimationFrame(() => {
      this.spyRaf = 0;
      const pages = this.pages;
      if (!pages.clientHeight || performance.now() < this.spyMuted) return;
      const edge = pages.getBoundingClientRect().top + 24;
      const names = Array.from(this.sections.keys());
      let best = '', bestD = Infinity;
      if (pages.scrollHeight > pages.clientHeight + 4 && pages.scrollTop + pages.clientHeight >= pages.scrollHeight - 2) best = names[names.length - 1] ?? '';
      else for (const [n, sec] of this.sections) {
        const top = sec.getBoundingClientRect().top, d = top <= edge ? edge - top : top - edge + 100000;
        if (d < bestD) { bestD = d; best = n; }
      }
      if (best) this.markSection(best);
    });
  }

  private queueWire(reveal = true): void {
    if (reveal) this.wireReveal = true;
    if (this.wireRaf) return;
    this.wireRaf = requestAnimationFrame(() => { this.wireRaf = 0; this.drawWire(); });
  }

  private drawWire(): void {
    const reveal = this.wireReveal;
    this.wireReveal = false;
    if (this.scrim.hidden) return;
    const F = this.frame.getBoundingClientRect();
    const tab = this.nav.querySelector<HTMLElement>('.ft-prefs-railtab.is-active');
    const R = this.rail.getBoundingClientRect();
    if (!F.width || !R.width || !tab) return;
    const N = this.nav.getBoundingClientRect();
    let T = tab.getBoundingClientRect();
    if (reveal && (T.top < N.top || T.bottom > N.bottom)) {
      this.nav.scrollTop += T.top < N.top ? T.top - N.top - 6 : T.bottom - N.bottom + 6;
      T = tab.getBoundingClientRect();
    }
    const H = this.head.getBoundingClientRect();
    const mid = Math.min(Math.max(T.top + T.height / 2, N.top), N.bottom);
    const portY = Math.round(H.bottom - F.top), sx = Math.round(T.right - F.left), ty = Math.round(mid - F.top);
    const rr = R.right - F.left, trunk = Math.round(rr - rr * 0.45), dy = portY - ty, r = 10, dir = dy > 0 ? 1 : -1;
    const d = Math.abs(dy) < 2 * r ? `M ${sx} ${ty} H ${trunk} V ${portY} H -7` : `M ${sx} ${ty} H ${trunk - r} a ${r} ${r} 0 0 ${dir > 0 ? 1 : 0} ${r} ${dir * r} V ${portY - dir * r} a ${r} ${r} 0 0 ${dir > 0 ? 0 : 1} ${r} ${dir * r} H -7`;
    if (d !== this.wireD) { this.wireD = d; this.shade.setAttribute('d', d); this.line.setAttribute('d', d); }
    if (portY !== this.portY) { this.portY = portY; this.port.style.transform = `translateY(${portY}px)`; }
  }
}
