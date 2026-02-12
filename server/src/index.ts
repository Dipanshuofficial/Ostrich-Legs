import { Server } from "socket.io";
import { DeviceManager } from "./managers/DeviceManager";
import { JobScheduler } from "./managers/JobScheduler";
import { AuthManager } from "./managers/AuthManager";
import { type SwarmSnapshot } from "./core/types";

const io = new Server(3000, {
  cors: { origin: "*" },
  transports: ["websocket", "polling"],
});

const deviceManager = new DeviceManager();
const jobScheduler = new JobScheduler();
const authManager = new AuthManager();

const swarmStates = new Map<string, SwarmSnapshot["runState"]>();
const swarmCompletedCounts = new Map<string, number>();
const swarmThrottles = new Map<string, number>();

console.log("🚀 Ostrich Swarm Coordinator Online");

// server/src/index.ts - Line 113
io.use((socket, next) => {
  const token = socket.handshake.auth.token;
  const persistentId = socket.handshake.query.persistentId as string;

  // If no token, this user is the "Host" of their own swarm (based on their ID)
  if (!token) {
    socket.data.swarmId = persistentId;
    return next();
  }

  // If token exists, validate it to join someone else's swarm
  const targetSwarm = authManager.validateToken(token);
  if (targetSwarm) {
    socket.data.swarmId = targetSwarm;
    return next();
  }

  return next(new Error("INVALID_TOKEN"));
});

io.on("connection", (socket) => {
  const persistentId = socket.handshake.query.persistentId as string;
  const swarmId = socket.data.swarmId;

  socket.join(swarmId);

  if (!swarmStates.has(swarmId)) {
    swarmStates.set(swarmId, "STOPPED");
    swarmCompletedCounts.set(swarmId, 0);
  }

  socket.on("cmd:set_throttle", (value: number) => {
    swarmThrottles.set(swarmId, value);
    // Broadcast to everyone in the room
    io.to(swarmId).emit("swarm:throttle_sync", value);
  });

  socket.on("auth:generate_token", (callback) => {
    const token = authManager.generateToken(swarmId);
    if (typeof callback === "function") callback(token);
  });

  // FIX: Tie heartbeat specifically to the persistentId
  socket.on("heartbeat", (data) => {
    deviceManager.heartbeat(persistentId, data);
  });

  // --- THE MISSING DISPATCHER ---
  socket.on("job:request_batch", () => {
    const currentState = swarmStates.get(swarmId);
    // 1. Only give jobs if the swarm is actually RUNNING
    if (currentState !== "RUNNING") return;

    const device = deviceManager.getDevice(persistentId);
    if (!device || device.status !== "ONLINE") return;

    // 2. Pull jobs from the scheduler specifically for this device
    const batch = [];
    const BATCH_SIZE = 5;

    for (let i = 0; i < BATCH_SIZE; i++) {
      const job = jobScheduler.getJobForDevice(device);
      if (job) batch.push(job);
    }

    // 3. Dispatch to client
    if (batch.length > 0) {
      socket.emit("job:batch", batch);
    }
  });

  socket.on("job:complete", (payload: { chunkId: string; error?: string }) => {
    // 1. Increment Global Stats
    if (!payload.error) {
      swarmCompletedCounts.set(
        swarmId,
        (swarmCompletedCounts.get(swarmId) || 0) + 1,
      );
    }

    // 2. Increment Device-Specific Stats (FIXES THE "0 JOBS DONE" ON NODES)
    const device = deviceManager.getDevice(persistentId);
    if (device && !payload.error) {
      device.totalJobsCompleted++;
    }

    // 3. Trigger immediate broadcast to keep UI snappy
    broadcastState();
  });
  socket.on("cmd:set_run_state", (state) => {
    swarmStates.set(swarmId, state);
    broadcastState();
  });

  socket.on("cmd:toggle_device", ({ id, enabled }) => {
    deviceManager.toggleDevice(id, enabled);
    broadcastState();
  });
  socket.on("device:register", (data) => {
    deviceManager.register(persistentId, data.name, data.capabilities, swarmId);
    // Explicitly revive status if it was stuck in OFFLINE/DISABLED
    const device = deviceManager.getDevice(persistentId);
    if (device) device.status = "ONLINE";

    console.log(
      `[REG] Node ${data.name} (${persistentId}) joined swarm ${swarmId}`,
    );
    broadcastState();
  });

  socket.on("job:request_batch", () => {
    const currentState = swarmStates.get(swarmId);
    const device = deviceManager.getDevice(persistentId);

    if (currentState !== "RUNNING") {
      // Quiet return, we don't want to spam if paused
      return;
    }

    if (!device) {
      console.log(`[ERR] Request from unknown device: ${persistentId}`);
      return;
    }

    const batch = [];
    for (let i = 0; i < 5; i++) {
      const job = jobScheduler.getJobForDevice(device);
      if (job) batch.push(job);
    }

    if (batch.length > 0) {
      console.log(
        `[JOBS] Dispatched ${batch.length} tasks to ${device.name} (${persistentId})`,
      );
      socket.emit("job:batch", batch);
    } else {
      // Log this so you know if the JobScheduler is empty
      console.log(`[WARN] Queue empty for ${device.name}`);
    }
  });

  socket.on("benchmark:result", (data) => {
    deviceManager.updateScore(persistentId, data.score);
    broadcastState();
  });

  function broadcastState() {
    const resources = deviceManager.getAvailableResources(swarmId);
    const queue = jobScheduler.getQueueStats();
    const allDevices = deviceManager.getDevicesBySwarm(swarmId);
    const currentState = swarmStates.get(swarmId) || "STOPPED";
    const completedCount = swarmCompletedCounts.get(swarmId) || 0;
    const currentThrottle = swarmThrottles.get(swarmId) || 40;

    const totalOpsScore = allDevices
      .filter((d) => d.status === "ONLINE" || d.status === "BUSY")
      .reduce((sum, d) => sum + (d.opsScore || 0), 0);

    const snapshot: SwarmSnapshot = {
      runState: currentState,
      devices: allDevices.reduce((acc, d) => ({ ...acc, [d.id]: d }), {}),
      stats: {
        totalJobs: completedCount + queue.pending,
        activeJobs: currentState === "RUNNING" ? resources.onlineCount : 0,
        pendingJobs: queue.pending,
        completedJobs: completedCount,
        globalVelocity: currentState === "RUNNING" ? totalOpsScore : 0,
        globalThrottle: currentThrottle,
      },
      resources,
    };

    io.to(swarmId).emit("swarm:snapshot", snapshot);
  }

  // Periodic room broadcast
  const syncInterval = setInterval(broadcastState, 2000);

  socket.on("disconnect", () => {
    clearInterval(syncInterval);
    // Note: deviceManager.cleanup() handles removing offline devices after a delay
  });
});
