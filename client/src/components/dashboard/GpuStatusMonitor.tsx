import { useEffect, useRef } from "react";
import { Card } from "../ui/Card";

interface DataPoint {
  value: number;
  throttle: number;
  timestamp: number;
}

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
  const dataRef = useRef<DataPoint[]>([]);
  const countRef = useRef(completedCount);
  const prevCountRef = useRef(completedCount);
  const lastUpdateRef = useRef<number>(0);
  const animationFrameRef = useRef<number>(0);
  const throttleRef = useRef(throttle);

  // Keep throttle ref in sync without re-triggering canvas setup
  useEffect(() => {
    throttleRef.current = throttle;
  }, [throttle]);

  // Update count ref without triggering re-renders
  useEffect(() => {
    countRef.current = completedCount;
  }, [completedCount]);

  // GPU-accelerated canvas rendering with priority scheduling
  useEffect(() => {
    // Initialize data array once
    if (dataRef.current.length === 0) {
      dataRef.current = new Array(60).fill(null).map(() => ({ 
        value: 0, 
        throttle: 50, 
        timestamp: Date.now() 
      }));
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

    // Data update loop - runs every 200ms for smoother updates
    const dataInterval = setInterval(() => {
      const now = Date.now();
      const delta = countRef.current - prevCountRef.current;
      prevCountRef.current = countRef.current;

      // Shift data and add new point with current throttle
      dataRef.current.shift();
      dataRef.current.push({
        value: delta * 5, // Multiply by 5 to get per-second rate (200ms * 5 = 1000ms)
        throttle: throttleRef.current,
        timestamp: now,
      });

      lastUpdateRef.current = now;
    }, 200); // Update 5 times per second

    // Render loop - uses requestAnimationFrame for smooth GPU rendering
    const draw = () => {
      const width = rect.width;
      const height = rect.height;

      // Clear canvas
      ctx.clearRect(0, 0, width, height);

      // Calculate current velocity (average of last 5 points = last second)
      const recentData = dataRef.current.slice(-5);
      const currentVelocity = recentData.length > 0
        ? recentData.reduce((a, b) => a + b.value, 0) / recentData.length
        : 0;

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

      // Find max value for scaling (with minimum of 10)
      const maxVal = Math.max(...dataRef.current.map(d => d.value), 10);

      // Get color based on throttle level
      const getColor = (level: number) => {
        if (level <= 30) return [16, 185, 129]; // Emerald
        if (level >= 80) return [244, 63, 94]; // Rose
        return [99, 102, 241]; // Indigo
      };

      // Draw area under the curve with segmented colors
      const data = dataRef.current;
      
      // Draw each segment with its own color based on throttle at that point
      for (let i = 0; i < data.length - 1; i++) {
        const [r, g, b] = getColor(data[i].throttle);
        
        const x1 = (i / (data.length - 1)) * width;
        const x2 = ((i + 1) / (data.length - 1)) * width;
        const y1 = height - (data[i].value / maxVal) * (height * 0.8);
        const y2 = height - (data[i + 1].value / maxVal) * (height * 0.8);

        // Create gradient for this segment
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
      }

      // Draw line segments with individual colors
      for (let i = 0; i < data.length - 1; i++) {
        const [r, g, b] = getColor(data[i].throttle);
        
        const x1 = (i / (data.length - 1)) * width;
        const x2 = ((i + 1) / (data.length - 1)) * width;
        const y1 = height - (data[i].value / maxVal) * (height * 0.8);
        const y2 = height - (data[i + 1].value / maxVal) * (height * 0.8);

        ctx.beginPath();
        ctx.moveTo(x1, y1);
        ctx.lineTo(x2, y2);
        ctx.strokeStyle = `rgb(${r}, ${g}, ${b})`;
        ctx.lineWidth = 2;
        ctx.stroke();
      }

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
      clearInterval(dataInterval);
      if (animationFrameRef.current) {
        cancelAnimationFrame(animationFrameRef.current);
      }
    };
  }, []); // Empty deps - setup once

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
