// Strict states for the compute engine
export type SwarmRunState = "IDLE" | "RUNNING" | "PAUSED" | "STOPPED";

// Device lifecycle states
export type DeviceConnectionStatus = "OFFLINE" | "ONLINE" | "BUSY" | "DISABLED";

// Log levels for the Terminal
export type LogLevel = "SYS" | "NET" | "CPU" | "GPU" | "ERR" | "WARN";

export interface SystemLogPayload {
  level: LogLevel;
  message: string;
  timestamp: number;
  source?: string;
}
