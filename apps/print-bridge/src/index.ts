import { serve } from "@hono/node-server";
import { Hono } from "hono";
import { cors } from "hono/cors";
import { execFile } from "node:child_process";
import { promisify } from "node:util";
import { mkdtemp, writeFile, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";

const execFileAsync = promisify(execFile);
const PORT = Number(process.env.PRINT_BRIDGE_PORT ?? 39100);

const app = new Hono();

app.use(
  "*",
  cors({
    origin: "*",
  })
);

app.get("/health", (c) => c.json({ status: "ok", platform: process.platform }));

app.get("/printers", async (c) => {
  if (process.platform !== "win32") {
    return c.json({ printers: [], note: "Windows only" });
  }
  try {
    const { stdout } = await execFileAsync("powershell", [
      "-NoProfile",
      "-Command",
      "Get-Printer | Select-Object -ExpandProperty Name | ConvertTo-Json -Compress",
    ]);
    const parsed = JSON.parse(stdout.trim() || "[]");
    const printers = Array.isArray(parsed) ? parsed : [parsed].filter(Boolean);
    return c.json({ printers });
  } catch (e) {
    const msg = e instanceof Error ? e.message : "Failed to list printers";
    return c.json({ error: msg, printers: [] }, 500);
  }
});

app.post("/print", async (c) => {
  if (process.platform !== "win32") {
    return c.json({ error: "Printing is supported on Windows only" }, 400);
  }

  const body = (await c.req.json()) as {
    imageUrl?: string;
    printerName?: string;
  };

  const imageUrl = body.imageUrl?.trim();
  const printerName = body.printerName?.trim();
  if (!imageUrl || !printerName) {
    return c.json({ error: "imageUrl and printerName required" }, 400);
  }

  const res = await fetch(imageUrl);
  if (!res.ok) {
    return c.json({ error: `Failed to download image (${res.status})` }, 400);
  }

  const buffer = Buffer.from(await res.arrayBuffer());
  const dir = await mkdtemp(join(tmpdir(), "photobooth-print-"));
  const filePath = join(dir, "photo.jpg");

  try {
    await writeFile(filePath, buffer);
    await execFileAsync("mspaint", ["/pt", filePath, printerName]);
    return c.json({ ok: true });
  } catch (e) {
    const msg = e instanceof Error ? e.message : "Print failed";
    return c.json({ error: msg }, 500);
  } finally {
    await rm(dir, { recursive: true, force: true }).catch(() => {});
  }
});

console.log(`Print bridge listening on http://127.0.0.1:${PORT}`);
serve({ fetch: app.fetch, port: PORT });
