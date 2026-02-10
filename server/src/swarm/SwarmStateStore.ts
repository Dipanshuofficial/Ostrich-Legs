import { EventEmitter } from "events";
import {
  type SwarmSnapshot,
  SwarmRunState,
  type DeviceInfo,
} from "../../../shared/types";

export class SwarmStateStore extends EventEmitter {
  private snapshot: SwarmSnapshot;

  constructor() {
    super();
    this.snapshot = {
      runState: SwarmRunState.IDLE,
      globalThrottle: 0.3,
      devices: {},
      stats: {
        totalJobs: 0,
        activeJobs: 0,
        pendingJobs: 0,
      },
    };
  }

  public getSnapshot(): SwarmSnapshot {
    return JSON.parse(JSON.stringify(this.snapshot));
  }

  public getDevice(deviceId: string): DeviceInfo | undefined {
    return this.snapshot.devices[deviceId];
  }

  public getAllDevices(): DeviceInfo[] {
    return Object.values(this.snapshot.devices);
  }

  public updateRunState(state: SwarmRunState): void {
    if (this.snapshot.runState !== state) {
      this.snapshot.runState = state;
      this.emitChange();
    }
  }

  public upsertDevice(device: DeviceInfo): void {
    this.snapshot.devices[device.id] = device;
    this.emitChange();
  }

  public updateDeviceState(
    deviceId: string,
    partial: Partial<DeviceInfo>,
  ): void {
    const device = this.snapshot.devices[deviceId];
    if (device) {
      this.snapshot.devices[deviceId] = { ...device, ...partial };
      this.emitChange();
    }
  }

  public removeDevice(deviceId: string): void {
    if (this.snapshot.devices[deviceId]) {
      delete this.snapshot.devices[deviceId];
      this.emitChange();
    }
  }

  public updateStats(stats: Partial<SwarmSnapshot["stats"]>): void {
    this.snapshot.stats = { ...this.snapshot.stats, ...stats };
    this.emitChange();
  }

  private emitChange() {
    this.emit("change", this.getSnapshot());
  }
}
