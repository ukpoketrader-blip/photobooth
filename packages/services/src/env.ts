import { config } from "dotenv";
import { existsSync } from "fs";
import { dirname, resolve, isAbsolute } from "path";
import { fileURLToPath } from "url";

const servicesDir = dirname(fileURLToPath(import.meta.url));
export const repoRoot = resolve(servicesDir, "../../..");

const rootEnv = resolve(repoRoot, ".env");
if (existsSync(rootEnv)) {
  config({ path: rootEnv });
}

function resolveStoragePath(): string {
  const raw = process.env.STORAGE_LOCAL_PATH?.trim();
  if (!raw) {
    return resolve(repoRoot, "storage");
  }
  if (isAbsolute(raw)) {
    return raw;
  }
  return resolve(repoRoot, raw.replace(/^\.\//, ""));
}

export const servicesEnv = {
  geminiApiKey: process.env.GEMINI_API_KEY ?? "",
  geminiImageModel:
    process.env.GEMINI_IMAGE_MODEL ?? "gemini-3-pro-image-preview",
  gcsBucket: process.env.GCS_BUCKET ?? "",
  gcsProjectId: process.env.GCS_PROJECT_ID ?? "",
  storageLocalPath: resolveStoragePath(),
  nodeEnv: process.env.NODE_ENV ?? "development",
};
