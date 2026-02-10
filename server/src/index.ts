// server/src/index.ts

console.log("Starting Ostrich Swarm Coordinator...");

import express from "express";
import { createServer } from "http";
import { Server } from "socket.io";
import cors from "cors";
import { SwarmCoordinator } from "./swarm";
import {
  type JobChunk,
  type WorkerResult,
  type DeviceInfo,
  type DeviceType,
  type DeviceCapabilities,
} from "../../shared/types";

const app = express();
app.use(cors());
app.use(express.json());

const httpServer = createServer(app);
// Find this section around line 23
// Replace the io initialization block:

const io = new Server(httpServer, {
  cors: { origin: "*", methods: ["GET", "POST"] },
  transports: ["websocket", "polling"],

  // FIX 2: Connection Hardening
  maxHttpBufferSize: 1e8, // 100 MB (Cloudflare limit usually around 100MB)
  pingTimeout: 120000, // 2 minutes (Account for slow tunnel latencies)
  pingInterval: 25000, // 25 seconds
});

const swarm = new SwarmCoordinator(io, {
  enableWorkStealing: true,
  enableHealthChecks: true,
  autoRebalance: true,
});

const initialJoinCode = swarm.generateJoinCode({
  maxUses: 1000,
  metadata: { description: "Default swarm join code" },
});
console.log(`[Server] Initial join code: ${initialJoinCode}`);

// --- REST API Endpoints ---

// Get swarm statistics
app.get("/api/stats", (_, res) => res.json(swarm.getStats()));
app.get("/api/devices", (_, res) => res.json(swarm.getDevices()));

// Generate new join code
app.post("/api/join-codes", (req, res) => {
  const { maxUses, expiresIn, description } = req.body;
  const code = swarm.generateJoinCode({
    maxUses,
    expiresIn,
    metadata: { description },
  });
  res.json({ code, url: `/join/${code}` });
});

// Validate join code
app.get("/api/join-codes/:code", (req, res) => {
  const result = swarm.validateJoinCode(req.params.code);
  res.json(result);
});

// Submit jobs via REST API
app.post("/api/jobs", (req, res) => {
  const jobs: JobChunk[] = req.body.jobs;

  if (!Array.isArray(jobs)) {
    res.status(400).json({ error: "Jobs must be an array" });
    return;
  }

  jobs.forEach((job) => {
    job.id =
      job.id ||
      `job-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`;
    swarm.submitJob(job);
  });

  res.json({
    submitted: jobs.length,
    jobIds: jobs.map((j) => j.id),
  });
});

// Get job queue status
app.get("/api/jobs/status", (_, res) => {
  const stats = swarm.getStats();
  res.json({
    pending: stats.pendingJobs,
    active: stats.activeJobs,
    completed: stats.completedJobs,
    failed: stats.failedJobs,
  });
});

// --- Socket.IO Handlers ---

io.on("connection", (socket) => {
  console.log(`[Socket] New connection: ${socket.id}`);

  let deviceId: string | null = null;

  // Send join code on request
  socket.on("REQUEST_JOIN_CODE", () => {
    socket.emit("JOIN_CODE", { code: initialJoinCode });
  });

  socket.on(
    "REGISTER_DEVICE",
    (data: {
      id: string;
      name?: string;
      type?: DeviceType;
      capabilities?: DeviceCapabilities;
      opsScore?: number;
      joinCode?: string;
    }) => {
      // Join Code Validation
      if (data.joinCode) {
        const validation = swarm.validateJoinCode(data.joinCode);
        if (!validation.valid) {
          socket.emit("REGISTRATION_FAILED", { error: validation.error });
          return;
        }
        swarm.useJoinCode(data.joinCode);
      }

      const device = swarm.registerDevice(socket.id, {
        id: data.id,
        name: data.name,
        type: data.type || "DESKTOP",
        capabilities: data.capabilities,
        opsScore: data.opsScore,
      });

      deviceId = device.id;

      socket.emit("REGISTERED", {
        deviceId: device.id,
        swarmStats: swarm.getStats(),
      });

      io.emit("CURRENT_DEVICES", swarm.getDevices());
    },
  );

  socket.on("REQUEST_WORK", () => {
    if (!deviceId) {
      socket.emit("ERROR", { message: "Device not registered" });
      return;
    }
    const job = swarm.requestWork(deviceId);
    if (job) {
      socket.emit("JOB_DISPATCH", job);
    } else {
      socket.emit("NO_WORK");
    }
  });

  socket.on("REQUEST_BATCH", (count: number) => {
    if (!deviceId) {
      socket.emit("ERROR", { message: "Device not registered" });
      return;
    }
    const jobs = swarm.requestBatch(deviceId, count);
    if (jobs.length > 0) {
      socket.emit("BATCH_DISPATCH", jobs);
    } else {
      socket.emit("NO_WORK");
    }
  });

  socket.on("JOB_COMPLETE", (result: WorkerResult) => {
    if (!deviceId) return;
    result.deviceId = deviceId;
    result.timestamp = Date.now();
    swarm.completeJob(result);
    socket.emit("WORK_ACK", { chunkId: result.chunkId });
  });

  socket.on("STEAL_WORK", () => {
    if (!deviceId) return;
    const stolen = swarm.stealWork(deviceId);
    if (stolen.length > 0) {
      socket.emit("BATCH_DISPATCH", stolen);
    }
  });

  socket.on("OFFER_WORK", () => {
    if (!deviceId) return;
    const jobs = swarm.offerWork(deviceId);
    if (jobs.length > 0) {
      socket.emit("WORK_OFFLOADED", jobs);
    }
  });

  socket.on("TOGGLE_DEVICE", (data: { deviceId: string; enabled: boolean }) => {
    const device = swarm.getDevice(data.deviceId);
    if (device) {
      // Fix: Use public method (added below in SwarmCoordinator fix)
      swarm.toggleDevice(data.deviceId, data.enabled);

      io.emit("DEVICE_UPDATED", device);
      io.emit("CURRENT_DEVICES", swarm.getDevices());

      console.log(
        `[Swarm] Device ${device.name} [${device.type}] ${data.enabled ? "ENABLED" : "DISABLED"}`,
      );

      // Trigger redistribution if disabling a busy device
      if (!data.enabled && device.currentLoad > 0) {
        // Fix: Use public method
        setImmediate(() => swarm.triggerJobAssignment());
      }
    }
  });

  socket.on("UPDATE_SWARM_THROTTLE", (data: { throttleLevel: number }) => {
    console.log(
      `[Swarm] Global throttle updated to ${Math.round(data.throttleLevel * 100)}%`,
    );
    io.emit("SWARM_THROTTLE_UPDATE", { throttleLevel: data.throttleLevel });
  });

  socket.on(
    "HEARTBEAT",
    (health: {
      cpuUsage: number;
      memoryUsage: number;
      temperature?: number;
      networkLatency: number;
      currentLoad: number;
    }) => {
      if (!deviceId) return;
      swarm.recordHeartbeat(deviceId, {
        deviceId,
        timestamp: Date.now(),
        cpuUsage: health.cpuUsage,
        memoryUsage: health.memoryUsage,
        temperature: health.temperature,
        networkLatency: health.networkLatency,
        isHealthy: health.cpuUsage < 95 && health.memoryUsage < 90,
      });
      swarm.updateDeviceLoad(deviceId, health.currentLoad);
    },
  );

  socket.on("BENCHMARK_RESULT", (data: { opsScore: number }) => {
    if (!deviceId) return;
    swarm.updateDeviceStats(deviceId, { opsScore: data.opsScore });
  });

  socket.on("UPDATE_THROTTLE", (data: { level: number }) => {
    if (!deviceId) return;
    const device = swarm.getDevice(deviceId);
    if (device) {
      device.throttleLevel = data.level;
      device.isThrottled = data.level < 1.0;
    }
  });

  // Pass ONLY the socket.id. Do NOT rely on a local closure 'deviceId' variable.
  socket.on("disconnect", (reason) => {
    swarm.unregisterDevice(socket.id);
    console.log(`[Socket] Disconnected: ${socket.id} | Reason: ${reason}`);
  });
});

// --- Swarm Event Listeners ---

swarm.on("deviceJoined", (device: DeviceInfo) => {
  io.emit("DEVICE_JOINED", device);
});

swarm.on("deviceLeft", (deviceId: string) => {
  io.emit("DEVICE_LEFT", { deviceId });
});

swarm.on("jobAssigned", (job: JobChunk, deviceId: string) => {
  console.log(`[Swarm] Job ${job.id} assigned to ${deviceId}`);
});

swarm.on("workStolen", (jobs: JobChunk[], from: string, to: string) => {
  console.log(`[Swarm] Work stolen: ${jobs.length} jobs from ${from} to ${to}`);
});

// --- Job Generator ---

function generateSampleJobs(count: number = 50): void {
  const jobs: JobChunk[] = [];

  for (let i = 0; i < count; i++) {
    const isMatrix = Math.random() > 0.5;

    if (isMatrix) {
      // REDUCE SIZE: Was 50 or 300, try 30 for stability
      const size = 30;
      jobs.push({
        id: `mat-${Date.now()}-${i}`,
        type: "MAT_MUL",
        data: { size },
        status: "PENDING",
        createdAt: Date.now(),
      });
    } else {
      jobs.push({
        id: `stress-${Date.now()}-${i}`,
        type: "MATH_STRESS",
        data: {
          // REDUCE ITERATIONS: Was 200k+, try 50k
          iterations: 50000,
        },
        status: "PENDING",
        createdAt: Date.now(),
      });
    }
  }
  // ...

  swarm.submitBatch(jobs);
  console.log(`[Generator] Generated ${count} sample jobs`);
}

// Generate initial jobs
setTimeout(() => generateSampleJobs(100), 1000);

// Auto-refill jobs
setInterval(() => {
  const stats = swarm.getStats();
  if (stats.pendingJobs < 100) {
    generateSampleJobs(200);
  }
}, 5000);

// Start server
try {
  const PORT = Number(process.env.PORT) || 3000;
  httpServer.listen(PORT, "0.0.0.0", () => {
    console.log(`[Server] Ostrich Swarm Coordinator running on port: ${PORT}`);
    console.log(`[Server] Local: http://localhost:${PORT}`);
  });
} catch (e) {
  console.error("[Server] Failed to start:", e);
}
