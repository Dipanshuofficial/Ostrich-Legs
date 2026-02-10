import {
  type DeviceInfo,
  type JobChunk,
  type WorkerResult,
  SwarmRunState,
  DeviceState,
  type RegisterPayload,
} from "../../../shared/types.js";
import { SwarmStateStore } from "./SwarmStateStore.js";
import { WorkStealingScheduler } from "./WorkStealingScheduler.js";
import { JoinCodeManager } from "./JoinCodeManager.js";

export class SwarmCoordinator {
  public stateStore: SwarmStateStore;
  public scheduler: WorkStealingScheduler;
  public joinCodeManager: JoinCodeManager;

  constructor() {
    this.stateStore = new SwarmStateStore();
    this.scheduler = new WorkStealingScheduler();
    this.joinCodeManager = new JoinCodeManager();

    this.scheduler.on("jobSubmitted", () => this.syncQueueStats());
    this.scheduler.on("jobCompleted", () => this.syncQueueStats());
    this.scheduler.on("batchSubmitted", () => this.syncQueueStats()); // Listen for batch events
  }

  public handleRegistration(
    socketId: string,
    persistentId: string,
    data: RegisterPayload,
  ): DeviceInfo {
    const existing = this.stateStore.getDevice(persistentId);

    const device: DeviceInfo = {
      id: persistentId,
      socketId,
      name: data.name || `Device-${persistentId.substring(0, 4)}`,
      type: data.type || "DESKTOP",
      state:
        existing?.state === DeviceState.DISABLED
          ? DeviceState.DISABLED
          : DeviceState.ONLINE,
      capabilities: {
        cpuCores: data.capabilities?.cpuCores || 2,
        memoryGB: data.capabilities?.memoryGB || 4,
        gpuAvailable: data.capabilities?.gpuAvailable || false,
        maxConcurrency: data.capabilities?.maxConcurrency || 2,
        supportedJobs: data.capabilities?.supportedJobs || [
          "MATH_STRESS",
          "MAT_MUL",
        ],
      },
      opsScore: existing?.opsScore || 0,
      currentLoad: 0,
      totalJobsCompleted: existing?.totalJobsCompleted || 0,
      avgJobDuration: existing?.avgJobDuration || 0,
      connectedAt: Date.now(),
      lastHeartbeat: Date.now(),
      isThrottled: false,
      throttleLevel: 1.0,
    };

    this.stateStore.upsertDevice(device);
    return device;
  }

  public handleDisconnect(socketId: string) {
    const devices = this.stateStore.getAllDevices();
    const device = devices.find((d) => d.socketId === socketId);
    if (device) {
      this.stateStore.updateDeviceState(device.id, {
        state: DeviceState.OFFLINE,
      });
    }
  }

  public toggleDevice(deviceId: string, enabled: boolean) {
    const device = this.stateStore.getDevice(deviceId);
    if (!device) return;

    const newState = enabled ? DeviceState.ONLINE : DeviceState.DISABLED;
    this.stateStore.updateDeviceState(deviceId, { state: newState });

    if (!enabled) {
      this.stateStore.updateDeviceState(deviceId, { currentLoad: 0 });
    }
  }

  public setRunState(state: SwarmRunState) {
    this.stateStore.updateRunState(state);
    if (state === SwarmRunState.STOPPED) {
      this.scheduler.flush();
      this.syncQueueStats();
    }
  }

  public submitJob(job: JobChunk) {
    this.scheduler.submitJob(job);
    this.syncQueueStats();
  }

  // --- ADDED THIS METHOD ---
  public submitBatch(jobs: JobChunk[]) {
    this.scheduler.submitBatch(jobs);
    this.syncQueueStats();
  }

  public completeJob(result: WorkerResult) {
    this.scheduler.completeJob(result);

    if (result.deviceId) {
      const device = this.stateStore.getDevice(result.deviceId);
      if (device) {
        this.stateStore.updateDeviceState(result.deviceId, {
          totalJobsCompleted: device.totalJobsCompleted + 1,
          currentLoad: Math.max(0, device.currentLoad - 1),
          state:
            device.currentLoad - 1 > 0 ? DeviceState.BUSY : DeviceState.ONLINE,
        });
      }
    }
    this.syncQueueStats();
  }

  private syncQueueStats() {
    const metrics = this.scheduler.getMetrics();
    this.stateStore.updateStats({
      totalJobs: metrics.totalJobs,
      activeJobs: metrics.assignedJobs,
      pendingJobs: metrics.pendingJobs,
    });
  }

  public getWorkForDevice(deviceId: string): JobChunk[] {
    const device = this.stateStore.getDevice(deviceId);
    if (
      !device ||
      (device.state !== DeviceState.ONLINE && device.state !== DeviceState.BUSY)
    ) {
      return [];
    }

    const snapshot = this.stateStore.getSnapshot();
    if (snapshot.runState !== SwarmRunState.RUNNING) {
      return [];
    }

    const capacity = device.capabilities.maxConcurrency - device.currentLoad;
    if (capacity <= 0) return [];

    const jobs = this.scheduler.getBatch(deviceId, Math.min(capacity, 5));

    if (jobs.length > 0) {
      this.stateStore.updateDeviceState(deviceId, {
        currentLoad: device.currentLoad + jobs.length,
        state: DeviceState.BUSY,
      });
    }

    return jobs;
  }
}
