import { SwarmCoordinator } from "./SwarmCoordinator.js";
import { type JobChunk, SwarmRunState } from "../../../shared/types.js";

export class JobGenerator {
  // Explicit property declarations required for Erasable Syntax
  private coordinator: SwarmCoordinator;
  private interval: NodeJS.Timeout | null = null;

  constructor(coordinator: SwarmCoordinator) {
    this.coordinator = coordinator; // Explicit assignment

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
    console.log("[Generator] Swarm RUNNING -> Starting job stream...");

    this.fillQueue();

    this.interval = setInterval(() => {
      this.fillQueue();
    }, 1000);
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

    if (metrics.pendingJobs < 100) {
      const batchSize = 50;
      const jobs: JobChunk[] = [];

      for (let i = 0; i < batchSize; i++) {
        jobs.push({
          id: `job-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`,
          type: Math.random() > 0.5 ? "MAT_MUL" : "MATH_STRESS",
          data: { size: 30, iterations: 50000 },
          status: "PENDING",
          createdAt: Date.now(),
        });
      }

      this.coordinator.submitBatch(jobs);
    }
  }
}
