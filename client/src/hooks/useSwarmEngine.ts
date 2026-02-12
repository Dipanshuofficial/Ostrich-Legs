import { useEffect, useRef, useState, useCallback, useMemo } from "react";
import { io, Socket } from "socket.io-client";
import {
  type SwarmSnapshot,
  type SwarmStatus,
  type Job,
  type SwarmResources,
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

  const lastInteractionRef = useRef<number>(Date.now());
  const socketRef = useRef<Socket | null>(null);
  const workerRef = useRef<Worker | null>(null);

  // --- LOGGING ---
  const addLog = useCallback((msg: string) => {
    const time = new Date().toLocaleTimeString().split(" ")[0];
    setLogs((prev) => [...prev.slice(-19), `[${time}] ${msg}`]);
  }, []);

  // --- WORKER EVENT HANDLER ---
  const handleWorkerMessage = useCallback(
    (e: MessageEvent) => {
      const { type, score, chunkId, result, error } = e.data;

      switch (type) {
        case "BENCHMARK_COMPLETE":
          socketRef.current?.emit("benchmark:result", { score });
          addLog(`[CPU] Benchmark Complete: ${score.toLocaleString()} OPS`);
          break;
        case "JOB_COMPLETE":
          socketRef.current?.emit("job:complete", {
            chunkId,
            result,
            workerId: persistentId,
          });
          // CONTINUITY: One batch done, get the next one
          socketRef.current?.emit("job:request_batch");
          break;
        case "JOB_ERROR":
          addLog(`[ERR] Job ${chunkId} failed: ${error}`);
          socketRef.current?.emit("job:complete", {
            chunkId,
            error,
            workerId: persistentId,
          });
          // RECOVERY: Ask for more jobs to keep the pipeline from drying up
          socketRef.current?.emit("job:request_batch");
          break;
      }
    },
    [persistentId, addLog],
  );

  // --- CORE ACTIONS ---
  const sendHeartbeat = useCallback(() => {
    if (socketRef.current?.connected) {
      socketRef.current.emit("heartbeat", {
        lastInteraction: lastInteractionRef.current,
      });
    }
  }, []);

  const runLocalBenchmark = useCallback(() => {
    addLog("[SYS] Starting local stress test...");
    workerRef.current?.postMessage({ type: "BENCHMARK" });
  }, [addLog]);

  const updateThrottle = useCallback((v: number) => {
    workerRef.current?.postMessage({
      type: "CONFIG_UPDATE",
      payload: { throttle: v / 100 },
    });
  }, []);

  const setRunState = useCallback(
    (s: SwarmStatus) => {
      // 1. Tell server the state changed
      socketRef.current?.emit("cmd:set_run_state", s);

      // 2. If Killing, perform a hard hardware reset
      if (s === "STOPPED") {
        workerRef.current?.terminate();

        // Instantiate fresh kernel
        const newWorker = new ComputeWorker();
        workerRef.current = newWorker;

        // CRITICAL: Re-bind the message handler or the pipeline dies here
        newWorker.onmessage = handleWorkerMessage;

        addLog("[SYS] Kernel reset. Compute pipeline re-initialized.");
      }

      // 3. If starting, kick the server to send the first batch
      if (s === "RUNNING") {
        socketRef.current?.emit("job:request_batch");
      }
    },
    [handleWorkerMessage, addLog],
  );

  const connect = useCallback(
    (manualToken?: string) => {
      if (socketRef.current) socketRef.current.disconnect();

      const params = new URLSearchParams(window.location.search);
      const inviteToken = manualToken || params.get("invite");
      const isTunnel = window.location.hostname.includes("trycloudflare.com");
      const serverUrl = isTunnel ? "/" : "http://localhost:3000";

      socketRef.current = io(serverUrl, {
        query: { persistentId },
        auth: { token: inviteToken },
        transports: ["websocket", "polling"],
        reconnection: true,
        path: "/socket.io/",
      });

      socketRef.current.on("connect", () => {
        setIsConnected(true);
        addLog(`[NET] Swarm Link Established`);
        socketRef.current?.emit("device:register", {
          name: identity.name,
          capabilities: getLocalSpecs(),
        });
        sendHeartbeat();
        workerRef.current?.postMessage({ type: "BENCHMARK" });

        // KICKSTART: If we join and it's already running, ask for work immediately
        socketRef.current?.emit("job:request_batch");
      });

      // LISTEN FOR JOBS
      socketRef.current.on("job:batch", (jobs: Job[]) => {
        jobs.forEach((job) => {
          workerRef.current?.postMessage({ type: "EXECUTE_JOB", payload: job });
        });
      });

      socketRef.current.on("swarm:throttle_sync", (value: number) => {
        updateThrottle(value);
      });

      socketRef.current.on("swarm:snapshot", (data: SwarmSnapshot) => {
        const wasRunning = snapshot?.runState === "RUNNING";
        const isNowRunning = data.runState === "RUNNING";

        setSnapshot(data);

        // if the state just switched to RUNNING, kick off the first request
        if (!wasRunning && isNowRunning && isConnected) {
          addLog("[SYS] Swarm Ignition: Requesting initial batch...");
          socketRef.current?.emit("job:request_batch");
        }
      });

      socketRef.current.on("job:batch", (jobs: Job[]) => {
        jobs.forEach((job) =>
          workerRef.current?.postMessage({ type: "EXECUTE_JOB", payload: job }),
        );
      });

      socketRef.current.on("connect_error", (err) => {
        addLog(`[NET] Offline Mode: ${err.message}`);
        setIsConnected(false);
      });

      socketRef.current.on("disconnect", () => {
        setIsConnected(false);
        addLog("[NET] Connection Lost");
      });
    },
    [persistentId, identity.name, addLog, sendHeartbeat, updateThrottle],
  );

  // --- INITIALIZATION ---
  useEffect(() => {
    const worker = new ComputeWorker();
    workerRef.current = worker;
    worker.onmessage = handleWorkerMessage;

    // Load connection only when ID is ready, but worker is ALWAYS ready
    if (persistentId && persistentId !== "loading-identity") {
      connect();
    }

    return () => {
      worker.terminate();
      socketRef.current?.disconnect();
    };
  }, [connect, persistentId, handleWorkerMessage]);

  useEffect(() => {
    const interval = setInterval(sendHeartbeat, 3000);
    return () => clearInterval(interval);
  }, [sendHeartbeat]);

  // --- MEMOIZED RESOURCES (Fallback for Offline) ---
  const totalResources = useMemo(
    () =>
      snapshot?.resources ||
      ({
        totalCores: getLocalSpecs().cpuCores,
        totalMemory: getLocalSpecs().memoryGB,
        totalGPUs: 1,
        onlineCount: 1,
      } as SwarmResources),
    [snapshot],
  );

  return {
    snapshot,
    devices: snapshot ? Object.values(snapshot.devices) : [],
    isConnected,
    logs,
    totalResources,
    setRunState,
    runLocalBenchmark,
    updateThrottle,
    leaveSwarm: () => {
      window.location.href = window.location.origin;
    },
    manualJoin: (code: string) => connect(code),
    toggleDevice: (id: string, enabled: boolean) =>
      socketRef.current?.emit("cmd:toggle_device", { id, enabled }),
    generateInviteToken: () =>
      new Promise<string>((res) =>
        socketRef.current?.emit("auth:generate_token", res),
      ),
    setGlobalThrottle: (val: number) => {
      socketRef.current?.emit("cmd:set_throttle", val);
    },
  };
};
