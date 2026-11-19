import { App } from './app';
import { health, run } from './engine-client/api';
import { EventStream } from './engine-client/events';
import { loadWindowKey } from './engine-client/window-key';
import { mountBootFrame } from './ui/boot-frame';
import { VERSION } from './version';

interface AppInfo {
  version: string;
  providers: Record<string, boolean>;
  commands: number;
}

const host = document.getElementById('app') as HTMLElement;
let frame: ReturnType<typeof mountBootFrame>;

async function probe(): Promise<void> {
  try {
    const h = await health();
    frame.set('engine', h.version === VERSION ? 'ok' : 'warn', h.version === VERSION ? `v${h.version} on ${location.host}` : `v${h.version}, window is v${VERSION}`);
    const info = await run<AppInfo>('app.info');
    frame.set('anthropic', info.providers.anthropic ? 'ok' : 'warn', info.providers.anthropic ? 'set' : 'not set: add one in Settings, API keys');
    frame.set('commands', 'ok', `${info.commands} registered`);
  } catch {
    frame.set('engine', 'bad', 'not answering: ./format backend');
    frame.set('anthropic', 'idle', 'unknown');
    frame.set('commands', 'idle', 'unknown');
  }
}

function bootFallback(): void {
  frame = mountBootFrame(host, VERSION);
  const stream = new EventStream();
  stream.onState((state) => {
    frame.set('events', state === 'open' ? 'ok' : state === 'connecting' ? 'idle' : 'bad', state === 'open' ? 'connected' : state);
    if (state !== 'open') return;
    let last = 0;
    try { last = Number(sessionStorage.getItem('format.bootReload')) || 0; } catch { last = 0; }
    window.setTimeout(() => {
      try { sessionStorage.setItem('format.bootReload', String(Date.now())); } catch { last = 0; }
      location.reload();
    }, Math.max(0, 15000 - (Date.now() - last)));
  });
  stream.start();
  void probe();
}

function reveal(): void {
  document.body.classList.add('app-ready');
  const shell = (window as unknown as { __TAURI__?: { core?: { invoke(cmd: string): Promise<unknown> } } }).__TAURI__;
  if (shell?.core) requestAnimationFrame(() => { void shell.core?.invoke('app_ready').catch(() => undefined); });
}

const app = new App(host);
const ready = Promise.all([document.fonts.ready, loadWindowKey().then(() => app.load())]);
ready.then(() => {
  reveal();
  app.setView('chat');
}, () => {
  host.replaceChildren();
  bootFallback();
  void document.fonts.ready.then(reveal);
});
