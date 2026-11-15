import { NOT_ANSWERING } from '../engine-client/api';
import type { AppState } from '../state/app-state';
import { el, setAttr } from './dom';

export class EngineNote {
  private root: HTMLElement;
  private down = false;

  constructor(private state: AppState) {
    this.root = el(`<p class="ft-engine-note" role="status" aria-live="polite"></p>`);
    this.root.textContent = NOT_ANSWERING;
    setAttr(this.root, 'title', NOT_ANSWERING);
    document.body.appendChild(this.root);
    state.on('view', () => this.paint());
  }

  set(down: boolean): void {
    this.down = down;
    this.paint();
  }

  private paint(): void {
    const on = this.down && this.state.view !== 'chat';
    if (this.root.classList.contains('is-on') !== on) this.root.classList.toggle('is-on', on);
  }
}
