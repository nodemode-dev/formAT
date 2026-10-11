import { health, run } from './engine-client/api';
import { EventStream } from './engine-client/events';
import { mountBootFrame } from './ui/boot-frame';
import { VERSION } from './version';

interface AppInfo {
  version: string;
  providers: Record<string, boolean>;
  commands: number;
}

const host = document.getElementById('app') as HTMLElement;
const frame = mountBootFrame(host, VERSION);

async function probe(): Promise<void> {
  try {
    const h = await health();
    frame.set('engine', h.version === VERSION ? 'ok' : 'warn', h.version === VERSION ? `v${h.version} on 127.0.0.1:8490` : `v${h.version}, window is v${VERSION}`);
    const info = await run<AppInfo>('app.info');
    frame.set('anthropic', info.providers.anthropic ? 'ok' : 'warn', info.providers.anthropic ? 'set in backend/.env' : 'not set: backend/.env');
    frame.set('commands', 'ok', `${info.commands} registered`);
  } catch {
    frame.set('engine', 'bad', 'not answering: ./format backend');
    frame.set('anthropic', 'idle', 'unknown');
    frame.set('commands', 'idle', 'unknown');
  }
}

const stream = new EventStream();
stream.onState((state) => {
  frame.set('events', state === 'open' ? 'ok' : state === 'connecting' ? 'idle' : 'bad', state === 'open' ? 'connected' : state);
  if (state === 'open') void probe();
});

void document.fonts.ready.then(() => {
  document.body.classList.add('app-ready');
});
stream.start();
void probe();
