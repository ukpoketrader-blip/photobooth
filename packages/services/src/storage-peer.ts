function peerApiBase(): string | null {
  const base = process.env.API_URL?.trim().replace(/\/$/, "");
  return base || null;
}

function formatFetchError(url: string, err: unknown): string {
  const msg = err instanceof Error ? err.message : String(err);
  const cause =
    err instanceof Error && err.cause instanceof Error
      ? ` (${err.cause.message})`
      : "";
  return `Cannot reach API at ${url}: ${msg}${cause}. On Railway worker, set API_URL=https://api.eventlab.uk (your public API URL, not localhost).`;
}

export async function fetchObjectFromPeer(key: string): Promise<Buffer | null> {
  const base = peerApiBase();
  if (!base) return null;
  const url = `${base}/api/public/files/${encodeURIComponent(key)}`;
  try {
    const res = await fetch(url);
    if (!res.ok) return null;
    return Buffer.from(await res.arrayBuffer());
  } catch (err) {
    throw new Error(formatFetchError(url, err));
  }
}

export async function mirrorObjectToPeer(
  key: string,
  data: Buffer
): Promise<void> {
  if (process.env.STORAGE_MIRROR_TO_API !== "true") return;
  const base = peerApiBase();
  const secret = process.env.WORKER_STORAGE_SECRET?.trim();
  if (!base || !secret) {
    throw new Error(
      "STORAGE_MIRROR_TO_API is set but API_URL or WORKER_STORAGE_SECRET is missing on the worker."
    );
  }

  const url = `${base}/api/internal/storage`;
  const form = new FormData();
  form.append("key", key);
  form.append("file", new Blob([data], { type: "image/jpeg" }), "upload.jpg");

  try {
    const res = await fetch(url, {
      method: "POST",
      headers: { Authorization: `Bearer ${secret}` },
      body: form,
    });
    if (!res.ok) {
      const err = await res.text().catch(() => res.statusText);
      throw new Error(
        `API rejected mirrored file (${res.status}): ${err.slice(0, 200)}`
      );
    }
  } catch (err) {
    if (err instanceof Error && err.message.startsWith("API rejected")) {
      throw err;
    }
    throw new Error(formatFetchError(url, err));
  }
}
