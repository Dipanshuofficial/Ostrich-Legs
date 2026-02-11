import { useEffect, useRef } from "react";
import { Card } from "../../components/Card";
import { Activity } from "lucide-react";

interface VelocityMonitorProps {
  readonly velocity: number;
  readonly throttle: number; // New Prop
}

export const VelocityMonitor = ({
  velocity,
  throttle,
}: VelocityMonitorProps) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const dataRef = useRef<number[]>(new Array(60).fill(0));

  // Determine Color based on Throttle
  const getColor = () => {
    if (throttle < 30) return "#22c55e"; // Green (Eco)
    if (throttle < 70) return "#ff7d54"; // Orange (Balanced)
    return "#ef4444"; // Red (Overdrive)
  };

  const activeColor = getColor();

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    let animationFrameId: number;
    let lastDrawTime = 0;

    const draw = (timestamp: number) => {
      // ... (Keep existing frame limiting logic) ...
      if (timestamp - lastDrawTime < 33) {
        animationFrameId = requestAnimationFrame(draw);
        return;
      }
      lastDrawTime = timestamp;

      const { width, height } = canvas;
      ctx.clearRect(0, 0, width, height);

      dataRef.current.shift();
      dataRef.current.push(velocity);

      // Dynamic Gradient
      const gradient = ctx.createLinearGradient(0, 0, 0, height);
      gradient.addColorStop(0, `${activeColor}80`); // 50% opacity
      gradient.addColorStop(1, `${activeColor}00`); // 0% opacity

      ctx.beginPath();
      ctx.lineWidth = 4;
      ctx.lineCap = "round";
      ctx.lineJoin = "round";
      ctx.strokeStyle = activeColor; // Use dynamic color

      const step = width / (dataRef.current.length - 1);

      ctx.moveTo(0, height);
      dataRef.current.forEach((val, i) => {
        const x = i * step;
        const normalized = Math.min(val / 2000, 1);
        const y = height - normalized * height * 0.8 - 10;
        ctx.lineTo(x, y);
      });
      ctx.lineTo(width, height);
      ctx.fillStyle = gradient;
      ctx.fill();

      // Stroke
      ctx.beginPath();
      dataRef.current.forEach((val, i) => {
        const x = i * step;
        const normalized = Math.min(val / 2000, 1);
        const y = height - normalized * height * 0.8 - 10;
        if (i === 0) ctx.moveTo(x, y);
        else ctx.lineTo(x, y);
      });
      ctx.stroke();

      animationFrameId = requestAnimationFrame(draw);
    };

    animationFrameId = requestAnimationFrame(draw);
    return () => cancelAnimationFrame(animationFrameId);
  }, [velocity, activeColor]); // Re-run when color changes

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
            style={{ color: activeColor }}
          >
            {velocity.toLocaleString()}
          </span>
          <span className="text-[10px] font-bold text-text-muted ml-1 uppercase">
            OPS/s
          </span>
        </div>
      </div>
      {/* ... Canvas Container ... */}
      <div className="flex-1 w-full min-h-0 relative bg-surface-muted/30 rounded-xl border border-black/5 shadow-inner overflow-hidden">
        <canvas
          ref={canvasRef}
          width={800}
          height={300}
          className="w-full h-full relative z-10"
        />
      </div>
    </Card>
  );
};
