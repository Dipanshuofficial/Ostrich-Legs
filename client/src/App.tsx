import { useState, useCallback } from "react";
import { Zap, Share2 } from "lucide-react";
import { useComputeSwarm } from "./hooks/useComputeSwarm";

import { DeviceHealth } from "./components/dashboard/DeviceHealth";
import { SwarmControls } from "./components/dashboard/SwarmControls";
import { SwarmDashboard } from "./components/dashboard/SwarmDashboard";
import { DeviceConnector } from "./components/dashboard/DeviceConnector";
import { GpuStatusMonitor } from "./components/dashboard/GpuStatusMonitor";
import { ThrottleControl } from "./components/dashboard/ThrottleControl";
import { ThemeToggle } from "./components/ui/ThemeToggle";
import { LiveTerminal } from "./components/dashboard/LiveTerminal";
import { SwarmRunState, DeviceState } from "../../shared/types";

function App() {
  const [showQR, setShowQR] = useState(false);
  const [logs, setLogs] = useState<string[]>([]);
  const [throttle, setThrottle] = useState(30); // Local state for immediate UI feedback

  const addLog = useCallback((msg: string) => {
    setLogs((prev) => [...prev.slice(-19), `> ${msg}`]);
  }, []);

  const {
    status,
    devices,
    myDevice,
    stats,
    joinCode,
    completedCount,
    opsScore,
    startSwarm,
    pauseSwarm,
    stopSwarm,
    toggleDevice,
    runBenchmark,
    updateThrottle,
  } = useComputeSwarm(addLog);

  const handleThrottleChange = (val: number) => {
    setThrottle(val);
    updateThrottle(val);
  };

  const isRunning = status === SwarmRunState.RUNNING;
  const serverUrl = `${window.location.protocol}//${window.location.hostname}:3000`;

  // Computed Stats
  const swarmStats = {
    runState: status,
    globalThrottle: throttle,
    totalDevices: devices.length,
    onlineDevices: devices.filter(
      (d) => d.state === DeviceState.ONLINE || d.state === DeviceState.BUSY,
    ).length,
    busyDevices: devices.filter((d) => d.state === DeviceState.BUSY).length,
    totalCores: devices.reduce((acc, d) => acc + d.capabilities.cpuCores, 0),
    totalMemoryGB: devices.reduce((acc, d) => acc + d.capabilities.memoryGB, 0),
    pendingJobs: stats?.pendingJobs || 0,
    activeJobs: stats?.activeJobs || 0,
    completedJobs: devices.reduce((acc, d) => acc + d.totalJobsCompleted, 0),
    globalVelocity: 0,
    devicesByType: {},
  };
  // If we have 3 cores and 20% throttle, we use ceil(3 * 0.2) = 1 core.
  const calculatedActiveCores = Math.ceil(
    swarmStats.totalCores * (throttle / 100),
  );

  return (
    <div className="min-h-screen relative bg-grain p-6 md:p-12 transition-colors duration-500">
      <header className="flex justify-between items-center mb-12 relative z-10 max-w-7xl mx-auto">
        <div className="flex items-center gap-4">
          <div className="w-12 h-12 bg-indigo-600 rounded-2xl flex items-center justify-center shadow-lg">
            <Zap className="text-white fill-white" size={24} />
          </div>
          <div>
            <h1 className="text-2xl font-bold tracking-tight text-arc-text">
              Ostrich Legs
            </h1>
            <div className="flex items-center gap-2">
              <span
                className={`flex h-2 w-2 rounded-full ${isRunning ? "bg-emerald-500 animate-pulse" : "bg-zinc-500"}`}
              />
              <p className="text-arc-muted text-xs font-medium uppercase tracking-wider">
                {status}
              </p>
            </div>
          </div>
        </div>

        <div className="flex gap-3">
          <ThemeToggle />
          <button
            onClick={() => setShowQR(true)}
            className="group flex items-center gap-2 px-5 py-2.5 rounded-full bg-arc-card border border-arc-border hover:border-indigo-500/30 transition-all"
          >
            <Share2
              size={16}
              className="text-arc-muted group-hover:text-indigo-500"
            />
            <span className="text-sm font-semibold text-arc-text group-hover:text-indigo-500">
              Connect
            </span>
          </button>
        </div>
      </header>

      <div className="grid grid-cols-1 md:grid-cols-12 gap-6 max-w-7xl mx-auto relative z-10">
        {/* ROW 1: GPU Monitor & Controls */}
        <GpuStatusMonitor completedCount={completedCount} throttle={throttle} />

        <div className="md:col-span-4 h-90 flex gap-4">
          <DeviceHealth
            className="flex-1 h-full"
            status={myDevice?.state || DeviceState.OFFLINE}
            opsScore={opsScore}
            workerId={myDevice?.id || "..."}
            onRunBenchmark={runBenchmark}
          />
          <SwarmControls
            isRunning={isRunning}
            status={status}
            onStart={startSwarm}
            onPause={pauseSwarm}
            onStop={stopSwarm}
          />
        </div>

        {/* ROW 2: Throttle & Terminal */}
        <ThrottleControl
          throttle={throttle}
          setThrottle={handleThrottleChange}
          totalCores={swarmStats.totalCores}
          activeCores={Math.min(calculatedActiveCores, swarmStats.totalCores)}
          deviceCount={swarmStats.totalDevices}
        />

        <LiveTerminal logs={logs} status={status} />

        {/* ROW 3: Detailed Dashboard */}
        <SwarmDashboard
          devices={devices}
          stats={swarmStats as any}
          onToggleDevice={toggleDevice}
        />
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
