import { useCallback, useEffect, useRef, useState } from "react";
import { io, Socket } from "socket.io-client";
import { type JobChunk, type WorkerResult } from "../../../shared/types";
// @ts-ignore
import OstrichWorker from "../utils/worker?worker";
import { usePersistentIdentity } from "./usePersistentIdentity";

export const useComputeSwarm = (onLog?: (msg: string) => void) => {
  const [status, setStatus] = useState<
    "IDLE" | "WORKING" | "PAUSED" | "STOPPED"
  >("IDLE");
  const [completedCount, setCompletedCount] = useState(0);
  const completedCountRef = useRef(0);
  const [socket, setSocket] = useState<Socket | null>(null);
  const [workerId, setWorkerId] = useState<string>("");
  const [opsScore, setOpsScore] = useState<number>(0);

  // Initialize activeThreads to 0, wait for Worker to confirm real count
  const [activeThreads, setActiveThreads] = useState<number>(0);
  const [currentThrottle, setCurrentThrottle] = useState<number>(30);

  const isRunningRef = useRef(false);
  const inFlightRequests = useRef(0);
  const activeJobs = useRef(0);
  const jobBuffer = useRef<JobChunk[]>([]);
  const socketRef = useRef<Socket | null>(null);
  const workerRef = useRef<Worker | null>(null);

  const identity = usePersistentIdentity();

  // ... (Keep startSwarm, pauseSwarm, stopSwarm as is) ...
  const startSwarm = useCallback(() => {
    if (isRunningRef.current) return;
    isRunningRef.current = true;
    setStatus("WORKING");
    onLog?.(`[SYS] Swarm started.`);
    processQueue();
  }, [onLog]);

  const pauseSwarm = useCallback(() => {
    isRunningRef.current = false;
    setStatus("PAUSED");
  }, []);

  const stopSwarm = useCallback(() => {
    isRunningRef.current = false;
    setStatus("STOPPED");
    activeJobs.current = 0;
    jobBuffer.current = [];
    workerRef.current?.terminate();
    // Restart worker
    workerRef.current = new OstrichWorker();
    workerRef.current?.postMessage({
      type: "UPDATE_CONFIG",
      throttleLevel: currentThrottle / 100,
    });
  }, [currentThrottle]);

  const updateThrottle = useCallback((val: number) => {
    setCurrentThrottle(val);
    workerRef.current?.postMessage({
      type: "UPDATE_CONFIG",
      throttleLevel: val / 100,
    });
  }, []);

  const processQueue = useCallback(() => {
    if (!workerRef.current || !isRunningRef.current) return;

    // 1. Dispatch from Buffer to Worker
    // Note: Use activeThreads from state, or fallback to 1 if not ready
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

    // 2. Request from Server
    const desiredBuffer = maxConcurrency * 3;
    const currentSupply =
      activeJobs.current + jobBuffer.current.length + inFlightRequests.current;

    if (currentSupply < desiredBuffer && socketRef.current?.connected) {
      const deficit = desiredBuffer - currentSupply;
      if (deficit > 0) {
        inFlightRequests.current += deficit;
        if (deficit >= 5)
          socketRef.current.emit("REQUEST_BATCH", Math.min(deficit, 20));
        else socketRef.current.emit("REQUEST_WORK");
      }
    }
  }, [activeThreads]); // Rerun when threads change

  // --- CONNECTION ---
  useEffect(() => {
    if (!identity?.id) return;
    if (socketRef.current?.connected) return;

    // 1. Init Worker immediately
    workerRef.current = new OstrichWorker();
    workerRef.current.postMessage({
      type: "UPDATE_CONFIG",
      throttleLevel: currentThrottle / 100,
    });

    const newSocket = io(window.location.origin, {
      path: "/socket.io",
      query: { persistentId: identity.id },
    });

    setSocket(newSocket);
    socketRef.current = newSocket;

    newSocket.on("connect", () => {
      setWorkerId(newSocket.id || "...");
      onLog?.(`[NET] Connected as ${identity.name}`);

      // SEND ID HERE
      newSocket.emit("REGISTER_DEVICE", {
        id: identity.id, // <--- Matching server expectation
        name: identity.name,
        type: "DESKTOP",
        capabilities: {
          cpuCores: navigator.hardwareConcurrency || 4,
          memoryGB: (navigator as any).deviceMemory || 8,
          maxConcurrency: navigator.hardwareConcurrency || 4,
          supportedJobs: ["MAT_MUL", "MATH_STRESS"], // Matches server job types
        },
      });
    });

    // ... (Keep JOB_DISPATCH, BATCH_DISPATCH handlers) ...
    newSocket.on("JOB_DISPATCH", (job) => {
      inFlightRequests.current = Math.max(0, inFlightRequests.current - 1);
      jobBuffer.current.push(job);
      processQueue();
    });

    newSocket.on("BATCH_DISPATCH", (jobs) => {
      inFlightRequests.current = Math.max(0, inFlightRequests.current - 1);
      jobs.forEach((j: any) => jobBuffer.current.push(j));
      processQueue();
    });

    newSocket.on("NO_WORK", () => {
      inFlightRequests.current = Math.max(0, inFlightRequests.current - 1);
    });

    // Worker Message Handling
    workerRef.current.onmessage = (e) => {
      const msg = e.data;

      if (msg.type === "CONFIG_APPLIED") {
        setActiveThreads(msg.threads); // This fixes the "2 cores" issue
        onLog?.(`[CPU] Scaling to ${msg.threads} threads`);
        processQueue();
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
      }
    };

    const pump = setInterval(processQueue, 100);

    return () => {
      clearInterval(pump);
      newSocket.disconnect();
      workerRef.current?.terminate();
    };
  }, [identity]);

  // Sync count to UI
  useEffect(() => {
    const i = setInterval(
      () => setCompletedCount(completedCountRef.current),
      500,
    );
    return () => clearInterval(i);
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
    isRunning: isRunningRef.current,
    startSwarm,
    pauseSwarm,
    stopSwarm,
    setOpsScore,
  };
};
