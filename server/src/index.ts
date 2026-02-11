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
let globalCompletedCount = 0;

console.log("🚀 Ostrich Swarm Coordinator Online");

io.on("connection", (socket) => {
  const persistentId = socket.handshake.query.persistentId as string;

  socket.on("heartbeat", () => deviceManager.heartbeat(persistentId));

  socket.on("device:register", (data) => {
    console.log(
      `[REG] Device: ${data.name} | Cores: ${data.capabilities.cpuCores}`,
    );
    deviceManager.register(persistentId, data.name, data.capabilities);
    broadcastState();
  });

  socket.on("cmd:set_run_state", (state) => {
    console.log(`[CMD] Swarm State Change: ${globalRunState} -> ${state}`);
    globalRunState = state;
    broadcastState();
  });

  socket.on("cmd:toggle_device", ({ id, enabled }) => {
    console.log(`[CMD] Toggle Node ${id}: ${enabled ? "ON" : "OFF"}`);
    deviceManager.toggleDevice(id, enabled);
    broadcastState();
  });

  socket.on("job:complete", (data) => {
    globalCompletedCount++;
    const device = deviceManager
      .getAllDevices()
      .find((d) => d.id === persistentId);
    if (device) device.totalJobsCompleted++;

    // Log failures
    if (data.error) {
      console.log(`[JOB] Failed: ${data.error}`);
    }
  });

  socket.on("cmd:trigger_benchmark", () => {
    console.log("[CMD] Broadcasting Benchmark Request");
    io.emit("cmd:run_benchmark");
  });

  // --- JOB BATCH REQUEST HANDLER ---
  socket.on("job:request_batch", () => {
    if (globalRunState !== "RUNNING") return;

    const device = deviceManager
      .getAllDevices()
      .find((d) => d.id === persistentId);
    if (!device || device.status !== "ONLINE") return;

    // Send a batch of 5 jobs at a time
    const batch = [];
    for (let i = 0; i < 5; i++) {
      const job = jobScheduler.getJobForDevice(device);
      if (job) batch.push(job);
    }

    if (batch.length > 0) {
      socket.emit("job:batch", batch);
    }
  });
  socket.on("cmd:trigger_benchmark", () => {
    console.log("[CMD] Broadcasting Benchmark Request");
    io.emit("cmd:run_benchmark");
  });

  // --- MISSING HANDLER FIXED BELOW ---
  socket.on("benchmark:result", (data) => {
    // 1. Log it so we know it arrived
    console.log(`[BENCH] Update for ${persistentId}: ${data.score} OPS`);

    // 2. Update the internal store
    deviceManager.updateScore(persistentId, data.score);

    // 3. Force immediate broadcast to all clients
    broadcastState();
  });

  socket.on("disconnect", (reason) => {
    console.log(`[NET] Client Disconnect: ${reason}`);
  });

  function broadcastState() {
    const resources = deviceManager.getAvailableResources();
    const queue = jobScheduler.getQueueStats();
    const allDevices = deviceManager.getAllDevices();

    const totalOpsScore = allDevices
      .filter((d) => d.status === "ONLINE" || d.status === "BUSY")
      .reduce((sum, d) => sum + (d.opsScore || 0), 0);

    const snapshot: SwarmSnapshot = {
      runState: globalRunState,
      devices: allDevices.reduce((acc, d) => ({ ...acc, [d.id]: d }), {}),
      stats: {
        totalJobs: globalCompletedCount + queue.pending,
        activeJobs: globalRunState === "RUNNING" ? resources.onlineCount : 0,
        pendingJobs: queue.pending,
        completedJobs: globalCompletedCount,
        globalVelocity: globalRunState === "RUNNING" ? totalOpsScore : 0,
      },
      resources,
    };

    io.emit("swarm:snapshot", snapshot);
  }

  // Broadcast frequently to keep UI snappy
  setInterval(broadcastState, 500);
});
