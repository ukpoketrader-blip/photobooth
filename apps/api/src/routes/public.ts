import { Hono } from "hono";
import { prisma, PaymentStatus, CaptureStatus } from "@photobooth/db";
import {
  boothAccessVerifySchema,
  createSessionSchema,
  createPaymentSchema,
  selectJobSchema,
  MAX_PHOTO_VARIANTS,
} from "@photobooth/shared";
import { boothAuth, createBoothToken } from "../middleware/auth.js";
import { hashIp, generateShareToken } from "../lib/crypto.js";
import {
  createBoothAccessToken,
  hasValidBoothAccess,
  isBoothAccessGateEnabled,
  verifyBoothAccessPassword,
} from "../lib/booth-access.js";
import { putObject, getObject } from "@photobooth/services";
import { enqueueAiJob } from "../lib/queue.js";
import { env } from "../lib/env.js";
import {
  createSumUpCheckout,
  createTerminalPayment,
} from "../lib/sumup.js";
import { normalizeToPrintSize } from "@photobooth/services";

export const publicRoutes = new Hono();

function instanceToPublicJson(
  instance: {
    slug: string;
    name: string;
    primaryColor: string;
    secondaryColor: string;
    logoUrl: string | null;
    privacyNoticeHtml: string;
    consentVersion: string;
    retentionDays: number;
    requireAge16: boolean;
    enableDownload: boolean;
    enableQrShare: boolean;
    enableEmail: boolean;
    enablePrint: boolean;
    paymentEnabled: boolean;
    paymentAmountMinor: number;
    paymentCurrency: string;
    frameEnabled: boolean;
    maxPhotoVariants: number | null;
    windowsPrinterName: string | null;
    printBridgeUrl: string | null;
    filterPresets: { id: string; name: string; isDefault: boolean }[];
  },
  accessGateEnabled: boolean
) {
  return {
    slug: instance.slug,
    name: instance.name,
    accessGateEnabled,
    branding: {
      primaryColor: instance.primaryColor,
      secondaryColor: instance.secondaryColor,
      logoUrl: instance.logoUrl,
    },
    privacyNoticeHtml: instance.privacyNoticeHtml,
    consentVersion: instance.consentVersion,
    retentionDays: instance.retentionDays,
    requireAge16: instance.requireAge16,
    outputs: {
      download: instance.enableDownload,
      qrShare: instance.enableQrShare,
      email: instance.enableEmail,
      print: instance.enablePrint,
    },
    paymentEnabled: instance.paymentEnabled,
    paymentAmountMinor: instance.paymentAmountMinor,
    paymentCurrency: instance.paymentCurrency,
    paymentDisplay: instance.paymentEnabled
      ? `${(instance.paymentAmountMinor / 100).toFixed(2)} ${instance.paymentCurrency}`
      : null,
    frameEnabled: instance.frameEnabled,
    maxPhotoVariants: instance.maxPhotoVariants ?? MAX_PHOTO_VARIANTS,
    windowsPrinterName: instance.windowsPrinterName,
    printBridgeUrl: instance.printBridgeUrl,
    filters: instance.filterPresets.map((f) => ({
      id: f.id,
      name: f.name,
      isDefault: f.isDefault,
    })),
    dataRegion: env.dataRegion,
  };
}

publicRoutes.post("/booth-access/verify", async (c) => {
  if (!isBoothAccessGateEnabled()) {
    return c.json({ accessGateEnabled: false, accessToken: null });
  }
  const body = boothAccessVerifySchema.parse(await c.req.json());
  if (!verifyBoothAccessPassword(body.password)) {
    return c.json({ error: "Invalid access password" }, 401);
  }
  const accessToken = await createBoothAccessToken();
  return c.json({
    accessGateEnabled: true,
    accessToken,
    expiresInHours: 24,
  });
});

publicRoutes.get("/instances/:slug", async (c) => {
  const instance = await prisma.boothInstance.findFirst({
    where: { slug: c.req.param("slug"), isActive: true },
    include: {
      filterPresets: {
        where: { isActive: true },
        orderBy: { sortOrder: "asc" },
      },
      frameAsset: true,
    },
  });

  if (!instance) return c.json({ error: "Not found" }, 404);

  const gateOn = isBoothAccessGateEnabled();
  const allowed = await hasValidBoothAccess((name) => c.req.header(name));

  if (gateOn && !allowed) {
    return c.json({
      slug: instance.slug,
      name: instance.name,
      accessGateEnabled: true,
    });
  }

  return c.json(instanceToPublicJson(instance, false));
});

publicRoutes.post("/instances/:slug/sessions", async (c) => {
  if (isBoothAccessGateEnabled() && !(await hasValidBoothAccess((name) => c.req.header(name)))) {
    return c.json({ error: "Booth access password required" }, 401);
  }

  const body = createSessionSchema.parse(await c.req.json());
  const instance = await prisma.boothInstance.findFirst({
    where: { slug: c.req.param("slug"), isActive: true },
  });
  if (!instance) return c.json({ error: "Not found" }, 404);

  const ip =
    c.req.header("x-forwarded-for")?.split(",")[0]?.trim() ??
    c.req.header("x-real-ip");
  const expiresAt = new Date();
  expiresAt.setDate(expiresAt.getDate() + instance.retentionDays);

  const paymentStatus: PaymentStatus = instance.paymentEnabled
    ? PaymentStatus.pending
    : PaymentStatus.not_required;

  const session = await prisma.session.create({
    data: {
      boothInstanceId: instance.id,
      consentAt: new Date(),
      consentVersion: body.consentVersion,
      marketingOptIn: body.marketingOptIn,
      paymentStatus,
      unlockedAt:
        paymentStatus === PaymentStatus.not_required ? new Date() : null,
      ipHash: ip ? hashIp(ip) : null,
      expiresAt,
    },
  });

  const token = await createBoothToken(session.id, instance.id);

  return c.json({
    sessionId: session.id,
    token,
    paymentStatus: session.paymentStatus,
    paymentEnabled: instance.paymentEnabled,
    consentVersion: instance.consentVersion,
  });
});

publicRoutes.get("/sessions/:id", boothAuth, async (c) => {
  const sessionId = c.get("sessionId");
  if (sessionId !== c.req.param("id")) {
    return c.json({ error: "Forbidden" }, 403);
  }

  const session = await prisma.session.findUnique({
    where: { id: sessionId },
    include: { paymentTransaction: true },
  });
  if (!session) return c.json({ error: "Not found" }, 404);

  return c.json({
    id: session.id,
    paymentStatus: session.paymentStatus,
    unlockedAt: session.unlockedAt,
    checkoutUrl: session.paymentTransaction?.checkoutUrl,
    expiresAt: session.expiresAt,
  });
});

publicRoutes.post("/sessions/:id/payment", boothAuth, async (c) => {
  const sessionId = c.get("sessionId");
  if (sessionId !== c.req.param("id")) {
    return c.json({ error: "Forbidden" }, 403);
  }

  const body = createPaymentSchema.parse(await c.req.json());
  const session = await prisma.session.findUnique({
    where: { id: sessionId },
    include: {
      boothInstance: { include: { organisation: true } },
      paymentTransaction: true,
    },
  });
  if (!session) return c.json({ error: "Not found" }, 404);
  if (!session.boothInstance.paymentEnabled) {
    return c.json({ error: "Payment not enabled" }, 400);
  }
  if (session.paymentStatus === PaymentStatus.paid) {
    return c.json({ status: "paid", checkoutUrl: session.paymentTransaction?.checkoutUrl });
  }

  const org = session.boothInstance.organisation;
  const accessToken = org.sumupAccessToken ?? "";

  let checkoutId: string | undefined;
  let checkoutUrl: string | undefined;
  let transactionId: string | undefined;

  if (body.mode === "terminal" && session.boothInstance.sumupReaderId) {
    const tx = await createTerminalPayment({
      amountMinor: session.boothInstance.paymentAmountMinor,
      currency: session.boothInstance.paymentCurrency,
      readerId: session.boothInstance.sumupReaderId,
      merchantReference: sessionId,
      accessToken,
    });
    transactionId = tx.transactionId;
  } else {
    const checkout = await createSumUpCheckout({
      amountMinor: session.boothInstance.paymentAmountMinor,
      currency: session.boothInstance.paymentCurrency,
      merchantReference: sessionId,
      description: `Photobooth: ${session.boothInstance.name}`,
      accessToken,
    });
    checkoutId = checkout.checkoutId;
    checkoutUrl = checkout.checkoutUrl;
  }

  await prisma.paymentTransaction.upsert({
    where: { sessionId },
    create: {
      sessionId,
      sumupCheckoutId: checkoutId,
      sumupTransactionId: transactionId,
      amountMinor: session.boothInstance.paymentAmountMinor,
      currency: session.boothInstance.paymentCurrency,
      checkoutUrl,
    },
    update: {
      sumupCheckoutId: checkoutId,
      sumupTransactionId: transactionId,
      checkoutUrl,
    },
  });

  return c.json({
    status: "pending",
    checkoutUrl,
    mode: body.mode,
  });
});

function fileUrl(key: string): string {
  const apiBase = process.env.API_URL ?? "http://localhost:3002";
  return `${apiBase}/api/public/files/${encodeURIComponent(key)}`;
}

function boothPublicUrl(): string {
  return process.env.NEXT_PUBLIC_BOOTH_URL ?? "http://localhost:3000";
}

async function assertSessionReady(session: {
  boothInstance: { paymentEnabled: boolean };
  paymentStatus: PaymentStatus;
  unlockedAt: Date | null;
}) {
  if (session.boothInstance.paymentEnabled && session.paymentStatus !== PaymentStatus.paid) {
    throw new Error("PAYMENT_REQUIRED");
  }
  if (session.unlockedAt) {
    const ttlMs = env.paymentUnlockTtlMinutes * 60 * 1000;
    if (Date.now() - session.unlockedAt.getTime() > ttlMs) {
      throw new Error("SESSION_EXPIRED");
    }
  }
}

publicRoutes.get("/sessions/:id/captures", boothAuth, async (c) => {
  const sessionId = c.get("sessionId");
  if (sessionId !== c.req.param("id")) {
    return c.json({ error: "Forbidden" }, 403);
  }

  const session = await prisma.session.findUnique({
    where: { id: sessionId },
    include: {
      boothInstance: true,
      captures: {
        orderBy: { sequenceIndex: "asc" },
        include: { aiJob: true },
      },
    },
  });
  if (!session) return c.json({ error: "Not found" }, 404);

  const maxPhotos = session.boothInstance.maxPhotoVariants ?? MAX_PHOTO_VARIANTS;
  const variants = session.captures
    .filter((cap) => cap.aiJob?.status === "succeeded" && cap.aiJob.outputObjectKey)
    .map((cap) => ({
      jobId: cap.aiJob!.id,
      captureId: cap.id,
      sequenceIndex: cap.sequenceIndex,
      outputUrl: fileUrl(cap.aiJob!.outputObjectKey!),
    }));

  return c.json({
    variants,
    maxPhotos,
    attemptCount: session.captures.length,
    retakesRemaining: Math.max(0, maxPhotos - session.captures.length),
    selectedCaptureId: session.selectedCaptureId,
  });
});

publicRoutes.post("/sessions/:id/captures", boothAuth, async (c) => {
  const sessionId = c.get("sessionId");
  if (sessionId !== c.req.param("id")) {
    return c.json({ error: "Forbidden" }, 403);
  }

  const session = await prisma.session.findUnique({
    where: { id: sessionId },
    include: { boothInstance: true, captures: true },
  });
  if (!session) return c.json({ error: "Not found" }, 404);

  try {
    await assertSessionReady(session);
  } catch (e) {
    const msg = e instanceof Error ? e.message : "";
    if (msg === "PAYMENT_REQUIRED") return c.json({ error: "Payment required" }, 402);
    if (msg === "SESSION_EXPIRED") return c.json({ error: "Session expired" }, 410);
    throw e;
  }

  if (session.selectedCaptureId) {
    return c.json({ error: "Session already completed" }, 409);
  }

  const maxPhotos = session.boothInstance.maxPhotoVariants ?? MAX_PHOTO_VARIANTS;
  if (session.captures.length >= maxPhotos) {
    return c.json({ error: `Maximum ${maxPhotos} attempts reached` }, 409);
  }

  const form = await c.req.parseBody();
  const file = form["image"];
  const filterPresetId = String(form["filterPresetId"] ?? "");
  if (!file || typeof file === "string") {
    return c.json({ error: "Image required" }, 400);
  }
  if (!filterPresetId) {
    return c.json({ error: "Filter required" }, 400);
  }

  const preset = await prisma.filterPreset.findFirst({
    where: {
      id: filterPresetId,
      boothInstanceId: session.boothInstanceId,
      isActive: true,
    },
  });
  if (!preset) return c.json({ error: "Invalid filter" }, 400);

  try {
    const arrayBuffer = await (file as File).arrayBuffer();
    const buffer = await normalizeToPrintSize(Buffer.from(arrayBuffer));

    const capture = await prisma.capture.create({
      data: {
        sessionId,
        originalObjectKey: "pending",
        sequenceIndex: session.captures.length,
        status: CaptureStatus.uploaded,
      },
    });

    const key = `captures/${session.boothInstanceId}/${sessionId}/${capture.id}.jpg`;
    await putObject(key, buffer, "image/jpeg");
    await prisma.capture.update({
      where: { id: capture.id },
      data: { originalObjectKey: key },
    });

    const shareToken = generateShareToken();
    const aiJob = await prisma.aiJob.create({
      data: {
        captureId: capture.id,
        filterPresetId: preset.id,
        modelId: env.geminiImageModel,
        shareToken,
      },
    });

    await prisma.capture.update({
      where: { id: capture.id },
      data: { status: CaptureStatus.processing },
    });

    await enqueueAiJob(aiJob.id);

    const count = session.captures.length + 1;
    return c.json({
      captureId: capture.id,
      jobId: aiJob.id,
      attemptNumber: count,
      retakesRemaining: Math.max(0, maxPhotos - count),
      maxPhotos,
    });
  } catch (e) {
    console.error("[captures] upload failed:", e);
    const message = e instanceof Error ? e.message : "Upload failed";
    if (
      message.includes("ECONNREFUSED") ||
      message.includes("Redis") ||
      message.includes("ENOTFOUND")
    ) {
      return c.json(
        {
          error: "Job queue unavailable",
          hint: "Set REDIS_URL on Railway api + worker (Upstash). Check https://api.eventlab.uk/health/ready",
        },
        503
      );
    }
    if (
      message.includes("EACCES") ||
      message.includes("ENOENT") ||
      message.includes("read-only")
    ) {
      return c.json(
        {
          error: "Photo storage not writable",
          hint: "On Railway api + worker: STORAGE_LOCAL_PATH=/data/uploads and mount a volume at /data/uploads",
        },
        503
      );
    }
    return c.json({ error: "Upload failed", detail: message }, 500);
  }
});

publicRoutes.post("/sessions/:id/select", boothAuth, async (c) => {
  const sessionId = c.get("sessionId");
  if (sessionId !== c.req.param("id")) {
    return c.json({ error: "Forbidden" }, 403);
  }

  const body = selectJobSchema.parse(await c.req.json());

  const job = await prisma.aiJob.findUnique({
    where: { id: body.jobId },
    include: {
      capture: { include: { session: { include: { boothInstance: true } } } },
    },
  });
  if (!job || job.capture.sessionId !== sessionId) {
    return c.json({ error: "Not found" }, 404);
  }
  if (job.status !== "succeeded" || !job.outputObjectKey) {
    return c.json({ error: "Photo not ready yet" }, 400);
  }

  await prisma.session.update({
    where: { id: sessionId },
    data: { selectedCaptureId: job.captureId },
  });

  return c.json({
    jobId: job.id,
    outputUrl: fileUrl(job.outputObjectKey),
    shareUrl: job.shareToken
      ? `${boothPublicUrl()}/share/${job.shareToken}`
      : null,
  });
});

publicRoutes.get("/jobs/:id", boothAuth, async (c) => {
  const job = await prisma.aiJob.findUnique({
    where: { id: c.req.param("id") },
    include: { capture: { include: { session: true } } },
  });
  if (!job) return c.json({ error: "Not found" }, 404);
  if (job.capture.sessionId !== c.get("sessionId")) {
    return c.json({ error: "Forbidden" }, 403);
  }

  const apiBase = process.env.API_URL ?? "http://localhost:3002";
  let outputUrl: string | null = null;
  if (job.status === "succeeded" && job.outputObjectKey) {
    outputUrl = `${apiBase}/api/public/files/${encodeURIComponent(job.outputObjectKey)}`;
  }

  const shareUrl =
    job.shareToken && job.status === "succeeded"
      ? `${boothPublicUrl()}/share/${job.shareToken}`
      : null;

  return c.json({
    id: job.id,
    status: job.status,
    outputUrl,
    shareUrl,
    shareToken: job.shareToken,
    errorMessage: job.errorMessage,
  });
});

publicRoutes.get("/share/:token", async (c) => {
  const job = await prisma.aiJob.findUnique({
    where: { shareToken: c.req.param("token") },
    include: {
      capture: {
        include: { session: { include: { boothInstance: true } } },
      },
    },
  });
  if (!job || job.status !== "succeeded" || !job.outputObjectKey) {
    return c.json({ error: "Not found" }, 404);
  }

  return c.json({
    outputUrl: fileUrl(job.outputObjectKey),
    boothName: job.capture.session.boothInstance.name,
    retentionDays: job.capture.session.boothInstance.retentionDays,
  });
});

publicRoutes.post("/sessions/:id/print", boothAuth, async (c) => {
  const sessionId = c.get("sessionId");
  if (sessionId !== c.req.param("id")) {
    return c.json({ error: "Forbidden" }, 403);
  }

  const session = await prisma.session.findUnique({
    where: { id: sessionId },
    include: { boothInstance: true },
  });
  if (!session) return c.json({ error: "Not found" }, 404);
  if (!session.boothInstance.enablePrint) {
    return c.json({ error: "Print disabled" }, 400);
  }

  if (!session.selectedCaptureId) {
    return c.json({ error: "Select a photo before printing" }, 400);
  }

  const job = await prisma.aiJob.findFirst({
    where: {
      captureId: session.selectedCaptureId,
      status: "succeeded",
    },
  });
  if (!job?.outputObjectKey) {
    return c.json({ error: "No printable output" }, 400);
  }

  const bridgeUrl =
    session.boothInstance.printBridgeUrl ?? "http://127.0.0.1:39100";
  const printerName = session.boothInstance.windowsPrinterName;
  if (!printerName) {
    return c.json({ error: "Printer not configured for this booth" }, 400);
  }

  const imageUrl = fileUrl(job.outputObjectKey);
  try {
    const res = await fetch(`${bridgeUrl.replace(/\/$/, "")}/print`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ printerName, imageUrl }),
    });
    const body = await res.json().catch(() => ({}));
    if (!res.ok) {
      return c.json(
        { error: (body as { error?: string }).error ?? "Print bridge failed" },
        502
      );
    }
    return c.json({ ok: true });
  } catch {
    return c.json(
      {
        error:
          "Could not reach print bridge. Start it on this PC (pnpm --filter @photobooth/print-bridge dev).",
      },
      502
    );
  }
});

publicRoutes.get("/files/*", async (c) => {
  const key = c.req.path.slice(c.req.path.indexOf("/files/") + "/files/".length);
  if (!key) return c.json({ error: "Not found" }, 404);
  try {
    const data = await getObject(decodeURIComponent(key));
    const contentType = key.endsWith(".png") ? "image/png" : "image/jpeg";
    return new Response(data, {
      headers: {
        "Content-Type": contentType,
        "Cache-Control": "private, max-age=300",
      },
    });
  } catch {
    return c.json({ error: "Not found" }, 404);
  }
});
