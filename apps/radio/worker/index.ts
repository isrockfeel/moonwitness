import { Hono } from 'hono';
import { cors } from 'hono/cors';
import { stationsRouter } from './routes/stations';
import { websocketRouter } from './routes/websocket';

type Bindings = {
  DB: D1Database;
  CACHE: KVNamespace;
  RADIO_ROOM: DurableObjectNamespace;
};

const app = new Hono<{ Bindings: Bindings }>();

app.use('*', cors({
  origin: ['https://moonwitness.dev', 'https://*.moonwitness.dev', 'http://localhost:3000'],
  allowMethods: ['GET', 'POST', 'OPTIONS'],
  allowHeaders: ['Content-Type', 'Authorization'],
}));

app.route('/api', stationsRouter);
app.route('/ws', websocketRouter);

app.get('/health', (c) => c.json({ status: 'ok', timestamp: Date.now() }));

export default app;