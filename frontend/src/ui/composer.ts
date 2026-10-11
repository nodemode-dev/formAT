import { run } from '../engine-client/api';
import type { AppState, Settings } from '../state/app-state';
import { el, esc, modKey, q, setText } from './dom';
import { ui } from './icons-ft';
import { openMenu, type MenuItem } from './menu';

export interface ComposerHooks {
  send(text: string): Promise<void>;
  openCustomize(): void;
}

const EFFORT_LABEL: Record<string, string> = { low: 'Low', medium: 'Medium', high: 'High', extra: 'Extra', max: 'Max' };
const MODES: Array<[string, string, string]> = [
  ['ask', 'Ask', 'Asks before each tool runs'],
  ['auto', 'Auto', 'Runs tools you have allowed without asking'],
  ['plan', 'Plan', 'Plans first, changes nothing until you approve'],
];

export class Composer {
  readonly root: HTMLElement;
  private input: HTMLTextAreaElement;
  private sendBtn: HTMLButtonElement;
  private modelBtn: HTMLButtonElement;
  private modeBtn: HTMLButtonElement;
  private notice: HTMLElement;
  private attachRow: HTMLElement;
  private files: File[] = [];
  private research = false;
  private picker: HTMLInputElement;

  constructor(private state: AppState, private hooks: ComposerHooks) {
    this.root = el(`<div class="ft-composer">
      <div class="ft-composer-box">
        <div class="ft-attach-row" hidden></div>
        <textarea class="ft-composer-input" rows="1" placeholder="How can Format help?" aria-label="Message"></textarea>
        <div class="ft-composer-send-row"><button type="button" class="ft-send" aria-label="Send" title="Send (Enter)" disabled>${ui('send')}</button></div>
      </div>
      <div class="ft-composer-bar">
        <div class="ft-bar-left">
          <button type="button" class="ft-icon-btn ft-plus" data-menu-anchor aria-label="Add" title="Add files, skills, connectors">${ui('plus')}</button>
          <button type="button" class="ft-icon-btn" disabled aria-label="Dictation" title="Dictation arrives in v0.6.0">${ui('mic')}</button>
        </div>
        <div class="ft-bar-notice"></div>
        <div class="ft-bar-right">
          <button type="button" class="ft-text-btn ft-model" data-menu-anchor aria-label="Model and effort"><span class="ft-model-name"></span><span class="ft-muted ft-model-effort"></span>${ui('chevronDown', 14)}</button>
          <button type="button" class="ft-text-btn ft-mode" data-menu-anchor aria-label="Permission mode"></button>
        </div>
      </div>
      <input type="file" class="ft-hidden-file" multiple hidden>
    </div>`);
    this.input = q(this.root, '.ft-composer-input');
    this.sendBtn = q(this.root, '.ft-send');
    this.modelBtn = q(this.root, '.ft-model');
    this.modeBtn = q(this.root, '.ft-mode');
    this.notice = q(this.root, '.ft-bar-notice');
    this.attachRow = q(this.root, '.ft-attach-row');
    this.picker = q(this.root, '.ft-hidden-file');
    this.input.addEventListener('input', () => this.autosize());
    this.input.addEventListener('keydown', (e) => {
      if (e.key === 'Enter' && !e.shiftKey && !e.isComposing) {
        e.preventDefault();
        void this.submit();
      }
    });
    this.sendBtn.addEventListener('click', () => void this.submit());
    q(this.root, '.ft-plus').addEventListener('click', (e) => this.plusMenu(e.currentTarget as HTMLElement));
    this.modelBtn.addEventListener('click', () => this.modelMenu());
    this.modeBtn.addEventListener('click', () => this.modeMenu());
    this.picker.addEventListener('change', () => {
      this.addFiles([...(this.picker.files ?? [])]);
      this.picker.value = '';
    });
    this.root.addEventListener('dragover', (e) => e.preventDefault());
    this.root.addEventListener('drop', (e) => {
      e.preventDefault();
      this.addFiles([...(e.dataTransfer?.files ?? [])]);
    });
    state.on('settings', () => this.renderSettings());
  }

  focus(): void {
    this.input.focus();
  }

  openFilePicker(): void {
    this.picker.click();
  }

  private autosize(): void {
    this.input.style.height = 'auto';
    this.input.style.height = `${Math.min(this.input.scrollHeight, 240)}px`;
    this.sendBtn.disabled = !this.input.value.trim();
  }

  private async submit(): Promise<void> {
    const text = this.input.value.trim();
    if (!text) return;
    this.input.value = '';
    this.autosize();
    this.files = [];
    this.renderFiles();
    await this.hooks.send(text);
  }

  private addFiles(files: File[]): void {
    if (!files.length) return;
    this.files.push(...files);
    this.renderFiles();
  }

  private renderFiles(): void {
    this.attachRow.hidden = this.files.length === 0;
    const want = this.files.map((f, i) => `${i}:${f.name}`);
    const have = [...this.attachRow.children].map((c) => (c as HTMLElement).dataset.key);
    if (want.join('|') === have.join('|')) return;
    this.attachRow.replaceChildren(...this.files.map((f, i) => {
      const ext = (f.name.split('.').pop() || 'file').slice(0, 4).toUpperCase();
      const card = el(`<div class="ft-attach" data-key="${esc(`${i}:${f.name}`)}"><span class="ft-attach-name">${esc(f.name)}</span><span class="ft-attach-type">${esc(ext)}</span><button type="button" class="ft-attach-x" aria-label="Remove ${esc(f.name)}">${ui('close', 12)}</button></div>`);
      q(card, '.ft-attach-x').addEventListener('click', () => {
        this.files.splice(i, 1);
        this.renderFiles();
      });
      return card;
    }));
  }

  private plusMenu(anchor: HTMLElement): void {
    const empty = (what: string): MenuItem[] => [{ note: `No ${what} yet` }, { label: 'Open Customize', icon: 'customize', action: () => this.hooks.openCustomize() }];
    openMenu(anchor, [
      { label: 'Add files or photos', icon: 'paperclip', hint: `${modKey}U`, action: () => this.openFilePicker() },
      { label: 'Skills', icon: 'skills', submenu: () => empty('skills') },
      { label: 'Connectors', icon: 'plug', submenu: () => empty('connectors') },
      { divider: true },
      { label: 'Research', icon: 'research', checked: this.research, action: () => { this.research = !this.research; } },
    ], 'up');
  }

  private modelMenu(): void {
    const s = this.state.settings;
    const model = this.state.model();
    const set = (key: keyof Settings, value: unknown) => void run('settings.set', { key, value });
    openMenu(this.modelBtn, [
      { label: model?.name ?? s.model, desc: model?.description, checked: true },
      {
        label: 'Effort', value: EFFORT_LABEL[s.effort] ?? s.effort, submenu: () => [
          { note: 'Higher effort means more thorough answers, but takes longer and uses more tokens.' },
          ...this.state.efforts.map((e) => ({
            label: EFFORT_LABEL[e] ?? e, checked: e === s.effort,
            chip: e === 'medium' ? 'Recommended' : e === 'max' ? 'Most usage' : undefined,
            chipTone: e === 'max' ? 'warn' as const : 'plain' as const,
            action: () => set('effort', e),
          })),
        ],
      },
      { label: 'Extended thinking', checked: s.thinking, action: () => set('thinking', !s.thinking) },
      {
        label: 'More models', submenu: () => this.state.models.map((m) => ({ label: m.name, desc: m.id, checked: m.id === s.model, action: () => set('model', m.id) })),
      },
    ], 'up');
  }

  private modeMenu(): void {
    openMenu(this.modeBtn, MODES.map(([id, label, desc]) => ({
      label, desc, checked: this.state.settings.permissionMode === id, icon: 'shield' as const,
      action: () => void run('settings.set', { key: 'permissionMode', value: id }),
    })), 'up');
  }

  renderSettings(): void {
    const s = this.state.settings;
    const model = this.state.model();
    const name = model?.name ?? s.model;
    setText(q(this.modelBtn, '.ft-model-name'), name);
    setText(q(this.modelBtn, '.ft-model-effort'), EFFORT_LABEL[s.effort] ?? s.effort);
    const mode = MODES.find(([id]) => id === s.permissionMode);
    setText(this.modeBtn, mode ? mode[1] : s.permissionMode);
    setText(this.notice, `${name} through the Anthropic API can make mistakes.`);
  }
}
