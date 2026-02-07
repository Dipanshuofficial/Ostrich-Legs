import { Cpu, RotateCw } from "lucide-react";
import { Card } from "../ui/Card";
import { Badge } from "../ui/Badge";
// 1. Import the hook
import { useComputeSwarm } from "../../hooks/useComputeSwarm";

export function DeviceHealth({
  status,
  opsScore,
  workerId,
}: {
  status: string;
  opsScore: number;
  workerId: string;
}) {
  // 2. UTILISE THE HOOK: Get the trigger function directly here
  const { runBenchmark } = useComputeSwarm();

  return (
    <Card className="md:col-span-4 flex flex-col justify-between h-75">
      <div>
        <div className="flex justify-between items-start mb-6">
          <div className="p-2 bg-arc-bg rounded-xl border border-arc-border">
            <Cpu size={20} className="text-indigo-500" />
          </div>
          <Badge active={status === "WORKING"} text={status} />
        </div>
        <h3 className="text-lg font-medium text-arc-text">Device Health</h3>
        <p className="text-xs text-arc-muted mt-1">Allocation & Benchmarks</p>
      </div>

      <div className="space-y-3">
        {/* BENCHMARK ROW */}
        <div className="p-4 rounded-2xl bg-arc-bg border border-arc-border flex justify-between items-center group">
          <div className="flex flex-col">
            <span className="text-xs text-arc-muted font-bold tracking-wider mb-1">
              BENCHMARK
            </span>
            <span className="text-lg font-mono text-indigo-500 font-bold">
              {opsScore > 0 ? opsScore.toLocaleString() : "---"}
              <span className="text-xs text-arc-muted font-normal ml-1">
                OPS
              </span>
            </span>
          </div>

          {/* RETRY BUTTON (Calls the hook directly) */}
          <button
            onClick={runBenchmark}
            className={`p-2 rounded-full hover:bg-indigo-500/10 transition-colors ${opsScore === 0 ? "animate-pulse text-indigo-500" : "text-arc-muted opacity-0 group-hover:opacity-100"}`}
            title="Re-run Benchmark"
          >
            <RotateCw size={14} />
          </button>
        </div>

        <div className="p-4 rounded-2xl bg-arc-bg border border-arc-border flex justify-between items-center">
          <span className="text-xs text-arc-muted font-bold tracking-wider">
            ID
          </span>
          <span className="text-[10px] font-mono text-arc-muted truncate max-w-25">
            {workerId || "Connecting..."}
          </span>
        </div>
      </div>
    </Card>
  );
}
