-- CreateEnum
CREATE TYPE "PaymentStatus" AS ENUM ('not_required', 'pending', 'paid', 'failed', 'refunded');
CREATE TYPE "AiJobStatus" AS ENUM ('queued', 'running', 'succeeded', 'failed');
CREATE TYPE "CaptureStatus" AS ENUM ('uploaded', 'processing', 'complete', 'failed');
CREATE TYPE "PaymentTransactionStatus" AS ENUM ('pending', 'succeeded', 'failed', 'cancelled');

-- CreateTable
CREATE TABLE "Organisation" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "sumupAccessToken" TEXT,
    "sumupRefreshToken" TEXT,
    "sumupMerchantCode" TEXT,
    "sumupConnectedAt" TIMESTAMP(3),
    CONSTRAINT "Organisation_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "User" (
    "id" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "passwordHash" TEXT NOT NULL,
    "name" TEXT,
    "organisationId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "User_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "BoothInstance" (
    "id" TEXT NOT NULL,
    "organisationId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "publicId" TEXT NOT NULL,
    "apiSecretHash" TEXT NOT NULL,
    "primaryColor" TEXT NOT NULL DEFAULT '#6366f1',
    "secondaryColor" TEXT NOT NULL DEFAULT '#1e1b4b',
    "logoUrl" TEXT,
    "privacyNoticeHtml" TEXT NOT NULL DEFAULT '',
    "consentVersion" TEXT NOT NULL DEFAULT '1.0',
    "retentionDays" INTEGER NOT NULL DEFAULT 7,
    "locale" TEXT NOT NULL DEFAULT 'en-GB',
    "enableDownload" BOOLEAN NOT NULL DEFAULT true,
    "enableQrShare" BOOLEAN NOT NULL DEFAULT true,
    "enableEmail" BOOLEAN NOT NULL DEFAULT false,
    "enablePrint" BOOLEAN NOT NULL DEFAULT false,
    "requireAge16" BOOLEAN NOT NULL DEFAULT false,
    "paymentEnabled" BOOLEAN NOT NULL DEFAULT false,
    "paymentAmountMinor" INTEGER NOT NULL DEFAULT 300,
    "paymentCurrency" TEXT NOT NULL DEFAULT 'GBP',
    "sumupReaderId" TEXT,
    "frameEnabled" BOOLEAN NOT NULL DEFAULT false,
    "frameAssetId" TEXT,
    "dailyJobCap" INTEGER NOT NULL DEFAULT 500,
    "maxConcurrentJobs" INTEGER NOT NULL DEFAULT 3,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "BoothInstance_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "FrameAsset" (
    "id" TEXT NOT NULL,
    "organisationId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "overlayObjectKey" TEXT NOT NULL,
    "canvasWidth" INTEGER NOT NULL DEFAULT 1200,
    "canvasHeight" INTEGER NOT NULL DEFAULT 1800,
    "photoInsetX" INTEGER NOT NULL DEFAULT 100,
    "photoInsetY" INTEGER NOT NULL DEFAULT 200,
    "photoInsetW" INTEGER NOT NULL DEFAULT 1000,
    "photoInsetH" INTEGER NOT NULL DEFAULT 1200,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "FrameAsset_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "FilterPreset" (
    "id" TEXT NOT NULL,
    "boothInstanceId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "promptTemplate" TEXT NOT NULL,
    "negativePrompt" TEXT,
    "referenceImageUrls" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    "isDefault" BOOLEAN NOT NULL DEFAULT false,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "FilterPreset_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "Session" (
    "id" TEXT NOT NULL,
    "boothInstanceId" TEXT NOT NULL,
    "consentAt" TIMESTAMP(3) NOT NULL,
    "consentVersion" TEXT NOT NULL,
    "marketingOptIn" BOOLEAN NOT NULL DEFAULT false,
    "paymentStatus" "PaymentStatus" NOT NULL DEFAULT 'not_required',
    "unlockedAt" TIMESTAMP(3),
    "ipHash" TEXT,
    "expiresAt" TIMESTAMP(3) NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "Session_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "PaymentTransaction" (
    "id" TEXT NOT NULL,
    "sessionId" TEXT NOT NULL,
    "sumupCheckoutId" TEXT,
    "sumupTransactionId" TEXT,
    "amountMinor" INTEGER NOT NULL,
    "currency" TEXT NOT NULL,
    "status" "PaymentTransactionStatus" NOT NULL DEFAULT 'pending',
    "checkoutUrl" TEXT,
    "webhookReceivedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "PaymentTransaction_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "Capture" (
    "id" TEXT NOT NULL,
    "sessionId" TEXT NOT NULL,
    "originalObjectKey" TEXT NOT NULL,
    "status" "CaptureStatus" NOT NULL DEFAULT 'uploaded',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "Capture_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "AiJob" (
    "id" TEXT NOT NULL,
    "captureId" TEXT NOT NULL,
    "filterPresetId" TEXT NOT NULL,
    "status" "AiJobStatus" NOT NULL DEFAULT 'queued',
    "modelId" TEXT NOT NULL,
    "styledObjectKey" TEXT,
    "outputObjectKey" TEXT,
    "errorMessage" TEXT,
    "tokenUsage" INTEGER,
    "latencyMs" INTEGER,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "completedAt" TIMESTAMP(3),
    CONSTRAINT "AiJob_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "AuditLog" (
    "id" TEXT NOT NULL,
    "organisationId" TEXT,
    "boothInstanceId" TEXT,
    "actorEmail" TEXT,
    "action" TEXT NOT NULL,
    "resourceType" TEXT,
    "resourceId" TEXT,
    "metadata" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "AuditLog_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "Organisation_slug_key" ON "Organisation"("slug");
CREATE UNIQUE INDEX "User_email_key" ON "User"("email");
CREATE UNIQUE INDEX "BoothInstance_slug_key" ON "BoothInstance"("slug");
CREATE UNIQUE INDEX "BoothInstance_publicId_key" ON "BoothInstance"("publicId");
CREATE UNIQUE INDEX "PaymentTransaction_sessionId_key" ON "PaymentTransaction"("sessionId");
CREATE UNIQUE INDEX "AiJob_captureId_key" ON "AiJob"("captureId");

ALTER TABLE "User" ADD CONSTRAINT "User_organisationId_fkey" FOREIGN KEY ("organisationId") REFERENCES "Organisation"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "BoothInstance" ADD CONSTRAINT "BoothInstance_organisationId_fkey" FOREIGN KEY ("organisationId") REFERENCES "Organisation"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "BoothInstance" ADD CONSTRAINT "BoothInstance_frameAssetId_fkey" FOREIGN KEY ("frameAssetId") REFERENCES "FrameAsset"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "FrameAsset" ADD CONSTRAINT "FrameAsset_organisationId_fkey" FOREIGN KEY ("organisationId") REFERENCES "Organisation"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "FilterPreset" ADD CONSTRAINT "FilterPreset_boothInstanceId_fkey" FOREIGN KEY ("boothInstanceId") REFERENCES "BoothInstance"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "Session" ADD CONSTRAINT "Session_boothInstanceId_fkey" FOREIGN KEY ("boothInstanceId") REFERENCES "BoothInstance"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "PaymentTransaction" ADD CONSTRAINT "PaymentTransaction_sessionId_fkey" FOREIGN KEY ("sessionId") REFERENCES "Session"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "Capture" ADD CONSTRAINT "Capture_sessionId_fkey" FOREIGN KEY ("sessionId") REFERENCES "Session"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "AiJob" ADD CONSTRAINT "AiJob_captureId_fkey" FOREIGN KEY ("captureId") REFERENCES "Capture"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "AiJob" ADD CONSTRAINT "AiJob_filterPresetId_fkey" FOREIGN KEY ("filterPresetId") REFERENCES "FilterPreset"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "AuditLog" ADD CONSTRAINT "AuditLog_organisationId_fkey" FOREIGN KEY ("organisationId") REFERENCES "Organisation"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "AuditLog" ADD CONSTRAINT "AuditLog_boothInstanceId_fkey" FOREIGN KEY ("boothInstanceId") REFERENCES "BoothInstance"("id") ON DELETE SET NULL ON UPDATE CASCADE;
