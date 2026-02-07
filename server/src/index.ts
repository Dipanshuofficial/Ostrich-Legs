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
  transports: ["websocket", "polling"], // Support both for mobile/Colab compatibility
});

// Initialize Swarm Coordinator
const swarm = new SwarmCoordinator(io, {
  enableWorkStealing: true,
  enableHealthChecks: true,
  autoRebalance: true,
});

// Generate initial join code
const initialJoinCode = swarm.generateJoinCode({
  maxUses: 1000,
  metadata: {
    description: "Default swarm join code",
    tags: ["general"],
  },
});
console.log(`[Server] Initial join code: ${initialJoinCode}`);

// REST API Endpoints

// Get swarm statistics
app.get("/api/stats", (req, res) => {
  res.json(swarm.getStats());
});

// Get all connected devices
app.get("/api/devices", (req, res) => {
  res.json(swarm.getDevices());
});

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
app.get("/api/jobs/status", (req, res) => {
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

  // Device Registration
  socket.on(
    "REGISTER_DEVICE",
    (data: {
      name?: string;
      type?: DeviceType;
      capabilities?: DeviceCapabilities;
      opsScore?: number;
      joinCode?: string;
    }) => {
      // Validate join code if provided
      if (data.joinCode) {
        const validation = swarm.validateJoinCode(data.joinCode);
        if (!validation.valid) {
          socket.emit("REGISTRATION_FAILED", { error: validation.error });
          return;
        }
        swarm.useJoinCode(data.joinCode);
      }

      // Register device
      const device = swarm.registerDevice(socket.id, {
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

      console.log(
        `[Socket] Device registered: ${device.name} (${device.type})`,
      );
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
      // Matrix multiplication job
      const size = 200 + Math.floor(Math.random() * 100);
      jobs.push({
        id: `mat-${Date.now()}-${i}`,
        type: "MAT_MUL",
        data: {
          size,
          matrixA: Array(size)
            .fill(0)
            .map(() =>
              Array(size)
                .fill(0)
                .map(() => Math.random()),
            ),
          matrixB: Array(size)
            .fill(0)
            .map(() =>
              Array(size)
                .fill(0)
                .map(() => Math.random()),
            ),
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
          iterations: 2000000 + Math.floor(Math.random() * 1000000),
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
  const PORT = process.env.PORT || 3000;
  httpServer.listen(PORT, () => {
    console.log(`[Server] Ostrich Swarm Coordinator running on port: ${PORT}`);
    console.log(
      `[Server] Join URL: http://localhost:${PORT}/join/${initialJoinCode}`,
    );
  });
} catch (e) {
  console.error("[Server] Failed to start:", e);
}
