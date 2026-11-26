import type { CommandResponse, RuntimeCommand } from '@/messaging/protocol';

export async function sendRuntimeCommand<T = unknown>(
  command: RuntimeCommand
): Promise<CommandResponse<T>> {
  try {
    const response = (await chrome.runtime.sendMessage(command)) as CommandResponse<T> | undefined;
    if (!response) {
      return { ok: false, error: 'No response from Framewise background service.' };
    }
    return response;
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    return { ok: false, error: message };
  }
}

export async function sendTabCommand<T = unknown>(
  tabId: number,
  command: RuntimeCommand
): Promise<CommandResponse<T>> {
  try {
    const response = (await chrome.tabs.sendMessage(tabId, command)) as
      | CommandResponse<T>
      | undefined;
    if (!response) {
      return { ok: false, error: 'Content script did not respond.' };
    }
    return response;
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    return { ok: false, error: message };
  }
}

export async function emitContentEvent(event: Record<string, unknown>): Promise<void> {
  try {
    await chrome.runtime.sendMessage(event);
  } catch {
    // Side panel or service worker listener may not be open; ignore safely.
  }
}
