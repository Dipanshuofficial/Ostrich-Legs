import { useEffect, useRef, useState } from "react";
import { io, Socket } from "socket.io-client";
import { type JobChunk, type WorkerResult } from "../../../shared/types";
// @ts-ignore
import OstrichWorker from "../utils/worker?worker";
import { usePersistentIdentity } from "./usePersistentIdentity";

const SERVER_URL = "http://localhost:3000";

export const useComputeSwarm = () => {
  const [status, setStatus] = useState<"IDLE" | "WORKING">("IDLE");
  const [completedCount, setCompletedCount] = useState(0);
  const completedCountRef = useRef(0);
  const [realLogs, setRealLogs] = useState<string[]>([]); // <--- NEW

  const [workerId, setWorkerId] = useState<string>("");
  const [opsScore, setOpsScore] = useState<number>(0);

  const [activeThreads, setActiveThreads] = useState<number>(1);
  const [currentThrottle, setCurrentThrottle] = useState<number>(0.3);

  const inFlightRequests = useRef(0);
  const activeJobs = useRef(0);
  const jobBuffer = useRef<JobChunk[]>([]);

  const socketRef = useRef<Socket | null>(null);
  const workerRef = useRef<Worker | null>(null);
  const identity = usePersistentIdentity();

  // SYNC LOOP: Decouple Engine Speed from UI Updates
  useEffect(() => {
    const syncInterval = setInterval(() => {
      setCompletedCount((prev) => {
        if (prev !== completedCountRef.current)
          return completedCountRef.current;
        return prev;
      });
    }, 100);
    return () => clearInterval(syncInterval);
  }, []);

  const processQueue = () => {
    if (!workerRef.current) return;

    // 1. Assign Jobs to Free Threads AGGRESSIVELY
    while (jobBuffer.current.length > 0 && activeJobs.current < activeThreads) {
      const job = jobBuffer.current.shift();
      if (job) {
        activeJobs.current += 1;
        setStatus("WORKING");
        workerRef.current.postMessage({
          type: "JOB_CHUNK",
          chunk: job,
          workerId: socketRef.current?.id,
        });
      }
    }

    // 2. Prefetch: Keep (Threads * 5) jobs in pipeline for high throughput
    // This ensures threads never wait for network round-trips
    const desiredBuffer = Math.max(20, activeThreads * 5);
    const currentSupply =
      activeJobs.current + jobBuffer.current.length + inFlightRequests.current;

    if (currentSupply < desiredBuffer) {
      const deficit = desiredBuffer - currentSupply;
      
      // Use batch requesting for large deficits (5+ jobs)
      if (deficit >= 5) {
        inFlightRequests.current += 1;
        socketRef.current?.emit("REQUEST_BATCH", Math.min(deficit, 15));
      } else {
        // Request individual jobs for small deficits
        for (let i = 0; i < deficit; i++) {
          inFlightRequests.current += 1;
          socketRef.current?.emit("REQUEST_WORK");
        }
      }
    }
  };

  useEffect(() => {
    if (!identity) return;

    workerRef.current = new OstrichWorker();
    workerRef.current.postMessage({
      type: "UPDATE_CONFIG",
      throttleLevel: 0.3,
    });

    socketRef.current = io(SERVER_URL, {
      query: { persistentId: identity.id, deviceName: identity.name },
    });

    workerRef.current.postMessage({ type: "BENCHMARK" });

    socketRef.current.on("connect", () => {
      setWorkerId(socketRef.current?.id || "Unknown ID");
      processQueue();
    });

    socketRef.current.on("JOB_DISPATCH", (job: JobChunk) => {
      inFlightRequests.current = Math.max(0, inFlightRequests.current - 1);
      jobBuffer.current.push(job);
      processQueue();
    });

    socketRef.current.on("BATCH_DISPATCH", (jobs: JobChunk[]) => {
      // Decrement in-flight counter for the batch request
      inFlightRequests.current = Math.max(0, inFlightRequests.current - 1);
      // Add all jobs to buffer
      jobs.forEach(job => jobBuffer.current.push(job));
      processQueue();
    });

    socketRef.current.on("NO_WORK", () => {
      // Decrement in-flight counter when server has no work
      inFlightRequests.current = Math.max(0, inFlightRequests.current - 1);
    });

    socketRef.current.on("WORK_ACK", () => {
      processQueue();
    });

    // AGGRESSIVE PUMP: Keep queue full every 50ms
    const pumpInterval = setInterval(() => {
      processQueue();
    }, 50);

    if (workerRef.current) {
      workerRef.current.onmessage = (e: MessageEvent) => {
        const message = e.data;

        // --- NEW: LOG HANDLING ---
        if (message.type === "WORKER_LOG") {
          setRealLogs((prev) => {
            const newLogs = [...prev, `> ${message.message}`];
            if (newLogs.length > 20) newLogs.shift();
            return newLogs;
          });
        } else if (message.type === "BENCHMARK_COMPLETE") {
          setOpsScore(message.score);
        } else if (message.type === "JOB_COMPLETE") {
          activeJobs.current = Math.max(0, activeJobs.current - 1);
          const resultPayload: WorkerResult = {
            chunkId: message.chunkId,
            workerId: workerId,
            result: message.result,
            durationMs: message.durationMs,
          };
          socketRef.current?.emit("JOB_COMPLETE", resultPayload);
          completedCountRef.current += 1;

          if (activeJobs.current === 0 && jobBuffer.current.length === 0) {
            setStatus("IDLE");
          }
          processQueue();
        } else if (message.type === "JOB_ERROR") {
          activeJobs.current = Math.max(0, activeJobs.current - 1);
          const errorPayload: WorkerResult = {
            chunkId: message.chunkId,
            workerId: workerId,
            error: message.error,
            details: message.details,
          };
          socketRef.current?.emit("JOB_COMPLETE", errorPayload);
          processQueue();
        } else if (message.type === "CONFIG_APPLIED") {
          setActiveThreads(message.threads);
          setCurrentThrottle(message.limit);
          if (message.score) setOpsScore(message.score);
          processQueue();
        }
      };
    }

    return () => {
      clearInterval(pumpInterval);
      socketRef.current?.disconnect();
      workerRef.current?.terminate();
    };
  }, [identity]);

  useEffect(() => {
    processQueue();
  }, [activeThreads]);

  const updateThrottle = (level: number) => {
    workerRef.current?.postMessage({
      type: "UPDATE_CONFIG",
      throttleLevel: level,
    });
  };
  const runBenchmark = () => {
    if (workerRef.current) {
      setOpsScore(0);
      workerRef.current.postMessage({ type: "BENCHMARK" });
    }
  };
  return {
    status,
    completedCount,
    workerId,
    opsScore,
    updateThrottle,
    activeThreads,
    runBenchmark,
    currentThrottle,
    realLogs, // <--- Exported
  };
};
