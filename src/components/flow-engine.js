/**
 * FlowEngine — Step-through animation controller for request-flow diagrams.
 *
 * Usage:
 *   const engine = new FlowEngine({ steps, nodes, edges, onStepChange });
 *   engine.mount(containerEl, panelEl);
 *
 * Adding a new use case requires only a new steps data file — zero changes to this engine.
 */

export class FlowEngine {
  constructor({ steps, nodes, edges, onStepChange }) {
    this.steps = steps;
    this.nodes = nodes;
    this.edges = edges;
    this.currentStep = -1; // -1 = overview (nothing highlighted)
    this.isPlaying = false;
    this.playInterval = null;
    this.onStepChange = onStepChange || (() => {});
    this._container = null;
    this._panel = null;
    this._svgEl = null;
    this._animatingPacket = null;
  }

  mount(containerEl, panelEl) {
    this._container = containerEl;
    this._panel = panelEl;
    this._render();
    this._renderEdges();
    this._bindControls();
    this._updateView();
  }

  // ── Rendering ──

  _render() {
    const container = this._container.querySelector('.flow-columns');
    if (!container) return;

    // Pre-compute which same-column node pairs have a labeled edge between them.
    // These pairs need extra vertical spacing so the label text is readable.
    const labeledSameColPairs = new Set();
    this.edges.forEach(edge => {
      if (!edge.label) return;
      const fromNode = this.nodes.find(n => n.id === edge.from);
      const toNode = this.nodes.find(n => n.id === edge.to);
      if (fromNode && toNode && fromNode.column === toNode.column) {
        // Mark the "from" node so we can add bottom margin after it
        labeledSameColPairs.add(edge.from + '|' + fromNode.column);
      }
    });

    // Render nodes into their columns
    ['left', 'center', 'right'].forEach(col => {
      const colEl = container.querySelector(`.col-${col}`);
      if (!colEl) return;
      const colNodes = this.nodes.filter(n => n.column === col);

      // Keep the column label if it exists
      const existingLabel = colEl.querySelector('.column-label');

      colNodes.forEach(node => {
        const el = document.createElement('div');
        el.className = 'flow-node';
        el.dataset.id = node.id;
        el.dataset.type = node.type;
        el.setAttribute('role', 'button');
        el.setAttribute('tabindex', '0');
        el.setAttribute('aria-label', node.label);

        // Add extra spacing class if this node has a labeled edge to next same-column node
        if (labeledSameColPairs.has(node.id + '|' + col)) {
          el.classList.add('has-labeled-edge');
        }

        el.innerHTML = `
          <span class="node-icon">${node.icon}</span>
          <span class="node-label">
            ${node.label}
            ${node.sublabel ? `<span class="node-sublabel">${node.sublabel}</span>` : ''}
          </span>
          ${node.comingSoon ? '<span class="coming-soon-badge">Coming Soon</span>' : ''}
        `;
        colEl.appendChild(el);
      });
    });
  }

  _renderEdges() {
    const svg = this._container.querySelector('.flow-edges');
    if (!svg) return;
    this._svgEl = svg;

    // We need to wait for layout
    requestAnimationFrame(() => {
      this._drawEdges();
    });

    // Redraw on resize
    this._resizeObserver = new ResizeObserver(() => {
      this._drawEdges();
    });
    this._resizeObserver.observe(this._container);
  }

  _drawEdges() {
    if (!this._svgEl) return;
    const flowContainer = this._container.querySelector('.flow-container');
    const containerRect = flowContainer.getBoundingClientRect();

    // Set SVG size to match container
    this._svgEl.setAttribute('width', flowContainer.scrollWidth);
    this._svgEl.setAttribute('height', flowContainer.scrollHeight);
    this._svgEl.style.width = flowContainer.scrollWidth + 'px';
    this._svgEl.style.height = flowContainer.scrollHeight + 'px';

    // Clear existing
    this._svgEl.innerHTML = '';

    // Defs for arrow markers
    const defs = document.createElementNS('http://www.w3.org/2000/svg', 'defs');

    const createMarker = (id, color) => {
      const marker = document.createElementNS('http://www.w3.org/2000/svg', 'marker');
      marker.setAttribute('id', id);
      marker.setAttribute('viewBox', '0 0 10 7');
      marker.setAttribute('refX', '10');
      marker.setAttribute('refY', '3.5');
      marker.setAttribute('markerWidth', '10');
      marker.setAttribute('markerHeight', '8');
      marker.setAttribute('orient', 'auto-start-reverse');
      const polygon = document.createElementNS('http://www.w3.org/2000/svg', 'polygon');
      polygon.setAttribute('points', '0 0, 10 3.5, 0 7');
      polygon.setAttribute('fill', color);
      marker.appendChild(polygon);
      return marker;
    };

    defs.appendChild(createMarker('arrow-default', 'var(--border-color)'));
    defs.appendChild(createMarker('arrow-active', 'var(--cf-orange)'));
    this._svgEl.appendChild(defs);

    // Helper to get node column
    const getNodeColumn = (nodeId) => {
      const node = this.nodes.find(n => n.id === nodeId);
      return node ? node.column : null;
    };

    // Inset in px — keep arrows from touching node borders
    const ARROW_INSET = 6;

    this.edges.forEach(edge => {
      const fromEl = this._container.querySelector(`[data-id="${edge.from}"]`);
      const toEl = this._container.querySelector(`[data-id="${edge.to}"]`);
      if (!fromEl || !toEl) return;

      const fromRect = fromEl.getBoundingClientRect();
      const toRect = toEl.getBoundingClientRect();
      const fromCol = getNodeColumn(edge.from);
      const toCol = getNodeColumn(edge.to);

      let startX, startY, endX, endY, d;

      // Determine connection points based on node positions
      const sameColumn = (fromCol === toCol);
      const fromCenterX = fromRect.left + fromRect.width / 2 - containerRect.left;
      const fromCenterY = fromRect.top + fromRect.height / 2 - containerRect.top;
      const toCenterX = toRect.left + toRect.width / 2 - containerRect.left;
      const toCenterY = toRect.top + toRect.height / 2 - containerRect.top;

      if (sameColumn) {
        // Vertical connection within same column
        startX = fromCenterX;
        startY = fromRect.bottom - containerRect.top + ARROW_INSET;
        endX = toCenterX;
        endY = toRect.top - containerRect.top - ARROW_INSET;

        // If target is above source, flip
        if (endY < startY) {
          startY = fromRect.top - containerRect.top - ARROW_INSET;
          endY = toRect.bottom - containerRect.top + ARROW_INSET;
        }

        // Smooth vertical bezier
        const dist = Math.abs(endY - startY);
        const cpOffset = Math.max(dist * 0.35, 20);
        d = `M ${startX} ${startY} C ${startX} ${startY + cpOffset}, ${endX} ${endY - cpOffset}, ${endX} ${endY}`;
      } else if (edge.direction === 'rtl') {
        // Right-to-left (response path)
        startX = fromRect.left - containerRect.left - ARROW_INSET;
        startY = fromCenterY;
        endX = toRect.right - containerRect.left + ARROW_INSET;
        endY = toCenterY;

        // If from is left of to, swap connection points
        if (startX < endX) {
          startX = fromRect.right - containerRect.left + ARROW_INSET;
          endX = toRect.left - containerRect.left - ARROW_INSET;
        }

        const dx = endX - startX;
        const cp1x = startX + dx * 0.35;
        const cp2x = startX + dx * 0.65;
        d = `M ${startX} ${startY} C ${cp1x} ${startY}, ${cp2x} ${endY}, ${endX} ${endY}`;
      } else {
        // Left-to-right (default request path)
        startX = fromRect.right - containerRect.left + ARROW_INSET;
        startY = fromCenterY;
        endX = toRect.left - containerRect.left - ARROW_INSET;
        endY = toCenterY;

        // For cross-column connections where from is right of to
        if (startX > endX + 10) {
          startX = fromRect.left - containerRect.left - ARROW_INSET;
          endX = toRect.right - containerRect.left + ARROW_INSET;
        }

        const dx = endX - startX;
        const cp1x = startX + dx * 0.35;
        const cp2x = startX + dx * 0.65;
        d = `M ${startX} ${startY} C ${cp1x} ${startY}, ${cp2x} ${endY}, ${endX} ${endY}`;
      }

      const path = document.createElementNS('http://www.w3.org/2000/svg', 'path');
      path.setAttribute('d', d);
      path.classList.add('flow-edge');
      path.dataset.edgeId = edge.id;
      path.setAttribute('marker-end', 'url(#arrow-default)');
      this._svgEl.appendChild(path);

      // Edge label — position at path midpoint with offset for readability
      if (edge.label) {
        const pathLen = path.getTotalLength();
        const midPt = path.getPointAtLength(pathLen * 0.5);
        const text = document.createElementNS('http://www.w3.org/2000/svg', 'text');

        if (sameColumn) {
          // Same-column: label sits to the right of the curve midpoint
          text.setAttribute('x', midPt.x + 10);
          text.setAttribute('y', midPt.y + 4);
          text.setAttribute('text-anchor', 'start');
        } else {
          // Cross-column: label sits above the curve midpoint
          text.setAttribute('x', midPt.x);
          text.setAttribute('y', midPt.y - 10);
          text.setAttribute('text-anchor', 'middle');
        }

        text.classList.add('flow-edge-label');
        text.dataset.edgeId = edge.id;
        text.textContent = edge.label;
        this._svgEl.appendChild(text);
      }
    });
  }

  // ── Controls ──

  _bindControls() {
    const playBtn = this._panel.querySelector('[data-action="play"]');
    const nextBtn = this._panel.querySelector('[data-action="next"]');
    const prevBtn = this._panel.querySelector('[data-action="prev"]');
    const resetBtn = this._panel.querySelector('[data-action="reset"]');

    // Add accessible labels to buttons
    if (playBtn) {
      playBtn.setAttribute('aria-label', 'Play animation');
      playBtn.addEventListener('click', () => this.togglePlay());
    }
    if (nextBtn) {
      nextBtn.setAttribute('aria-label', 'Next step');
      nextBtn.addEventListener('click', () => this.next());
    }
    if (prevBtn) {
      prevBtn.setAttribute('aria-label', 'Previous step');
      prevBtn.addEventListener('click', () => this.prev());
    }
    if (resetBtn) {
      resetBtn.setAttribute('aria-label', 'Reset to overview');
      resetBtn.addEventListener('click', () => this.reset());
    }

    // Mark the step info panel as a live region for screen readers
    const stepInfo = this._panel.querySelector('.panel-step-info');
    if (stepInfo) {
      stepInfo.setAttribute('aria-live', 'polite');
      stepInfo.setAttribute('aria-atomic', 'true');
    }

    // Node click/tap => tooltip
    this._container.querySelectorAll('.flow-node').forEach(el => {
      const handler = (e) => {
        // Prevent ghost clicks on touch devices
        e.preventDefault();
        const nodeId = el.dataset.id;
        const node = this.nodes.find(n => n.id === nodeId);
        if (node) {
          window.dispatchEvent(new CustomEvent('show-tooltip', {
            detail: { node, targetEl: el }
          }));
        }
      };
      el.addEventListener('click', handler);

      // Allow keyboard activation (Enter/Space) since nodes have role="button"
      el.addEventListener('keydown', (e) => {
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault();
          handler(e);
        }
      });
    });

    // Keyboard navigation
    document.addEventListener('keydown', (e) => {
      // Don't intercept if user is typing in an input
      if (e.target.tagName === 'INPUT' || e.target.tagName === 'TEXTAREA') return;

      if (e.key === 'ArrowRight' || e.key === ' ') {
        e.preventDefault();
        this.next();
      } else if (e.key === 'ArrowLeft') {
        e.preventDefault();
        this.prev();
      } else if (e.key === 'Escape') {
        this.reset();
      }
    });

    // Touch swipe gestures on the panel for mobile navigation
    this._bindSwipeGestures();
  }

  /**
   * Bind horizontal swipe gestures on the side panel.
   * Swipe left = next step, swipe right = previous step.
   * Uses a minimum threshold to avoid conflicts with vertical scrolling.
   */
  _bindSwipeGestures() {
    const panel = this._panel;
    if (!panel) return;

    let startX = 0;
    let startY = 0;
    let tracking = false;

    const SWIPE_THRESHOLD = 50; // min px for a swipe
    const ANGLE_THRESHOLD = 30; // max degrees from horizontal

    panel.addEventListener('touchstart', (e) => {
      if (e.touches.length !== 1) return;
      startX = e.touches[0].clientX;
      startY = e.touches[0].clientY;
      tracking = true;
    }, { passive: true });

    panel.addEventListener('touchend', (e) => {
      if (!tracking || e.changedTouches.length !== 1) return;
      tracking = false;

      const dx = e.changedTouches[0].clientX - startX;
      const dy = e.changedTouches[0].clientY - startY;
      const absDx = Math.abs(dx);
      const absDy = Math.abs(dy);

      // Only count as swipe if horizontal motion exceeds threshold
      // and the angle is mostly horizontal (not a vertical scroll)
      if (absDx < SWIPE_THRESHOLD) return;
      const angle = Math.atan2(absDy, absDx) * (180 / Math.PI);
      if (angle > ANGLE_THRESHOLD) return;

      if (dx < 0) {
        this.next();  // Swipe left = next
      } else {
        this.prev();  // Swipe right = prev
      }
    }, { passive: true });
  }

  // ── Navigation ──

  next() {
    if (this.currentStep < this.steps.length - 1) {
      this.currentStep++;
      this._updateView();
      this._animatePacket();
    } else {
      this.pause();
    }
  }

  prev() {
    if (this.currentStep > -1) {
      this.currentStep--;
      this._updateView();
    }
  }

  reset() {
    this.pause();
    this.currentStep = -1;
    this._updateView();
  }

  togglePlay() {
    if (this.isPlaying) {
      this.pause();
    } else {
      this.play();
    }
  }

  play() {
    this.isPlaying = true;
    this._updatePlayButton();
    if (this.currentStep >= this.steps.length - 1) {
      this.currentStep = -1;
    }
    this.next();
    this.playInterval = setInterval(() => {
      if (this.currentStep < this.steps.length - 1) {
        this.next();
      } else {
        this.pause();
      }
    }, 2500);
  }

  pause() {
    this.isPlaying = false;
    if (this.playInterval) {
      clearInterval(this.playInterval);
      this.playInterval = null;
    }
    this._updatePlayButton();
  }

  // ���─ View Update ──

  _updateView() {
    const step = this.steps[this.currentStep];

    // Update nodes
    this._container.querySelectorAll('.flow-node').forEach(el => {
      const nodeId = el.dataset.id;
      if (this.currentStep === -1) {
        // Overview: show all
        el.classList.remove('active', 'dimmed');
      } else {
        const isActive = step.activeNodes.includes(nodeId);
        el.classList.toggle('active', isActive);
        el.classList.toggle('dimmed', !isActive);
      }
    });

    // Update edges
    this._container.querySelectorAll('.flow-edge').forEach(el => {
      const edgeId = el.dataset.edgeId;
      if (this.currentStep === -1) {
        el.classList.remove('active', 'dimmed');
        el.setAttribute('marker-end', 'url(#arrow-default)');
      } else {
        const isActive = step.activeEdges && step.activeEdges.includes(edgeId);
        el.classList.toggle('active', isActive);
        el.classList.toggle('dimmed', !isActive);
        el.setAttribute('marker-end', isActive ? 'url(#arrow-active)' : 'url(#arrow-default)');
      }
    });

    // Update edge labels
    this._container.querySelectorAll('.flow-edge-label').forEach(el => {
      const edgeId = el.dataset.edgeId;
      if (this.currentStep === -1) {
        el.classList.remove('active');
      } else {
        const isActive = step.activeEdges && step.activeEdges.includes(edgeId);
        el.classList.toggle('active', isActive);
      }
    });

    // Update step counter
    const counter = this._panel.querySelector('.step-counter');
    if (counter) {
      counter.textContent = this.currentStep === -1
        ? `0 / ${this.steps.length}`
        : `${this.currentStep + 1} / ${this.steps.length}`;
    }

    // Update prev/next buttons
    const prevBtn = this._panel.querySelector('[data-action="prev"]');
    const nextBtn = this._panel.querySelector('[data-action="next"]');
    if (prevBtn) prevBtn.disabled = this.currentStep <= -1;
    if (nextBtn) nextBtn.disabled = this.currentStep >= this.steps.length - 1;

    // Update step info panel
    this._renderStepInfo(step);

    // Callback
    this.onStepChange(this.currentStep, step);
  }

  _renderStepInfo(step) {
    const infoEl = this._panel.querySelector('.panel-step-info');
    if (!infoEl) return;

    if (!step) {
      infoEl.innerHTML = `
        <div class="step-info-placeholder">
          <span class="placeholder-icon">&#9654;</span>
          <p>Press <strong>Play</strong> or use the <strong>arrow keys</strong> to step through the request flow.</p>
          <p style="font-size: 0.8125rem; margin-top: 0.5rem; color: var(--text-muted);">Tap any node for details.</p>
        </div>
      `;
      return;
    }

    let owaspHtml = '';
    if (step.owasp && step.owasp.length > 0) {
      const hasLLM = step.owasp.some(t => t.startsWith('LLM'));
      const hasASI = step.owasp.some(t => t.startsWith('ASI'));
      const owaspTitle = hasLLM && hasASI
        ? 'OWASP Top 10 for LLMs & Agentic Applications'
        : hasASI
          ? 'OWASP Top 10 for Agentic Applications'
          : 'OWASP Top 10 for LLMs';
      owaspHtml = `<div class="step-owasp-labels">
           <div class="step-owasp-header">${owaspTitle}</div>
           ${step.owasp.map(tag => `<span class="owasp-badge">${tag}</span>`).join('')}
         </div>`;
    }

    infoEl.innerHTML = `
      <div>
        <div style="display: flex; align-items: center; margin-bottom: 0.25rem;">
          <span class="step-number">${this.currentStep + 1}</span>
          <span class="step-title">${step.title}</span>
        </div>
        ${step.product ? `<span class="step-product">${step.product}</span>` : ''}
        <div class="step-description">${step.description}</div>
        ${step.why ? `
          <div class="step-why">
            <div class="step-why-label">Why it matters</div>
            <p>${step.why}</p>
          </div>
        ` : ''}
        ${owaspHtml}
        ${step.docsUrl ? `
          <a class="step-docs-link" href="${step.docsUrl}" target="_blank" rel="noopener">
            Docs &#8599;
          </a>
        ` : ''}
      </div>
    `;
  }

  _updatePlayButton() {
    const playBtn = this._panel.querySelector('[data-action="play"]');
    if (!playBtn) return;
    playBtn.textContent = this.isPlaying ? 'Pause' : 'Play';
    playBtn.setAttribute('aria-label', this.isPlaying ? 'Pause animation' : 'Play animation');
  }

  // ── Packet Animation ──

  _animatePacket() {
    const step = this.steps[this.currentStep];
    if (!step || !step.activeEdges || step.activeEdges.length === 0) return;

    // Animate along the first active edge
    const edgeId = step.activeEdges[0];
    const pathEl = this._svgEl.querySelector(`path[data-edge-id="${edgeId}"]`);
    if (!pathEl) return;

    // Remove any existing packet
    if (this._animatingPacket) {
      this._animatingPacket.remove();
    }

    const circle = document.createElementNS('http://www.w3.org/2000/svg', 'circle');
    circle.classList.add('packet-dot');
    circle.setAttribute('r', '4');
    this._svgEl.appendChild(circle);
    this._animatingPacket = circle;

    const pathLength = pathEl.getTotalLength();
    const duration = 800;
    const start = performance.now();

    const animate = (time) => {
      const elapsed = time - start;
      const progress = Math.min(elapsed / duration, 1);
      // Ease in-out
      const eased = progress < 0.5
        ? 2 * progress * progress
        : -1 + (4 - 2 * progress) * progress;

      const point = pathEl.getPointAtLength(eased * pathLength);
      circle.setAttribute('cx', point.x);
      circle.setAttribute('cy', point.y);

      if (progress < 1) {
        requestAnimationFrame(animate);
      } else {
        // Fade out
        circle.style.transition = 'opacity 0.3s';
        circle.style.opacity = '0';
        setTimeout(() => circle.remove(), 300);
      }
    };

    requestAnimationFrame(animate);
  }

  // ── Cleanup ──

  destroy() {
    this.pause();
    if (this._resizeObserver) {
      this._resizeObserver.disconnect();
    }
  }
}
