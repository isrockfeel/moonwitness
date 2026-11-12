import { useEffect, useRef, useState, useCallback } from 'react';
import { createWebSocketUrl } from '../services/api';
import type { Track, ListenerCount } from '../types/radio';
import { useRadioStore } from '../stores/radio-store';

interface WebSocketMessage {
  type: 'now-playing' | 'listener-count' | 'station-update' | 'error';
  stationId: string;
  track?: Track;
  count?: number;
  error?: string;
}

export function useStationWebSocket(stationId: string | null) {
  const [isConnected, setIsConnected] = useState(false);
  const [lastMessage, setLastMessage] = useState<WebSocketMessage | null>(null);
  const wsRef = useRef<WebSocket | null>(null);
  const reconnectTimeoutRef = useRef<number | null>(null);
  const reconnectAttempts = useRef(0);
  const maxReconnectAttempts = 5;
  const updateTrack = useRadioStore((state) => state.updateTrack);

  const connect = useCallback(() => {
    if (!stationId) return;
    if (wsRef.current?.readyState === WebSocket.OPEN) return;

    const url = createWebSocketUrl(stationId);
    const ws = new WebSocket(url);
    wsRef.current = ws;

    ws.onopen = () => {
      setIsConnected(true);
      reconnectAttempts.current = 0;
      ws.send(JSON.stringify({ type: 'join', stationId }));
    };

    ws.onmessage = (event) => {
      try {
        const message: WebSocketMessage = JSON.parse(event.data);
        setLastMessage(message);

        switch (message.type) {
          case 'now-playing':
            if (message.track) {
              updateTrack(message.track);
            }
            break;
          case 'listener-count':
            // Could update a listener count store
            break;
          case 'error':
            console.error('WebSocket error:', message.error);
            break;
        }
      } catch (error) {
        console.error('Failed to parse WebSocket message:', error);
      }
    };

    ws.onclose = () => {
      setIsConnected(false);
      wsRef.current = null;

      if (reconnectAttempts.current < maxReconnectAttempts) {
        const delay = Math.min(1000 * 2 ** reconnectAttempts.current, 30000);
        reconnectTimeoutRef.current = window.setTimeout(() => {
          reconnectAttempts.current++;
          connect();
        }, delay);
      }
    };

    ws.onerror = (error) => {
      console.error('WebSocket error:', error);
    };
  }, [stationId, updateTrack]);

  const disconnect = useCallback(() => {
    if (reconnectTimeoutRef.current) {
      clearTimeout(reconnectTimeoutRef.current);
      reconnectTimeoutRef.current = null;
    }
    if (wsRef.current) {
      wsRef.current.close();
      wsRef.current = null;
    }
    setIsConnected(false);
  }, []);

  const sendMessage = useCallback((message: object) => {
    if (wsRef.current?.readyState === WebSocket.OPEN) {
      wsRef.current.send(JSON.stringify(message));
    }
  }, []);

  useEffect(() => {
    connect();
    return () => disconnect();
  }, [connect, disconnect]);

  return { isConnected, lastMessage, sendMessage, connect, disconnect };
}

export function useNowPlayingWebSocket(stationId: string | null) {
  const { isConnected, lastMessage } = useStationWebSocket(stationId);
  const track = lastMessage?.type === 'now-playing' ? lastMessage.track : null;

  return { isConnected, track };
}

export function useListenerCountWebSocket(stationId: string | null) {
  const { isConnected, lastMessage } = useStationWebSocket(stationId);
  const count = lastMessage?.type === 'listener-count' ? lastMessage.count : 0;

  return { isConnected, count };
}