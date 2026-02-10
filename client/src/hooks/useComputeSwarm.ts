import { useEffect, useRef, useState } from "react";
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
  const [completedCount, setCompletedCount] = useState(0); // <--- Local State
  const [joinCode, setJoinCode] = useState("LOADING...");

  // Refs
  const completedCountRef = useRef(0);
  const onLogRef = useRef(onLog);
  const socketRef = useRef<Socket | null>(null);
  const workerRef = useRef<Worker | null>(null);

  const identity = usePersistentIdentity();

  useEffect(() => {
    onLogRef.current = onLog;
  }, [onLog]);

  // --- 1. Master Setup ---
  useEffect(() => {
    const worker = new OstrichWorker();
    workerRef.current = worker;

    worker.onmessage = (e) => {
      const { type, chunkId, result, score, error } = e.data;

      if (type === "BENCHMARK_COMPLETE") {
        onLogRef.current?.(`[CPU] Benchmark Result: ${score} OPS`);
        socketRef.current?.emit("benchmark:result", { score });
      } else if (type === "JOB_COMPLETE") {
        completedCountRef.current += 1;
        socketRef.current?.emit("job:complete", {
          chunkId,
          result,
          workerId: identity.id,
        } as WorkerResult);
        socketRef.current?.emit("job:request_batch");
      } else if (type === "JOB_ERROR") {
        socketRef.current?.emit("job:complete", {
          chunkId,
          error,
          workerId: identity.id,
        } as WorkerResult);
      }
    };

    const sUrl = import.meta.env.DEV
      ? `${window.location.protocol}//${window.location.hostname}:3000`
      : window.location.origin;

    const s = io(sUrl, {
      query: { persistentId: identity.id },
      transports: ["websocket"],
      reconnectionAttempts: 10,
    });
    socketRef.current = s;

    s.on("connect", () => {
      onLogRef.current?.(`[NET] Connected as ${identity.name}`);
      s.emit("device:register", {
        name: identity.name,
        type: "DESKTOP",
        capabilities: { cpuCores: navigator.hardwareConcurrency || 4 },
      });
      s.emit("REQUEST_JOIN_CODE");
    });

    s.on("swarm:snapshot", setSnapshot);
    s.on("JOIN_CODE", (d) => setJoinCode(d.code));

    // BENCHMARK TRIGGER
    s.on("cmd:run_benchmark", () => {
      onLogRef.current?.("[SYS] Worker starting benchmark...");
      worker.postMessage({ type: "BENCHMARK" });
    });

    s.on("job:batch", (jobs: JobChunk[]) => {
      jobs.forEach((job) =>
        worker.postMessage({ type: "JOB_CHUNK", chunk: job }),
      );
    });

    return () => {
      s.disconnect();
      worker.terminate();
    };
  }, [identity.id, identity.name]);

  // --- 2. UI Sync Loop ---
  useEffect(() => {
    const uiInterval = setInterval(() => {
      setCompletedCount((prev) => {
        // Sync local ref to state for UI updates
        if (prev !== completedCountRef.current) {
          return completedCountRef.current;
        }
        return prev;
      });
    }, 500);
    return () => clearInterval(uiInterval);
  }, []);

  // --- 3. Auto-Request Loop ---
  useEffect(() => {
    if (!snapshot) return;
    const myDevice = snapshot.devices[identity.id];
    const isSwarmRunning = snapshot.runState === SwarmRunState.RUNNING;
    const amIEnabled =
      myDevice?.state === DeviceState.ONLINE ||
      myDevice?.state === DeviceState.BUSY;

    if (isSwarmRunning && amIEnabled) {
      const interval = setInterval(() => {
        if (socketRef.current?.connected) {
          socketRef.current.emit("job:request_batch");
        }
      }, 1000);
      return () => clearInterval(interval);
    }
  }, [snapshot?.runState, snapshot?.devices, identity.id]);

  return {
    status: snapshot?.runState || SwarmRunState.IDLE,
    stats: snapshot?.stats,
    devices: Object.values(snapshot?.devices || {}),
    myDevice: snapshot?.devices[identity.id],
    joinCode,

    // FIX: Return the LOCAL state, not the snapshot (smoother + solves linter error)
    completedCount: completedCount,

    startSwarm: () =>
      socketRef.current?.emit("cmd:set_run_state", SwarmRunState.RUNNING),
    pauseSwarm: () =>
      socketRef.current?.emit("cmd:set_run_state", SwarmRunState.PAUSED),
    stopSwarm: () =>
      socketRef.current?.emit("cmd:set_run_state", SwarmRunState.STOPPED),
    toggleDevice: (id: string, enabled: boolean) =>
      socketRef.current?.emit("cmd:toggle_device", { id, enabled }),
    updateThrottle: (level: number) =>
      workerRef.current?.postMessage({
        type: "UPDATE_CONFIG",
        throttleLevel: level / 100,
      }),

    runBenchmark: () => {
      onLogRef.current?.("[SYS] Requesting Swarm Benchmark...");
      socketRef.current?.emit("cmd:trigger_benchmark");
    },
  };
};
