// client/src/hooks/useSocket.ts
// Updated for Cloudflare Workers WebSocket compatibility
import { useCallback, useEffect } from "react";
import { wsManager } from "../core/WebSocketManager";
import { SocketEvents } from "@shared/socket/events";
import { useSwarmStore } from "../core/swarmStore";
import { usePersistentIdentity } from "./usePersistentIdentity";
import { type SwarmStatus, type Job } from "../core/types";

export const useSocket = (onJobReceived?: (job: Job) => void) => {
  const { identity, swarmToken, saveSwarmToken, clearSwarmToken } =
    usePersistentIdentity();
  const { setSnapshot, setConnected, addLog, snapshot } = useSwarmStore();

  useEffect(() => {
    if (!identity.id || identity.id === "loading-identity") return;

    // Initialize WebSocket connection
    const manager = wsManager.get(identity.id, swarmToken);

    const handleConnect = () => {
      setConnected(true);
      addLog("NET", "Swarm Link Established");
      
      // Register device
      wsManager.emit(SocketEvents.DEVICE_REGISTER, {
        name: localStorage.getItem("ostrich_device_name") || "Local Node",
        capabilities: {
          cpuCores: navigator.hardwareConcurrency || 4,
          memoryGB: (navigator as any).deviceMemory || 8,
          gpuAvailable: !!(navigator as any).gpu,
        },
      });
      
      // Request initial jobs
      wsManager.emit(SocketEvents.JOB_REQUEST_BATCH, {});
    };

    const handleDisconnect = () => {
      setConnected(false);
    };

    const handleSnapshot = (data: any) => {
      const previousState = snapshot?.runState;
      setSnapshot(data);
      
      // Kickstart pipeline if state changed to RUNNING
      if (previousState !== "RUNNING" && data.runState === "RUNNING") {
        wsManager.emit(SocketEvents.JOB_REQUEST_BATCH, {});
      }
    };

    const handleJobBatch = (jobs: Job[]) => {
      if (onJobReceived) {
        jobs.forEach((job) => onJobReceived(job));
      }
    };

    const handleSystemLog = (p: any) => {
      addLog(p.level, p.message);
    };

    // Subscribe to events
    wsManager.on("connect", handleConnect);
    wsManager.on("disconnect", handleDisconnect);
    wsManager.on(SocketEvents.SWARM_SNAPSHOT, handleSnapshot);
    wsManager.on(SocketEvents.JOB_BATCH_DISPATCH, handleJobBatch);
    wsManager.on(SocketEvents.SYSTEM_LOG, handleSystemLog);

    return () => {
      wsManager.off("connect", handleConnect);
      wsManager.off("disconnect", handleDisconnect);
      wsManager.off(SocketEvents.SWARM_SNAPSHOT, handleSnapshot);
      wsManager.off(SocketEvents.JOB_BATCH_DISPATCH, handleJobBatch);
      wsManager.off(SocketEvents.SYSTEM_LOG, handleSystemLog);
    };
  }, [
    identity.id,
    swarmToken,
    setConnected,
    setSnapshot,
    addLog,
    onJobReceived,
    snapshot?.runState,
  ]);

  // Orchestration Actions
  const setRunState = (s: SwarmStatus) =>
    wsManager.emit(SocketEvents.SWARM_SET_STATE, s);
    
  const setThrottle = (v: number) =>
    wsManager.emit(SocketEvents.SWARM_SET_THROTTLE, v);
    
  const toggleDevice = (id: string, enabled: boolean) =>
    wsManager.emit("cmd:toggle_device", { id, enabled });

  const manualJoin = async (code: string): Promise<void> => {
    saveSwarmToken(code);
    return new Promise((res, rej) => {
      const timeout = setTimeout(() => rej(new Error("Join Timeout")), 5000);
      
      const onConnect = () => {
        clearTimeout(timeout);
        res();
      };
      
      wsManager.on("connect", onConnect);
      
      // Reconnect with new token
      wsManager.get(identity.id, code);
    });
  };

  const leaveSwarm = () => {
    clearSwarmToken();
    wsManager.disconnect();
    window.location.href = window.location.origin;
  };

  const generateInviteToken = (): Promise<string> =>
    new Promise((res) => {
      const handler = (token: string) => {
        res(token);
      };
      
      // One-time handler for token response
      wsManager.on("auth:token", handler);
      wsManager.emit("auth:generate_token", {});
    });

  return {
    setRunState,
    setThrottle,
    toggleDevice,
    manualJoin,
    leaveSwarm,
    generateInviteToken,
  };
};
