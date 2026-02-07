import {
  type JobChunk,
  type WorkerResult,
  type JobType,
} from "../../../shared/types";
import { EventEmitter } from "events";

interface QueueMetrics {
  totalJobs: number;
  pendingJobs: number;
  assignedJobs: number;
  avgWaitTime: number;
  jobsByType: Record<JobType, number>;
}

interface AssignmentRecord {
  jobId: string;
  deviceId: string;
  assignedAt: number;
  expiresAt: number;
  retryCount: number;
}

export class WorkStealingScheduler extends EventEmitter {
  private jobQueue: JobChunk[] = [];
  private assignments = new Map<string, AssignmentRecord>();
  private completedJobs = new Set<string>();
  private failedJobs = new Map<string, { error: string; retries: number }>();

  // Configuration
  private readonly JOB_TIMEOUT = 60000; // 60 seconds
  private readonly MAX_RETRIES = 3;
  private readonly STEAL_THRESHOLD = 5; // Steal if device has 5+ jobs pending
  private readonly STEAL_BATCH_SIZE = 3;

  constructor() {
    super();
    this.startReaper();
  }

  submitJob(job: JobChunk): void {
    job.createdAt = Date.now();
    job.status = "PENDING";
    this.jobQueue.push(job);
    this.emit("jobSubmitted", job);
  }

  submitBatch(jobs: JobChunk[]): void {
    const now = Date.now();
    jobs.forEach((job) => {
      job.createdAt = now;
      job.status = "PENDING";
    });
    this.jobQueue.push(...jobs);
    this.emit("batchSubmitted", jobs);
  }

  getNextJob(deviceId: string, capabilities?: JobType[]): JobChunk | null {
    // Find first compatible job
    const index = this.jobQueue.findIndex(
      (job) =>
        job.status === "PENDING" &&
        (!capabilities || capabilities.includes(job.type)),
    );

    if (index === -1) return null;

    const job = this.jobQueue[index];
    job.status = "ASSIGNED";
    job.assignedTo = deviceId;
    job.assignedAt = Date.now();

    // Track assignment
    this.assignments.set(job.id, {
      jobId: job.id,
      deviceId,
      assignedAt: job.assignedAt,
      expiresAt: job.assignedAt + this.JOB_TIMEOUT,
      retryCount: this.failedJobs.get(job.id)?.retries || 0,
    });

    this.emit("jobAssigned", job, deviceId);
    return job;
  }

  getBatch(
    deviceId: string,
    count: number,
    capabilities?: JobType[],
  ): JobChunk[] {
    const jobs: JobChunk[] = [];
    let remaining = count;

    for (let i = 0; i < this.jobQueue.length && remaining > 0; i++) {
      const job = this.jobQueue[i];
      if (
        job.status === "PENDING" &&
        (!capabilities || capabilities.includes(job.type))
      ) {
        job.status = "ASSIGNED";
        job.assignedTo = deviceId;
        job.assignedAt = Date.now();

        this.assignments.set(job.id, {
          jobId: job.id,
          deviceId,
          assignedAt: job.assignedAt,
          expiresAt: job.assignedAt + this.JOB_TIMEOUT,
          retryCount: this.failedJobs.get(job.id)?.retries || 0,
        });

        jobs.push(job);
        remaining--;
      }
    }

    if (jobs.length > 0) {
      this.emit("batchAssigned", jobs, deviceId);
    }

    return jobs;
  }

  completeJob(result: WorkerResult): boolean {
    const assignment = this.assignments.get(result.chunkId);

    if (!assignment) {
      console.warn(`[Scheduler] Completion for unknown job: ${result.chunkId}`);
      return false;
    }

    if (result.error) {
      // Handle failure
      return this.handleFailure(result);
    }

    // Success - mark as completed
    const job = this.jobQueue.find((j) => j.id === result.chunkId);
    if (job) {
      job.status = "COMPLETED";
    }

    this.completedJobs.add(result.chunkId);
    this.assignments.delete(result.chunkId);
    this.failedJobs.delete(result.chunkId);

    this.emit("jobCompleted", result);
    this.cleanupCompletedJobs();

    return true;
  }

  private handleFailure(result: WorkerResult): boolean {
    const jobId = result.chunkId;
    const currentFails = this.failedJobs.get(jobId);
    const retryCount = (currentFails?.retries || 0) + 1;

    if (retryCount >= this.MAX_RETRIES) {
      // Max retries reached - permanently fail
      const job = this.jobQueue.find((j) => j.id === jobId);
      if (job) {
        job.status = "COMPLETED"; // Mark as completed to remove from queue
      }

      this.failedJobs.set(jobId, {
        error: result.error!,
        retries: retryCount,
      });
      this.assignments.delete(jobId);

      this.emit("jobFailed", result, retryCount);
      return true;
    }

    // Retry - reset to pending
    const job = this.jobQueue.find((j) => j.id === jobId);
    if (job) {
      job.status = "PENDING";
      job.assignedTo = undefined;
      job.assignedAt = undefined;
    }

    this.failedJobs.set(jobId, {
      error: result.error!,
      retries: retryCount,
    });
    this.assignments.delete(jobId);

    this.emit("jobRetry", result, retryCount);
    return false;
  }

  // Work Stealing - called when a device is idle but has no work
  stealWork(
    thiefId: string,
    maxJobs: number = this.STEAL_BATCH_SIZE,
  ): JobChunk[] {
    // Find jobs assigned to busy devices that can be stolen
    const stealable: JobChunk[] = [];

    for (const [jobId, assignment] of this.assignments.entries()) {
      if (
        assignment.deviceId !== thiefId &&
        Date.now() - assignment.assignedAt > 5000
      ) {
        // Only steal jobs assigned >5s ago
        const job = this.jobQueue.find((j) => j.id === jobId);
        if (job && job.status === "ASSIGNED") {
          stealable.push(job);
        }
      }

      if (stealable.length >= maxJobs) break;
    }

    // Reassign stolen jobs
    stealable.forEach((job) => {
      const oldDevice = this.assignments.get(job.id)?.deviceId;

      job.assignedTo = thiefId;
      job.assignedAt = Date.now();

      this.assignments.set(job.id, {
        jobId: job.id,
        deviceId: thiefId,
        assignedAt: job.assignedAt,
        expiresAt: job.assignedAt + this.JOB_TIMEOUT,
        retryCount: this.assignments.get(job.id)?.retryCount || 0,
      });

      this.emit("workStolen", job, oldDevice, thiefId);
    });

    return stealable;
  }

  // Check if a device should offer work to steal
  shouldOfferWork(deviceId: string): boolean {
    const deviceJobs = Array.from(this.assignments.values()).filter(
      (a) => a.deviceId === deviceId,
    ).length;

    return deviceJobs >= this.STEAL_THRESHOLD;
  }

  getWorkForDevice(deviceId: string): JobChunk[] {
    return this.jobQueue.filter(
      (job) => job.assignedTo === deviceId && job.status === "ASSIGNED",
    );
  }

  // Metrics
  getMetrics(): QueueMetrics {
    const now = Date.now();
    const pending = this.jobQueue.filter((j) => j.status === "PENDING");
    const assigned = this.jobQueue.filter((j) => j.status === "ASSIGNED");

    const waitTimes = pending
      .filter((j) => j.createdAt)
      .map((j) => now - j.createdAt);

    const jobsByType = this.jobQueue.reduce(
      (acc, job) => {
        acc[job.type] = (acc[job.type] || 0) + 1;
        return acc;
      },
      {} as Record<JobType, number>,
    );

    return {
      totalJobs: this.jobQueue.length,
      pendingJobs: pending.length,
      assignedJobs: assigned.length,
      avgWaitTime:
        waitTimes.length > 0
          ? waitTimes.reduce((a, b) => a + b, 0) / waitTimes.length
          : 0,
      jobsByType,
    };
  }

  getPendingCount(): number {
    return this.jobQueue.filter((j) => j.status === "PENDING").length;
  }

  getAssignedCount(): number {
    return this.assignments.size;
  }

  getFailedCount(): number {
    return this.failedJobs.size;
  }

  // Reaper - handles timeouts and cleanup
  private startReaper(): void {
    setInterval(() => {
      const now = Date.now();

      // Check for timed out assignments
      for (const [jobId, assignment] of this.assignments.entries()) {
        if (now > assignment.expiresAt) {
          console.log(`[Scheduler] Job ${jobId} timed out, retrying...`);

          const job = this.jobQueue.find((j) => j.id === jobId);
          if (job) {
            job.status = "PENDING";
            job.assignedTo = undefined;
            job.assignedAt = undefined;
          }

          this.assignments.delete(jobId);
          this.emit("jobTimeout", jobId);
        }
      }
    }, 5000); // Check every 5 seconds
  }

  private cleanupCompletedJobs(): void {
    // Keep only last 1000 completed jobs to prevent memory bloat
    if (this.completedJobs.size > 1000) {
      const toDelete = Array.from(this.completedJobs).slice(
        0,
        this.completedJobs.size - 1000,
      );
      toDelete.forEach((id) => {
        this.completedJobs.delete(id);
        const index = this.jobQueue.findIndex((j) => j.id === id);
        if (index !== -1) {
          this.jobQueue.splice(index, 1);
        }
      });
    }
  }

  // Emergency flush - clear all pending jobs
  flush(): JobChunk[] {
    const pending = this.jobQueue.filter((j) => j.status === "PENDING");
    pending.forEach((job) => {
      job.status = "COMPLETED";
      this.emit("jobFlushed", job);
    });
    return pending;
  }

  dispose(): void {
    this.jobQueue = [];
    this.assignments.clear();
    this.completedJobs.clear();
    this.failedJobs.clear();
    this.removeAllListeners();
  }
}
