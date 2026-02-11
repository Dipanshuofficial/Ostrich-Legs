import { type Job, type DeviceInfo } from "../core/types";

export class JobScheduler {
  private jobQueue: Job[] = [];

  constructor() {
    // Generate dummy jobs periodically (Low overhead: just pushing objects)
    setInterval(() => this.generateJobs(), 2000);
  }

  private generateJobs() {
    if (this.jobQueue.length > 500) return; // Prevent memory overflow

    // Create 50 lightweight job objects
    for (let i = 0; i < 50; i++) {
      const isGpuTask = Math.random() > 0.7; // 30% GPU tasks
      this.jobQueue.push({
        id: `job-${Date.now()}-${Math.random().toString(36).substr(2, 5)}`,
        type: isGpuTask ? "MAT_MUL" : "MATH_STRESS",
        complexity: Math.floor(Math.random() * 10) + 1,
        data: isGpuTask ? { size: 1024 } : { iterations: 100000 },
      });
    }
  }

  public getJobForDevice(device: DeviceInfo): Job | null {
    if (device.status === "DISABLED" || device.status === "OFFLINE")
      return null;

    // Capability-based Scheduling
    const preferredType = device.capabilities.gpuAvailable
      ? "MAT_MUL"
      : "MATH_STRESS";

    // Find best match
    const index = this.jobQueue.findIndex((j) => j.type === preferredType);

    if (index !== -1) {
      return this.jobQueue.splice(index, 1)[0];
    }

    // Fallback: take any job
    return this.jobQueue.shift() || null;
  }

  public getQueueStats() {
    return {
      pending: this.jobQueue.length,
      active: 0, // In a real DB this would be tracked
    };
  }
}
