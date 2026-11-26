import { OVERLAY_DATA_ATTR, REFERENCE_HOST_ID, REFERENCE_Z_INDEX } from '@/shared/constants';
import type { ReferenceOverlayState } from '@/shared/types';

export const DEFAULT_REFERENCE_STATE: ReferenceOverlayState = {
  imageDataUrl: null,
  imageName: '',
  naturalWidth: 0,
  naturalHeight: 0,
  visible: true,
  opacity: 0.5,
  blendMode: 'normal',
  splitPercent: 50,
  scale: 1,
  offsetX: 0,
  offsetY: 0,
  lockToScroll: true,
};

const REFERENCE_CSS = `
:host {
  all: initial;
  position: fixed;
  inset: 0;
  z-index: ${REFERENCE_Z_INDEX};
  pointer-events: none;
}

.fw-ref-layer {
  position: fixed;
  inset: 0;
  overflow: hidden;
  pointer-events: none;
}

.fw-ref-img {
  position: fixed;
  top: 0;
  left: 0;
  max-width: none;
  transform-origin: top left;
  pointer-events: none;
  user-select: none;
  image-rendering: auto;
}

.fw-ref-divider {
  position: fixed;
  top: 0;
  bottom: 0;
  width: 1px;
  background: #3b82f6;
  pointer-events: none;
}
`;

export class ReferenceOverlayHost {
  private host: HTMLDivElement | null = null;
  private layer: HTMLDivElement | null = null;
  private img: HTMLImageElement | null = null;
  private divider: HTMLDivElement | null = null;
  private state: ReferenceOverlayState = { ...DEFAULT_REFERENCE_STATE };
  private scrollListening = false;

  getState(): ReferenceOverlayState {
    return { ...this.state };
  }

  update(next: ReferenceOverlayState | null): void {
    if (!next || !next.imageDataUrl) {
      this.clear();
      return;
    }

    this.state = { ...next };

    if (!this.state.visible) {
      this.unmount();
      return;
    }

    this.ensureMounted();
    this.applyStyles();
  }

  clear(): void {
    this.state = { ...DEFAULT_REFERENCE_STATE };
    this.unmount();
  }

  private handleScroll = (): void => {
    if (this.state.lockToScroll && this.img) {
      this.applyPosition();
    }
  };

  private ensureMounted(): void {
    if (this.host && this.host.isConnected && this.img && this.layer) return;

    const existing = document.getElementById(REFERENCE_HOST_ID);
    if (existing) existing.remove();

    const host = document.createElement('div');
    host.id = REFERENCE_HOST_ID;
    host.setAttribute(OVERLAY_DATA_ATTR, 'true');

    const shadow = host.attachShadow({ mode: 'open' });
    if (typeof CSSStyleSheet !== 'undefined' && 'adoptedStyleSheets' in shadow) {
      const sheet = new CSSStyleSheet();
      sheet.replaceSync(REFERENCE_CSS);
      shadow.adoptedStyleSheets = [sheet];
    } else {
      const style = document.createElement('style');
      style.textContent = REFERENCE_CSS;
      shadow.appendChild(style);
    }

    const layer = document.createElement('div');
    layer.className = 'fw-ref-layer';

    const img = document.createElement('img');
    img.className = 'fw-ref-img';
    img.alt = '';
    img.draggable = false;

    const divider = document.createElement('div');
    divider.className = 'fw-ref-divider';

    layer.append(img, divider);
    shadow.appendChild(layer);
    (document.documentElement ?? document.body).appendChild(host);

    this.host = host;
    this.layer = layer;
    this.img = img;
    this.divider = divider;

    if (!this.scrollListening) {
      window.addEventListener('scroll', this.handleScroll, { passive: true });
      this.scrollListening = true;
    }
  }

  private applyStyles(): void {
    if (!this.img || !this.layer || !this.divider || !this.state.imageDataUrl) return;

    if (this.img.src !== this.state.imageDataUrl) {
      this.img.src = this.state.imageDataUrl;
    }

    const { opacity, blendMode, splitPercent } = this.state;

    // Difference mode needs mix-blend-mode on the host itself so it blends with the webpage beneath
    if (this.host) {
      this.host.style.mixBlendMode = blendMode === 'difference' ? 'difference' : 'normal';
    }

    this.img.style.opacity = blendMode === 'split' ? '1' : String(opacity);

    if (blendMode === 'split') {
      const clamped = Math.max(0, Math.min(100, splitPercent));
      this.layer.style.clipPath = `inset(0 ${100 - clamped}% 0 0)`;
      this.divider.style.display = 'block';
      this.divider.style.left = `${clamped}vw`;
    } else {
      this.layer.style.clipPath = 'none';
      this.divider.style.display = 'none';
    }

    this.applyPosition();
  }

  private applyPosition(): void {
    if (!this.img) return;
    const scrollX = this.state.lockToScroll ? window.scrollX : 0;
    const scrollY = this.state.lockToScroll ? window.scrollY : 0;
    const x = Math.round(this.state.offsetX - scrollX);
    const y = Math.round(this.state.offsetY - scrollY);
    this.img.style.transform = `translate3d(${x}px, ${y}px, 0) scale(${this.state.scale})`;
  }

  private unmount(): void {
    if (this.scrollListening) {
      window.removeEventListener('scroll', this.handleScroll);
      this.scrollListening = false;
    }
    this.host?.remove();
    this.host = null;
    this.layer = null;
    this.img = null;
    this.divider = null;
  }
}
