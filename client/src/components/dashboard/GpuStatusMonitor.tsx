import { useEffect, useRef } from "react";
import { Card } from "../ui/Card";

interface DataPoint {
  value: number;
  throttle: number;
  timestamp: number;
}

interface GpuStatusMonitorProps {
  completedCount: number; // This is now GLOBAL completed count
  throttle: number;
}

export function GpuStatusMonitor({
  completedCount,
  throttle,
}: GpuStatusMonitorProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const dataRef = useRef<DataPoint[]>([]);
  const countRef = useRef(completedCount);
  const prevCountRef = useRef(completedCount);
  const throttleRef = useRef(throttle);

  useEffect(() => {
    throttleRef.current = throttle;
  }, [throttle]);
  useEffect(() => {
    countRef.current = completedCount;
  }, [completedCount]);

  useEffect(() => {
    if (dataRef.current.length === 0) {
      dataRef.current = new Array(60).fill(0).map(() => ({
        value: 0,
        throttle: 30,
        timestamp: Date.now(),
      }));
    }

    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext("2d", { alpha: true });
    if (!ctx) return;

    const dpr = window.devicePixelRatio || 1;
    const rect = canvas.getBoundingClientRect();
    canvas.width = rect.width * dpr;
    canvas.height = rect.height * dpr;
    ctx.scale(dpr, dpr);

    // Sample data every 500ms (aligned with UI update)
    const dataInterval = setInterval(() => {
      const delta = countRef.current - prevCountRef.current;
      prevCountRef.current = countRef.current;

      dataRef.current.shift();
      dataRef.current.push({
        value: delta, // Delta is chunks per 500ms
        throttle: throttleRef.current,
        timestamp: Date.now(),
      });
    }, 500);

    let animationFrameId: number;
    const draw = () => {
      const width = rect.width;
      const height = rect.height;

      ctx.clearRect(0, 0, width, height);

      // --- Draw Logic ---
      const recent = dataRef.current.slice(-5);
      const avgSpeed = recent.reduce((a, b) => a + b.value, 0) / recent.length;
      // Convert 500ms chunks to "per second"
      const speedPerSec = Math.round(avgSpeed * 2);

      // Grid
      ctx.strokeStyle = "rgba(255, 255, 255, 0.05)";
      ctx.lineWidth = 1;
      for (let i = 0; i < 4; i++) {
        const y = (height / 3) * i;
        ctx.beginPath();
        ctx.moveTo(0, y);
        ctx.lineTo(width, y);
        ctx.stroke();
      }

      // Chart
      const data = dataRef.current;
      const maxVal = Math.max(...data.map((d) => d.value), 5);

      const getColor = (lvl: number) => {
        if (lvl <= 30) return [16, 185, 129];
        if (lvl >= 80) return [244, 63, 94];
        return [99, 102, 241];
      };

      for (let i = 0; i < data.length - 1; i++) {
        const [r, g, b] = getColor(data[i].throttle);
        const x1 = (i / (data.length - 1)) * width;
        const x2 = ((i + 1) / (data.length - 1)) * width;
        const y1 = height - (data[i].value / maxVal) * (height * 0.8);
        const y2 = height - (data[i + 1].value / maxVal) * (height * 0.8);

        const grad = ctx.createLinearGradient(x1, y1, x1, height);
        grad.addColorStop(0, `rgba(${r},${g},${b},0.4)`);
        grad.addColorStop(1, `rgba(${r},${g},${b},0)`);

        ctx.beginPath();
        ctx.moveTo(x1, height);
        ctx.lineTo(x1, y1);
        ctx.lineTo(x2, y2);
        ctx.lineTo(x2, height);
        ctx.fillStyle = grad;
        ctx.fill();

        ctx.beginPath();
        ctx.moveTo(x1, y1);
        ctx.lineTo(x2, y2);
        ctx.strokeStyle = `rgb(${r},${g},${b})`;
        ctx.lineWidth = 2;
        ctx.stroke();
      }

      // Text
      ctx.font = "bold 48px Inter";
      ctx.fillStyle = "var(--arc-text)";
      ctx.textAlign = "left";
      ctx.fillText(speedPerSec.toString(), 32, 60);

      ctx.font = "14px Inter";
      ctx.fillStyle = "var(--arc-muted)";
      ctx.fillText("global chunks / sec", 32, 85);

      animationFrameId = requestAnimationFrame(draw);
    };

    draw();

    return () => {
      clearInterval(dataInterval);
      cancelAnimationFrame(animationFrameId);
    };
  }, []);

  const currentColor =
    throttle <= 30 ? "#10b981" : throttle >= 80 ? "#f43f5e" : "#6366f1";

  return (
    <Card
      className="md:col-span-8 h-90 flex flex-col justify-between relative"
      noPadding
    >
      <div className="p-8 pb-0 z-20 relative">
        <div className="flex items-center gap-3 mb-2">
          <div
            className="w-2 h-2 rounded-full animate-pulse"
            style={{ backgroundColor: currentColor }}
          />
          <h2 className="text-xs font-bold tracking-widest text-arc-muted uppercase">
            Global Swarm Velocity
          </h2>
        </div>
        <p className="text-xs text-arc-muted font-medium mt-12">
          Total Contribution:{" "}
          <span className="font-mono text-arc-text opacity-80">
            {completedCount.toLocaleString()}
          </span>{" "}
          chunks
        </p>
        <div className="flex items-center gap-2 mt-2">
          <span
            className="text-[10px] px-2 py-0.5 rounded-full font-medium"
            style={{
              backgroundColor: `${currentColor}20`,
              color: currentColor,
            }}
          >
            {Math.round(throttle)}% Throttle
          </span>
        </div>
      </div>
      <canvas
        ref={canvasRef}
        className="absolute bottom-0 left-0 right-0 h-55 w-full pointer-events-none"
      />
    </Card>
  );
}
