import { useEffect, useRef } from "react";
import { Terminal } from "lucide-react";
import { Card } from "../ui/Card";

interface LiveTerminalProps {
  logs: string[];
  status: string;
}

export function LiveTerminal({ logs, status }: LiveTerminalProps) {
  const scrollRef = useRef<HTMLDivElement>(null);
  const logsEndRef = useRef<HTMLDivElement>(null);

  // Auto-scroll to bottom when new logs arrive
  useEffect(() => {
    if (logsEndRef.current) {
      logsEndRef.current.scrollIntoView({ behavior: "smooth" });
    }
  }, [logs]);

  // Helper to colorize logs based on content
  const getColor = (text: string) => {
    if (text.includes("[ERR]") || text.includes("[err]")) return "text-red-400";
    if (text.includes("[SYS]") || text.includes("System")) return "text-blue-400";
    if (text.includes("[NET]") || text.includes("Connected")) return "text-cyan-400";
    if (text.includes("[CFG]") || text.includes("Throttle")) return "text-yellow-400";
    if (text.includes("[CPU]") || text.includes("threads")) return "text-purple-400";
    if (text.includes("Device") || text.includes("joined") || text.includes("left")) return "text-emerald-400";
    return "text-zinc-300";
  };

  return (
    <Card className="md:col-span-6 h-60 bg-zinc-950 text-zinc-300 font-mono text-[11px] overflow-hidden flex flex-col border-zinc-800 shadow-inner">
      <div className="flex items-center gap-2 px-4 py-2 border-b border-white/5 bg-white/5 shrink-0">
        <Terminal size={12} className="text-zinc-500" />
        <span className="text-zinc-500 uppercase tracking-wider font-bold text-[10px]">
          Kernel Output
        </span>
        <span className="ml-auto text-[10px] text-zinc-600">
          {logs.length} entries
        </span>
      </div>

      <div
        ref={scrollRef}
        className="flex-1 overflow-y-auto p-4 space-y-1.5 font-mono leading-relaxed scroll-smooth"
        style={{ scrollbarWidth: 'thin', scrollbarColor: '#3f3f46 #18181b' }}
      >
        <p className="text-emerald-500/50 text-[10px]">-- SYSTEM READY --</p>

        {logs.map((log: string, i: number) => (
          <p 
            key={i} 
            className={`${getColor(log)} break-words whitespace-pre-wrap py-0.5`}
          >
            {log}
          </p>
        ))}

        <div ref={logsEndRef} />

        {status === "IDLE" && logs.length === 0 && (
          <div className="flex items-center gap-2 mt-2 opacity-50">
            <span className="w-1.5 h-1.5 bg-zinc-500 rounded-full animate-pulse" />
            <span className="text-zinc-600">Awaiting dispatch...</span>
          </div>
        )}
      </div>
    </Card>
  );
}
