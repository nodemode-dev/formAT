import { run } from './engine-client/api';
import type { Conversation, Message } from './state/app-state';

export interface DemoDef {
  id: string;
  title: string;
  blurb: string;
}

let demos: readonly DemoDef[] = [];

export const demoList = (): readonly DemoDef[] => demos;

export function setDemoList(found: readonly DemoDef[]): void {
  demos = found.map(({ id, title, blurb }) => ({ id, title, blurb }));
}

export const DEMO_GROUP = 'Demos';

export const demoCommand = (id: string): string => `demo-${id}`;

const rank = (c: Conversation): number => {
  const at = demos.findIndex((d) => d.id === c.demo);
  return at < 0 ? demos.length : at;
};

export function demosFirst(sorted: Conversation[]): Conversation[] {
  const demos = sorted.filter((c) => c.demo && !c.pinned).sort((a, b) => rank(a) - rank(b) || a.created - b.created);
  if (!demos.length) return sorted;
  return [...sorted.filter((c) => c.pinned), ...demos, ...sorted.filter((c) => !c.pinned && !c.demo)];
}

export function demoPage(messages: Message[]): string | null {
  const recorded = messages.find((m) => m.meta?.demo);
  return recorded ? Object.values(recorded.meta.artifacts ?? {})[0]?.id ?? null : null;
}

export async function demoConversation(id: string, known: Iterable<Conversation>): Promise<Conversation> {
  for (const c of known) if (c.demo === id) return c;
  return run<Conversation>('demo.restore', { id });
}
