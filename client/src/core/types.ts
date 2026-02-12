/** * Strict Domain Model for Ostrich Swarm
 */

export type SwarmStatus = "IDLE" | "RUNNING" | "PAUSED" | "STOPPED";
export type DeviceType = "DESKTOP" | "MOBILE" | "COLAB" | "SERVER";
export type JobType = "MATH_STRESS" | "MAT_MUL" | "TEXT_TOKENIZE";

export interface DeviceCapabilities {
  cpuCores: number;
  memoryGB: number;
  gpuAvailable: boolean;
  gpuName?: string;
}

export interface DeviceInfo {
  id: string;
  name: string;
  type: DeviceType;
  status: "ONLINE" | "BUSY" | "OFFLINE" | "DISABLED";
  capabilities: DeviceCapabilities;
  opsScore: number;
  totalJobsCompleted: number;
  lastHeartbeat: number;
}

export interface SwarmResources {
  totalCores: number;
  totalMemory: number;
  totalGPUs: number;
  onlineCount: number;
}

export interface Job {
  id: string;
  type: JobType;
  complexity: number;
  data: any;
}

export interface SwarmSnapshot {
  runState: SwarmStatus;
  devices: Record<string, DeviceInfo>;
  stats: {
    totalJobs: number;
    activeJobs: number;
    pendingJobs: number;
    completedJobs: number;
    globalVelocity: number;
    globalThrottle?: number;
  };
  resources: SwarmResources;
}
