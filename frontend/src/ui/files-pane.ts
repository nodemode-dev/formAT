import hljs from 'highlight.js/lib/common';
import { run } from '../engine-client/api';
import type { FileComment, WorkFile } from '../state/app-state';
import { el, esc, q, setAttr, setText } from './dom';
import { ui } from './icons-ft';
import { renderMarkdown } from './markdown';

export interface FilesHooks {
  close(): void;
  comment(c: FileComment): void;
}

interface ReadReply { path: string; kind: string; size: number; modified: number; truncated: boolean; text: string }

export const LANG: Record<string, string> = {
  py: 'python', js: 'javascript', mjs: 'javascript', ts: 'typescript', tsx: 'typescript', jsx: 'javascript', json: 'json', css: 'css', scss: 'scss',
  html: 'xml', htm: 'xml', xml: 'xml', svg: 'xml', sh: 'bash', bash: 'bash', rs: 'rust', go: 'go', java: 'java', c: 'c', h: 'c', cpp: 'cpp', hpp: 'cpp',
  cs: 'csharp', rb: 'ruby', php: 'php', sql: 'sql', yaml: 'yaml', yml: 'yaml', toml: 'ini', ini: 'ini', md: 'markdown', kt: 'kotlin', swift: 'swift', lua: 'lua', r: 'r',
};
const HIGHLIGHT_CAP = 300_000;
const READY_WAIT = 4000;

function size(n: number): string {
  return n < 1024 ? `${n} B` : n < 1024 * 1024 ? `${(n / 1024).toFixed(1)} KB` : `${(n / 1024 / 1024).toFixed(1)} MB`;
}

function settle(target: EventTarget, events: string[]): Promise<void> {
  return new Promise((done) => {
    const finish = () => { events.forEach((e) => target.removeEventListener(e, finish)); window.clearTimeout(timer); done(); };
    const timer = window.setTimeout(finish, READY_WAIT);
    events.forEach((e) => target.addEventListener(e, finish, { once: true }));
  });
}

export class FilesPane {
  readonly root: HTMLElement;
  private title: HTMLElement;
  private count: HTMLElement;
  private back: HTMLButtonElement;
  private pop: HTMLAnchorElement;
  private dl: HTMLAnchorElement;
  private body: HTMLElement;
  private list: HTMLElement;
  private empty: HTMLElement;
  private view: HTMLElement;
  private cbtn: HTMLButtonElement;
  private cform: HTMLElement;
  private cquote: HTMLElement;
  private cnote: HTMLTextAreaElement;
  private files: WorkFile[] = [];
  private current: WorkFile | null = null;
  private chat: string | null = null;
  private seq = 0;
  private listSeq = 0;
  private pending = '';

  constructor(private hooks: FilesHooks) {
    this.root = el(`<aside class="ft-files" aria-label="Files">
      <div class="ft-art-head">
        <button type="button" class="ft-icon-btn ft-files-back" aria-label="All files" title="All files" hidden>${ui('back', 16)}</button>
        <span class="ft-art-title ft-files-title">Files</span>
        <span class="ft-files-count"></span>
        <span class="ft-art-spacer"></span>
        <a class="ft-icon-btn ft-files-pop" target="_blank" rel="noopener" title="Open in a new tab" aria-label="Open in a new tab" hidden>${ui('external', 16)}</a>
        <a class="ft-icon-btn ft-files-dl" title="Download" aria-label="Download" hidden>${ui('download', 16)}</a>
        <button type="button" class="ft-icon-btn ft-files-close" title="Close" aria-label="Close files">${ui('close', 16)}</button>
      </div>
      <div class="ft-files-body">
        <div class="ft-files-list" role="list"></div>
        <div class="ft-files-empty" hidden>${ui('folder', 20)}<p>Files Claude writes or changes in this chat's folder appear here.</p></div>
        <div class="ft-files-view" hidden></div>
        <button type="button" class="ft-btn ft-files-cbtn" hidden>${ui('comment', 14)}<span>Comment</span></button>
        <div class="ft-files-cform" hidden>
          <span class="ft-files-cquote"></span>
          <textarea class="ft-input" rows="3" maxlength="4000" placeholder="What should Claude change or check here?" aria-label="Comment for Claude"></textarea>
          <div class="ft-files-cactions"><button type="button" class="ft-btn ft-files-ccancel">Cancel</button><button type="button" class="ft-btn ft-btn-primary ft-files-cadd">Add to message</button></div>
        </div>
      </div>
    </aside>`);
    this.title = q(this.root, '.ft-files-title');
    this.count = q(this.root, '.ft-files-count');
    this.back = q<HTMLButtonElement>(this.root, '.ft-files-back');
    this.pop = q<HTMLAnchorElement>(this.root, '.ft-files-pop');
    this.dl = q<HTMLAnchorElement>(this.root, '.ft-files-dl');
    this.body = q(this.root, '.ft-files-body');
    this.list = q(this.root, '.ft-files-list');
    this.empty = q(this.root, '.ft-files-empty');
    this.view = q(this.root, '.ft-files-view');
    this.cbtn = q<HTMLButtonElement>(this.root, '.ft-files-cbtn');
    this.cform = q(this.root, '.ft-files-cform');
    this.cquote = q(this.root, '.ft-files-cquote');
    this.cnote = q<HTMLTextAreaElement>(this.cform, 'textarea');
    q(this.root, '.ft-files-close').addEventListener('click', () => this.hooks.close());
    this.back.addEventListener('click', () => this.showList());
    this.list.addEventListener('click', (e) => {
      const path = (e.target as HTMLElement).closest<HTMLElement>('[data-path]')?.dataset.path;
      if (path) void this.open(path);
    });
    this.view.addEventListener('click', (e) => {
      const btn = (e.target as HTMLElement).closest<HTMLButtonElement>('.ft-code-copy');
      if (!btn) return;
      const code = btn.closest('.ft-code')?.querySelector('code')?.textContent ?? '';
      void navigator.clipboard?.writeText(code).then(() => { btn.textContent = 'Copied'; window.setTimeout(() => { btn.textContent = 'Copy'; }, 1500); });
    });
    this.view.addEventListener('mouseover', (e) => this.hoverBlock(e.target as HTMLElement));
    this.body.addEventListener('mouseleave', () => {
      const sel = document.getSelection();
      if (this.cform.hidden && (!sel || sel.isCollapsed)) this.hideCommentButton();
    });
    this.view.addEventListener('scroll', () => { if (this.cform.hidden) this.hideCommentButton(); }, { capture: true, passive: true });
    document.addEventListener('selectionchange', () => this.onSelection());
    this.cbtn.addEventListener('mousedown', (e) => e.preventDefault());
    this.cbtn.addEventListener('click', () => this.startComment());
    q(this.cform, '.ft-files-ccancel').addEventListener('click', () => this.endComment());
    q(this.cform, '.ft-files-cadd').addEventListener('click', () => this.addComment());
    this.cnote.addEventListener('keydown', (e) => {
      if (e.key === 'Escape') { e.preventDefault(); this.endComment(); }
      else if (e.key === 'Enter' && (e.metaKey || e.ctrlKey)) { e.preventDefault(); this.addComment(); }
    });
  }

  get conversationId(): string | null {
    return this.chat;
  }

  get previewing(): string | null {
    return this.current?.path ?? null;
  }

  async show(cid: string, path?: string): Promise<boolean> {
    if (this.chat !== cid) this.reset();
    this.chat = cid;
    if (!(await this.refresh())) return false;
    if (path) return this.open(path);
    if (this.current) return true;
    this.showList();
    return true;
  }

  async refresh(): Promise<boolean> {
    const cid = this.chat;
    if (!cid) return false;
    const seq = ++this.listSeq;
    const got = await run<{ files: WorkFile[]; truncated: boolean }>('files.list', { conversationId: cid });
    if (seq !== this.listSeq || cid !== this.chat) return false;
    this.files = got.files;
    const html = got.files.map((f) => {
      const cut = f.path.lastIndexOf('/');
      const dir = cut > 0 ? f.path.slice(0, cut + 1) : '';
      return `<button type="button" class="ft-files-row" role="listitem" data-path="${esc(f.path)}" title="${esc(f.path)}"><span class="ft-files-icon">${ui('file', 16)}</span><span class="ft-files-name">${esc(f.name)}</span><span class="ft-files-dir">${esc(dir)}</span><span class="ft-files-size">${size(f.size)}</span></button>`;
    }).join('');
    if (this.list.dataset.v !== html) { this.list.dataset.v = html; this.list.innerHTML = html; }
    const none = got.files.length === 0;
    if (this.empty.hidden !== (!none || !!this.current)) this.empty.hidden = !none || !!this.current;
    if (!this.current) setText(this.count, none ? '' : `${got.files.length}${got.truncated ? '+' : ''} file${got.files.length === 1 ? '' : 's'}`);
    const cur = this.current;
    if (cur) {
      const now = got.files.find((f) => f.path === cur.path);
      if (!now) this.showList();
      else if (now.modified !== cur.modified || now.size !== cur.size) void this.open(now.path).catch(() => this.showList());
    }
    return true;
  }

  async open(path: string): Promise<boolean> {
    const cid = this.chat;
    if (!cid) return false;
    const seq = ++this.seq;
    let f = this.files.find((x) => x.path === path);
    if (!f) {
      await this.refresh();
      f = this.files.find((x) => x.path === path);
    }
    if (!f) throw new Error(`${path} is no longer in this chat's folder`);
    const layer = el('<div class="ft-fv-layer is-loading"></div>');
    let ready: Promise<void> = Promise.resolve();
    const v = `inline=1&v=${Math.round(f.modified * 1000)}`;
    if (f.kind === 'image') {
      const img = el<HTMLImageElement>(`<img class="ft-fv-img" alt="${esc(f.name)}">`);
      img.src = `${f.url}?${v}`;
      layer.appendChild(el('<div class="ft-fv-media"></div>')).appendChild(img);
      ready = img.decode().catch(() => undefined);
    } else if (f.kind === 'video' || f.kind === 'audio') {
      const media = el<HTMLMediaElement>(f.kind === 'video' ? '<video class="ft-fv-video" controls preload="metadata"></video>' : '<audio class="ft-fv-audio" controls preload="metadata"></audio>');
      media.src = `${f.url}?${v}`;
      layer.appendChild(el('<div class="ft-fv-media"></div>')).appendChild(media);
      ready = settle(media, ['loadedmetadata', 'error']);
    } else if (f.kind === 'pdf' || f.kind === 'html') {
      const frame = el<HTMLIFrameElement>(`<iframe class="ft-fv-frame" title="${esc(f.name)}" referrerpolicy="no-referrer"></iframe>`);
      if (f.kind === 'html') frame.setAttribute('sandbox', '');
      ready = settle(frame, ['load']);
      frame.src = `${f.url}?${v}`;
      layer.appendChild(frame);
    } else if (f.kind === 'markdown' || f.kind === 'code') {
      const doc = await run<ReadReply>('files.read', { conversationId: cid, path });
      if (seq !== this.seq) return false;
      if (f.kind === 'markdown') {
        const box = el('<div class="ft-md ft-fv-doc" data-commentable="block"></div>');
        box.innerHTML = renderMarkdown(doc.text);
        layer.appendChild(box);
      } else {
        const lang = LANG[(f.name.split('.').pop() ?? '').toLowerCase()];
        let html = esc(doc.text);
        if (lang && hljs.getLanguage(lang) && doc.text.length <= HIGHLIGHT_CAP) {
          try { html = hljs.highlight(doc.text, { language: lang, ignoreIllegals: true }).value; } catch { html = esc(doc.text); }
        }
        layer.appendChild(el(`<div class="ft-code ft-fv-code" data-commentable="text"><pre><code>${html}</code></pre></div>`));
      }
      if (doc.truncated) layer.appendChild(el(`<p class="ft-fv-note">Showing the first 1 MB of ${size(doc.size)}; download the file for the rest.</p>`));
    } else {
      layer.appendChild(el(`<div class="ft-files-empty">${ui('file', 20)}<p>No preview for this kind of file (${esc(f.kind)}, ${size(f.size)}). Download it to open it.</p></div>`));
    }
    this.view.appendChild(layer);
    await ready;
    if (seq !== this.seq) { layer.remove(); return false; }
    [...this.view.children].forEach((c) => { if (c !== layer) c.remove(); });
    layer.classList.remove('is-loading');
    this.current = f;
    this.endComment();
    setText(this.title, f.name);
    setAttr(this.title, 'title', f.path);
    setText(this.count, '');
    setAttr(this.pop, 'href', `${f.url}?inline=1`);
    setAttr(this.dl, 'href', f.url);
    this.toggle(true);
    return true;
  }

  private toggle(preview: boolean): void {
    if (this.view.hidden === preview) this.view.hidden = !preview;
    if (this.list.hidden !== preview) this.list.hidden = preview;
    if (this.back.hidden === preview) this.back.hidden = !preview;
    if (this.pop.hidden === preview) this.pop.hidden = !preview;
    if (this.dl.hidden === preview) this.dl.hidden = !preview;
    const none = !preview && this.files.length === 0;
    if (this.empty.hidden === none) this.empty.hidden = !none;
  }

  pause(): void {
    this.view.querySelectorAll<HTMLMediaElement>('video, audio').forEach((m) => { if (!m.paused) m.pause(); });
    this.endComment();
  }

  showList(): void {
    ++this.seq;
    this.current = null;
    this.endComment();
    setText(this.title, 'Files');
    setAttr(this.title, 'title', null);
    setText(this.count, this.files.length ? `${this.files.length} file${this.files.length === 1 ? '' : 's'}` : '');
    this.toggle(false);
    this.view.replaceChildren();
  }

  reset(): void {
    ++this.seq;
    ++this.listSeq;
    this.chat = null;
    this.current = null;
    this.files = [];
    this.endComment();
    this.view.replaceChildren();
    this.list.dataset.v = '';
    this.list.replaceChildren();
    setText(this.title, 'Files');
    setText(this.count, '');
    this.toggle(false);
  }

  private placeButton(rect: DOMRect): void {
    const box = this.body.getBoundingClientRect();
    const top = Math.max(4, Math.min(rect.top - box.top - 36, box.height - 40));
    const left = Math.max(4, Math.min(rect.right - box.left - 96, box.width - 104));
    this.cbtn.style.transform = `translate(${Math.round(left)}px, ${Math.round(top)}px)`;
    if (this.cbtn.hidden) this.cbtn.hidden = false;
  }

  private hideCommentButton(): void {
    if (!this.cbtn.hidden) this.cbtn.hidden = true;
  }

  private onSelection(): void {
    if (!this.current || !this.cform.hidden) return;
    const sel = document.getSelection();
    if (!sel || sel.isCollapsed || !sel.rangeCount) return;
    const range = sel.getRangeAt(0);
    const host = (range.commonAncestorContainer instanceof Element ? range.commonAncestorContainer : range.commonAncestorContainer.parentElement)?.closest('[data-commentable]');
    if (!host || !this.view.contains(host)) return;
    const text = sel.toString().trim();
    if (!text) return;
    this.pending = text;
    this.placeButton(range.getBoundingClientRect());
  }

  private hoverBlock(t: HTMLElement): void {
    if (!this.cform.hidden) return;
    const sel = document.getSelection();
    if (sel && !sel.isCollapsed && this.view.contains(sel.anchorNode)) return;
    const doc = t.closest<HTMLElement>('[data-commentable="block"]');
    if (!doc) return;
    let block: HTMLElement | null = t;
    while (block && block.parentElement !== doc) block = block.parentElement;
    if (!block || block === doc) return;
    const text = (block.textContent ?? '').trim();
    if (!text) return;
    this.pending = text;
    this.placeButton(block.getBoundingClientRect());
  }

  private startComment(): void {
    if (!this.current || !this.pending) return;
    setText(this.cquote, this.pending.length > 400 ? `${this.pending.slice(0, 400)}...` : this.pending);
    this.cnote.value = '';
    this.hideCommentButton();
    if (this.cform.hidden) this.cform.hidden = false;
    this.cnote.focus();
  }

  private addComment(): void {
    const note = this.cnote.value.trim();
    if (!this.current || !note) { this.cnote.focus(); return; }
    this.hooks.comment({ path: this.current.path, quote: this.pending.slice(0, 2000), note });
    this.endComment();
    document.getSelection()?.removeAllRanges();
  }

  private endComment(): void {
    if (!this.cform.hidden) this.cform.hidden = true;
    this.hideCommentButton();
  }
}
