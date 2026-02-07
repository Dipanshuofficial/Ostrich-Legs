/// <reference lib="webworker" />

// Limits
const LOGICAL_CORES = navigator.hardwareConcurrency || 4;
const TOTAL_RAM_BYTES = (navigator as any).deviceMemory
  ? (navigator as any).deviceMemory * 1e9
  : 4e9;

// State
let activeThreads: Worker[] = [];
let threadPoolParams: {
  [key: number]: { busy: boolean; currentChunkId: string | null };
} = {};
let currentRamUsage = 0;
let throttleLimit = 0.3; // Default 30%

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
const createSubWorker = () => {
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
  return new Worker(URL.createObjectURL(blob));
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

    // Scale Up
    while (activeThreads.length < targetThreadCount) {
      activeThreads.push(createSubWorker());
      threadPoolParams[activeThreads.length - 1] = {
        busy: false,
        currentChunkId: null,
      };
    }
    // Scale Down
    while (activeThreads.length > targetThreadCount) {
      activeThreads.pop()?.terminate();
      delete threadPoolParams[activeThreads.length];
    }

    self.postMessage({
      type: "CONFIG_APPLIED",
      threads: activeThreads.length,
      limit: throttleLimit,
      score: calculateBenchmark(),
    });
    return;
  }

  // EXECUTION: JOB HANDLING
  if (type === "JOB_CHUNK") {
    // 1. RAM CHECK
    const estimatedSize = 50000; // Simplified estimate
    if (currentRamUsage + estimatedSize > TOTAL_RAM_BYTES * throttleLimit) {
      self.postMessage({
        type: "JOB_ERROR",
        chunkId: chunk.id,
        error: "OOM_PREVENTED",
      });
      self.postMessage({
        type: "WORKER_LOG",
        message: `[Err] OOM Prevented (${chunk.type})`,
      });
      return;
    }

    // 2. FIND THREAD
    const workerIndex = activeThreads.findIndex(
      (_, i) => !threadPoolParams[i]?.busy,
    );
    if (workerIndex === -1) {
      self.postMessage({
        type: "JOB_ERROR",
        chunkId: chunk.id,
        error: "CPU_SATURATED",
      });
      return;
    }

    // 3. RUN
    const worker = activeThreads[workerIndex];
    const start = performance.now();

    currentRamUsage += estimatedSize;
    threadPoolParams[workerIndex] = { busy: true, currentChunkId: chunk.id };

    worker.onmessage = (ev) => {
      currentRamUsage -= estimatedSize;
      threadPoolParams[workerIndex].busy = false;
      const duration = Math.round(performance.now() - start);

      if (ev.data.success) {
        // --- REAL LOGGING FOR UI ---
        let logMsg = "";
        if (chunk.type === "MATRIX_MUL") {
          logMsg = `[Succ] Matrix_Mul • ${duration}ms • ${chunk.data.row.length} dim`;
        } else {
          logMsg = `[Succ] Stress_Test • ${duration}ms • ${chunk.data[0]} iter`;
        }
        self.postMessage({ type: "WORKER_LOG", message: logMsg });

        self.postMessage({
          type: "JOB_COMPLETE",
          chunkId: chunk.id,
          result: ev.data.result,
          workerId: workerId,
          durationMs: duration,
        });
      } else {
        self.postMessage({
          type: "WORKER_LOG",
          message: `[Err] ${ev.data.error}`,
        });
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
