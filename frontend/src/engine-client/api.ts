export interface CommandReply<T> {
  ok: boolean;
  command: string;
  result?: T;
  error?: string;
}

export const NOT_ANSWERING = "FormAT's engine is not answering. Try again in a moment.";

export class EngineError extends Error {
  constructor(message: string, readonly command: string, readonly status: number) {
    super(message);
  }
}

export async function health(): Promise<{ ok: boolean; name: string; version: string }> {
  const res = await fetch('/api/health');
  if (!res.ok) throw new EngineError(`engine answered ${res.status}`, 'health', res.status);
  return res.json();
}

export async function run<T>(id: string, params: Record<string, unknown> = {}): Promise<T> {
  const res = await fetch(`/api/commands/${encodeURIComponent(id)}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(params),
  }).catch(() => {
    throw new EngineError(NOT_ANSWERING, id, 0);
  });
  let body: CommandReply<T>;
  try {
    body = await res.json();
  } catch {
    throw new EngineError(`engine answered ${res.status} without JSON`, id, res.status);
  }
  if (!res.ok || !body.ok) throw new EngineError(body.error || `engine answered ${res.status}`, id, res.status);
  return body.result as T;
}
