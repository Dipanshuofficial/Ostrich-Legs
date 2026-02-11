import { useEffect, useRef, useState, useCallback } from "react";
import { io, Socket } from "socket.io-client";
import {
  type SwarmSnapshot,
  type SwarmStatus,
  type DeviceInfo,
} from "../core/types";
import ComputeWorker from "../utils/compute.worker?worker";
import { usePersistentIdentity } from "./usePersistentIdentity";

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
  const identity = usePersistentIdentity();
  const lastInteractionRef = useRef(Date.now());
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
  useEffect(() => {
    const updateActivity = () => {
      lastInteractionRef.current = Date.now();
    };

    // Listen for any sign of life
    window.addEventListener("mousemove", updateActivity);
    window.addEventListener("keydown", updateActivity);
    window.addEventListener("touchstart", updateActivity);
    window.addEventListener("scroll", updateActivity);

    // Graceful Exit: Tell server we are leaving immediately
    const handleUnload = () => {
      socketRef.current?.emit("device:disconnect", { id: persistentId });
    };
    window.addEventListener("beforeunload", handleUnload);

    return () => {
      window.removeEventListener("mousemove", updateActivity);
      window.removeEventListener("keydown", updateActivity);
      window.removeEventListener("touchstart", updateActivity);
      window.removeEventListener("scroll", updateActivity);
      window.removeEventListener("beforeunload", handleUnload);
    };
  }, [persistentId]);
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
    if (
      !persistentId ||
      persistentId === "loading-identity" ||
      socketRef.current?.connected
    )
      return;
    addLog(
      `[NET] Attempting Connection to ${import.meta.env.VITE_SERVER_URL || "localhost:3000"}...`,
    );

    // IF we are on a tunnel (Cloudflare) or Network IP, use relative path.
    // IF we are on localhost, default to localhost:3000 for dev.
    const isTunnel = window.location.hostname.includes("trycloudflare.com");
    const serverUrl = isTunnel
      ? "/"
      : import.meta.env.VITE_SERVER_URL || "http://localhost:3000";

    socketRef.current = io(serverUrl, {
      query: { persistentId },
      transports: ["websocket", "polling"], // Ensure polling is enabled for tunnels
      reconnection: true,
      path: "/socket.io/", // Explicit path helps proxies
    });

    // DEBUG: Catch-all listener to prove data is arriving
    socketRef.current.onAny((eventName, ...args) => {
      if (eventName === "swarm:snapshot") return; // Ignore spammy updates
      console.log(`[SOCK-IN] ${eventName}`, args); // Check your Browser Console (F12)
    });

    socketRef.current.on("connect", () => {
      setIsConnected(true);
      addLog("[NET] ✅ Connected to Mother Ship");

      socketRef.current?.emit("device:register", {
        name: identity.name,
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
        console.log("Server is RUNNING. Local Ops:", localDevice.opsScore);
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
  }, [persistentId, addLog, identity.name]);

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

  // --- 1. HEARTBEAT LOOP (The Life Support) ---
  // Runs ALWAYS, regardless of swarm state
  useEffect(() => {
    if (!isConnected) return;

    const beatInterval = setInterval(() => {
      socketRef.current?.emit("heartbeat", {
        lastInteraction: lastInteractionRef.current,
      });
    }, 2000);

    return () => clearInterval(beatInterval);
  }, [isConnected]);

  // --- 2. WORK LOOP (The Engine) ---
  // Runs ONLY when Swarm is RUNNING
  useEffect(() => {
    if (!isConnected || snapshot?.runState !== "RUNNING") return;

    const workInterval = setInterval(() => {
      // "Give me work"
      socketRef.current?.emit("job:request_batch");
    }, 1000); // Ask for work every 1 second

    return () => clearInterval(workInterval);
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
  const otherDevices = serverDevices.filter((d) => d.id !== persistentId);
  const myServerEntry = serverDevices.find((d) => d.id === persistentId);
  const localPlaceholder: DeviceInfo = myServerEntry || {
    id: persistentId,
    name: identity.name || "Initializing...",
    type: "DESKTOP",
    status: "ONLINE", // Default until server says otherwise
    capabilities: getLocalSpecs(),
    opsScore: 0,
    totalJobsCompleted: 0,
    lastHeartbeat: 0,
  };
  const allDevices = [localPlaceholder, ...otherDevices];
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
