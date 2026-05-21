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

  const form = await c.req.parseBody();
  const key = String(form["key"] ?? "");
  const file = form["file"];
  if (!key || !file || typeof file === "string") {
    return c.json({ error: "Multipart fields required: key, file" }, 400);
  }

  const buffer = Buffer.from(await (file as File).arrayBuffer());
  await putObject(key, buffer, "image/jpeg");
  return c.json({ ok: true });
});
