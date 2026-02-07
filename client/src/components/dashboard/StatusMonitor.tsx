import { Card } from "../ui/Card";
import { AreaChart, Area, ResponsiveContainer, YAxis, Tooltip } from "recharts";

interface StatusMonitorProps {
  completedCount: number;
  chartData: { val: number; throttle: number }[];
  throttle: number;
  currentThrottle: number;
}

export function StatusMonitor({
  completedCount,
  chartData,
  throttle,
  currentThrottle,
}: StatusMonitorProps) {
  const currentVelocity =
    chartData.length > 0 ? chartData[chartData.length - 1].val : 0;

  // Helper to get color string from throttle value
  const getColor = (level: number) => {
    if (level <= 30) return "#10b981"; // Emerald
    if (level >= 80) return "#f43f5e"; // Rose
    return "#6366f1"; // Indigo
  };

  const currentColor = getColor(throttle);

  return (
    <Card
      className="md:col-span-8 h-90 flex flex-col justify-between"
      noPadding
    >
      <div className="p-8 pb-0 z-20">
        {/* Header Section (Keep your existing header code) */}
        <div className="flex items-center gap-3 mb-2">
          <div
            className="w-2 h-2 rounded-full animate-pulse transition-colors duration-500"
            style={{ backgroundColor: currentColor }}
          />
          <h2 className="text-xs font-bold tracking-widest text-arc-muted uppercase">
            Live Velocity
          </h2>
        </div>

        <div className="flex items-baseline gap-2 mb-1">
          <span className="text-7xl font-medium tracking-tighter text-arc-text transition-all duration-300">
            {currentVelocity}
          </span>
          <span className="text-lg text-arc-muted font-normal">
            chunks / sec
          </span>
        </div>

        <p className="text-xs text-arc-muted font-medium">
          Lifetime Contribution:{" "}
          <span className="font-mono text-arc-text opacity-80">
            {completedCount.toLocaleString()}
          </span>{" "}
          chunks
        </p>

        {/* Dynamic Badge */}
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

      <div className="absolute bottom-0 left-0 right-0 h-55 w-full">
        <ResponsiveContainer width="100%" height="100%">
          <AreaChart data={chartData}>
            <defs>
              {/* 1. GRADIENT FOR THE LINE (STROKE) */}
              {/* This maps the color of every segment to the throttle value at that time */}
              <linearGradient id="strokeGradient" x1="0" y1="0" x2="1" y2="0">
                {chartData.map((entry, index) => (
                  <stop
                    key={index}
                    offset={`${(index / (chartData.length - 1 || 1)) * 100}%`}
                    stopColor={getColor(entry.throttle)}
                  />
                ))}
              </linearGradient>

              {/* 2. GRADIENT FOR THE FILL (FADE OUT) */}
              <linearGradient id="fillGradient" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor={currentColor} stopOpacity={0.4} />
                <stop offset="100%" stopColor={currentColor} stopOpacity={0} />
              </linearGradient>
            </defs>

            <YAxis
              width={0}
              domain={[0, (max: number) => Math.max(max, 10)]}
              hide
            />

            <Tooltip
              contentStyle={{
                backgroundColor: "var(--arc-card)",
                borderColor: "var(--arc-border)",
                borderRadius: "12px",
                fontSize: "12px",
              }}
              formatter={(value: any) => [`${value} cps`, "Speed"]}
              labelStyle={{ display: "none" }}
            />

            <Area
              type="monotone"
              dataKey="val"
              stroke="url(#strokeGradient)" /* USE THE DYNAMIC STROKE */
              strokeWidth={3}
              fill="url(#fillGradient)" /* USE THE STANDARD FILL */
              isAnimationActive={
                false
              } /* Disable animation for smoother real-time updates */
            />
          </AreaChart>
        </ResponsiveContainer>
      </div>
    </Card>
  );
}
