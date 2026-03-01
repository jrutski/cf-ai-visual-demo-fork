/**
 * Tooltip — Contextual overlay for node details.
 * Listens for 'show-tooltip' custom events dispatched by FlowEngine.
 */

export class Tooltip {
  constructor() {
    this._el = null;
    this._visible = false;
    this._init();
  }

  _init() {
    // Create tooltip element
    this._el = document.createElement('div');
    this._el.className = 'tooltip-overlay';
    this._el.innerHTML = '<div class="tooltip-card"></div>';
    document.body.appendChild(this._el);

    // Listen for show-tooltip events
    window.addEventListener('show-tooltip', (e) => {
      this.show(e.detail.node, e.detail.targetEl);
    });

    // Close on click outside
    document.addEventListener('click', (e) => {
      if (this._visible && !this._el.contains(e.target)) {
        // Check if click was on a node — if so, don't close (a new tooltip will replace)
        if (!e.target.closest('.flow-node')) {
          this.hide();
        }
      }
    });

    // Close on escape
    document.addEventListener('keydown', (e) => {
      if (e.key === 'Escape') this.hide();
    });
  }

  show(node, targetEl) {
    const card = this._el.querySelector('.tooltip-card');

    card.innerHTML = `
      <h4>${node.label}</h4>
      ${node.product ? `<div style="font-size: 0.6875rem; color: var(--cf-orange); margin-bottom: 0.375rem;">${node.product}</div>` : ''}
      <p>${node.description || ''}</p>
      ${node.docsUrl ? `<a class="tooltip-link" href="${node.docsUrl}" target="_blank" rel="noopener">View docs &#8599;</a>` : ''}
    `;

    // Position near the target element
    const rect = targetEl.getBoundingClientRect();
    const tooltipWidth = 260;

    // Decide placement: try right, then left
    let left = rect.right + 12;
    let top = rect.top + rect.height / 2 - 40;

    if (left + tooltipWidth > window.innerWidth) {
      left = rect.left - tooltipWidth - 12;
    }

    // Keep in viewport vertically
    top = Math.max(8, Math.min(top, window.innerHeight - 200));

    this._el.style.left = `${left}px`;
    this._el.style.top = `${top}px`;
    this._el.classList.add('visible');
    this._visible = true;
  }

  hide() {
    this._el.classList.remove('visible');
    this._visible = false;
  }
}
