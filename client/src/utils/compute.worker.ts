/// <reference lib="webworker" />

// --- CONFIGURATION ---
const LOGICAL_CORES = navigator.hardwareConcurrency || 4;

// --- STATE ---
const threadPool = new Map<
  number,
  { worker: Worker; objectUrl: string; busy: boolean }
>();
let throttleLimit = 0.3; // Default 30%
let nextWorkerId = 0;

// --- GPU KERNEL (WGSL) ---
const WGSL_SHADER = `
@group(0) @binding(0) var<storage, read> matrixA : array<f32>;
@group(0) @binding(1) var<storage, read> matrixB : array<f32>;
@group(0) @binding(2) var<storage, read_write> result : array<f32>;
@group(0) @binding(3) var<uniform> uniforms : vec2<f32>; // [width, height]

@compute @workgroup_size(64)
fn main(@builtin(global_invocation_id) global_id : vec3<u32>) {
  let index = global_id.x;
  let size = u32(uniforms.x);
  
  if (index >= size * size) { return; }

  let row = index / size;
  let col = index % size;
  let sum = 0.0;

  for (var k = 0u; k < size; k = k + 1u) {
    sum = sum + matrixA[row * size + k] * matrixB[k * size + col];
  }

  result[index] = sum;
}
`;

// --- SUB-WORKER FACTORY ---
const createSubWorker = (_wId: number) => {
  const blob = new Blob(
    [
      `
    // --- SHARED STATE ---
    let throttleLevel = 1.0; 

    // --- CPU KERNELS (Fallback) ---
    const runCpuStress = (iterations) => {
      let sum = 0;
      const count = iterations || 100000;
      for (let i = 0; i < count; i++) {
        sum += Math.sqrt(i) * Math.sin(i);
      }
      return sum;
    };

    const runCpuMatrix = (size) => {
       // Simulate CPU load for matrix math
       const totalOps = size * size * size;
       let dummy = 0;
       // Artificial delay to simulate work
       const end = performance.now() + (totalOps / 1000000); 
       while(performance.now() < end) {
         dummy += Math.random();
       }
       return dummy;
    };

    // --- GPU CONTEXT ---
    let device = null;
    let computePipeline = null;
    let gpuReady = false;

    async function initWebGPU() {
      if (!navigator.gpu) return false;
      const adapter = await navigator.gpu.requestAdapter();
      if (!adapter) return false;
      device = await adapter.requestDevice();
      
      const shaderModule = device.createShaderModule({ 
        code: \`${WGSL_SHADER}\` 
      });
      
      computePipeline = device.createComputePipeline({
        layout: 'auto',
        compute: { module: shaderModule, entryPoint: "main" }
      });
      return true;
    }

    initWebGPU().then(ok => gpuReady = ok);

    async function runGpuMatrix(size) {
      if (!gpuReady || !device) return runCpuMatrix(size);

      const matrixSize = size * size;
      const resultSize = matrixSize * 4; 

      // 1. Create & Map Buffers
      // In a real app we would copy data here. For simulation, we assume active VRAM usage.
      const gpuBufferA = device.createBuffer({ size: resultSize, usage: GPUBufferUsage.STORAGE, mappedAtCreation: true });
      new Float32Array(gpuBufferA.getMappedRange()).fill(1.5);
      gpuBufferA.unmap();

      const gpuBufferB = device.createBuffer({ size: resultSize, usage: GPUBufferUsage.STORAGE, mappedAtCreation: true });
      new Float32Array(gpuBufferB.getMappedRange()).fill(2.5);
      gpuBufferB.unmap();

      const resultBuffer = device.createBuffer({ size: resultSize, usage: GPUBufferUsage.STORAGE | GPUBufferUsage.COPY_SRC });
      
      const uniformBuffer = device.createBuffer({ mappedAtCreation: true, size: 16, usage: GPUBufferUsage.UNIFORM });
      new Float32Array(uniformBuffer.getMappedRange()).set([size, size]);
      uniformBuffer.unmap();

      // 2. Bind Group
      const bindGroup = device.createBindGroup({
        layout: computePipeline.getBindGroupLayout(0),
        entries: [
          { binding: 0, resource: { buffer: gpuBufferA } },
          { binding: 1, resource: { buffer: gpuBufferB } },
          { binding: 2, resource: { buffer: resultBuffer } },
          { binding: 3, resource: { buffer: uniformBuffer } },
        ]
      });

      // 3. Dispatch
      const commandEncoder = device.createCommandEncoder();
      const passEncoder = commandEncoder.beginComputePass();
      passEncoder.setPipeline(computePipeline);
      passEncoder.setBindGroup(0, bindGroup);
      passEncoder.dispatchWorkgroups(Math.ceil(matrixSize / 64));
      passEncoder.end();

      device.queue.submit([commandEncoder.finish()]);
      
      // 4. Wait (Fence)
      await device.queue.onSubmittedWorkDone();
      return 1; 
    }

    self.onmessage = async (e) => {
      const { type, data, _throttle } = e.data;
      
      if (_throttle !== undefined) throttleLevel = _throttle;

      let result = 0;

      try {
        if (type === "MAT_MUL") {
             // Use GPU if available
             if (gpuReady && device) {
                 await runGpuMatrix(data.size || 256);
                 result = 1; 
             } else {
                 result = runCpuMatrix(data.size || 256);
             }
        } 
        else if (type === "MATH_STRESS") {
             result = runCpuStress(data.iterations);
        }
        else if (type === "BENCHMARK") {
             const start = performance.now();
             let score = 0;

             // Run a heavy task to measure "raw" performance
             if (gpuReady && device) {
                 await runGpuMatrix(1024); // Heavy GPU Load
                 const duration = (performance.now() - start) / 1000;
                 // Base Score: ~2000-5000 range
                 score = Math.round(2000 / (duration + 0.001));
             } 
             else {
                 runCpuStress(5000000); // Heavy CPU Load
                 const duration = (performance.now() - start) / 1000; 
                 score = Math.round(500 / (duration + 0.001));
             }

             // APPLY THROTTLE SCALING
             // This ensures the UI reflects the user's eco/max choice
             const finalScore = Math.floor(score * throttleLevel);

             self.postMessage({
               type: "BENCHMARK_COMPLETE",
               score: finalScore
             });
             return; 
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

  const objectUrl = URL.createObjectURL(blob);
  return { worker: new Worker(objectUrl), objectUrl };
};

// --- MANAGER: MANAGES THE THREAD POOL ---
const applyConfig = () => {
  // Scale thread count based on throttle
  const targetThreadCount = Math.max(
    1,
    Math.floor(LOGICAL_CORES * throttleLimit),
  );

  // 1. EXPAND POOL
  if (targetThreadCount > threadPool.size) {
    for (let i = threadPool.size; i < targetThreadCount; i++) {
      const wId = nextWorkerId++;
      const { worker, objectUrl } = createSubWorker(wId);

      // Initialize with current throttle
      worker.postMessage({ type: "UPDATE_CONFIG", _throttle: throttleLimit });

      worker.onmessage = (ev) => {
        const msg = ev.data;
        if (msg.type === "BENCHMARK_COMPLETE") {
          self.postMessage(msg); // Forward to main thread
        } else if (msg.success || msg.error) {
          const t = threadPool.get(wId);
          if (t) t.busy = false;
          // We don't have the chunkId here in a generic handler,
          // but the specific job handler below handles the 'JOB_COMPLETE'
        }
      };
      threadPool.set(wId, { worker, objectUrl, busy: false });
    }
  }
  // 2. SHRINK POOL
  else if (targetThreadCount < threadPool.size) {
    const toRemove = threadPool.size - targetThreadCount;
    let removed = 0;
    for (const [id, thread] of threadPool.entries()) {
      if (!thread.busy && removed < toRemove) {
        thread.worker.terminate();
        URL.revokeObjectURL(thread.objectUrl);
        threadPool.delete(id);
        removed++;
      }
    }
  }
};

// Initial Setup
applyConfig();

// --- MAIN LISTENER (From UI Thread) ---
self.onmessage = async (e) => {
  const { type, payload } = e.data;

  // 1. CONFIG UPDATE
  if (type === "CONFIG_UPDATE") {
    throttleLimit = payload.throttle;
    applyConfig();

    // Broadcast new throttle to all sub-workers so benchmarks scale
    threadPool.forEach(({ worker }) => {
      worker.postMessage({ type: "UPDATE_CONFIG", _throttle: throttleLimit });
    });
    return;
  }

  // 2. BENCHMARK TRIGGER
  if (type === "BENCHMARK") {
    // Pick the first available worker to run the benchmark
    const iterator = threadPool.values();
    const first = iterator.next().value;
    if (first) {
      first.worker.postMessage({ type: "BENCHMARK", _throttle: throttleLimit });
    }
    return;
  }

  // 3. JOB EXECUTION
  if (type === "EXECUTE_JOB") {
    // Find free worker
    let selectedId = -1;
    for (const [id, thread] of threadPool.entries()) {
      if (!thread.busy) {
        selectedId = id;
        break;
      }
    }

    if (selectedId === -1) return; // Drop job if all busy (or queue it)

    const jobData = payload; // payload contains the job info

    const thread = threadPool.get(selectedId)!;
    thread.busy = true;

    const originalHandler = thread.worker.onmessage;
    thread.worker.onmessage = (ev) => {
      thread.busy = false;
      thread.worker.onmessage = originalHandler;

      self.postMessage({
        type: ev.data.success ? "JOB_COMPLETE" : "JOB_ERROR",
        chunkId: jobData.id,
        result: ev.data.result,
        error: ev.data.error,
      });
    };

    thread.worker.postMessage({
      type: jobData.type,
      data: jobData.data,
      _throttle: throttleLimit,
    });
  }
};
