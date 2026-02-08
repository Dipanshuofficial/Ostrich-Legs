import { useState, useEffect, useCallback } from "react";
import { Zap, Share2 } from "lucide-react";
import { useComputeSwarm } from "./hooks/useComputeSwarm";

import { GpuStatusMonitor } from "./components/dashboard/GpuStatusMonitor";
import { DeviceHealth } from "./components/dashboard/DeviceHealth";
import { ThrottleControl } from "./components/dashboard/ThrottleControl";
import { LiveTerminal } from "./components/dashboard/LiveTerminal";
import { DeviceConnector } from "./components/dashboard/DeviceConnector";
import { ThemeToggle } from "./components/ui/ThemeToggle";

import { SwarmDashboard } from "./components/dashboard/SwarmDashboard";
import type { DeviceInfo, SwarmStats } from "../../shared/types";
import { SwarmControls } from "./components/dashboard/SwarmControls";

function App() {
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
    devicesByType: {
      DESKTOP: 0,
      MOBILE: 0,
      COLAB: 0,
      SERVER: 0,
      TABLET: 0,
    },
  });
  const [joinCode, setJoinCode] = useState("LOADING...");
  // 1. Create a stable log function
  const addLog = useCallback((msg: string) => {
    setLogs((prev) => [...prev.slice(-19), `> ${msg}`]); // Keep last 20
  }, []);
  const {
    status,
    completedCount,
    workerId,
    opsScore,
    updateThrottle,
    throttle,
    activeThreads,
    socket,
    isRunning,
    startSwarm,
    pauseSwarm,
    stopSwarm,
  } = useComputeSwarm(addLog);
  // Listen for swarm updates
  useEffect(() => {
    if (!socket) return;
    // 1. Fetch the initial list of connected devices via REST
    const fetchDevices = () => {
      fetch(`${serverUrl}/api/devices`)
        .then((res) => res.json())
        .then((data) => setDevices(data))
        .catch((err) => console.error("Fetch error:", err));
    };

    // 3. Initial Fetch (Get data immediately upon connection)
    fetchDevices();
    // 4. Polling Fallback (Refresh every 5 seconds)
    // This guarantees the list fixes itself even if an event is missed
    const interval = setInterval(fetchDevices, 5000);

    // 5. Real-time Listeners
    socket.on("DEVICE_JOINED", fetchDevices); // Just re-fetch to be safe
    socket.on("DEVICE_LEFT", fetchDevices);
    socket.on("CURRENT_DEVICES", (data) => setDevices(data));
    // 2. Fetch initial stats
    fetch(`${serverUrl}/api/stats`)
      .then((res) => res.json())
      .then((data) => {
        setSwarmStats(data);
      })
      .catch((err) => console.error("Failed to fetch stats:", err));

    // Request initial join code
    socket.emit("REQUEST_JOIN_CODE");

    socket.on("JOIN_CODE", (data: { code: string }) => {
      setJoinCode(data.code);
    });

    socket.on("SWARM_STATS", (stats: SwarmStats) => {
      setSwarmStats(stats);
    });

    socket.on("DEVICE_JOINED", (device: DeviceInfo) => {
      // 1. Update the Device List (Deduplicate)
      setDevices((prev) => {
        // If we already have this device ID, just update it (don't add duplicates)
        const exists = prev.some((d) => d.id === device.id);

        // ONLY log if this is actually a new device
        if (!exists) {
          setLogs((currentLogs) => [
            ...currentLogs.slice(-8),
            `> [${new Date().toLocaleTimeString()}] Device joined: ${device.name}`,
          ]);
        }

        // Return the updated list (filter out old version, add new)
        return [...prev.filter((d) => d.id !== device.id), device];
      });
    });
    // New listener for the direct update from server
    socket.on("CURRENT_DEVICES", (currentDevices: DeviceInfo[]) => {
      setDevices(currentDevices);
    });
    socket.on("DEVICE_LEFT", (data: { deviceId: string }) => {
      setDevices((prev) => {
        const device = prev.find((d) => d.id === data.deviceId);
        if (device) {
          setLogs((logs) => [
            ...logs.slice(-8),
            `> [${new Date().toLocaleTimeString()}] Device left: ${device.name}`,
          ]);
        }
        return prev.filter((d) => d.id !== data.deviceId);
      });
    });

    return () => {
      socket.off("JOIN_CODE");
      socket.off("SWARM_STATS");
      clearInterval(interval);
      socket.off("DEVICE_JOINED");
      socket.off("DEVICE_LEFT");
      socket.off("CURRENT_DEVICES");
    };
  }, [socket]);

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
          currentThrottle={throttle}
        />
        <div className="md:col-span-4 h-90 flex gap-4">
          {/* 1. The Health Card (Takes remaining width) */}
          <DeviceHealth
            className="flex-1 h-full"
            status={status}
            opsScore={opsScore}
            workerId={workerId}
          />
          {/* 2. The Vertical Controls Strip */}
          <SwarmControls
            isRunning={isRunning}
            status={status}
            onStart={startSwarm}
            onPause={pauseSwarm}
            onStop={stopSwarm}
          />
        </div>

        {/* Control Row */}
        <ThrottleControl
          throttle={throttle}
          setThrottle={(val) => updateThrottle(val)} // Wiring fixed
          updateThrottle={() => {}} // Deprecated prop, can remove from component
          activeThreads={activeThreads}
        />
        <LiveTerminal logs={logs} status={status} />

        {/* Swarm Overview */}
        <SwarmDashboard devices={devices} stats={swarmStats} />

        {/* Logs */}
      </div>
      <DeviceConnector
        isOpen={showQR}
        joinCode={joinCode}
        serverUrl={serverUrl}
        onClose={() => setShowQR(false)}
      />
    </div>
  );
}

export default App;
