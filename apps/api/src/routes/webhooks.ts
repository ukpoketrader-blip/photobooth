import { Hono } from "hono";
import { prisma, PaymentStatus, PaymentTransactionStatus } from "@photobooth/db";
import { verifySumUpWebhook } from "../lib/sumup.js";
import { env } from "../lib/env.js";

export const webhookRoutes = new Hono();

webhookRoutes.post("/sumup", async (c) => {
  const rawBody = await c.req.text();
  const signature = c.req.header("x-payload-signature");

  if (!verifySumUpWebhook(rawBody, signature)) {
    return c.json({ error: "Invalid signature" }, 401);
  }

  let payload: {
    event_type?: string;
    checkout_reference?: string;
    merchant_reference?: string;
    status?: string;
    id?: string;
  };

  try {
    payload = JSON.parse(rawBody);
  } catch {
    return c.json({ error: "Invalid JSON" }, 400);
  }

  const ref =
    payload.checkout_reference ??
    payload.merchant_reference ??
    payload.id;

  if (!ref) {
    return c.json({ ok: true, skipped: "no reference" });
  }

  const session = await prisma.session.findUnique({
    where: { id: ref },
    include: { paymentTransaction: true, boothInstance: true },
  });

  if (!session) {
    return c.json({ ok: true, skipped: "session not found" });
  }

  const isPaid =
    payload.status === "PAID" ||
    payload.status === "SUCCESSFUL" ||
    payload.event_type === "checkout.status.updated";

  if (isPaid || env.nodeEnv === "development") {
    await prisma.paymentTransaction.upsert({
      where: { sessionId: session.id },
      create: {
        sessionId: session.id,
        amountMinor: session.boothInstance.paymentAmountMinor,
        currency: session.boothInstance.paymentCurrency,
        status: PaymentTransactionStatus.succeeded,
        sumupTransactionId: payload.id,
        webhookReceivedAt: new Date(),
      },
      update: {
        status: PaymentTransactionStatus.succeeded,
        sumupTransactionId: payload.id ?? undefined,
        webhookReceivedAt: new Date(),
      },
    });

    await prisma.session.update({
      where: { id: session.id },
      data: {
        paymentStatus: PaymentStatus.paid,
        unlockedAt: new Date(),
      },
    });
  }

  return c.json({ ok: true });
});

// Dev-only: simulate payment success
webhookRoutes.post("/sumup/simulate/:sessionId", async (c) => {
  if (env.nodeEnv === "production") {
    return c.json({ error: "Not available" }, 404);
  }

  const sessionId = c.req.param("sessionId");
  const session = await prisma.session.findUnique({
    where: { id: sessionId },
    include: { boothInstance: true },
  });
  if (!session) return c.json({ error: "Not found" }, 404);

  await prisma.paymentTransaction.upsert({
    where: { sessionId },
    create: {
      sessionId,
      amountMinor: session.boothInstance.paymentAmountMinor,
      currency: session.boothInstance.paymentCurrency,
      status: PaymentTransactionStatus.succeeded,
      webhookReceivedAt: new Date(),
    },
    update: {
      status: PaymentTransactionStatus.succeeded,
      webhookReceivedAt: new Date(),
    },
  });

  await prisma.session.update({
    where: { id: sessionId },
    data: { paymentStatus: PaymentStatus.paid, unlockedAt: new Date() },
  });

  return c.json({ ok: true, paymentStatus: "paid" });
});
