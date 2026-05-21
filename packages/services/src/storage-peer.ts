function peerApiBase(): string | null {
  const base = process.env.API_URL?.trim().replace(/\/$/, "");
  return base || null;
}

export async function fetchObjectFromPeer(key: string): Promise<Buffer | null> {
  const base = peerApiBase();
  if (!base) return null;
  const url = `${base}/api/public/files/${encodeURIComponent(key)}`;
  const res = await fetch(url);
  if (!res.ok) return null;
  return Buffer.from(await res.arrayBuffer());
}

export async function mirrorObjectToPeer(
  key: string,
  data: Buffer
): Promise<void> {
  if (process.env.STORAGE_MIRROR_TO_API !== "true") return;
  const base = peerApiBase();
  const secret = process.env.WORKER_STORAGE_SECRET?.trim();
  if (!base || !secret) return;

  const res = await fetch(`${base}/api/internal/storage`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${secret}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ key, data: data.toString("base64") }),
  });
  if (!res.ok) {
    const err = await res.text().catch(() => res.statusText);
    throw new Error(`Failed to mirror file to API storage: ${err}`);
  }
}
