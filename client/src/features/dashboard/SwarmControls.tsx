import { Play, Pause, Power, Square } from "lucide-react";
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
        {/* Toggle Button (Play/Pause) - Tactile Feel */}
        <button
          onClick={onToggle}
          className={`
            h-20 rounded-2xl flex flex-col items-center justify-center gap-2 transition-all duration-200 active:scale-[0.98]
            ${
              isRunning
                ? "bg-surface-muted shadow-inner border border-transparent" // Pressed State
                : "bg-surface-white shadow-[6px_6px_12px_#d1d5db,-6px_-6px_12px_#ffffff] border border-white" // Unpressed Pop
            }
          `}
        >
          <div
            className={`p-2 rounded-full ${isRunning ? "bg-brand-orange text-white shadow-sm" : "text-text-muted"}`}
          >
            {isRunning ? (
              <Pause size={24} fill="currentColor" />
            ) : (
              <Play size={24} fill="currentColor" className="ml-0.5" />
            )}
          </div>
          <span
            className={`text-[10px] font-black uppercase ${isRunning ? "text-brand-orange" : "text-text-muted"}`}
          >
            {isRunning ? "Pause Swarm" : "Start Swarm"}
          </span>
        </button>

        {/* Stop Button - Tactile Feel */}
        <button
          onClick={onStop}
          className="
            h-20 rounded-2xl flex flex-col items-center justify-center gap-2 transition-all duration-200 active:scale-[0.98]
            bg-surface-white shadow-[6px_6px_12px_#d1d5db,-6px_-6px_12px_#ffffff] border border-white hover:bg-red-50 group
          "
        >
          <div className="p-2 text-text-muted group-hover:text-red-500 transition-colors">
            <Square size={24} fill="currentColor" />
          </div>
          <span className="text-[10px] font-black uppercase text-text-muted group-hover:text-red-500">
            Kill Process
          </span>
        </button>
      </div>

      {/* Status LED Panel */}
      <div className="mt-6 flex items-center justify-between bg-black/5 p-3 rounded-xl shadow-inner border border-black/5">
        <span className="text-xs font-bold text-text-muted">System State</span>
        <div className="flex items-center gap-2">
          <div
            className={`w-2 h-2 rounded-full ${isRunning ? "bg-green-500 shadow-[0_0_8px_rgba(34,197,94,0.8)]" : "bg-red-500"}`}
          />
          <span className="font-mono text-xs font-bold text-text-main">
            {status}
          </span>
        </div>
      </div>
    </Card>
  );
};
