import { useEffect, useRef, memo } from "react";
import { Terminal, Activity } from "lucide-react";
import { Card } from "../../components/Card";

interface Props {
  logs: string[];
}

const LogLine = memo(({ log, index }: { log: string; index: number }) => {
  const isErr = log.includes("[ERR]");
  const isSys = log.includes("[SYS]");
  const isNet = log.includes("[NET]");

  return (
    <div className="flex gap-3 leading-relaxed border-b border-gray-100/30 pb-1 last:border-0">
      <span className="text-gray-400 select-none font-bold w-8">
        {(index + 1).toString().padStart(3, "0")}
      </span>
      <span
        className={`font-medium ${isErr ? "text-red-500" : isSys ? "text-blue-600" : isNet ? "text-green-600" : "text-gray-600"}`}
      >
        {log}
      </span>
    </div>
  );
});

LogLine.displayName = "LogLine";

export const LiveTerminal = ({ logs }: Props) => {
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [logs]);

  return (
    <Card className="h-full flex flex-col relative overflow-hidden bg-surface-white border border-border-soft shadow-soft-depth">
      <div className="flex items-center justify-between px-5 py-3 bg-[#e9ecef] border-b border-white rounded-t-xl shadow-sm z-10">
        <div className="flex items-center gap-2.5">
          <Terminal size={12} className="text-text-main" />
          <span className="text-[10px] font-black text-text-main/80 tracking-widest uppercase">
            System Log
          </span>
        </div>
        <div className="flex bg-surface-white px-3 py-1 rounded-lg border border-white/50 shadow-inner">
          <Activity
            size={10}
            className="text-brand-orange animate-pulse mr-2"
          />
          <span className="text-[9px] font-bold text-brand-orange uppercase">
            Realtime
          </span>
        </div>
      </div>

      <div
        ref={scrollRef}
        className="flex-1 p-5 font-mono text-[11px] overflow-y-auto space-y-1 bg-surface-muted/30"
      >
        {logs.length === 0 && (
          <span className="text-gray-400 italic">
            Listening for swarm events...
          </span>
        )}
        {logs.map((log, i) => (
          <LogLine key={i} log={log} index={i} />
        ))}
      </div>
    </Card>
  );
};
