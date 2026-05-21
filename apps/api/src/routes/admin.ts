import { Hono } from "hono";
import { prisma } from "@photobooth/db";
import {
  createBoothInstanceSchema,
  updateBoothInstanceSchema,
  createFilterPresetSchema,
  updateFilterPresetSchema,
  createFrameAssetSchema,
  loginSchema,
} from "@photobooth/shared";
import {
  adminAuth,
  createAdminToken,
  loginAdmin,
  type AdminUser,
} from "../middleware/auth.js";
import {
  generateApiSecret,
  hashSecret,
  verifySecret,
} from "../lib/crypto.js";
import { logAudit } from "../lib/audit.js";
import { putObject, getObject, compositeWithFrame } from "@photobooth/services";
import { MAX_FRAME_BYTES } from "@photobooth/shared";

export const adminRoutes = new Hono();

adminRoutes.post("/auth/login", async (c) => {
  const body = loginSchema.parse(await c.req.json());
  const user = await loginAdmin(body.email, body.password);
  if (!user) return c.json({ error: "Invalid credentials" }, 401);
  const token = await createAdminToken(user);
  return c.json({ token, user: { id: user.id, email: user.email, organisationId: user.organisationId } });
});

adminRoutes.use("/*", adminAuth);

adminRoutes.get("/me", async (c) => {
  const user = c.get("user");
  const org = await prisma.organisation.findUnique({
    where: { id: user.organisationId },
  });
  return c.json({ user, organisation: org });
});

adminRoutes.get("/booth-instances", async (c) => {
  const user = c.get("user");
  const instances = await prisma.boothInstance.findMany({
    where: { organisationId: user.organisationId },
    include: {
      filterPresets: {
        where: { isActive: true },
        orderBy: { sortOrder: "asc" },
      },
      frameAsset: true,
      _count: { select: { sessions: true } },
    },
    orderBy: { createdAt: "desc" },
  });
  return c.json(instances);
});

adminRoutes.post("/booth-instances", async (c) => {
  const user = c.get("user");
  const body = createBoothInstanceSchema.parse(await c.req.json());
  const secret = generateApiSecret();

  const instance = await prisma.boothInstance.create({
    data: {
      organisationId: user.organisationId,
      name: body.name,
      slug: body.slug,
      apiSecretHash: hashSecret(secret),
      primaryColor: body.primaryColor,
      secondaryColor: body.secondaryColor,
      retentionDays: body.retentionDays,
      paymentEnabled: body.paymentEnabled,
      paymentAmountMinor: body.paymentAmountMinor,
      paymentCurrency: body.paymentCurrency,
      sumupReaderId: body.sumupReaderId ?? undefined,
      frameEnabled: body.frameEnabled,
      frameAssetId: body.frameAssetId ?? undefined,
      privacyNoticeHtml: body.privacyNoticeHtml,
    },
  });

  await logAudit({
    organisationId: user.organisationId,
    boothInstanceId: instance.id,
    actorEmail: user.email,
    action: "booth_instance.created",
    resourceType: "BoothInstance",
    resourceId: instance.id,
  });

  return c.json({ instance, apiSecret: secret });
});

adminRoutes.patch("/booth-instances/:id", async (c) => {
  const user = c.get("user");
  const body = updateBoothInstanceSchema.parse(await c.req.json());
  const existing = await prisma.boothInstance.findFirst({
    where: { id: c.req.param("id"), organisationId: user.organisationId },
  });
  if (!existing) return c.json({ error: "Not found" }, 404);

  const instance = await prisma.boothInstance.update({
    where: { id: existing.id },
    data: body,
  });

  await logAudit({
    organisationId: user.organisationId,
    boothInstanceId: instance.id,
    actorEmail: user.email,
    action: "booth_instance.updated",
    resourceType: "BoothInstance",
    resourceId: instance.id,
    metadata: body,
  });

  return c.json(instance);
});

adminRoutes.post("/booth-instances/:id/rotate-secret", async (c) => {
  const user = c.get("user");
  const existing = await prisma.boothInstance.findFirst({
    where: { id: c.req.param("id"), organisationId: user.organisationId },
  });
  if (!existing) return c.json({ error: "Not found" }, 404);

  const secret = generateApiSecret();
  await prisma.boothInstance.update({
    where: { id: existing.id },
    data: { apiSecretHash: hashSecret(secret) },
  });

  await logAudit({
    organisationId: user.organisationId,
    boothInstanceId: existing.id,
    actorEmail: user.email,
    action: "booth_instance.secret_rotated",
    resourceType: "BoothInstance",
    resourceId: existing.id,
  });

  return c.json({ apiSecret: secret });
});

adminRoutes.post("/booth-instances/:id/filter-presets", async (c) => {
  const user = c.get("user");
  const body = createFilterPresetSchema.parse(await c.req.json());
  const instance = await prisma.boothInstance.findFirst({
    where: { id: c.req.param("id"), organisationId: user.organisationId },
  });
  if (!instance) return c.json({ error: "Not found" }, 404);

  if (body.isDefault) {
    await prisma.filterPreset.updateMany({
      where: { boothInstanceId: instance.id },
      data: { isDefault: false },
    });
  }

  const preset = await prisma.filterPreset.create({
    data: { boothInstanceId: instance.id, ...body },
  });
  return c.json(preset);
});

adminRoutes.patch("/filter-presets/:id", async (c) => {
  const user = c.get("user");
  const body = updateFilterPresetSchema.parse(await c.req.json());
  const preset = await prisma.filterPreset.findFirst({
    where: { id: c.req.param("id"), isActive: true },
    include: { boothInstance: true },
  });
  if (!preset || preset.boothInstance.organisationId !== user.organisationId) {
    return c.json({ error: "Not found" }, 404);
  }

  if (body.isDefault) {
    await prisma.filterPreset.updateMany({
      where: { boothInstanceId: preset.boothInstanceId },
      data: { isDefault: false },
    });
  }

  const updated = await prisma.filterPreset.update({
    where: { id: preset.id },
    data: body,
  });

  await logAudit({
    organisationId: user.organisationId,
    boothInstanceId: preset.boothInstanceId,
    actorEmail: user.email,
    action: "filter_preset.updated",
    resourceType: "FilterPreset",
    resourceId: preset.id,
    metadata: { name: updated.name },
  });

  return c.json(updated);
});

adminRoutes.delete("/filter-presets/:id", async (c) => {
  const user = c.get("user");
  const preset = await prisma.filterPreset.findFirst({
    where: { id: c.req.param("id"), isActive: true },
    include: { boothInstance: true },
  });
  if (!preset || preset.boothInstance.organisationId !== user.organisationId) {
    return c.json({ error: "Not found" }, 404);
  }

  const activeCount = await prisma.filterPreset.count({
    where: { boothInstanceId: preset.boothInstanceId, isActive: true },
  });
  if (activeCount <= 1) {
    return c.json(
      { error: "Each booth must keep at least one active filter" },
      400
    );
  }

  if (preset.isDefault) {
    const nextDefault = await prisma.filterPreset.findFirst({
      where: {
        boothInstanceId: preset.boothInstanceId,
        isActive: true,
        id: { not: preset.id },
      },
      orderBy: [{ sortOrder: "asc" }, { createdAt: "asc" }],
    });
    if (nextDefault) {
      await prisma.filterPreset.update({
        where: { id: nextDefault.id },
        data: { isDefault: true },
      });
    }
  }

  await prisma.filterPreset.update({
    where: { id: preset.id },
    data: { isActive: false, isDefault: false },
  });

  await logAudit({
    organisationId: user.organisationId,
    boothInstanceId: preset.boothInstanceId,
    actorEmail: user.email,
    action: "filter_preset.deleted",
    resourceType: "FilterPreset",
    resourceId: preset.id,
    metadata: { name: preset.name },
  });

  return c.json({ ok: true });
});

adminRoutes.get("/frame-assets", async (c) => {
  const user = c.get("user");
  const assets = await prisma.frameAsset.findMany({
    where: { organisationId: user.organisationId, isActive: true },
    orderBy: { createdAt: "desc" },
  });
  return c.json(assets);
});

adminRoutes.post("/frame-assets", async (c) => {
  const user = c.get("user");
  const form = await c.req.parseBody();
  const metaRaw = form["metadata"];
  if (!metaRaw || typeof metaRaw === "string") {
    return c.json({ error: "metadata required" }, 400);
  }
  const meta = createFrameAssetSchema.parse(JSON.parse(metaRaw));
  const file = form["overlay"];
  if (!file || typeof file === "string") {
    return c.json({ error: "overlay PNG required" }, 400);
  }

  const buf = Buffer.from(await (file as File).arrayBuffer());
  if (buf.length > MAX_FRAME_BYTES) {
    return c.json({ error: "Frame too large (max 5MB)" }, 400);
  }

  const key = `frames/${user.organisationId}/${Date.now()}.png`;
  await putObject(key, buf, "image/png");

  const asset = await prisma.frameAsset.create({
    data: {
      organisationId: user.organisationId,
      name: meta.name,
      overlayObjectKey: key,
      canvasWidth: meta.canvasWidth,
      canvasHeight: meta.canvasHeight,
      photoInsetX: meta.photoInsetX,
      photoInsetY: meta.photoInsetY,
      photoInsetW: meta.photoInsetW,
      photoInsetH: meta.photoInsetH,
    },
  });

  return c.json(asset);
});

adminRoutes.post("/booth-instances/:id/frame-preview", async (c) => {
  const user = c.get("user");
  const instance = await prisma.boothInstance.findFirst({
    where: { id: c.req.param("id"), organisationId: user.organisationId },
    include: { frameAsset: true },
  });
  if (!instance?.frameAsset) {
    return c.json({ error: "No frame configured" }, 400);
  }

  const form = await c.req.parseBody();
  const file = form["sampleImage"];
  if (!file || typeof file === "string") {
    return c.json({ error: "sampleImage required" }, 400);
  }

  const sample = Buffer.from(await (file as File).arrayBuffer());
  const overlay = await getObject(instance.frameAsset.overlayObjectKey);
  const fa = instance.frameAsset;

  const composited = await compositeWithFrame(sample, overlay, {
    canvasWidth: fa.canvasWidth,
    canvasHeight: fa.canvasHeight,
    photoInsetX: fa.photoInsetX,
    photoInsetY: fa.photoInsetY,
    photoInsetW: fa.photoInsetW,
    photoInsetH: fa.photoInsetH,
  });

  return new Response(composited, {
    headers: { "Content-Type": "image/jpeg" },
  });
});

adminRoutes.get("/sessions", async (c) => {
  const user = c.get("user");
  const boothInstanceId = c.req.query("boothInstanceId");
  const sessions = await prisma.session.findMany({
    where: {
      boothInstance: {
        organisationId: user.organisationId,
        ...(boothInstanceId ? { id: boothInstanceId } : {}),
      },
    },
    include: {
      paymentTransaction: true,
      captures: { include: { aiJob: true } },
      boothInstance: { select: { name: true, slug: true } },
    },
    orderBy: { createdAt: "desc" },
    take: 100,
  });
  return c.json(sessions);
});

adminRoutes.delete("/sessions/:id", async (c) => {
  const user = c.get("user");
  const session = await prisma.session.findFirst({
    where: { id: c.req.param("id") },
    include: {
      boothInstance: true,
      captures: { include: { aiJob: true } },
    },
  });
  if (!session || session.boothInstance.organisationId !== user.organisationId) {
    return c.json({ error: "Not found" }, 404);
  }

  const { deleteObject } = await import("@photobooth/services");
  for (const cap of session.captures) {
    await deleteObject(cap.originalObjectKey).catch(() => {});
    if (cap.aiJob?.styledObjectKey) await deleteObject(cap.aiJob.styledObjectKey).catch(() => {});
    if (cap.aiJob?.outputObjectKey) await deleteObject(cap.aiJob.outputObjectKey).catch(() => {});
  }

  await prisma.session.delete({ where: { id: session.id } });

  await logAudit({
    organisationId: user.organisationId,
    boothInstanceId: session.boothInstanceId,
    actorEmail: user.email,
    action: "session.erased",
    resourceType: "Session",
    resourceId: session.id,
  });

  return c.json({ ok: true });
});

adminRoutes.get("/payments/report", async (c) => {
  const user = c.get("user");
  const from = c.req.query("from");
  const to = c.req.query("to");

  const transactions = await prisma.paymentTransaction.findMany({
    where: {
      status: "succeeded",
      session: {
        boothInstance: { organisationId: user.organisationId },
      },
      ...(from || to
        ? {
            createdAt: {
              ...(from ? { gte: new Date(from) } : {}),
              ...(to ? { lte: new Date(to) } : {}),
            },
          }
        : {}),
    },
    include: {
      session: { include: { boothInstance: { select: { name: true, slug: true } } } },
    },
    orderBy: { createdAt: "desc" },
  });

  const totalMinor = transactions.reduce((s, t) => s + t.amountMinor, 0);

  return c.json({
    count: transactions.length,
    totalMinor,
    totalDisplay: `£${(totalMinor / 100).toFixed(2)}`,
    transactions,
  });
});

adminRoutes.patch("/organisation/sumup", async (c) => {
  const user = c.get("user");
  const body = await c.req.json<{
    sumupAccessToken?: string;
    sumupMerchantCode?: string;
  }>();

  const org = await prisma.organisation.update({
    where: { id: user.organisationId },
    data: {
      sumupAccessToken: body.sumupAccessToken,
      sumupMerchantCode: body.sumupMerchantCode,
      sumupConnectedAt: body.sumupAccessToken ? new Date() : null,
    },
  });

  return c.json({
    sumupConnected: !!org.sumupAccessToken,
    sumupMerchantCode: org.sumupMerchantCode,
  });
});

// Export verifySecret for tests
export { verifySecret };
