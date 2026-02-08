import {
  type DeviceInfo,
  type DeviceStatus,
  type DeviceHealth,
  type DeviceType,
} from "../../../shared/types";
import { EventEmitter } from "events";

export class DeviceRegistry extends EventEmitter {
  private devices = new Map<string, DeviceInfo>();
  private socketToDevice = new Map<string, string>();
  private healthChecks = new Map<string, DeviceHealth>();

  // Health check configuration
  private readonly HEARTBEAT_TIMEOUT = 30000; // 30 seconds
  private readonly HEALTH_CHECK_INTERVAL = 10000; // 10 seconds

  constructor() {
    super();
    this.startHealthMonitoring();
  }

  register(device: DeviceInfo): void {
    if (device.isEnabled === undefined) device.isEnabled = true;
    this.devices.set(device.id, device);
    this.socketToDevice.set(device.socketId, device.id);
    this.emit("deviceJoined", device);
  }

  unregister(deviceId: string): DeviceInfo | undefined {
    const device = this.devices.get(deviceId);
    if (device) {
      this.devices.delete(deviceId);
      this.socketToDevice.delete(device.socketId);
      this.healthChecks.delete(deviceId);
      this.emit("deviceLeft", deviceId, device);
    }
    return device;
  }

  getBySocketId(socketId: string): DeviceInfo | undefined {
    const deviceId = this.socketToDevice.get(socketId);
    return deviceId ? this.devices.get(deviceId) : undefined;
  }

  get(deviceId: string): DeviceInfo | undefined {
    return this.devices.get(deviceId);
  }

  getAll(): DeviceInfo[] {
    return Array.from(this.devices.values());
  }

  getOnline(): DeviceInfo[] {
    return this.getAll().filter(
      (d) => d.status === "ONLINE" || d.status === "BUSY",
    );
  }

  getAvailable(): DeviceInfo[] {
    return this.getOnline().filter(
      (d) =>
        d.isEnabled &&
        d.status !== "DISABLED" &&
        d.currentLoad < d.capabilities.maxConcurrency,
    );
  }
  // NEW: Toggle Enable/Disable
  toggleDevice(deviceId: string, enabled: boolean): DeviceInfo | undefined {
    const device = this.devices.get(deviceId);
    if (device) {
      device.isEnabled = enabled;
      device.status = enabled ? "ONLINE" : "DISABLED";
      this.emit("deviceUpdated", device); // Notify Coordinator
      return device;
    }
    return undefined;
  }
  getByType(type: DeviceType): DeviceInfo[] {
    return this.getAll().filter((d) => d.type === type);
  }

  updateStatus(deviceId: string, status: DeviceStatus): boolean {
    const device = this.devices.get(deviceId);
    if (device) {
      device.status = status;
      device.lastHeartbeat = Date.now();
      this.emit("statusChanged", deviceId, status);
      return true;
    }
    return false;
  }

  updateLoad(deviceId: string, load: number): boolean {
    const device = this.devices.get(deviceId);
    if (device) {
      device.currentLoad = load;
      device.status = load > 0 ? "BUSY" : "ONLINE";
      device.lastHeartbeat = Date.now();
      return true;
    }
    return false;
  }

  updateStats(
    deviceId: string,
    stats: {
      opsScore?: number;
      totalJobsCompleted?: number;
      avgJobDuration?: number;
    },
  ): boolean {
    const device = this.devices.get(deviceId);
    if (device) {
      if (stats.opsScore !== undefined) device.opsScore = stats.opsScore;
      if (stats.totalJobsCompleted !== undefined)
        device.totalJobsCompleted = stats.totalJobsCompleted;
      if (stats.avgJobDuration !== undefined)
        device.avgJobDuration = stats.avgJobDuration;
      return true;
    }
    return false;
  }

  recordHeartbeat(deviceId: string, health: DeviceHealth): void {
    this.healthChecks.set(deviceId, health);

    const device = this.devices.get(deviceId);
    if (device) {
      device.lastHeartbeat = Date.now();

      // Auto-update status based on health
      if (!health.isHealthy && device.status !== "ERROR") {
        this.updateStatus(deviceId, "ERROR");
      } else if (health.isHealthy && device.status === "ERROR") {
        this.updateStatus(deviceId, device.currentLoad > 0 ? "BUSY" : "ONLINE");
      }
    }

    this.emit("heartbeat", deviceId, health);
  }

  getHealth(deviceId: string): DeviceHealth | undefined {
    return this.healthChecks.get(deviceId);
  }

  getStats() {
    const all = this.getAll();
    const online = this.getOnline();

    return {
      totalDevices: all.length,
      onlineDevices: online.length,
      busyDevices: online.filter((d) => d.status === "BUSY").length,
      errorDevices: all.filter((d) => d.status === "ERROR").length,
      totalCores: all.reduce((sum, d) => sum + d.capabilities.cpuCores, 0),
      totalMemoryGB: all.reduce((sum, d) => sum + d.capabilities.memoryGB, 0),
      devicesByType: all.reduce(
        (acc, d) => {
          acc[d.type] = (acc[d.type] || 0) + 1;
          return acc;
        },
        {} as Record<string, number>,
      ),
    };
  }

  private startHealthMonitoring(): void {
    setInterval(() => {
      const now = Date.now();

      for (const [deviceId, device] of this.devices.entries()) {
        // Check for stale devices
        if (now - device.lastHeartbeat > this.HEARTBEAT_TIMEOUT) {
          if (device.status !== "OFFLINE") {
            this.updateStatus(deviceId, "OFFLINE");
            this.emit("deviceStale", deviceId);
          }
        }

        // Check health thresholds
        const health = this.healthChecks.get(deviceId);
        if (health) {
          const isHealthy =
            health.cpuUsage < 95 &&
            health.memoryUsage < 90 &&
            health.networkLatency < 1000;

          if (!isHealthy && device.status !== "ERROR") {
            this.updateStatus(deviceId, "ERROR");
          }
        }
      }
    }, this.HEALTH_CHECK_INTERVAL);
  }

  // Find best device for job assignment
  findBestDevice(preferredTypes?: string[]): DeviceInfo | null {
    const available = this.getAvailable();

    if (available.length === 0) return null;

    // Score each device
    const scored = available.map((device) => {
      let score = device.opsScore;

      // Penalize high load
      score *= 1 - device.currentLoad / device.capabilities.maxConcurrency;

      // Bonus for preferred types
      if (preferredTypes?.includes(device.type)) {
        score *= 1.2;
      }

      return { device, score };
    });

    // Sort by score descending
    scored.sort((a, b) => b.score - a.score);

    return scored[0]?.device || null;
  }

  // For work stealing - find overloaded and underloaded devices
  getLoadBalancingPairs(): Array<{
    overloaded: DeviceInfo;
    underloaded: DeviceInfo;
  }> {
    const online = this.getOnline();
    const pairs: Array<{ overloaded: DeviceInfo; underloaded: DeviceInfo }> =
      [];

    const overloaded = online.filter(
      (d) => d.currentLoad >= d.capabilities.maxConcurrency * 0.8,
    );

    const underloaded = online.filter(
      (d) => d.currentLoad < d.capabilities.maxConcurrency * 0.3,
    );

    for (const over of overloaded) {
      // Find best underloaded device to steal work
      const best = underloaded
        .filter((u) => u.id !== over.id)
        .sort((a, b) => b.opsScore - a.opsScore)[0];

      if (best) {
        pairs.push({ overloaded: over, underloaded: best });
      }
    }

    return pairs;
  }

  dispose(): void {
    this.devices.clear();
    this.socketToDevice.clear();
    this.healthChecks.clear();
    this.removeAllListeners();
  }
}
