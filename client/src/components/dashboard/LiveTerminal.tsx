import { useEffect, useRef } from "react";
import { Terminal } from "lucide-react";
import { Card } from "../ui/Card";

export function LiveTerminal({ logs, status }: any) {
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    scrollRef.current?.scrollTo({
      top: scrollRef.current.scrollHeight,
      behavior: "smooth",
    });
  }, [logs]);

  // Helper to colorize logs based on content
  const getColor = (text: string) => {
    if (text.includes("[Err]")) return "text-red-400";
    if (text.includes("Matrix")) return "text-indigo-400";
    if (text.includes("Stress")) return "text-orange-400";
    if (text.includes("Succ")) return "text-emerald-400";
    return "text-zinc-400";
  };

  return (
    <Card className="md:col-span-6 h-60 bg-zinc-950 text-zinc-300 font-mono text-[10px] overflow-hidden flex flex-col border-zinc-800 shadow-inner">
      <div className="flex items-center gap-2 p-3 border-b border-white/5 bg-white/5">
        <Terminal size={12} className="text-zinc-500" />
        <span className="text-zinc-500 uppercase tracking-wider font-bold">
          Kernel Output
        </span>
      </div>

      <div
        ref={scrollRef}
        className="flex-1 overflow-y-auto p-3 space-y-1 font-mono leading-tight"
      >
        <p className="text-emerald-500/50">-- SYSTEM READY --</p>

        {logs.map((log: string, i: number) => (
          <p key={i} className={`${getColor(log)} break-all`}>
            {log}
          </p>
        ))}

        {status === "IDLE" && (
          <div className="flex items-center gap-2 mt-2 opacity-50">
            <span className="w-1.5 h-1.5 bg-zinc-500 rounded-full animate-pulse" />
            <span className="text-zinc-600">Awaiting dispatch...</span>
          </div>
        )}
      </div>
    </Card>
  );
}
