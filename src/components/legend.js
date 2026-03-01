/**
 * Legend — Renders the product/node-type legend bar.
 */

export class Legend {
  constructor(containerEl, items) {
    this._container = containerEl;
    this._items = items || [
      { type: 'user', label: 'User / Device' },
      { type: 'cloudflare', label: 'Cloudflare Product' },
      { type: 'ai-service', label: 'AI Service' },
      { type: 'resource', label: 'Resource / API' },
      { type: 'coming-soon', label: 'Coming Soon' },
    ];
    this._render();
  }

  _render() {
    this._container.innerHTML = this._items.map(item => `
      <div class="legend-item">
        <span class="legend-dot ${item.type}"></span>
        <span>${item.label}</span>
      </div>
    `).join('');
  }
}
