import type { View } from '../state/app-state';
import { el, esc, q, setText } from './dom';
import { ui, type UiIcon } from './icons-ft';

const PAGES: Record<Exclude<View, 'chat' | 'settings'>, [string, UiIcon, string]> = {
  projects: ['Projects', 'projects', 'Projects keep instructions, knowledge files and their chats together. They arrive in v0.6.0.'],
  artifacts: ['Artifacts', 'artifacts', 'Pages, documents and files Claude makes, with versions, collected from every chat. They arrive in v0.5.0.'],
  scheduled: ['Scheduled', 'clock', 'Tasks that run on a schedule, with their history. They arrive in v0.7.0.'],
  customize: ['Customize', 'customize', 'Skills, connectors (MCP servers) and providers, each with its own page. They arrive in v0.6.0.'],
};

export function pageView(view: Exclude<View, 'chat' | 'settings'>): HTMLElement {
  const [title, ic, body] = PAGES[view];
  return el(`<section class="ft-page" data-view="${view}" hidden>
    <header class="ft-page-head"><h1>${esc(title)}</h1></header>
    <div class="ft-page-empty">${ui(ic, 28)}<p>${esc(body)}</p></div>
  </section>`);
}

export interface InfoLike {
  version: string;
  dataDir: string;
  providers: Record<string, boolean>;
  commands: number;
}

export class SettingsView {
  readonly root: HTMLElement;

  constructor() {
    this.root = el(`<section class="ft-page" data-view="settings" hidden>
      <header class="ft-page-head"><h1>Settings</h1></header>
      <dl class="ft-facts">
        <div><dt>Version</dt><dd data-k="version">checking</dd></div>
        <div><dt>Anthropic key</dt><dd data-k="anthropic">checking</dd></div>
        <div><dt>OpenAI key</dt><dd data-k="openai">checking</dd></div>
        <div><dt>Data folder</dt><dd data-k="dataDir">checking</dd></div>
        <div><dt>Engine commands</dt><dd data-k="commands">checking</dd></div>
      </dl>
      <p class="ft-page-note">Keys live in <code>backend/.env</code> and never reach this window. Appearance follows the form family's theme profiles.</p>
    </section>`);
  }

  fill(info: InfoLike): void {
    const set = (k: string, v: string) => setText(q(this.root, `[data-k="${k}"]`), v);
    set('version', `v${info.version}`);
    set('anthropic', info.providers.anthropic ? 'set' : 'not set');
    set('openai', info.providers.openai ? 'set' : 'not set');
    set('dataDir', info.dataDir);
    set('commands', String(info.commands));
  }
}
