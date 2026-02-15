// client/src/contexts/SwarmContext.tsx
import { createContext, useContext, type ReactNode, useMemo } from "react";
import {
  type SwarmSnapshot,
  type DeviceInfo,
  type SwarmStatus,
} from "../core/types";
import { useSocket } from "../hooks/useSocket";
import { useSwarmStore } from "../core/swarmStore";
import { useWorker } from "../hooks/useWorker";

interface SwarmContextType {
  snapshot: SwarmSnapshot | null;
  devices: DeviceInfo[];
  isConnected: boolean;
  logs: string[];
  actions: {
    setRunState: (state: SwarmStatus) => void;
    setThrottle: (value: number) => void;
    toggleDevice: (id: string, enabled: boolean) => void;
    runLocalBenchmark: () => void;
    generateInviteToken: () => Promise<string>;
    leaveSwarm: () => void;
    manualJoin: (code: string) => Promise<void>;
  };
}

const SwarmContext = createContext<SwarmContextType | undefined>(undefined);

export const SwarmProvider = ({ children }: { children: ReactNode }) => {
  const { snapshot, isConnected, logs } = useSwarmStore();

  // 1. Initialize Worker Logic
  const { runLocalBenchmark, executeJob } = useWorker();

  // 2. Initialize Socket Logic with Worker Bridge
  const socketActions = useSocket(executeJob);

  const devices = useMemo(
    () => (snapshot ? Object.values(snapshot.devices) : []),
    [snapshot],
  );

  const value = useMemo(
    () => ({
      snapshot,
      devices,
      isConnected,
      logs,
      actions: {
        ...socketActions,
        runLocalBenchmark, // Now provided by the real useWorker hook
      },
    }),
    [snapshot, devices, isConnected, logs, socketActions, runLocalBenchmark],
  );

  return (
    <SwarmContext.Provider value={value}>{children}</SwarmContext.Provider>
  );
};

export const useSwarm = () => {
  const context = useContext(SwarmContext);
  if (!context) throw new Error("useSwarm must be used within a SwarmProvider");
  return context;
};
