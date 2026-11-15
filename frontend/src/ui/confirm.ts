import { run } from '../engine-client/api';
import { el, q, setText } from './dom';

let sheet: HTMLElement | null = null;
let settle: ((ok: boolean) => void) | null = null;

function finish(ok: boolean): void {
  if (!sheet || sheet.hidden) return;
  sheet.hidden = true;
  const done = settle;
  settle = null;
  done?.(ok);
}

export function confirmSheet(title: string, note: string, action: string): Promise<boolean> {
  if (!sheet) {
    const box = el(`<div class="ft-sheet-scrim" id="ft-confirm" hidden><div class="ft-sheet ft-consent" role="alertdialog" aria-labelledby="ft-confirm-h" aria-describedby="ft-confirm-p">
      <h2 id="ft-confirm-h"></h2>
      <p id="ft-confirm-p" class="ft-set-note"></p>
      <div class="ft-set-actions"><button type="button" class="ft-btn ft-btn-primary" data-v="yes"></button><button type="button" class="ft-btn" data-v="no">Cancel</button></div>
    </div></div>`);
    box.addEventListener('click', (e) => {
      const v = (e.target as HTMLElement).closest<HTMLElement>('[data-v]')?.dataset.v;
      if (v) finish(v === 'yes');
    });
    box.addEventListener('pointerdown', (e) => { if (e.target === box) finish(false); });
    document.addEventListener('keydown', (e) => { if (e.key === 'Escape') finish(false); });
    (document.getElementById('overlay-root') as HTMLElement).appendChild(box);
    sheet = box;
  }
  finish(false);
  setText(q(sheet, 'h2'), title);
  setText(q(sheet, '.ft-set-note'), note);
  setText(q(sheet, '[data-v="yes"]'), action);
  sheet.hidden = false;
  q<HTMLElement>(sheet, '[data-v="no"]').focus();
  return new Promise((resolve) => { settle = resolve; });
}

export function askDeleteProject(name: string): Promise<boolean> {
  return confirmSheet('Delete this project?', `"${name}" is deleted with its instructions, its list of files and its memory. Its chats are kept and move out of the project. This cannot be undone.`, 'Delete');
}

export function askDeleteSchedule(name: string): Promise<boolean> {
  return confirmSheet('Delete this scheduled task?', `"${name}" stops running and is deleted with its run history. The chats its earlier runs made are kept. This cannot be undone.`, 'Delete');
}

export function askDeleteArtifact(title: string): Promise<boolean> {
  return confirmSheet('Delete this artifact?', `"${title}" is deleted with all of its versions. The chat that made it is kept. This cannot be undone.`, 'Delete');
}

export async function deleteChat(chat: { id: string; title: string; demo?: string | null }): Promise<void> {
  const note = `"${chat.title}" is deleted with its messages, artifacts and files. This cannot be undone.${chat.demo ? ' A demo can be brought back from Help, Demos.' : ''}`;
  if (await confirmSheet('Delete this chat?', note, 'Delete')) await run('conversation.delete', { id: chat.id }).catch(() => undefined);
}
