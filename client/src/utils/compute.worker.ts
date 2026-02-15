/// <reference lib="webworker" />

import { MAX_SAFE_THROTTLE_PERCENT } from "../core/constants";

const TOTAL_CORES = navigator.hardwareConcurrency || 4;
const RESERVED_CORES = TOTAL_CORES > 8 ? 2 : 1;
const LOGICAL_CORES = Math.max(1, TOTAL_CORES - RESERVED_CORES);

const threadPool = new Map();
let throttleLimit = 0.3;
let nextWorkerId = 0;

const WGSL_SHADER = `
@group(0) @binding(0) var<storage, read> matrixA : array<f32>;
@group(0) @binding(1) var<storage, read> matrixB : array<f32>;
@group(0) @binding(2) var<storage, read_write> result : array<f32>;
@group(0) @binding(3) var<uniform> uniforms : vec2<f32>;

@compute @workgroup_size(64)
fn main(@builtin(global_invocation_id) global_id : vec3<u32>) {
  let index = global_id.x;
  let size = u32(uniforms.x);
  if (index >= size * size) { return; }
  let row = index / size;
  let col = index % size;
  var sum = 0.0;
  for (var k = 0u; k < size; k = k + 1u) {
    sum = sum + matrixA[row * size + k] * matrixB[k * size + col];
  }
  result[index] = sum;
}
`;

const createSubWorker = (_wId: number) => {
  // CRITICAL: This block MUST be pure Vanilla JS. No TS 'as' or types.
  const code = `
    let device = null;
    let computePipeline = null;
    let gpuReady = false;

    const runCpuStress = (iterations) => {
      let sum = 0;
      for (let i = 0; i < (iterations || 100000); i++) {
        sum += Math.sqrt(i) * Math.sin(i);
      }
      return sum;
    };

    async function initWebGPU() {
      if (!navigator.gpu) return false;
      try {
        const adapter = await navigator.gpu.requestAdapter();
        if (!adapter) return false;
        device = await adapter.requestDevice();
        const shaderModule = device.createShaderModule({ code: \`${WGSL_SHADER}\` });
        computePipeline = device.createComputePipeline({
          layout: 'auto',
          compute: { module: shaderModule, entryPoint: "main" }
        });
        return true;
      } catch(e) { return false; }
    }

    const initPromise = initWebGPU().then(ok => {
      gpuReady = ok;
      self.postMessage({ type: "WORKER_LOG", level: "GPU", message: ok ? "WebGPU Kernel Ready" : "WebGPU Init Failed: Using CPU Fallback" });
    });

    self.onmessage = async (e) => {
      await initPromise;
      const { type, payload } = e.data;

      if (type === "EXECUTE_JOB") {
        const start = performance.now();
        let result = 0;
        try {
          // Actual math execution
          result = runCpuStress(payload.data?.iterations || 100000);
          self.postMessage({ type: "JOB_COMPLETE", chunkId: payload.id, result, durationMs: performance.now() - start });
          
          
        } catch (err) {
          self.postMessage({ type: "JOB_ERROR", chunkId: payload.id, error: err.message });
        }
      }

      if (type === "BENCHMARK") {
        const start = performance.now();
        runCpuStress(1000000);
        const score = Math.round(1000 / ((performance.now() - start) / 1000));
        self.postMessage({ type: "BENCHMARK_COMPLETE", score });
      }
    };
  `;
  const blob = new Blob([code], { type: "application/javascript" });
  const objectUrl = URL.createObjectURL(blob);
  const worker = new Worker(objectUrl);

  // Cleanup the URL immediately after the worker is initialized to free memory
  // The worker remains active as the browser has already loaded the script
  URL.revokeObjectURL(objectUrl);

  return { worker, objectUrl: "" }; // objectUrl no longer needed
};

const applyConfig = () => {
  const safeThrottle = Math.min(throttleLimit, MAX_SAFE_THROTTLE_PERCENT / 100);
  const target = Math.max(1, Math.floor(LOGICAL_CORES * safeThrottle));

  if (target > threadPool.size) {
    for (let i = threadPool.size; i < target; i++) {
      const wId = nextWorkerId++;
      const { worker } = createSubWorker(wId);
      worker.onmessage = (ev) => self.postMessage(ev.data);
      threadPool.set(wId, { worker, busy: false });
    }
  } else if (target < threadPool.size) {
    const toRemove = Array.from(threadPool.entries())
      .filter(([, data]) => !data.busy)
      .slice(0, threadPool.size - target);

    toRemove.forEach(([id, data]) => {
      data.worker.terminate();
      threadPool.delete(id);
    });
  }
};

self.onmessage = (e) => {
  const { type, payload } = e.data;
  if (type === "CONFIG_UPDATE") {
    throttleLimit = payload.throttle;
    applyConfig();
    return;
  }

  // Find free worker
  const workers = Array.from(threadPool.values());
  const freeWorker = workers.find((t) => !t.busy) || workers[0]; // Fallback to first if all busy

  if (freeWorker) {
    if (type === "EXECUTE_JOB") freeWorker.busy = true;
    const originalHandler = freeWorker.worker.onmessage;
    freeWorker.worker.onmessage = (ev: any) => {
      freeWorker.busy = false;
      freeWorker.worker.onmessage = originalHandler;
      self.postMessage(ev.data);
    };
    freeWorker.worker.postMessage({ type, payload });
  }
};
