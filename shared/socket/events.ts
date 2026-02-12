export const SocketEvents = {
  // Connection Lifecycle
  CONNECT: "connect",
  DISCONNECT: "disconnect",
  CONNECTION_ERROR: "connect_error",

  // Identity & Registration
  DEVICE_REGISTER: "device:register",
  DEVICE_READY: "device:ready",
  HEARTBEAT: "heartbeat",

  // Swarm Orchestration
  SWARM_SNAPSHOT: "swarm:snapshot",
  SWARM_SET_STATE: "cmd:set_run_state",
  SWARM_SET_THROTTLE: "cmd:set_throttle",
  SWARM_THROTTLE_SYNC: "swarm:throttle_sync",

  // Job Pipeline
  JOB_REQUEST_BATCH: "job:request_batch",
  JOB_BATCH_DISPATCH: "job:batch",
  JOB_COMPLETE: "job:complete",

  // Diagnostics & Terminal
  SYSTEM_LOG: "sys:log",
  BENCHMARK_START: "cmd:run_benchmark",
  BENCHMARK_RESULT: "benchmark:result",
} as const;

export type SocketEvent = (typeof SocketEvents)[keyof typeof SocketEvents];
