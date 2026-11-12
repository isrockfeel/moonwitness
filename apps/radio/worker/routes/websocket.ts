import { Hono } from 'hono';
import { zValidator } from '@hono/zod-validator';
import { z } from 'zod';

const websocketRouter = new Hono<{ Bindings: { RADIO_ROOM: DurableObjectNamespace } }>();

const stationIdSchema = z.object({
  stationId: z.string().uuid(),
});

// GET /ws/station/:stationId - WebSocket upgrade endpoint
websocketRouter.get('/station/:stationId', zValidator('param', stationIdSchema), async (c) => {
  const { stationId } = c.req.valid('param');
  const upgradeHeader = c.req.header('Upgrade');

  if (upgradeHeader !== 'websocket') {
    return c.json({ error: 'Expected WebSocket upgrade' }, 400);
  }

  // Get or create Durable Object for this station
  const id = c.env.RADIO_ROOM.idFromName(`station:${stationId}`);
  const stub = c.env.RADIO_ROOM.get(id);

  // Forward the request to the Durable Object
  return stub.fetch(c.req.raw);
});

export { websocketRouter };