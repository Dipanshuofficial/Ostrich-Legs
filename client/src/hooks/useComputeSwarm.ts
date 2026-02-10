import { useEffect, useRef, useState, useCallback } from "react";
import { io, Socket } from "socket.io-client";
import {
  type SwarmSnapshot,
  SwarmRunState,
  DeviceState,
  type JobChunk,
  type WorkerResult,
} from "../../../shared/types";
import OstrichWorker from "../utils/worker?worker";
import { usePersistentIdentity } from "./usePersistentIdentity";

export const useComputeSwarm = (onLog?: (msg: string) => void) => {
  const [snapshot, setSnapshot] = useState<SwarmSnapshot | null>(null);

  // UI STATE (Throttled)
  const [completedCount, setCompletedCount] = useState(0);
  const [opsScore, setOpsScore] = useState(0);
  const [joinCode, setJoinCode] = useState("LOADING...");

  // HIGH-SPEED REFS (Non-rendering)
  const completedCountRef = useRef(0);
  const opsScoreRef = useRef(0);

  const socketRef = useRef<Socket | null>(null);
  const workerRef = useRef<Worker | null>(null);
  const identity = usePersistentIdentity();

  // --- 1. Worker Management ---
  const initWorker = useCallback(() => {
    if (workerRef.current) workerRef.current.terminate();
    workerRef.current = new OstrichWorker();

    workerRef.current.onmessage = (e) => {
      const { type, chunkId, result, score, error } = e.data;

      if (type === "BENCHMARK_COMPLETE") {
        // Store in ref, don't re-render yet
        opsScoreRef.current = score;
        setOpsScore(score); // Benchmark is rare, safe to render immediately
      } else if (type === "JOB_COMPLETE") {
        // HOT PATH: ONLY Update Ref
        completedCountRef.current += 1;

        // Network IO is async/off-main-thread usually, so this is fine
        socketRef.current?.emit("job:complete", {
          chunkId,
          result,
          workerId: identity.id,
        } as WorkerResult);

        socketRef.current?.emit("job:request_batch");
      } else if (type === "JOB_ERROR") {
        onLog?.(`[ERR] Job failed: ${error}`);
        socketRef.current?.emit("job:complete", {
          chunkId,
          error,
          workerId: identity.id,
        } as WorkerResult);
      }
    };
  }, [identity.id, onLog]);

  // --- 2. UI Sync Loop (The Fix) ---
  useEffect(() => {
    const uiInterval = setInterval(() => {
      // Only trigger React Render if numbers changed
      setCompletedCount((prev) => {
        if (prev !== completedCountRef.current) {
          return completedCountRef.current;
        }
        return prev;
      });
    }, 200); // Update UI 5 times per second max (Smooth but not freezing)

    return () => clearInterval(uiInterval);
  }, []);

  // --- 3. Socket Connection ---
  useEffect(() => {
    initWorker();

    const sUrl = import.meta.env.DEV
      ? `${window.location.protocol}//${window.location.hostname}:3000`
      : window.location.origin;

    const s = io(sUrl, {
      query: { persistentId: identity.id },
      transports: ["websocket"],
    });
    socketRef.current = s;

    s.on("connect", () => {
      onLog?.(`[NET] Connected as ${identity.name}`);
      s.emit("device:register", {
        name: identity.name,
        type: "DESKTOP",
        capabilities: { cpuCores: navigator.hardwareConcurrency || 4 },
      });
      s.emit("REQUEST_JOIN_CODE");
    });

    s.on("swarm:snapshot", (newSnapshot: SwarmSnapshot) => {
      setSnapshot(newSnapshot);
    });

    s.on("JOIN_CODE", (data: { code: string }) => {
      setJoinCode(data.code);
    });

    s.on("job:batch", (jobs: JobChunk[]) => {
      if (!workerRef.current) return;
      jobs.forEach((job) => {
        workerRef.current?.postMessage({ type: "JOB_CHUNK", chunk: job });
      });
    });

    return () => {
      s.disconnect();
      workerRef.current?.terminate();
    };
  }, [identity, initWorker, onLog]);

  // --- 4. Auto-Request Loop ---
  useEffect(() => {
    if (!snapshot) return;

    const myDevice = snapshot.devices[identity.id];
    const isSwarmRunning = snapshot.runState === SwarmRunState.RUNNING;
    const amIEnabled =
      myDevice?.state === DeviceState.ONLINE ||
      myDevice?.state === DeviceState.BUSY;

    if (isSwarmRunning && amIEnabled) {
      const interval = setInterval(() => {
        socketRef.current?.emit("job:request_batch");
      }, 1000);

      return () => clearInterval(interval);
    }
  }, [snapshot, identity.id]);

  return {
    status: snapshot?.runState || SwarmRunState.IDLE,
    stats: snapshot?.stats,
    devices: Object.values(snapshot?.devices || {}),
    myDevice: snapshot?.devices[identity.id],
    joinCode,
    completedCount, // This is now a throttled state
    opsScore,

    startSwarm: () =>
      socketRef.current?.emit("cmd:set_run_state", SwarmRunState.RUNNING),
    pauseSwarm: () =>
      socketRef.current?.emit("cmd:set_run_state", SwarmRunState.PAUSED),
    stopSwarm: () =>
      socketRef.current?.emit("cmd:set_run_state", SwarmRunState.STOPPED),
    toggleDevice: (id: string, enabled: boolean) =>
      socketRef.current?.emit("cmd:toggle_device", { id, enabled }),

    updateThrottle: (level: number) => {
      workerRef.current?.postMessage({
        type: "UPDATE_CONFIG",
        throttleLevel: level / 100,
      });
    },

    runBenchmark: () => workerRef.current?.postMessage({ type: "BENCHMARK" }),
  };
};
