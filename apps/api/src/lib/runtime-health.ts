import { writeFile, unlink, access } from "fs/promises";
import { join } from "path";
import { Queue } from "bullmq";
import { servicesEnv } from "@photobooth/services";
import { env } from "./env.js";
import { AI_JOB_QUEUE } from "./queue.js";

export async function pingRedis(): Promise<{ ok: boolean; error?: string }> {
  const queue = new Queue(AI_JOB_QUEUE, { connection: { url: env.redisUrl } });
  try {
    await queue.getJobCounts();
    return { ok: true };
  } catch (e) {
    return {
      ok: false,
      error: e instanceof Error ? e.message : "Redis unreachable",
    };
  } finally {
    await queue.close();
  }
}

export async function pingStorage(): Promise<{ ok: boolean; error?: string }> {
  const root = servicesEnv.storageLocalPath;
  try {
    await access(root);
    const probe = join(root, `.health-${Date.now()}`);
    await writeFile(probe, "ok");
    await unlink(probe);
    return { ok: true };
  } catch (e) {
    return {
      ok: false,
      error: e instanceof Error ? e.message : "Storage not writable",
    };
  }
}
