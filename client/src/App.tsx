// client/src/App.tsx
import { useState, useEffect, useRef, useMemo } from "react";
import { Wifi, Share2, LogOut, RefreshCw, Terminal } from "lucide-react";

// NEW HOOKS

import { useSwarm } from "./contexts/SwarmContext";
import { usePersistentIdentity } from "./hooks/usePersistentIdentity";
import { useMediaQuery } from "./hooks/useMediaQuery";

// COMPONENTS
import { VelocityMonitor } from "./features/dashboard/VelocityMonitor";
import { ActiveSwarm } from "./features/dashboard/ActiveSwarm";
import { ResourceStats } from "./features/dashboard/ResourceStats";
import { JobGauge } from "./features/dashboard/JobGauge";
import { ThrottleControl } from "./features/dashboard/ThrottleControl";
import { LiveTerminal } from "./features/terminal/LiveTerminal";
import { DeviceConnector } from "./features/connection/DeviceConnector";
import { SwarmControls } from "./features/dashboard/SwarmControls";

export default function App() {
  const isMobile = useMediaQuery("(max-width: 768px)");
  const [showMobileTerminal, setShowMobileTerminal] = useState(false);
  const [activeTab, setActiveTab] = useState("Dashboard");
  const [isModalOpen, setIsModalOpen] = useState(false);

  const { swarmToken } = usePersistentIdentity();
  const { snapshot, devices, isConnected, logs, actions } = useSwarm();

  const {
    setRunState,
    setThrottle: setGlobalThrottle,
    runLocalBenchmark,
    toggleDevice,
    generateInviteToken,
    leaveSwarm,
    manualJoin,
  } = actions;

  const [localThrottle, setLocalThrottle] = useState(40);
  const debounceTimer = useRef<NodeJS.Timeout | null>(null);

  const totalResources = useMemo(
    () =>
      snapshot?.resources || {
        totalCores: 0,
        totalMemory: 0,
        totalGPUs: 0,
        onlineCount: 0,
      },
    [snapshot],
  );
  const stats = useMemo(
    () =>
      snapshot?.stats || {
        totalJobs: 0,
        activeJobs: 0,
        pendingJobs: 0,
        completedJobs: 0,
        globalVelocity: 0,
        globalThrottle: 20,
      },
    [snapshot],
  );

  const isRunning = snapshot?.runState === "RUNNING";
  const isGuest =
    new URLSearchParams(window.location.search).has("invite") || !!swarmToken;

  useEffect(() => {
    if (stats.globalThrottle !== undefined)
      setLocalThrottle(stats.globalThrottle);
  }, [stats.globalThrottle]);

  const handleThrottleChange = (val: number) => {
    setLocalThrottle(val);
    if (debounceTimer.current) clearTimeout(debounceTimer.current);
    debounceTimer.current = setTimeout(() => setGlobalThrottle(val), 300);
  };

  return (
    <div className="min-h-screen bg-surface-muted p-4 md:p-8 font-sans antialiased text-text-main">
      <header className="max-w-7xl mx-auto flex items-center mb-8 bg-surface-white/90 backdrop-blur-md px-6 py-4 rounded-4xl border border-white shadow-lg sticky top-4 z-50 w-full">
        <div className="flex items-center gap-4 flex-1 basis-0">
          <div className="w-12 h-12 bg-surface-white rounded-2xl flex items-center justify-center shadow-soft-depth border border-white relative overflow-hidden group">
            <svg
              viewBox="0 0 512 512"
              className="w-10 h-10 transition-transform duration-500 group-hover:scale-110"
            >
              <path
                d="M256 120V256M256 256L140 380M256 256L372 380"
                stroke="#1a1a1e"
                strokeWidth="48"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
              <path
                d="M256 130V256M256 256L150 370M256 256L362 370"
                stroke="#ff7d54"
                strokeWidth="24"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
              <circle cx="256" cy="256" r="55" fill="#1a1a1e" />
              <circle
                cx="256"
                cy="256"
                r="30"
                fill="#ff7d54"
                className="animate-pulse"
              />
            </svg>
          </div>
          <div className="flex flex-col justify-center -space-y-1">
            <span className="text-lg md:text-xl font-black tracking-tighter text-gray-800 leading-tight">
              Ostrich-Legs
            </span>
            <div
              className={`flex items-center gap-1.5 text-[9px] font-bold ${isConnected ? "text-green-600" : "text-amber-500 animate-pulse"}`}
            >
              {isConnected ? (
                <Wifi size={10} />
              ) : (
                <RefreshCw size={10} className="animate-spin" />
              )}
              {isConnected ? "CONNECTED" : "ESTABLISHING LINK..."}
            </div>
          </div>
          <nav className="absolute left-1/2 -translate-x-1/2 hidden lg:flex items-center gap-1 bg-gray-100/80 p-1.5 rounded-2xl shadow-inner border border-gray-200/50">
            {["Dashboard", "Monitoring"].map((tab) => (
              <button
                key={tab}
                onClick={() => setActiveTab(tab)}
                className={`px-6 py-2 rounded-xl text-xs font-bold transition-all ${activeTab === tab ? "bg-white text-brand-orange shadow-sm border border-gray-100" : "text-text-muted hover:text-text-main"}`}
              >
                {tab}
              </button>
            ))}
          </nav>
          <div className="ml-auto flex items-center gap-3">
            {isConnected && (
              <button
                onClick={leaveSwarm}
                className="flex items-center gap-2.5 bg-red-50 text-red-600 px-5 py-2.5 rounded-2xl text-[11px] font-bold border border-red-100 hover:bg-red-500 hover:text-white transition-all uppercase tracking-wider shadow-sm"
              >
                <LogOut size={16} />{" "}
                <span className="hidden sm:inline">
                  {isGuest ? "Leave Swarm" : "Exit Session"}
                </span>
              </button>
            )}

            <button
              onClick={() => setIsModalOpen(true)}
              className="p-2 hover:bg-gray-100 rounded-xl"
            >
              <Share2 size={20} className="text-text-muted" />
            </button>
          </div>
        </div>
      </header>
      <main className="max-w-7xl mx-auto grid grid-cols-1 lg:grid-cols-12 gap-8 pb-12">
        {activeTab === "Dashboard" ? (
          <>
            <div className="lg:col-span-8 space-y-8 flex flex-col">
              <VelocityMonitor
                velocity={stats.globalVelocity}
                throttle={localThrottle}
              />
              <ResourceStats stats={stats} onlineCount={devices.length} />
              <div className="flex-1 min-h-100">
                <ActiveSwarm
                  devices={devices}
                  onBenchmark={runLocalBenchmark}
                  onToggle={toggleDevice}
                />
              </div>
              {isMobile && (
                <div className="mt-6 border-t pt-6">
                  <button
                    onClick={() => setShowMobileTerminal(!showMobileTerminal)}
                    className="w-full flex items-center justify-center gap-2.5 bg-gray-900 text-white py-3.5 rounded-2xl font-bold text-sm"
                  >
                    <Terminal size={18} />{" "}
                    {showMobileTerminal ? "Hide System Logs" : "Show Live Logs"}
                  </button>
                  {showMobileTerminal && (
                    <div className="mt-4 h-80 rounded-3xl overflow-hidden border border-border-soft shadow-inner">
                      <LiveTerminal logs={logs} />
                    </div>
                  )}
                </div>
              )}
            </div>
            <div className="lg:col-span-4 space-y-8">
              <JobGauge
                total={stats.totalJobs}
                completed={stats.completedJobs}
              />
              <SwarmControls
                status={snapshot?.runState || "STOPPED"}
                onToggle={() => setRunState(isRunning ? "PAUSED" : "RUNNING")}
                onStop={() => setRunState("STOPPED")}
              />
              <ThrottleControl
                value={localThrottle}
                onChange={handleThrottleChange}
                totalGPUs={totalResources.totalGPUs}
                totalCores={totalResources.totalCores}
                totalMemory={totalResources.totalMemory}
              />
            </div>
          </>
        ) : (
          <div className="lg:col-span-12 h-[80vh]">
            <LiveTerminal logs={logs} />
          </div>
        )}
      </main>
      <DeviceConnector
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        onRegenerateToken={generateInviteToken}
        onManualJoin={manualJoin}
        onLeave={leaveSwarm}
        isGuest={isGuest}
      />
    </div>
  );
}
