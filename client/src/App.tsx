import { useState, useEffect, useRef, useMemo } from "react";
import { Wifi, WifiOff, Share2, LogOut } from "lucide-react";
import { useSwarmEngine } from "./hooks/useSwarmEngine";
import { VelocityMonitor } from "./features/dashboard/VelocityMonitor";
import { ActiveSwarm } from "./features/dashboard/ActiveSwarm";
import { ResourceStats } from "./features/dashboard/ResourceStats";
import { JobGauge } from "./features/dashboard/JobGauge";
import { ThrottleControl } from "./features/dashboard/ThrottleControl";
import { LiveTerminal } from "./features/terminal/LiveTerminal";
import { DeviceConnector } from "./features/connection/DeviceConnector";
import { SwarmControls } from "./features/dashboard/SwarmControls";
import { usePersistentIdentity } from "./hooks/usePersistentIdentity";

export default function App() {
  const [activeTab, setActiveTab] = useState("Dashboard");
  const [isModalOpen, setIsModalOpen] = useState(false);
  const identity = usePersistentIdentity();

  // Optimistic UI state for the slider
  const [localThrottle, setLocalThrottle] = useState(40);
  const debounceTimer = useRef<NodeJS.Timeout | null>(null);

  const {
    snapshot,
    devices,
    setRunState,
    runLocalBenchmark,
    isConnected,
    toggleDevice,
    setGlobalThrottle,
    generateInviteToken,
    logs,
    leaveSwarm,
    manualJoin,
  } = useSwarmEngine(identity.id || "loading-identity");

  // Derive resources from snapshot or default to empty
  const totalResources = useMemo(() => {
    if (snapshot?.resources) return snapshot.resources;
    return {
      totalCores: 0,
      totalMemory: 0,
      totalGPUs: 0,
      onlineCount: 0,
    };
  }, [snapshot]);

  const stats = useMemo(() => {
    if (snapshot?.stats) return snapshot.stats;
    return {
      totalJobs: 0,
      activeJobs: 0,
      pendingJobs: 0,
      completedJobs: 0,
      globalVelocity: 0,
      globalThrottle: 40,
    };
  }, [snapshot]);

  const isRunning = snapshot?.runState === "RUNNING";
  const isGuest = new URLSearchParams(window.location.search).has("invite");

  // Sync slider if someone else changes the global throttle
  useEffect(() => {
    if (stats.globalThrottle !== undefined) {
      setLocalThrottle(stats.globalThrottle);
    }
  }, [stats.globalThrottle]);

  const handleThrottleChange = (val: number) => {
    setLocalThrottle(val);
    if (debounceTimer.current) clearTimeout(debounceTimer.current);
    debounceTimer.current = setTimeout(() => {
      setGlobalThrottle(val);
    }, 300);
  };

  return (
    <div className="min-h-screen bg-surface-muted p-4 md:p-8 font-sans antialiased text-text-main">
      <header className="max-w-7xl mx-auto flex items-center justify-between mb-8 bg-surface-white/90 backdrop-blur-md px-6 py-4 rounded-[28px] border border-white shadow-lg sticky top-4 z-50">
        <div className="flex items-center gap-3 shrink-0">
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
          <div className="hidden sm:block">
            <span className="text-lg md:text-xl font-black tracking-tighter text-gray-800">
              Ostrich-Legs
            </span>
            <div
              className={`flex items-center gap-1.5 text-[9px] font-bold ${isConnected ? "text-green-600" : "text-red-500"}`}
            >
              {isConnected ? <Wifi size={10} /> : <WifiOff size={10} />}
              {isConnected ? "CONNECTED" : "OFFLINE"}
            </div>
          </div>
        </div>

        <nav className="hidden md:flex items-center gap-1 bg-gray-100/80 p-1.5 rounded-2xl shadow-inner border border-gray-200/50">
          {["Dashboard", "Monitoring"].map((tab) => (
            <button
              key={tab}
              onClick={() => setActiveTab(tab)}
              className={`px-6 py-2 rounded-xl text-xs font-bold transition-all duration-200 ${activeTab === tab ? "bg-white text-brand-orange shadow-sm border border-gray-100" : "text-text-muted hover:text-text-main"}`}
            >
              {tab}
            </button>
          ))}
        </nav>

        <div className="flex items-center gap-2">
          {isConnected && (
            <button
              onClick={leaveSwarm}
              className="flex items-center gap-2 bg-red-50 text-red-600 px-4 py-2 rounded-xl text-[10px] font-black border border-red-100 hover:bg-red-100 transition-all mr-2 uppercase tracking-widest shadow-sm active:scale-95"
            >
              <LogOut size={14} />
              {isGuest ? "Leave Swarm" : "Exit Session"}
            </button>
          )}
          <button
            onClick={() => setIsModalOpen(true)}
            className="p-2 hover:bg-gray-100 rounded-xl transition-colors"
          >
            <Share2 size={20} className="text-text-muted" />
          </button>
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
              {/* Tailwind 4 arbitrary value for minimum height constraint */}
              <div className="flex-1 min-h-100">
                <ActiveSwarm
                  devices={devices}
                  onBenchmark={runLocalBenchmark}
                  onToggle={toggleDevice}
                />
              </div>
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
