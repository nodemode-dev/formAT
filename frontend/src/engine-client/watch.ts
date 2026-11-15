import type { ConnectionState, EventStream } from './events';

const CHECK_MS = 2000;

async function answers(): Promise<boolean> {
  try {
    const res = await fetch('/api/health', { cache: 'no-store', signal: AbortSignal.timeout(CHECK_MS) });
    return res.ok;
  } catch {
    return false;
  }
}

export function watchEngine(stream: EventStream, onChange: (down: boolean) => void): void {
  let state: ConnectionState = 'connecting';
  let down = false;
  let checking = false;
  let poll = 0;
  const set = (next: boolean): void => {
    if (next === down) return;
    down = next;
    window.clearInterval(poll);
    if (down) poll = window.setInterval(() => void answers().then((ok) => { if (ok) stream.retryNow(); }), CHECK_MS);
    onChange(down);
  };
  stream.onState((next) => {
    state = next;
    if (next === 'open') { set(false); return; }
    if (next !== 'closed' || down || checking) return;
    checking = true;
    void answers().then((ok) => {
      checking = false;
      if (!ok && state !== 'open') set(true);
    });
  });
}
