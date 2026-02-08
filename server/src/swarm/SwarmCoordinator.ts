import { Server as SocketIOServer } from "socket.io";
import { DeviceRegistry } from "./DeviceRegistry";
import { WorkStealingScheduler } from "./WorkStealingScheduler";
import { JoinCodeManager } from "./JoinCodeManager";
import {
  type DeviceInfo,
  type JobChunk,
  type WorkerResult,
  type DeviceHealth,
  type SwarmStats,
} from "../../../shared/types";
import { EventEmitter } from "events";

interface SwarmOptions {
  enableWorkStealing?: boolean;
  enableHealthChecks?: boolean;
  autoRebalance?: boolean;
}

export class SwarmCoordinator extends EventEmitter {
  private io: SocketIOServer;
  private registry: DeviceRegistry;
  private scheduler: WorkStealingScheduler;
  private joinCodeManager: JoinCodeManager;
  private options: SwarmOptions;

  constructor(io: SocketIOServer, options: SwarmOptions = {}) {
    super();
    this.io = io;
    this.registry = new DeviceRegistry();
    this.scheduler = new WorkStealingScheduler();
    this.joinCodeManager = new JoinCodeManager();
    this.options = {
      enableWorkStealing: true,
      enableHealthChecks: true,
      autoRebalance: true,
      ...options,
    };

    this.setupEventHandlers();
    this.startAutoRebalancing();
  }

  // Device Management
  registerDevice(
    socketId: string,
    deviceInfo: Partial<DeviceInfo>,
  ): DeviceInfo {
    // 1. CRITICAL FIX: Check for existing device by Persistent ID first
    // The client sends 'id' which is the persistent localStorage ID.
    let device = deviceInfo.id ? this.registry.get(deviceInfo.id) : undefined;

    if (device) {
      // 2. RECONNECT: Update existing device record
      console.log(`[Swarm] Device reconnected: ${device.name} (${device.id})`);

      // Update the socket mapping in registry
      // We need to access the private map or add a method in DeviceRegistry
      // For now, assuming we can update the device object directly:
      device.socketId = socketId;
      device.status = "ONLINE";
      device.lastHeartbeat = Date.now();

      // Update registry internal mappings (You might need to add a method to DeviceRegistry for this)
      this.registry["socketToDevice"].set(socketId, device.id);

      // Do NOT emit "deviceJoined" for reconnects to prevent log spam
      this.emit("deviceReconnect", device);
      return device;
    }

    // 3. NEW REGISTRATION: Only if no ID found
    const newId = deviceInfo.id || this.generateDeviceId();

    device = {
      id: newId,
      socketId,
      name: deviceInfo.name || `Device-${newId.slice(0, 4)}`,
      type: deviceInfo.type || "DESKTOP",
      status: "ONLINE",
      capabilities: deviceInfo.capabilities || {
        cpuCores: 2,
        memoryGB: 4,
        gpuAvailable: false,
        maxConcurrency: 2,
        supportedJobs: [],
      },
      opsScore: deviceInfo.opsScore || 0,
      currentLoad: 0,
      totalJobsCompleted: 0,
      avgJobDuration: 0,
      connectedAt: Date.now(),
      lastHeartbeat: Date.now(),
      throttleLevel: 1.0,
      isThrottled: false,
    };

    this.registry.register(device);
    console.log(`[Swarm] New Device joined: ${device.name}`);
    this.emit("deviceJoined", device);
    this.broadcastStats();

    return device;
  }

  unregisterDevice(deviceId: string): void {
    const device = this.registry.unregister(deviceId);
    if (device) {
      // Reassign any pending jobs from this device
      const jobs = this.scheduler.getWorkForDevice(deviceId);
      jobs.forEach((job) => {
        job.status = "PENDING";
        job.assignedTo = undefined;
        job.assignedAt = undefined;
      });

      console.log(`[Swarm] Device left: ${device.name}`);
      this.emit("deviceLeft", deviceId);
      this.broadcastStats();
    }
  }

  // Job Management
  submitJob(job: JobChunk): void {
    this.scheduler.submitJob(job);
    this.tryAssignPendingJobs();
  }

  submitBatch(jobs: JobChunk[]): void {
    this.scheduler.submitBatch(jobs);
    this.tryAssignPendingJobs();
  }

  requestWork(deviceId: string): JobChunk | null {
    const device = this.registry.get(deviceId);
    if (!device || device.status === "OFFLINE" || device.status === "ERROR") {
      return null;
    }

    const job = this.scheduler.getNextJob(
      deviceId,
      device.capabilities.supportedJobs,
    );

    if (job) {
      this.registry.updateLoad(deviceId, device.currentLoad + 1);
      this.emit("jobAssigned", job, deviceId);
    }

    return job;
  }

  requestBatch(deviceId: string, count: number): JobChunk[] {
    const device = this.registry.get(deviceId);
    if (!device || device.status === "OFFLINE" || device.status === "ERROR") {
      return [];
    }

    const jobs = this.scheduler.getBatch(
      deviceId,
      count,
      device.capabilities.supportedJobs,
    );

    if (jobs.length > 0) {
      this.registry.updateLoad(deviceId, device.currentLoad + jobs.length);
      this.emit("batchAssigned", jobs, deviceId);
    }

    return jobs;
  }

  completeJob(result: WorkerResult): void {
    const success = this.scheduler.completeJob(result);

    if (success && result.deviceId) {
      const device = this.registry.get(result.deviceId);
      if (device) {
        device.totalJobsCompleted++;
        device.avgJobDuration = result.durationMs || device.avgJobDuration;
        this.registry.updateLoad(
          result.deviceId,
          Math.max(0, device.currentLoad - 1),
        );
        this.registry.updateStats(result.deviceId, {
          totalJobsCompleted: device.totalJobsCompleted,
          avgJobDuration: device.avgJobDuration,
        });
      }
    }

    this.tryAssignPendingJobs();
    this.broadcastStats();
  }

  // Work Stealing
  stealWork(thiefId: string): JobChunk[] {
    if (!this.options.enableWorkStealing) return [];

    const stolen = this.scheduler.stealWork(thiefId);

    if (stolen.length > 0) {
      const thief = this.registry.get(thiefId);
      if (thief) {
        this.registry.updateLoad(thiefId, thief.currentLoad + stolen.length);
      }

      this.emit("workStolen", stolen, thiefId);
    }

    return stolen;
  }

  offerWork(deviceId: string): JobChunk[] {
    if (!this.options.enableWorkStealing) return [];

    const device = this.registry.get(deviceId);
    if (!device || !this.scheduler.shouldOfferWork(deviceId)) {
      return [];
    }

    // Find best target for offloading
    const available = this.registry
      .getAvailable()
      .filter((d) => d.id !== deviceId)
      .sort((a, b) => b.opsScore - a.opsScore)[0];

    if (available) {
      return this.scheduler.stealWork(available.id, 3);
    }

    return [];
  }

  // Health & Monitoring
  recordHeartbeat(deviceId: string, health: DeviceHealth): void {
    this.registry.recordHeartbeat(deviceId, health);

    // Update device stats based on health
    if (health.cpuUsage > 90) {
      const device = this.registry.get(deviceId);
      if (device && !device.isThrottled) {
        device.isThrottled = true;
        device.throttleLevel = 0.7;
        this.emit("deviceThrottled", deviceId, 0.7);
      }
    }
  }

  updateDeviceStats(deviceId: string, stats: { opsScore: number }): void {
    this.registry.updateStats(deviceId, stats);
  }

  // Join Codes
  generateJoinCode(
    options?: Parameters<JoinCodeManager["generateCode"]>[0],
  ): string {
    return this.joinCodeManager.generateCode(options);
  }

  validateJoinCode(code: string): ReturnType<JoinCodeManager["validateCode"]> {
    return this.joinCodeManager.validateCode(code);
  }

  useJoinCode(code: string): boolean {
    return this.joinCodeManager.useCode(code);
  }

  // Statistics
  getStats(): SwarmStats {
    const deviceStats = this.registry.getStats();
    const queueMetrics = this.scheduler.getMetrics();

    return {
      totalDevices: deviceStats.totalDevices,
      onlineDevices: deviceStats.onlineDevices,
      busyDevices: deviceStats.busyDevices,
      totalCores: deviceStats.totalCores,
      totalMemoryGB: deviceStats.totalMemoryGB,
      pendingJobs: queueMetrics.pendingJobs,
      activeJobs: queueMetrics.assignedJobs,
      completedJobs: this.scheduler["completedJobs"].size,
      failedJobs: this.scheduler.getFailedCount(),
      globalVelocity: this.calculateGlobalVelocity(),
      avgLatency: this.calculateAvgLatency(),
      devicesByType: deviceStats.devicesByType,
    };
  }

  getDevices(): DeviceInfo[] {
    return this.registry.getAll();
  }

  getDevice(deviceId: string): DeviceInfo | undefined {
    return this.registry.get(deviceId);
  }

  // Private Methods
  private setupEventHandlers(): void {
    // Device registry events
    this.registry.on("deviceStale", (deviceId: string) => {
      console.log(`[Swarm] Device ${deviceId} marked as stale`);
      this.emit("deviceStale", deviceId);
    });

    // Scheduler events
    this.scheduler.on("jobTimeout", (jobId: string) => {
      console.log(`[Swarm] Job ${jobId} timed out, reassigning...`);
      this.tryAssignPendingJobs();
    });
  }

  private tryAssignPendingJobs(): void {
    const pendingCount = this.scheduler.getPendingCount();
    if (pendingCount === 0) return;

    const available = this.registry.getAvailable();

    for (const device of available) {
      const capacity = device.capabilities.maxConcurrency - device.currentLoad;
      if (capacity <= 0) continue;

      // Request batch of jobs based on capacity
      const jobs = this.scheduler.getBatch(
        device.id,
        capacity,
        device.capabilities.supportedJobs,
      );

      if (jobs.length > 0) {
        this.registry.updateLoad(device.id, device.currentLoad + jobs.length);
        this.emit("batchAssigned", jobs, device.id);

        // Send jobs to device
        const socket = this.io.sockets.sockets.get(device.socketId);
        if (socket) {
          socket.emit("BATCH_DISPATCH", jobs);
        }
      }
    }
  }

  private startAutoRebalancing(): void {
    if (!this.options.autoRebalance) return;

    setInterval(() => {
      const pairs = this.registry.getLoadBalancingPairs();

      for (const { overloaded, underloaded } of pairs) {
        const stolen = this.scheduler.stealWork(underloaded.id, 3);

        if (stolen.length > 0) {
          this.registry.updateLoad(
            overloaded.id,
            Math.max(0, overloaded.currentLoad - stolen.length),
          );
          this.registry.updateLoad(
            underloaded.id,
            underloaded.currentLoad + stolen.length,
          );

          // Send stolen jobs to underloaded device
          const socket = this.io.sockets.sockets.get(underloaded.socketId);
          if (socket) {
            socket.emit("BATCH_DISPATCH", stolen);
          }

          this.emit("workStolen", stolen, overloaded.id, underloaded.id);
        }
      }
    }, 10000); // Rebalance every 10 seconds
  }

  private broadcastStats(): void {
    const stats = this.getStats();
    this.io.emit("SWARM_STATS", stats);
  }

  private calculateGlobalVelocity(): number {
    const devices = this.registry.getOnline();
    if (devices.length === 0) return 0;

    const totalJobsLastMinute = devices.reduce((sum, d) => {
      // Estimate based on avg duration
      if (d.avgJobDuration > 0) {
        return sum + (60000 / d.avgJobDuration) * d.currentLoad;
      }
      return sum;
    }, 0);

    return Math.round(totalJobsLastMinute / 60); // Jobs per second
  }

  private calculateAvgLatency(): number {
    const metrics = this.scheduler.getMetrics();
    return Math.round(metrics.avgWaitTime);
  }

  private generateDeviceId(): string {
    return `dev-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`;
  }

  // Cleanup
  dispose(): void {
    this.registry.dispose();
    this.scheduler.dispose();
    this.removeAllListeners();
  }
}
