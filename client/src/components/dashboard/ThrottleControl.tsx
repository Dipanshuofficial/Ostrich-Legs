import React from "react";
import { Card } from "../ui/Card";
import { Zap, Cpu, Globe } from "lucide-react";

interface ThrottleControlProps {
  throttle: number; // 0-100
  setThrottle: (val: number) => void;
  totalCores: number;
  activeCores: number;
  deviceCount: number;
}

export function ThrottleControl({
  throttle,
  setThrottle,
  totalCores,
  activeCores,
  deviceCount,
}: ThrottleControlProps) {
  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setThrottle(parseInt(e.target.value));
  };

  return (
    <Card className="md:col-span-6 h-60 flex flex-col justify-center relative overflow-hidden">
      <div
        className="absolute right-0 top-0 w-32 h-32 bg-indigo-500/20 blur-[80px] transition-opacity duration-500 pointer-events-none"
        style={{ opacity: throttle / 100 }}
      />

      <div className="flex justify-between items-start mb-8 relative z-10">
        <div>
          <div className="flex items-center gap-2">
            <h3 className="text-lg font-medium text-arc-text">
              Swarm Resources
            </h3>
            <Globe size={14} className="text-indigo-400" />
          </div>
          <p className="text-sm text-arc-muted">
            Global CPU Allocation ({deviceCount} devices)
          </p>
        </div>

        <div className="flex flex-col items-end gap-1">
          <div className="bg-arc-bg px-4 py-2 rounded-full border border-arc-border flex items-center gap-2">
            <span className="text-xl font-bold text-arc-text">{throttle}%</span>
          </div>
          <div className="flex items-center gap-1.5 px-2">
            <Cpu
              size={10}
              className={
                activeCores > 0 ? "text-emerald-500" : "text-arc-muted"
              }
            />
            <span className="text-[10px] font-mono text-arc-muted uppercase tracking-wider">
              {activeCores}/{totalCores} Cores Active
            </span>
          </div>
        </div>
      </div>

      <div className="relative w-full h-12 flex items-center z-10">
        <div className="absolute w-full h-4 bg-arc-bg rounded-full overflow-hidden border border-arc-border">
          <div
            className="h-full transition-all duration-200 bg-linear-to-r from-indigo-400 to-indigo-600"
            style={{ width: `${throttle}%` }}
          />
        </div>

        <input
          type="range"
          min="10"
          max="90"
          step="10"
          value={throttle}
          onChange={handleChange}
          className="absolute w-full h-full opacity-0 cursor-pointer"
        />

        <div
          className="absolute h-8 w-8 bg-white dark:bg-zinc-800 rounded-full border border-black/10 dark:border-white/10 shadow-lg pointer-events-none transition-all duration-200 flex items-center justify-center"
          style={{ left: `calc(${throttle}% - 16px)` }}
        >
          <Zap
            size={14}
            className={`fill-indigo-500 transition-colors ${throttle > 50 ? "text-indigo-500" : "text-zinc-400"}`}
          />
        </div>
      </div>

      <div className="flex justify-between mt-6 text-xs font-medium text-arc-muted px-1 z-10">
        <span>Quiet</span>
        <span>Standard</span>
        <span>Rocket</span>
      </div>
    </Card>
  );
}
