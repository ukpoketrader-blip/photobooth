import { Queue } from "bullmq";
import { env } from "./env.js";

const connection = { url: env.redisUrl };

export const AI_JOB_QUEUE = "ai-jobs";

export const aiJobQueue = new Queue(AI_JOB_QUEUE, {
  connection,
  defaultJobOptions: {
    attempts: 3,
    backoff: { type: "exponential", delay: 5000 },
    removeOnComplete: 1000,
    removeOnFail: 5000,
  },
});

export async function enqueueAiJob(aiJobId: string) {
  await aiJobQueue.add("process", { aiJobId }, { jobId: aiJobId });
}
