import hljs from 'highlight.js/lib/common';
import { el, esc, q, setAttr, setText } from './dom';
import { LANG } from './files-pane';
import { ui } from './icons-ft';
import { renderMarkdown } from './markdown';

export interface Shown { name: string; kind: string; mime?: string; size?: number; entries?: number; id?: string; local?: string; blob?: Blob }

const TEXT_CAP = 2 * 1024 * 1024;
const SNIPPET = 1024;
const HIGHLIGHT_CAP = 300_000;
const READY_WAIT = 4000;
const TEXTY = /\.(txt|md|markdown|csv|tsv|json|ya?ml|toml|xml|html?|css|m?js|tsx?|jsx|py|rs|go|java|kt|swift|c|h|cpp|hpp|cs|rb|php|sh|bat|sql|ini|cfg|lua|r|dart|scala|vue|svelte|log|svg)$/i;

export function guessKind(f: File): string {
  const t = f.type, n = f.name.toLowerCase();
  if (/^image\/(png|jpeg|gif|webp)$/.test(t)) return 'image';
  if (t === 'application/pdf' || n.endsWith('.pdf')) return 'pdf';
  if (n.endsWith('.zip') || n.endsWith('.plugin')) return 'zip';
  if (t.startsWith('video/')) return 'video';
  if (t.startsWith('audio/')) return 'audio';
  if (t.startsWith('text/') || TEXTY.test(n)) return 'text';
  return 'binary';
}

const picture = (f: Shown): boolean => f.kind === 'image' || f.mime === 'image/svg+xml' || /\.svg$/i.test(f.name);
const fileUrl = (f: Shown): string => f.local ?? `/api/uploads/${encodeURIComponent(f.id ?? '')}`;
const ext = (n: string): string => (n.includes('.') ? (n.split('.').pop() ?? '').toUpperCase().slice(0, 6) : '');
const clock = (s: number): string => (Number.isFinite(s) ? `${Math.floor(s / 60)}:${String(Math.floor(s % 60)).padStart(2, '0')}` : '');

export function kindLabel(f: Shown): string {
  return f.kind === 'zip' ? `ZIP ${f.entries ?? 0}` : f.kind === 'text' || f.kind === 'binary' ? ext(f.name) || f.kind.toUpperCase() : f.kind.toUpperCase();
}

function sizeOf(n?: number): string {
  if (n === undefined) return '';
  return n < 1024 ? `${n} B` : n < 1024 * 1024 ? `${(n / 1024).toFixed(1)} KB` : `${(n / 1024 / 1024).toFixed(1)} MB`;
}

function settle(target: EventTarget, events: string[]): Promise<void> {
  return new Promise((done) => {
    const finish = () => { events.forEach((e) => target.removeEventListener(e, finish)); window.clearTimeout(timer); done(); };
    const timer = window.setTimeout(finish, READY_WAIT);
    events.forEach((e) => target.addEventListener(e, finish, { once: true }));
  });
}

async function head(f: Shown, bytes: number): Promise<{ text: string; cut: boolean }> {
  if (f.blob) return { text: await f.blob.slice(0, bytes).text(), cut: f.blob.size > bytes };
  const res = await fetch(fileUrl(f), { headers: { range: `bytes=0-${bytes - 1}` } });
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  const text = await res.text();
  return { text: text.slice(0, bytes), cut: res.status === 206 ? (f.size ?? 0) > bytes : text.length > bytes };
}

export function preview(card: HTMLElement, f: Shown): void {
  if (card.querySelector('.ft-attach-view')) return;
  const url = fileUrl(f);
  if (picture(f)) {
    const view = el(`<span class="ft-attach-view" aria-hidden="true"><img alt="" decoding="async" loading="lazy"></span>`);
    q<HTMLImageElement>(view, 'img').src = url;
    card.classList.add('is-picture');
    card.prepend(view);
  } else if (f.kind === 'video') {
    const view = el(`<span class="ft-attach-view" aria-hidden="true"><video muted playsinline preload="metadata"></video><span class="ft-attach-play">${ui('play', 16)}</span><span class="ft-attach-dur"></span></span>`);
    const v = q<HTMLVideoElement>(view, 'video');
    v.addEventListener('loadedmetadata', () => setText(q(view, '.ft-attach-dur'), clock(v.duration)), { once: true });
    v.src = `${url}#t=0.1`;
    card.classList.add('is-picture');
    card.prepend(view);
  } else if (f.kind === 'audio') {
    const view = el(`<span class="ft-attach-view is-audio" aria-hidden="true">${ui('wave', 22)}<span class="ft-attach-dur"></span></span>`);
    const a = document.createElement('audio');
    a.preload = 'metadata';
    a.addEventListener('loadedmetadata', () => { setText(q(view, '.ft-attach-dur'), clock(a.duration)); a.removeAttribute('src'); a.load(); }, { once: true });
    a.src = url;
    card.classList.add('is-audio');
    card.prepend(view);
  } else if (f.kind === 'text') {
    const view = el('<span class="ft-attach-view is-text" aria-hidden="true"><span class="ft-attach-lines"></span></span>');
    card.classList.add('is-text');
    card.prepend(view);
    void head(f, SNIPPET).then((r) => setText(q(view, '.ft-attach-lines'), r.text.split('\n').slice(0, 6).join('\n'))).catch(() => undefined);
  }
}

class Viewer {
  private root: HTMLElement;
  private stage: HTMLElement;
  private items: Shown[] = [];
  private at = 0;
  private seq = 0;
  private back: HTMLElement | null = null;

  constructor() {
    this.root = el(`<div class="ft-viewer" role="dialog" aria-modal="true" aria-label="File preview" hidden>
      <div class="ft-viewer-bar"><div class="ft-viewer-title"><span class="ft-viewer-name"></span><span class="ft-viewer-meta"></span></div>
        <span class="ft-viewer-count"></span>
        <a class="ft-icon-btn ft-viewer-dl" title="Download" aria-label="Download">${ui('download', 16)}</a>
        <button type="button" class="ft-icon-btn ft-viewer-x" title="Close (Esc)" aria-label="Close preview">${ui('close', 16)}</button></div>
      <div class="ft-viewer-stage"></div>
      <button type="button" class="ft-viewer-nav is-prev" aria-label="Previous file">${ui('chevronLeft', 18)}</button>
      <button type="button" class="ft-viewer-nav is-next" aria-label="Next file">${ui('chevronRight', 18)}</button></div>`);
    this.stage = q(this.root, '.ft-viewer-stage');
    document.body.appendChild(this.root);
    q(this.root, '.ft-viewer-x').addEventListener('click', () => this.close());
    q(this.root, '.is-prev').addEventListener('click', () => this.step(-1));
    q(this.root, '.is-next').addEventListener('click', () => this.step(1));
    this.root.addEventListener('keydown', (e) => {
      const t = e.target as HTMLElement;
      if (e.key === 'Escape') { e.preventDefault(); this.close(); }
      else if ((e.key === 'ArrowLeft' || e.key === 'ArrowRight') && !t.closest('video, audio, iframe, .ft-viewer-doc')) { e.preventDefault(); this.step(e.key === 'ArrowLeft' ? -1 : 1); }
    });
    this.stage.addEventListener('click', (e) => {
      const t = e.target as HTMLElement;
      if (t.classList.contains('ft-viewer-layer')) this.close();
      else if (t.matches('.ft-viewer-img')) t.closest('.ft-viewer-layer')?.classList.toggle('is-zoomed');
    });
  }

  open(items: Shown[], index: number): void {
    this.back = document.activeElement as HTMLElement | null;
    this.items = items;
    if (this.root.hidden) this.root.hidden = false;
    this.root.classList.toggle('is-single', items.length < 2);
    void this.show(index);
    q(this.root, '.ft-viewer-x').focus();
  }

  close(): void {
    this.seq++;
    this.root.hidden = true;
    [...this.stage.children].forEach((c) => this.drop(c as HTMLElement));
    this.back?.focus?.();
  }

  private step(d: number): void {
    if (this.items.length < 2) return;
    void this.show((this.at + d + this.items.length) % this.items.length);
  }

  private drop(layer: HTMLElement): void {
    layer.querySelectorAll<HTMLMediaElement>('video, audio').forEach((m) => m.pause());
    layer.remove();
  }

  private async show(index: number): Promise<void> {
    const f = this.items[index];
    if (!f) return;
    const seq = ++this.seq;
    const url = fileUrl(f);
    const layer = el('<div class="ft-viewer-layer is-loading"></div>');
    let ready: Promise<unknown> = Promise.resolve();
    if (picture(f)) {
      const img = el<HTMLImageElement>(`<img class="ft-viewer-img" alt="${esc(f.name)}">`);
      img.src = url;
      layer.appendChild(img);
      ready = img.decode().catch(() => undefined);
    } else if (f.kind === 'video' || f.kind === 'audio') {
      const media = el<HTMLMediaElement>(f.kind === 'video' ? '<video class="ft-viewer-video" controls playsinline preload="metadata"></video>' : '<audio class="ft-viewer-audio" controls preload="metadata"></audio>');
      media.src = url;
      layer.appendChild(f.kind === 'audio' ? el(`<div class="ft-viewer-sound">${ui('wave', 40)}<span class="ft-viewer-sound-name"></span></div>`) : media);
      if (f.kind === 'audio') { setText(q(layer, '.ft-viewer-sound-name'), f.name); q(layer, '.ft-viewer-sound').appendChild(media); }
      ready = settle(media, ['loadedmetadata', 'error']);
    } else if (f.kind === 'pdf') {
      const frame = el<HTMLIFrameElement>(`<iframe class="ft-viewer-frame" title="${esc(f.name)}" referrerpolicy="no-referrer"></iframe>`);
      ready = settle(frame, ['load']);
      frame.src = url;
      layer.appendChild(frame);
    } else if (f.kind === 'text') {
      try {
        const doc = await head(f, TEXT_CAP);
        if (seq !== this.seq) return;
        const box = el('<div class="ft-viewer-doc" tabindex="0"></div>');
        const lang = LANG[(f.name.split('.').pop() ?? '').toLowerCase()];
        if (/\.(md|markdown)$/i.test(f.name)) {
          box.classList.add('ft-md');
          box.innerHTML = renderMarkdown(doc.text);
        } else {
          let html = esc(doc.text);
          if (lang && hljs.getLanguage(lang) && doc.text.length <= HIGHLIGHT_CAP) {
            try { html = hljs.highlight(doc.text, { language: lang, ignoreIllegals: true }).value; } catch { html = esc(doc.text); }
          }
          box.classList.add('ft-code');
          box.innerHTML = `<pre><code>${html}</code></pre>`;
        }
        if (doc.cut) box.appendChild(el(`<p class="ft-viewer-note">Showing the first 2 MB of ${sizeOf(f.size)}; download the file for the rest.</p>`));
        layer.appendChild(box);
      } catch {
        layer.appendChild(el(`<div class="ft-viewer-none">${ui('file', 28)}<p>This file could not be read for a preview.</p></div>`));
      }
    } else {
      layer.appendChild(el(`<div class="ft-viewer-none">${ui('file', 28)}<p></p></div>`));
      setText(q(layer, '.ft-viewer-none p'), `No preview for this kind of file (${kindLabel(f)}${f.size !== undefined ? `, ${sizeOf(f.size)}` : ''}). Download it to open it.`);
    }
    this.stage.appendChild(layer);
    await ready;
    if (seq !== this.seq) { this.drop(layer); return; }
    [...this.stage.children].forEach((c) => { if (c !== layer) this.drop(c as HTMLElement); });
    layer.classList.remove('is-loading');
    this.at = index;
    setText(q(this.root, '.ft-viewer-name'), f.name);
    setText(q(this.root, '.ft-viewer-meta'), [kindLabel(f), sizeOf(f.size)].filter(Boolean).join(' · '));
    setText(q(this.root, '.ft-viewer-count'), this.items.length > 1 ? `${index + 1} of ${this.items.length}` : '');
    const dl = q<HTMLAnchorElement>(this.root, '.ft-viewer-dl');
    setAttr(dl, 'href', f.local ?? `${url}?download=1`);
    setAttr(dl, 'download', f.name);
  }
}

let viewer: Viewer | null = null;

export function openViewer(items: Shown[], index: number): void {
  viewer ??= new Viewer();
  viewer.open(items, index);
}
