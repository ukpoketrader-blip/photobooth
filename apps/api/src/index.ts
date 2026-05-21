import { config } from "dotenv";
import { resolve } from "path";
import { serve } from "@hono/node-server";

config({ path: resolve(process.cwd(), "../../.env") });
config({ path: resolve(process.cwd(), ".env") });
import { Hono } from "hono";
import { cors } from "hono/cors";
import { logger } from "hono/logger";
import { HTTPException } from "hono/http-exception";
import { ZodError } from "zod";
import { publicRoutes } from "./routes/public.js";
import { adminRoutes } from "./routes/admin.js";
import { webhookRoutes } from "./routes/webhooks.js";
import { internalRoutes } from "./routes/internal.js";
import { servicesEnv } from "@photobooth/services";
import { env } from "./lib/env.js";
import { pingDatabase } from "./lib/db-health.js";
import { pingRedis, pingStorage } from "./lib/runtime-health.js";
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

app.get("/health/db", async (c) => {
  const db = await pingDatabase();
  if (!db.ok) {
    return c.json({ status: "error", error: db.error }, 503);
  }
  return c.json({ status: "ok" });
});

app.get("/health/ready", async (c) => {
  const [db, redis, storage] = await Promise.all([
    pingDatabase(),
    pingRedis(),
    pingStorage(),
  ]);
  const checks = {
    database: db.ok ? "ok" : db.error,
    redis: redis.ok ? "ok" : redis.error,
    storage: storage.ok ? "ok" : storage.error,
    gemini: env.geminiApiKey ? "configured" : "missing",
    storagePath: servicesEnv.storageLocalPath,
  };
  const ok = db.ok && redis.ok && storage.ok && Boolean(env.geminiApiKey);
  return c.json({ status: ok ? "ok" : "degraded", checks }, ok ? 200 : 503);
});

app.onError((err, c) => {
  if (err instanceof HTTPException) {
    return err.getResponse();
  }
  if (err instanceof ZodError) {
    return c.json({ error: "Invalid request", details: err.flatten() }, 400);
  }
  console.error("[api] unhandled error:", err);
  const message = err instanceof Error ? err.message : "Internal Server Error";
  const hint =
    message.includes("Prisma") || message.includes("database")
      ? "Check DATABASE_URL on the API service (Neon: use ?sslmode=require only — remove channel_binding=require)."
      : undefined;
  return c.json(
    { error: "Internal Server Error", ...(hint ? { hint } : {}) },
    500
  );
});

app.route("/api/public", publicRoutes);
app.route("/api/admin", adminRoutes);
app.route("/api/webhooks", webhookRoutes);
app.route("/api/internal", internalRoutes);

async function main() {
  await mkdir(servicesEnv.storageLocalPath, { recursive: true });
  const port = env.port;
  console.log(`API listening on http://localhost:${port} (${env.dataRegion})`);
  serve({ fetch: app.fetch, port });
}

main().catch(console.error);
