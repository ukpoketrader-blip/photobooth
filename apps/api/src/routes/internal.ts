import { Hono } from "hono";
import { putObject } from "@photobooth/services";
import { env } from "../lib/env.js";

/** Worker mirrors styled outputs onto the API volume when services use separate Railway volumes. */
export const internalRoutes = new Hono();

internalRoutes.post("/storage", async (c) => {
  if (!env.workerStorageSecret) {
    return c.json({ error: "Not configured" }, 404);
  }
  const auth = c.req.header("Authorization");
  if (auth !== `Bearer ${env.workerStorageSecret}`) {
    return c.json({ error: "Unauthorized" }, 401);
  }

  const body = await c.req.json<{ key?: string; data?: string }>();
  if (!body.key || !body.data) {
    return c.json({ error: "key and data (base64) required" }, 400);
  }

  await putObject(body.key, Buffer.from(body.data, "base64"));
  return c.json({ ok: true });
});
