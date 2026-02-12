import { useEffect, useRef, useState, useCallback } from "react";
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

  // Refs for persistent state without re-renders
  const lastInteractionRef = useRef<number>(Date.now());
  const socketRef = useRef<Socket | null>(null);
  const workerRef = useRef<Worker | null>(null);

  const addLog = useCallback((msg: string) => {
    const time = new Date().toLocaleTimeString().split(" ")[0];
    setLogs((prev) => [...prev.slice(-19), `[${time}] ${msg}`]);
  }, []);

  const leaveSwarm = useCallback(() => {
    window.location.href = window.location.origin;
  }, []);

  const sendHeartbeat = useCallback(() => {
    if (socketRef.current?.connected) {
      socketRef.current.emit("heartbeat", {
        lastInteraction: lastInteractionRef.current,
      });
    }
  }, []);

  const connect = useCallback(
    (manualToken?: string) => {
      if (socketRef.current) socketRef.current.disconnect();
      if (!persistentId || persistentId === "loading-identity") return;

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
        addLog(`[NET] Connected to ${inviteToken ? "Swarm" : "Local Host"}`);

        // Register and Heartbeat immediately to prevent "Offline" ghosting
        socketRef.current?.emit("device:register", {
          name: identity.name,
          capabilities: getLocalSpecs(),
        });
        sendHeartbeat();
        socketRef.current?.on("swarm:throttle_sync", (value: number) => {
          // Sync the local worker immediately when the Host changes the slider
          workerRef.current?.postMessage({
            type: "CONFIG_UPDATE",
            payload: { throttle: value / 100 },
          });
        });

        // Run benchmark immediately to sync OPS score
        workerRef.current?.postMessage({ type: "BENCHMARK" });
      });

      socketRef.current.on("swarm:snapshot", (data: SwarmSnapshot) => {
        setSnapshot(data);
      });

      socketRef.current.on("job:batch", (jobs: Job[]) => {
        jobs.forEach((job) =>
          workerRef.current?.postMessage({ type: "EXECUTE_JOB", payload: job }),
        );
      });

      socketRef.current.on("connect_error", (err) => {
        addLog(`[AUTH] Access Denied: ${err.message}`);
      });

      socketRef.current.on("disconnect", () => {
        setIsConnected(false);
        addLog("[NET] Disconnected");
      });
    },
    [persistentId, identity.name, addLog, sendHeartbeat],
  );

  // Main Effect: Worker Init and Connection
  useEffect(() => {
    const worker = new ComputeWorker();
    workerRef.current = worker;

    worker.onmessage = (e) => {
      const { type, score, chunkId, result, error } = e.data;
      if (type === "BENCHMARK_COMPLETE") {
        socketRef.current?.emit("benchmark:result", { score });
      } else if (type === "JOB_COMPLETE") {
        socketRef.current?.emit("job:complete", {
          chunkId,
          result,
          workerId: persistentId,
        });
        socketRef.current?.emit("job:request_batch");
      } else if (type === "JOB_ERROR") {
        socketRef.current?.emit("job:complete", {
          chunkId,
          error,
          workerId: persistentId,
        });
      }
    };

    connect();

    return () => {
      worker.terminate();
      socketRef.current?.disconnect();
    };
  }, [connect, persistentId]);

  // Heartbeat Interval: 3s interval for a 30s server window
  useEffect(() => {
    if (!isConnected) return;
    const interval = setInterval(sendHeartbeat, 3000);
    return () => clearInterval(interval);
  }, [isConnected, sendHeartbeat]);

  // Activity Tracker
  useEffect(() => {
    const updateActivity = () => {
      lastInteractionRef.current = Date.now();
    };
    window.addEventListener("mousemove", updateActivity);
    window.addEventListener("keydown", updateActivity);
    return () => {
      window.removeEventListener("mousemove", updateActivity);
      window.removeEventListener("keydown", updateActivity);
    };
  }, []);

  return {
    snapshot,
    devices: snapshot ? Object.values(snapshot.devices) : [],
    setRunState: (s: SwarmStatus) =>
      socketRef.current?.emit("cmd:set_run_state", s),
    runLocalBenchmark: () =>
      workerRef.current?.postMessage({ type: "BENCHMARK" }),
    isConnected,
    leaveSwarm,
    manualJoin: (code: string) => connect(code),
    toggleDevice: (id: string, enabled: boolean) =>
      socketRef.current?.emit("cmd:toggle_device", { id, enabled }),
    updateThrottle: (v: number) =>
      workerRef.current?.postMessage({
        type: "CONFIG_UPDATE",
        payload: { throttle: v / 100 },
      }),
    generateInviteToken: () =>
      new Promise<string>((res) =>
        socketRef.current?.emit("auth:generate_token", res),
      ),
    totalResources:
      snapshot?.resources ||
      ({
        totalCores: 0,
        totalMemory: 0,
        totalGPUs: 0,
        onlineCount: 0,
      } as SwarmResources),
    setGlobalThrottle: (val: number) => {
      socketRef.current?.emit("cmd:set_throttle", val);
    },
    logs,
  };
};
