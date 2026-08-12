import { Queue, Worker } from "bullmq";
import IORedis from "ioredis";
import { prisma } from "@/lib/prisma";
import { isGoogleCalendarConfigured, syncGoogleCalendar } from "@/lib/google-calendar";

const connection = new IORedis(process.env.REDIS_URL ?? "redis://localhost:6379", {
  maxRetriesPerRequest: null
});

export const erpQueue = new Queue("erp-jobs", { connection });

void erpQueue.add(
  "google-calendar-sync",
  {},
  {
    repeat: { every: 15 * 60 * 1000 },
    removeOnComplete: 20,
    removeOnFail: 20
  }
).catch((error) => {
  console.error("Failed to schedule Google Calendar sync", error);
});

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

    if (job.name === "google-calendar-sync") {
      if (!isGoogleCalendarConfigured()) {
        return { ok: true, skipped: true, reason: "not-configured" };
      }

      const connectionRecord = await prisma.googleCalendarConnection.findUnique({ where: { id: "primary" } });
      if (!connectionRecord) {
        return { ok: true, skipped: true, reason: "not-connected" };
      }

      try {
        return await syncGoogleCalendar();
      } catch (error) {
        console.error("Google Calendar sync failed", error);
        return { ok: false, skipped: false };
      }
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
