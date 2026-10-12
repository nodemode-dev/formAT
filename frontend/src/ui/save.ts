import { run } from '../engine-client/api';
import { el, setText } from './dom';

let desktop = false;
let toastTimer = 0;
let toast: HTMLElement | null = null;

export function setDesktop(on: boolean): void {
  if (desktop === on) return;
  desktop = on;
  if (on) document.documentElement.dataset.ftDesktop = '1';
  else delete document.documentElement.dataset.ftDesktop;
}

function notify(text: string): void {
  const host = document.getElementById('toast-root');
  if (!host) return;
  if (!toast) {
    toast = el('<div class="ft-toast" role="status" aria-live="polite"></div>');
    host.appendChild(toast);
  }
  setText(toast, text);
  toast.classList.add('is-on');
  window.clearTimeout(toastTimer);
  toastTimer = window.setTimeout(() => toast?.classList.remove('is-on'), 4000);
}

function isDownload(a: HTMLAnchorElement): boolean {
  if (!a.href) return false;
  let url: URL;
  try { url = new URL(a.href, location.href); } catch { return false; }
  if (url.origin !== location.origin || !url.pathname.startsWith('/api/')) return false;
  return a.hasAttribute('download') || url.searchParams.get('download') === '1' || /\/export\/[^/]+$/.test(url.pathname);
}

export function save(href: string): void {
  if (!desktop) {
    const link = document.createElement('a');
    link.href = href;
    link.download = '';
    link.click();
    return;
  }
  const url = new URL(href, location.href);
  notify('Saving to Downloads');
  void run<{ name: string; folder: string }>('files.save_download', { url: url.pathname + url.search })
    .then((r) => notify(`Saved ${r.name} to Downloads`))
    .catch((err) => notify(err instanceof Error ? err.message : String(err)));
}

export function interceptDownloads(): void {
  document.addEventListener('click', (e) => {
    if (!desktop || e.defaultPrevented || e.button !== 0) return;
    const a = (e.target as HTMLElement | null)?.closest?.('a[href]') as HTMLAnchorElement | null;
    if (!a || a.getAttribute('aria-disabled') === 'true' || a.hasAttribute('data-own-click') || !isDownload(a)) return;
    e.preventDefault();
    save(a.href);
  }, true);
}
