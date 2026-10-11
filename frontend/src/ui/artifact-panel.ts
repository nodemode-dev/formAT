import hljs from 'highlight.js/lib/common';
import { run } from '../engine-client/api';
import type { ArtifactSummary } from '../state/app-state';
import { el, esc, q, setAttr, setText } from './dom';
import { ui } from './icons-ft';

interface Opened extends ArtifactSummary {
  version: number;
  content: string;
  url: string;
  versionsList: Array<{ version: number; created: number; size: number }>;
}

const SANDBOX = 'allow-scripts allow-popups allow-modals allow-downloads';
const HIGHLIGHT_CAP = 300_000;

export class ArtifactPanel {
  readonly root: HTMLElement;
  private title: HTMLElement;
  private select: HTMLSelectElement;
  private tabs: HTMLElement;
  private frames: HTMLIFrameElement[];
  private front = 0;
  private code: HTMLElement;
  private codeBox: HTMLElement;
  private msg: HTMLElement;
  private download: HTMLAnchorElement;
  private popout: HTMLAnchorElement;
  private copy: HTMLButtonElement;
  private current: Opened | null = null;
  private codeFor = '';
  private seq = 0;
  private following = true;
  private tab: 'preview' | 'code' = 'preview';

  constructor(private onClose: () => void) {
    this.root = el(`<aside class="ft-art" aria-label="Artifact">
      <div class="ft-art-head">
        <span class="ft-art-title"></span>
        <select class="ft-art-ver" aria-label="Version"></select>
        <span class="ft-art-tabs" role="tablist"><button type="button" role="tab" data-tab="preview" aria-selected="true">Preview</button><button type="button" role="tab" data-tab="code" aria-selected="false">Code</button></span>
        <span class="ft-art-spacer"></span>
        <button type="button" class="ft-icon-btn ft-art-copy" title="Copy the code" aria-label="Copy the code">${ui('copy', 16)}</button>
        <a class="ft-icon-btn ft-art-dl" title="Download" aria-label="Download">${ui('download', 16)}</a>
        <a class="ft-icon-btn ft-art-pop" target="_blank" rel="noopener" title="Open in a new tab" aria-label="Open in a new tab">${ui('external', 16)}</a>
        <button type="button" class="ft-icon-btn ft-art-close" title="Close" aria-label="Close the artifact">${ui('close', 16)}</button>
      </div>
      <div class="ft-art-body">
        <iframe class="ft-art-frame" sandbox="${SANDBOX}" referrerpolicy="no-referrer" title="Artifact preview"></iframe>
        <iframe class="ft-art-frame" sandbox="${SANDBOX}" referrerpolicy="no-referrer" title="Artifact preview"></iframe>
        <div class="ft-code ft-art-code" hidden><pre><code></code></pre></div>
        <p class="ft-art-msg" hidden></p>
      </div>
    </aside>`);
    this.title = q(this.root, '.ft-art-title');
    this.select = q<HTMLSelectElement>(this.root, '.ft-art-ver');
    this.tabs = q(this.root, '.ft-art-tabs');
    this.frames = [...this.root.querySelectorAll<HTMLIFrameElement>('.ft-art-frame')];
    this.codeBox = q(this.root, '.ft-art-code');
    this.code = q(this.codeBox, 'code');
    this.msg = q(this.root, '.ft-art-msg');
    this.download = q<HTMLAnchorElement>(this.root, '.ft-art-dl');
    this.popout = q<HTMLAnchorElement>(this.root, '.ft-art-pop');
    this.copy = q<HTMLButtonElement>(this.root, '.ft-art-copy');
    q(this.root, '.ft-art-close').addEventListener('click', () => this.onClose());
    this.select.addEventListener('change', () => {
      if (this.current) void this.show(this.current.id, Number(this.select.value));
    });
    this.tabs.addEventListener('click', (e) => {
      const t = (e.target as HTMLElement).closest<HTMLElement>('[data-tab]')?.dataset.tab as 'preview' | 'code' | undefined;
      if (t) this.setTab(t);
    });
    this.copy.addEventListener('click', () => {
      const text = this.current?.content ?? '';
      if (!text) return;
      void navigator.clipboard?.writeText(text).then(() => {
        setAttr(this.copy, 'title', 'Copied');
        window.setTimeout(() => setAttr(this.copy, 'title', 'Copy the code'), 1500);
      });
    });
  }

  get artifactId(): string | null {
    return this.current?.id ?? null;
  }

  get conversationId(): string | null {
    return this.current?.conversationId ?? null;
  }

  async show(id: string, version?: number): Promise<boolean> {
    const seq = ++this.seq;
    let a: Opened;
    try {
      a = await run<Opened>('artifact.get', version ? { id, version } : { id });
    } catch (err) {
      if (seq !== this.seq) return false;
      if (!this.current) throw err;
      this.say(err instanceof Error ? err.message : String(err));
      return true;
    }
    if (seq !== this.seq) return false;
    const loaded = await this.load(a.url);
    if (!loaded || seq !== this.seq) return false;
    this.say('');
    this.current = a;
    this.following = a.version === a.latest;
    setText(this.title, a.title);
    setAttr(this.title, 'title', a.title);
    const opts = a.versionsList.map((v) => `<option value="${v.version}">Version ${v.version}${v.version === a.latest ? ' (latest)' : ''}</option>`).join('');
    if (this.select.dataset.v !== opts) { this.select.dataset.v = opts; this.select.innerHTML = opts; }
    if (this.select.value !== String(a.version)) this.select.value = String(a.version);
    const hideSelect = a.versionsList.length < 2;
    if (this.select.hidden !== hideSelect) this.select.hidden = hideSelect;
    setAttr(this.download, 'href', `${a.url}?download=1`);
    setAttr(this.popout, 'href', a.url);
    if (this.tab === 'code') this.paintCode();
    return true;
  }

  changed(summary: ArtifactSummary, version: number): void {
    if (!this.current || this.current.id !== summary.id) return;
    if (this.following) void this.show(summary.id, version);
    else void this.show(summary.id, this.current.version);
  }

  deleted(id: string): boolean {
    if (this.current?.id !== id) return false;
    this.reset();
    return true;
  }

  reset(): void {
    ++this.seq;
    this.current = null;
    this.codeFor = '';
    for (const f of this.frames) {
      f.onload = null;
      if (f.dataset.src) { f.dataset.src = ''; f.src = 'about:blank'; }
      f.classList.remove('is-front');
    }
  }

  private load(url: string): Promise<boolean> {
    const shown = this.frames[this.front];
    if (shown.dataset.src === url && shown.classList.contains('is-front')) return Promise.resolve(true);
    const back = this.frames[1 - this.front];
    return new Promise((done) => {
      back.onload = () => {
        if (back.dataset.src !== url) { done(false); return; }
        back.onload = null;
        back.classList.add('is-front');
        shown.classList.remove('is-front');
        this.front = 1 - this.front;
        shown.onload = null;
        if (shown.dataset.src) { shown.dataset.src = ''; shown.src = 'about:blank'; }
        done(true);
      };
      back.dataset.src = url;
      back.src = url;
    });
  }

  private setTab(t: 'preview' | 'code'): void {
    this.tab = t;
    this.tabs.querySelectorAll<HTMLElement>('[data-tab]').forEach((b) => setAttr(b, 'aria-selected', String(b.dataset.tab === t)));
    if (this.root.dataset.tab !== t) this.root.dataset.tab = t;
    const showCode = t === 'code';
    if (this.codeBox.hidden === showCode) this.codeBox.hidden = !showCode;
    if (showCode) this.paintCode();
  }

  private paintCode(): void {
    const a = this.current;
    if (!a) return;
    const key = `${a.id}:${a.version}`;
    if (this.codeFor === key) return;
    this.codeFor = key;
    let html = esc(a.content);
    if (a.content.length <= HIGHLIGHT_CAP) {
      try { html = hljs.highlight(a.content, { language: 'xml', ignoreIllegals: true }).value; } catch { html = esc(a.content); }
    }
    this.code.innerHTML = html;
  }

  private say(text: string): void {
    setText(this.msg, text);
    if (this.msg.hidden === !!text) this.msg.hidden = !text;
  }
}
