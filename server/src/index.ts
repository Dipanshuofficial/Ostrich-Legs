console.log("Starting Ostrich Brain...");
import express from "express";
import { createServer } from "http";
import { Server } from "socket.io";
import cors from "cors";
import { JobQueue } from "./JobQueue";
import { WorkerResult } from "../../shared/types";

const app = express();
app.use(cors());

const httpServer = createServer(app);
const io = new Server(httpServer, {
  cors: { origin: "*", methods: ["GET", "POST"] },
});

const jobQueue = new JobQueue();

// Map<socketId, Set<JobChunkId>>
const activeWorkers = new Map<string, Set<string>>();

io.on("connection", (socket) => {
  console.log(`New Walker Joined: ${socket.id}`);

  if (!activeWorkers.has(socket.id)) {
    activeWorkers.set(socket.id, new Set());
  }

  socket.on("REQUEST_WORK", () => {
    const job = jobQueue.getNextJob();
    if (job) {
      activeWorkers.get(socket.id)?.add(job.id);
      socket.emit("JOB_DISPATCH", job);
    } else {
      socket.emit("NO_WORK");
    }
  });

  // Batch job request for high-throughput scenarios
  socket.on("REQUEST_BATCH", (count: number) => {
    const jobs = [];
    for (let i = 0; i < count; i++) {
      const job = jobQueue.getNextJob();
      if (job) {
        activeWorkers.get(socket.id)?.add(job.id);
        jobs.push(job);
      } else {
        break;
      }
    }
    socket.emit("BATCH_DISPATCH", jobs);
  });

  socket.on("JOB_COMPLETE", (result: WorkerResult) => {
    // 1. Remove from active set
    const workerJobs = activeWorkers.get(socket.id);
    if (workerJobs) workerJobs.delete(result.chunkId);

    // 2. Handle Errors
    if (result.error === "OOM_PREVENTED" || result.error === "CPU_SATURATED") {
      console.warn(`⚠️ Job ${result.chunkId} rejected [${result.error}]`);
      jobQueue.reclaimJob(result.chunkId);
      return;
    }

    if (result.error === "EXECUTION_ERROR") {
      console.error(`❌ Job ${result.chunkId} Failed: ${result.details}`);
      return;
    }

    // 3. Success
    jobQueue.completeJob(result);

    // 4. Auto-Refill
    const pendingCount = jobQueue.queue.filter(
      (j) => j.status === "PENDING",
    ).length;
    if (pendingCount < 50) {
      jobQueue.generateMoreJobs(100);
    }

    // 5. ACK (Triggers client to fetch more)
    socket.emit("WORK_ACK", { chunkId: result.chunkId });
  });

  socket.on("disconnect", () => {
    const lostJobs = activeWorkers.get(socket.id);
    if (lostJobs && lostJobs.size > 0) {
      console.log(
        `Walker ${socket.id} disconnected. Reclaiming ${lostJobs.size} jobs.`,
      );
      lostJobs.forEach((chunkId) => jobQueue.reclaimJob(chunkId));
    }
    activeWorkers.delete(socket.id);
  });
});

try {
  httpServer.listen(3000, () => {
    console.log(`Ostrich Brain running on port: 3000`);
  });
} catch (e) {
  console.error("Failed to start the server:", e);
}
