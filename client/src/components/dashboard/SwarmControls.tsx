import { Play, Pause, Square, Power } from "lucide-react";
import { Card } from "../ui/Card";

interface SwarmControlsProps {
  isRunning: boolean;
  status: string;
  onStart: () => void;
  onPause: () => void;
  onStop: () => void;
}

export function SwarmControls({
  isRunning,
  status,
  onStart,
  onPause,
  onStop,
}: SwarmControlsProps) {
  return (
    <Card
      className="w-24 h-full flex flex-col justify-between relative overflow-hidden shrink-0"
      noPadding
    >
      <div
        className={`absolute inset-0 transition-opacity duration-1000 opacity-20 pointer-events-none
          ${status === "WORKING" ? "bg-emerald-500/10" : ""}
          ${status === "PAUSED" ? "bg-amber-500/10" : ""}
          ${status === "STOPPED" ? "bg-rose-500/5" : ""}
        `}
      />

      <div className="relative z-10 flex flex-col h-full p-2">
        {/* Status Indicator */}
        <div className="flex justify-center pt-2 mb-4">
          <div
            className={`p-2 rounded-full border transition-all duration-500 shadow-lg ${
              status === "WORKING"
                ? "bg-emerald-500/10 border-emerald-500/50 text-emerald-500 shadow-emerald-500/20"
                : "bg-arc-bg border-arc-border text-arc-muted"
            }`}
          >
            <Power size={18} />
          </div>
        </div>

        {/* Controls */}
        <div className="flex-1 flex flex-col justify-end gap-2">
          {/* START */}
          <button
            onClick={onStart}
            disabled={isRunning}
            className={`
              group flex flex-col items-center justify-center py-3 rounded-xl border transition-all duration-200 active:scale-95
              ${
                isRunning
                  ? "bg-emerald-500/20 border-emerald-500/50 text-emerald-400 shadow-[inset_0_2px_4px_rgba(0,0,0,0.1)]"
                  : "bg-arc-bg border-arc-border hover:border-emerald-500/50 hover:text-emerald-500"
              }
            `}
          >
            <Play
              size={18}
              className={isRunning ? "fill-emerald-400" : "fill-current"}
            />
            <span className="text-[9px] font-bold tracking-widest mt-1">
              RUN
            </span>
          </button>

          {/* PAUSE */}
          <button
            onClick={onPause}
            disabled={!isRunning}
            className={`
              group flex flex-col items-center justify-center py-3 rounded-xl border transition-all duration-200 active:scale-95
              ${
                status === "PAUSED"
                  ? "bg-amber-500/20 border-amber-500/50 text-amber-400 shadow-[inset_0_2px_4px_rgba(0,0,0,0.1)]"
                  : !isRunning
                    ? "opacity-50 cursor-not-allowed border-arc-border"
                    : "bg-arc-bg border-arc-border hover:border-amber-500/50 hover:text-amber-500"
              }
            `}
          >
            <Pause
              size={18}
              className={
                status === "PAUSED" ? "fill-amber-400" : "fill-current"
              }
            />
            <span className="text-[9px] font-bold tracking-widest mt-1">
              PAUSE
            </span>
          </button>

          {/* STOP */}
          <button
            onClick={onStop}
            className="group flex flex-col items-center justify-center py-3 rounded-xl border border-arc-border bg-arc-bg hover:border-rose-500/50 hover:bg-rose-500/10 hover:text-rose-500 transition-all duration-200 active:scale-95 active:bg-rose-500/20"
          >
            <Square size={18} className="fill-current" />
            <span className="text-[9px] font-bold tracking-widest mt-1">
              END
            </span>
          </button>
        </div>
      </div>
    </Card>
  );
}
