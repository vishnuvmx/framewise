import {
  BRIDGE_EVT,
  BRIDGE_REQ,
  BRIDGE_RES,
  type DrawerBridgeCommand,
} from '@/messaging/drawer-bridge';
import type { CommandResponse, ContentEvent } from '@/messaging/protocol';
import { DRAWER_HOST_ID, DRAWER_Z_INDEX, OVERLAY_DATA_ATTR } from '@/shared/constants';
import type { ThemePreference } from '@/shared/types';

export const DRAWER_WIDTH_PX = 420;

const DRAWER_CSS = `
:host {
  all: initial;
  position: fixed;
  inset: 0;
  z-index: ${DRAWER_Z_INDEX};
  pointer-events: none;
  font-family: "DM Sans Variable", "DM Sans", -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif;
}

.ll-drawer {
  position: fixed;
  top: 0;
  right: 0;
  bottom: 0;
  width: ${DRAWER_WIDTH_PX}px;
  max-width: 100vw;
  height: 100vh;
  border-radius: 0;
  overflow: hidden;
  border-left: 1px solid rgba(128, 128, 136, 0.2);
  background: #141415;
  box-shadow: none;
  transform: translateX(100%);
  opacity: 1;
  pointer-events: none;
  will-change: transform;
  transition: transform 280ms cubic-bezier(0.22, 1, 0.36, 1);
}

.ll-drawer[data-theme="light"] {
  background: #fafafa;
  border-left-color: rgba(23, 23, 23, 0.1);
}

.ll-drawer.is-open {
  transform: translateX(0);
  pointer-events: auto;
}

.ll-drawer__frame {
  display: block;
  width: 100%;
  height: 100%;
  border: 0;
  background: transparent;
}

/* Slim right-edge pull-tab shown only when the drawer is collapsed */
.ll-edge-tab {
  all: unset;
  box-sizing: border-box;
  position: fixed;
  top: 50%;
  right: 0;
  width: 28px;
  height: 56px;
  display: flex;
  align-items: center;
  justify-content: center;
  border-radius: 8px 0 0 8px;
  border: 1px solid rgba(237, 237, 237, 0.14);
  border-right: 0;
  background: #141415;
  color: #ededed;
  cursor: pointer;
  pointer-events: none;
  transform: translate(100%, -50%);
  will-change: transform;
  transition: transform 240ms cubic-bezier(0.22, 1, 0.36, 1),
    background-color 140ms cubic-bezier(0.22, 1, 0.36, 1);
}

.ll-edge-tab[data-theme="light"] {
  background: #ffffff;
  color: #171717;
  border-color: rgba(23, 23, 23, 0.12);
}

.ll-edge-tab.is-visible {
  transform: translate(0, -50%);
  pointer-events: auto;
}

.ll-edge-tab:hover {
  background: #232325;
}

.ll-edge-tab[data-theme="light"]:hover {
  background: #f4f4f5;
}

.ll-edge-tab:focus-visible {
  outline: 2px solid #3b82f6;
  outline-offset: -2px;
}

@media (prefers-reduced-motion: reduce) {
  .ll-drawer,
  .ll-edge-tab {
    transition-duration: 0.01ms !important;
  }
}
`;

export type BridgeCommandHandler = (command: DrawerBridgeCommand) => Promise<CommandResponse>;

export class DrawerHost {
  private host: HTMLDivElement | null = null;
  private drawerEl: HTMLDivElement | null = null;
  private frameEl: HTMLIFrameElement | null = null;
  private edgeTabEl: HTMLButtonElement | null = null;
  private openState = false;
  private collapsedState = false;
  private closeTimer: number | null = null;
  private token = '';
  private commandHandler: BridgeCommandHandler | null = null;
  private messageListenerBound = false;
  private theme: ThemePreference = 'system';

  constructor(handler: BridgeCommandHandler) {
    this.commandHandler = handler;
  }

  isOpen(): boolean {
    return this.openState;
  }

  isCollapsed(): boolean {
    return this.collapsedState;
  }

  getRightInset(): number {
    if (!this.openState || this.collapsedState) return 0;
    return Math.min(DRAWER_WIDTH_PX, window.innerWidth);
  }

  setTheme(theme: ThemePreference): void {
    this.theme = theme;
    this.applyThemeAttr();
  }

  setCollapsed(collapsed: boolean): void {
    if (!this.openState) return;
    this.collapsedState = collapsed;
    if (this.drawerEl) {
      this.drawerEl.classList.toggle('is-open', !collapsed);
    }
    if (this.edgeTabEl) {
      this.edgeTabEl.classList.toggle('is-visible', collapsed);
    }
  }

  postEvent(event: ContentEvent): void {
    if (!this.openState || !this.frameEl?.contentWindow || !this.token) return;
    try {
      this.frameEl.contentWindow.postMessage(
        {
          channel: BRIDGE_EVT,
          token: this.token,
          event,
        },
        '*'
      );
    } catch {
      // Frame may be navigating or closing
    }
  }

  open(): void {
    if (this.closeTimer !== null) {
      window.clearTimeout(this.closeTimer);
      this.closeTimer = null;
    }

    const freshlyMounted = this.ensureMounted();
    this.openState = true;
    this.collapsedState = false;

    if (this.edgeTabEl) {
      this.edgeTabEl.classList.remove('is-visible');
    }

    if (!this.drawerEl) return;

    if (freshlyMounted) {
      requestAnimationFrame(() => {
        requestAnimationFrame(() => {
          if (this.openState && !this.collapsedState && this.drawerEl) {
            this.drawerEl.classList.add('is-open');
          }
        });
      });
    } else {
      this.drawerEl.classList.add('is-open');
    }
  }

  close(): void {
    if (!this.openState && !this.host) return;
    this.openState = false;
    this.collapsedState = false;

    if (this.edgeTabEl) {
      this.edgeTabEl.classList.remove('is-visible');
    }

    const drawer = this.drawerEl;
    if (!drawer) {
      this.unmount();
      return;
    }

    drawer.classList.remove('is-open');

    const finishUnmount = () => {
      if (this.closeTimer !== null) {
        window.clearTimeout(this.closeTimer);
        this.closeTimer = null;
      }
      if (!this.openState) {
        this.unmount();
      }
    };

    const onTransitionEnd = (event: TransitionEvent) => {
      if (event.target !== drawer || event.propertyName !== 'transform') return;
      drawer.removeEventListener('transitionend', onTransitionEnd);
      finishUnmount();
    };

    drawer.addEventListener('transitionend', onTransitionEnd);
    this.closeTimer = window.setTimeout(() => {
      drawer.removeEventListener('transitionend', onTransitionEnd);
      finishUnmount();
    }, 340);
  }

  toggle(): boolean {
    if (this.openState && this.collapsedState) {
      this.setCollapsed(false);
      return true;
    }
    if (this.openState) {
      this.close();
      return false;
    }
    this.open();
    return true;
  }

  private bindMessageListener(): void {
    if (this.messageListenerBound) return;
    this.messageListenerBound = true;

    window.addEventListener('message', (event: MessageEvent) => {
      if (!this.frameEl?.contentWindow || event.source !== this.frameEl.contentWindow) {
        return;
      }
      const data = event.data;
      if (typeof data !== 'object' || data === null) return;
      if (data.channel !== BRIDGE_REQ || data.token !== this.token) return;

      const requestId = typeof data.requestId === 'string' ? data.requestId : '';
      const command = data.command as DrawerBridgeCommand | undefined;
      if (!command || !this.commandHandler) return;

      void (async () => {
        let response: CommandResponse;
        try {
          response = await this.commandHandler!(command);
        } catch (err) {
          response = {
            ok: false,
            error: err instanceof Error ? err.message : 'Unexpected drawer error',
          };
        }
        try {
          this.frameEl?.contentWindow?.postMessage(
            {
              channel: BRIDGE_RES,
              token: this.token,
              requestId,
              response,
            },
            '*'
          );
        } catch {
          // Ignore if frame unmounted mid-request
        }
      })();
    });
  }

  private applyThemeAttr(): void {
    const resolved =
      this.theme === 'system'
        ? window.matchMedia?.('(prefers-color-scheme: light)').matches
          ? 'light'
          : 'dark'
        : this.theme;
    this.drawerEl?.setAttribute('data-theme', resolved);
    this.edgeTabEl?.setAttribute('data-theme', resolved);
  }

  private ensureMounted(): boolean {
    if (this.host && this.host.isConnected && this.drawerEl && this.frameEl) {
      return false;
    }

    this.bindMessageListener();

    const existing = document.getElementById(DRAWER_HOST_ID);
    if (existing) existing.remove();

    this.token =
      typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function'
        ? crypto.randomUUID()
        : `${Date.now()}-${Math.random().toString(36).slice(2)}`;

    const host = document.createElement('div');
    host.id = DRAWER_HOST_ID;
    host.setAttribute(OVERLAY_DATA_ATTR, 'true');

    const shadow = host.attachShadow({ mode: 'open' });
    if (typeof CSSStyleSheet !== 'undefined' && 'adoptedStyleSheets' in shadow) {
      const sheet = new CSSStyleSheet();
      sheet.replaceSync(DRAWER_CSS);
      shadow.adoptedStyleSheets = [sheet];
    } else {
      const style = document.createElement('style');
      style.textContent = DRAWER_CSS;
      shadow.appendChild(style);
    }

    const drawer = document.createElement('div');
    drawer.className = 'll-drawer';
    drawer.setAttribute(OVERLAY_DATA_ATTR, 'true');

    const frame = document.createElement('iframe');
    frame.className = 'll-drawer__frame';
    frame.src = `${chrome.runtime.getURL('src/sidepanel/index.html')}#token=${this.token}`;
    frame.title = 'LayoutLens Inspector';
    frame.setAttribute('allow', 'clipboard-write');
    drawer.appendChild(frame);

    const edgeTab = document.createElement('button');
    edgeTab.type = 'button';
    edgeTab.className = 'll-edge-tab';
    edgeTab.setAttribute(OVERLAY_DATA_ATTR, 'true');
    edgeTab.setAttribute('aria-label', 'Expand LayoutLens sidebar');
    edgeTab.title = 'Expand LayoutLens';
    edgeTab.innerHTML =
      '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.75" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="m15 18-6-6 6-6"/></svg>';
    edgeTab.addEventListener('click', (e) => {
      e.preventDefault();
      e.stopPropagation();
      this.setCollapsed(false);
    });

    shadow.append(drawer, edgeTab);
    (document.documentElement ?? document.body).appendChild(host);

    this.host = host;
    this.drawerEl = drawer;
    this.frameEl = frame;
    this.edgeTabEl = edgeTab;
    this.applyThemeAttr();
    return true;
  }

  private unmount(): void {
    this.host?.remove();
    this.host = null;
    this.drawerEl = null;
    this.frameEl = null;
    this.edgeTabEl = null;
    this.token = '';
  }
}
