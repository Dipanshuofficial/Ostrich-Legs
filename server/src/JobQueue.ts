import { type JobChunk, type WorkerResult } from "../../shared/types";

export class JobQueue {
  public queue: JobChunk[];
  private results: Map<string, any> = new Map();

  constructor() {
    this.queue = [];
    this.generateMoreJobs(50);
  }

  getNextJob(): JobChunk | null {
    const job = this.queue.find((j) => j.status === "PENDING");
    if (job) {
      job.status = "ASSIGNED";
      return job;
    }
    return null;
  }

  completeJob(result: WorkerResult) {
    this.results.set(result.chunkId, result.result);
    const job = this.queue.find((j) => j.id === result.chunkId);
    if (job) job.status = "COMPLETED";
  }

  reclaimJob(chunkId: string) {
    const job = this.queue.find((j) => j.id === chunkId);
    if (job) {
      // console.log(`Reclaiming ${job.type} chunk ${chunkId}`);
      job.status = "PENDING";
    }
  }

  /**
   * GENERATOR 1: Matrix Multiplication (Lightweight Mode)
   * Fix: Send { size: 300 } instead of the full matrix data.
   * This prevents the 1MB Socket.IO limit from killing the connection.
   */
  private generateMatrixBatch(count: number) {
    const size = 300; // Keep the heavy compute size

    for (let i = 0; i < count; i++) {
      this.queue.push({
        id: `mx_${Date.now()}_${i}`,
        createdAt: Date.now(),
        type: "MAT_MUL",
        // CRITICAL CHANGE: Send metadata, not the full matrix
        data: {
          size: size,
        },
        status: "PENDING",
      });
    }
  }
  /**
   * GENERATOR 2: CPU Stress (Maintenance)
   */
  private generateStressBatch(count: number) {
    for (let i = 0; i < count; i++) {
      this.queue.push({
        id: `stress_${Date.now()}_${i}`,
        createdAt: Date.now(),
        type: "MATH_STRESS",
        data: [4000000], // 4 Million iterations
        status: "PENDING",
      });
    }
  }

  generateMoreJobs(count: number) {
    // 50/50 Split
    if (Math.random() > 0.5) {
      console.log(`Generating ${count} Matrix/ML Jobs...`);
      this.generateMatrixBatch(count);
    } else {
      console.log(`Generating ${count} Stress Jobs...`);
      this.generateStressBatch(count);
    }
  }
}
