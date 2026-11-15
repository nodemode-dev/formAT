import { demoCommand, demoList, setDemoList, type DemoDef } from '../demos';
import type { AppState, View } from '../state/app-state';
import { Commands, type Command } from './commands';
import { isMac } from './dom';
import { MenuBar, type MenuDef } from './menubar';
import { MENUS_IN_WINDOW_KEY, NativeMenus, OS_ITEMS, desktopWindow, isMacDesktop, menusInWindow, wantsNativeMenus } from './native-menu';

type Layout = 'sidebar' | 'panel' | 'term';

export interface MenuHost {
  state: AppState;
  newChat(): void;
  newProject(): void;
  newTask(): void;
  setView(view: View): void;
  openSettings(section?: 'account' | 'keys' | 'about'): void;
  layout(which: Layout): string;
  toggle(which: Layout): void;
  side(): string | null;
  toggleFiles(): void;
  toggleBrowser(): void;
  toggleBackground(): void;
  backgroundOpen(): boolean;
  togglePalette(): void;
  findOpen(): boolean;
  openFind(): void;
  addFiles(): void;
  compact(): void;
  shortcuts(): void;
  openDemo(id: string): void;
}

export interface AppMenus {
  commands: Commands;
  menus: MenuDef[];
  setDemos(found: readonly DemoDef[]): void;
  keyLabel(id: string): string;
  key(e: KeyboardEvent): void;
}

const NOT_TEXT = new Set(['button', 'checkbox', 'radio', 'range', 'color', 'file', 'submit', 'reset', 'image']);
const CHROME = '.ft-mainmenu, .ft-menubar';

let lastFocus: HTMLElement | null = null;

function editTarget(): HTMLElement | null {
  const a = document.activeElement;
  if (a instanceof HTMLElement && a.closest(CHROME)) return lastFocus?.isConnected ? lastFocus : null;
  return a instanceof HTMLElement ? a : null;
}

function textField(): HTMLElement | null {
  const a = editTarget();
  if (!a || a.closest('.xterm')) return null;
  if (a instanceof HTMLTextAreaElement) return !a.readOnly && !a.disabled ? a : null;
  if (a instanceof HTMLInputElement) return !NOT_TEXT.has(a.type) && !a.readOnly && !a.disabled ? a : null;
  return a.isContentEditable ? a : null;
}

function fieldSelection(): boolean {
  const f = textField();
  if (f instanceof HTMLTextAreaElement || f instanceof HTMLInputElement) {
    try { return f.selectionStart !== f.selectionEnd; } catch { return false; }
  }
  return !!f && !!window.getSelection()?.toString();
}

function edit(action: string): void {
  const f = textField();
  if (f && f !== document.activeElement) f.focus();
  document.execCommand(action);
}

async function paste(): Promise<void> {
  const f = textField();
  if (!f) return;
  if (f !== document.activeElement) f.focus();
  if (document.execCommand('paste')) return;
  try {
    const text = await navigator.clipboard.readText();
    if (!text || !f.isConnected) return;
    if (f !== document.activeElement) f.focus();
    document.execCommand('insertText', false, text);
  } catch {
    return;
  }
}

function dialogOpen(): boolean {
  return !!document.querySelector('.ft-palette-scrim:not([hidden]), .ft-sheet-scrim:not([hidden]), .ft-viewer:not([hidden]), .ft-prefs-scrim:not([hidden])');
}

export function mountMenus(bar: HTMLElement, host: MenuHost): AppMenus {
  const commands = new Commands();
  const view = (v: View) => (): boolean => host.state.view === v;
  const go = (id: string, label: string, v: View): Command => ({ id, label, checked: view(v), run: () => host.setView(v) });
  const inWindow = (): boolean => !!desktopWindow();
  const native = isMacDesktop() ? new NativeMenus(commands, () => menus) : null;

  commands.add(
    { id: 'home', label: 'Home', keys: ['Alt+Mod+H'], run: () => host.newChat() },
    { id: 'new-chat', label: 'New Chat', keys: ['Shift+Mod+O'], run: () => host.newChat() },
    { id: 'new-project', label: 'New Project...', run: () => host.newProject() },
    { id: 'new-task', label: 'New Scheduled Task...', run: () => host.newTask() },
    { id: 'add-files', label: 'Add Files...', keys: ['Mod+U'], enabled: view('chat'), run: () => host.addFiles() },
    { id: 'settings', label: 'Settings...', keys: ['Mod+,'], run: () => host.openSettings() },
    { id: 'settings-account', label: 'Account', run: () => host.openSettings('account') },
    { id: 'settings-keys', label: 'API Keys', run: () => host.openSettings('keys') },
    { id: 'close-window', label: 'Close Window', enabled: inWindow, run: () => void desktopWindow()?.close().catch(() => undefined) },

    { id: 'undo', label: 'Undo', keys: ['Mod+Z'], enabled: () => !!textField(), run: () => edit('undo') },
    { id: 'redo', label: 'Redo', keys: [isMac ? 'Shift+Mod+Z' : 'Mod+Y'], enabled: () => !!textField(), run: () => edit('redo') },
    { id: 'cut', label: 'Cut', keys: ['Mod+X'], enabled: fieldSelection, run: () => edit('cut') },
    { id: 'copy', label: 'Copy', keys: ['Mod+C'], enabled: () => fieldSelection() || !!window.getSelection()?.toString(), run: () => edit('copy') },
    { id: 'paste', label: 'Paste', keys: ['Mod+V'], enabled: () => !!textField(), run: () => void paste() },
    { id: 'select-all', label: 'Select All', keys: ['Mod+A'], run: () => edit('selectAll') },
    { id: 'find', label: 'Find in Page', keys: ['Mod+F'], enabled: () => !host.findOpen(), run: () => host.openFind() },
    { id: 'compact', label: 'Summarize Earlier Messages', enabled: () => !!host.state.activeId, run: () => host.compact() },

    { id: 'toggle-sidebar', label: 'Sidebar', keys: ['Mod+B'], checked: () => host.layout('sidebar') === 'open', run: () => host.toggle('sidebar') },
    { id: 'toggle-outputs', label: 'Outputs', keys: ['Mod+.'], checked: () => host.layout('panel') === 'open', run: () => host.toggle('panel') },
    { id: 'toggle-terminal', label: 'Terminal', keys: ['Mod+J', 'Shift+Mod+J'], checked: () => host.layout('term') === 'open', run: () => host.toggle('term') },
    { id: 'toggle-files', label: 'Files', checked: () => host.side() === 'files', enabled: () => host.side() === 'files' || !!host.state.activeId, run: () => host.toggleFiles() },
    { id: 'toggle-browser', label: 'Browser', checked: () => host.side() === 'browser', run: () => host.toggleBrowser() },
    { id: 'toggle-background', label: 'Background Work', checked: () => host.backgroundOpen(), run: () => host.toggleBackground() },
    { id: 'menus-in-window', label: 'Menus in Window', enabled: isMacDesktop, checked: menusInWindow, run: () => { try { localStorage.setItem(MENUS_IN_WINDOW_KEY, menusInWindow() ? '0' : '1'); } catch { return; } void native?.apply().catch(() => undefined); } },

    { id: 'palette', label: 'Command Palette', keys: ['Mod+K', 'Shift+Mod+K'], run: () => host.togglePalette() },
    go('go-chat', 'Chat', 'chat'),
    go('go-projects', 'Projects', 'projects'),
    go('go-artifacts', 'Artifacts', 'artifacts'),
    go('go-scheduled', 'Scheduled', 'scheduled'),
    go('go-customize', 'Customize', 'customize'),

    { id: 'window-minimize', label: 'Minimize', enabled: inWindow, run: () => void desktopWindow()?.minimize().catch(() => undefined) },
    { id: 'window-zoom', label: isMac ? 'Zoom' : 'Maximize', enabled: inWindow, run: () => void desktopWindow()?.toggleMaximize().catch(() => undefined) },

    { id: 'shortcuts', label: 'Keyboard Shortcuts', keys: ['Mod+/'], run: () => host.shortcuts() },
    { id: 'about', label: 'About FormAT', run: () => host.openSettings('about') },
  );

  const menus: MenuDef[] = [
    { label: 'File', items: ['new-chat', 'new-project', 'new-task', '-', 'add-files', '-', { label: 'Settings', items: ['settings', '-', 'settings-account', 'settings-keys'] }, '-', 'close-window'] },
    { label: 'Edit', items: ['undo', 'redo', '-', 'cut', 'copy', 'paste', 'select-all', '-', 'find', '-', 'compact'] },
    { label: 'View', items: () => ['toggle-sidebar', 'toggle-outputs', 'toggle-terminal', '-', 'toggle-files', 'toggle-browser', 'toggle-background', ...(isMacDesktop() ? ['-', 'menus-in-window'] : [])] },
    { label: 'Go', items: ['home', 'palette', '-', 'go-chat', 'go-projects', 'go-artifacts', 'go-scheduled', 'go-customize'] },
    { label: 'Window', items: ['window-minimize', 'window-zoom'] },
    { label: 'Help', items: () => ['shortcuts', '-', ...(demoList().length ? [{ label: 'Demos', items: demoList().map((d) => demoCommand(d.id)) }, '-'] : []), 'about'] },
  ];

  const menubar = new MenuBar(bar, commands, menus, dialogOpen);

  document.addEventListener('focusin', (e) => { const t = e.target; if (t instanceof HTMLElement && !t.closest(CHROME)) lastFocus = t; }, true);
  document.addEventListener('click', (e) => {
    const node = e.target instanceof Element ? e.target.closest<HTMLElement>('[data-cmd]') : null;
    if (node?.dataset.cmd) commands.run(node.dataset.cmd);
  });
  document.addEventListener('keydown', (e) => {
    if ((e.key !== 'Enter' && e.key !== ' ') || !(e.target instanceof HTMLElement) || !e.target.matches('[data-cmd][role="button"]')) return;
    e.preventDefault();
    if (e.target.dataset.cmd) commands.run(e.target.dataset.cmd);
  });

  if (native) {
    if (wantsNativeMenus()) void native.build().catch(() => undefined);
    for (const topic of ['view', 'active', 'conversations'] as const) host.state.on(topic, () => native.refresh());
  }

  let demoIds: string[] = [];

  return {
    commands,
    menus,
    setDemos(found: readonly DemoDef[]): void {
      setDemoList(found);
      const same = demoList().length === demoIds.length && demoList().every((d, i) => demoCommand(d.id) === demoIds[i] && commands.get(demoIds[i])?.label === d.title && commands.get(demoIds[i])?.description === d.blurb);
      if (same) return;
      for (const id of demoIds) commands.remove(id);
      demoIds = demoList().map((d) => demoCommand(d.id));
      commands.add(...demoList().map((d): Command => ({ id: demoCommand(d.id), label: d.title, description: d.blurb, run: () => host.openDemo(d.id) })));
      if (native && wantsNativeMenus()) void native.build().catch(() => undefined);
    },
    keyLabel(id: string): string {
      const cmd = commands.get(id);
      return cmd ? commands.keyLabel(cmd) : '';
    },
    key(e: KeyboardEvent): void {
      if (menubar.isOpen) return;
      const cmd = commands.forEvent(e);
      if (!cmd || OS_ITEMS[cmd.id] || !commands.enabled(cmd)) return;
      e.preventDefault();
      commands.run(cmd.id);
    },
  };
}
