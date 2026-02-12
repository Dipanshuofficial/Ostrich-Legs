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

io.use((socket, next) => {
  const token = socket.handshake.auth.token;
  const persistentId = socket.handshake.query.persistentId as string;
  const origin = socket.handshake.headers.origin || "";

  const isTrulyLocal =
    origin.includes("localhost") || origin.includes("127.0.0.1");

  if (isTrulyLocal) {
    socket.data.swarmId = persistentId;
    return next();
  }

  if (token) {
    const targetSwarm = authManager.validateToken(token);
    if (targetSwarm) {
      socket.data.swarmId = targetSwarm;
      return next();
    }
  }

  return next(new Error("AUTH_REQUIRED"));
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

  socket.on("device:register", (data) => {
    deviceManager.register(persistentId, data.name, data.capabilities, swarmId);
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

  socket.on("job:complete", () => {
    swarmCompletedCounts.set(
      swarmId,
      (swarmCompletedCounts.get(swarmId) || 0) + 1,
    );
    const device = deviceManager.getDevice(persistentId);
    if (device) device.totalJobsCompleted++;
  });

  socket.on("job:request_batch", () => {
    if (swarmStates.get(swarmId) !== "RUNNING") return;

    const device = deviceManager.getDevice(persistentId);
    if (!device || device.status !== "ONLINE") return;

    const batch = [];
    for (let i = 0; i < 5; i++) {
      const job = jobScheduler.getJobForDevice(device);
      if (job) batch.push(job);
    }

    if (batch.length > 0) socket.emit("job:batch", batch);
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
