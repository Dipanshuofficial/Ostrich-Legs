/// <reference lib="webworker" />

// --- CONFIGURATION & LIMITS ---
const LOGICAL_CORES = navigator.hardwareConcurrency || 4;
// RAM Limit Estimate (Performance.memory is not standard, so we estimate)
const TOTAL_RAM_BYTES = (navigator as any).deviceMemory
  ? (navigator as any).deviceMemory * 1e9
  : 8e9; // Default to 8GB if unknown

// --- STATE MANAGEMENT ---
// Map stores: Worker ID -> { Worker Instance, Busy Status, Current Chunk ID }
const threadPool = new Map<
  number,
  {
    worker: Worker;
    busy: boolean;
    currentChunkId: string | null;
  }
>();

let currentRamUsage = 0;
let throttleLimit = 0.3; // Default start at 30%
let nextWorkerId = 0;

// --- KERNEL 1: Math Stress (CPU Intense) ---
// Performs heavy floating point calculations
const runStressTest = (iterations: number) => {
  let sum = 0;
  // Safety check for undefined input
  const count = iterations || 1000000;
  for (let i = 0; i < count; i++) {
    sum += Math.sqrt(i) * Math.sin(i);
  }
  return sum;
};

// --- KERNEL 2: Matrix Multiplication (Memory & CPU Intense) ---
// Standard O(n^3) matrix multiplication for ML simulation
const runMatrixMul = (rowA: number[], matrixB: number[][]) => {
  if (!rowA || !matrixB) return []; // Safety check

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
// Creates a lightweight worker that runs the actual kernels
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

        // 1. Handle Math Stress
        if (type === "MATH_STRESS") {
          // Server sends data: { iterations: number }
          // Or sometimes just the number depending on generator
          const iterations = typeof data === 'object' ? data.iterations : data;
          result = runStressTest(iterations);
        } 
        // 2. Handle Matrix Multiplication
        else if (type === "MAT_MUL") {
          // Server sends data: { row: [], matrixB: [][] }
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

  return new Worker(URL.createObjectURL(blob));
};

// --- THREAD POOL MANAGER ---
const applyConfig = () => {
  // Calculate target threads based on throttle %
  const targetThreadCount = Math.max(
    1,
    Math.floor(LOGICAL_CORES * throttleLimit),
  );

  const currentCount = threadPool.size;

  // SCALE UP
  if (targetThreadCount > currentCount) {
    for (let i = currentCount; i < targetThreadCount; i++) {
      const wId = nextWorkerId++;
      const worker = createSubWorker(wId);
      threadPool.set(wId, {
        worker,
        busy: false,
        currentChunkId: null,
      });
    }
  }

  // SCALE DOWN (Only remove idle workers to prevent killing active jobs)
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

  // Notify Main Thread about the actual active thread count
  self.postMessage({
    type: "CONFIG_APPLIED",
    threads: threadPool.size,
    limit: throttleLimit,
  });
};

// --- INITIALIZATION ---
// 1. CRITICAL FIX: Initialize threads immediately on load
applyConfig();

// --- MAIN MESSAGE DISPATCHER ---
self.onmessage = async (e: MessageEvent) => {
  const { type, chunk, throttleLevel, workerId } = e.data;

  // CONFIG UPDATE
  if (type === "UPDATE_CONFIG") {
    if (throttleLevel !== undefined) {
      throttleLimit = throttleLevel;
    }
    applyConfig();
    return;
  }

  // BENCHMARKING
  if (type === "BENCHMARK") {
    const start = performance.now();
    let sum = 0;
    // Quick burst calculation
    for (let i = 0; i < 500000; i++) {
      sum += Math.sqrt(i);
    }
    const duration = performance.now() - start;
    // Calculate OPS (Operations Per Second approximation)
    const score = Math.round((500000 / (duration || 1)) * 1000);

    self.postMessage({
      type: "BENCHMARK_COMPLETE",
      score: score,
    });
    return;
  }

  // JOB PROCESSING
  if (type === "JOB_CHUNK") {
    // 1. Find an idle worker
    let selectedThreadId = -1;
    let selectedWorker = null;

    for (const [id, thread] of threadPool.entries()) {
      if (!thread.busy) {
        selectedThreadId = id;
        selectedWorker = thread.worker;
        break;
      }
    }

    // 2. If no worker is free, reject (Shouldn't happen if queue logic is good)
    if (!selectedWorker) {
      self.postMessage({
        type: "JOB_ERROR",
        chunkId: chunk.id,
        error: "CPU_SATURATED",
      });
      return;
    }

    // 3. Mark thread as busy
    const thread = threadPool.get(selectedThreadId)!;
    thread.busy = true;
    thread.currentChunkId = chunk.id;

    // 4. Set up completion handler
    selectedWorker.onmessage = (ev) => {
      // Mark as free immediately
      thread.busy = false;
      thread.currentChunkId = null;

      if (ev.data.success) {
        self.postMessage({
          type: "JOB_COMPLETE",
          chunkId: chunk.id,
          result: ev.data.result,
          workerId: workerId, // Pass back socket ID for tracking
        });
      } else {
        self.postMessage({
          type: "JOB_ERROR",
          chunkId: chunk.id,
          error: ev.data.error,
        });
      }
    };

    // 5. Dispatch to sub-worker
    // Note: We pass chunk.data exactly as received
    selectedWorker.postMessage({
      type: chunk.type,
      data: chunk.data,
    });
  }
};

export {};
