import { SwarmCoordinator } from "./SwarmCoordinator.js";
import { type JobChunk, SwarmRunState } from "../../../shared/types.js";

export class JobGenerator {
  private coordinator: SwarmCoordinator;
  private interval: NodeJS.Timeout | null = null;

  constructor(coordinator: SwarmCoordinator) {
    this.coordinator = coordinator;

    this.coordinator.stateStore.on("change", (snapshot) => {
      if (snapshot.runState === SwarmRunState.RUNNING) {
        this.start();
      } else {
        this.stop();
      }
    });
  }

  private start() {
    if (this.interval) return;
    console.log("[Generator] Swarm RUNNING -> Starting heavy job stream...");

    this.fillQueue();

    this.interval = setInterval(() => {
      this.fillQueue();
    }, 2000); // Check every 2 seconds (Slower check is fine)
  }

  private stop() {
    if (this.interval) {
      clearInterval(this.interval);
      this.interval = null;
      console.log("[Generator] Swarm STOPPED -> Pausing job stream.");
    }
  }

  private fillQueue() {
    const metrics = this.coordinator.scheduler.getMetrics();

    // INCREASED BUFFER: Keep 2000 jobs pending to prevent starvation
    if (metrics.pendingJobs < 2000) {
      const batchSize = 200; // Generate big batches
      const jobs: JobChunk[] = [];

      for (let i = 0; i < batchSize; i++) {
        const isMatrix = Math.random() > 0.5;
        jobs.push({
          id: `job-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`,
          type: isMatrix ? "MAT_MUL" : "MATH_STRESS",
          data: isMatrix ? { size: 300 } : { iterations: 5000000 },
          status: "PENDING",
          createdAt: Date.now(),
        });
      }

      this.coordinator.submitBatch(jobs);
    }
  }
}
