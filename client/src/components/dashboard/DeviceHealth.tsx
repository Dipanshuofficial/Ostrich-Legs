import { Cpu, RotateCw } from "lucide-react";
import { Card } from "../ui/Card";
import { Badge } from "../ui/Badge";
import { useComputeSwarm } from "../../hooks/useComputeSwarm";

// Add className prop to allow parent to control dimensions
export function DeviceHealth({
  status,
  opsScore,
  workerId,
  className = "",
}: {
  status: string;
  opsScore: number;
  workerId: string;
  className?: string;
}) {
  const { runBenchmark } = useComputeSwarm();

  return (
    // Changed: Removed "h-75" and "md:col-span-4". Added {className}.
    <Card className={`flex flex-col justify-between ${className}`}>
      <div>
        <div className="flex justify-between items-start mb-4">
          <div className="p-2 bg-arc-bg rounded-xl border border-arc-border">
            <Cpu size={20} className="text-indigo-500" />
          </div>
          <Badge active={status === "WORKING"} text={status} />
        </div>
        <h3 className="text-base font-medium text-arc-text">Device Health</h3>
        <p className="text-xs text-arc-muted mt-0.5">Allocation & Benchmarks</p>
      </div>

      <div className="space-y-2 mt-2">
        {/* BENCHMARK ROW */}
        <div className="p-3 rounded-2xl bg-arc-bg border border-arc-border flex justify-between items-center group">
          <div className="flex flex-col">
            <span className="text-[10px] text-arc-muted font-bold tracking-wider mb-0.5">
              BENCHMARK
            </span>
            <span className="text-base font-mono text-indigo-500 font-bold">
              {opsScore > 0 ? opsScore.toLocaleString() : "---"}
              <span className="text-[10px] text-arc-muted font-normal ml-1">
                OPS
              </span>
            </span>
          </div>

          <button
            onClick={runBenchmark}
            className={`p-2 rounded-full hover:bg-indigo-500/10 transition-colors ${opsScore === 0 ? "animate-pulse text-indigo-500" : "text-arc-muted opacity-0 group-hover:opacity-100"}`}
            title="Re-run Benchmark"
          >
            <RotateCw size={14} />
          </button>
        </div>

        <div className="p-3 rounded-2xl bg-arc-bg border border-arc-border flex justify-between items-center">
          <span className="text-[10px] text-arc-muted font-bold tracking-wider">
            ID
          </span>
          <span className="text-[10px] font-mono text-arc-muted truncate max-w-20">
            {workerId || "Connecting..."}
          </span>
        </div>
      </div>
    </Card>
  );
}
