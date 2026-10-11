import type { AppState, Message } from '../state/app-state';
import type { Composer } from './composer';
import { el, esc, q } from './dom';
import { ui } from './icons-ft';

function greeting(): string {
  const h = new Date().getHours();
  return h < 5 ? 'Up late?' : h < 12 ? 'Good morning' : h < 18 ? 'Good afternoon' : 'Good evening';
}

export class ChatView {
  readonly root: HTMLElement;
  private scroller: HTMLElement;
  private thread: HTMLElement;
  private note: HTMLElement;
  private toBottom: HTMLButtonElement;
  private nodes = new Map<string, HTMLElement>();
  private shownFor: string | null = null;

  constructor(private state: AppState, composer: Composer) {
    this.root = el(`<section class="ft-chat is-empty" aria-label="Conversation">
      <div class="ft-chat-scroll" tabindex="-1">
        <div class="ft-greeting"><span class="ft-greeting-text">${esc(greeting())}</span></div>
        <div class="ft-thread" role="log" aria-live="polite"></div>
        <p class="ft-thread-note" hidden>Format v0.2.0 keeps your message in the conversation; replies from Claude arrive in v0.3.0.</p>
      </div>
      <div class="ft-chat-dock">
        <button type="button" class="ft-to-bottom" aria-label="Scroll to the latest message" hidden>${ui('arrowDown', 16)}</button>
      </div>
    </section>`);
    this.scroller = q(this.root, '.ft-chat-scroll');
    this.thread = q(this.root, '.ft-thread');
    this.note = q(this.root, '.ft-thread-note');
    this.toBottom = q(this.root, '.ft-to-bottom');
    q(this.root, '.ft-chat-dock').appendChild(composer.root);
    this.toBottom.addEventListener('click', () => this.scroller.scrollTo({ top: this.scroller.scrollHeight, behavior: 'smooth' }));
    this.scroller.addEventListener('scroll', () => this.updateToBottom(), { passive: true });
    state.on('messages', () => this.render());
    state.on('active', () => this.render());
  }

  private nearBottom(): boolean {
    return this.scroller.scrollHeight - this.scroller.scrollTop - this.scroller.clientHeight < 48;
  }

  private updateToBottom(): void {
    const hide = this.nearBottom() || this.state.messages.length === 0;
    if (this.toBottom.hidden !== hide) this.toBottom.hidden = hide;
  }

  private node(m: Message): HTMLElement {
    let n = this.nodes.get(m.id);
    if (!n) {
      const text = m.content.filter((b) => b.type === 'text').map((b) => b.text ?? '').join('\n\n');
      n = el(`<article class="ft-msg is-${m.role}" data-id="${esc(m.id)}"><div class="ft-msg-body"></div></article>`);
      q(n, '.ft-msg-body').textContent = text;
      this.nodes.set(m.id, n);
    }
    return n;
  }

  private render(): void {
    const switching = this.shownFor !== this.state.activeId;
    const stick = switching || this.nearBottom();
    if (switching) {
      this.nodes.forEach((n) => n.remove());
      this.nodes.clear();
      this.shownFor = this.state.activeId;
    }
    const msgs = this.state.messages;
    msgs.forEach((m, i) => {
      const n = this.node(m);
      if (this.thread.children[i] !== n) this.thread.insertBefore(n, this.thread.children[i] ?? null);
    });
    const empty = msgs.length === 0;
    this.root.classList.toggle('is-empty', empty);
    const last = msgs[msgs.length - 1];
    const showNote = !!last && last.role === 'user';
    if (this.note.hidden === showNote) this.note.hidden = !showNote;
    if (stick) this.scroller.scrollTop = this.scroller.scrollHeight;
    this.updateToBottom();
  }
}
