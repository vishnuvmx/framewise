import { sendTabCommand } from '@/messaging/client';
import { DEFAULT_OVERLAY_OPTIONS, STORAGE_KEYS } from '@/shared/constants';
import type { OverlayOptions } from '@/shared/types';

function isInspectableUrl(url: string | undefined): boolean {
  if (!url) return false;
  if (!url.startsWith('http://') && !url.startsWith('https://')) return false;
  if (
    url.startsWith('https://chromewebstore.google.com') ||
    url.startsWith('https://chrome.google.com/webstore')
  ) {
    return false;
  }
  return true;
}

async function getStoredOverlayOptions(): Promise<OverlayOptions> {
  try {
    const result = await chrome.storage.local.get(STORAGE_KEYS.overlayOptions);
    const saved = result[STORAGE_KEYS.overlayOptions] as Partial<OverlayOptions> | undefined;
    return { ...DEFAULT_OVERLAY_OPTIONS, ...saved };
  } catch {
    return { ...DEFAULT_OVERLAY_OPTIONS };
  }
}

async function setTabBadge(tabId: number, active: boolean): Promise<void> {
  try {
    await chrome.action.setBadgeText({ tabId, text: active ? 'ON' : '' });
    if (active) {
      await chrome.action.setBadgeBackgroundColor({ tabId, color: '#2563eb' });
    }
  } catch {
    // Tab may have been closed
  }
}

async function ensureContentScript(tabId: number): Promise<boolean> {
  const ping = await sendTabCommand(tabId, { type: 'PING' });
  if (ping.ok) return true;

  try {
    const manifest = chrome.runtime.getManifest();
    const files = manifest.content_scripts?.[0]?.js ?? [];
    if (files.length === 0) return false;
    await chrome.scripting.executeScript({
      target: { tabId },
      files,
    });
    const retry = await sendTabCommand(tabId, { type: 'PING' });
    return retry.ok;
  } catch {
    return false;
  }
}

// 1. Clicking toolbar icon slides the drawer in/out and toggles live inspection
chrome.action.onClicked.addListener(async (tab) => {
  if (!tab || typeof tab.id !== 'number') return;

  if (!isInspectableUrl(tab.url)) {
    try {
      await chrome.action.setBadgeText({ tabId: tab.id, text: '!' });
      await chrome.action.setBadgeBackgroundColor({ tabId: tab.id, color: '#737373' });
    } catch {
      // Ignore badge failures on restricted tabs
    }
    return;
  }

  const ready = await ensureContentScript(tab.id);
  if (!ready) return;

  const overlayOptions = await getStoredOverlayOptions();
  await sendTabCommand(tab.id, { type: 'UPDATE_OVERLAY_OPTIONS', options: overlayOptions });
  const res = await sendTabCommand<{ open: boolean; active?: boolean }>(tab.id, {
    type: 'TOGGLE_DRAWER',
  });
  if (res.ok && res.data && !res.data.open) {
    await setTabBadge(tab.id, false);
  }
});

// 2. Always respond cleanly to SYNC_BADGE from content scripts (prevents Chrome port-closed warnings)
chrome.runtime.onMessage.addListener((message: unknown, sender, sendResponse) => {
  if (
    typeof message === 'object' &&
    message !== null &&
    'type' in message &&
    (message as { type: string }).type === 'SYNC_BADGE' &&
    typeof sender.tab?.id === 'number'
  ) {
    const tabId = sender.tab.id;
    const active = Boolean((message as { active?: boolean }).active);
    (async () => {
      await setTabBadge(tabId, active);
      sendResponse({ ok: true });
    })();
    return true;
  }
  return undefined;
});

// 3. Keyboard shortcut (Alt+Shift+L): toggle drawer + inspection on active tab
chrome.commands.onCommand.addListener(async (commandName) => {
  if (commandName !== 'toggle-inspector') return;
  const [tab] = await chrome.tabs.query({ active: true, lastFocusedWindow: true });
  if (!tab || typeof tab.id !== 'number' || !isInspectableUrl(tab.url)) return;

  const ready = await ensureContentScript(tab.id);
  if (!ready) return;

  const overlayOptions = await getStoredOverlayOptions();
  await sendTabCommand(tab.id, { type: 'UPDATE_OVERLAY_OPTIONS', options: overlayOptions });
  const res = await sendTabCommand<{ open: boolean; active?: boolean }>(tab.id, {
    type: 'TOGGLE_DRAWER',
  });
  if (res.ok && res.data && !res.data.open) {
    await setTabBadge(tab.id, false);
  }
});
