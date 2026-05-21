import { mkdir, readFile, writeFile, unlink, stat } from "fs/promises";
import { join, dirname } from "path";
import { servicesEnv } from "./env";

const localRoot = servicesEnv.storageLocalPath;

async function ensureDir(filePath: string) {
  await mkdir(dirname(filePath), { recursive: true });
}

export async function putObject(
  key: string,
  data: Buffer,
  _contentType?: string
): Promise<string> {
  const fullPath = join(localRoot, key);
  await ensureDir(fullPath);
  await writeFile(fullPath, data);
  return key;
}

export async function getObject(key: string): Promise<Buffer> {
  return readFile(join(localRoot, key));
}

export async function deleteObject(key: string): Promise<void> {
  try {
    await unlink(join(localRoot, key));
  } catch {
    /* ignore */
  }
}

export async function objectExists(key: string): Promise<boolean> {
  try {
    await stat(join(localRoot, key));
    return true;
  } catch {
    return false;
  }
}

export function getSignedUrlPath(key: string, apiBase: string): string {
  return `${apiBase}/api/public/files/${encodeURIComponent(key)}`;
}
