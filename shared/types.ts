export type ChunkStatus = "PENDING" | "ASSIGNED" | "COMPLETED";

export type JobErrorType =
  | "OOM_PREVENTED"
  | "CPU_SATURATED"
  | "EXECUTION_ERROR";
export type JobType = "MATH_STRESS" | "MAT_MUL" | "TEXT_TOKENIZE";

export interface JobChunk {
  id: string;
  type: JobType;
  data: any;
  script?: string;
  status: ChunkStatus;
}

export interface WorkerResult {
  chunkId: string;
  workerId: string;
  result?: any; // The computation output
  error?: JobErrorType; // If failed, why?
  details?: string; // Error message (e.g., "Memory limit exceeded")
  durationMs?: number; // <--- ADD THIS (Used for performance tracking)
}

export interface WorkerPayload {
  chunk: JobChunk;
  workerId: string;
}

export interface DeviceStats {
  socketId: string;
  opsScore: number;
  isBusy: boolean;
}
