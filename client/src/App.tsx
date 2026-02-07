import { useState, useEffect, useRef } from "react";
import { Zap, Share2 } from "lucide-react";
import { useComputeSwarm } from "./hooks/useComputeSwarm";

import { GpuStatusMonitor } from "./components/dashboard/GpuStatusMonitor";
import { DeviceHealth } from "./components/dashboard/DeviceHealth";
import { ThrottleControl } from "./components/dashboard/ThrottleControl";
import { LiveTerminal } from "./components/dashboard/LiveTerminal";
import { ConnectionModal } from "./components/dashboard/ConnectionModal";
import { ThemeToggle } from "./components/ui/ThemeToggle";
import { DeviceConnector } from "./components/dashboard/DeviceConnector";
import { SwarmDashboard } from "./components/dashboard/SwarmDashboard";
import type { DeviceInfo, SwarmStats } from "../../shared/types";

function App() {
  const {
    status,
    completedCount,
    workerId,
    opsScore,
    updateThrottle,
    activeThreads,
    currentThrottle,
    socket,
  } = useComputeSwarm();

  const [throttle, setThrottle] = useState(30);
  const [showQR, setShowQR] = useState(false);
  const [logs, setLogs] = useState<string[]>([]);
  
  // Swarm state
  const [devices, setDevices] = useState<DeviceInfo[]>([]);
  const [swarmStats, setSwarmStats] = useState<SwarmStats>({
    totalDevices: 0,
    onlineDevices: 0,
    busyDevices: 0,
    totalCores: 0,
    totalMemoryGB: 0,
    pendingJobs: 0,
    activeJobs: 0,
    completedJobs: 0,
    failedJobs: 0,
    globalVelocity: 0,
    avgLatency: 0,
    devicesByType: {}
  });
  const [joinCode, setJoinCode] = useState("LOADING...");

  // Listen for swarm updates
  useEffect(() => {
    if (!socket) return;

    // Request initial join code
    socket.emit("REQUEST_JOIN_CODE");

    socket.on("JOIN_CODE", (data: { code: string }) => {
      setJoinCode(data.code);
    });

    socket.on("SWARM_STATS", (stats: SwarmStats) => {
      setSwarmStats(stats);
    });

    socket.on("DEVICE_JOINED", (device: DeviceInfo) => {
      setDevices(prev => [...prev.filter(d => d.id !== device.id), device]);
      setLogs(prev => [
        ...prev.slice(-8),
        `> [${new Date().toLocaleTimeString()}] Device joined: ${device.name} (${device.type})`
      ]);
    });

    socket.on("DEVICE_LEFT", (data: { deviceId: string }) => {
      setDevices(prev => {
        const device = prev.find(d => d.id === data.deviceId);
        if (device) {
          setLogs(logs => [
            ...logs.slice(-8),
            `> [${new Date().toLocaleTimeString()}] Device left: ${device.name}`
          ]);
        }
        return prev.filter(d => d.id !== data.deviceId);
      });
    });

    return () => {
      socket.off("JOIN_CODE");
      socket.off("SWARM_STATS");
      socket.off("DEVICE_JOINED");
      socket.off("DEVICE_LEFT");
    };
  }, [socket]);

  // ------------------------------------------------------------
  // LOGS (Throttled)
  // ------------------------------------------------------------
  const lastLogCountRef = useRef(completedCount);

  useEffect(() => {
    if (status === "WORKING" && completedCount !== lastLogCountRef.current) {
      lastLogCountRef.current = completedCount;

      if (completedCount % 10 === 0) {
        const msgs = [
          "Allocating Buffer...",
          "Matrix Mul: OK",
          "Garbage Collect",
          "Syncing...",
          "Validating Hash...",
          "Flushing Cache...",
        ];
        const randomMsg = msgs[Math.floor(Math.random() * msgs.length)];

        setLogs((prev) => [
          ...prev.slice(-8),
          `> [${new Date().toLocaleTimeString()}] ${randomMsg}`,
        ]);
      }
    }
  }, [completedCount, status]);

  const shareUrl = window.location.href;
  const serverUrl = `${window.location.protocol}//${window.location.host}`;

  return (
    <div className="min-h-screen relative bg-grain p-6 md:p-12 transition-colors duration-500">
      {/* HEADER */}
      <header className="flex justify-between items-center mb-12 relative z-10 max-w-7xl mx-auto">
        <div className="flex items-center gap-4">
          <div className="w-12 h-12 bg-linear-to-br from-indigo-500 to-violet-600 rounded-2xl flex items-center justify-center shadow-lg shadow-indigo-500/20">
            <Zap className="text-white fill-white" size={24} />
          </div>
          <div>
            <h1 className="text-2xl font-bold tracking-tight text-arc-text">
              Ostrich Legs
            </h1>
            <div className="flex items-center gap-2">
              <span
                className={`flex h-2 w-2 rounded-full ${
                  status === "WORKING"
                    ? "bg-emerald-500 animate-pulse"
                    : "bg-arc-muted"
                }`}
              />
              <p className="text-arc-muted text-xs font-medium uppercase tracking-wider">
                {status === "WORKING" ? "Swarm Active" : "Swarm Idle"}
              </p>
            </div>
          </div>
        </div>

        <div className="flex gap-3">
          <ThemeToggle />
          <button
            onClick={() => setShowQR(true)}
            className="group flex items-center gap-2 px-5 py-2.5 rounded-full bg-arc-card border border-arc-border hover:border-indigo-500/30 transition-all shadow-sm active:scale-95"
          >
            <Share2
              size={16}
              className="text-arc-muted group-hover:text-indigo-500 transition-colors"
            />
            <span className="text-sm font-semibold text-arc-text group-hover:text-indigo-500">
              Connect
            </span>
          </button>
        </div>
      </header>

      {/* DASHBOARD GRID */}
      <div className="grid grid-cols-1 md:grid-cols-12 gap-6 max-w-7xl mx-auto relative z-10">
        {/* Main Row */}
        <GpuStatusMonitor
          completedCount={completedCount}
          throttle={throttle}
          currentThrottle={currentThrottle}
        />
        <DeviceHealth status={status} opsScore={opsScore} workerId={workerId} />
        
        {/* Control Row */}
        <ThrottleControl
          throttle={throttle}
          setThrottle={setThrottle}
          updateThrottle={updateThrottle}
          activeThreads={activeThreads}
        />
        <DeviceConnector 
          serverUrl={serverUrl}
          joinCode={joinCode}
        />
        
        {/* Swarm Overview */}
        <SwarmDashboard 
          devices={devices}
          stats={swarmStats}
        />
        
        {/* Logs */}
        <LiveTerminal logs={logs} status={status} />
      </div>

      <ConnectionModal
        isOpen={showQR}
        onClose={() => setShowQR(false)}
        shareUrl={shareUrl}
      />
    </div>
  );
}

export default App;
