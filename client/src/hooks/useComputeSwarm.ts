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
  const processQueue = useCallback(() => {
    if (!workerRef.current || !isRunningRef.current) return;
    if (!isDeviceEnabled) return;

    const maxConcurrency = activeThreads || 1;

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

    const desiredBuffer = maxConcurrency * 3;
    const currentSupply =
      activeJobs.current + jobBuffer.current.length + inFlightRequests.current;

    if (currentSupply < desiredBuffer && socketRef.current?.connected) {
      const deficit = desiredBuffer - currentSupply;
      if (deficit > 0) {
        inFlightRequests.current += deficit;
        if (deficit >= 5) {
          socketRef.current.emit("REQUEST_BATCH", Math.min(deficit, 20));
        } else {
          socketRef.current.emit("REQUEST_WORK");
        }
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

    // eslint-disable-next-line react-hooks/call-set-state-in-effect-trigger
    setSocket(newSocket);
    socketRef.current = newSocket;

    // --- SOCKET EVENTS ---
    newSocket.on("connect", () => {
      setWorkerId(newSocket.id || "...");
      onLog?.(`[NET] Connected! Registering...`);

      newSocket.emit("REQUEST_JOIN_CODE");

      newSocket.emit("REGISTER_DEVICE", {
        id: identity.id,
        name: identity.name,
        type: "DESKTOP",
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

    newSocket.on("BATCH_DISPATCH", (jobs) => {
      inFlightRequests.current = Math.max(0, inFlightRequests.current - 1);
      jobs.forEach((j: JobChunk) => jobBuffer.current.push(j));
      processQueue();
    });

    newSocket.on("NO_WORK", () => {
      inFlightRequests.current = Math.max(0, inFlightRequests.current - 1);
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
