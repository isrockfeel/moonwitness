import { DurableObject } from 'cloudflare:workers';

export interface WebSocketSession {
  ws: WebSocket;
  userId: string;
  joinedAt: number;
}

export interface Track {
  id: string;
  stationId: string;
  title: string;
  artist: string;
  album?: string;
  artworkUrl?: string;
  startTime: number;
  duration?: number;
  isLive: boolean;
  externalUrls?: {
    spotify?: string;
    appleMusic?: string;
    youtube?: string;
  };
}

export interface WebSocketMessage {
  type: 'join' | 'leave' | 'now-playing' | 'listener-count' | 'track-update' | 'error' | 'ping' | 'pong';
  stationId?: string;
  userId?: string;
  track?: Track;
  count?: number;
  error?: string;
  timestamp: number;
}

interface RadioRoomState {
  sessions: Map<string, WebSocketSession>;
  currentTrack: Track | null;
  listenerCount: number;
}

export class RadioRoom extends DurableObject {
  private sessions: Map<string, WebSocketSession> = new Map();
  private currentTrack: Track | null = null;
  private listenerCount = 0;
  private broadcastInterval: ReturnType<typeof setInterval> | null = null;

  constructor(state: DurableObjectState, env: Env) {
    super(state, env);
    this.initializeState();
  }

  private async initializeState(): Promise<void> {
    const stored = await this.ctx.storage.get<RadioRoomState>('room-state');
    if (stored) {
      this.sessions = stored.sessions;
      this.currentTrack = stored.currentTrack;
      this.listenerCount = stored.listenerCount;
    }
    this.startHeartbeat();
  }

  override async fetch(request: Request): Promise<Response> {
    const upgradeHeader = request.headers.get('Upgrade');
    if (upgradeHeader !== 'websocket') {
      return new Response('Expected WebSocket', { status: 400 });
    }

    const webSocketPair = new WebSocketPair();
    const client = webSocketPair[0];
    const server = webSocketPair[1];
    this.handleSession(server);
    return new Response(null, { status: 101, webSocket: client });
  }

  private handleSession(ws: WebSocket): void {
    const userId = crypto.randomUUID();
    const session: WebSocketSession = { ws, userId, joinedAt: Date.now() };

    ws.addEventListener('message', (event) => {
      try {
        const message: WebSocketMessage = JSON.parse(event.data as string);
        this.handleMessage(ws, userId, message);
      } catch (error) {
        console.error('Failed to parse WebSocket message:', error);
        ws.send(JSON.stringify({ type: 'error', error: 'Invalid message format', timestamp: Date.now() }));
      }
    });

    ws.addEventListener('close', () => {
      this.removeSession(userId);
    });

    ws.addEventListener('error', (error) => {
      console.error('WebSocket error:', error);
      this.removeSession(userId);
    });

    // Send current state to new connection
    this.sendToSession(ws, {
      type: 'now-playing',
      stationId: this.currentTrack?.stationId ?? '',
      track: this.currentTrack ?? undefined,
      timestamp: Date.now(),
    });

    this.sendToSession(ws, {
      type: 'listener-count',
      count: this.listenerCount,
      timestamp: Date.now(),
    });
  }

  private handleMessage(ws: WebSocket, userId: string, message: WebSocketMessage): void {
    switch (message.type) {
      case 'join':
        if (message.stationId) {
          this.addSession(userId, ws, message.stationId);
        }
        break;
      case 'ping':
        this.sendToSession(ws, { type: 'pong', timestamp: Date.now() });
        break;
    }
  }

  private addSession(userId: string, ws: WebSocket, stationId: string): void {
    this.sessions.set(userId, { ws, userId, joinedAt: Date.now() });
    this.listenerCount = this.sessions.size;
    this.persistState();
    this.broadcastListenerCount(stationId);
  }

  private removeSession(userId: string): void {
    this.sessions.delete(userId);
    this.listenerCount = this.sessions.size;
    this.persistState();
    this.broadcastListenerCount();
  }

  private broadcastListenerCount(stationId?: string): void {
    const message: WebSocketMessage = {
      type: 'listener-count',
      stationId,
      count: this.listenerCount,
      timestamp: Date.now(),
    };
    this.broadcast(message);
  }

  broadcastNowPlaying(stationId: string, track: Track): void {
    this.currentTrack = track;
    this.persistState();

    const message: WebSocketMessage = {
      type: 'now-playing',
      stationId,
      track,
      timestamp: Date.now(),
    };
    this.broadcast(message);
  }

  private broadcast(message: WebSocketMessage): void {
    const data = JSON.stringify(message);
    for (const [_, session] of this.sessions) {
      if (session.ws.readyState === WebSocket.OPEN) {
        try {
          session.ws.send(data);
        } catch (error) {
          console.error('Failed to send message to session:', error);
          this.removeSession(session.userId);
        }
      }
    }
  }

  private sendToSession(ws: WebSocket, message: WebSocketMessage): void {
    if (ws.readyState === WebSocket.OPEN) {
      try {
        ws.send(JSON.stringify(message));
      } catch (error) {
        console.error('Failed to send message to session:', error);
      }
    }
  }

  private startHeartbeat(): void {
    this.broadcastInterval = setInterval(() => {
      const now = Date.now();
      for (const [userId, session] of this.sessions) {
        if (session.ws.readyState !== WebSocket.OPEN) {
          this.removeSession(userId);
          continue;
        }
        // Send ping to keep connection alive
        try {
          session.ws.send(JSON.stringify({ type: 'ping', timestamp: now }));
        } catch {
          this.removeSession(userId);
        }
      }
    }, 30000); // Every 30 seconds
  }

  private async persistState(): Promise<void> {
    await this.ctx.storage.put('room-state', {
      sessions: this.sessions,
      currentTrack: this.currentTrack,
      listenerCount: this.listenerCount,
    });
  }
}

interface Env {
  RADIO_ROOM: DurableObjectNamespace;
}