// client/src/hooks/useWorker.ts
import { useEffect, useRef, useCallback } from "react";
import { useSwarmStore } from "../core/swarmStore";
import { socketManager } from "../core/SocketManager";
import { SocketEvents } from "@shared/socket/events";
import { usePersistentIdentity } from "./usePersistentIdentity";
import { MAX_SAFE_THROTTLE_PERCENT } from "../core/constants";
import ComputeWorker from "../utils/compute.worker?worker";
import { metrics } from "../utils/metrics";

export const useWorker = () => {
  const workerRef = useRef<Worker | null>(null);
  const { identity, swarmToken } = usePersistentIdentity();
  const { snapshot, addLog } = useSwarmStore();

  const handleWorkerMessage = useCallback(
    (e: MessageEvent) => {
      const {
        type,
        score,
        chunkId,
        result,
        error,
        message,
        level,
        durationMs,
      } = e.data;
      const socket = socketManager.get(identity.id, swarmToken);

      switch (type) {
        case "WORKER_LOG":
          addLog(level || "SYS", message);
          break;
        case "BENCHMARK_COMPLETE":
          socket.emit(SocketEvents.BENCHMARK_RESULT, { score });
          addLog("CPU", `Benchmark: ${score.toLocaleString()} OPS/s`);
          break;
        case "JOB_COMPLETE":
          if (durationMs) {
            metrics.record("job_execution_time", durationMs);
          }
          socket.emit(SocketEvents.JOB_COMPLETE, {
            chunkId,
            result,
            workerId: identity.id,
            durationMs,
          });
          socket.emit(SocketEvents.JOB_REQUEST_BATCH);
          break;
        case "JOB_ERROR":
          addLog("ERR", `Job ${chunkId} failed: ${error}`);
          socket.emit(SocketEvents.JOB_COMPLETE, {
            chunkId,
            error,
            workerId: identity.id,
          });
          socket.emit(SocketEvents.JOB_REQUEST_BATCH);
          break;
      }
    },
    [identity.id, swarmToken, addLog],
  );

  // Initialize Worker
  useEffect(() => {
    if (!workerRef.current) {
      workerRef.current = new ComputeWorker();
    }
    workerRef.current.onmessage = handleWorkerMessage;

    return () => {
      workerRef.current?.terminate();
      workerRef.current = null;
    };
  }, [handleWorkerMessage]);

  // Sync Throttle with Worker Thread Pool
  useEffect(() => {
    if (!workerRef.current) return;

    const globalThrottle = snapshot?.stats.globalThrottle ?? 40;
    const safeThrottle =
      Math.min(globalThrottle, MAX_SAFE_THROTTLE_PERCENT) / 100;

    workerRef.current.postMessage({
      type: "CONFIG_UPDATE",
      payload: { throttle: safeThrottle },
    });
  }, [snapshot?.stats.globalThrottle]);

  const runLocalBenchmark = useCallback(() => {
    const socket = socketManager.get(identity.id, swarmToken);
    socket.emit(SocketEvents.HEARTBEAT, { lastInteraction: Date.now() });
    addLog("SYS", "Manual Benchmark Triggered");
    workerRef.current?.postMessage({ type: "BENCHMARK" });
  }, [identity.id, swarmToken, addLog]);

  const executeJob = useCallback((job: any) => {
    workerRef.current?.postMessage({ type: "EXECUTE_JOB", payload: job });
  }, []);

  return { runLocalBenchmark, executeJob };
};
