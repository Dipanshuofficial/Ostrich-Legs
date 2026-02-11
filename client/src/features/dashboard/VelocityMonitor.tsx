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

  // DEBUG 1: Verify Props on every update
  useEffect(() => {
    if (velocity > 0) {
      console.log(`[UI-VELOCITY] 🟢 Data Received: ${velocity} OPS`);
    } else {
      console.log(`[UI-VELOCITY] 🔴 Data is ZERO`);
    }
  }, [velocity]);

  const getColor = (val: number) => {
    if (val < 30) return "#22c55e";
    if (val < 70) return "#ff7d54";
    return "#ef4444";
  };

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) {
      console.error("[UI-VELOCITY] Canvas Ref is NULL");
      return;
    }

    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    // Handle high-DPI displays
    const dpr = window.devicePixelRatio || 1;
    const rect = canvas.getBoundingClientRect();

    // DEBUG 2: Verify Canvas Dimensions
    if (rect.width === 0) console.warn("[UI-VELOCITY] Canvas has 0 width!");

    canvas.width = rect.width * dpr;
    canvas.height = rect.height * dpr;
    ctx.scale(dpr, dpr);

    const animate = () => {
      // 1. Shift Data
      dataRef.current.shift();
      dataRef.current.push(velocity);

      // DEBUG 3: Random sample check (1% chance to avoid spam)
      if (Math.random() < 0.01) {
        const max = Math.max(...dataRef.current);
        console.log(`[UI-LOOP] Max value in graph buffer: ${max}`);
      }

      // 2. Clear
      ctx.clearRect(0, 0, rect.width, rect.height);

      // 3. Draw
      const activeColor = getColor(throttle);

      const gradient = ctx.createLinearGradient(0, 0, 0, rect.height);
      gradient.addColorStop(0, `${activeColor}40`);
      gradient.addColorStop(1, `${activeColor}00`);

      ctx.beginPath();
      const step = rect.width / (dataRef.current.length - 1);

      ctx.moveTo(0, rect.height);

      dataRef.current.forEach((val, i) => {
        const x = i * step;
        // Scale: Dynamic scaling!
        // If max velocity is small, scale up so we see SOMETHING
        // Minimum scale is 100 to prevent noise
        const dynamicMax = Math.max(Math.max(...dataRef.current) * 1.2, 100);

        const normalized = Math.min(val / dynamicMax, 1);
        const y = rect.height - normalized * rect.height * 0.8 - 10;
        ctx.lineTo(x, y);
      });

      ctx.lineTo(rect.width, rect.height);
      ctx.fillStyle = gradient;
      ctx.fill();

      // Stroke
      ctx.beginPath();
      ctx.lineWidth = 2;
      ctx.lineJoin = "round";
      ctx.strokeStyle = activeColor;

      dataRef.current.forEach((val, i) => {
        const x = i * step;
        const dynamicMax = Math.max(Math.max(...dataRef.current) * 1.2, 100);
        const normalized = Math.min(val / dynamicMax, 1);
        const y = rect.height - normalized * rect.height * 0.8 - 10;

        if (i === 0) ctx.moveTo(x, y);
        else ctx.lineTo(x, y);
      });
      ctx.stroke();

      requestRef.current = requestAnimationFrame(animate);
    };

    requestRef.current = requestAnimationFrame(animate);

    return () => cancelAnimationFrame(requestRef.current);
  }, [velocity, throttle]);

  return (
    <Card className="h-80 flex flex-col relative overflow-hidden bg-surface-white border border-border-soft shadow-soft-depth">
      <div className="flex justify-between items-center mb-4 z-10 px-2">
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
      <div className="flex-1 w-full min-h-0 relative bg-surface-muted/30 rounded-xl border border-black/5 shadow-inner overflow-hidden">
        <canvas ref={canvasRef} className="w-full h-full relative z-10" />
      </div>
    </Card>
  );
};
