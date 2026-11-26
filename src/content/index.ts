import { InspectorController } from '@/content/controller';
import { DrawerHost } from '@/content/overlay/drawer-host';
import { ReferenceOverlayHost } from '@/content/overlay/reference-overlay';
import type { DrawerBridgeCommand } from '@/messaging/drawer-bridge';
import { registerCommandListener } from '@/messaging/handlers';
import type { CommandResponse, RuntimeCommand } from '@/messaging/protocol';

declare global {
  interface Window {
    __FRAMEWISE_INITIALIZED__?: boolean;
  }
}

async function copyTextInHostPage(text: string): Promise<boolean> {
  try {
    await navigator.clipboard.writeText(text);
    return true;
  } catch {
    try {
      const textarea = document.createElement('textarea');
      textarea.value = text;
      textarea.setAttribute('data-framewise-ignore', 'true');
      textarea.style.cssText = 'position:fixed;top:-9999px;left:-9999px;opacity:0;';
      document.body.appendChild(textarea);
      textarea.select();
      const ok = document.execCommand('copy');
      textarea.remove();
      return ok;
    } catch {
      return false;
    }
  }
}

async function syncBadgeWithServiceWorker(active: boolean): Promise<void> {
  try {
    await chrome.runtime.sendMessage({ type: 'SYNC_BADGE', active });
  } catch {
    // Service worker may be restarting or extension context reloaded; ignore cleanly
  }
}

function isEditableElement(target: EventTarget | null): boolean {
  if (!(target instanceof Element)) return false;
  const tag = target.tagName;
  if (tag === 'INPUT' || tag === 'TEXTAREA' || tag === 'SELECT') return true;
  return (target as HTMLElement).isContentEditable === true;
}

if (!window.__FRAMEWISE_INITIALIZED__) {
  window.__FRAMEWISE_INITIALIZED__ = true;

  let drawer!: DrawerHost;
  let lastToggleTimestamp = 0;
  const referenceOverlay = new ReferenceOverlayHost();

  const controller = new InspectorController({
    onEvent: (evt) => {
      drawer?.postEvent(evt);
    },
    onActiveChange: (active) => {
      void syncBadgeWithServiceWorker(active);
    },
    getRightInset: () => drawer?.getRightInset() ?? 0,
  });

  const toggleDrawerDebounced = (): { open: boolean; active: boolean } => {
    const now = Date.now();
    if (now - lastToggleTimestamp < 250) {
      return { open: drawer.isOpen(), active: controller.isActive() };
    }
    lastToggleTimestamp = now;
    const opened = drawer.toggle();
    if (!opened && controller.isActive()) {
      controller.setActive(false);
    }
    return { open: opened, active: controller.isActive() };
  };

  const closeDrawerAndInspect = (): void => {
    drawer.close();
    referenceOverlay.clear();
    controller.highlightGroup([]);
    if (controller.isActive()) {
      controller.setActive(false);
    }
  };

  // Global fallback shortcuts on the host page:
  // 1) Alt+Shift+L toggles the drawer even if Chromium didn't bind chrome.commands
  // 2) Esc closes the drawer when inspection is already paused
  window.addEventListener(
    'keydown',
    (event: KeyboardEvent) => {
      if (isEditableElement(event.target)) return;

      if (event.altKey && event.shiftKey && !event.ctrlKey && !event.metaKey && event.code === 'KeyL') {
        event.preventDefault();
        event.stopPropagation();
        toggleDrawerDebounced();
        return;
      }

      if (event.key === 'Escape' && drawer.isOpen() && !controller.isActive()) {
        event.preventDefault();
        event.stopPropagation();
        closeDrawerAndInspect();
      }
    },
    true
  );

  const handleBridgeCommand = async (command: DrawerBridgeCommand): Promise<CommandResponse> => {
    switch (command.type) {
      case 'GET_STATE':
        return {
          ok: true,
          data: {
            active: controller.isActive(),
            locked: controller.isLocked(),
            viewport: controller.getViewport(),
            selected: controller.getSelectedInspection(),
            overlayOptions: controller.getOverlayOptions(),
          },
        };

      case 'TOGGLE_DRAWER':
        return { ok: true, data: toggleDrawerDebounced() };

      case 'TOGGLE_INSPECTOR':
        controller.setActive(command.active);
        return {
          ok: true,
          data: {
            active: controller.isActive(),
            locked: controller.isLocked(),
            viewport: controller.getViewport(),
          },
        };

      case 'UPDATE_OVERLAY_OPTIONS':
        controller.setOverlayOptions(command.options);
        return { ok: true, data: command.options };

      case 'SCAN_DESIGN_SYSTEM':
        return { ok: true, data: controller.scanPageDesignSystem() };

      case 'SELECT_BY_SELECTOR': {
        const inspection = controller.selectBySelector(command.selector);
        if (!inspection) {
          return { ok: false, error: `Element not found: ${command.selector}` };
        }
        return { ok: true, data: inspection };
      }

      case 'HIGHLIGHT_BY_SELECTOR':
        controller.highlightBySelector(command.selector);
        return { ok: true };

      case 'HIGHLIGHT_GROUP': {
        const count = controller.highlightGroup(command.selectors, command.variant ?? 'pattern');
        return { ok: true, data: { count } };
      }

      case 'NAVIGATE_DOM': {
        const inspection = controller.navigateSelection(command.direction);
        return { ok: Boolean(inspection), data: inspection };
      }

      case 'CLEAR_SELECTION':
        controller.clearSelection();
        return { ok: true };

      case 'UNLOCK_SELECTION':
        controller.unlockSelection();
        return { ok: true };

      case 'CLOSE_DRAWER':
        closeDrawerAndInspect();
        return { ok: true, data: { open: false } };

      case 'SET_COLLAPSED':
        drawer.setCollapsed(command.collapsed);
        return { ok: true, data: { collapsed: drawer.isCollapsed() } };

      case 'SET_THEME':
        drawer.setTheme(command.theme);
        controller.setTheme(command.theme);
        return { ok: true };

      case 'UPDATE_REFERENCE_OVERLAY':
        referenceOverlay.update(command.state);
        return { ok: true, data: referenceOverlay.getState() };

      case 'GET_REFERENCE_OVERLAY':
        return { ok: true, data: referenceOverlay.getState() };

      case 'COPY_TEXT': {
        const copied = await copyTextInHostPage(command.text);
        return { ok: copied };
      }
    }
  };

  drawer = new DrawerHost(handleBridgeCommand);

  registerCommandListener(async (command: RuntimeCommand): Promise<CommandResponse> => {
    switch (command.type) {
      case 'PING':
        return { ok: true, data: { ready: true } };

      case 'TOGGLE_DRAWER':
        return { ok: true, data: toggleDrawerDebounced() };

      case 'OPEN_DRAWER':
        drawer.open();
        return { ok: true, data: { open: true, active: controller.isActive() } };

      case 'CLOSE_DRAWER':
        closeDrawerAndInspect();
        return { ok: true, data: { open: false } };

      case 'UPDATE_OVERLAY_OPTIONS':
        controller.setOverlayOptions(command.options);
        return { ok: true, data: command.options };

      case 'TOGGLE_INSPECTOR':
        controller.setActive(command.active);
        return {
          ok: true,
          data: {
            active: controller.isActive(),
            locked: controller.isLocked(),
            viewport: controller.getViewport(),
          },
        };

      default:
        return { ok: true };
    }
  });
}
