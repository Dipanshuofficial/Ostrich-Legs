// client/src/hooks/useSocket.ts
import { useCallback, useEffect } from "react";
import { socketManager } from "../core/SocketManager";
import { SocketEvents } from "@shared/socket/events";
import { useSwarmStore } from "../core/swarmStore";
import { usePersistentIdentity } from "./usePersistentIdentity";
import { type SwarmStatus, type Job } from "../core/types";

export const useSocket = (onJobReceived?: (job: Job) => void) => {
  const { identity, swarmToken, saveSwarmToken, clearSwarmToken } =
    usePersistentIdentity();
  const { setSnapshot, setConnected, addLog, snapshot } = useSwarmStore();

  const getSocket = useCallback(() => {
    return socketManager.get(identity.id, swarmToken);
  }, [identity.id, swarmToken]);

  useEffect(() => {
    if (!identity.id || identity.id === "loading-identity") return;

    const socket = getSocket();

    socket.on(SocketEvents.CONNECT, () => {
      setConnected(true);
      addLog("NET", "Swarm Link Established");
      socket.emit(SocketEvents.DEVICE_REGISTER, {
        name: localStorage.getItem("ostrich_device_name") || "Local Node",
        capabilities: {
          cpuCores: navigator.hardwareConcurrency || 4,
          memoryGB: (navigator as any).deviceMemory || 8,
          gpuAvailable: !!(navigator as any).gpu,
        },
      });
      // Immediately request work if the swarm is already running
      socket.emit(SocketEvents.JOB_REQUEST_BATCH);
    });

    socket.on("disconnect", () => setConnected(false));

    socket.on(SocketEvents.SWARM_SNAPSHOT, (data) => {
      const previousState = snapshot?.runState;
      setSnapshot(data);
      // If state just changed to RUNNING, kickstart the pipeline
      if (previousState !== "RUNNING" && data.runState === "RUNNING") {
        socket.emit(SocketEvents.JOB_REQUEST_BATCH);
      }
    });

    socket.on(SocketEvents.JOB_BATCH_DISPATCH, (jobs: Job[]) => {
      if (onJobReceived) {
        jobs.forEach((job) => onJobReceived(job));
      }
    });

    socket.on(SocketEvents.SYSTEM_LOG, (p) => addLog(p.level, p.message));

    return () => {
      socket.off(SocketEvents.CONNECT);
      socket.off("disconnect");
      socket.off(SocketEvents.SWARM_SNAPSHOT);
      socket.off(SocketEvents.JOB_BATCH_DISPATCH);
      socket.off(SocketEvents.SYSTEM_LOG);
    };
  }, [
    identity.id,
    getSocket,
    setConnected,
    setSnapshot,
    addLog,
    onJobReceived,
    snapshot?.runState,
  ]);

  // Orchestration Actions
  const setRunState = (s: SwarmStatus) =>
    getSocket().emit(SocketEvents.SWARM_SET_STATE, s);
  const setThrottle = (v: number) =>
    getSocket().emit(SocketEvents.SWARM_SET_THROTTLE, v);
  const toggleDevice = (id: string, enabled: boolean) =>
    getSocket().emit("cmd:toggle_device", { id, enabled });

  const manualJoin = async (code: string) => {
    saveSwarmToken(code);
    const socket = socketManager.get(identity.id, code);
    return new Promise<void>((res, rej) => {
      socket.once("connect", () => res());
      socket.once("connect_error", (err) => rej(err));
      setTimeout(() => rej(new Error("Join Timeout")), 5000);
    });
  };

  const leaveSwarm = () => {
    clearSwarmToken();
    socketManager.disconnect();
    window.location.href = window.location.origin;
  };

  const generateInviteToken = () =>
    new Promise<string>((res) => getSocket().emit("auth:generate_token", res));

  return {
    setRunState,
    setThrottle,
    toggleDevice,
    manualJoin,
    leaveSwarm,
    generateInviteToken,
  };
};
