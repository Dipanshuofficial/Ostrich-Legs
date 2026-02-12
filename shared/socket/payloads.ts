import { SwarmRunState, DeviceConnectionStatus, LogLevel } from "./states";

export interface DeviceRegisterPayload {
  name: string;
  capabilities: {
    cpuCores: number;
    memoryGB: number;
    gpuAvailable: boolean;
    gpuName?: string;
  };
}

export interface JobCompletePayload {
  chunkId: string;
  workerId: string;
  result?: any;
  error?: string;
  durationMs?: number;
}

export interface SwarmSnapshotPayload {
  runState: SwarmRunState;
  devices: Record<string, any>; // Will be refined in Phase 2
  stats: {
    totalJobs: number;
    completedJobs: number;
    activeJobs: number;
    globalVelocity: number;
    globalThrottle: number;
  };
}
