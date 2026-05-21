import { Job, Worker } from "bullmq";
import { prisma, AiJobStatus, CaptureStatus } from "@photobooth/db";
import {
  getObject,
  putObject,
  applyImageFilter,
  compositeWithFrame,
  normalizeToPrintSize,
} from "@photobooth/services";

const redisUrl = process.env.REDIS_URL ?? "redis://localhost:6379";

export async function processAiJob(aiJobId: string) {
  const start = Date.now();
  const job = await prisma.aiJob.findUnique({
    where: { id: aiJobId },
    include: {
      filterPreset: true,
      capture: {
        include: {
          session: {
            include: {
              boothInstance: { include: { frameAsset: true } },
            },
          },
        },
      },
    },
  });

  if (!job) throw new Error(`Job ${aiJobId} not found`);

  await prisma.aiJob.update({
    where: { id: aiJobId },
    data: { status: AiJobStatus.running },
  });

  try {
    const original = await getObject(job.capture.originalObjectKey);
    let styled = await applyImageFilter(
      original,
      "image/jpeg",
      job.filterPreset.promptTemplate,
      job.filterPreset.negativePrompt
    );
    styled = await normalizeToPrintSize(styled);

    const instance = job.capture.session.boothInstance;
    const styledKey = `captures/${instance.id}/${job.capture.sessionId}/styled-${aiJobId}.jpg`;
    await putObject(styledKey, styled);

    let outputBuffer: Buffer = styled;

    if (instance.frameEnabled && instance.frameAsset) {
      const overlay = await getObject(instance.frameAsset.overlayObjectKey);
      const fa = instance.frameAsset;
      outputBuffer = await compositeWithFrame(styled, overlay, {
        canvasWidth: fa.canvasWidth,
        canvasHeight: fa.canvasHeight,
        photoInsetX: fa.photoInsetX,
        photoInsetY: fa.photoInsetY,
        photoInsetW: fa.photoInsetW,
        photoInsetH: fa.photoInsetH,
      });
    }

    outputBuffer = await normalizeToPrintSize(outputBuffer);
    const outputKey = `captures/${instance.id}/${job.capture.sessionId}/final-${aiJobId}.jpg`;
    await putObject(outputKey, outputBuffer);

    await prisma.aiJob.update({
      where: { id: aiJobId },
      data: {
        status: AiJobStatus.succeeded,
        styledObjectKey: styledKey,
        outputObjectKey: outputKey,
        latencyMs: Date.now() - start,
        completedAt: new Date(),
      },
    });

    await prisma.capture.update({
      where: { id: job.captureId },
      data: { status: CaptureStatus.complete },
    });
  } catch (err) {
    let message = err instanceof Error ? err.message : "Unknown error";
    if (message.includes("ENOENT")) {
      message =
        "Photo file not found. Ensure api has api-volume at /data/uploads and worker has API_URL=https://api.eventlab.uk.";
    }
    if (message.includes("fetch failed") || message.includes("Cannot reach API")) {
      message =
        "Worker cannot reach the API. On worker set API_URL=https://api.eventlab.uk (not localhost), redeploy api+worker, and set the same WORKER_STORAGE_SECRET on both.";
    }
    await prisma.aiJob.update({
      where: { id: aiJobId },
      data: {
        status: AiJobStatus.failed,
        errorMessage: message,
        completedAt: new Date(),
      },
    });
    await prisma.capture.update({
      where: { id: job.captureId },
      data: { status: CaptureStatus.failed },
    });
    throw err;
  }
}

export function startWorker() {
  const worker = new Worker(
    "ai-jobs",
    async (job: Job<{ aiJobId: string }>) => {
      await processAiJob(job.data.aiJobId);
    },
    { connection: { url: redisUrl }, concurrency: 3 }
  );

  worker.on("failed", (job, err) => {
    console.error(`Job ${job?.id} failed:`, err.message);
  });

  const apiUrl = process.env.API_URL?.trim();
  console.log("AI job worker started", {
    apiUrl: apiUrl || "(missing — set API_URL on worker)",
    storageMirror: process.env.STORAGE_MIRROR_TO_API === "true",
  });
  return worker;
}
