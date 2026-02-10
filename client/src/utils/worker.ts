/// <reference lib="webworker" />

// --- CONFIGURATION & LIMITS ---
const LOGICAL_CORES = navigator.hardwareConcurrency || 4;

// --- STATE MANAGEMENT ---
// Map stores: Worker ID -> { Worker Instance, Busy Status, Current Chunk ID }
const threadPool = new Map<
  number,
  {
    worker: Worker;
    objectUrl: string; // <--- ADDED
    busy: boolean;
    currentChunkId: string | null;
  }
>();

let throttleLimit = 0.3; // Default start at 30%
let nextWorkerId = 0;

// --- SUB-WORKER FACTORY ---
// Creates a lightweight worker that runs the actual kernels
const createSubWorker = (_workerId: number) => {
  const blob = new Blob(
    [
      `
    // 1. Define Kernels INSIDE the blob
    const runStressTest = (iterations) => {
      let sum = 0;
      const count = iterations || 1000000;
      for (let i = 0; i < count; i++) {
        sum += Math.sqrt(i) * Math.sin(i);
      }
      return sum;
    };

    const runMatrixMul = (rowA, matrixB) => {
      if (!rowA || !matrixB) return []; 
      if (rowA.length !== matrixB.length) return [];

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

    self.onmessage = (e) => {
      try {
        const { type, data } = e.data;
        let result;

        if (type === "MATH_STRESS") {
          const iterations = typeof data === 'object' ? data.iterations : data;
          result = runStressTest(iterations);
        } 
        else if (type === "MAT_MUL") {
          if (data && data.size) {
            const size = data.size;
            const matrixB = Array(size).fill(0).map(() => Array(size).fill(0).map(() => Math.random()));
            const rowVector = Array(size).fill(0).map(() => Math.random());
            result = runMatrixMul(rowVector, matrixB);
          } else if (data && data.row && data.matrixB) {
            result = runMatrixMul(data.row, data.matrixB);
          } else {
             throw new Error("Invalid MAT_MUL data");
          }
        }
        else {
          throw new Error("Unknown Kernel: " + type);
        }

        self.postMessage({ success: true, result });
      } catch (err) {
        self.postMessage({ success: false, error: err.message || String(err) });
      }
    }
  `,
    ],
    { type: "application/javascript" },
  );

  const objectUrl = URL.createObjectURL(blob); // <--- CAPTURE URL
  return { worker: new Worker(objectUrl), objectUrl };
};
// --- THREAD POOL MANAGER ---
const applyConfig = () => {
  const targetThreadCount = Math.max(
    1,
    Math.floor(LOGICAL_CORES * throttleLimit),
  );

  const currentCount = threadPool.size;

  // SCALE UP
  if (targetThreadCount > currentCount) {
    for (let i = currentCount; i < targetThreadCount; i++) {
      const wId = nextWorkerId++;
      const { worker, objectUrl } = createSubWorker(wId); // <--- DESTRUCTURE
      threadPool.set(wId, {
        worker,
        objectUrl,
        busy: false,
        currentChunkId: null,
      });
    }
  }

  // SCALE DOWN
  if (targetThreadCount < currentCount) {
    const toRemove = currentCount - targetThreadCount;
    let removed = 0;

    for (const [id, thread] of threadPool.entries()) {
      if (!thread.busy && removed < toRemove) {
        thread.worker.terminate();
        URL.revokeObjectURL(thread.objectUrl); // <--- CRITICAL FIX: FREE MEMORY
        threadPool.delete(id);
        removed++;
      }
    }
  }

  self.postMessage({
    type: "CONFIG_APPLIED",
    threads: threadPool.size,
    limit: throttleLimit,
  });
};
// --- INITIALIZATION ---
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

    if (!selectedWorker) {
      self.postMessage({
        type: "JOB_ERROR",
        chunkId: chunk.id,
        error: "CPU_SATURATED",
      });
      return;
    }

    // 2. Mark thread as busy
    const thread = threadPool.get(selectedThreadId)!;
    thread.busy = true;
    thread.currentChunkId = chunk.id;

    // 3. Set up completion handler
    selectedWorker.onmessage = (ev) => {
      thread.busy = false;
      thread.currentChunkId = null;

      if (ev.data.success) {
        self.postMessage({
          type: "JOB_COMPLETE",
          chunkId: chunk.id,
          result: ev.data.result,
          workerId: workerId,
        });
      } else {
        self.postMessage({
          type: "JOB_ERROR",
          chunkId: chunk.id,
          error: ev.data.error,
        });
      }
    };

    // 4. Dispatch to sub-worker
    selectedWorker.postMessage({
      type: chunk.type,
      data: chunk.data,
    });
  }
};

export {};
