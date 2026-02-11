import { type DeviceInfo, type DeviceCapabilities } from "../core/types";

export class DeviceManager {
  private devices = new Map<string, DeviceInfo>();
  private HEATBEAT_TIMEOUT = 10000; // 10s offline threshold

  constructor() {
    // Heartbeat Pulse Check every 5s
    setInterval(() => this.checkHeartbeats(), 5000);
  }

  public register(id: string, name: string, caps: DeviceCapabilities) {
    const existing = this.devices.get(id);
    this.devices.set(id, {
      id,
      name,
      type: caps.gpuAvailable ? "SERVER" : "DESKTOP",
      status: existing?.status === "DISABLED" ? "DISABLED" : "ONLINE",
      capabilities: caps,
      opsScore: existing?.opsScore || 0,
      totalJobsCompleted: existing?.totalJobsCompleted || 0,
      lastHeartbeat: Date.now(),
    });
  }

  public heartbeat(id: string) {
    const device = this.devices.get(id);
    if (device && device.status !== "DISABLED") {
      device.lastHeartbeat = Date.now();
      if (device.status === "OFFLINE") device.status = "ONLINE";
    }
  }

  public toggleDevice(id: string, enabled: boolean) {
    const device = this.devices.get(id);
    if (device) {
      device.status = enabled ? "ONLINE" : "DISABLED";
    }
  }

  public updateScore(id: string, score: number) {
    const device = this.devices.get(id);
    if (device) device.opsScore = score;
  }

  public getAvailableResources() {
    let totalCores = 0;
    let totalMemory = 0;
    let totalGPUs = 0;
    let onlineCount = 0;

    this.devices.forEach((d) => {
      if (d.status === "ONLINE" || d.status === "BUSY") {
        totalCores += d.capabilities.cpuCores;
        totalMemory += d.capabilities.memoryGB;
        if (d.capabilities.gpuAvailable) totalGPUs++;
        onlineCount++;
      }
    });

    return { totalCores, totalMemory, totalGPUs, onlineCount };
  }

  public getAllDevices() {
    return Array.from(this.devices.values());
  }

  private checkHeartbeats() {
    const now = Date.now();
    this.devices.forEach((device) => {
      if (
        device.status !== "DISABLED" &&
        now - device.lastHeartbeat > this.HEATBEAT_TIMEOUT
      ) {
        device.status = "OFFLINE";
      }
    });
  }
}
