import { useState, useEffect } from "react"; // Added useEffect
import { Zap, Wifi, WifiOff, Share2 } from "lucide-react";
import { useSwarmEngine } from "./hooks/useSwarmEngine";
// Removed unused import: useSwarmExecution

// Features
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
  },
};

export default function App() {
  const [activeTab, setActiveTab] = useState("Dashboard");
  const [throttle, setThrottle] = useState(40);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const identity = usePersistentIdentity();
  // 1. Get Real Data & Logs
  const {
    snapshot: serverSnapshot,
    devices,
    setRunState,
    runLocalBenchmark,
    isConnected,
    toggleDevice,
    updateThrottle, // Now available here
    totalResources,
    logs,
  } = useSwarmEngine(identity.id || "loading-identity");

  const snapshot = serverSnapshot || EMPTY_SNAPSHOT;
  const isRunning = snapshot.runState === "RUNNING";

  // 2. Throttle Effect
  useEffect(() => {
    updateThrottle(throttle);
  }, [throttle, updateThrottle]);

  return (
    <div className="min-h-screen bg-surface-muted p-4 md:p-8 font-sans antialiased text-text-main selection:bg-brand-orange/20">
      {/* Header */}
      <header className="max-w-7xl mx-auto flex flex-wrap md:flex-nowrap items-center justify-between mb-8 bg-surface-white/90 backdrop-blur-md px-6 py-4 rounded-[28px] border border-white shadow-lg shadow-gray-200/50 sticky top-4 z-50 gap-y-4">
        {/* 1. Logo Section (Order 1 on all screens) */}
        <div className="flex items-center gap-3 order-1">
          <div className="w-10 h-10 bg-linear-to-br from-brand-orange to-[#ff9f7c] rounded-xl flex items-center justify-center shadow-lg shadow-brand-orange/30 border-t border-white/20 shrink-0">
            <Zap className="text-white fill-white" size={22} />
          </div>
          <span className="text-lg md:text-xl font-black tracking-tighter text-gray-800 hidden sm:block">
            Ostrich-Legs
          </span>

          <div
            className={`ml-2 md:ml-4 px-3 py-1 rounded-full text-[10px] font-bold flex items-center gap-1.5 border transition-colors ${isConnected ? "bg-green-50 text-green-600 border-green-200" : "bg-red-50 text-red-500 border-red-200"}`}
          >
            {isConnected ? <Wifi size={12} /> : <WifiOff size={12} />}
            {isConnected ? "ONLINE" : "OFFLINE"}
          </div>
        </div>

        {/* 2. Navigation Tabs (Order 3 on Mobile, Order 2 on Desktop) */}
        <nav className="flex items-center gap-1 bg-gray-100/80 p-1.5 rounded-2xl shadow-inner border border-gray-200/50 order-3 md:order-2 w-full md:w-auto">
          {["Dashboard", "Monitoring"].map((tab) => (
            <button
              key={tab}
              onClick={() => setActiveTab(tab)}
              className={`flex-1 md:flex-none px-4 md:px-6 py-2 rounded-xl text-xs font-bold transition-all duration-200 text-center ${activeTab === tab ? "bg-white text-brand-orange shadow-sm border border-gray-100 scale-100" : "text-text-muted hover:text-text-main hover:bg-white/50 scale-95"}`}
            >
              {tab}
            </button>
          ))}
        </nav>

        {/* 3. Settings Section (Order 2 on Mobile, Order 3 on Desktop) */}
        <div className="flex items-center gap-4 order-2 md:order-3">
          <button
            onClick={() => setIsModalOpen(true)}
            className="flex items-center gap-2 group cursor-pointer hover:bg-gray-100 p-2 rounded-xl transition-colors"
          >
            <Share2
              size={20}
              className="text-text-muted group-hover:scale-110 transition-transform"
            />
          </button>
        </div>
      </header>

      <main className="max-w-7xl mx-auto grid grid-cols-1 lg:grid-cols-12 gap-8 pb-12">
        {activeTab === "Dashboard" ? (
          <>
            <div className="lg:col-span-8 space-y-8 min-w-0 flex flex-col">
              <VelocityMonitor
                velocity={snapshot.stats.globalVelocity}
                throttle={throttle}
              />
              <ResourceStats
                stats={snapshot.stats}
                onlineCount={devices.length}
              />
              <div className="flex-1 min-h-75">
                <ActiveSwarm
                  devices={devices}
                  onBenchmark={runLocalBenchmark}
                  onToggle={toggleDevice}
                />
              </div>
            </div>

            <div className="lg:col-span-4 space-y-8 min-w-0">
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
                value={throttle}
                onChange={setThrottle}
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
        joinCode="OS-99"
        onClose={() => setIsModalOpen(false)}
      />
    </div>
  );
}
