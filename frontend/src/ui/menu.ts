import { el, esc } from './dom';
import { ui, type UiIcon } from './icons-ft';

export interface MenuItem {
  label?: string;
  desc?: string;
  icon?: UiIcon;
  hint?: string;
  chip?: string;
  chipTone?: 'warn' | 'plain';
  checked?: boolean;
  value?: string;
  disabled?: boolean;
  divider?: boolean;
  note?: string;
  submenu?: () => MenuItem[];
  action?: () => void;
}

type Placement = 'up' | 'down' | 'right';

const stack: HTMLElement[] = [];
let outsideBound = false;

function overlay(): HTMLElement {
  return document.getElementById('overlay-root') as HTMLElement;
}

export function closeMenus(depth = 0): void {
  while (stack.length > depth) stack.pop()!.remove();
}

function onOutside(e: Event): void {
  if (!stack.length) return;
  const target = e.target as Node;
  if (stack.some((m) => m.contains(target))) return;
  if ((target as HTMLElement).closest?.('[data-menu-anchor]')) return;
  closeMenus();
}

function onKey(e: KeyboardEvent): void {
  if (e.key === 'Escape' && stack.length) {
    e.stopPropagation();
    closeMenus(stack.length - 1);
  }
}

function place(menu: HTMLElement, anchor: DOMRect, placement: Placement): void {
  const gap = 6;
  const w = menu.offsetWidth;
  const h = menu.offsetHeight;
  const vw = window.innerWidth;
  const vh = window.innerHeight;
  let x = anchor.left;
  let y = anchor.bottom + gap;
  if (placement === 'up') y = anchor.top - gap - h;
  if (placement === 'right') {
    x = anchor.right + 2;
    y = anchor.top - 6;
    if (x + w > vw - 8) x = anchor.left - w - 2;
  }
  x = Math.max(8, Math.min(x, vw - w - 8));
  y = Math.max(8, Math.min(y, vh - h - 8));
  menu.style.left = `${Math.round(x)}px`;
  menu.style.top = `${Math.round(y)}px`;
}

export function openMenu(anchor: HTMLElement, items: MenuItem[], placement: Placement = 'down', depth = 0, title?: string): HTMLElement {
  if (!outsideBound) {
    document.addEventListener('pointerdown', onOutside, true);
    document.addEventListener('keydown', onKey, true);
    outsideBound = true;
  }
  closeMenus(depth);
  const menu = el(`<div class="ft-menu" role="menu"${title ? ` aria-label="${esc(title)}"` : ''}></div>`);
  if (title) menu.appendChild(el(`<div class="ft-menu-note">${esc(title)}</div>`));
  items.forEach((item) => {
    if (item.divider) {
      menu.appendChild(el('<div class="ft-menu-divider" role="separator"></div>'));
      return;
    }
    if (item.note) {
      menu.appendChild(el(`<div class="ft-menu-note">${esc(item.note)}</div>`));
      return;
    }
    const row = el<HTMLButtonElement>(`<button type="button" class="ft-menu-item" role="menuitem"${item.disabled ? ' disabled' : ''}>
      ${item.icon ? `<span class="ft-menu-icon">${ui(item.icon, 16)}</span>` : ''}
      <span class="ft-menu-text"><span class="ft-menu-label">${esc(item.label)}${item.chip ? `<span class="ft-chip${item.chipTone === 'warn' ? ' is-warn' : ''}">${esc(item.chip)}</span>` : ''}</span>${item.desc ? `<span class="ft-menu-desc">${esc(item.desc)}</span>` : ''}</span>
      ${item.value ? `<span class="ft-menu-value">${esc(item.value)}</span>` : ''}
      ${item.hint ? `<span class="ft-menu-hint">${esc(item.hint)}</span>` : ''}
      ${item.checked ? `<span class="ft-menu-check">${ui('check', 16)}</span>` : ''}
      ${item.submenu ? `<span class="ft-menu-sub">${ui('chevronRight', 14)}</span>` : ''}
    </button>`);
    if (item.submenu) {
      const openSub = () => {
        if (stack[depth + 1]?.dataset.parent === item.label) return;
        const sub = openMenu(row, item.submenu!(), 'right', depth + 1);
        sub.dataset.parent = item.label ?? '';
      };
      row.addEventListener('pointerenter', openSub);
      row.addEventListener('click', openSub);
    } else {
      row.addEventListener('pointerenter', () => closeMenus(depth + 1));
      row.addEventListener('click', () => {
        closeMenus();
        item.action?.();
      });
    }
    menu.appendChild(row);
  });
  menu.style.visibility = 'hidden';
  overlay().appendChild(menu);
  place(menu, anchor.getBoundingClientRect(), placement);
  menu.style.visibility = '';
  stack.push(menu);
  return menu;
}
