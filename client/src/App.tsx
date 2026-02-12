import { useState, useEffect, useRef } from "react";
import { Zap, Wifi, WifiOff, Share2, LogOut } from "lucide-react";
import { useSwarmEngine } from "./hooks/useSwarmEngine";
import { VelocityMonitor } from "./features/dashboard/VelocityMonitor";
import { ActiveSwarm } from "./features/dashboard/ActiveSwarm";
import { ResourceStats } from "./features/dashboard/ResourceStats";
import { JobGauge } from "./features/dashboard/JobGauge";
import { ThrottleControl } from "./features/dashboard/ThrottleControl";
import { LiveTerminal } from "./features/terminal/LiveTerminal";
import { DeviceConnector } from "./features/connection/DeviceConnector";
import { SwarmControls } from "./features/dashboard/SwarmControls";
import { type SwarmSnapshot, type SwarmResources } from "./core/types";
import { usePersistentIdentity } from "./hooks/usePersistentIdentity";

const EMPTY_SNAPSHOT: SwarmSnapshot = {
  runState: "STOPPED",
  devices: {},
  resources: {
    totalCores: 0,
    totalMemory: 0,
    totalGPUs: 0,
    onlineCount: 0,
  } as SwarmResources,
  stats: {
    totalJobs: 0,
    activeJobs: 0,
    pendingJobs: 0,
    completedJobs: 0,
    globalVelocity: 0,
    globalThrottle: 40,
  },
};

export default function App() {
  const [activeTab, setActiveTab] = useState("Dashboard"); // Restore usage
  const [isModalOpen, setIsModalOpen] = useState(false);
  const identity = usePersistentIdentity();

  // Optimistic UI state for snappy slider
  const [localThrottle, setLocalThrottle] = useState(40);
  const debounceTimer = useRef<NodeJS.Timeout | null>(null);

  const {
    snapshot: serverSnapshot,
    devices,
    setRunState,
    runLocalBenchmark,
    isConnected,
    toggleDevice,
    setGlobalThrottle,
    generateInviteToken, // Destructured correctly
    totalResources,
    logs,
    leaveSwarm,
    manualJoin,
  } = useSwarmEngine(identity.id || "loading-identity");

  const snapshot = serverSnapshot || EMPTY_SNAPSHOT;
  const isRunning = snapshot.runState === "RUNNING";
  const isGuest = new URLSearchParams(window.location.search).has("invite");

  // Sync slider if someone else changes the global throttle
  useEffect(() => {
    if (snapshot.stats.globalThrottle !== undefined) {
      setLocalThrottle(snapshot.stats.globalThrottle);
    }
  }, [snapshot.stats.globalThrottle]);

  const handleThrottleChange = (val: number) => {
    setLocalThrottle(val); // Update UI instantly

    // Only send the final value after scrolling stops (300ms debounce)
    if (debounceTimer.current) clearTimeout(debounceTimer.current);
    debounceTimer.current = setTimeout(() => {
      setGlobalThrottle(val);
    }, 300);
  };

  return (
    <div className="min-h-screen bg-surface-muted p-4 md:p-8 font-sans antialiased text-text-main">
      <header className="max-w-7xl mx-auto flex items-center justify-between mb-8 bg-surface-white/90 backdrop-blur-md px-6 py-4 rounded-[28px] border border-white shadow-lg sticky top-4 z-50">
        <div className="flex items-center gap-3 shrink-0">
          <div className="w-10 h-10 bg-linear-to-br from-brand-orange to-[#ff9f7c] rounded-xl flex items-center justify-center shadow-lg border-t border-white/20">
            <Zap className="text-white fill-white" size={22} />
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

        {/* --- THE BEAUTIFUL TABS ARE BACK --- */}
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
          {isGuest && (
            <button
              onClick={leaveSwarm}
              className="flex items-center gap-2 bg-red-50 text-red-600 px-4 py-2 rounded-xl text-[10px] font-black border border-red-100 hover:bg-red-100 transition-all mr-2 uppercase tracking-widest shadow-sm"
            >
              <LogOut size={14} />
              Leave Swarm
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
                velocity={snapshot.stats.globalVelocity}
                throttle={localThrottle}
              />
              <ResourceStats
                stats={snapshot.stats}
                onlineCount={devices.length}
              />
              <div className="flex-1 min-h-[400px]">
                <ActiveSwarm
                  devices={devices}
                  onBenchmark={runLocalBenchmark}
                  onToggle={toggleDevice}
                />
              </div>
            </div>

            <div className="lg:col-span-4 space-y-8">
              <JobGauge
                total={snapshot.stats.totalJobs}
                completed={snapshot.stats.completedJobs}
              />
              <SwarmControls
                status={snapshot.runState}
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
