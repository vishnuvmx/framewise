import type { CommandResponse, ContentEvent } from '@/messaging/protocol';
import type { OverlayOptions, ReferenceOverlayState, ThemePreference } from '@/shared/types';

export const BRIDGE_REQ = 'framewise-bridge-req';
export const BRIDGE_RES = 'framewise-bridge-res';
export const BRIDGE_EVT = 'framewise-bridge-evt';

export type DomDirection = 'parent' | 'child' | 'prev' | 'next';

export type DrawerBridgeCommand =
  | { type: 'GET_STATE' }
  | { type: 'TOGGLE_DRAWER' }
  | { type: 'TOGGLE_INSPECTOR'; active: boolean }
  | { type: 'UPDATE_OVERLAY_OPTIONS'; options: OverlayOptions }
  | { type: 'SCAN_DESIGN_SYSTEM' }
  | { type: 'SELECT_BY_SELECTOR'; selector: string }
  | { type: 'HIGHLIGHT_BY_SELECTOR'; selector: string | null }
  | { type: 'HIGHLIGHT_GROUP'; selectors: string[]; variant?: 'pattern' | 'outlier' }
  | { type: 'NAVIGATE_DOM'; direction: DomDirection }
  | { type: 'CLEAR_SELECTION' }
  | { type: 'UNLOCK_SELECTION' }
  | { type: 'CLOSE_DRAWER' }
  | { type: 'SET_COLLAPSED'; collapsed: boolean }
  | { type: 'SET_THEME'; theme: ThemePreference }
  | { type: 'UPDATE_REFERENCE_OVERLAY'; state: ReferenceOverlayState | null }
  | { type: 'GET_REFERENCE_OVERLAY' }
  | { type: 'COPY_TEXT'; text: string };

interface PendingRequest {
  resolve: (res: CommandResponse<unknown>) => void;
  timer: number;
}

function getBridgeToken(): string {
  const hash = window.location.hash;
  const match = hash.match(/token=([a-zA-Z0-9-]+)/);
  return match?.[1] ?? '';
}

/**
 * Direct token-authenticated postMessage client running inside the drawer iframe.
 * Communicates directly with the host tab's content script (<1ms latency, zero SW hops,
 * zero Chrome runtime.lastError warnings, and strict per-tab isolation).
 */
class DrawerBridgeClient {
  private token = '';
  private pending = new Map<string, PendingRequest>();
  private eventListeners = new Set<(event: ContentEvent) => void>();
  private initialized = false;

  private init(): void {
    if (this.initialized) return;
    this.initialized = true;
    this.token = getBridgeToken();

    window.addEventListener('message', (event: MessageEvent) => {
      const data = event.data;
      if (typeof data !== 'object' || data === null) return;
      if (this.token && data.token !== this.token) return;

      if (data.channel === BRIDGE_RES && typeof data.requestId === 'string') {
        const entry = this.pending.get(data.requestId);
        if (entry) {
          window.clearTimeout(entry.timer);
          this.pending.delete(data.requestId);
          entry.resolve(data.response as CommandResponse<unknown>);
        }
        return;
      }

      if (data.channel === BRIDGE_EVT && data.event) {
        const evt = data.event as ContentEvent;
        for (const listener of this.eventListeners) {
          listener(evt);
        }
      }
    });
  }

  isEmbedded(): boolean {
    return typeof window !== 'undefined' && window.parent !== window;
  }

  send<T = unknown>(command: DrawerBridgeCommand): Promise<CommandResponse<T>> {
    this.init();

    if (!this.isEmbedded()) {
      return Promise.resolve({
        ok: false,
        error: 'Open Framewise on any http or https webpage to inspect.',
      });
    }

    const requestId = `${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;

    return new Promise<CommandResponse<T>>((resolve) => {
      const timer = window.setTimeout(() => {
        this.pending.delete(requestId);
        resolve({ ok: false, error: 'Page did not respond. Refresh the tab and try again.' });
      }, 4000);

      this.pending.set(requestId, {
        resolve: (res) => resolve(res as CommandResponse<T>),
        timer,
      });

      window.parent.postMessage(
        {
          channel: BRIDGE_REQ,
          token: this.token,
          requestId,
          command,
        },
        '*'
      );
    });
  }

  onEvent(listener: (event: ContentEvent) => void): () => void {
    this.init();
    this.eventListeners.add(listener);
    return () => {
      this.eventListeners.delete(listener);
    };
  }
}

export const drawerBridge = new DrawerBridgeClient();
