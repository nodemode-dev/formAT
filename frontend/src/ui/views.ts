import { run } from '../engine-client/api';
import type { AppState, ArtifactSummary, KeyStatus, VoiceEngines } from '../state/app-state';
import { askDeleteArtifact } from './confirm';
import { el, esc, modKey, q, setText } from './dom';
import { ui } from './icons-ft';
import { openMenu } from './menu';
import type { PrefsWindow } from './prefs-window';

function when(ts: number): string {
  const d = new Date(ts * 1000);
  const today = new Date();
  return d.toDateString() === today.toDateString() ? d.toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' })
    : d.toLocaleDateString([], { month: 'short', day: 'numeric', year: d.getFullYear() === today.getFullYear() ? undefined : 'numeric' });
}

export class ArtifactsView {
  readonly root: HTMLElement;
  private list: HTMLElement;
  private empty: HTMLElement;
  private items: ArtifactSummary[] = [];
  private seq = 0;

  constructor(private open: (a: ArtifactSummary) => void, private openChat: (id: string) => void) {
    this.root = el(`<section class="ft-page" data-view="artifacts" hidden>
      <header class="ft-page-head"><h1>Artifacts</h1></header>
      <div class="ft-gallery" role="list" hidden></div>
      <div class="ft-page-empty" hidden>${ui('artifacts', 28)}<p>Pages, apps and tools Claude publishes in your chats collect here, with every version.</p></div>
    </section>`);
    this.list = q(this.root, '.ft-gallery');
    this.empty = q(this.root, '.ft-page-empty');
    this.list.addEventListener('click', (e) => {
      const t = e.target as HTMLElement;
      const row = t.closest<HTMLElement>('[data-id]');
      const a = this.items.find((x) => x.id === row?.dataset.id);
      if (!row || !a) return;
      if (t.closest('.ft-gallery-more')) { this.menu(t.closest('.ft-gallery-more') as HTMLElement, a); return; }
      this.open(a);
    });
    this.list.addEventListener('keydown', (e) => {
      const row = (e.target as HTMLElement).closest<HTMLElement>('.ft-gallery-item');
      const a = this.items.find((x) => x.id === row?.dataset.id);
      if (a && (e.key === 'Enter' || e.key === ' ') && e.target === row) { e.preventDefault(); this.open(a); }
    });
  }

  private menu(anchor: HTMLElement, a: ArtifactSummary): void {
    openMenu(anchor, [
      { label: 'Open', icon: 'artifacts', action: () => this.open(a) },
      { label: 'Go to the chat', icon: 'chat', action: () => this.openChat(a.conversationId) },
      { divider: true },
      { label: 'Delete', icon: 'trash', action: () => void this.remove(a) },
    ], 'down');
  }

  private async remove(a: ArtifactSummary): Promise<void> {
    if (await askDeleteArtifact(a.title)) await run('artifact.delete', { id: a.id }).catch(() => undefined);
  }

  async refresh(): Promise<void> {
    const seq = ++this.seq;
    let got: ArtifactSummary[];
    try { got = (await run<{ artifacts: ArtifactSummary[] }>('artifact.list')).artifacts; } catch { return; }
    if (seq !== this.seq) return;
    this.items = got;
    const html = got.map((a) => `<div class="ft-gallery-item" role="listitem" tabindex="0" data-id="${esc(a.id)}"><span class="ft-gallery-icon">${ui('artifacts', 18)}</span>
      <span class="ft-gallery-text"><span class="ft-gallery-name">${esc(a.title)}</span><span class="ft-gallery-meta">${esc([a.chatTitle || 'Untitled chat', `${a.versions} version${a.versions === 1 ? '' : 's'}`, when(a.updated)].join(' · '))}</span></span>
      <button type="button" class="ft-icon-btn ft-gallery-more" aria-label="More for ${esc(a.title)}" title="More">${ui('more', 16)}</button></div>`).join('');
    if (this.list.dataset.v !== html) { this.list.dataset.v = html; this.list.innerHTML = html; }
    const any = got.length > 0;
    if (this.list.hidden === any) this.list.hidden = !any;
    if (this.empty.hidden !== any) this.empty.hidden = any;
  }
}

export interface InfoLike {
  version: string;
  dataDir: string;
  providers: Record<string, boolean>;
  commands: number;
  desktop?: boolean;
  keysFile?: string;
  envFile?: string | null;
}

const PROVIDERS: Array<[string, string, string]> = [
  ['anthropic', 'Anthropic', 'Powers chat. Create one at console.anthropic.com.'],
  ['openai', 'OpenAI', 'Optional: dictation transcription in browsers without speech recognition, and the OpenAI provider later.'],
  ['elevenlabs', 'ElevenLabs', 'Optional: dictation with Scribe v2, ElevenLabs\' speech to text. Create one at elevenlabs.io.'],
];

function sourceText(k: KeyStatus | undefined): string {
  if (!k || !k.set) return 'Not set';
  const where = k.source === 'format' ? 'saved in FormAT' : k.source === '.env' ? 'from backend/.env' : 'from the environment';
  return `Set ${k.hint ?? ''} · ${where}`;
}

interface DevicesStatus { on: boolean; port: number; urls: string[]; pairUrl: string | null; qr: string | null }

export type SettingsSection = 'Account' | 'API keys' | 'Tools' | 'Long chats' | 'Memory' | 'Voice' | 'Other devices' | 'Outside agents' | 'About';

const SECTION_ORDER: SettingsSection[] = ['Account', 'API keys', 'Tools', 'Long chats', 'Memory', 'Voice', 'Other devices', 'Outside agents', 'About'];

export class SettingsView {
  private root: HTMLElement;

  constructor(private state: AppState, prefs: PrefsWindow, memory: HTMLElement) {
    this.root = prefs.pages;
    prefs.add('Account', 'user', `
      <section class="ft-prefs-group">
        <h3 class="ft-prefs-label">Profile</h3>
        <label class="ft-field"><span>What should Claude call you?</span><input class="ft-input" data-a="displayName" maxlength="80" autocomplete="name"></label>
        <label class="ft-field ft-prefs-wide"><span>How Claude should respond</span><textarea class="ft-input" data-a="preferences" rows="4" maxlength="8000" placeholder="For example: answer briefly, use British spelling, show code in TypeScript"></textarea><small>Sent with every chat, after FormAT's own instructions.</small></label>
      </section>
      <section class="ft-prefs-group">
        <h3 class="ft-prefs-label">Composer</h3>
        <label class="ft-field"><span>Send with</span><select class="ft-input" data-a="sendKey"><option value="enter">Enter (Shift+Enter for a new line)</option><option value="modEnter">${esc(modKey)}Enter (Enter for a new line)</option></select></label>
      </section>
      <div class="ft-set-actions"><button type="button" class="ft-btn ft-btn-primary ft-save-account">Save</button><span class="ft-saved" aria-live="polite"></span></div>`);
    prefs.add('Voice', 'mic', `
      <section class="ft-prefs-group">
        <h3 class="ft-prefs-label">Dictation</h3>
        <label class="ft-field"><span>Dictation language</span><input class="ft-input" data-a="voiceLanguage" maxlength="16" placeholder="en-US"></label>
        <label class="ft-field ft-prefs-wide"><span>Dictation engine</span><select class="ft-input" data-a="voiceEngine"><option value="auto">Automatic: Scribe v2, then local Whisper, then OpenAI, else the browser</option><option value="scribe">ElevenLabs Scribe v2 (needs an ElevenLabs key)</option><option value="local">Local Whisper large-v3-turbo (./format install-voice)</option><option value="openai">OpenAI (needs an OpenAI key)</option><option value="browser">The browser's speech recognition</option></select></label>
      </section>
      <div class="ft-set-actions"><button type="button" class="ft-btn ft-btn-primary ft-save-account">Save</button><span class="ft-saved" aria-live="polite"></span></div>`);
    prefs.add('Tools', 'terminal', `
      <p class="ft-set-note">Workspace tools let Claude run commands and read and change files in the chat's own folder on this computer; commands and file changes ask first in Ask mode, never run in Plan mode, and run without asking in Auto mode. Web search is billed by Anthropic per search. Artifacts run sealed off from FormAT and your files; they load scripts and fonts from the common CDNs, and nothing else from the internet unless you allow it.</p>
      <section class="ft-prefs-group">
        <h3 class="ft-prefs-label">Tools</h3>
        <div class="ft-prefs-cols">
          <label class="ft-field ft-check"><input type="checkbox" data-t="workspaceTools"><span>Workspace tools (bash, files)</span></label>
          <label class="ft-field ft-check"><input type="checkbox" data-t="webTools"><span>Web search and fetch</span></label>
          <label class="ft-field ft-check"><input type="checkbox" data-t="artifactNetwork" data-off="1"><span>Artifacts can load images and data from the internet</span></label>
          <label class="ft-field ft-check"><input type="checkbox" data-t="browserTools"><span>Claude can use the built-in browser</span></label>
        </div>
      </section>
      <section class="ft-prefs-group">
        <h3 class="ft-prefs-label">Sandbox</h3>
        <div class="ft-prefs-cols">
          <label class="ft-field ft-check"><input type="checkbox" data-t="sandbox"><span>Run Claude's commands in a sandbox</span></label>
          <label class="ft-field ft-check"><input type="checkbox" data-t="sandboxNetwork" data-off="1"><span>Sandboxed commands can use the network</span></label>
        </div>
        <small class="ft-set-note ft-sandbox-note">checking the sandbox</small>
      </section>
      <section class="ft-prefs-group">
        <h3 class="ft-prefs-label">Always allowed</h3>
        <div class="ft-allowed"><span class="ft-allowed-list"></span></div>
      </section>
      <section class="ft-prefs-group">
        <h3 class="ft-prefs-label">Sub-agents</h3>
        <div class="ft-prefs-cols">
          <label class="ft-field"><span>Sub-agents in one reply</span><select class="ft-input" data-a2="agentLimit"><option value="0">Off</option><option value="2">Up to 2</option><option value="4">Up to 4</option><option value="6">Up to 6</option><option value="10">Up to 10</option></select></label>
          <label class="ft-field"><span>Sub-agent model</span><select class="ft-input" data-a2="agentModel"><option value="">Same as the chat</option></select></label>
        </div>
      </section>`);
    prefs.add('Other devices', 'devices', `
      <p class="ft-set-note">Continue on your phone or another computer on the same network: turn this on, then scan the code or open the link there. Paired devices see the same chats live; shared artifact links open for anyone who can reach this computer, read-only. Turn it off to keep FormAT on this computer only.</p>
      <section class="ft-prefs-group">
        <h3 class="ft-prefs-label">Pairing</h3>
        <div class="ft-set-actions"><button type="button" class="ft-btn ft-btn-primary ft-dev-toggle">Open to other devices</button><button type="button" class="ft-btn ft-dev-forget" hidden>Forget paired devices</button><span class="ft-saved ft-dev-msg" aria-live="polite"></span></div>
        <div class="ft-dev-pair" hidden><div class="ft-dev-qr" aria-label="Pairing code"></div><div class="ft-dev-text"><small>Open on the other device:</small><code class="ft-dev-url"></code><small class="ft-dev-also"></small></div></div>
      </section>`);
    prefs.add('Outside agents', 'plug', `
      <p class="ft-set-note">While FormAT runs it is an MCP server at <code>http://127.0.0.1:8490/mcp</code>, and <code>./format mcp</code> serves the same over stdio, so Claude Code, Codex, Cursor and other agents on this computer can chat, publish artifacts and run any FormAT command. Ask shows a prompt here the first time an agent calls.</p>
      <section class="ft-prefs-group">
        <h3 class="ft-prefs-label">Access</h3>
        <label class="ft-field"><span>Agents on this computer</span><select class="ft-input" data-g="outsideAgents"><option value="ask">Ask me</option><option value="allowed">Allowed</option><option value="blocked">Blocked</option></select></label>
        <div class="ft-allowed"><span class="ft-allowed-label">Seen:</span><span class="ft-agents-seen">none yet</span></div>
        <p class="ft-set-note ft-seal-say" aria-live="polite"></p>
      </section>`);
    prefs.add('Long chats', 'compress', `
      <p class="ft-set-note">When a chat fills most of the model's context window, Claude summarizes the earlier messages after a reply and continues from the summary. The earlier messages stay on screen; images and files in them are not carried into the summary. You can also run it from the command palette.</p>
      <section class="ft-prefs-group">
        <h3 class="ft-prefs-label">Summaries</h3>
        <div class="ft-prefs-cols">
          <label class="ft-field ft-check"><input type="checkbox" data-s="autoCompact"><span>Summarize long chats automatically</span></label>
          <label class="ft-field"><span>Summarize at</span><select class="ft-input" data-s="compactAt"><option value="0.5">50% of the context window</option><option value="0.65">65% of the context window</option><option value="0.75">75% of the context window</option><option value="0.85">85% of the context window</option></select></label>
        </div>
      </section>`);
    prefs.add('API keys', 'key', `
      <p class="ft-set-note ft-keys-note">A key saved here is stored in FormAT's data folder with owner-only permissions. Keys never come back to this window.</p>
      ${PROVIDERS.map(([id, label, note]) => `<section class="ft-prefs-group ft-key-row" data-p="${id}">
          <div class="ft-key-head"><h3 class="ft-prefs-label">${label}</h3><span class="ft-key-status">checking</span></div>
          <small class="ft-key-note">${esc(note)}</small>
          <div class="ft-key-form"><input class="ft-input" type="password" autocomplete="off" spellcheck="false" placeholder="Paste a new ${label} key" aria-label="${label} API key"><button type="button" class="ft-btn ft-key-save">Save</button><button type="button" class="ft-btn ft-key-clear" hidden>Remove</button></div>
          <small class="ft-key-msg" aria-live="polite"></small>
        </section>`).join('')}`);
    prefs.add('Memory', 'file', memory);
    prefs.add('About', 'settings', `
      <p class="ft-set-note" translate="no">by nodemode.ai</p>
      <section class="ft-prefs-group">
        <h3 class="ft-prefs-label">Details</h3>
        <dl class="ft-facts">
          <div><dt>Version</dt><dd data-k="version">checking</dd></div>
          <div><dt>Data folder</dt><dd data-k="dataDir">checking</dd></div>
          <div><dt>Engine commands</dt><dd data-k="commands">checking</dd></div>
          <div><dt>Dictation</dt><dd data-k="voice">checking</dd></div>
          <div><dt>Native renderer</dt><dd data-k="native">checking</dd></div>
        </dl>
      </section>`);
    prefs.arrange(SECTION_ORDER);
    this.root.querySelectorAll<HTMLElement>('.ft-save-account').forEach((btn) => {
      btn.addEventListener('click', () => void this.saveAccount(q(btn.parentElement as HTMLElement, '.ft-saved')));
    });
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
        setText(msg, 'Removed from FormAT.');
      });
    });
    const auto = q<HTMLInputElement>(this.root, '[data-s="autoCompact"]');
    const at = q<HTMLSelectElement>(this.root, '[data-s="compactAt"]');
    auto.addEventListener('change', () => void run('settings.set', { key: 'autoCompact', value: auto.checked }).catch(() => undefined));
    at.addEventListener('change', () => void run('settings.set', { key: 'compactAt', value: Number(at.value) }).catch(() => undefined));
    state.on('account', () => this.fillAccount());
    state.on('keys', () => this.fillKeys());
    this.root.querySelectorAll<HTMLInputElement>('[data-t]').forEach((box) => {
      box.addEventListener('change', () => void run('settings.set', { key: box.dataset.t, value: box.checked }).catch(() => undefined));
    });
    q(this.root, '.ft-allowed-list').addEventListener('click', (e) => {
      const name = (e.target as HTMLElement).closest<HTMLElement>('[data-tool]')?.dataset.tool;
      if (!name) return;
      void run('settings.set', { key: 'toolAllow', value: (this.state.settings.toolAllow ?? []).filter((t) => t !== name) }).catch(() => undefined);
    });
    const lim = q<HTMLSelectElement>(this.root, '[data-a2="agentLimit"]');
    const mod = q<HTMLSelectElement>(this.root, '[data-a2="agentModel"]');
    lim.addEventListener('change', () => void run('settings.set', { key: 'agentLimit', value: Number(lim.value) }).catch(() => undefined));
    mod.addEventListener('change', () => void run('settings.set', { key: 'agentModel', value: mod.value }).catch(() => undefined));
    q(this.root, '.ft-dev-toggle').addEventListener('click', () => void this.toggleDevices());
    q(this.root, '.ft-dev-forget').addEventListener('click', () => void run<DevicesStatus>('devices.forget').then((d) => this.paintDevices(d, 'Paired devices were forgotten; pair again with the new code.')).catch(() => undefined));
    void this.refreshDevices();
    const outside = q<HTMLSelectElement>(this.root, '[data-g="outsideAgents"]');
    outside.addEventListener('change', () => void run('settings.set', { key: 'outsideAgents', value: outside.value }).catch(() => undefined));
    state.on('settings', () => { this.fillChats(); this.fillTools(); this.fillOutside(); });
    this.fillChats();
    this.fillTools();
    this.fillOutside();
  }

  async refreshDevices(): Promise<void> {
    try { this.paintDevices(await run<DevicesStatus>('devices.status')); } catch { /* engine down */ }
  }

  private async toggleDevices(): Promise<void> {
    const on = q(this.root, '.ft-dev-toggle').dataset.on === '1';
    try {
      this.paintDevices(await run<DevicesStatus>(on ? 'devices.stop' : 'devices.start'));
    } catch (err) {
      setText(q(this.root, '.ft-dev-msg'), err instanceof Error ? err.message : String(err));
    }
  }

  private paintDevices(d: DevicesStatus, msg = ''): void {
    const btn = q(this.root, '.ft-dev-toggle');
    btn.dataset.on = d.on ? '1' : '0';
    setText(btn, d.on ? 'Close to other devices' : 'Open to other devices');
    const forget = q(this.root, '.ft-dev-forget');
    if (forget.hidden === d.on) forget.hidden = !d.on;
    const pair = q(this.root, '.ft-dev-pair');
    const show = !!(d.on && d.pairUrl);
    if (show) {
      const qr = q(this.root, '.ft-dev-qr');
      if (qr.dataset.v !== d.pairUrl) { qr.dataset.v = d.pairUrl ?? ''; qr.innerHTML = d.qr ?? ''; }
      setText(q(this.root, '.ft-dev-url'), d.pairUrl ?? '');
      setText(q(this.root, '.ft-dev-also'), d.urls.length > 1 ? `Also reachable at ${d.urls.slice(1).join(', ')}` : `Listening on port ${d.port}`);
    }
    if (pair.hidden === show) pair.hidden = !show;
    setText(q(this.root, '.ft-dev-msg'), msg);
  }

  fillOutside(): void {
    const sel = q<HTMLSelectElement>(this.root, '[data-g="outsideAgents"]');
    const want = this.state.settings.outsideAgents ?? 'ask';
    if (sel.value !== want) sel.value = want;
    setText(q(this.root, '.ft-seal-say'), this.state.settings.sealBroken === true ? 'The saved outside agents choice was changed outside FormAT or saved by an older version, so it is back to Ask.' : '');
    void run<{ clients: Array<{ name: string; channel: string }> }>('agents.status').then((r) => {
      const text = r.clients.length ? r.clients.map((c) => `${c.name} (${c.channel})`).join(', ') : 'none yet';
      setText(q(this.root, '.ft-agents-seen'), text);
    }).catch(() => undefined);
  }

  private fillAgents(): void {
    const s = this.state.settings;
    const lim = q<HTMLSelectElement>(this.root, '[data-a2="agentLimit"]');
    const want = String(s.agentLimit ?? 4);
    if (![...lim.options].some((o) => o.value === want)) lim.add(new Option(`Up to ${want}`, want));
    if (lim.value !== want) lim.value = want;
    const mod = q<HTMLSelectElement>(this.root, '[data-a2="agentModel"]');
    const ids = this.state.models.map((m) => m.id);
    const key = ids.join(',');
    if (mod.dataset.v !== key) {
      mod.dataset.v = key;
      mod.innerHTML = `<option value="">Same as the chat</option>${this.state.models.map((m) => `<option value="${esc(m.id)}">${esc(m.name)}</option>`).join('')}`;
    }
    const pick = s.agentModel ?? '';
    if (pick && !ids.includes(pick)) mod.add(new Option(pick, pick));
    if (mod.value !== pick) mod.value = pick;
    if (mod.disabled !== (want === '0')) mod.disabled = want === '0';
  }

  private fillTools(): void {
    this.fillAgents();
    const s = this.state.settings;
    this.root.querySelectorAll<HTMLInputElement>('[data-t]').forEach((box) => {
      const v = (s as unknown as Record<string, unknown>)[box.dataset.t as string];
      const on = box.dataset.off ? v === true : v !== false;
      if (box.checked !== on) box.checked = on;
    });
    void run<{ note: string; available: boolean }>('sandbox.status').then((sb) => {
      setText(q(this.root, '.ft-sandbox-note'), sb.note);
      const box = q<HTMLInputElement>(this.root, '[data-t="sandbox"]');
      if (box.disabled === sb.available) box.disabled = !sb.available;
    }).catch(() => undefined);
    const list = q(this.root, '.ft-allowed-list');
    const names = s.toolAllow ?? [];
    const want = names.join(',');
    if (list.dataset.v === want) return;
    list.dataset.v = want;
    list.innerHTML = names.length ? names.map((n) => `<button type="button" class="ft-chip" data-tool="${esc(n)}" title="Ask again before ${esc(n)}">${esc(n)} ${ui('close', 12)}</button>`).join('') : '<span class="ft-allowed-none">none; every command and file change asks in Ask mode</span>';
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

  private async saveAccount(saved: HTMLElement): Promise<void> {
    const get = (k: string) => (q<HTMLInputElement>(this.root, `[data-a="${k}"]`)).value;
    try {
      await run('account.set', { displayName: get('displayName'), preferences: get('preferences'), sendKey: get('sendKey'), voiceLanguage: get('voiceLanguage') || 'en-US', voiceEngine: get('voiceEngine') || 'auto' });
      setText(saved, 'Saved.');
    } catch (e) {
      setText(saved, e instanceof Error ? e.message : String(e));
    }
  }

  private fillAccount(): void {
    const a = this.state.account;
    const put = (k: string, v: string) => { const f = q<HTMLInputElement>(this.root, `[data-a="${k}"]`); if (document.activeElement !== f && f.value !== v) f.value = v; };
    put('displayName', a.displayName);
    put('preferences', a.preferences);
    put('sendKey', a.sendKey);
    put('voiceLanguage', a.voiceLanguage);
    put('voiceEngine', a.voiceEngine || 'auto');
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

  fill(info: InfoLike, voice?: VoiceEngines): void {
    const set = (k: string, v: string) => setText(q(this.root, `[data-k="${k}"]`), v);
    set('version', `v${info.version}`);
    set('dataDir', info.dataDir);
    set('commands', String(info.commands));
    const where = info.keysFile ? `, in <code>${esc(info.keysFile)}</code>,` : '';
    const rest = info.envFile
      ? `It takes precedence over <code>backend/.env</code>. You can keep keys in <code>backend/.env</code> instead (copy <code>backend/.env.example</code>); remove the saved key here and the .env one is used again.`
      : 'If no key is saved here, FormAT uses one set in the environment it was started from (ANTHROPIC_API_KEY, OPENAI_API_KEY or ELEVENLABS_API_KEY); removing the saved key here goes back to that one.';
    const note = q(this.root, '.ft-keys-note');
    const html = `A key saved here is stored in FormAT's data folder${where} with owner-only permissions. ${rest} Keys never come back to this window.`;
    if (note.dataset.v !== html) { note.dataset.v = html; note.innerHTML = html; }
    void run<{ enabled: boolean; built: boolean; adapter?: string; backend?: string; error?: string }>('native.status').then((n) => {
      set('native', !n.built ? 'not built (optional: ./format native build)' : !n.enabled ? 'built, off (start FormAT with FORMAT_NATIVE=1)' : n.adapter ? `on: ${n.adapter}, ${n.backend}` : `on, but ${n.error ?? 'no GPU adapter'}`);
    }).catch(() => set('native', 'unknown'));
    if (voice) this.fillVoice(voice);
  }

  fillVoice(voice?: VoiceEngines): void {
    if (!voice) return;
    const names: Record<string, string> = { scribe: `ElevenLabs ${voice.scribeModel ?? 'scribe_v2'}`, local: `local Whisper ${voice.localModel ?? 'large-v3-turbo'}`, openai: 'OpenAI' };
    const order = (voice.order ?? []).map((e) => names[e] ?? e);
    setText(q(this.root, '[data-k="voice"]'), order.length ? `${order.join(', then ')}; the browser's speech recognition when none answers` : 'the browser\'s speech recognition only (add an ElevenLabs or OpenAI key, or ./format install-voice)');
  }
}
