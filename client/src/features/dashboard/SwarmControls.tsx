import { Play, Pause, Square } from "lucide-react";
import { Card } from "../../components/Card";

interface SwarmControlsProps {
  readonly status: "IDLE" | "RUNNING" | "PAUSED" | "STOPPED";
  readonly onToggle: () => void;
  readonly onStop: () => void;
}

export const SwarmControls = ({
  status,
  onToggle,
  onStop,
}: SwarmControlsProps) => {
  const isRunning = status === "RUNNING";

  return (
    <Card className="p-5 bg-surface-white">
      <h3 className="font-bold text-sm text-text-muted uppercase tracking-widest mb-4">
        Master Control
      </h3>

      <div className="grid grid-cols-2 gap-4">
        {/* Start/Pause: Orange by default, Emerald on Hover */}
        <button
          onClick={() => {
            console.log("CLICKED TOGGLE");
            onToggle();
          }}
          className={`
            h-20 rounded-2xl flex flex-col items-center justify-center gap-2 transition-all duration-200 active:scale-[0.95]
            border group
            ${
              isRunning
                ? "bg-brand-orange/5 border-brand-orange/20 shadow-inner"
                : "bg-surface-white shadow-[6px_6px_12px_#d1d5db,-6px_-6px_12px_#ffffff] border-white hover:bg-emerald-50 hover:border-emerald-100"
            }
          `}
        >
          <div
            className={`p-2 rounded-full transition-colors ${
              isRunning
                ? "bg-brand-orange text-white shadow-[0_0_10px_rgba(255,125,84,0.4)]"
                : "text-text-muted bg-gray-100 group-hover:bg-emerald-100 group-hover:text-emerald-600"
            }`}
          >
            {isRunning ? (
              <Pause size={24} fill="currentColor" />
            ) : (
              <Play size={24} fill="currentColor" className="ml-0.5" />
            )}
          </div>
          <span
            className={`text-[10px] font-black uppercase transition-colors ${
              isRunning
                ? "text-brand-orange"
                : "text-text-muted group-hover:text-emerald-600"
            }`}
          >
            {isRunning ? "Pause Swarm" : "Start Swarm"}
          </span>
        </button>

        {/* Kill Process: Gray by default, Red on Hover */}
        <button
          onClick={() => {
            if (
              window.confirm(
                "KILL PROCESS? This will terminate all active local threads.",
              )
            ) {
              onStop();
            }
          }}
          className={`
            h-20 rounded-2xl flex flex-col items-center justify-center gap-2 transition-all duration-200 active:scale-[0.98]
            border group
            ${
              status === "STOPPED"
                ? "bg-red-50 border-red-200 shadow-inner"
                : "bg-surface-white shadow-[6px_6px_12px_#d1d5db,-6px_-6px_12px_#ffffff] border-white hover:bg-red-50 hover:border-red-100"
            }
          `}
        >
          <div
            className={`p-2 rounded-full transition-colors ${
              status === "STOPPED"
                ? "bg-red-500 text-white"
                : "text-text-muted bg-gray-100 group-hover:bg-red-100 group-hover:text-red-500"
            }`}
          >
            <Square size={24} fill="currentColor" />
          </div>
          <span
            className={`text-[10px] font-black uppercase transition-colors ${
              status === "STOPPED"
                ? "text-red-600"
                : "text-text-muted group-hover:text-red-600"
            }`}
          >
            {status === "STOPPED" ? "System Killed" : "Kill Process"}
          </span>
        </button>
      </div>

      {/* Status LED Panel */}
      <div className="mt-6 flex items-center justify-between soft-inset p-3 border border-black/5 dark:border-white/5">
        <span className="text-xs font-bold text-text-muted">System State</span>
        <div className="flex items-center gap-2">
          <div
            className={`w-2 h-2 rounded-full ${
              isRunning
                ? "bg-brand-orange shadow-[0_0_8px_rgba(255,125,84,0.8)]"
                : "bg-red-500"
            }`}
          />
          <span className="font-mono text-xs font-bold text-text-main">
            {status}
          </span>
        </div>
      </div>
    </Card>
  );
};
