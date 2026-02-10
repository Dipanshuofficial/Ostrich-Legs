import { useEffect, useRef } from "react";
import { Card } from "../ui/Card";

interface DataPoint {
  value: number;
  throttle: number;
  timestamp: number;
}

interface GpuStatusMonitorProps {
  completedCount: number;
  throttle: number; // 0 to 100
}

export function GpuStatusMonitor({
  completedCount,
  throttle,
}: GpuStatusMonitorProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const dataRef = useRef<DataPoint[]>([]);
  const countRef = useRef(completedCount);
  const prevCountRef = useRef(completedCount);
  const animationFrameRef = useRef<number>(0);
  const throttleRef = useRef(throttle);

  useEffect(() => {
    throttleRef.current = throttle;
  }, [throttle]);

  useEffect(() => {
    countRef.current = completedCount;
  }, [completedCount]);

  useEffect(() => {
    // Initialize data array
    if (dataRef.current.length === 0) {
      dataRef.current = new Array(60).fill(null).map(() => ({
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

    const dataInterval = setInterval(() => {
      const now = Date.now();
      const delta = countRef.current - prevCountRef.current;
      prevCountRef.current = countRef.current;

      dataRef.current.shift();
      dataRef.current.push({
        value: delta * 5,
        throttle: throttleRef.current,
        timestamp: now,
      });
    }, 200);

    const draw = () => {
      if (!ctx || !canvas) return;
      const width = rect.width;
      const height = rect.height;

      ctx.clearRect(0, 0, width, height);

      const recentData = dataRef.current.slice(-5);
      const currentVelocity =
        recentData.length > 0
          ? recentData.reduce((a, b) => a + b.value, 0) / recentData.length
          : 0;

      // Draw Grid
      ctx.strokeStyle = "rgba(255, 255, 255, 0.05)";
      ctx.lineWidth = 1;
      for (let i = 0; i < 5; i++) {
        const y = (height / 4) * i;
        ctx.beginPath();
        ctx.moveTo(0, y);
        ctx.lineTo(width, y);
        ctx.stroke();
      }

      const maxVal = Math.max(...dataRef.current.map((d) => d.value), 10);
      const getColor = (level: number) => {
        if (level <= 30) return [16, 185, 129]; // Emerald
        if (level >= 80) return [244, 63, 94]; // Rose
        return [99, 102, 241]; // Indigo
      };

      // Draw Chart
      const data = dataRef.current;
      for (let i = 0; i < data.length - 1; i++) {
        const [r, g, b] = getColor(data[i].throttle);

        const x1 = (i / (data.length - 1)) * width;
        const x2 = ((i + 1) / (data.length - 1)) * width;
        const y1 = height - (data[i].value / maxVal) * (height * 0.8);
        const y2 = height - (data[i + 1].value / maxVal) * (height * 0.8);

        // Fill
        const gradient = ctx.createLinearGradient(x1, y1, x1, height);
        gradient.addColorStop(0, `rgba(${r}, ${g}, ${b}, 0.3)`);
        gradient.addColorStop(1, `rgba(${r}, ${g}, ${b}, 0)`);

        ctx.beginPath();
        ctx.moveTo(x1, height);
        ctx.lineTo(x1, y1);
        ctx.lineTo(x2, y2);
        ctx.lineTo(x2, height);
        ctx.closePath();
        ctx.fillStyle = gradient;
        ctx.fill();

        // Stroke
        ctx.beginPath();
        ctx.moveTo(x1, y1);
        ctx.lineTo(x2, y2);
        ctx.strokeStyle = `rgb(${r}, ${g}, ${b})`;
        ctx.lineWidth = 2;
        ctx.stroke();
      }

      // Text Overlay
      ctx.font = "bold 48px Inter, sans-serif";
      ctx.fillStyle = "var(--arc-text)"; // Uses CSS variable
      ctx.textAlign = "left";
      ctx.fillText(Math.round(currentVelocity).toString(), 32, 60);

      ctx.font = "16px Inter, sans-serif";
      ctx.fillStyle = "var(--arc-muted)";
      ctx.fillText("chunks / sec", 32, 85);

      animationFrameRef.current = requestAnimationFrame(draw);
    };

    draw();

    return () => {
      clearInterval(dataInterval);
      if (animationFrameRef.current)
        cancelAnimationFrame(animationFrameRef.current);
    };
  }, []);

  const getColorHex = (level: number) => {
    if (level <= 30) return "#10b981";
    if (level >= 80) return "#f43f5e";
    return "#6366f1";
  };
  const currentColor = getColorHex(throttle);

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
            Live Velocity (GPU)
          </h2>
        </div>

        <p className="text-xs text-arc-muted font-medium mt-12">
          Lifetime Contribution:{" "}
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
