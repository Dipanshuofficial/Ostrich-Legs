import { useEffect, useRef } from "react";
import { Card } from "../../components/Card";
import { Activity } from "lucide-react";

interface VelocityMonitorProps {
  readonly velocity: number;
  readonly throttle: number;
}

export const VelocityMonitor = ({
  velocity,
  throttle,
}: VelocityMonitorProps) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const dataRef = useRef<number[]>(new Array(60).fill(0));
  const requestRef = useRef<number>(0);

  const getColor = (val: number) => {
    if (val < 30) return "#22c55e";
    if (val < 70) return "#ff7d54";
    return "#ef4444";
  };

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext("2d", { alpha: false }); // Optimization: No alpha channel for faster clearing
    if (!ctx) return;

    const dpr = window.devicePixelRatio || 1;
    const rect = canvas.getBoundingClientRect();
    canvas.width = rect.width * dpr;
    canvas.height = rect.height * dpr;
    ctx.scale(dpr, dpr);

    const animate = () => {
      // Shift data and update with current velocity
      dataRef.current.shift();
      dataRef.current.push(velocity);

      ctx.fillStyle = "#fcfcfd"; // Match surface-white
      ctx.fillRect(0, 0, rect.width, rect.height);

      const activeColor = getColor(throttle);
      const step = rect.width / (dataRef.current.length - 1);
      const dynamicMax = Math.max(Math.max(...dataRef.current) * 1.2, 100);

      // Draw Gradient Path
      ctx.beginPath();
      ctx.moveTo(0, rect.height);
      dataRef.current.forEach((val, i) => {
        const x = i * step;
        const normalized = Math.min(val / dynamicMax, 1);
        const y = rect.height - normalized * rect.height * 0.7 - 20;
        ctx.lineTo(x, y);
      });
      ctx.lineTo(rect.width, rect.height);
      const gradient = ctx.createLinearGradient(0, 0, 0, rect.height);
      gradient.addColorStop(0, `${activeColor}33`);
      gradient.addColorStop(1, `${activeColor}00`);
      ctx.fillStyle = gradient;
      ctx.fill();

      // Draw Stroke
      ctx.beginPath();
      ctx.lineWidth = 2;
      ctx.lineJoin = "round";
      ctx.strokeStyle = activeColor;
      dataRef.current.forEach((val, i) => {
        const x = i * step;
        const normalized = Math.min(val / dynamicMax, 1);
        const y = rect.height - normalized * rect.height * 0.7 - 20;
        if (i === 0) ctx.moveTo(x, y);
        else ctx.lineTo(x, y);
      });
      ctx.stroke();

      requestRef.current = requestAnimationFrame(animate);
    };

    const handleVisibilityChange = () => {
      if (document.hidden) {
        cancelAnimationFrame(requestRef.current);
      } else {
        requestRef.current = requestAnimationFrame(animate);
      }
    };

    document.addEventListener("visibilitychange", handleVisibilityChange);
    requestRef.current = requestAnimationFrame(animate);

    return () => {
      cancelAnimationFrame(requestRef.current);
      document.removeEventListener("visibilitychange", handleVisibilityChange);
    };
  }, [velocity, throttle]);

  return (
    <Card className="h-80 flex flex-col relative overflow-hidden bg-surface-white border border-border-soft shadow-soft-depth">
      <div className="flex justify-between items-center mb-4 z-10 px-5 pt-5">
        <div>
          <h3 className="font-bold text-lg text-text-main flex items-center gap-2">
            <Activity
              className={throttle > 70 ? "text-red-500" : "text-brand-orange"}
              size={20}
            />
            Live Compute Velocity
          </h3>
          <p className="text-xs text-text-muted mt-1">
            Real-time operations per second
          </p>
        </div>
        <div className="bg-surface-muted/50 px-4 py-2 rounded-xl border border-white/50 shadow-inner backdrop-blur-sm">
          <span
            className="text-3xl font-black tabular-nums tracking-tight"
            style={{ color: getColor(throttle) }}
          >
            {velocity.toLocaleString()}
          </span>
          <span className="text-[10px] font-bold text-text-muted ml-1 uppercase">
            OPS/s
          </span>
        </div>
      </div>
      <div className="flex-1 w-full min-h-0 relative px-5 pb-5">
        <canvas
          ref={canvasRef}
          className="w-full h-full rounded-xl border border-black/5 shadow-inner"
        />
      </div>
    </Card>
  );
};
