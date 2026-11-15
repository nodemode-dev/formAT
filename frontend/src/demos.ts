import { run } from './engine-client/api';
import type { Conversation, Message } from './state/app-state';

export interface DemoDef {
  id: string;
  title: string;
  blurb: string;
}

export const DEMOS: readonly DemoDef[] = [
  { id: 'northern-light', title: 'Aurora page', blurb: 'A calm animated page: the northern lights over a mountain lake, reacting to the pointer.' },
  { id: 'harbour-ferries', title: 'Ferry dashboard', blurb: 'An operations dashboard for an invented ferry operator, with its data as a form.md import package in Outputs.' },
];

export const DEMO_GROUP = 'Demos';

export const demoCommand = (id: string): string => `demo-${id}`;

const rank = (c: Conversation): number => {
  const at = DEMOS.findIndex((d) => d.id === c.demo);
  return at < 0 ? DEMOS.length : at;
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
