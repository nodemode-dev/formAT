import { el, q } from './dom';
import { ui } from './icons-ft';

export class SidePanel {
  readonly root: HTMLElement;

  constructor(onClose: () => void) {
    this.root = el(`<aside class="ft-panel" aria-label="Outputs">
      <div class="ft-panel-head">
        <span class="ft-panel-title">Outputs</span>
        <button type="button" class="ft-icon-btn ft-panel-close" aria-label="Close panel" title="Close panel">${ui('close', 16)}</button>
      </div>
      <div class="ft-panel-body">
        <section class="ft-panel-section">
          <div class="ft-panel-empty">${ui('file', 28)}<p>Files and artifacts made in this chat appear here, with a preview, the source and a download.</p></div>
        </section>
        <section class="ft-panel-section">
          <h3 class="ft-panel-sub">Used in this session</h3>
          <div class="ft-used-row">${ui('paperclip', 16)}<span>Uploads</span><span class="ft-muted">none</span></div>
          <div class="ft-used-row">${ui('globe', 16)}<span>Web search</span><span class="ft-muted">none</span></div>
          <div class="ft-used-row">${ui('skills', 16)}<span>Skills</span><span class="ft-muted">none</span></div>
        </section>
      </div>
    </aside>`);
    q(this.root, '.ft-panel-close').addEventListener('click', onClose);
  }
}
