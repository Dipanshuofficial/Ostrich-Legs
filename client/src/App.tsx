import { useState, useEffect, useCallback, useMemo } from "react";
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
import { usePersistentIdentity } from "./hooks/usePersistentIdentity";

function App() {
  const [showQR, setShowQR] = useState(false);
  const [logs, setLogs] = useState<string[]>([]);

  // Swarm state
  const [devices, setDevices] = useState<DeviceInfo[]>([]);

  // Calculate swarm resources for ThrottleControl
  const swarmResources = useMemo<{
    totalCores: number;
    activeCores: number;
    deviceCount: number;
  }>(() => {
    const totalCores = devices.reduce(
      (sum, d) => sum + (d.capabilities?.cpuCores || 0),
      0,
    );

    const activeCores = devices
      .filter((d) => d.isEnabled !== false)
      .reduce((sum, d) => sum + (d.capabilities?.cpuCores || 0), 0);

    return { totalCores, activeCores, deviceCount: devices.length };
  }, [devices]);

  // Calculate total swarm stats for SwarmDashboard
  const swarmStats = useMemo<SwarmStats>(() => {
    const totalCores = swarmResources.totalCores;
    const totalMemoryGB = devices.reduce(
      (sum, d) => sum + (d.capabilities?.memoryGB || 0),
      0,
    );
    const onlineDevices = devices.filter(
      (d) => d.status === "ONLINE" || d.status === "BUSY",
    ).length;
    const busyDevices = devices.filter((d) => d.currentLoad > 0).length;

    const devicesByType = {
      DESKTOP: devices.filter((d) => d.type === "DESKTOP").length,
      MOBILE: devices.filter((d) => d.type === "MOBILE").length,
      COLAB: devices.filter((d) => d.type === "COLAB").length,
      SERVER: devices.filter((d) => d.type === "SERVER").length,
      TABLET: devices.filter((d) => d.type === "TABLET").length,
    };

    return {
      totalDevices: devices.length,
      onlineDevices,
      busyDevices,
      totalCores,
      totalMemoryGB,
      pendingJobs: 0, // These would need to come from server
      activeJobs: devices.reduce((sum, d) => sum + d.currentLoad, 0),
      completedJobs: devices.reduce((sum, d) => sum + d.totalJobsCompleted, 0),
      failedJobs: 0,
      globalVelocity: 0,
      avgLatency: 0,
      devicesByType,
    };
  }, [devices, swarmResources.totalCores]);

  // 1. Create a stable log function
  const addLog = useCallback((msg: string) => {
    setLogs((prev) => {
      // Prevent processing if logs are already flooded within the same render cycle
      if (prev.length > 50) return prev.slice(-20);
      return [...prev.slice(-19), `> ${msg}`];
    });
  }, []);

  // 2. Identify Myself
  const persistentIdentity = usePersistentIdentity();
  const myDevice = devices.find((d) => d.id === persistentIdentity.id);
  const amIEnabled = myDevice?.isEnabled !== false; // Default true if not found yet

  // 3. Pass amIEnabled to the hook
  const {
    status,
    completedCount,
    workerId,
    opsScore,
    updateThrottle,
    throttle,
    // activeThreads - local threads not used for global control
    socket,
    isRunning,
    startSwarm,
    pauseSwarm,
    joinCode,
    stopSwarm,
    toggleDevice,
    runBenchmark, // New export
  } = useComputeSwarm(addLog, amIEnabled); // <--- PASS HERE
  // 5. Real-time Listeners & Initial Data
  const serverUrl = `${window.location.protocol}//${window.location.hostname}:3000`;

  useEffect(() => {
    if (!socket) return;

    // 1. Define handlers (to allow removal later)
    const handleDeviceJoined = (device: DeviceInfo) => {
      setDevices((prev) => {
        const exists = prev.some((d) => d.id === device.id);
        if (!exists) {
          setLogs((currentLogs) => [
            ...currentLogs.slice(-19), // Keep logs trimmed
            `> [${new Date().toLocaleTimeString()}] Device joined: ${device.name}`,
          ]);
          return [...prev, device];
        }
        return prev;
      });
    };

    const handleDeviceLeft = (data: { deviceId: string }) => {
      setDevices((prev) => {
        const device = prev.find((d) => d.id === data.deviceId);
        if (device) {
          setLogs((logs) => [
            ...logs.slice(-19),
            `> [${new Date().toLocaleTimeString()}] Device left: ${device.name}`,
          ]);
        }
        return prev.filter((d) => d.id !== data.deviceId);
      });
    };

    // Use named functions so we can clean them up properly
    const onJoined = (d: DeviceInfo) => handleDeviceJoined(d);
    const onLeft = (data: { deviceId: string }) => handleDeviceLeft(data);
    const onCurrent = (list: DeviceInfo[]) => setDevices(list);
    const onUpdate = () =>
      fetch(`${serverUrl}/api/devices`)
        .then((r) => r.json())
        .then(setDevices);

    socket.on("DEVICE_JOINED", onJoined);
    socket.on("DEVICE_LEFT", onLeft);
    socket.on("CURRENT_DEVICES", onCurrent);
    socket.on("DEVICE_UPDATED", onUpdate);

    // CLEANUP: If you skip this, the server WILL eventually refuse your connection.
    return () => {
      socket.off("DEVICE_JOINED", onJoined);
      socket.off("DEVICE_LEFT", onLeft);
      socket.off("CURRENT_DEVICES", onCurrent);
      socket.off("DEVICE_UPDATED", onUpdate);
    };
  }, [socket, serverUrl]);
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
            onRunBenchmark={runBenchmark}
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

        {/* Control Row - GLOBAL SWARM CONTROL */}
        <ThrottleControl
          throttle={throttle}
          setThrottle={(val) => {
            updateThrottle(val);
            // Broadcast to all devices in swarm
            socket?.emit("UPDATE_SWARM_THROTTLE", { throttleLevel: val / 100 });
          }}
          totalCores={swarmResources.totalCores}
          activeCores={swarmResources.activeCores}
          isLocalhostEnabled={amIEnabled}
          onToggleLocalhost={(enabled: boolean) =>
            toggleDevice(persistentIdentity.id, enabled)
          }
          deviceCount={swarmResources.deviceCount}
        />
        <LiveTerminal logs={logs} status={status} />

        {/* Swarm Overview */}
        <SwarmDashboard
          devices={devices}
          stats={swarmStats}
          onToggleDevice={toggleDevice}
        />

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
