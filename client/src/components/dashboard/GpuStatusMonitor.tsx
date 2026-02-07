import { useEffect, useRef } from "react";
import { Card } from "../ui/Card";

interface GpuStatusMonitorProps {
  completedCount: number;
  throttle: number;
  currentThrottle: number;
}

export function GpuStatusMonitor({
  completedCount,
  throttle,
  currentThrottle,
}: GpuStatusMonitorProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const dataRef = useRef<number[]>(new Array(30).fill(0));
  const countRef = useRef(completedCount);
  const prevCountRef = useRef(completedCount);
  const lastUpdateRef = useRef<number>(0);
  const animationFrameRef = useRef<number>(0);

  // Update count ref without triggering re-renders
  useEffect(() => {
    countRef.current = completedCount;
  }, [completedCount]);

  // GPU-accelerated canvas rendering
  useEffect(() => {
    // Initialize on first render
    if (lastUpdateRef.current === 0) {
      lastUpdateRef.current = Date.now();
    }

    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext("2d", { alpha: true });
    if (!ctx) return;

    // Set canvas size for retina displays
    const dpr = window.devicePixelRatio || 1;
    const rect = canvas.getBoundingClientRect();
    canvas.width = rect.width * dpr;
    canvas.height = rect.height * dpr;
    ctx.scale(dpr, dpr);

    const draw = () => {
      const now = Date.now();
      const width = rect.width;
      const height = rect.height;

      // Update data every 1 second (not every frame)
      if (now - lastUpdateRef.current > 1000) {
        // Calculate actual delta since last update
        const delta = countRef.current - prevCountRef.current;
        prevCountRef.current = countRef.current;

        // Shift data and add new point
        dataRef.current.shift();
        dataRef.current.push(delta);

        lastUpdateRef.current = now;
      }

      // Clear canvas
      ctx.clearRect(0, 0, width, height);

      // Calculate current velocity (average of last 3 points)
      const recentData = dataRef.current.slice(-3);
      const currentVelocity =
        recentData.reduce((a, b) => a + b, 0) / recentData.length;

      // Draw grid lines (subtle)
      ctx.strokeStyle = "rgba(255, 255, 255, 0.05)";
      ctx.lineWidth = 1;
      for (let i = 0; i < 5; i++) {
        const y = (height / 4) * i;
        ctx.beginPath();
        ctx.moveTo(0, y);
        ctx.lineTo(width, y);
        ctx.stroke();
      }

      // Get color based on throttle
      const getColor = (level: number) => {
        if (level <= 30) return [16, 185, 129]; // Emerald
        if (level >= 80) return [244, 63, 94]; // Rose
        return [99, 102, 241]; // Indigo
      };

      const [r, g, b] = getColor(throttle);

      // Find max value for scaling
      const maxVal = Math.max(...dataRef.current, 10);

      // Draw area under the curve
      ctx.beginPath();
      ctx.moveTo(0, height);

      dataRef.current.forEach((val, i) => {
        const x = (i / (dataRef.current.length - 1)) * width;
        const y = height - (val / maxVal) * (height * 0.8);

        if (i === 0) {
          ctx.lineTo(x, y);
        } else {
          // Bezier curve for smoothness
          const prevX = ((i - 1) / (dataRef.current.length - 1)) * width;
          const prevY =
            height - (dataRef.current[i - 1] / maxVal) * (height * 0.8);
          const cpX = (prevX + x) / 2;
          ctx.quadraticCurveTo(prevX, prevY, cpX, (prevY + y) / 2);
        }
      });

      ctx.lineTo(width, height);
      ctx.closePath();

      // Gradient fill
      const gradient = ctx.createLinearGradient(0, 0, 0, height);
      gradient.addColorStop(0, `rgba(${r}, ${g}, ${b}, 0.3)`);
      gradient.addColorStop(1, `rgba(${r}, ${g}, ${b}, 0)`);
      ctx.fillStyle = gradient;
      ctx.fill();

      // Draw line
      ctx.beginPath();
      dataRef.current.forEach((val, i) => {
        const x = (i / (dataRef.current.length - 1)) * width;
        const y = height - (val / maxVal) * (height * 0.8);

        if (i === 0) {
          ctx.moveTo(x, y);
        } else {
          ctx.lineTo(x, y);
        }
      });

      ctx.strokeStyle = `rgb(${r}, ${g}, ${b})`;
      ctx.lineWidth = 2;
      ctx.stroke();

      // Draw current value text on canvas
      ctx.font = "bold 48px Inter, sans-serif";
      ctx.fillStyle = "var(--arc-text)";
      ctx.textAlign = "left";
      ctx.fillText(Math.round(currentVelocity).toString(), 32, 60);

      // Draw "chunks / sec" label
      ctx.font = "16px Inter, sans-serif";
      ctx.fillStyle = "var(--arc-muted)";
      ctx.fillText("chunks / sec", 32, 85);

      animationFrameRef.current = requestAnimationFrame(draw);
    };

    draw();

    return () => {
      if (animationFrameRef.current) {
        cancelAnimationFrame(animationFrameRef.current);
      }
    };
  }, [throttle]);

  const getColor = (level: number) => {
    if (level <= 30) return "#10b981";
    if (level >= 80) return "#f43f5e";
    return "#6366f1";
  };

  const currentColor = getColor(throttle);

  return (
    <Card
      className="md:col-span-8 h-90 flex flex-col justify-between gpu-isolated"
      noPadding
      // style={{ contain: "paint layout" } as React.CSSProperties}
    >
      <div className="p-8 pb-0 z-20">
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
            {Math.round(currentThrottle * 100)}% Throttle
          </span>
        </div>
      </div>

      <canvas
        ref={canvasRef}
        className="absolute bottom-0 left-0 right-0 h-55 w-full"
        style={{
          willChange: "transform",
          transform: "translateZ(0)",
        }}
      />
    </Card>
  );
}
