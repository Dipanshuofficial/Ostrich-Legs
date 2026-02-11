import { useEffect, useRef, useState, useCallback } from "react";
import { io, Socket } from "socket.io-client";
import {
  type SwarmSnapshot,
  type SwarmStatus,
  type DeviceInfo,
} from "../core/types";
import ComputeWorker from "../utils/compute.worker?worker";

const getLocalSpecs = () => ({
  cpuCores: navigator.hardwareConcurrency || 4,
  memoryGB: (navigator as any).deviceMemory || 8,
  gpuAvailable: true,
  gpuName: "WebGPU Adapter",
});

export const useSwarmEngine = (persistentId: string) => {
  const [snapshot, setSnapshot] = useState<SwarmSnapshot | null>(null);
  const [isConnected, setIsConnected] = useState(false);
  const [logs, setLogs] = useState<string[]>([]);

  // Local state to track our own contribution immediately
  const [localDevice, setLocalDevice] = useState<DeviceInfo>({
    id: persistentId,
    name: "Local Host",
    type: "DESKTOP",
    status: "ONLINE",
    capabilities: getLocalSpecs(),
    opsScore: 0,
    totalJobsCompleted: 0,
    lastHeartbeat: 0,
  });

  const socketRef = useRef<Socket | null>(null);
  const workerRef = useRef<Worker | null>(null);

  // Helper to add logs to the UI terminal
  const addLog = useCallback((msg: string) => {
    const time = new Date().toLocaleTimeString().split(" ")[0];
    setLogs((prev) => [...prev.slice(-19), `[${time}] ${msg}`]);
  }, []);

  // --- WORKER SETUP ---
  useEffect(() => {
    addLog("[SYS] Initializing Compute Worker...");
    const worker = new ComputeWorker();
    workerRef.current = worker;

    worker.onmessage = (e) => {
      const { type, score, chunkId, result, error, log } = e.data;

      // 1. Handle Worker Logs
      if (log) {
        addLog(`[WRK] ${log}`);
        return;
      }

      // 2. Handle Benchmark
      if (type === "BENCHMARK_COMPLETE") {
        addLog(`[SYS] Benchmark Result: ${score} OPS`);
        setLocalDevice((prev) => ({ ...prev, opsScore: score }));
        socketRef.current?.emit("benchmark:result", { score });
      }

      // 3. Handle Job Completion
      else if (type === "JOB_COMPLETE") {
        // addLog(`[JOB] Finished Chunk ${chunkId?.substring(0, 5)}...`);
        // Tell server we finished
        socketRef.current?.emit("job:complete", {
          chunkId,
          result,
          workerId: persistentId,
        });

        // Optimistic Update
        setLocalDevice((prev) => ({
          ...prev,
          totalJobsCompleted: prev.totalJobsCompleted + 1,
        }));

        // Immediately ask for more work (Pipeline)
        socketRef.current?.emit("job:request_batch");
      }

      // 4. Handle Errors
      else if (type === "JOB_ERROR") {
        addLog(`[ERR] Job Failed: ${error}`);
        socketRef.current?.emit("job:complete", {
          chunkId,
          error,
          workerId: persistentId,
        });
      }
    };

    return () => worker.terminate();
  }, [addLog, persistentId]);

  // --- SOCKET SETUP ---
  const connect = useCallback(() => {
    if (socketRef.current?.connected) return;

    addLog(
      `[NET] Attempting Connection to ${import.meta.env.VITE_SERVER_URL || "localhost:3000"}...`,
    );

    socketRef.current = io(
      import.meta.env.VITE_SERVER_URL || "http://localhost:3000",
      {
        query: { persistentId },
        transports: ["websocket"],
        reconnection: true,
      },
    );

    // DEBUG: Catch-all listener to prove data is arriving
    socketRef.current.onAny((eventName, ...args) => {
      if (eventName === "swarm:snapshot") return; // Ignore spammy updates
      console.log(`[SOCK-IN] ${eventName}`, args); // Check your Browser Console (F12)
    });

    socketRef.current.on("connect", () => {
      setIsConnected(true);
      addLog("[NET] ✅ Connected to Mother Ship");

      socketRef.current?.emit("device:register", {
        name: "Local Host",
        capabilities: getLocalSpecs(),
      });

      // AUTO-START: Run a quick benchmark so the server knows our speed
      setTimeout(() => {
        workerRef.current?.postMessage({ type: "BENCHMARK" });
      }, 1000);
    });

    socketRef.current.on("disconnect", () => {
      setIsConnected(false);
      addLog("[NET] ❌ Connection Lost - Retrying...");
    });

    socketRef.current.on("swarm:snapshot", (data: SwarmSnapshot) => {
      setSnapshot(data);
      // DEBUG: Verify state sync
      if (data.runState === "RUNNING") {
        // If server says RUNNING but we aren't doing anything, log it
        // console.log("Server is RUNNING. Local Ops:", localDevice.opsScore);
      }
    });

    socketRef.current.on("job:batch", (jobs: any[]) => {
      addLog(`[JOB] 📥 Received Batch (${jobs.length} tasks)`);
      if (workerRef.current) {
        jobs.forEach((job) => {
          workerRef.current?.postMessage({
            type: "EXECUTE_JOB",
            payload: job,
          });
        });
      } else {
        addLog("[ERR] Worker not ready to accept jobs!");
      }
    });

    socketRef.current.on("cmd:run_benchmark", () => {
      addLog("[CMD] 🚀 Benchmark Triggered Remote");
      workerRef.current?.postMessage({ type: "BENCHMARK" });
    });
  }, [persistentId, addLog]);

  useEffect(() => {
    connect();
    return () => {
      if (socketRef.current) {
        socketRef.current.removeAllListeners();
        socketRef.current.disconnect();
        socketRef.current = null;
      }
    };
  }, [connect]);

  // --- AUTO-REQUESTER ---
  // If we are idle, keep asking for work
  useEffect(() => {
    if (!isConnected) return;

    const interval = setInterval(() => {
      if (snapshot?.runState === "RUNNING") {
        // Heartbeat + Work Request
        socketRef.current?.emit("heartbeat");
        socketRef.current?.emit("job:request_batch");
      }
    }, 1000);

    return () => clearInterval(interval);
  }, [isConnected, snapshot?.runState]);

  // --- ACTIONS ---
  const setRunState = (state: SwarmStatus) => {
    addLog(`[USR] Set State: ${state}`);
    socketRef.current?.emit("cmd:set_run_state", state);
  };

  const runLocalBenchmark = () => {
    addLog("[USR] Starting Local Benchmark...");
    workerRef.current?.postMessage({ type: "BENCHMARK" });
  };

  const updateThrottle = (value: number) => {
    // addLog(`[CFG] Throttle set to ${value}%`);
    workerRef.current?.postMessage({
      type: "CONFIG_UPDATE",
      payload: { throttle: value / 100 },
    });
  };

  // Merge Devices (Server + Updated Local)
  const serverDevices = snapshot ? Object.values(snapshot.devices) : [];
  const allDevices = [
    localDevice, // Always put local first
    ...serverDevices.filter((d) => d.id !== persistentId),
  ];

  const totalResources = snapshot?.resources || {
    totalCores: localDevice.capabilities.cpuCores,
    totalMemory: localDevice.capabilities.memoryGB,
    totalGPUs: localDevice.capabilities.gpuAvailable ? 1 : 0,
    onlineCount: 1,
  };

  return {
    snapshot,
    devices: allDevices,
    setRunState,
    runLocalBenchmark,
    isConnected,
    toggleDevice: (id: string, enabled: boolean) =>
      socketRef.current?.emit("cmd:toggle_device", { id, enabled }),
    updateThrottle, // Export this so App can use it
    totalResources,
    logs,
  };
};
