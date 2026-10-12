export interface Conversation {
  id: string;
  title: string;
  project_id: string | null;
  pinned: boolean;
  model: string | null;
  created: number;
  updated: number;
  activity?: 'running' | 'waiting' | null;
}

export interface ContentBlock {
  type: string;
  text?: string;
  thinking?: string;
  id?: string;
  name?: string;
  input?: Record<string, unknown>;
  tool_use_id?: string;
  content?: unknown;
  is_error?: boolean;
  status?: string | null;
  results?: Array<{ title?: string; url?: string; page_age?: string | null }>;
  url?: string;
  title?: string;
  artifact?: ArtifactRef;
  server?: string;
  server_name?: string;
}

export interface ArtifactRef { id: string; version: number; title: string }

export interface FileComment { path: string; quote: string; note: string }

export interface WorkFile { path: string; name: string; size: number; modified: number; kind: string; url: string }

export interface ArtifactSummary {
  id: string;
  conversationId: string;
  title: string;
  kind: string;
  created: number;
  updated: number;
  versions: number;
  latest: number;
  chatTitle?: string;
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
  compaction?: boolean;
  compactNext?: boolean;
  tools?: Record<string, { status: string }>;
  answers?: Record<string, string[]>;
  agents?: Record<string, { model: string; title?: string; blocks: ContentBlock[] }>;
  artifacts?: Record<string, ArtifactRef>;
  comments?: FileComment[];
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
  autoCompact?: boolean;
  compactAt?: number;
  webTools?: boolean;
  workspaceTools?: boolean;
  toolAllow?: string[];
  agentLimit?: number;
  agentModel?: string;
  artifactNetwork?: boolean;
  memory?: boolean;
  outsideAgents?: 'ask' | 'allowed' | 'blocked';
}

export type View = 'chat' | 'projects' | 'artifacts' | 'scheduled' | 'customize' | 'settings';

type Topic = 'conversations' | 'active' | 'messages' | 'settings' | 'view' | 'account' | 'keys' | 'running' | 'models' | 'projects' | 'skills' | 'memory' | 'connectors';

export interface ConnectorInfo {
  id: string;
  name: string;
  kind: 'url' | 'command';
  url: string;
  command: string;
  hasToken: boolean;
  enabled: boolean;
  route: 'api' | 'local';
  status: string;
  error: string;
  tools: Array<{ name: string; description: string; enabled: boolean }>;
}

export interface SkillSummary { name: string; description: string; enabled: boolean; files: number; size: number; modified: number }

export interface ProjectSummary { id: string; name: string; description: string; instructions: string; created: number; updated: number; chats: number; files: number }

export interface ProjectDetail extends ProjectSummary {
  fileList: Array<FileInfo & { added: number }>;
  chatList: Array<{ id: string; title: string; pinned: boolean; updated: number }>;
}

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
  waiting = new Map<string, Set<string>>();
  projects = new Map<string, ProjectSummary>();
  skills: SkillSummary[] = [];
  connectors: ConnectorInfo[] = [];
  draftProject: string | null = null;
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
