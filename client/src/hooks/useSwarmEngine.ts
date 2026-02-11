import { useEffect, useRef, useState, useCallback } from "react";
import { io, Socket } from "socket.io-client";
import {
  type SwarmSnapshot,
  type SwarmStatus,
  type DeviceInfo,
} from "../core/types";
import ComputeWorker from "../utils/compute.worker?worker"; // Import Worker

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
  const socketRef = useRef<Socket | null>(null);
  const workerRef = useRef<Worker | null>(null); // Worker Ref

  // Helper to add logs
  const addLog = (msg: string) => {
    setLogs((prev) => [...prev.slice(-19), msg]);
  };

  const [localDevice, setLocalDevice] = useState<DeviceInfo>({
    id: persistentId,
    name: "Local Host",
    type: "DESKTOP",
    status: "ONLINE",
    capabilities: getLocalSpecs(),
    opsScore: 0, // Starts at 0
    totalJobsCompleted: 0,
    lastHeartbeat: 0,
  });

  // --- WORKER SETUP ---
  useEffect(() => {
    const worker = new ComputeWorker();
    workerRef.current = worker;

    worker.onmessage = (e) => {
      const { type, score } = e.data;
      if (type === "BENCHMARK_COMPLETE") {
        addLog(`[SYS] Benchmark Finished: ${score} OPS`);
        // UPDATE LOCAL STATE IMMEDIATELY
        setLocalDevice((prev) => ({ ...prev, opsScore: score }));
        // Tell server
        socketRef.current?.emit("benchmark:result", { score });
      }
    };

    return () => worker.terminate();
  }, []);

  const connect = useCallback(() => {
    if (socketRef.current?.connected) return;

    const socket = io(
      import.meta.env.VITE_SERVER_URL || "http://localhost:3000",
      {
        query: { persistentId },
        transports: ["websocket"],
      },
    );

    socket.on("connect", () => {
      setIsConnected(true);
      addLog("[SYS] Connected to Coordinator");
      socket.emit("device:register", {
        name: "Local Host",
        capabilities: getLocalSpecs(),
      });
    });

    socket.on("disconnect", () => {
      setIsConnected(false);
      addLog("[ERR] Connection Lost");
    });

    socket.on("swarm:snapshot", (data: SwarmSnapshot) => {
      setSnapshot(data);
    });

    socketRef.current = socket;
  }, [persistentId]);

  useEffect(() => {
    if (!isConnected) return;
    const interval = setInterval(
      () => socketRef.current?.emit("heartbeat"),
      2000,
    );
    return () => clearInterval(interval);
  }, [isConnected]);

  useEffect(() => {
    connect();
    return () => {
      socketRef.current?.disconnect();
    };
  }, [connect]);

  // Actions
  const setRunState = (state: SwarmStatus) => {
    socketRef.current?.emit("cmd:set_run_state", state);
  };

  const runLocalBenchmark = () => {
    addLog("[SYS] Running Local Benchmark...");
    // Trigger the worker directly
    workerRef.current?.postMessage({ type: "BENCHMARK" });
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
    totalResources,
    logs,
  };
};
