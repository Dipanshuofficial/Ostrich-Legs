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
  private JOB_TIMEOUT = 60000; // 60 seconds
  private MAX_RETRIES = 3;

  constructor() {
    super();
    this.startReaper();
  }

  public submitJob(job: JobChunk): void {
    job.createdAt = Date.now();
    job.status = "PENDING";
    this.jobQueue.push(job);
    this.emit("jobSubmitted", job);
  }

  public submitBatch(jobs: JobChunk[]): void {
    const now = Date.now();
    jobs.forEach((job) => {
      job.createdAt = now;
      job.status = "PENDING";
    });
    this.jobQueue.push(...jobs);
    this.emit("batchSubmitted", jobs);
  }

  public getBatch(
    deviceId: string,
    count: number,
    // capabilities could be used here to filter job types
  ): JobChunk[] {
    const jobs: JobChunk[] = [];
    let remaining = count;

    // Simple FIFO with status check
    for (let i = 0; i < this.jobQueue.length && remaining > 0; i++) {
      const job = this.jobQueue[i];
      if (job.status === "PENDING") {
        job.status = "ASSIGNED";
        job.assignedTo = deviceId;
        job.assignedAt = Date.now();

        this.assignments.set(job.id, {
          jobId: job.id,
          deviceId,
          assignedAt: job.assignedAt!,
          expiresAt: Date.now() + this.JOB_TIMEOUT,
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

  public completeJob(result: WorkerResult): boolean {
    const assignment = this.assignments.get(result.chunkId);

    if (!assignment) return false;

    if (result.error) {
      return this.handleFailure(result);
    }

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
      const job = this.jobQueue.find((j) => j.id === jobId);
      if (job) job.status = "COMPLETED"; // Mark done to remove from queue effectively

      this.failedJobs.set(jobId, { error: result.error!, retries: retryCount });
      this.assignments.delete(jobId);
      this.emit("jobFailed", result, retryCount);
      return true;
    }

    const job = this.jobQueue.find((j) => j.id === jobId);
    if (job) {
      job.status = "PENDING";
      job.assignedTo = undefined;
    }

    this.failedJobs.set(jobId, { error: result.error!, retries: retryCount });
    this.assignments.delete(jobId);
    return false;
  }

  public getMetrics(): QueueMetrics {
    const pending = this.jobQueue.filter((j) => j.status === "PENDING");
    const assigned = this.jobQueue.filter((j) => j.status === "ASSIGNED");

    // Count by type
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
      avgWaitTime: 0, // Simplified
      jobsByType,
    };
  }

  public flush(): void {
    const pending = this.jobQueue.filter((j) => j.status === "PENDING");
    pending.forEach((job) => {
      job.status = "COMPLETED"; // Or delete
    });
    // In a real scenario, we might clear the array, but this marks them as done
    this.jobQueue = this.jobQueue.filter((j) => j.status !== "PENDING");
  }

  private startReaper(): void {
    setInterval(() => {
      const now = Date.now();
      for (const [jobId, assignment] of this.assignments.entries()) {
        if (now > assignment.expiresAt) {
          const job = this.jobQueue.find((j) => j.id === jobId);
          if (job) {
            job.status = "PENDING";
            job.assignedTo = undefined;
          }
          this.assignments.delete(jobId);
        }
      }
    }, 5000);
  }

  private cleanupCompletedJobs(): void {
    if (this.completedJobs.size > 1000) {
      this.jobQueue = this.jobQueue.filter((j) => j.status !== "COMPLETED");
      this.completedJobs.clear();
    }
  }
}
