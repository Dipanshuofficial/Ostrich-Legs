import { Smartphone, Laptop, Server, Cpu, Play } from "lucide-react";
import { Card } from "../../components/Card";
import { type DeviceInfo } from "../../core/types";

interface ActiveSwarmProps {
  devices: DeviceInfo[];
  onBenchmark: () => void;
  onToggle: (id: string, state: boolean) => void;
}

export const ActiveSwarm = ({
  devices,
  onBenchmark,
  onToggle,
}: ActiveSwarmProps) => {
  const getIcon = (type: string) => {
    switch (type) {
      case "MOBILE":
        return <Smartphone size={18} />;
      case "SERVER":
        return <Server size={18} />;
      case "COLAB":
        return <Cpu size={18} />;
      default:
        return <Laptop size={18} />;
    }
  };

  return (
    <Card className="flex flex-col h-full bg-surface-white relative overflow-hidden group p-1">
      <div className="flex justify-between items-center mb-6 px-2 pt-2">
        <div>
          <h3 className="font-bold text-lg text-text-main">Swarm Nodes</h3>
          <p className="text-xs text-text-muted">Manage active resources</p>
        </div>
        <button
          onClick={onBenchmark}
          className="flex items-center gap-2 bg-gray-900 hover:bg-black text-white px-4 py-2 rounded-xl text-xs font-bold transition-all active:scale-95 shadow-lg shadow-gray-900/20"
        >
          <Play size={12} fill="currentColor" />
          Benchmark
        </button>
      </div>

      <div className="flex-1 overflow-y-auto space-y-3 custom-scrollbar px-1">
        {devices.map((device) => {
          const isDisabled = device.status === "DISABLED";
          const isLocal = device.name === "Local Host";

          return (
            <div
              key={device.id}
              className={`flex items-center justify-between p-3 rounded-2xl border transition-all duration-300 ${isDisabled ? "bg-gray-50 border-transparent opacity-60" : "bg-white border-gray-100 hover:border-brand-orange/30 shadow-sm"}`}
            >
              <div className="flex items-center gap-3">
                <div
                  className={`p-3 rounded-xl ${isDisabled ? "bg-gray-200 text-gray-400" : "bg-surface-muted text-brand-orange"}`}
                >
                  {getIcon(device.type)}
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <h4 className="text-sm font-bold text-text-main">
                      {device.name}
                    </h4>
                    {isLocal && (
                      <span className="text-[9px] bg-brand-orange/10 text-brand-orange px-1.5 rounded font-bold border border-brand-orange/20">
                        YOU
                      </span>
                    )}
                  </div>
                  <div className="flex items-center gap-2 mt-0.5">
                    <span
                      className={`w-1.5 h-1.5 rounded-full ${isDisabled ? "bg-gray-400" : device.status === "ONLINE" ? "bg-green-500" : "bg-amber-500"}`}
                    />
                    <span className="text-[10px] font-bold text-text-muted uppercase">
                      {device.status === "ONLINE"
                        ? `${device.capabilities.cpuCores} Cores`
                        : device.status}
                    </span>
                  </div>
                </div>
              </div>

              <div className="flex items-center gap-4">
                {/* Job Counter */}
                <div className="text-right hidden sm:block">
                  <div className="font-mono text-sm font-black text-text-main">
                    {/* Placeholder for Job Count - will connect to real state later */}
                    {device.totalJobsCompleted || 0}
                  </div>
                  <div className="text-[9px] font-bold text-text-muted uppercase">
                    Jobs Done
                  </div>
                </div>

                <div className="text-right hidden sm:block min-w-15">
                  <div className="font-mono text-sm font-black text-brand-orange">
                    {device.opsScore > 0
                      ? device.opsScore.toLocaleString()
                      : "---"}
                  </div>
                  <div className="text-[9px] font-bold text-text-muted uppercase">
                    OPS Score
                  </div>
                </div>

                <button
                  onClick={() => onToggle(device.id, isDisabled)}
                  className={`w-10 h-6 rounded-full p-1 transition-colors relative ${!isDisabled ? "bg-green-500" : "bg-gray-300"}`}
                >
                  <div
                    className={`w-4 h-4 rounded-full bg-white shadow-sm transition-transform duration-200 ${!isDisabled ? "translate-x-4" : "translate-x-0"}`}
                  />
                </button>
              </div>
            </div>
          );
        })}
      </div>
    </Card>
  );
};
