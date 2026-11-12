export interface RadioRoomState {
  sessions: Map<string, WebSocketSession>;
  currentTrack: Track | null;
  listenerCount: number;
}

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

export class RadioRoom {
  private state: RadioRoomState;
  private env: { RADIO_ROOM: DurableObjectNamespace };
  private broadcastInterval: number | null = null;

  constructor(state: DurableObjectState, env: { RADIO_ROOM: DurableObjectNamespace }) {
    this.state = state;
    this.env = env;
    this.state.blockConcurrencyWhile(async () => {
      const stored = await this.state.storage.get<RadioRoomState>('room-state');
      if (stored) {
        this.state = stored;
      } else {
        this.state = {
          sessions: new Map(),
          currentTrack: null,
          listenerCount: 0,
        };
      }
    });

    // Start heartbeat to clean up dead connections
    this.startHeartbeat();
  }

  async fetch(request: Request): Promise<Response> {
    const upgradeHeader = request.headers.get('Upgrade');
    if (upgradeHeader !== 'websocket') {
      return new Response('Expected WebSocket', { status: 400 });
    }

    const [client, server] = Object.values(new WebSocketPair());
    this.handleSession(server);
    return new Response(null, { status: 101, webSocket: client });
  }

  private handleSession(ws: WebSocket): void {
    const userId = crypto.randomUUID();
    const session: WebSocketSession = { ws, userId, joinedAt: Date.now() };

    ws.accept();

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
      stationId: this.state.currentTrack?.stationId,
      track: this.state.currentTrack,
      timestamp: Date.now(),
    });

    this.sendToSession(ws, {
      type: 'listener-count',
      count: this.state.listenerCount,
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
    this.state.sessions.set(userId, { ws, userId, joinedAt: Date.now() });
    this.state.listenerCount = this.state.sessions.size;
    this.persistState();
    this.broadcastListenerCount(stationId);
  }

  private removeSession(userId: string): void {
    this.state.sessions.delete(userId);
    this.state.listenerCount = this.state.sessions.size;
    this.persistState();
    this.broadcastListenerCount();
  }

  private broadcastListenerCount(stationId?: string): void {
    const message: WebSocketMessage = {
      type: 'listener-count',
      stationId,
      count: this.state.listenerCount,
      timestamp: Date.now(),
    };
    this.broadcast(message);
  }

  broadcastNowPlaying(stationId: string, track: Track): void {
    this.state.currentTrack = track;
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
    for (const [_, session] of this.state.sessions) {
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
      for (const [userId, session] of this.state.sessions) {
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
    await this.state.storage.put('room-state', this.state);
  }
}