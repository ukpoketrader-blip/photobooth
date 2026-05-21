import { config } from "dotenv";
import { resolve } from "path";
import { serve } from "@hono/node-server";

config({ path: resolve(process.cwd(), "../../.env") });
config({ path: resolve(process.cwd(), ".env") });
import { Hono } from "hono";
import { cors } from "hono/cors";
import { logger } from "hono/logger";
import { publicRoutes } from "./routes/public.js";
import { adminRoutes } from "./routes/admin.js";
import { webhookRoutes } from "./routes/webhooks.js";
import { servicesEnv } from "@photobooth/services";
import { env } from "./lib/env.js";
import { mkdir } from "fs/promises";

const app = new Hono();

app.use("*", logger());
const corsOrigins = [
  process.env.NEXT_PUBLIC_BOOTH_URL,
  process.env.NEXT_PUBLIC_ADMIN_URL,
  ...(process.env.CORS_EXTRA_ORIGINS?.split(",").map((s) => s.trim()) ?? []),
].filter((o): o is string => Boolean(o));

app.use(
  "*",
  cors({
    origin:
      corsOrigins.length > 0
        ? corsOrigins
        : ["http://localhost:3000", "http://localhost:3001"],
    credentials: true,
  })
);

app.get("/health", (c) =>
  c.json({ status: "ok", region: env.dataRegion })
);

app.route("/api/public", publicRoutes);
app.route("/api/admin", adminRoutes);
app.route("/api/webhooks", webhookRoutes);

async function main() {
  await mkdir(servicesEnv.storageLocalPath, { recursive: true });
  const port = env.port;
  console.log(`API listening on http://localhost:${port} (${env.dataRegion})`);
  serve({ fetch: app.fetch, port });
}

main().catch(console.error);
