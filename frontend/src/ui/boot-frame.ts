export type RowState = 'idle' | 'ok' | 'warn' | 'bad';

export interface BootFrame {
  root: HTMLElement;
  set(row: 'engine' | 'events' | 'anthropic' | 'commands', state: RowState, text: string): void;
}

const ROWS: Array<[string, string]> = [
  ['engine', 'Engine'],
  ['events', 'Events'],
  ['anthropic', 'Anthropic key'],
  ['commands', 'Commands'],
];

export function mountBootFrame(host: HTMLElement, version: string): BootFrame {
  const root = document.createElement('main');
  root.className = 'ft-boot';
  root.innerHTML = `<section class="ft-boot-card" aria-labelledby="ft-boot-title">
    <div class="ft-brand">
      <img class="ft-brand-mark" src="/favicon.png" width="32" height="32" alt="" draggable="false">
      <div><div class="ft-brand-name" id="ft-boot-title">FormAT</div><div class="ft-brand-sub">A.T · the Agentic Terminal · v${version}</div></div>
    </div>
    <dl class="ft-status">${ROWS.map(([id, label]) => `<div class="ft-status-row"><dt>${label}</dt><dd data-row="${id}"><i class="ft-dot"></i><span>checking</span></dd></div>`).join('')}</dl>
    <p class="ft-boot-note">FormAT v${version} is waiting for its engine. The window opens by itself as soon as the engine answers.</p>
  </section>`;
  const cells = new Map<string, { dot: HTMLElement; text: Text }>();
  root.querySelectorAll<HTMLElement>('[data-row]').forEach((dd) => {
    const span = dd.querySelector('span') as HTMLElement;
    const text = document.createTextNode('checking');
    span.replaceChildren(text);
    cells.set(dd.dataset.row as string, { dot: dd.querySelector('.ft-dot') as HTMLElement, text });
  });
  host.appendChild(root);
  return {
    root,
    set(row, state, value) {
      const cell = cells.get(row);
      if (!cell) return;
      if (cell.dot.dataset.state !== state) cell.dot.dataset.state = state;
      if (cell.text.data !== value) cell.text.data = value;
    },
  };
}
