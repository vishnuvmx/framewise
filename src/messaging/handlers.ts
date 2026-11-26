import { type CommandResponse, type RuntimeCommand, RuntimeCommandSchema } from '@/messaging/protocol';

export type CommandHandler = (
  command: RuntimeCommand,
  sender: chrome.runtime.MessageSender
) => Promise<CommandResponse>;

/**
 * Registers a Zod-validated chrome.runtime.onMessage handler that properly
 * preserves async sendResponse channels (returns true only for matched commands).
 */
export function registerCommandListener(handler: CommandHandler): () => void {
  const listener = (
    rawMessage: unknown,
    sender: chrome.runtime.MessageSender,
    sendResponse: (response: CommandResponse) => void
  ): boolean | undefined => {
    const parsed = RuntimeCommandSchema.safeParse(rawMessage);
    if (!parsed.success) {
      return undefined;
    }

    (async () => {
      try {
        const result = await handler(parsed.data, sender);
        sendResponse(result);
      } catch (err) {
        sendResponse({
          ok: false,
          error: err instanceof Error ? err.message : 'Unexpected command error',
        });
      }
    })();

    return true;
  };

  chrome.runtime.onMessage.addListener(listener);
  return () => chrome.runtime.onMessage.removeListener(listener);
}
