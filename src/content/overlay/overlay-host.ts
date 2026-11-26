import { OVERLAY_DATA_ATTR, OVERLAY_HOST_ID, OVERLAY_Z_INDEX } from '@/shared/constants';
import type { OverlayOptions, ThemePreference } from '@/shared/types';

const SVG_NS = 'http://www.w3.org/2000/svg';

const OVERLAY_CSS = `
:host {
  all: initial;
  position: fixed;
  inset: 0;
  z-index: ${OVERLAY_Z_INDEX};
  pointer-events: none;
  font-family: "DM Sans Variable", "DM Sans", -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif;
  font-size: 12px;
  line-height: 16px;
  letter-spacing: -0.02em;
  color: #ededed;
}

.fw-svg {
  position: fixed;
  inset: 0;
  width: 100vw;
  height: 100vh;
  pointer-events: none;
  overflow: visible;
}

.fw-labels {
  position: fixed;
  inset: 0;
  pointer-events: none;
  overflow: hidden;
}

.fw-badge {
  position: fixed;
  display: inline-flex;
  align-items: center;
  gap: 8px;
  height: 24px;
  padding: 0 8px;
  border-radius: 6px;
  background: #141415;
  color: #ededed;
  border: 1px solid rgba(237, 237, 237, 0.14);
  font-family: "Geist Mono", "IBM Plex Mono", ui-monospace, SFMono-Regular, Menlo, monospace;
  font-variant-numeric: tabular-nums;
  font-size: 12px;
  font-weight: 500;
  letter-spacing: 0;
  white-space: nowrap;
  box-shadow: none;
}

.fw-badge--selected {
  background: #19191b;
  border-color: rgba(96, 165, 250, 0.45);
}

.fw-badge__tag {
  color: #60a5fa;
}

.fw-badge--selected .fw-badge__tag {
  color: #ededed;
}

.fw-badge__dims {
  color: #a1a1a6;
  font-weight: 400;
}

.fw-badge__layout {
  padding: 1px 5px;
  border-radius: 4px;
  font-size: 11px;
  font-weight: 500;
  letter-spacing: 0;
}

.fw-badge__layout--flex {
  background: rgba(124, 58, 237, 0.22);
  color: #d8b4fe;
}

.fw-badge__layout--grid {
  background: rgba(219, 39, 119, 0.22);
  color: #f9a8d4;
}

.fw-pill {
  position: fixed;
  transform: translate(-50%, -50%);
  padding: 2px 5px;
  border-radius: 4px;
  font-family: "Geist Mono", "IBM Plex Mono", ui-monospace, SFMono-Regular, Menlo, monospace;
  font-variant-numeric: tabular-nums;
  font-size: 11px;
  font-weight: 500;
  line-height: 14px;
  letter-spacing: 0;
  white-space: nowrap;
  box-shadow: none;
}

.fw-pill--measure {
  background: #e11d48;
  color: #ffffff;
}

.fw-pill--padding {
  background: #14532d;
  color: #dcfce7;
}

.fw-pill--margin {
  background: #78350f;
  color: #fef3c7;
}

/* Flat bottom-left floating bar: outer 10px - padding 4px = inner button 6px */
.fw-hud {
  position: fixed;
  left: 16px;
  bottom: 16px;
  display: flex;
  align-items: center;
  gap: 4px;
  padding: 4px;
  border-radius: 10px;
  background: #141415;
  color: #ededed;
  border: 1px solid rgba(237, 237, 237, 0.14);
  box-shadow: none;
  pointer-events: auto;
  user-select: none;
}

.fw-hud[data-theme="light"] {
  background: #ffffff;
  color: #171717;
  border-color: rgba(23, 23, 23, 0.12);
}

.fw-hud__label {
  display: inline-flex;
  align-items: center;
  gap: 8px;
  padding: 0 8px;
  font-size: 13px;
  font-weight: 500;
  color: inherit;
}

.fw-hud__dot {
  width: 7px;
  height: 7px;
  border-radius: 999px;
  background: #4cc38a;
}

.fw-hud__dot--locked {
  background: #3b82f6;
}

.fw-hud__sep {
  width: 1px;
  height: 16px;
  background: rgba(128, 128, 136, 0.24);
  margin: 0 2px;
}

.fw-hud__btn {
  all: unset;
  box-sizing: border-box;
  cursor: pointer;
  height: 30px;
  padding: 0 10px;
  border-radius: 6px;
  border: 1px solid transparent;
  font-size: 13px;
  font-weight: 400;
  color: #a1a1a6;
  background: transparent;
  display: inline-flex;
  align-items: center;
  transition: background-color 140ms cubic-bezier(0.22, 1, 0.36, 1),
    color 140ms cubic-bezier(0.22, 1, 0.36, 1),
    border-color 140ms cubic-bezier(0.22, 1, 0.36, 1);
}

.fw-hud[data-theme="light"] .fw-hud__btn {
  color: #525252;
}

.fw-hud__btn:hover {
  background: #232325;
  color: #ededed;
}

.fw-hud[data-theme="light"] .fw-hud__btn:hover {
  background: #f4f4f5;
  color: #171717;
}

.fw-hud__btn--active {
  background: #232325;
  color: #ededed;
  font-weight: 500;
  border-color: rgba(237, 237, 237, 0.14);
}

.fw-hud[data-theme="light"] .fw-hud__btn--active {
  background: #f4f4f5;
  color: #171717;
  border-color: rgba(23, 23, 23, 0.12);
}

.fw-hud__btn--close {
  padding: 0 9px;
}

.fw-hud__btn--close:hover {
  background: rgba(229, 72, 77, 0.16);
  color: #e5484d;
}
`;

export interface HudCallbacks {
  onToggleOption: (key: keyof OverlayOptions) => void;
  onUnlock: () => void;
  onClose: () => void;
}

export class OverlayHost {
  private host: HTMLDivElement | null = null;
  private svg: SVGSVGElement | null = null;
  private labels: HTMLDivElement | null = null;
  private hud: HTMLDivElement | null = null;
  private lastHudKey = '';
  private theme: ThemePreference = 'system';
  private callbacks: HudCallbacks;

  constructor(callbacks: HudCallbacks) {
    this.callbacks = callbacks;
  }

  setTheme(theme: ThemePreference): void {
    this.theme = theme;
    this.applyThemeAttr();
  }

  mount(): void {
    if (this.host && this.host.isConnected) return;

    const existing = document.getElementById(OVERLAY_HOST_ID);
    if (existing) existing.remove();

    const host = document.createElement('div');
    host.id = OVERLAY_HOST_ID;
    host.setAttribute(OVERLAY_DATA_ATTR, 'true');

    const shadow = host.attachShadow({ mode: 'open' });

    if (typeof CSSStyleSheet !== 'undefined' && 'adoptedStyleSheets' in shadow) {
      const sheet = new CSSStyleSheet();
      sheet.replaceSync(OVERLAY_CSS);
      shadow.adoptedStyleSheets = [sheet];
    } else {
      const style = document.createElement('style');
      style.textContent = OVERLAY_CSS;
      shadow.appendChild(style);
    }

    const svg = document.createElementNS(SVG_NS, 'svg');
    svg.setAttribute('class', 'fw-svg');
    svg.setAttribute('aria-hidden', 'true');

    const labels = document.createElement('div');
    labels.className = 'fw-labels';

    const hud = document.createElement('div');
    hud.className = 'fw-hud';
    hud.setAttribute(OVERLAY_DATA_ATTR, 'true');

    shadow.append(svg, labels, hud);
    (document.documentElement ?? document.body).appendChild(host);

    this.host = host;
    this.svg = svg;
    this.labels = labels;
    this.hud = hud;
    this.lastHudKey = '';
    this.applyThemeAttr();
  }

  unmount(): void {
    this.host?.remove();
    this.host = null;
    this.svg = null;
    this.labels = null;
    this.hud = null;
    this.lastHudKey = '';
  }

  clearCanvas(): void {
    if (this.svg) {
      this.svg.replaceChildren();
    }
    if (this.labels) {
      this.labels.replaceChildren();
    }
  }

  getSvg(): SVGSVGElement | null {
    return this.svg;
  }

  getLabelsContainer(): HTMLDivElement | null {
    return this.labels;
  }

  renderHud(locked: boolean, options: OverlayOptions): void {
    if (!this.hud) return;

    const hudKey = `${locked}|${options.showBoxModel}|${options.showLayoutGuides}|${options.showMeasurements}`;
    if (hudKey === this.lastHudKey) return;
    this.lastHudKey = hudKey;

    const frag = document.createDocumentFragment();

    const label = document.createElement('span');
    label.className = 'fw-hud__label';

    const dot = document.createElement('span');
    dot.className = locked ? 'fw-hud__dot fw-hud__dot--locked' : 'fw-hud__dot';

    const text = document.createElement('span');
    text.textContent = locked ? 'Locked' : 'Inspecting';
    label.append(dot, text);

    const sep1 = document.createElement('span');
    sep1.className = 'fw-hud__sep';

    const boxBtn = this.makeHudButton(
      'Box',
      'Toggle margin and padding overlay',
      options.showBoxModel,
      () => this.callbacks.onToggleOption('showBoxModel')
    );
    const layoutBtn = this.makeHudButton(
      'Guides',
      'Toggle Flex and Grid layout tracks',
      options.showLayoutGuides,
      () => this.callbacks.onToggleOption('showLayoutGuides')
    );
    const measureBtn = this.makeHudButton(
      'Measure',
      'Toggle distance ruler between locked and hovered elements',
      options.showMeasurements,
      () => this.callbacks.onToggleOption('showMeasurements')
    );

    frag.append(label, sep1, boxBtn, layoutBtn, measureBtn);

    if (locked) {
      const sep2 = document.createElement('span');
      sep2.className = 'fw-hud__sep';
      const unlockBtn = this.makeHudButton('Unlock', 'Unlock selection (Esc)', false, () =>
        this.callbacks.onUnlock()
      );
      frag.append(sep2, unlockBtn);
    }

    const closeBtn = document.createElement('button');
    closeBtn.type = 'button';
    closeBtn.className = 'fw-hud__btn fw-hud__btn--close';
    closeBtn.textContent = '×';
    closeBtn.title = 'Pause inspecting (Esc)';
    closeBtn.addEventListener('click', (e) => {
      e.preventDefault();
      e.stopPropagation();
      this.callbacks.onClose();
    });
    frag.append(closeBtn);

    this.hud.replaceChildren(frag);
  }

  private applyThemeAttr(): void {
    if (!this.hud) return;
    const resolved =
      this.theme === 'system'
        ? window.matchMedia?.('(prefers-color-scheme: light)').matches
          ? 'light'
          : 'dark'
        : this.theme;
    this.hud.setAttribute('data-theme', resolved);
  }

  private makeHudButton(
    label: string,
    title: string,
    active: boolean,
    onClick: () => void
  ): HTMLButtonElement {
    const btn = document.createElement('button');
    btn.type = 'button';
    btn.className = active ? 'fw-hud__btn fw-hud__btn--active' : 'fw-hud__btn';
    btn.textContent = label;
    btn.title = title;
    btn.addEventListener('click', (e) => {
      e.preventDefault();
      e.stopPropagation();
      onClick();
    });
    return btn;
  }
}

export function createSvgEl<K extends keyof SVGElementTagNameMap>(
  tag: K,
  attrs: Record<string, string | number>
): SVGElementTagNameMap[K] {
  const el = document.createElementNS(SVG_NS, tag);
  for (const [k, v] of Object.entries(attrs)) {
    el.setAttribute(k, String(v));
  }
  return el;
}
