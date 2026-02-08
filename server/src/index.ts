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
const io = new Server(httpServer, {
  cors: { origin: "*", methods: ["GET", "POST"] },
  transports: ["websocket", "polling"],
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

// REST API Endpoints

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

// Submit jobs via REST API (for Colab/batch processing)
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
  // Access scheduler metrics through coordinator
  const stats = swarm.getStats();
  res.json({
    pending: stats.pendingJobs,
    active: stats.activeJobs,
    completed: stats.completedJobs,
    failed: stats.failedJobs,
  });
});

// Socket.IO Handlers
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
      id: string; // <--- ADDED THIS
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

      // 2. FIX: Pass the ID to the coordinator
      const device = swarm.registerDevice(socket.id, {
        id: data.id, // <--- CRITICAL FIX: Pass persistent ID
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

      // Broadcast to everyone so dashboards update immediately
      io.emit("CURRENT_DEVICES", swarm.getDevices());
    },
  );

  // Work Requests
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

  // Job Completion
  socket.on("JOB_COMPLETE", (result: WorkerResult) => {
    if (!deviceId) return;

    result.deviceId = deviceId;
    result.timestamp = Date.now();

    swarm.completeJob(result);
    socket.emit("WORK_ACK", { chunkId: result.chunkId });
  });

  // Work Stealing
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
  // NEW: Handle Device Toggling
  socket.on("TOGGLE_DEVICE", (data: { deviceId: string; enabled: boolean }) => {
    const device = swarm.getDevice(data.deviceId);
    if (device) {
      // @ts-ignore - Accessing registry directly for speed, or add method to SwarmCoordinator
      swarm["registry"].toggleDevice(data.deviceId, data.enabled);

      // Broadcast update to everyone immediately
      io.emit("DEVICE_UPDATED", device);
      io.emit("CURRENT_DEVICES", swarm.getDevices()); // Refresh lists

      console.log(
        `[Swarm] Device ${device.name} ${data.enabled ? "ENABLED" : "DISABLED"}`,
      );
    }
  });

  // Health & Monitoring
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

      // Update load
      swarm["registry"].updateLoad(deviceId, health.currentLoad);
    },
  );

  socket.on("BENCHMARK_RESULT", (data: { opsScore: number }) => {
    if (!deviceId) return;

    swarm.updateDeviceStats(deviceId, { opsScore: data.opsScore });
  });

  // Throttling
  socket.on("UPDATE_THROTTLE", (data: { level: number }) => {
    if (!deviceId) return;

    const device = swarm.getDevice(deviceId);
    if (device) {
      device.throttleLevel = data.level;
      device.isThrottled = data.level < 1.0;
    }
  });

  // Disconnection
  socket.on("disconnect", () => {
    if (deviceId) {
      swarm.unregisterDevice(deviceId);
      console.log(`[Socket] Device disconnected: ${deviceId}`);
    }
  });
});

// Swarm Event Listeners
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

// Job Generator - Keep the queue full with sample jobs
function generateSampleJobs(count: number = 50): void {
  const jobs: JobChunk[] = [];

  for (let i = 0; i < count; i++) {
    const isMatrix = Math.random() > 0.5;

    if (isMatrix) {
      // FIX: Generate a proper Matrix Multiplication Job (Row x Matrix)
      // The worker expects 'row' (1D array) and 'matrixB' (2D array)
      const size = 100; // Keep size manageable for demo
      const matrixB = Array(size)
        .fill(0)
        .map(() => Array(size).fill(Math.random()));
      const row = Array(size).fill(Math.random());

      jobs.push({
        id: `mat-${Date.now()}-${i}`,
        type: "MAT_MUL",
        data: {
          row: row, // <--- Passed correctly as a single row
          matrixB: matrixB,
        },
        status: "PENDING",
        createdAt: Date.now(),
      });
    } else {
      // Math stress job
      jobs.push({
        id: `stress-${Date.now()}-${i}`,
        type: "MATH_STRESS",
        data: {
          // Keep iterations lower to prevent browser lockup during stress test
          iterations: 1000000 + Math.floor(Math.random() * 500000),
        },
        status: "PENDING",
        createdAt: Date.now(),
      });
    }
  }

  swarm.submitBatch(jobs);
  console.log(`[Generator] Generated ${count} sample jobs`);
}

// Generate initial jobs
setTimeout(() => generateSampleJobs(100), 1000);

// Auto-refill jobs when queue is low
setInterval(() => {
  const stats = swarm.getStats();
  if (stats.pendingJobs < 50) {
    generateSampleJobs(50);
  }
}, 30000);

// Start server
try {
  const PORT = Number(process.env.PORT) || 3000;

  // CHANGE: Added "0.0.0.0" as the second argument
  httpServer.listen(PORT, "0.0.0.0", () => {
    console.log(`[Server] Ostrich Swarm Coordinator running on port: ${PORT}`);
    console.log(`[Server] Local: http://localhost:${PORT}`);
  });
} catch (e) {
  console.error("[Server] Failed to start:", e);
}
