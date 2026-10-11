import { run } from '../engine-client/api';
import type { AppState, KeyStatus, View } from '../state/app-state';
import { el, esc, modKey, q, setText } from './dom';
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

const PROVIDERS: Array<[string, string, string]> = [
  ['anthropic', 'Anthropic', 'Powers chat. Create one at console.anthropic.com.'],
  ['openai', 'OpenAI', 'Optional: dictation transcription in browsers without speech recognition, and the OpenAI provider later.'],
];

function sourceText(k: KeyStatus | undefined): string {
  if (!k || !k.set) return 'Not set';
  const where = k.source === 'format' ? 'saved in Format' : k.source === '.env' ? 'from backend/.env' : 'from the environment';
  return `Set ${k.hint ?? ''} · ${where}`;
}

export class SettingsView {
  readonly root: HTMLElement;
  private saved: HTMLElement;

  constructor(private state: AppState) {
    this.root = el(`<section class="ft-page ft-settings" data-view="settings" hidden>
      <header class="ft-page-head"><h1>Settings</h1></header>
      <section class="ft-set-section" id="ft-set-account" aria-labelledby="ft-set-account-h">
        <h2 id="ft-set-account-h">${ui('user', 16)}<span>Account</span></h2>
        <label class="ft-field"><span>What should Claude call you?</span><input class="ft-input" data-a="displayName" maxlength="80" autocomplete="name"></label>
        <label class="ft-field"><span>How Claude should respond</span><textarea class="ft-input" data-a="preferences" rows="4" maxlength="8000" placeholder="For example: answer briefly, use British spelling, show code in TypeScript"></textarea><small>Sent with every chat, after Format's own instructions.</small></label>
        <div class="ft-field-row">
          <label class="ft-field"><span>Send with</span><select class="ft-input" data-a="sendKey"><option value="enter">Enter (Shift+Enter for a new line)</option><option value="modEnter">${esc(modKey)}Enter (Enter for a new line)</option></select></label>
          <label class="ft-field"><span>Dictation language</span><input class="ft-input" data-a="voiceLanguage" maxlength="16" placeholder="en-US"></label>
        </div>
        <div class="ft-set-actions"><button type="button" class="ft-btn ft-btn-primary ft-save-account">Save</button><span class="ft-saved" aria-live="polite"></span></div>
      </section>
      <section class="ft-set-section" id="ft-set-chats" aria-labelledby="ft-set-chats-h">
        <h2 id="ft-set-chats-h">${ui('compress', 16)}<span>Long chats</span></h2>
        <p class="ft-set-note">When a chat fills most of the model's context window, Claude summarizes the earlier messages after a reply and continues from the summary. The earlier messages stay on screen; images and files in them are not carried into the summary. You can also run it from the command palette.</p>
        <div class="ft-field-row">
          <label class="ft-field ft-check"><input type="checkbox" data-s="autoCompact"><span>Summarize long chats automatically</span></label>
          <label class="ft-field"><span>Summarize at</span><select class="ft-input" data-s="compactAt"><option value="0.5">50% of the context window</option><option value="0.65">65% of the context window</option><option value="0.75">75% of the context window</option><option value="0.85">85% of the context window</option></select></label>
        </div>
      </section>
      <section class="ft-set-section" id="ft-set-keys" aria-labelledby="ft-set-keys-h">
        <h2 id="ft-set-keys-h">${ui('key', 16)}<span>API keys</span></h2>
        <p class="ft-set-note">A key saved here is stored in Format's data folder with owner-only permissions and takes precedence over <code>backend/.env</code>. You can keep keys in <code>backend/.env</code> instead (copy <code>backend/.env.example</code>); remove the saved key here and the .env one is used again. Keys never come back to this window.</p>
        ${PROVIDERS.map(([id, label, note]) => `<div class="ft-key-row" data-p="${id}">
          <div class="ft-key-head"><span class="ft-key-name">${label}</span><span class="ft-key-status">checking</span></div>
          <small class="ft-key-note">${esc(note)}</small>
          <div class="ft-key-form"><input class="ft-input" type="password" autocomplete="off" spellcheck="false" placeholder="Paste a new ${label} key" aria-label="${label} API key"><button type="button" class="ft-btn ft-key-save">Save</button><button type="button" class="ft-btn ft-key-clear" hidden>Remove</button></div>
          <small class="ft-key-msg" aria-live="polite"></small>
        </div>`).join('')}
      </section>
      <section class="ft-set-section" id="ft-set-about" aria-labelledby="ft-set-about-h">
        <h2 id="ft-set-about-h">${ui('settings', 16)}<span>About</span></h2>
        <dl class="ft-facts">
          <div><dt>Version</dt><dd data-k="version">checking</dd></div>
          <div><dt>Data folder</dt><dd data-k="dataDir">checking</dd></div>
          <div><dt>Engine commands</dt><dd data-k="commands">checking</dd></div>
          <div><dt>Dictation</dt><dd data-k="voice">checking</dd></div>
        </dl>
      </section>
    </section>`);
    this.saved = q(this.root, '.ft-saved');
    q(this.root, '.ft-save-account').addEventListener('click', () => void this.saveAccount());
    this.root.querySelectorAll<HTMLElement>('.ft-key-row').forEach((row) => {
      const provider = row.dataset.p as string;
      const input = q<HTMLInputElement>(row, 'input');
      const msg = q(row, '.ft-key-msg');
      const save = async () => {
        const key = input.value.trim();
        if (!key) return;
        try {
          await run('keys.set', { provider, key });
          input.value = '';
          setText(msg, 'Saved.');
        } catch (e) {
          setText(msg, e instanceof Error ? e.message : String(e));
        }
      };
      q(row, '.ft-key-save').addEventListener('click', () => void save());
      input.addEventListener('keydown', (e) => { if (e.key === 'Enter') void save(); });
      q(row, '.ft-key-clear').addEventListener('click', async () => {
        await run('keys.clear', { provider }).catch(() => undefined);
        setText(msg, 'Removed from Format.');
      });
    });
    const auto = q<HTMLInputElement>(this.root, '[data-s="autoCompact"]');
    const at = q<HTMLSelectElement>(this.root, '[data-s="compactAt"]');
    auto.addEventListener('change', () => void run('settings.set', { key: 'autoCompact', value: auto.checked }).catch(() => undefined));
    at.addEventListener('change', () => void run('settings.set', { key: 'compactAt', value: Number(at.value) }).catch(() => undefined));
    state.on('account', () => this.fillAccount());
    state.on('keys', () => this.fillKeys());
    state.on('settings', () => this.fillChats());
    this.fillChats();
  }

  private fillChats(): void {
    const s = this.state.settings;
    const auto = q<HTMLInputElement>(this.root, '[data-s="autoCompact"]');
    const at = q<HTMLSelectElement>(this.root, '[data-s="compactAt"]');
    const on = s.autoCompact !== false;
    if (auto.checked !== on) auto.checked = on;
    const want = String(s.compactAt ?? 0.75);
    if (![...at.options].some((o) => o.value === want)) at.add(new Option(`${Math.round(Number(want) * 100)}% of the context window`, want));
    if (at.value !== want) at.value = want;
    if (at.disabled === on) at.disabled = !on;
  }

  private async saveAccount(): Promise<void> {
    const get = (k: string) => (q<HTMLInputElement>(this.root, `[data-a="${k}"]`)).value;
    try {
      await run('account.set', { displayName: get('displayName'), preferences: get('preferences'), sendKey: get('sendKey'), voiceLanguage: get('voiceLanguage') || 'en-US' });
      setText(this.saved, 'Saved.');
    } catch (e) {
      setText(this.saved, e instanceof Error ? e.message : String(e));
    }
  }

  private fillAccount(): void {
    const a = this.state.account;
    const put = (k: string, v: string) => { const f = q<HTMLInputElement>(this.root, `[data-a="${k}"]`); if (document.activeElement !== f && f.value !== v) f.value = v; };
    put('displayName', a.displayName);
    put('preferences', a.preferences);
    put('sendKey', a.sendKey);
    put('voiceLanguage', a.voiceLanguage);
  }

  private fillKeys(): void {
    this.root.querySelectorAll<HTMLElement>('.ft-key-row').forEach((row) => {
      const k = this.state.keys[row.dataset.p as string];
      setText(q(row, '.ft-key-status'), sourceText(k));
      q(row, '.ft-key-status').classList.toggle('is-set', !!k?.set);
      const clear = q(row, '.ft-key-clear');
      const show = k?.source === 'format';
      if (clear.hidden === show) clear.hidden = !show;
    });
  }

  scrollTo(section: 'account' | 'keys' | 'about'): void {
    document.getElementById(`ft-set-${section}`)?.scrollIntoView({ block: 'start' });
  }

  fill(info: InfoLike, voice?: { local: boolean; openai: boolean }): void {
    const set = (k: string, v: string) => setText(q(this.root, `[data-k="${k}"]`), v);
    set('version', `v${info.version}`);
    set('dataDir', info.dataDir);
    set('commands', String(info.commands));
    if (voice) set('voice', `browser speech recognition where available; fallback: ${voice.local ? 'local Whisper' : voice.openai ? 'OpenAI transcription' : 'none (./format install-voice, or an OpenAI key)'}`);
  }
}
