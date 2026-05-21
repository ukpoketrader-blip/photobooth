import "dotenv/config";

export const env = {
  port: parseInt(process.env.API_PORT ?? "3002", 10),
  databaseUrl: process.env.DATABASE_URL!,
  redisUrl: process.env.REDIS_URL ?? "redis://localhost:6379",
  authSecret: process.env.AUTH_SECRET ?? "dev-auth-secret-change-me",
  boothJwtSecret: process.env.BOOTH_JWT_SECRET ?? "dev-booth-jwt-secret",
  /** When set, booth must unlock via password before sessions / AI (dev/demo). */
  boothAccessPassword: process.env.BOOTH_ACCESS_PASSWORD ?? "",
  geminiApiKey: process.env.GEMINI_API_KEY ?? "",
  geminiImageModel:
    process.env.GEMINI_IMAGE_MODEL ?? "gemini-3-pro-image-preview",
  gcsBucket: process.env.GCS_BUCKET ?? "",
  gcsProjectId: process.env.GCS_PROJECT_ID ?? "",
  storageLocalPath: process.env.STORAGE_LOCAL_PATH ?? "./uploads",
  sumupApiBase: process.env.SUMUP_API_BASE ?? "https://api.sumup.com",
  sumupClientId: process.env.SUMUP_CLIENT_ID ?? "",
  sumupClientSecret: process.env.SUMUP_CLIENT_SECRET ?? "",
  sumupWebhookSecret: process.env.SUMUP_WEBHOOK_SECRET ?? "",
  defaultRetentionDays: parseInt(process.env.DEFAULT_RETENTION_DAYS ?? "7", 10),
  paymentUnlockTtlMinutes: parseInt(
    process.env.PAYMENT_UNLOCK_TTL_MINUTES ?? "15",
    10
  ),
  signedUrlTtlSeconds: parseInt(process.env.SIGNED_URL_TTL_SECONDS ?? "300", 10),
  dataRegion: process.env.DATA_REGION ?? "EU/UK",
  nodeEnv: process.env.NODE_ENV ?? "development",
  /** Shared secret so worker can copy files onto the API volume (split Railway volumes). */
  workerStorageSecret: process.env.WORKER_STORAGE_SECRET ?? "",
};
