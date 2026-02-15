import { create } from "zustand";
import { type SwarmSnapshot } from "../core/types";
import { type LogLevel } from "@shared/socket/states";

interface SwarmState {
  snapshot: SwarmSnapshot | null;
  logs: string[];
  isConnected: boolean;
  setSnapshot: (s: SwarmSnapshot | null) => void;
  setConnected: (c: boolean) => void;
  addLog: (level: LogLevel, message: string) => void;
}

export const useSwarmStore = create<SwarmState>((set) => ({
  snapshot: null,
  logs: [],
  isConnected: false,
  setSnapshot: (s) => set({ snapshot: s }),
  setConnected: (c) => set({ isConnected: c }),
  addLog: (level, message) =>
    set((state) => {
      const time = new Date().toLocaleTimeString().split(" ")[0];
      const newLog = `[${time}] [${level}] ${message}`;
      return { logs: [...state.logs.slice(-49), newLog] };
    }),
}));
