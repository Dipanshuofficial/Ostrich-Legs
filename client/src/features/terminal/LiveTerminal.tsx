import { useEffect, useRef, useState } from "react";
import { Terminal, Activity, Copy } from "lucide-react";
import { Card } from "../../components/Card";

interface Props {
  logs: string[];
}

export const LiveTerminal = ({ logs }: Props) => {
  const scrollRef = useRef<HTMLDivElement>(null);

  // 1. Add state inside LiveTerminal
  const [menu, setMenu] = useState<{ x: number; y: number } | null>(null);

  const handleSelection = () => {
    const selection = window.getSelection();

    if (
      !selection ||
      !selection.toString().trim() ||
      selection.rangeCount === 0 ||
      !selection.focusNode // ← this is the missing null check
    ) {
      setMenu(null);
      return;
    }

    const range = document.createRange();
    range.setStart(selection.focusNode, selection.focusOffset); // now safe
    range.collapse(true);

    const rect = range.getBoundingClientRect();

    setMenu({
      x: rect.left, // or rect.left + 8, or rect.left - 100, etc.
      y: rect.top - 40,
    });
  };

  // Add to your div: onMouseUp={handleSelection}
  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [logs]);

  return (
    <Card className="h-80 flex flex-col relative overflow-hidden bg-surface-white border border-border-soft shadow-soft-depth">
      {/* Light Skeuomorphic Header */}
      <div className="flex items-center justify-between px-5 py-3 bg-[#e9ecef] border-b border-white border-t border-t-white/50 rounded-t-xl shadow-sm z-10">
        <div className="flex items-center gap-2.5">
          <div className="p-1 bg-white rounded-md shadow-sm">
            <Terminal size={12} className="text-text-main" />
          </div>
          <span className="text-[10px] font-black text-text-main/80 tracking-widest uppercase">
            System Log
          </span>
        </div>
        <div className="flex bg-surface-white px-4 py-2 rounded-xl border border-white/50 shadow-inner backdrop-blur-sm">
          <Activity size={12} className="text-brand-orange animate-pulse" />
          <span className="text-[9px] font-bold text-brand-orange">LIVE</span>
        </div>
      </div>

      {/* Content */}
      <div
        ref={scrollRef}
        onMouseUp={handleSelection}
        className="flex-1 p-5 font-mono text-[11px] overflow-y-auto space-y-2 scrollbar-thin scrollbar-thumb-gray-200 bg-surface-muted/30 border rounded-b-xl border-black/5 shadow-inner"
      >
        <div className="z-10">
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
      </div>
      {menu && (
        <div
          style={{ left: menu.x, top: menu.y }}
          className="fixed -translate-x-1/2 z-50 flex items-center bg-[#e9ecef] border border-white border-t-white/50 rounded-lg shadow-[0_4px_10px_rgba(0,0,0,0.1)] px-1 py-1 animate-in fade-in zoom-in duration-100"
        >
          <button
            onClick={() => {
              navigator.clipboard.writeText(
                window.getSelection()?.toString() || "",
              );
              setMenu(null);
            }}
            className="flex items-center gap-1.5 px-2.5 py-1 hover:bg-white rounded-md transition-colors text-text-main font-bold text-[10px] uppercase tracking-wider"
          >
            <Copy size={10} className="text-brand-orange" />
            Copy
          </button>
        </div>
      )}
    </Card>
  );
};
