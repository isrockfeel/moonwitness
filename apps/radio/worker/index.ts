import { Hono } from "hono";
import { cors } from "hono/cors";
import { stationsRouter } from "./routes/stations";
import { websocketRouter } from "./routes/websocket";
import { RadioRoom } from "./durable-objects/radio-room";

interface Env {
  DB: D1Database;
  CACHE: KVNamespace;
  RADIO_ROOM: DurableObjectNamespace;
}

const app = new Hono<{ Bindings: Env }>();

// Custom CORS handler to allow all pages.dev subdomains
app.use(
  "*",
  cors({
    origin: (origin, c) => {
      const allowedOrigins = [
        "https://moonwitness.dev",
        "https://*.moonwitness.dev",
        "https://*.pages.dev",
        "http://localhost:3000",
      ];

      if (!origin) return null;

      for (const allowed of allowedOrigins) {
        if (allowed.includes("*")) {
          const pattern = allowed.replace(/\*/g, ".*");
          if (new RegExp(`^${pattern}$`).test(origin)) {
            return origin;
          }
        } else if (allowed === origin) {
          return origin;
        }
      }
      return null;
    },
    allowMethods: ["GET", "POST", "OPTIONS"],
    allowHeaders: ["Content-Type", "Authorization"],
    credentials: true,
  }),
);

app.route("/api", stationsRouter);
app.route("/ws", websocketRouter);

app.get("/health", (c) => c.json({ status: "ok", timestamp: Date.now() }));

export default app;
export { RadioRoom };
export type { Env };
