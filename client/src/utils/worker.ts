/// <reference lib="webworker" />

// Limits
const LOGICAL_CORES = navigator.hardwareConcurrency || 4;
const TOTAL_RAM_BYTES = (navigator as any).deviceMemory
  ? (navigator as any).deviceMemory * 1e9
  : 4e9;

// State - Use Map for better tracking
const threadPool = new Map<
  number,
  {
    worker: Worker;
    busy: boolean;
    currentChunkId: string | null;
  }
>();

let currentRamUsage = 0;
let throttleLimit = 0.3; // Default 30%
let nextWorkerId = 0;

// --- KERNEL 1: Math Stress (Legacy) ---
const runStressTest = (iterations: number) => {
  let sum = 0;
  for (let i = 0; i < iterations; i++) {
    sum += Math.sqrt(i) * Math.sin(i);
  }
  return sum;
};

// --- KERNEL 2: Matrix Multiplication (ML Foundation) ---
const runMatrixMul = (rowA: number[], matrixB: number[][]) => {
  const resultRow = new Array(matrixB[0].length).fill(0);
  for (let j = 0; j < matrixB[0].length; j++) {
    let sum = 0;
    for (let k = 0; k < rowA.length; k++) {
      sum += rowA[k] * matrixB[k][j];
    }
    resultRow[j] = sum;
  }
  return resultRow;
};

// --- SUB-WORKER FACTORY ---
const createSubWorker = (workerId: number) => {
  const blob = new Blob(
    [
      `
    const runStressTest = ${runStressTest.toString()};
    const runMatrixMul = ${runMatrixMul.toString()};

    self.onmessage = (e) => {
      try {
        const { type, data } = e.data;
        let result;

        if (type === "MATH_STRESS") {
          result = runStressTest(data[0]);
        } 
        else if (type === "MATRIX_MUL") {
          result = runMatrixMul(data.row, data.matrixB);
        }
        else {
          throw new Error("Unknown Kernel: " + type);
        }

        self.postMessage({ success: true, result });
      } catch (err) {
        self.postMessage({ success: false, error: err.message });
      }
    }
  `,
    ],
    { type: "application/javascript" },
  );
  const worker = new Worker(URL.createObjectURL(blob));

  // Store workerId on the worker object for tracking
  (worker as any).workerId = workerId;

  return worker;
};

const calculateBenchmark = (): number => {
  const start = performance.now();
  let sum = 0;
  const duration = 100;
  while (performance.now() - start < duration) {
    for (let i = 0; i < 10000; i++) {
      sum += Math.sqrt(i) * Math.sin(i);
    }
  }
  return Math.round((sum / (performance.now() - start)) * 100);
};

// Find first available worker
const findAvailableWorker = (): { id: number; worker: Worker } | null => {
  for (const [id, thread] of threadPool.entries()) {
    if (!thread.busy) {
      return { id, worker: thread.worker };
    }
  }
  return null;
};

// --- MAIN CONTROLLER ---
self.onmessage = async (e: MessageEvent) => {
  const { type, chunk, throttleLevel, workerId } = e.data;

  // SYSTEM: BENCHMARK
  if (type === "BENCHMARK") {
    self.postMessage({
      type: "BENCHMARK_COMPLETE",
      score: calculateBenchmark(),
    });
    return;
  }

  // SYSTEM: CONFIG UPDATE
  if (type === "UPDATE_CONFIG") {
    throttleLimit = throttleLevel;
    const targetThreadCount = Math.max(
      1,
      Math.floor(LOGICAL_CORES * throttleLimit),
    );

    const currentCount = threadPool.size;

    // Scale Up
    if (targetThreadCount > currentCount) {
      for (let i = currentCount; i < targetThreadCount; i++) {
        const workerId = nextWorkerId++;
        const worker = createSubWorker(workerId);
        threadPool.set(workerId, {
          worker,
          busy: false,
          currentChunkId: null,
        });
      }
    }

    // Scale Down - Only remove idle workers
    if (targetThreadCount < currentCount) {
      const toRemove = currentCount - targetThreadCount;
      let removed = 0;

      for (const [id, thread] of threadPool.entries()) {
        if (!thread.busy && removed < toRemove) {
          thread.worker.terminate();
          threadPool.delete(id);
          removed++;
        }
      }
    }

    self.postMessage({
      type: "CONFIG_APPLIED",
      threads: threadPool.size,
      limit: throttleLimit,
      score: calculateBenchmark(),
    });
    return;
  }

  // EXECUTION: JOB HANDLING
  if (type === "JOB_CHUNK") {
    // 1. RAM CHECK
    const estimatedSize = 50000;
    if (currentRamUsage + estimatedSize > TOTAL_RAM_BYTES * throttleLimit) {
      self.postMessage({
        type: "JOB_ERROR",
        chunkId: chunk.id,
        error: "OOM_PREVENTED",
      });
      return;
    }

    // 2. FIND AVAILABLE WORKER
    const available = findAvailableWorker();
    if (!available) {
      self.postMessage({
        type: "JOB_ERROR",
        chunkId: chunk.id,
        error: "CPU_SATURATED",
      });
      return;
    }

    // 3. RUN
    const { id: threadId, worker } = available;
    const start = performance.now();

    currentRamUsage += estimatedSize;
    const thread = threadPool.get(threadId)!;
    thread.busy = true;
    thread.currentChunkId = chunk.id;

    worker.onmessage = (ev) => {
      currentRamUsage -= estimatedSize;

      // Only update if thread still exists (might have been scaled down)
      const currentThread = threadPool.get(threadId);
      if (currentThread) {
        currentThread.busy = false;
        currentThread.currentChunkId = null;
      }

      const duration = Math.round(performance.now() - start);

      if (ev.data.success) {
        self.postMessage({
          type: "JOB_COMPLETE",
          chunkId: chunk.id,
          result: ev.data.result,
          workerId: workerId,
          durationMs: duration,
          timestamp: performance.now(),
        });
      } else {
        self.postMessage({
          type: "JOB_ERROR",
          chunkId: chunk.id,
          error: ev.data.error,
        });
      }
    };

    worker.postMessage({ type: chunk.type, data: chunk.data });
  }
};

export {};
