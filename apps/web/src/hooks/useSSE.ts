import { useEffect, useRef, useState, useCallback } from 'react';

export interface SSEMessage<T> {
  type: string;
  data: T;
}

export function useSSE<T>(url: string | null, options?: {
  onMessage: (type: string, data: T) => void;
  onError?: (err: Event) => void;
  onConnect?: () => void;
}) {
  const [connected, setConnected] = useState(false);
  const eventSourceRef = useRef<EventSource | null>(null);
  const reconnectTimeoutRef = useRef<number | null>(null);

  const connect = useCallback(() => {
    if (!url) return;

    if (eventSourceRef.current) {
      eventSourceRef.current.close();
    }

    const eventSource = new EventSource(url);
    eventSourceRef.current = eventSource;

    eventSource.onopen = () => {
      setConnected(true);
      options?.onConnect?.();
    };

    eventSource.onmessage = (event) => {
      try {
        const parsed = JSON.parse(event.data);
        options?.onMessage('message', parsed as T);
      } catch (err) {
        console.error('Failed to parse SSE message', err);
      }
    };

    // Generic listener for custom event types
    eventSource.addEventListener('coaching', (event: any) => {
        try {
            const parsed = JSON.parse(event.data);
            options?.onMessage('coaching', parsed as T);
        } catch (e) {}
    });

    eventSource.addEventListener('transcript', (event: any) => {
        try {
            const parsed = JSON.parse(event.data);
            options?.onMessage('transcript', parsed as T);
        } catch (e) {}
    });

    eventSource.onerror = (err) => {
      setConnected(false);
      options?.onError?.(err);
      eventSource.close();
      
      // Reconnect with backoff
      reconnectTimeoutRef.current = window.setTimeout(() => {
        connect();
      }, 3000);
    };
  }, [url, options]);

  useEffect(() => {
    connect();

    return () => {
      if (reconnectTimeoutRef.current) {
        clearTimeout(reconnectTimeoutRef.current);
      }
      if (eventSourceRef.current) {
        eventSourceRef.current.close();
      }
    };
  }, [connect]);

  const disconnect = useCallback(() => {
    if (reconnectTimeoutRef.current) {
      clearTimeout(reconnectTimeoutRef.current);
    }
    if (eventSourceRef.current) {
      eventSourceRef.current.close();
      eventSourceRef.current = null;
    }
    setConnected(false);
  }, []);

  return { connected, disconnect };
}
