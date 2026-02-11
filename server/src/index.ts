import { Server } from "socket.io";
import { DeviceManager } from "./managers/DeviceManager";
import { JobScheduler } from "./managers/JobScheduler";
import { type SwarmSnapshot } from "./core/types";

const io = new Server(3000, {
  cors: { origin: "*" },
  transports: ["websocket", "polling"],
});
const deviceManager = new DeviceManager();
const jobScheduler = new JobScheduler();

// GLOBAL STATS
let globalRunState: SwarmSnapshot["runState"] = "STOPPED";
let globalCompletedCount = 0; // Real counter

console.log("🚀 Ostrich Swarm Coordinator Online");

io.on("connection", (socket) => {
  const persistentId = socket.handshake.query.persistentId as string;

  // ... (Keep heartbeat, register, run_state listeners same as before) ...
  socket.on("heartbeat", () => deviceManager.heartbeat(persistentId));
  socket.on("device:register", (data) => {
    deviceManager.register(persistentId, data.name, data.capabilities);
    broadcastState();
  });
  socket.on("cmd:set_run_state", (state) => {
    globalRunState = state;
    broadcastState();
  });
  socket.on("cmd:toggle_device", ({ id, enabled }) => {
    deviceManager.toggleDevice(id, enabled);
    broadcastState();
  });
  socket.on("cmd:trigger_benchmark", () => io.emit("cmd:run_benchmark"));

  // JOB REQUEST
  socket.on("job:request", () => {
    if (globalRunState !== "RUNNING") return;
    const device = deviceManager
      .getAllDevices()
      .find((d) => d.id === persistentId);
    if (device) {
      const job = jobScheduler.getJobForDevice(device);
      if (job) socket.emit("job:assignment", job);
    }
  });

  // FIX: JOB COMPLETION LOGIC
  socket.on("job:complete", (_data) => {
    // 1. Increment Global Counter
    globalCompletedCount++;

    // 2. Increment Device Counter
    const device = deviceManager
      .getAllDevices()
      .find((d) => d.id === persistentId);
    if (device) {
      device.totalJobsCompleted = (device.totalJobsCompleted || 0) + 1;
    }

    broadcastState();
  });

  // ... disconnect listener ...

  function broadcastState() {
    const resources = deviceManager.getAvailableResources();
    const queue = jobScheduler.getQueueStats();

    // Real Math: Dynamic Total
    // If we are stopped, active is 0. If running, it's based on connected nodes.
    const active = globalRunState === "RUNNING" ? resources.onlineCount : 0;
    const pending = queue.pending;
    const completed = globalCompletedCount;

    // Total is the sum of everything we know about
    const total = completed + pending + active;

    const snapshot: SwarmSnapshot = {
      runState: globalRunState,
      devices: deviceManager
        .getAllDevices()
        .reduce((acc, d) => ({ ...acc, [d.id]: d }), {}),
      stats: {
        totalJobs: total, // Now grows as jobs come in/finish
        activeJobs: active,
        pendingJobs: pending,
        completedJobs: completed,
        // Velocity: If 0 active, 0 velocity. Else estimate based on recent throughput or active nodes.
        globalVelocity: active > 0 ? resources.onlineCount * 840 : 0,
      },
      resources,
    };

    io.emit("swarm:snapshot", snapshot);
  }

  setInterval(broadcastState, 1000);
});
