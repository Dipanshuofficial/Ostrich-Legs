// --- CONSTANTS (Erasable Enums) ---
export const SwarmRunState = {
  IDLE: "IDLE",
  RUNNING: "RUNNING",
  PAUSED: "PAUSED",
  STOPPED: "STOPPED",
} as const;
export type SwarmRunState = (typeof SwarmRunState)[keyof typeof SwarmRunState];

export const DeviceState = {
  ENABLED: "ENABLED",
  DISABLED: "DISABLED",
  BUSY: "BUSY",
  ONLINE: "ONLINE",
  OFFLINE: "OFFLINE",
  ERROR: "ERROR",
} as const;
export type DeviceState = (typeof DeviceState)[keyof typeof DeviceState];

export type DeviceType = "DESKTOP" | "MOBILE" | "COLAB" | "SERVER" | "TABLET";
export type JobType = "MATH_STRESS" | "MAT_MUL" | "TEXT_TOKENIZE" | "CUSTOM";

// --- INTERFACES ---

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

export interface DeviceCapabilities {
  cpuCores: number;
  memoryGB: number;
  gpuAvailable: boolean;
  maxConcurrency: number;
  supportedJobs: JobType[];
}

export interface DeviceInfo {
  id: string;
  socketId: string;
  name: string;
  type: DeviceType;
  state: DeviceState;
  capabilities: DeviceCapabilities;

  // Metrics
  opsScore: number;
  currentLoad: number;
  totalJobsCompleted: number;
  avgJobDuration: number;
  connectedAt: number;
  lastHeartbeat: number;

  // Configuration
  isThrottled: boolean;
  throttleLevel: number;
}

export interface SwarmSnapshot {
  runState: SwarmRunState;
  globalThrottle: number;
  devices: Record<string, DeviceInfo>;
  stats: {
    totalJobs: number;
    activeJobs: number;
    pendingJobs: number;
    completedJobs: number;
  };
}

export interface JobChunk {
  id: string;
  type: JobType;
  data: any;
  status: "PENDING" | "ASSIGNED" | "COMPLETED";
  assignedTo?: string;
  assignedAt?: number;
  createdAt: number;
}

export interface WorkerResult {
  chunkId: string;
  workerId: string;
  deviceId?: string;
  result?: any;
  error?: string;
  durationMs?: number;
  timestamp: number;
}

export interface RegisterPayload {
  name: string;
  type: DeviceType;
  capabilities?: Partial<DeviceCapabilities>;
}
