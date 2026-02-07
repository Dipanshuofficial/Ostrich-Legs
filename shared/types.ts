export type ChunkStatus = "PENDING" | "ASSIGNED" | "COMPLETED";
export type DeviceType = "DESKTOP" | "MOBILE" | "COLAB" | "SERVER" | "TABLET";
export type DeviceStatus = "ONLINE" | "OFFLINE" | "BUSY" | "ERROR";

export type JobErrorType =
  | "OOM_PREVENTED"
  | "CPU_SATURATED"
  | "EXECUTION_ERROR"
  | "DEVICE_DISCONNECTED"
  | "TIMEOUT";

export type JobType = "MATH_STRESS" | "MAT_MUL" | "TEXT_TOKENIZE" | "CUSTOM";

export interface JobChunk {
  id: string;
  type: JobType;
  data: any;
  script?: string;
  status: ChunkStatus;
  priority?: number;
  assignedTo?: string;
  assignedAt?: number;
  createdAt: number;
}

export interface WorkerResult {
  chunkId: string;
  workerId: string;
  deviceId?: string;
  result?: any;
  error?: JobErrorType;
  details?: string;
  durationMs?: number;
  timestamp: number;
}

export interface WorkerPayload {
  chunk: JobChunk;
  workerId: string;
}

// Enhanced Device Types for Multi-Device Swarm
export interface DeviceCapabilities {
  cpuCores: number;
  memoryGB: number;
  gpuAvailable: boolean;
  gpuType?: string;
  maxConcurrency: number;
  supportedJobs: JobType[];
}

export interface DeviceInfo {
  id: string;
  socketId: string;
  name: string;
  type: DeviceType;
  status: DeviceStatus;
  capabilities: DeviceCapabilities;

  // Performance Metrics
  opsScore: number;
  currentLoad: number;
  totalJobsCompleted: number;
  avgJobDuration: number;

  // Connection Info
  ip?: string;
  region?: string;
  connectedAt: number;
  lastHeartbeat: number;

  // Throttling
  throttleLevel: number;
  isThrottled: boolean;
}

export interface SwarmStats {
  totalDevices: number;
  onlineDevices: number;
  busyDevices: number;
  totalCores: number;
  totalMemoryGB: number;

  // Job Stats
  pendingJobs: number;
  activeJobs: number;
  completedJobs: number;
  failedJobs: number;

  // Performance
  globalVelocity: number;
  avgLatency: number;

  // By Device Type
  devicesByType: Record<DeviceType, number>;
}

export interface JoinCode {
  code: string;
  expiresAt: number;
  maxUses: number;
  usedCount: number;
  createdBy: string;
  metadata?: {
    description?: string;
    tags?: string[];
  };
}

export interface WorkStealRequest {
  thiefId: string;
  victimId: string;
  requestedJobs: number;
}

export interface DeviceHealth {
  deviceId: string;
  timestamp: number;
  cpuUsage: number;
  memoryUsage: number;
  temperature?: number;
  networkLatency: number;
  isHealthy: boolean;
}

// Events
export type SwarmEvent =
  | { type: "DEVICE_JOINED"; device: DeviceInfo }
  | { type: "DEVICE_LEFT"; deviceId: string }
  | { type: "DEVICE_STATUS_CHANGED"; deviceId: string; status: DeviceStatus }
  | { type: "JOB_ASSIGNED"; jobId: string; deviceId: string }
  | { type: "JOB_COMPLETED"; result: WorkerResult }
  | { type: "JOB_FAILED"; jobId: string; error: JobErrorType }
  | { type: "WORK_STOLEN"; from: string; to: string; count: number }
  | { type: "HEARTBEAT"; deviceId: string; health: DeviceHealth };
