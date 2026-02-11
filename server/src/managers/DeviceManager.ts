import { type DeviceInfo, type DeviceCapabilities } from "../core/types";

export class DeviceManager {
  private devices = new Map<string, DeviceInfo>();

  // TIMEOUTS
  private OFFLINE_THRESHOLD = 10000; // 10s: Mark as Offline (Red)
  private DELETE_THRESHOLD = 60000; // 60s: Garbage Collect (Delete)

  constructor() {
    // Run the reaper every 5 seconds
    setInterval(() => this.cleanup(), 5000);
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
      // New field:
      lastUserInteraction: Date.now(),
    });
  }

  public heartbeat(id: string, data?: { lastInteraction: number }) {
    const device = this.devices.get(id);
    if (device) {
      device.lastHeartbeat = Date.now();

      // Update interaction time if provided
      if (data?.lastInteraction) {
        device.lastUserInteraction = data.lastInteraction; // (Add this to your DeviceInfo type if you want to display it)
      }

      // Revive if it was offline (but not disabled)
      if (device.status === "OFFLINE") {
        device.status = "ONLINE";
      }
    }
  }

  // Called when tab closes (Immediate removal)
  public remove(id: string) {
    this.devices.delete(id);
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

  // --- THE GARBAGE COLLECTOR ---
  private cleanup() {
    const now = Date.now();

    this.devices.forEach((device, id) => {
      const timeSinceHeartbeat = now - device.lastHeartbeat;

      // 1. Hard Delete (Zombie Removal)
      if (timeSinceHeartbeat > this.DELETE_THRESHOLD) {
        console.log(`[REAPER] Removing dead node: ${device.name} (${id})`);
        this.devices.delete(id);
        return;
      }

      // 2. Soft Offline (Mark Red)
      if (
        device.status !== "DISABLED" &&
        timeSinceHeartbeat > this.OFFLINE_THRESHOLD
      ) {
        if (device.status !== "OFFLINE") {
          // console.log(`[WARN] Node offline: ${device.name}`);
          device.status = "OFFLINE";
        }
      }
    });
  }
}
