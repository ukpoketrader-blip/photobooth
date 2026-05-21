import { mkdir, readFile, writeFile, unlink, stat } from "fs/promises";
import { join, dirname } from "path";
import { env } from "./env.js";

const localRoot = env.storageLocalPath;

async function ensureDir(filePath: string) {
  await mkdir(dirname(filePath), { recursive: true });
}

export async function putObject(
  key: string,
  data: Buffer,
  _contentType?: string
): Promise<string> {
  if (env.gcsBucket) {
    // GCS integration placeholder — use @google-cloud/storage in production
    const { Storage } = await import("@google-cloud/storage").catch(() => {
      throw new Error(
        "GCS_BUCKET is set but @google-cloud/storage is not installed. Use local storage or install the package."
      );
    });
    const storage = new Storage({ projectId: env.gcsProjectId });
    const bucket = storage.bucket(env.gcsBucket);
    await bucket.file(key).save(data, { resumable: false });
    return key;
  }

  const fullPath = join(localRoot, key);
  await ensureDir(fullPath);
  await writeFile(fullPath, data);
  return key;
}

export async function getObject(key: string): Promise<Buffer> {
  if (env.gcsBucket) {
    const { Storage } = await import("@google-cloud/storage");
    const storage = new Storage({ projectId: env.gcsProjectId });
    const [buf] = await storage.bucket(env.gcsBucket).file(key).download();
    return buf;
  }

  return readFile(join(localRoot, key));
}

export async function deleteObject(key: string): Promise<void> {
  if (env.gcsBucket) {
    const { Storage } = await import("@google-cloud/storage");
    const storage = new Storage({ projectId: env.gcsProjectId });
    await storage
      .bucket(env.gcsBucket)
      .file(key)
      .delete({ ignoreNotFound: true });
    return;
  }

  try {
    await unlink(join(localRoot, key));
  } catch {
    /* ignore missing */
  }
}

export async function objectExists(key: string): Promise<boolean> {
  try {
    if (env.gcsBucket) {
      const { Storage } = await import("@google-cloud/storage");
      const storage = new Storage({ projectId: env.gcsProjectId });
      const [exists] = await storage.bucket(env.gcsBucket).file(key).exists();
      return exists;
    }
    await stat(join(localRoot, key));
    return true;
  } catch {
    return false;
  }
}

export function getSignedUrlPath(key: string): string {
  return `/api/files/${encodeURIComponent(key)}`;
}
