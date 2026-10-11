export interface Conversation {
  id: string;
  title: string;
  project_id: string | null;
  pinned: boolean;
  model: string | null;
  created: number;
  updated: number;
}

export interface ContentBlock {
  type: string;
  text?: string;
  thinking?: string;
}

export interface FileInfo {
  id: string;
  name: string;
  mime: string;
  size: number;
  kind: string;
  entries?: number;
}

export interface MessageMeta {
  status?: 'streaming' | 'done' | 'stopped' | 'error';
  error?: string;
  model?: string;
  stopReason?: string;
  files?: FileInfo[];
  usage?: Record<string, number>;
}

export interface Message {
  id: string;
  conversation_id: string;
  parent_id: string | null;
  role: 'user' | 'assistant';
  content: ContentBlock[];
  created: number;
  meta: MessageMeta;
  branch?: { index: number; count: number; ids: string[] };
}

export interface Model {
  id: string;
  name: string;
  displayName?: string;
  provider: string;
  description: string;
  efforts: string[];
  maxTokens?: number | null;
  contextWindow?: number | null;
}

export interface Account {
  displayName: string;
  preferences: string;
  sendKey: 'enter' | 'modEnter';
  voiceLanguage: string;
}

export interface KeyStatus {
  set: boolean;
  source: string | null;
  hint: string | null;
}

export interface Settings {
  model: string;
  effort: string;
  thinking: boolean;
  permissionMode: string;
}

export type View = 'chat' | 'projects' | 'artifacts' | 'scheduled' | 'customize' | 'settings';

type Topic = 'conversations' | 'active' | 'messages' | 'settings' | 'view' | 'account' | 'keys' | 'running' | 'models';

export class AppState {
  conversations = new Map<string, Conversation>();
  activeId: string | null = null;
  messages: Message[] = [];
  models: Model[] = [];
  efforts: string[] = [];
  settings: Settings = { model: '', effort: 'medium', thinking: true, permissionMode: 'ask' };
  view: View = 'chat';
  anthropicKey = false;
  modelSource = 'fallback';
  modelError: string | null = null;
  account: Account = { displayName: '', preferences: '', sendKey: 'enter', voiceLanguage: 'en-US' };
  keys: Record<string, KeyStatus> = {};
  running = new Set<string>();
  private subs = new Map<Topic, Set<() => void>>();

  on(topic: Topic, fn: () => void): void {
    if (!this.subs.has(topic)) this.subs.set(topic, new Set());
    this.subs.get(topic)!.add(fn);
  }

  emit(topic: Topic): void {
    this.subs.get(topic)?.forEach((fn) => fn());
  }

  sortedConversations(): Conversation[] {
    return [...this.conversations.values()].sort((a, b) => Number(b.pinned) - Number(a.pinned) || b.updated - a.updated);
  }

  model(): Model | undefined {
    return this.models.find((m) => m.id === this.settings.model);
  }
}
