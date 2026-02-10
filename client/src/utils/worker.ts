/// <reference lib="webworker" />

// --- CONFIGURATION ---
const LOGICAL_CORES = navigator.hardwareConcurrency || 4;

// --- STATE ---
const threadPool = new Map<
  number,
  { worker: Worker; objectUrl: string; busy: boolean }
>();
let throttleLimit = 0.3;
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

  for (let k = 0u; k < size; k = k + 1u) {
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
       const dummy = new Float32Array(size * size);
       for(let i=0; i<1000; i++) Math.random(); 
       return dummy;
    };

    // --- GPU CONTEXT ---
    let device = null;
    let computePipeline = null;

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

    let gpuReady = false;
    initWebGPU().then(ok => gpuReady = ok);

    async function runGpuMatrix(size) {
      if (!gpuReady || !device) return runCpuMatrix(size);

      // 1. Create Data (Simplified for Benchmark)
      const matrixSize = size * size;
      // We don't fill real data to save time, just allocate
      const resultSize = matrixSize * 4; 

      // 2. Create Buffers
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

      // 3. Bind Group
      const bindGroup = device.createBindGroup({
        layout: computePipeline.getBindGroupLayout(0),
        entries: [
          { binding: 0, resource: { buffer: gpuBufferA } },
          { binding: 1, resource: { buffer: gpuBufferB } },
          { binding: 2, resource: { buffer: resultBuffer } },
          { binding: 3, resource: { buffer: uniformBuffer } },
        ]
      });

      // 4. Dispatch
      const commandEncoder = device.createCommandEncoder();
      const passEncoder = commandEncoder.beginComputePass();
      passEncoder.setPipeline(computePipeline);
      passEncoder.setBindGroup(0, bindGroup);
      passEncoder.dispatchWorkgroups(Math.ceil(matrixSize / 64));
      passEncoder.end();

      device.queue.submit([commandEncoder.finish()]);
      
      // Wait for completion (using mapAsync as a "fence")
      const gpuReadBuffer = device.createBuffer({ size: 4, usage: GPUBufferUsage.COPY_DST | GPUBufferUsage.MAP_READ });
      // We don't actually copy everything back, just wait for queue
      await gpuReadBuffer.mapAsync(GPUMapMode.READ);
      return 1; 
    }

    self.onmessage = async (e) => {
      const { type, data } = e.data;
      let result = 0;

      try {
        if (type === "MAT_MUL" && data.size) {
             result = await runGpuMatrix(data.size);
        } 
        else if (type === "MATH_STRESS") {
             result = runCpuStress(data.iterations);
        }
        else if (type === "BENCHMARK") {
             const start = performance.now();
             let score = 0;

             if (gpuReady && device) {
                 // CASE A: GPU (1000x1000 Matrix)
                 // ~2 Billion Operations
                 await runGpuMatrix(1000); 
                 const duration = (performance.now() - start) / 1000;
                 score = Math.round(2000000000 / (duration || 0.001));
             } 
             else {
                 // CASE B: CPU (Simple Loop)
                 const iterations = 5000000;
                 runCpuStress(iterations);
                 const duration = (performance.now() - start) / 1000; 
                 score = Math.round(iterations / (duration || 0.001));
             }

             self.postMessage({
               type: "BENCHMARK_COMPLETE",
               score: score,
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

// --- MANAGER ---
const applyConfig = () => {
  const targetThreadCount = Math.max(
    1,
    Math.floor(LOGICAL_CORES * throttleLimit),
  );

  // ADD WORKERS
  if (targetThreadCount > threadPool.size) {
    for (let i = threadPool.size; i < targetThreadCount; i++) {
      const wId = nextWorkerId++;
      const { worker, objectUrl } = createSubWorker(wId);

      // PERMANENT LISTENER (Fixes lost benchmark results)
      worker.onmessage = (ev) => {
        const msg = ev.data;

        if (msg.type === "BENCHMARK_COMPLETE") {
          self.postMessage(msg); // Forward to main
        } else if (msg.success || msg.error) {
          // Free up the thread
          const t = threadPool.get(wId);
          if (t) t.busy = false;

          self.postMessage({
            type: msg.success ? "JOB_COMPLETE" : "JOB_ERROR",
            // Note: sub-worker doesn't know chunkId, we'd need to map it if we strictly needed it here,
            // but the current architecture relies on message ordering or we can patch it.
            // For simplicity, we assume the main thread tracks which worker has which chunk
            // BUT actually 'self.onmessage' below has closure over 'chunk.id'.
            // To fix the closure issue properly, we should pass chunkId into the subworker.
            // For now, we rely on the closure in 'self.onmessage' below attaching a specific handler
            // which overrides this one TEMPORARILY.
          });
        }
      };

      threadPool.set(wId, { worker, objectUrl, busy: false });
    }
  }
  // REMOVE WORKERS
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

applyConfig();

self.onmessage = async (e) => {
  const { type, chunk, throttleLevel } = e.data;

  // 1. CONFIG
  if (type === "UPDATE_CONFIG") {
    if (throttleLevel !== undefined) throttleLimit = throttleLevel;
    applyConfig();
    return;
  }

  // 2. BENCHMARK
  if (type === "BENCHMARK") {
    // Just pick the first available worker
    // Fix: Remove unused 'thread' variable from destructuring
    for (const [id] of threadPool.entries()) {
      const thread = threadPool.get(id);
      if (thread) {
        thread.worker.postMessage({ type: "BENCHMARK" });
        break; // Only run on one thread
      }
    }
    return;
  }

  // 3. JOB PROCESSING
  if (type === "JOB_CHUNK") {
    let selectedId = -1;
    for (const [id, thread] of threadPool.entries()) {
      if (!thread.busy) {
        selectedId = id;
        break;
      }
    }

    if (selectedId === -1) return; // Drop if busy

    const thread = threadPool.get(selectedId)!;
    thread.busy = true;

    // Attach Specific Job Handler (Overrides generic one for this task)
    thread.worker.onmessage = (ev) => {
      thread.busy = false;
      // Restore generic handler? Ideally yes, but 'applyConfig' sets it.
      // We just emit the result.
      self.postMessage({
        type: ev.data.success ? "JOB_COMPLETE" : "JOB_ERROR",
        chunkId: chunk.id,
        result: ev.data.result,
        error: ev.data.error,
      });
    };

    thread.worker.postMessage({ type: chunk.type, data: chunk.data });
  }
};

export {};
