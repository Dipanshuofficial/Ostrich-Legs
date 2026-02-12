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
    <Card className="flex flex-col h-full bg-surface-white relative overflow-hidden p-4 sm:p-6">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center mb-6 gap-4">
        <div>
          <h3 className="font-bold text-lg text-text-main">Swarm Nodes</h3>
          <p className="text-xs text-text-muted">Manage active resources</p>
        </div>
        <button
          onClick={onBenchmark}
          className="w-full sm:w-auto flex items-center justify-center gap-2 bg-gray-900 hover:bg-black text-white px-4 py-2.5 rounded-xl text-xs font-bold transition-all active:scale-95 shadow-lg shadow-gray-900/20"
        >
          <Play size={12} fill="currentColor" />
          Benchmark All
        </button>
      </div>

      <div className="flex-1 overflow-y-auto space-y-3 pr-1 custom-scrollbar">
        {devices.map((device) => {
          const isDisabled = device.status === "DISABLED";
          const isLocal =
            device.id.includes("node-") || device.name === "Local Host";

          return (
            <div
              key={device.id}
              className={`flex flex-col md:flex-row md:items-center justify-between p-4 rounded-2xl border transition-all duration-300 gap-4 ${
                isDisabled
                  ? "bg-gray-50 border-transparent opacity-60"
                  : "bg-white border-gray-100 hover:border-brand-orange/30 shadow-sm"
              }`}
            >
              {/* Left Section: Identity */}
              <div className="flex items-center gap-3">
                <div
                  className={`p-3 rounded-xl shrink-0 ${
                    isDisabled
                      ? "bg-gray-200 text-gray-400"
                      : "bg-surface-muted text-brand-orange"
                  }`}
                >
                  {getIcon(device.type)}
                </div>
                <div className="min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <h4 className="text-sm font-bold text-text-main truncate">
                      {device.name}
                    </h4>
                    {isLocal && (
                      <span className="text-[9px] bg-brand-orange/10 text-brand-orange px-1.5 py-0.5 rounded font-bold border border-brand-orange/20 uppercase tracking-tighter">
                        YOU
                      </span>
                    )}
                  </div>
                  <div className="flex items-center gap-2 mt-0.5">
                    <span
                      className={`w-1.5 h-1.5 rounded-full shrink-0 ${
                        isDisabled
                          ? "bg-gray-400"
                          : device.status === "ONLINE"
                            ? "bg-green-500"
                            : "bg-amber-500"
                      }`}
                    />
                    <span className="text-[10px] font-bold text-text-muted uppercase truncate">
                      {device.status === "ONLINE"
                        ? `${device.capabilities.cpuCores} Cores Online`
                        : device.status}
                    </span>
                  </div>
                </div>
              </div>

              {/* Right Section: Stats & Toggle */}
              <div className="flex items-center justify-between md:justify-end gap-4 md:gap-8 border-t md:border-t-0 pt-3 md:pt-0">
                <div className="flex gap-6">
                  {/* Job Counter */}
                  <div className="text-left md:text-right min-w-15">
                    <div className="font-mono text-sm font-black text-text-main">
                      {device.totalJobsCompleted || 0}
                    </div>
                    <div className="text-[9px] font-bold text-text-muted uppercase tracking-tighter">
                      Jobs
                    </div>
                  </div>

                  {/* OPS Score */}
                  <div className="text-left md:text-right min-w-17.5">
                    <div className="font-mono text-sm font-black text-brand-orange">
                      {device.opsScore > 0
                        ? device.opsScore.toLocaleString()
                        : "---"}
                    </div>
                    <div className="text-[9px] font-bold text-text-muted uppercase tracking-tighter">
                      OPS Score
                    </div>
                  </div>
                </div>

                <button
                  onClick={() => onToggle(device.id, isDisabled)}
                  className={`w-11 h-6 rounded-full p-1 transition-colors relative shrink-0 ${
                    !isDisabled ? "bg-green-500" : "bg-gray-300"
                  }`}
                >
                  <div
                    className={`w-4 h-4 rounded-full bg-white shadow-sm transition-transform duration-200 ${
                      !isDisabled ? "translate-x-5" : "translate-x-0"
                    }`}
                  />
                </button>
              </div>
            </div>
          );
        })}

        {devices.length === 0 && (
          <div className="text-center py-10">
            <p className="text-sm text-text-muted italic">
              Waiting for swarm nodes...
            </p>
          </div>
        )}
      </div>
    </Card>
  );
};
