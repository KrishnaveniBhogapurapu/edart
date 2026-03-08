import { fetchEventSource } from '@microsoft/fetch-event-source';

function normalizeApiBaseUrl(apiBaseUrl: string): string {
  if (!apiBaseUrl || apiBaseUrl === 'undefined') {
    return 'http://localhost:4000';
  }
  return apiBaseUrl.replace(/\/+$/, '');
}

interface SessionStreamHandlers {
  onStatus?: (payload: unknown) => void;
  onSnapshot?: (payload: unknown) => void;
  onDelta?: (payload: unknown) => void;
  onEngineError?: (payload: unknown) => void;
  onOpen?: () => void;
  onError?: (error: unknown) => void;
}

export function connectSessionStream(
  apiBaseUrl: string,
  accessToken: string,
  handlers: SessionStreamHandlers,
): () => void {
  const controller = new AbortController();
  const resolvedApiBaseUrl = normalizeApiBaseUrl(apiBaseUrl);

  void fetchEventSource(`${resolvedApiBaseUrl}/stream/session`, {
    method: 'GET',
    signal: controller.signal,
    headers: {
      Authorization: `Bearer ${accessToken}`,
      Accept: 'text/event-stream',
    },
    onopen: async () => {
      handlers.onOpen?.();
    },
    onmessage: (message) => {
      let parsed: unknown = null;
      try {
        parsed = message.data ? JSON.parse(message.data) : null;
      } catch {
        parsed = message.data;
      }

      let eventName: string | undefined = message.event || undefined;
      let payload = parsed;

      if (!eventName && parsed && typeof parsed === 'object') {
        const envelope = parsed as { event?: string; type?: string; data?: unknown };
        if (envelope.event || envelope.type) {
          eventName = envelope.event ?? envelope.type;
          payload = envelope.data;
        }
      }

      switch (eventName) {
        case 'session.status':
          handlers.onStatus?.(payload);
          break;
        case 'candles.snapshot':
          handlers.onSnapshot?.(payload);
          break;
        case 'candles.delta':
          handlers.onDelta?.(payload);
          break;
        case 'engine.error':
          handlers.onEngineError?.(payload);
          break;
        default:
          break;
      }
    },
    onerror: (error) => {
      handlers.onError?.(error);
      throw error;
    },
  });

  return () => controller.abort();
}

