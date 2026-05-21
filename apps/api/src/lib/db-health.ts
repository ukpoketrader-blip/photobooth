import { prisma } from "@photobooth/db";

export async function pingDatabase(): Promise<{ ok: true } | { ok: false; error: string }> {
  try {
    await prisma.$queryRaw`SELECT 1`;
    return { ok: true };
  } catch (e) {
    const message = e instanceof Error ? e.message : String(e);
    return { ok: false, error: message };
  }
}
