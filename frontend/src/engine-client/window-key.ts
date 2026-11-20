const HEADER = 'X-Format-Window-Key';
const STORE = 'format-window-key';

let key = '';
let settle: () => void = () => undefined;
const settled = new Promise<void>((resolve) => { settle = resolve; });

function remembered(): string {
  try { return sessionStorage.getItem(STORE) ?? ''; } catch { return ''; }
}

function remember(value: string): void {
  try { sessionStorage.setItem(STORE, value); } catch { return; }
}

export async function loadWindowKey(): Promise<void> {
  try { await claim(); } finally { settle(); }
}

async function claim(): Promise<void> {
  const holder = window as unknown as { __FORMAT_WINDOW_KEY?: unknown };
  const given = holder.__FORMAT_WINDOW_KEY;
  delete holder.__FORMAT_WINDOW_KEY;
  if (typeof given === 'string' && given) { key = given; return; }
  key = remembered();
  if (key && await ticket().catch(() => '')) return;
  key = '';
  try {
    const res = await fetch('/api/window/key', { method: 'POST' });
    const body = res.ok ? await res.json() as { key?: unknown } : {};
    if (typeof body.key === 'string' && body.key) { key = body.key; remember(key); return; }
  } catch { key = ''; }
  key = remembered();
}

export const keyHeaders = (): Record<string, string> => (key ? { [HEADER]: key } : {});

export async function windowHeaders(): Promise<Record<string, string>> {
  await settled;
  return keyHeaders();
}

export async function socketTicket(): Promise<string> {
  await settled;
  return ticket();
}

async function ticket(): Promise<string> {
  const res = await fetch('/api/window/ticket', { method: 'POST', headers: keyHeaders() });
  if (!res.ok) return '';
  const body = await res.json() as { ticket?: unknown };
  return typeof body.ticket === 'string' ? body.ticket : '';
}
