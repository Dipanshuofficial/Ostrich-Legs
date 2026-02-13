import { useEffect, useRef, useState, useCallback } from "react";
import { io, Socket } from "socket.io-client";
import { SocketEvents } from "@shared/socket/events";
import { type LogLevel, type SystemLogPayload } from "@shared/socket/states";
import { type SwarmSnapshot, type SwarmStatus, type Job } from "../core/types";
// Import the constructor directly
import ComputeWorker from "../utils/compute.worker?worker";

// PERSISTENCE: Keep socket and worker outside React lifecycle to survive HMR
let globalSocket: Socket | null = null;
let globalWorker: Worker | null = null;

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

  // Track the current token to prevent redundant connections
  const currentTokenRef = useRef<string | null>(null);

  const connect = useCallback(
    (manualToken?: string) => {
      // If we are already connected to this specific token/swarm, do nothing
      const inviteToken =
        manualToken ||
        new URLSearchParams(window.location.search).get("invite") ||
        "";
      if (
        socketRef.current?.connected &&
        currentTokenRef.current === inviteToken &&
        !manualToken
      ) {
        return;
      }

      if (socketRef.current) {
        socketRef.current.disconnect();
      }

      currentTokenRef.current = inviteToken;
      const isTunnel = window.location.hostname.includes("trycloudflare.com");
      const serverUrl = isTunnel
        ? "/"
        : `http://${window.location.hostname}:3000`;

      // Re-use existing socket if it's already connected to the same swarm
      if (globalSocket?.connected && currentTokenRef.current === inviteToken) {
        socketRef.current = globalSocket;
        return;
      }

      const socket = io(serverUrl, {
        query: { persistentId, token: inviteToken },
        auth: { token: inviteToken },
        transports: ["websocket", "polling"],
        reconnection: true,
        reconnectionAttempts: Infinity, // Never give up on the swarm
        reconnectionDelay: 1000,
        path: "/socket.io/",
      });

      globalSocket = socket;
      socketRef.current = socket;

      socket.on(SocketEvents.CONNECT, () => {
        setIsConnected(true);
        addLog("NET", "Swarm Link Established");

        socket.emit(SocketEvents.DEVICE_REGISTER, {
          name: localStorage.getItem("ostrich_device_name") || "Local Node",
          capabilities: {
            cpuCores: navigator.hardwareConcurrency || 4,
            memoryGB: (navigator as any).deviceMemory || 8,
            gpuAvailable: !!(navigator as any).gpu,
          },
        });

        // --- ADD HEARTBEAT EMITTER ---
        const hbInterval = setInterval(() => {
          if (socket.connected) {
            socket.emit(SocketEvents.HEARTBEAT, {
              lastInteraction: Date.now(),
            });
          }
        }, 10000); // Every 10s

        socket.on("disconnect", () => clearInterval(hbInterval));
        // -----------------------------

        socket.emit(SocketEvents.JOB_REQUEST_BATCH);
        workerRef.current?.postMessage({ type: "BENCHMARK" });
      });

      // Add error feedback
      socket.on("connect_error", (err) => {
        setIsConnected(false);
        addLog("ERR", `Connection failed: ${err.message}`);
      });

      socket.on(SocketEvents.SYSTEM_LOG, (payload: SystemLogPayload) => {
        addLog(payload.level, payload.message);
      });

      socket.on(SocketEvents.JOB_BATCH_DISPATCH, (jobs: Job[]) => {
        jobs.forEach((job) =>
          workerRef.current?.postMessage({ type: "EXECUTE_JOB", payload: job }),
        );
      });

      socket.on(SocketEvents.SWARM_SNAPSHOT, (data: SwarmSnapshot) => {
        setSnapshot((prev) => {
          // Check if we just transitioned to RUNNING
          if (prev?.runState !== "RUNNING" && data.runState === "RUNNING") {
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
          return data;
        });
      });

      socket.on("disconnect", (reason) => {
        setIsConnected(false);
        if (reason !== "io client disconnect") {
          addLog("NET", `Link unstable: ${reason}.`);
        }
      });
    },
    [persistentId, addLog], // snapshot?.runState REMOVED
  );

  // 1. Initialize Worker once on mount
  useEffect(() => {
    if (!globalWorker) {
      globalWorker = new ComputeWorker();
    }
    workerRef.current = globalWorker;

    // Do NOT terminate here, as HMR would kill the worker on every save
    return () => {};
  }, []);

  // 2. Sync worker message handler whenever it changes
  useEffect(() => {
    if (workerRef.current) {
      workerRef.current.onmessage = handleWorkerMessage;
    }
  }, [handleWorkerMessage]);

  // 3. Primary Connection Logic (Single instance)
  useEffect(() => {
    if (persistentId && persistentId !== "loading-identity") {
      connect();
    }
    return () => {
      // Disconnect socket only on unmount or ID change
      if (socketRef.current) {
        socketRef.current.disconnect();
      }
    };
  }, [persistentId, connect]);

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
