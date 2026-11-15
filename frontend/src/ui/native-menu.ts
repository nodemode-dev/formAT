import type { Commands } from './commands';
import type { MenuDef, MenuItem as MenuSpec } from './menubar';

interface ItemHandle { setEnabled(on: boolean): Promise<void>; setChecked?(on: boolean): Promise<void> }
interface ItemOptions { text: string; enabled: boolean; action: () => void; accelerator?: string }
interface SubmenuHandle { setAsWindowsMenuForNSApp?(): Promise<void>; setAsHelpMenuForNSApp?(): Promise<void> }
interface MenuApi {
  Menu: { 'new'(opts: { items: unknown[] }): Promise<{ setAsAppMenu(): Promise<unknown> }> };
  Submenu: { 'new'(opts: { text: string; items: unknown[] }): Promise<SubmenuHandle> };
  MenuItem: { 'new'(opts: ItemOptions): Promise<ItemHandle> };
  CheckMenuItem: { 'new'(opts: ItemOptions & { checked: boolean }): Promise<ItemHandle> };
  PredefinedMenuItem: { 'new'(opts: { item: unknown; text?: string }): Promise<unknown> };
}
export interface WindowHandle { minimize(): Promise<void>; toggleMaximize(): Promise<void>; close(): Promise<void> }
interface TauriGlobal { menu?: MenuApi; window?: { getCurrentWindow(): WindowHandle } }

const tauri = (): TauriGlobal | null => (window as unknown as { __TAURI__?: TauriGlobal }).__TAURI__ ?? null;

async function menuApi(): Promise<MenuApi> {
  const api = tauri()?.menu;
  if (!api) throw new Error('the Tauri menu API is not in this window');
  return api;
}

export const isDesktop = (): boolean => '__TAURI_INTERNALS__' in window;
export const isMacDesktop = (): boolean => isDesktop() && /Mac/.test(navigator.platform);
export const desktopWindow = (): WindowHandle | null => (isDesktop() ? tauri()?.window?.getCurrentWindow() ?? null : null);

export const MENUS_IN_WINDOW_KEY = 'format.menusInWindow';
export function menusInWindow(): boolean {
  try { return localStorage.getItem(MENUS_IN_WINDOW_KEY) === '1'; } catch { return false; }
}

export const wantsNativeMenus = (): boolean => isMacDesktop() && !menusInWindow();

export function accelerator(combo: string | undefined): string | null {
  if (!combo) return null;
  const parts = combo.endsWith('++') ? [...combo.slice(0, -2).split('+'), 'Plus'] : combo.split('+');
  const names: Record<string, string> = { Mod: 'CmdOrCtrl', Alt: 'Alt', Shift: 'Shift', Ctrl: 'Ctrl', '=': '=', '-': '-', '[': '[', ']': ']', ',': 'Comma', '.': 'Period', '/': 'Slash', Delete: 'Delete', Backspace: 'Backspace', Escape: 'Escape', Enter: 'Enter', Tab: 'Tab', Space: 'Space', Plus: 'Plus' };
  const out: string[] = [];
  for (const p of parts) {
    if (names[p]) out.push(names[p]);
    else if (/^[A-Za-z0-9]$/.test(p)) out.push(p.toUpperCase());
    else if (/^F([1-9]|1[0-2])$/.test(p)) out.push(p);
    else return null;
  }
  return out.join('+');
}

export const OS_ITEMS: Record<string, string> = {
  undo: 'Undo', redo: 'Redo', cut: 'Cut', copy: 'Copy', paste: 'Paste', 'select-all': 'SelectAll',
  'window-minimize': 'Minimize', 'window-zoom': 'Maximize', 'close-window': 'CloseWindow',
};

const PRODUCT = 'FormAT';

export class NativeMenus {
  private items: Array<{ id: string; item: ItemHandle }> = [];
  private building = false;
  private again = false;
  private stateTimer = 0;

  constructor(private readonly commands: Commands, private readonly menus: () => MenuDef[]) {
    for (const ev of ['pointerup', 'keyup', 'focusin', 'focusout'] as const) window.addEventListener(ev, () => { if (this.items.length) this.refresh(); }, { passive: true });
  }

  async build(): Promise<void> {
    if (this.building) { this.again = true; return; }
    this.building = true;
    try {
      const api = await menuApi();
      const items: typeof this.items = [];
      const make = async (spec: MenuSpec): Promise<unknown> => {
        if (spec === '-') return api.PredefinedMenuItem.new({ item: 'Separator' });
        if (typeof spec === 'object') return api.Submenu.new({ text: spec.label, items: (await Promise.all(spec.items.map(make))).filter(Boolean) });
        const cmd = this.commands.get(spec);
        if (!cmd) return null;
        const text = this.commands.label(cmd), acc = accelerator(cmd.keys?.[0]);
        if (OS_ITEMS[spec]) return api.PredefinedMenuItem.new({ item: OS_ITEMS[spec], text });
        const opts: ItemOptions = { text, enabled: this.enabled(spec), action: () => { this.commands.run(spec); this.refresh(); } };
        let item: ItemHandle;
        if (cmd.checked) {
          const copts = { ...opts, checked: !!cmd.checked() };
          try { item = await api.CheckMenuItem.new(acc ? { ...copts, accelerator: acc } : copts); } catch { item = await api.CheckMenuItem.new(copts); }
        } else {
          try { item = await api.MenuItem.new(acc ? { ...opts, accelerator: acc } : opts); } catch { item = await api.MenuItem.new(opts); }
        }
        items.push({ id: spec, item });
        return item;
      };
      const top: unknown[] = [];
      top.push(await api.Submenu.new({ text: PRODUCT, items: [
        await api.PredefinedMenuItem.new({ item: { About: { name: PRODUCT, copyright: 'Copyright 2026 NodeAgentc, Inc. Apache-2.0', license: 'Apache-2.0' } }, text: `About ${PRODUCT}` }),
        await api.PredefinedMenuItem.new({ item: 'Separator' }),
        ...(this.commands.get('settings') ? [await make('settings')] : []),
        await api.PredefinedMenuItem.new({ item: 'Separator' }),
        await api.PredefinedMenuItem.new({ item: 'Hide' }),
        await api.PredefinedMenuItem.new({ item: 'Quit' }),
      ] }));
      for (const def of this.menus()) {
        const list = typeof def.items === 'function' ? def.items() : def.items;
        const sub = await api.Submenu.new({ text: def.label, items: (await Promise.all(list.map(make))).filter(Boolean) });
        if (def.label === 'Window') void sub.setAsWindowsMenuForNSApp?.().catch(() => undefined);
        if (def.label === 'Help') void sub.setAsHelpMenuForNSApp?.().catch(() => undefined);
        top.push(sub);
      }
      const menu = await api.Menu.new({ items: top });
      await menu.setAsAppMenu();
      this.items = items;
      document.documentElement.classList.add('has-native-menus');
    } catch (err) {
      if (!this.items.length) document.documentElement.classList.remove('has-native-menus');
      throw err;
    } finally {
      this.building = false;
      if (this.again) { this.again = false; void this.build().catch(() => undefined); }
    }
  }

  private enabled(id: string): boolean {
    const cmd = this.commands.get(id);
    return !!cmd && this.commands.enabled(cmd);
  }

  refresh(): void {
    if (this.stateTimer) return;
    this.stateTimer = window.setTimeout(() => {
      this.stateTimer = 0;
      for (const { id, item } of this.items) {
        const cmd = this.commands.get(id);
        if (!cmd) continue;
        void item.setEnabled(this.enabled(id)).catch(() => undefined);
        if (cmd.checked && item.setChecked) void item.setChecked(!!cmd.checked()).catch(() => undefined);
      }
    }, 150);
  }
}
