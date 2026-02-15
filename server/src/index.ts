import { Server } from "socket.io";
import { DeviceManager } from "./managers/DeviceManager";
import { JobScheduler } from "./managers/JobScheduler";
import { AuthManager } from "./managers/AuthManager";
import { type SwarmSnapshot } from "./core/types";
import { SocketEvents } from "@shared/socket/events";
import { type LogLevel, type SystemLogPayload } from "@shared/socket/states";

const io = new Server(3000, {
  cors: { origin: "*" },
  transports: ["websocket", "polling"],
});

const deviceManager = new DeviceManager();
const jobScheduler = new JobScheduler();
const authManager = new AuthManager();

const activeSwarmIds = new Set<string>();
const swarmStates = new Map<string, SwarmSnapshot["runState"]>();
const swarmCompletedCounts = new Map<string, number>();
const swarmThrottles = new Map<string, number>();

/**
 * Global System Logger
 * Broadcasts to terminal and server console
 */
const systemLog = (
  swarmId: string,
  level: LogLevel,
  message: string,
  source: string = "CORE",
) => {
  const payload: SystemLogPayload = {
    level,
    message,
    timestamp: Date.now(),
    source,
  };
  io.to(swarmId).emit(SocketEvents.SYSTEM_LOG, payload);
};

// Auth Middleware (as we fixed in Phase 0)
// server/src/index.ts

io.use((socket, next) => {
  const token = socket.handshake.auth.token || socket.handshake.query.token;
  const persistentId = socket.handshake.query.persistentId as string;

  if (!persistentId) return next(new Error("MISSING_PERSISTENT_ID"));

  // Master Mode: No token provided or token is empty
  const isEmptyToken =
    !token || token === "null" || token === "undefined" || token === "";

  if (isEmptyToken) {
    socket.data.swarmId = persistentId; // Host joins their own swarm
    return next();
  }

  // Worker Mode: Validate the invite code against active sessions
  const targetSwarm = authManager.validateToken(token as string);

  if (targetSwarm) {
    socket.data.swarmId = targetSwarm; // Restore joined membership
    return next();
  }

  // Reject connection if the token is invalid or expired
  return next(new Error("JOIN_CODE_INVALID"));
});

io.on("connection", (socket) => {
  const persistentId = socket.handshake.query.persistentId as string;
  const swarmId = socket.data.swarmId;
  activeSwarmIds.add(swarmId);

  socket.join(swarmId);
  systemLog(
    swarmId,
    "NET",
    `Socket connected: ${persistentId.slice(0, 8)}`,
    "GATEWAY",
  );

  // Protocol: Registration
  socket.on(SocketEvents.DEVICE_REGISTER, (data) => {
    deviceManager.register(persistentId, data.name, data.capabilities, swarmId);
    // FIX: Register device in scheduler to initialize quotas
    const device = deviceManager.getDevice(persistentId);
    if (device) jobScheduler.registerDevice(device);

    systemLog(swarmId, "SYS", `Node Registered: ${data.name}`, "AUTH");
    deviceManager.heartbeat(persistentId);
    broadcastState(swarmId);
  });

  // Protocol: Heartbeat
  socket.on(SocketEvents.HEARTBEAT, (data) => {
    deviceManager.heartbeat(persistentId, data);
  });

  // Protocol: Job Pipeline
  socket.on(SocketEvents.JOB_REQUEST_BATCH, () => {
    const currentState = swarmStates.get(swarmId);
    const device = deviceManager.getDevice(persistentId);

    if (!device || device.status === "OFFLINE" || currentState !== "RUNNING")
      return;

    // FIX: Use the new batch distribution method
    const batch = jobScheduler.getJobBatchForDevice(device, 10); // Requesting larger batches for high-perf

    if (batch.length > 0) {
      socket.emit(SocketEvents.JOB_BATCH_DISPATCH, batch);
    }
  });

  socket.on(SocketEvents.JOB_COMPLETE, (payload) => {
    // FIX: Release the job slot in the scheduler regardless of success/error
    jobScheduler.releaseJobSlot(persistentId);
    if (!payload.error) {
      swarmCompletedCounts.set(
        swarmId,
        (swarmCompletedCounts.get(swarmId) || 0) + 1,
      );
      const device = deviceManager.getDevice(persistentId);
      if (device) device.totalJobsCompleted++;
    } else {
      systemLog(
        swarmId,
        "ERR",
        `Job ${payload.chunkId} failed on ${persistentId}`,
        "COMPUTE",
      );
    }
  });

  // --- ADD THIS HANDLER ---
  socket.on("auth:generate_token", (callback: (token: string) => void) => {
    try {
      const token = authManager.generateToken(swarmId);
      if (!token) {
        systemLog(
          swarmId,
          "WARN",
          "Invite code generation rate limited (5/min)",
          "AUTH",
        );
        callback("");
        return;
      }
      systemLog(swarmId, "SYS", `Generated new invite code: ${token}`, "AUTH");
      callback(token);
    } catch (err) {
      console.error("Token generation error:", err);
      callback("");
    }
  });
  // Swarm Controls
  socket.on(SocketEvents.SWARM_SET_STATE, (state) => {
    swarmStates.set(swarmId, state);
    systemLog(swarmId, "SYS", `Swarm state changed to ${state}`, "MASTER");
    broadcastState(swarmId);
  });

  socket.on(SocketEvents.SWARM_SET_THROTTLE, (val) => {
    swarmThrottles.set(swarmId, val);
    io.to(swarmId).emit(SocketEvents.SWARM_THROTTLE_SYNC, val);
  });

  socket.on(SocketEvents.BENCHMARK_RESULT, (data) => {
    deviceManager.updateScore(persistentId, data.score);
    systemLog(
      swarmId,
      "CPU",
      `Benchmark: ${data.score.toLocaleString()} OPS`,
      persistentId,
    );
    const device = deviceManager.getDevice(persistentId);
    if (device) jobScheduler.registerDevice(device);
    broadcastState(swarmId);
  });

  // --- ADD THIS HANDLER TO THE SERVER ---
  socket.on(
    "cmd:toggle_device",
    ({ id, enabled }: { id: string; enabled: boolean }) => {
      deviceManager.toggleDevice(id, enabled);

      systemLog(
        swarmId,
        enabled ? "SYS" : "WARN",
        `Node ${id.slice(0, 8)} was ${enabled ? "enabled" : "disabled"} by Master`,
        "ORCHESTRATOR",
      );

      // Force update to all nodes so the UI updates immediately
      broadcastState(swarmId);
    },
  );

  // --- ADD THIS HANDLER FOR THE GENERATOR ---

  socket.on("disconnect", () => {
    // Check if room is empty before removing swarmId from broadcaster
    const room = io.sockets.adapter.rooms.get(swarmId);
    if (!room || room.size === 0) {
      activeSwarmIds.delete(swarmId);
    }
    systemLog(
      swarmId,
      "NET",
      `Node offline: ${persistentId.slice(0, 8)}`,
      "GATEWAY",
    );
  });
});

/**
 * Single Global Snapshot Loop
 * Prevents interval leaks
 */
let broadcastDebounce: NodeJS.Timeout | null = null;

function broadcastState(swarmId: string) {
  if (broadcastDebounce) clearTimeout(broadcastDebounce);

  broadcastDebounce = setTimeout(() => {
    const resources = deviceManager.getAvailableResources(swarmId);
    const queue = jobScheduler.getQueueStats();
    const allDevices = deviceManager.getDevicesBySwarm(swarmId);
    const currentState = swarmStates.get(swarmId) || "STOPPED";
    const completedCount = swarmCompletedCounts.get(swarmId) || 0;
    const currentThrottle = swarmThrottles.get(swarmId) || 40;

    const totalOpsScore = allDevices
      .filter((d) => d.status !== "OFFLINE" && d.status !== "DISABLED")
      .reduce((sum, d) => sum + (d.opsScore || 0), 0);

    const snapshot: SwarmSnapshot = {
      runState: currentState,
      devices: allDevices.reduce((acc, d) => ({ ...acc, [d.id]: d }), {}),
      stats: {
        totalJobs: completedCount + queue.pending,
        activeJobs: currentState === "RUNNING" ? resources.onlineCount : 0,
        pendingJobs: queue.pending,
        completedJobs: completedCount,
        globalVelocity:
          currentState === "RUNNING"
            ? Math.round(totalOpsScore * (currentThrottle / 100))
            : 0,
        globalThrottle: currentThrottle,
      },
      resources,
    };

    io.to(swarmId).emit(SocketEvents.SWARM_SNAPSHOT, snapshot);
  }, 50);
}

// Tick all active swarms every 2s
setInterval(() => {
  activeSwarmIds.forEach((id) => {
    // Only broadcast if there are actually sockets in that room
    const room = io.sockets.adapter.rooms.get(id);
    if (room && room.size > 0) {
      broadcastState(id);
    } else {
      activeSwarmIds.delete(id);
    }
  });
}, 2000);
// Periodic Weight Recalculation (Every 10s)
// Re-calculates device weights based on live benchmark (opsScore) averages
setInterval(() => {
  activeSwarmIds.forEach((swarmId) => {
    const devices = deviceManager.getDevicesBySwarm(swarmId);
    devices.forEach((d) => {
      if (d.status !== "OFFLINE" && d.status !== "DISABLED") {
        jobScheduler.registerDevice(d);
      }
    });
  });
}, 10000);
console.log("🚀 Ostrich Swarm Coordinator [PHASE 2] Online");
