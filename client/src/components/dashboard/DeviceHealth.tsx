import { Cpu, RotateCw, Monitor, Smartphone, Server } from "lucide-react";
import { Card } from "../ui/Card";
import { type DeviceInfo, type DeviceType } from "../../../../shared/types";

interface DeviceHealthProps {
  devices: DeviceInfo[];
  className?: string;
  onRunBenchmark: () => void;
}

export function DeviceHealth({
  devices,
  className = "",
  onRunBenchmark,
}: DeviceHealthProps) {
  const getIcon = (type: DeviceType) => {
    switch (type) {
      case "MOBILE":
        return Smartphone;
      case "SERVER":
        return Server;
      case "COLAB":
        return Server;
      default:
        return Monitor;
    }
  };

  return (
    <Card className={`flex flex-col ${className}`} noPadding>
      <div className="p-6 pb-0 flex justify-between items-start">
        <div>
          <div className="flex items-center gap-2 mb-2">
            <div className="p-1.5 bg-indigo-500/10 rounded-lg">
              <Cpu size={16} className="text-indigo-500" />
            </div>
            <h3 className="text-sm font-bold text-arc-text uppercase tracking-wider">
              Benchmarks
            </h3>
          </div>
          <p className="text-xs text-arc-muted">
            {devices.length} Connected Nodes
          </p>
        </div>

        <button
          onClick={onRunBenchmark}
          className="p-2 rounded-xl bg-arc-bg hover:bg-indigo-500/10 hover:text-indigo-500 text-arc-muted transition-all active:scale-95 border border-arc-border"
          title="Benchmark Swarm"
        >
          <RotateCw size={16} />
        </button>
      </div>

      <div className="p-4 space-y-2 overflow-y-auto custom-scrollbar h-full">
        {devices.map((device) => {
          const Icon = getIcon(device.type);
          return (
            <div
              key={device.id}
              className="flex items-center justify-between p-3 rounded-xl bg-arc-bg/50 border border-arc-border/50"
            >
              <div className="flex items-center gap-3">
                <div
                  className={`p-2 rounded-lg ${device.opsScore > 0 ? "bg-emerald-500/10 text-emerald-500" : "bg-zinc-500/10 text-zinc-500"}`}
                >
                  <Icon size={14} />
                </div>
                <div className="flex flex-col">
                  <span className="text-xs font-medium text-arc-text truncate max-w-25">
                    {device.name}
                  </span>
                  <span className="text-[10px] text-arc-muted font-mono">
                    {device.id.slice(0, 6)}
                  </span>
                </div>
              </div>

              <div className="text-right">
                <span className="text-sm font-mono font-bold text-indigo-500 block">
                  {device.opsScore > 0
                    ? device.opsScore.toLocaleString()
                    : "---"}
                </span>
                <span className="text-[9px] text-arc-muted uppercase tracking-wider">
                  OPS
                </span>
              </div>
            </div>
          );
        })}
      </div>
    </Card>
  );
}
