import { useCallback, useEffect, useRef, useState } from "react";
import { io, Socket } from "socket.io-client";
import { type JobChunk, type WorkerResult } from "../../../shared/types";
//  Worker import with query parameter
import OstrichWorker from "../utils/worker?worker";
import { usePersistentIdentity } from "./usePersistentIdentity";

export const useComputeSwarm = (
  onLog?: (msg: string) => void,
  isDeviceEnabled: boolean = true,
) => {
  const [status, setStatus] = useState<
    "IDLE" | "WORKING" | "PAUSED" | "STOPPED"
  >("IDLE");
  const [completedCount, setCompletedCount] = useState(0);
  const completedCountRef = useRef(0);
  const [socket, setSocket] = useState<Socket | null>(null);
  const [workerId, setWorkerId] = useState<string>("");
  const [opsScore, setOpsScore] = useState<number>(0);
  const [joinCode, setJoinCode] = useState<string>("LOADING...");
  const [activeThreads, setActiveThreads] = useState<number>(0);
  const [currentThrottle, setCurrentThrottle] = useState<number>(30);

  const isRunningRef = useRef(false);
  const inFlightRequests = useRef(0);
  const activeJobs = useRef(0);
  const jobBuffer = useRef<JobChunk[]>([]);

  const socketRef = useRef<Socket | null>(null);
  const workerRef = useRef<Worker | null>(null);

  const identity = usePersistentIdentity();

  // --- CORE LOOP ---
  // Replace the processQueue function with this robust version:

  const processQueue = useCallback(() => {
    if (!workerRef.current || !isRunningRef.current || !isDeviceEnabled) return;

    const maxConcurrency = activeThreads || 1;

    // 1. Feed Worker
    while (
      jobBuffer.current.length > 0 &&
      activeJobs.current < maxConcurrency
    ) {
      const job = jobBuffer.current.shift();
      if (job) {
        activeJobs.current++;
        workerRef.current.postMessage({
          type: "JOB_CHUNK",
          chunk: job,
          workerId: socketRef.current?.id,
        });
      }
    }

    // 2. Request More Work (The Pull)
    const currentSupply =
      activeJobs.current + jobBuffer.current.length + inFlightRequests.current;

    // FIX 5: Lower threshold and ensure socket is open
    // Only ask for 2x concurrency to prevent buffering too much RAM
    const bufferThreshold = maxConcurrency * 2;

    if (
      currentSupply < bufferThreshold &&
      socketRef.current?.connected &&
      inFlightRequests.current === 0 // Strict sequencing: finish asking before asking again
    ) {
      const deficit = Math.min(bufferThreshold - currentSupply, 5); // Cap batch at 5
      if (deficit > 0) {
        inFlightRequests.current += deficit; // Mark in flight
        socketRef.current.emit("REQUEST_BATCH", deficit);
      }
    }
  }, [activeThreads, isDeviceEnabled]);

  // --- CONTROLS ---
  const startSwarm = useCallback(() => {
    if (isRunningRef.current) return;
    isRunningRef.current = true;
    setStatus("WORKING");
    onLog?.(`[SYS] Swarm started.`);
    processQueue();
  }, [onLog, processQueue]);

  const pauseSwarm = useCallback(() => {
    isRunningRef.current = false;
    setStatus("PAUSED");
    onLog?.(`[SYS] System paused.`);
  }, [onLog]);

  const stopSwarm = useCallback(() => {
    isRunningRef.current = false;
    setStatus("STOPPED");
    activeJobs.current = 0;
    jobBuffer.current = [];
    inFlightRequests.current = 0;

    workerRef.current?.terminate();
    workerRef.current = new OstrichWorker();
    workerRef.current?.postMessage({
      type: "UPDATE_CONFIG",
      throttleLevel: currentThrottle / 100,
    });

    onLog?.(`[SYS] System stopped. Worker reset.`);
  }, [currentThrottle, onLog]);

  const updateThrottle = useCallback(
    (val: number) => {
      setCurrentThrottle(val);
      workerRef.current?.postMessage({
        type: "UPDATE_CONFIG",
        throttleLevel: val / 100,
      });
      onLog?.(`[CFG] Throttle updated to ${val}%`);
    },
    [onLog],
  );

  const toggleDevice = useCallback((deviceId: string, enabled: boolean) => {
    if (socketRef.current) {
      socketRef.current.emit("TOGGLE_DEVICE", { deviceId, enabled });
    }
  }, []);

  // --- INITIALIZATION ---
  useEffect(() => {
    if (!identity?.id) return;
    if (socketRef.current?.connected) return;

    onLog?.(`[NET] Connecting as ${identity.name}...`);

    // 1. INIT WORKER
    workerRef.current = new OstrichWorker();

    // Attach listeners
    workerRef.current.onmessage = (e) => {
      const msg = e.data;
      if (msg.type === "CONFIG_APPLIED") {
        setActiveThreads(msg.threads);
      } else if (msg.type === "JOB_COMPLETE") {
        activeJobs.current--;
        completedCountRef.current++;
        socketRef.current?.emit("JOB_COMPLETE", {
          chunkId: msg.chunkId,
          result: msg.result as WorkerResult,
        });
        processQueue();
      } else if (msg.type === "JOB_ERROR") {
        activeJobs.current--;
        onLog?.(`[ERR] Job failed: ${msg.error}`);
        processQueue();
      } else if (msg.type === "BENCHMARK_COMPLETE") {
        setOpsScore(msg.score);
        socketRef.current?.emit("BENCHMARK_RESULT", { opsScore: msg.score });
      }
    };

    // Apply initial throttle
    workerRef.current?.postMessage({
      type: "UPDATE_CONFIG",
      throttleLevel: currentThrottle / 100,
    });

    // 2. INIT SOCKET
    const isDev = import.meta.env.DEV;
    const socketUrl = isDev
      ? `${window.location.protocol}//${window.location.hostname}:3000`
      : window.location.origin;

    const newSocket = io(socketUrl, {
      path: "/socket.io",
      query: { persistentId: identity.id },
      transports: ["websocket", "polling"],
    });

    setSocket(newSocket);
    socketRef.current = newSocket;

    // --- SOCKET EVENTS ---
    // --- SOCKET EVENTS ---
    newSocket.on("connect", () => {
      setWorkerId(newSocket.id || "...");

      // FIX 3: Reset State on Connect
      // Ensure we don't think we have pending requests from a dead session
      inFlightRequests.current = 0;
      activeJobs.current = 0;
      jobBuffer.current = [];

      onLog?.(`[NET] Connected! Registering...`);

      newSocket.emit("REQUEST_JOIN_CODE");

      // ... rest of your registration logic
      newSocket.emit("REGISTER_DEVICE", {
        id: identity.id,
        name: identity.name,
        type: "DESKTOP", // Or whatever type this client is
        capabilities: {
          cpuCores: navigator.hardwareConcurrency || 4,
          memoryGB: (navigator as any).deviceMemory || 8,
          maxConcurrency: navigator.hardwareConcurrency || 4,
          supportedJobs: ["MAT_MUL", "MATH_STRESS"],
        },
      });
    });

    newSocket.on("JOIN_CODE", (data: { code: string }) => {
      setJoinCode(data.code);
    });

    newSocket.on("JOB_DISPATCH", (job) => {
      inFlightRequests.current = Math.max(0, inFlightRequests.current - 1);
      jobBuffer.current.push(job);
      processQueue();
    });
    newSocket.on("disconnect", (reason) => {
      onLog?.(`[NET] Disconnected: ${reason}`);
      // FIX 4: Clear flight flag so we resume asking when we reconnect
      inFlightRequests.current = 0;
      setStatus("IDLE");
    });

    newSocket.on("BATCH_DISPATCH", (jobs) => {
      inFlightRequests.current = Math.max(0, inFlightRequests.current - 1);
      jobs.forEach((j: JobChunk) => jobBuffer.current.push(j));
      processQueue();
    });

    newSocket.on("NO_WORK", () => {
      inFlightRequests.current = Math.max(0, inFlightRequests.current - 1);
    });

    // Listen for global swarm throttle updates
    newSocket.on("SWARM_THROTTLE_UPDATE", (data: { throttleLevel: number }) => {
      const newThrottle = Math.round(data.throttleLevel * 100);
      setCurrentThrottle(newThrottle);
      workerRef.current?.postMessage({
        type: "UPDATE_CONFIG",
        throttleLevel: data.throttleLevel,
      });
      onLog?.(`[CFG] Global swarm throttle updated to ${newThrottle}%`);
    });

    const pump = setInterval(processQueue, 100);

    return () => {
      clearInterval(pump);
      newSocket.disconnect();
      workerRef.current?.terminate();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [identity]);

  useEffect(() => {
    const i = setInterval(
      () => setCompletedCount(completedCountRef.current),
      500,
    );
    return () => clearInterval(i);
  }, []);

  const runBenchmark = useCallback(() => {
    workerRef.current?.postMessage({ type: "BENCHMARK" });
  }, []);
  return {
    status,
    completedCount,
    workerId,
    opsScore,
    activeThreads,
    updateThrottle,
    throttle: currentThrottle,
    socket,
    isRunning: status === "WORKING",
    startSwarm,
    pauseSwarm,
    stopSwarm,
    toggleDevice,
    runBenchmark,
    identity,
    joinCode,
  };
};
