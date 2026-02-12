import { useEffect, useRef, useState, useCallback } from "react";
import { io, Socket } from "socket.io-client";
import { SocketEvents } from "@shared/socket/events";
import { type LogLevel, type SystemLogPayload } from "@shared/socket/states";
import { type SwarmSnapshot, type SwarmStatus, type Job } from "../core/types";
import ComputeWorker from "../utils/compute.worker?worker";

export const useSwarmEngine = (persistentId: string) => {
  const [snapshot, setSnapshot] = useState<SwarmSnapshot | null>(null);
  const [isConnected, setIsConnected] = useState(false);
  const [logs, setLogs] = useState<string[]>([]);
  const socketRef = useRef<Socket | null>(null);
  const workerRef = useRef<Worker | null>(null);

  const addLog = useCallback((level: LogLevel, message: string) => {
    const time = new Date().toLocaleTimeString().split(" ")[0];
    setLogs((prev) => [...prev.slice(-49), `[${time}] [${level}] ${message}`]);
  }, []);

  const handleWorkerMessage = useCallback(
    (e: MessageEvent) => {
      const { type, score, chunkId, result, error, message, level } = e.data;

      switch (type) {
        case "WORKER_LOG":
          addLog(level || "SYS", message);
          break;
        case "BENCHMARK_COMPLETE":
          socketRef.current?.emit(SocketEvents.BENCHMARK_RESULT, { score });
          addLog("CPU", `Benchmark: ${score.toLocaleString()} OPS/s`);
          break;
        case "JOB_COMPLETE":
          socketRef.current?.emit(SocketEvents.JOB_COMPLETE, {
            chunkId,
            result,
            workerId: persistentId,
          });
          socketRef.current?.emit(SocketEvents.JOB_REQUEST_BATCH); // Keep pipeline full
          break;
        case "JOB_ERROR":
          addLog("ERR", `Job ${chunkId} failed: ${error}`);
          socketRef.current?.emit(SocketEvents.JOB_COMPLETE, {
            chunkId,
            error,
            workerId: persistentId,
          });
          socketRef.current?.emit(SocketEvents.JOB_REQUEST_BATCH);
          break;
      }
    },
    [persistentId, addLog],
  );

  const connect = useCallback(
    (manualToken?: string) => {
      if (socketRef.current) socketRef.current.disconnect();

      const inviteToken =
        manualToken ||
        new URLSearchParams(window.location.search).get("invite");
      // Cloudflare Tunnel Detection
      const isTunnel = window.location.hostname.includes("trycloudflare.com");
      const serverUrl = isTunnel ? "/" : "http://localhost:3000";

      socketRef.current = io(serverUrl, {
        query: { persistentId },
        auth: { token: inviteToken },
        transports: ["websocket"], // ❌ REMOVED 'polling' to prevent Cloudflare proxy overhead
        reconnection: true,
        reconnectionAttempts: 15, // High for mobile stability
        reconnectionDelay: 1000,
        path: "/socket.io/",
      });

      socketRef.current.on(SocketEvents.CONNECT, () => {
        setIsConnected(true);
        addLog("NET", "Swarm Link Established");

        socketRef.current?.emit(SocketEvents.DEVICE_REGISTER, {
          name: localStorage.getItem("ostrich_device_name") || "Local Node",
          capabilities: {
            cpuCores: navigator.hardwareConcurrency || 4,
            memoryGB: (navigator as any).deviceMemory || 8,
            gpuAvailable: !!(navigator as any).gpu,
          },
        });
        socketRef.current?.emit(SocketEvents.JOB_REQUEST_BATCH);

        workerRef.current?.postMessage({ type: "BENCHMARK" });
      });

      socketRef.current.on(
        SocketEvents.SYSTEM_LOG,
        (payload: SystemLogPayload) => {
          addLog(payload.level, payload.message);
        },
      );

      socketRef.current.on(SocketEvents.JOB_BATCH_DISPATCH, (jobs: Job[]) => {
        jobs.forEach((job) =>
          workerRef.current?.postMessage({ type: "EXECUTE_JOB", payload: job }),
        );
      });

      socketRef.current.on(
        SocketEvents.SWARM_SNAPSHOT,
        (data: SwarmSnapshot) => {
          const wasRunning = snapshot?.runState === "RUNNING";
          const isNowRunning = data.runState === "RUNNING";
          setSnapshot(data);

          if (!wasRunning && isNowRunning) {
            // 🚨 STAGGERED START: Don't choke the tunnel on mobile
            const isMobile = /iPhone|iPad|iPod|Android/i.test(
              navigator.userAgent,
            );
            setTimeout(
              () => {
                socketRef.current?.emit(SocketEvents.JOB_REQUEST_BATCH);
              },
              isMobile ? 800 : 0,
            );
          }
        },
      );

      socketRef.current.on("disconnect", (reason) => {
        setIsConnected(false);
        addLog("NET", `Link unstable: ${reason}. Attempting recovery...`);
        // ❌ REMOVED: Do NOT redirect to home on disconnect
      });
    },
    [persistentId, addLog, snapshot?.runState],
  );

  useEffect(() => {
    const worker = new ComputeWorker();
    workerRef.current = worker;
    worker.onmessage = handleWorkerMessage;

    if (persistentId && persistentId !== "loading-identity") {
      connect();
    }

    return () => {
      worker.terminate();
      socketRef.current?.disconnect();
    };
  }, [connect, persistentId, handleWorkerMessage]);

  return {
    snapshot,
    devices: snapshot ? Object.values(snapshot.devices) : [],
    isConnected,
    logs,
    setRunState: (s: SwarmStatus) =>
      socketRef.current?.emit(SocketEvents.SWARM_SET_STATE, s),
    setGlobalThrottle: (v: number) =>
      socketRef.current?.emit(SocketEvents.SWARM_SET_THROTTLE, v),
    runLocalBenchmark: () =>
      workerRef.current?.postMessage({ type: "BENCHMARK" }),
    toggleDevice: (id: string, enabled: boolean) =>
      socketRef.current?.emit("cmd:toggle_device", { id, enabled }),
    manualJoin: (code: string) => connect(code),
    leaveSwarm: () => {
      window.location.href = window.location.origin;
    },
    // client/src/hooks/useSwarmEngine.ts
    generateInviteToken: () =>
      new Promise<string>((res) => {
        if (socketRef.current?.connected) {
          socketRef.current.emit("auth:generate_token", (token: string) => {
            res(token);
          });
        } else {
          res("");
        }
      }),
  };
};
