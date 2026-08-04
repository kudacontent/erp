import { Queue, Worker } from "bullmq";
import IORedis from "ioredis";

const connection = new IORedis(process.env.REDIS_URL ?? "redis://localhost:6379", {
  maxRetriesPerRequest: null
});

export const erpQueue = new Queue("erp-jobs", { connection });

const worker = new Worker(
  "erp-jobs",
  async (job) => {
    if (job.name === "daily-management-report") {
      console.log("Daily management report job placeholder", job.data);
      return { ok: true };
    }

    if (job.name === "ocr") {
      console.log("OCR job placeholder", job.data);
      return { ok: true };
    }

    console.log("Unknown job", job.name, job.data);
    return { ok: true };
  },
  { connection }
);

worker.on("completed", (job) => {
  console.log(`Job completed: ${job.id} ${job.name}`);
});

worker.on("failed", (job, error) => {
  console.error(`Job failed: ${job?.id} ${job?.name}`, error);
});
