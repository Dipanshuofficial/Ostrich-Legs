import { useEffect, useRef } from "react";
import { Terminal, Activity } from "lucide-react";
import { Card } from "../../components/Card";

interface Props {
  logs: string[];
}

export const LiveTerminal = ({ logs }: Props) => {
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [logs]);

  return (
    <Card className="flex flex-col h-full bg-[#f8f9fa] border border-white shadow-[inset_2px_2px_5px_rgba(0,0,0,0.05),inset_-2px_-2px_5px_rgba(255,255,255,1)] rounded-2xl overflow-hidden">
      {/* Light Skeuomorphic Header */}
      <div className="flex items-center justify-between px-5 py-3 bg-[#e9ecef] border-b border-white border-t border-t-white/50 shadow-sm z-10">
        <div className="flex items-center gap-2.5">
          <div className="p-1 bg-white rounded-md shadow-sm">
            <Terminal size={12} className="text-text-muted" />
          </div>
          <span className="text-[10px] font-black text-text-muted tracking-widest uppercase">
            System Log
          </span>
        </div>
        <div className="flex items-center gap-2">
          <Activity size={12} className="text-brand-orange animate-pulse" />
          <span className="text-[9px] font-bold text-brand-orange">LIVE</span>
        </div>
      </div>

      {/* Content */}
      <div
        ref={scrollRef}
        className="flex-1 p-5 font-mono text-[11px] overflow-y-auto space-y-2 scrollbar-thin scrollbar-thumb-gray-200"
      >
        {logs.length === 0 && (
          <span className="text-gray-400 italic">Initializing kernel...</span>
        )}
        {logs.map((log, i) => (
          <div
            key={i}
            className="flex gap-3 leading-relaxed border-b border-gray-100/50 pb-1 last:border-0"
          >
            <span className="text-gray-400 select-none font-bold">
              {(i + 1).toString().padStart(3, "0")}
            </span>
            <span
              className={`font-medium ${
                log.includes("ERR")
                  ? "text-red-500"
                  : log.includes("SYS")
                    ? "text-blue-600"
                    : "text-gray-600"
              }`}
            >
              {log}
            </span>
          </div>
        ))}
      </div>
    </Card>
  );
};
