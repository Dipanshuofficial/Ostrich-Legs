This file is a merged representation of a subset of the codebase, containing specifically included files and files not matching ignore patterns, combined into a single document by Repomix.

# File Summary

## Purpose
This file contains a packed representation of a subset of the repository's contents that is considered the most important context.
It is designed to be easily consumable by AI systems for analysis, code review,
or other automated processes.

## File Format
The content is organized as follows:
1. This summary section
2. Repository information
3. Directory structure
4. Repository files (if enabled)
5. Multiple file entries, each consisting of:
  a. A header with the file path (## File: path/to/file)
  b. The full contents of the file in a code block

## Usage Guidelines
- This file should be treated as read-only. Any changes should be made to the
  original repository files, not this packed version.
- When processing this file, use the file path to distinguish
  between different files in the repository.
- Be aware that this file may contain sensitive information. Handle it with
  the same level of security as you would the original repository.

## Notes
- Some files may have been excluded based on .gitignore rules and Repomix's configuration
- Binary files are not included in this packed representation. Please refer to the Repository Structure section for a complete list of file paths, including binary files
- Only files matching these patterns are included: client/src/**/*, server/src/**/*, shared/**/*, package.json, tsconfig.json
- Files matching these patterns are excluded: **/.git/**, **/node_modules/**, **/dist/**, **/.next/**, **/*.lock, **/*.png, **/*.jpg, **/*.jpeg, **/*.svg, **/*.ico, **/*.map, **/*.test.ts, **/__tests__/**
- Files matching patterns in .gitignore are excluded
- Files matching default ignore patterns are excluded
- Files are sorted by Git change count (files with more changes are at the bottom)

# Directory Structure
```
client/src/App.css
client/src/App.tsx
client/src/components/dashboard/DeviceConnector.tsx
client/src/components/dashboard/DeviceHealth.tsx
client/src/components/dashboard/GpuStatusMonitor.tsx
client/src/components/dashboard/LiveTerminal.tsx
client/src/components/dashboard/StatusMonitor.tsx
client/src/components/dashboard/SwarmControls.tsx
client/src/components/dashboard/SwarmDashboard.tsx
client/src/components/dashboard/ThrottleControl.tsx
client/src/components/ui/Badge.tsx
client/src/components/ui/Card.tsx
client/src/components/ui/ThemeToggle.tsx
client/src/hooks/useComputeSwarm.ts
client/src/hooks/usePersistentIdentity.ts
client/src/index.css
client/src/main.tsx
client/src/utils/worker.ts
server/src/index.ts
server/src/JobQueue.ts
server/src/swarm/DeviceRegistry.ts
server/src/swarm/index.ts
server/src/swarm/JoinCodeManager.ts
server/src/swarm/SwarmCoordinator.ts
server/src/swarm/WorkStealingScheduler.ts
shared/types.ts
```

# Files

## File: client/src/components/dashboard/SwarmControls.tsx
```typescript
import { Play, Pause, Square, Power } from "lucide-react";
import { Card } from "../ui/Card";

interface SwarmControlsProps {
  isRunning: boolean;
  status: string;
  onStart: () => void;
  onPause: () => void;
  onStop: () => void;
}

export function SwarmControls({
  isRunning,
  status,
  onStart,
  onPause,
  onStop,
}: SwarmControlsProps) {
  return (
    <Card
      className="w-24 h-full flex flex-col justify-between relative overflow-hidden shrink-0"
      noPadding
    >
      <div
        className={`absolute inset-0 transition-opacity duration-1000 opacity-20 pointer-events-none
          ${status === "WORKING" ? "bg-emerald-500/10" : ""}
          ${status === "PAUSED" ? "bg-amber-500/10" : ""}
          ${status === "STOPPED" ? "bg-rose-500/5" : ""}
        `}
      />

      <div className="relative z-10 flex flex-col h-full p-2">
        {/* Status Indicator */}
        <div className="flex justify-center pt-2 mb-4">
          <div
            className={`p-2 rounded-full border transition-all duration-500 shadow-lg ${
              status === "WORKING"
                ? "bg-emerald-500/10 border-emerald-500/50 text-emerald-500 shadow-emerald-500/20"
                : "bg-arc-bg border-arc-border text-arc-muted"
            }`}
          >
            <Power size={18} />
          </div>
        </div>

        {/* Controls */}
        <div className="flex-1 flex flex-col justify-end gap-2">
          {/* START */}
          <button
            onClick={onStart}
            disabled={isRunning}
            className={`
              group flex flex-col items-center justify-center py-3 rounded-xl border transition-all duration-200 active:scale-95
              ${
                isRunning
                  ? "bg-emerald-500/20 border-emerald-500/50 text-emerald-400 shadow-[inset_0_2px_4px_rgba(0,0,0,0.1)]"
                  : "bg-arc-bg border-arc-border hover:border-emerald-500/50 hover:text-emerald-500"
              }
            `}
          >
            <Play
              size={18}
              className={isRunning ? "fill-emerald-400" : "fill-current"}
            />
            <span className="text-[9px] font-bold tracking-widest mt-1">
              RUN
            </span>
          </button>

          {/* PAUSE */}
          <button
            onClick={onPause}
            disabled={!isRunning}
            className={`
              group flex flex-col items-center justify-center py-3 rounded-xl border transition-all duration-200 active:scale-95
              ${
                status === "PAUSED"
                  ? "bg-amber-500/20 border-amber-500/50 text-amber-400 shadow-[inset_0_2px_4px_rgba(0,0,0,0.1)]"
                  : !isRunning
                    ? "opacity-50 cursor-not-allowed border-arc-border"
                    : "bg-arc-bg border-arc-border hover:border-amber-500/50 hover:text-amber-500"
              }
            `}
          >
            <Pause
              size={18}
              className={
                status === "PAUSED" ? "fill-amber-400" : "fill-current"
              }
            />
            <span className="text-[9px] font-bold tracking-widest mt-1">
              PAUSE
            </span>
          </button>

          {/* STOP */}
          <button
            onClick={onStop}
            className="group flex flex-col items-center justify-center py-3 rounded-xl border border-arc-border bg-arc-bg hover:border-rose-500/50 hover:bg-rose-500/10 hover:text-rose-500 transition-all duration-200 active:scale-95 active:bg-rose-500/20"
          >
            <Square size={18} className="fill-current" />
            <span className="text-[9px] font-bold tracking-widest mt-1">
              END
            </span>
          </button>
        </div>
      </div>
    </Card>
  );
}
```

## File: client/src/App.css
```css
@import "tailwindcss";
@import "tailwindcss";
@import "tailwindcss";

/* 1. DEFINE YOUR THEME (The "DNA") 🧬 */
@theme {
  --color-arc-bg: var(--arc-bg);
  --color-arc-card: var(--arc-card);
  --color-arc-border: var(--arc-border);
  --color-arc-text: var(--arc-text);
  --color-arc-muted: var(--arc-muted);

  --animate-gradient-x: gradient-x 15s ease infinite;

  @keyframes gradient-x {
    0%,
    100% {
      background-size: 200% 200%;
      background-position: left center;
    }
    50% {
      background-size: 200% 200%;
      background-position: right center;
    }
  }
}

/* 2. BASE VARIABLES (The "Fuel") ⛽ */
:root {
  --arc-bg: #f0f2f5;
  --arc-card: #ffffff;
  --arc-border: rgba(0, 0, 0, 0.06);
  --arc-text: #1a1a1a;
  --arc-muted: #8e8e93;
  --grain-opacity: 0.03;
}

.dark {
  --arc-bg: #09090b;
  --arc-card: rgba(255, 255, 255, 0.03);
  --arc-border: rgba(255, 255, 255, 0.08);
  --arc-text: #ececec;
  --arc-muted: #71717a;
  --grain-opacity: 0.04;
}

/* 3. CUSTOM COMPONENTS (The "Body") 🏎️ */
@layer components {
  body {
    @apply bg-arc-bg text-arc-text transition-colors duration-500;
    font-family: "Inter", sans-serif;
  }

  .arc-card {
    @apply bg-arc-card border border-arc-border backdrop-blur-xl rounded-3xl transition-all duration-400 ease-[cubic-bezier(0.2,0.8,0.2,1)];
  }

  /* Shadow logic for Light Mode */
  :not(.dark) .arc-card {
    box-shadow: 0 10px 30px -10px rgba(0, 0, 0, 0.05);
  }

  .dark .arc-card:hover {
    background: rgba(255, 255, 255, 0.06);
    border-color: rgba(255, 255, 255, 0.15);
  }
}

/* 4. UTILITIES (The "Gadgets") 🔧 */
@layer utilities {
  .bg-grain::before {
    content: "";
    @apply absolute inset-0 pointer-events-none z-0 mix-blend-overlay;
    background-image: url("https://upload.wikimedia.org/wikipedia/commons/7/76/Noise.png");
    opacity: var(--grain-opacity);
  }
}
```

## File: client/src/components/dashboard/DeviceHealth.tsx
```typescript
import { Cpu, RotateCw } from "lucide-react";
import { Card } from "../ui/Card";
import { Badge } from "../ui/Badge";
import { useComputeSwarm } from "../../hooks/useComputeSwarm";

// Add className prop to allow parent to control dimensions
export function DeviceHealth({
  status,
  opsScore,
  workerId,
  className = "",
}: {
  status: string;
  opsScore: number;
  workerId: string;
  className?: string;
}) {
  const { runBenchmark } = useComputeSwarm();

  return (
    // Changed: Removed "h-75" and "md:col-span-4". Added {className}.
    <Card className={`flex flex-col justify-between ${className}`}>
      <div>
        <div className="flex justify-between items-start mb-4">
          <div className="p-2 bg-arc-bg rounded-xl border border-arc-border">
            <Cpu size={20} className="text-indigo-500" />
          </div>
          <Badge active={status === "WORKING"} text={status} />
        </div>
        <h3 className="text-base font-medium text-arc-text">Device Health</h3>
        <p className="text-xs text-arc-muted mt-0.5">Allocation & Benchmarks</p>
      </div>

      <div className="space-y-2 mt-2">
        {/* BENCHMARK ROW */}
        <div className="p-3 rounded-2xl bg-arc-bg border border-arc-border flex justify-between items-center group">
          <div className="flex flex-col">
            <span className="text-[10px] text-arc-muted font-bold tracking-wider mb-0.5">
              BENCHMARK
            </span>
            <span className="text-base font-mono text-indigo-500 font-bold">
              {opsScore > 0 ? opsScore.toLocaleString() : "---"}
              <span className="text-[10px] text-arc-muted font-normal ml-1">
                OPS
              </span>
            </span>
          </div>

          <button
            onClick={runBenchmark}
            className={`p-2 rounded-full hover:bg-indigo-500/10 transition-colors ${opsScore === 0 ? "animate-pulse text-indigo-500" : "text-arc-muted opacity-0 group-hover:opacity-100"}`}
            title="Re-run Benchmark"
          >
            <RotateCw size={14} />
          </button>
        </div>

        <div className="p-3 rounded-2xl bg-arc-bg border border-arc-border flex justify-between items-center">
          <span className="text-[10px] text-arc-muted font-bold tracking-wider">
            ID
          </span>
          <span className="text-[10px] font-mono text-arc-muted truncate max-w-20">
            {workerId || "Connecting..."}
          </span>
        </div>
      </div>
    </Card>
  );
}
```

## File: client/src/components/dashboard/LiveTerminal.tsx
```typescript
import { useEffect, useRef } from "react";
import { Terminal } from "lucide-react";
import { Card } from "../ui/Card";

export function LiveTerminal({ logs, status }: any) {
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    scrollRef.current?.scrollTo({
      top: scrollRef.current.scrollHeight,
      behavior: "smooth",
    });
  }, [logs]);

  // Helper to colorize logs based on content
  const getColor = (text: string) => {
    if (text.includes("[Err]")) return "text-red-400";
    if (text.includes("Matrix")) return "text-indigo-400";
    if (text.includes("Stress")) return "text-orange-400";
    if (text.includes("Succ")) return "text-emerald-400";
    return "text-zinc-400";
  };

  return (
    <Card className="md:col-span-6 h-60 bg-zinc-950 text-zinc-300 font-mono text-[10px] overflow-hidden flex flex-col border-zinc-800 shadow-inner">
      <div className="flex items-center gap-2 p-3 border-b border-white/5 bg-white/5">
        <Terminal size={12} className="text-zinc-500" />
        <span className="text-zinc-500 uppercase tracking-wider font-bold">
          Kernel Output
        </span>
      </div>

      <div
        ref={scrollRef}
        className="flex-1 overflow-y-auto p-3 space-y-1 font-mono leading-tight"
      >
        <p className="text-emerald-500/50">-- SYSTEM READY --</p>

        {logs.map((log: string, i: number) => (
          <p key={i} className={`${getColor(log)} break-all`}>
            {log}
          </p>
        ))}

        {status === "IDLE" && (
          <div className="flex items-center gap-2 mt-2 opacity-50">
            <span className="w-1.5 h-1.5 bg-zinc-500 rounded-full animate-pulse" />
            <span className="text-zinc-600">Awaiting dispatch...</span>
          </div>
        )}
      </div>
    </Card>
  );
}
```

## File: client/src/components/dashboard/StatusMonitor.tsx
```typescript
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
```

## File: client/src/components/dashboard/ThrottleControl.tsx
```typescript
import { Card } from "../ui/Card";
import { Zap, Cpu } from "lucide-react";

interface ThrottleControlProps {
  throttle: number;
  setThrottle: (val: number) => void;
  updateThrottle: (val: number) => void;
  activeThreads: number; // <--- NEW PROP
}

export function ThrottleControl({
  throttle,
  setThrottle,
  updateThrottle,
  activeThreads,
}: ThrottleControlProps) {
  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = parseInt(e.target.value);
    setThrottle(val);
    updateThrottle(val / 100);
  };

  return (
    <Card className="md:col-span-6 h-60 flex flex-col justify-center relative overflow-hidden">
      {/* Background feedback: Glow gets more intense with throttle */}
      <div
        className="absolute right-0 top-0 w-32 h-32 bg-indigo-500/20 blur-[80px] transition-opacity duration-500 pointer-events-none"
        style={{ opacity: throttle / 100 }}
      />

      <div className="flex justify-between items-start mb-8 relative z-10">
        <div>
          <h3 className="text-lg font-medium text-arc-text">Resources</h3>
          <p className="text-sm text-arc-muted">CPU Allocation Limit</p>
        </div>

        {/* PHYSICAL FEEDBACK INDICATOR */}
        <div className="flex flex-col items-end gap-1">
          <div className="bg-arc-bg px-4 py-2 rounded-full border border-arc-border flex items-center gap-2">
            <span className="text-xl font-bold text-arc-text">{throttle}%</span>
          </div>
          <div className="flex items-center gap-1.5 px-2">
            <Cpu
              size={10}
              className={
                activeThreads > 1 ? "text-emerald-500" : "text-arc-muted"
              }
            />
            <span className="text-[10px] font-mono text-arc-muted uppercase tracking-wider">
              {activeThreads} Cores Active
            </span>
          </div>
        </div>
      </div>

      {/* SLIDER (Keep existing code) */}
      <div className="relative w-full h-12 flex items-center z-10">
        <div className="absolute w-full h-4 bg-arc-bg rounded-full overflow-hidden border border-arc-border">
          <div
            className="h-full bg-linear-to-r from-indigo-400 to-indigo-600 transition-all duration-200"
            style={{ width: `${throttle}%` }}
          />
        </div>
        <input
          type="range"
          min="10"
          max="90"
          step="10"
          value={throttle}
          onChange={handleChange}
          className="absolute w-full h-full opacity-0 cursor-pointer"
        />
        <div
          className="absolute h-8 w-8 bg-white dark:bg-zinc-800 rounded-full border border-black/10 dark:border-white/10 shadow-lg pointer-events-none transition-all duration-200 flex items-center justify-center"
          style={{ left: `calc(${throttle}% - 16px)` }}
        >
          <Zap
            size={14}
            className={`fill-indigo-500 transition-colors ${throttle > 50 ? "text-indigo-500" : "text-zinc-400"}`}
          />
        </div>
      </div>

      <div className="flex justify-between mt-6 text-xs font-medium text-arc-muted px-1 z-10">
        <span>Quiet (1 Core)</span>
        <span>Standard</span>
        <span>Rocket (Max)</span>
      </div>
    </Card>
  );
}
```

## File: client/src/components/ui/Badge.tsx
```typescript
interface BadgeProps {
  active: boolean;
  text: string;
}

export function Badge({ active, text }: BadgeProps) {
  return (
    <span
      className={`px-3 py-1 rounded-full text-[10px] font-bold tracking-widest uppercase transition-colors duration-500 ${
        active
          ? "bg-emerald-500/20 text-emerald-400 border border-emerald-500/30"
          : "bg-white/5 text-slate-500 border border-white/5"
      }`}
    >
      {text}
    </span>
  );
}
```

## File: client/src/components/ui/Card.tsx
```typescript
import { type ReactNode } from "react";
import { twMerge } from "tailwind-merge";

export function Card({
  children,
  className,
  noPadding = false,
}: {
  children: ReactNode;
  className?: string;
  noPadding?: boolean;
}) {
  return (
    <div
      className={twMerge(
        "arc-card relative overflow-hidden group",
        noPadding ? "" : "p-8",
        className,
      )}
    >
      {/* Subtle Inner Glow on Hover */}
      <div className="absolute inset-0 bg-linear-to-tr from-white/0 via-white/0 to-white/5 opacity-0 group-hover:opacity-100 transition-opacity duration-700 pointer-events-none" />
      <div className="relative z-10 h-full">{children}</div>
    </div>
  );
}
```

## File: client/src/components/ui/ThemeToggle.tsx
```typescript
import { Sun, Moon } from "lucide-react";
import { useEffect, useState } from "react";

export function ThemeToggle() {
  // 1. Initialize from LocalStorage or System Preference 🧠
  const [isDark, setIsDark] = useState(() => {
    if (typeof window !== "undefined") {
      const saved = localStorage.getItem("theme");
      if (saved) return saved === "dark";
      return window.matchMedia("(prefers-color-scheme: dark)").matches;
    }
    return true;
  });

  useEffect(() => {
    const root = window.document.documentElement;
    if (isDark) {
      root.classList.add("dark");
      localStorage.setItem("theme", "dark");
    } else {
      root.classList.remove("dark");
      localStorage.setItem("theme", "light");
    }
  }, [isDark]);

  return (
    <button
      onClick={() => setIsDark(!isDark)}
      className="p-2 rounded-full bg-arc-card border border-arc-border text-arc-text hover:scale-110 active:scale-95 transition-all"
      aria-label="Toggle Theme"
    >
      {isDark ? <Moon size={18} /> : <Sun size={18} />}
    </button>
  );
}
```

## File: client/src/hooks/usePersistentIdentity.ts
```typescript
import { useState } from "react";

// Helper to guess device name from User Agent
function getFriendlyDeviceName() {
  const ua = navigator.userAgent;
  let os = "Node";

  if (ua.includes("Mac")) os = "Mac";
  if (ua.includes("Win")) os = "Windows";
  if (ua.includes("Linux")) os = "Linux";
  if (ua.includes("Android")) os = "Android";
  if (ua.includes("iPhone") || ua.includes("iPad")) os = "iOS";

  let browser = "Web";
  if (ua.includes("Chrome")) browser = "Chrome";
  if (ua.includes("Firefox")) browser = "Firefox";
  if (ua.includes("Safari") && !ua.includes("Chrome")) browser = "Safari";
  if (ua.includes("Edg")) browser = "Edge";

  return `${os} (${browser})`;
}

export const usePersistentIdentity = () => {
  // Initialize Synchronously from LocalStorage
  const [identity] = useState<{ id: string; name: string }>(() => {
    // 1. Try to get existing
    let storedId = localStorage.getItem("ostrich_worker_id");
    let storedName = localStorage.getItem("ostrich_device_name");

    // 2. Create if missing
    if (!storedId) {
      storedId = crypto.randomUUID();
      localStorage.setItem("ostrich_worker_id", storedId);
    }

    // 3. Fix name if missing or old format
    const isOldName = storedName?.startsWith("Node-");
    if (!storedName || isOldName) {
      const friendlyName = getFriendlyDeviceName();
      const shortHash = storedId.slice(0, 4).toUpperCase();
      storedName = `${friendlyName} - ${shortHash}`;
      localStorage.setItem("ostrich_device_name", storedName);
    }

    return { id: storedId, name: storedName! };
  });

  return identity;
};
```

## File: client/src/index.css
```css
@import "tailwindcss";
:root {
  --arc-bg: #0f0f11;
  --arc-card: rgba(255, 255, 255, 0.03);
  --arc-border: rgba(255, 255, 255, 0.08);
  --grain-url: url("https://upload.wikimedia.org/wikipedia/commons/7/76/Noise.png"); /* Standard noise texture */
}

body {
  background-color: var(--arc-bg);
  color: #ececec;
  font-family:
    "Inter",
    -apple-system,
    sans-serif;
  overflow-x: hidden;
}

/* THE ARC "GRAIN" EFFECT */
.bg-grain {
  position: relative;
}
.bg-grain::before {
  content: "";
  position: absolute;
  inset: 0;
  background-image: var(--grain-url);
  opacity: 0.04;
  pointer-events: none;
  z-index: 0;
  mix-blend-mode: overlay;
}

/* AURORA GRADIENTS */
.aurora-gradient {
  background:
    radial-gradient(
      circle at 0% 0%,
      rgba(255, 180, 180, 0.15),
      transparent 40%
    ),
    radial-gradient(
      circle at 100% 0%,
      rgba(180, 200, 255, 0.15),
      transparent 40%
    ),
    radial-gradient(
      circle at 100% 100%,
      rgba(180, 255, 200, 0.1),
      transparent 40%
    );
  filter: blur(60px);
  position: absolute;
  inset: 0;
  z-index: -1;
}

/* SQUIRCLE CARDS (Arc Style) */
.arc-card {
  background: var(--arc-card);
  border: 1px solid var(--arc-border);
  backdrop-filter: blur(20px);
  border-radius: 24px; /* Soft rounding */
  transition: all 0.4s cubic-bezier(0.2, 0.8, 0.2, 1);
}

.arc-card:hover {
  background: rgba(255, 255, 255, 0.06);
  border-color: rgba(255, 255, 255, 0.15);
  transform: translateY(-2px);
  box-shadow: 0 20px 40px -10px rgba(0, 0, 0, 0.3);
}

/* SCROLLBAR HIDE */
.scrollbar-hide::-webkit-scrollbar {
  display: none;
}

@import "tailwindcss";

/* 1. DEFINE YOUR THEME (The "DNA") 🧬 */
@theme {
  --color-arc-bg: var(--arc-bg);
  --color-arc-card: var(--arc-card);
  --color-arc-border: var(--arc-border);
  --color-arc-text: var(--arc-text);
  --color-arc-muted: var(--arc-muted);

  --animate-gradient-x: gradient-x 15s ease infinite;

  @keyframes gradient-x {
    0%,
    100% {
      background-size: 200% 200%;
      background-position: left center;
    }
    50% {
      background-size: 200% 200%;
      background-position: right center;
    }
  }
}

/* 2. BASE VARIABLES (The "Fuel") ⛽ */
:root {
  --arc-bg: #f0f2f5;
  --arc-card: #ffffff;
  --arc-border: rgba(0, 0, 0, 0.06);
  --arc-text: #1a1a1a;
  --arc-muted: #8e8e93;
  --grain-opacity: 0.03;
}

.dark {
  --arc-bg: #09090b;
  --arc-card: rgba(255, 255, 255, 0.03);
  --arc-border: rgba(255, 255, 255, 0.08);
  --arc-text: #ececec;
  --arc-muted: #71717a;
  --grain-opacity: 0.04;
}

/* 3. CUSTOM COMPONENTS (The "Body") 🏎️ */
@layer components {
  body {
    @apply bg-arc-bg text-arc-text transition-colors duration-500;
    font-family: "Inter", sans-serif;
  }

  .arc-card {
    @apply bg-arc-card border border-arc-border backdrop-blur-xl rounded-3xl transition-all duration-400 ease-[cubic-bezier(0.2,0.8,0.2,1)];
  }

  /* Shadow logic for Light Mode */
  :not(.dark) .arc-card {
    box-shadow: 0 10px 30px -10px rgba(0, 0, 0, 0.05);
  }

  .dark .arc-card:hover {
    background: rgba(255, 255, 255, 0.06);
    border-color: rgba(255, 255, 255, 0.15);
  }
}

/* 4. UTILITIES (The "Gadgets") 🔧 */
@layer utilities {
  .bg-grain::before {
    content: "";
    @apply absolute inset-0 pointer-events-none z-0 mix-blend-overlay;
    background-image: url("https://upload.wikimedia.org/wikipedia/commons/7/76/Noise.png");
    opacity: var(--grain-opacity);
  }
}
```

## File: client/src/main.tsx
```typescript
import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import App from './App.tsx'

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
)
```

## File: server/src/swarm/index.ts
```typescript
export { SwarmCoordinator } from "./SwarmCoordinator";
export { DeviceRegistry } from "./DeviceRegistry";
export { WorkStealingScheduler } from "./WorkStealingScheduler";
export { JoinCodeManager } from "./JoinCodeManager";
```

## File: client/src/components/dashboard/DeviceConnector.tsx
```typescript
import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { QRCodeSVG } from "qrcode.react";
import {
  X,
  QrCode,
  Copy,
  Check,
  Smartphone,
  Laptop,
  Server,
} from "lucide-react";
import type { DeviceType } from "../../../../shared/types";

interface DeviceConnectorProps {
  isOpen: boolean;
  onClose: () => void;
  joinCode: string;
  serverUrl: string;
  onJoinCodeChange?: (code: string) => void;
}

export function DeviceConnector({
  isOpen,
  onClose,
  joinCode,
  serverUrl,
  onJoinCodeChange,
}: DeviceConnectorProps) {
  // --- 1. State Management ---
  const [activeTab, setActiveTab] = useState<"qr" | "code" | "link">("qr");
  const [copied, setCopied] = useState(false);
  const [customCode, setCustomCode] = useState("");

  const fullJoinUrl = `${serverUrl}/join/${joinCode}`;

  const deviceTypes: Array<{
    type: DeviceType;
    icon: any;
    label: string;
    color: string;
  }> = [
    { type: "MOBILE", icon: Smartphone, label: "Mobile", color: "#10b981" },
    { type: "DESKTOP", icon: Laptop, label: "Desktop", color: "#6366f1" },
    { type: "COLAB", icon: Server, label: "Colab/Cloud", color: "#f43f5e" },
  ];

  // --- 2. Logic Helpers ---
  const copyToClipboard = async (text: string) => {
    try {
      await navigator.clipboard.writeText(text);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch (err) {
      console.error("Failed to copy:", err);
    }
  };

  // --- 3. The "Security Guard" (Escape Key Listener) ---
  useEffect(() => {
    if (!isOpen) return;
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") onClose();
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [isOpen, onClose]);

  // --- 4. Render ---
  return (
    <AnimatePresence>
      {isOpen && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4"
        >
          {/* Main Card */}
          <motion.div
            initial={{ scale: 0.95, y: 10 }}
            animate={{ scale: 1, y: 0 }}
            exit={{ scale: 0.95, y: 10 }}
            // Using your custom CSS class 'arc-card' and theme variables
            className="arc-card w-full max-w-md shadow-2xl relative overflow-hidden flex flex-col"
          >
            {/* Close Button */}
            <button
              onClick={onClose}
              className="absolute top-4 right-4 text-arc-muted hover:text-arc-text transition-colors z-10"
            >
              <X size={20} />
            </button>

            <div className="p-6">
              {/* Header */}
              <div className="flex items-center gap-3 mb-6">
                <div className="w-10 h-10 rounded-xl bg-indigo-500/10 flex items-center justify-center border border-indigo-500/20">
                  <QrCode className="text-indigo-400" size={20} />
                </div>
                <div>
                  <h3 className="text-lg font-bold text-arc-text">
                    Connect Devices
                  </h3>
                  <p className="text-sm text-arc-muted">
                    Add mobile, laptop, or cloud resources
                  </p>
                </div>
              </div>

              {/* Custom Tabs */}
              <div className="flex p-1 gap-1 bg-arc-bg/50 rounded-xl mb-6 border border-arc-border">
                {[
                  { id: "qr", label: "QR Code" },
                  { id: "code", label: "Join Code" },
                  { id: "link", label: "Direct Link" },
                ].map((tab) => (
                  <button
                    key={tab.id}
                    onClick={() => setActiveTab(tab.id as any)}
                    className={`flex-1 py-2 px-3 rounded-lg text-sm font-medium transition-all ${
                      activeTab === tab.id
                        ? "bg-indigo-600 text-white shadow-lg"
                        : "text-arc-muted hover:text-arc-text hover:bg-white/5"
                    }`}
                  >
                    {tab.label}
                  </button>
                ))}
              </div>

              {/* --- TAB CONTENT: QR Code --- */}
              {activeTab === "qr" && (
                <motion.div
                  initial={{ opacity: 0, y: 5 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="flex flex-col items-center gap-4 py-2"
                >
                  <div className="p-4 bg-white rounded-2xl shadow-inner">
                    <QRCodeSVG
                      value={fullJoinUrl}
                      size={180}
                      level="H"
                      includeMargin={false}
                    />
                  </div>
                  <p className="text-xs text-arc-muted text-center max-w-50">
                    Scan with your mobile camera or any QR scanner app
                  </p>
                </motion.div>
              )}

              {/* --- TAB CONTENT: Join Code --- */}
              {activeTab === "code" && (
                <motion.div
                  initial={{ opacity: 0, y: 5 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="space-y-4"
                >
                  <div className="relative group">
                    <div className="flex items-center justify-center py-8 bg-arc-bg/30 rounded-2xl border border-arc-border group-hover:border-arc-text/20 transition-colors">
                      <span className="text-5xl font-mono font-bold tracking-widest text-arc-text drop-shadow-sm">
                        {joinCode}
                      </span>
                    </div>
                    <button
                      onClick={() => copyToClipboard(joinCode)}
                      className="absolute right-3 top-3 p-2 rounded-lg bg-arc-bg hover:bg-arc-border border border-arc-border transition-all text-arc-muted hover:text-arc-text"
                    >
                      {copied ? (
                        <Check size={16} className="text-emerald-400" />
                      ) : (
                        <Copy size={16} />
                      )}
                    </button>
                  </div>

                  <div className="space-y-2 pt-2">
                    <p className="text-xs text-arc-muted uppercase font-bold tracking-wider">
                      Or enter custom code
                    </p>
                    <div className="flex gap-2">
                      <input
                        type="text"
                        value={customCode}
                        onChange={(e) =>
                          setCustomCode(e.target.value.toUpperCase())
                        }
                        placeholder="ENTER CODE"
                        className="flex-1 px-4 py-3 bg-arc-bg/50 border border-arc-border rounded-xl text-arc-text uppercase tracking-wider font-mono text-sm focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 outline-none transition-all placeholder:text-arc-muted/50"
                        maxLength={6}
                      />
                      <button
                        onClick={() => onJoinCodeChange?.(customCode)}
                        disabled={customCode.length !== 6}
                        className="px-6 py-2 bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl text-sm font-bold disabled:opacity-50 disabled:cursor-not-allowed transition-all shadow-lg shadow-indigo-500/20"
                      >
                        Connect
                      </button>
                    </div>
                  </div>
                </motion.div>
              )}

              {/* --- TAB CONTENT: Direct Link --- */}
              {activeTab === "link" && (
                <motion.div
                  initial={{ opacity: 0, y: 5 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="space-y-5"
                >
                  <div className="p-4 bg-arc-bg/30 rounded-xl border border-arc-border">
                    <p className="text-xs text-arc-muted mb-2 font-medium">
                      Share this link
                    </p>
                    <div className="flex items-center gap-3">
                      <code className="flex-1 text-xs text-indigo-300 truncate font-mono bg-indigo-500/10 px-2 py-1 rounded">
                        {fullJoinUrl}
                      </code>
                      <button
                        onClick={() => copyToClipboard(fullJoinUrl)}
                        className="p-2 rounded-lg hover:bg-arc-bg text-arc-muted hover:text-arc-text transition-colors"
                      >
                        {copied ? (
                          <Check size={16} className="text-emerald-400" />
                        ) : (
                          <Copy size={16} />
                        )}
                      </button>
                    </div>
                  </div>

                  <div className="space-y-3">
                    <p className="text-xs text-arc-muted uppercase font-bold tracking-wider">
                      Connect specific device
                    </p>
                    <div className="grid grid-cols-3 gap-3">
                      {deviceTypes.map(({ type, icon: Icon, label, color }) => (
                        <button
                          key={type}
                          onClick={() =>
                            copyToClipboard(`${fullJoinUrl}?type=${type}`)
                          }
                          className="flex flex-col items-center gap-3 p-4 rounded-xl bg-arc-bg/30 border border-arc-border hover:border-indigo-500/50 hover:bg-arc-bg/50 transition-all group"
                        >
                          <Icon
                            size={24}
                            style={{ color }}
                            className="group-hover:scale-110 transition-transform drop-shadow-md"
                          />
                          <span className="text-[10px] font-medium text-arc-muted group-hover:text-arc-text">
                            {label}
                          </span>
                        </button>
                      ))}
                    </div>
                  </div>
                </motion.div>
              )}

              {/* Footer */}
              <div className="mt-6 pt-6 border-t border-arc-border">
                <p className="text-xs text-arc-muted text-center">
                  Devices will appear in the swarm instantly once connected.
                </p>
              </div>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
```

## File: client/src/components/dashboard/GpuStatusMonitor.tsx
```typescript
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
```

## File: client/src/components/dashboard/SwarmDashboard.tsx
```typescript
import { Card } from "../ui/Card";
import {
  Smartphone,
  Laptop,
  Server,
  Cpu,
  Activity,
  Zap,
  Wifi,
  WifiOff,
  AlertCircle,
} from "lucide-react";
import type {
  DeviceInfo,
  DeviceType,
  DeviceStatus,
  SwarmStats,
} from "../../../../shared/types";

interface SwarmDashboardProps {
  devices: DeviceInfo[];
  stats: SwarmStats;
}

export function SwarmDashboard({ devices, stats }: SwarmDashboardProps) {
  const getDeviceIcon = (type: DeviceType) => {
    switch (type) {
      case "MOBILE":
        return Smartphone;
      case "TABLET":
        return Smartphone;
      case "COLAB":
        return Server;
      case "SERVER":
        return Server;
      default:
        return Laptop;
    }
  };

  const getStatusColor = (status: DeviceStatus) => {
    switch (status) {
      case "ONLINE":
        return "#10b981";
      case "BUSY":
        return "#f59e0b";
      case "ERROR":
        return "#f43f5e";
      case "OFFLINE":
        return "#6b7280";
      default:
        return "#6b7280";
    }
  };

  const getStatusIcon = (status: DeviceStatus) => {
    switch (status) {
      case "ONLINE":
        return Wifi;
      case "BUSY":
        return Activity;
      case "ERROR":
        return AlertCircle;
      case "OFFLINE":
        return WifiOff;
      default:
        return Wifi;
    }
  };

  const formatDuration = (ms: number) => {
    const seconds = Math.floor(ms / 1000);
    const minutes = Math.floor(seconds / 60);
    const hours = Math.floor(minutes / 60);

    if (hours > 0) return `${hours}h ${minutes % 60}m`;
    if (minutes > 0) return `${minutes}m ${seconds % 60}s`;
    return `${seconds}s`;
  };

  return (
    <Card className="md:col-span-12 h-auto" noPadding>
      <div className="p-6">
        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-emerald-500/10 flex items-center justify-center">
              <Zap className="text-emerald-500" size={20} />
            </div>
            <div>
              <h3 className="text-lg font-medium text-arc-text">
                Swarm Overview
              </h3>
              <p className="text-sm text-arc-muted">
                {stats.onlineDevices} of {stats.totalDevices} devices online
              </p>
            </div>
          </div>

          <div className="flex items-center gap-4">
            <div className="text-right">
              <p className="text-2xl font-bold text-arc-text">
                {stats.globalVelocity}
              </p>
              <p className="text-xs text-arc-muted">jobs/sec</p>
            </div>
          </div>
        </div>

        {/* Stats Grid */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
          <StatBox
            label="Total Cores"
            value={stats.totalCores}
            icon={Cpu}
            color="#6366f1"
          />
          <StatBox
            label="Memory"
            value={`${stats.totalMemoryGB}GB`}
            icon={Server}
            color="#8b5cf6"
          />
          <StatBox
            label="Pending Jobs"
            value={stats.pendingJobs}
            icon={Activity}
            color="#f59e0b"
          />
          <StatBox
            label="Active Jobs"
            value={stats.activeJobs}
            icon={Zap}
            color="#10b981"
          />
        </div>

        {/* Device Type Distribution */}
        <div className="mb-6">
          <p className="text-xs font-medium text-arc-muted uppercase tracking-wider mb-3">
            Device Types
          </p>
          <div className="flex gap-2">
            {Object.entries(stats.devicesByType).map(([type, count]) => (
              <div
                key={type}
                className="flex items-center gap-2 px-3 py-1.5 rounded-full bg-arc-bg border border-arc-border"
              >
                {(() => {
                  const Icon = getDeviceIcon(type as DeviceType);
                  return <Icon size={14} className="text-arc-muted" />;
                })()}
                <span className="text-xs text-arc-text">{type}</span>
                <span className="text-xs font-bold text-indigo-500">
                  {count}
                </span>
              </div>
            ))}
          </div>
        </div>

        {/* Device List */}
        <div>
          <p className="text-xs font-medium text-arc-muted uppercase tracking-wider mb-3">
            Connected Devices ({devices.length})
          </p>

          <div className="space-y-2 max-h-64 overflow-y-auto">
            {devices.map((device) => {
              const Icon = getDeviceIcon(device.type);
              const StatusIcon = getStatusIcon(device.status);
              const statusColor = getStatusColor(device.status);
              const connectedDuration = Date.now() - device.connectedAt;

              return (
                <div
                  key={device.id}
                  className="flex items-center gap-3 p-3 rounded-xl bg-arc-bg border border-arc-border hover:border-indigo-500/30 transition-all"
                >
                  {/* Device Icon */}
                  <div
                    className="w-10 h-10 rounded-lg flex items-center justify-center"
                    style={{ backgroundColor: `${statusColor}15` }}
                  >
                    <Icon size={18} style={{ color: statusColor }} />
                  </div>

                  {/* Device Info */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <span className="text-sm font-medium text-arc-text truncate">
                        {device.name}
                      </span>
                      <StatusIcon size={12} style={{ color: statusColor }} />
                    </div>
                    <div className="flex items-center gap-2 text-xs text-arc-muted">
                      <span>{device.capabilities.cpuCores} cores</span>
                      <span>•</span>
                      <span>{device.capabilities.memoryGB}GB</span>
                      <span>•</span>
                      <span>{formatDuration(connectedDuration)}</span>
                    </div>
                  </div>

                  {/* Performance */}
                  <div className="text-right">
                    <div className="text-sm font-medium text-arc-text">
                      {device.totalJobsCompleted}
                    </div>
                    <div className="text-xs text-arc-muted">jobs</div>
                  </div>

                  {/* Load Bar */}
                  <div className="w-20">
                    <div className="h-1.5 bg-arc-border rounded-full overflow-hidden">
                      <div
                        className="h-full rounded-full transition-all"
                        style={{
                          width: `${(device.currentLoad / device.capabilities.maxConcurrency) * 100}%`,
                          backgroundColor: statusColor,
                        }}
                      />
                    </div>
                  </div>

                  {/* Throttle Badge */}
                  {device.isThrottled && (
                    <span className="px-2 py-0.5 rounded-full text-[10px] font-medium bg-amber-500/10 text-amber-500">
                      {Math.round(device.throttleLevel * 100)}%
                    </span>
                  )}
                </div>
              );
            })}

            {devices.length === 0 && (
              <div className="text-center py-8 text-arc-muted">
                <p className="text-sm">No devices connected</p>
                <p className="text-xs mt-1">Use the connector to add devices</p>
              </div>
            )}
          </div>
        </div>
      </div>
    </Card>
  );
}

interface StatBoxProps {
  label: string;
  value: string | number;
  icon: any;
  color: string;
}

function StatBox({ label, value, icon: Icon, color }: StatBoxProps) {
  return (
    <div className="p-4 rounded-xl bg-arc-bg border border-arc-border">
      <div className="flex items-center gap-2 mb-2">
        <Icon size={16} style={{ color }} />
        <span className="text-xs text-arc-muted">{label}</span>
      </div>
      <p className="text-xl font-bold text-arc-text">{value}</p>
    </div>
  );
}
```

## File: client/src/hooks/useComputeSwarm.ts
```typescript
import { useCallback, useEffect, useRef, useState } from "react";
import { io, Socket } from "socket.io-client";
import { type JobChunk, type WorkerResult } from "../../../shared/types";
// @ts-ignore
import OstrichWorker from "../utils/worker?worker";
import { usePersistentIdentity } from "./usePersistentIdentity";

// Add onLog prop to the hook
export const useComputeSwarm = (onLog?: (msg: string) => void) => {
  const [status, setStatus] = useState<
    "IDLE" | "WORKING" | "PAUSED" | "STOPPED"
  >("IDLE");
  const [completedCount, setCompletedCount] = useState(0);
  const completedCountRef = useRef(0);
  const [socket, setSocket] = useState<Socket | null>(null);
  const [workerId, setWorkerId] = useState<string>("");
  const [opsScore, setOpsScore] = useState<number>(0);
  const [activeThreads, setActiveThreads] = useState<number>(0); // Start at 0
  const [currentThrottle, setCurrentThrottle] = useState<number>(30); // Default 30%

  const isRunningRef = useRef(false); // Default false until started
  const inFlightRequests = useRef(0);
  const activeJobs = useRef(0);
  const jobBuffer = useRef<JobChunk[]>([]);
  const socketRef = useRef<Socket | null>(null);
  const workerRef = useRef<Worker | null>(null);

  const identity = usePersistentIdentity();

  // --- CONTROLS ---

  const startSwarm = useCallback(() => {
    if (isRunningRef.current) return;

    isRunningRef.current = true;
    setStatus("WORKING");
    onLog?.(`[SYS] System starting... requesting work.`);
    processQueue();
  }, [onLog]);

  const pauseSwarm = useCallback(() => {
    isRunningRef.current = false;
    setStatus("PAUSED");
    onLog?.(`[SYS] System paused. Finishing active jobs...`);
    // We do NOT clear the buffer, just stop processing
  }, [onLog]);

  const stopSwarm = useCallback(() => {
    isRunningRef.current = false;
    setStatus("STOPPED");

    // Clear everything
    jobBuffer.current = [];
    activeJobs.current = 0;
    inFlightRequests.current = 0;

    // Hard Reset Worker
    workerRef.current?.terminate();
    workerRef.current = new OstrichWorker();

    // Re-initialize worker config
    workerRef.current.postMessage({
      type: "UPDATE_CONFIG",
      throttleLevel: currentThrottle / 100,
    });

    onLog?.(`[SYS] System stopped. Worker reset.`);
  }, [currentThrottle, onLog]);

  const updateThrottle = useCallback(
    (percent: number) => {
      setCurrentThrottle(percent);
      // Immediate Worker Update
      workerRef.current?.postMessage({
        type: "UPDATE_CONFIG",
        throttleLevel: percent / 100,
      });
      onLog?.(`[CFG] Throttle updated to ${percent}%`);
    },
    [onLog],
  );

  // --- CORE LOOP ---

  const processQueue = useCallback(() => {
    if (!workerRef.current || !isRunningRef.current) return;

    // 1. Fill Workers
    while (jobBuffer.current.length > 0 && activeJobs.current < activeThreads) {
      const job = jobBuffer.current.shift();
      if (job) {
        activeJobs.current += 1;
        setStatus("WORKING");
        workerRef.current.postMessage({
          type: "JOB_CHUNK",
          chunk: job,
          workerId: socketRef.current?.id,
        });
      }
    }

    // 2. Request More Work (Only if running)
    const desiredBuffer = Math.max(10, activeThreads * 3);
    const currentSupply =
      activeJobs.current + jobBuffer.current.length + inFlightRequests.current;

    if (currentSupply < desiredBuffer && socketRef.current?.connected) {
      const deficit = desiredBuffer - currentSupply;
      if (deficit > 0) {
        inFlightRequests.current += deficit;
        // Optimization: Request in batch if deficit is high
        if (deficit > 5) {
          socketRef.current.emit("REQUEST_BATCH", Math.min(deficit, 20));
        } else {
          socketRef.current.emit("REQUEST_WORK");
        }
      }
    }

    // Auto-idle check
    if (activeJobs.current === 0 && isRunningRef.current) {
      // Keep status as working if we are just waiting for network
      // But if buffer is empty and no requests inflight, maybe idle?
    }
  }, [activeThreads]);

  // --- INITIALIZATION ---

  useEffect(() => {
    if (!identity?.id) return;
    if (socketRef.current?.connected) return;

    onLog?.(`[NET] Connecting as ${identity.name}...`);

    const newSocket = io(window.location.origin, {
      path: "/socket.io",
      query: { persistentId: identity.id },
    });

    setSocket(newSocket);
    socketRef.current = newSocket;

    // Worker Init
    workerRef.current = new OstrichWorker();
    // Initialize with default throttle
    workerRef.current.postMessage({
      type: "UPDATE_CONFIG",
      throttleLevel: currentThrottle / 100,
    });

    newSocket.on("connect", () => {
      onLog?.(`[NET] Connected! Registering...`);
      setWorkerId(newSocket.id || "ID");

      newSocket.emit("REGISTER_DEVICE", {
        id: identity.id,
        name: identity.name,
        type: "DESKTOP",
        capabilities: {
          cpuCores: navigator.hardwareConcurrency || 4,
          memoryGB: 8,
          maxConcurrency: navigator.hardwareConcurrency || 4,
          supportedJobs: ["MATH_STRESS", "MAT_MUL"],
        },
      });
    });

    // ... handlers ...
    newSocket.on("JOB_DISPATCH", (job) => {
      inFlightRequests.current = Math.max(0, inFlightRequests.current - 1);
      jobBuffer.current.push(job);
      processQueue();
    });

    newSocket.on("BATCH_DISPATCH", (jobs) => {
      inFlightRequests.current = Math.max(0, inFlightRequests.current - 1);
      jobs.forEach((j: JobChunk) => jobBuffer.current.push(j));
      processQueue();
    });

    // Worker Handler
    if (workerRef.current) {
      workerRef.current.onmessage = (e) => {
        const msg = e.data;
        if (msg.type === "CONFIG_APPLIED") {
          // UPDATE LOCAL STATE WITH WORKER'S ACTUAL THREAD COUNT
          setActiveThreads(msg.threads);
          onLog?.(`[CPU] Worker scaled to ${msg.threads} threads`);
          // Trigger queue processing in case we scaled up
          processQueue();
        } else if (msg.type === "JOB_COMPLETE") {
          activeJobs.current--;
          completedCountRef.current++;
          socketRef.current?.emit("JOB_COMPLETE", {
            chunkId: msg.chunkId,
            result: msg.result as WorkerResult,
          });
          processQueue();
        } else if (msg.type === "JOB_ERROR") {
          activeJobs.current--;
          onLog?.(`[ERR] Job failed: ${msg.error}`);
          processQueue();
        }
      };
    }

    // Pump Loop
    const pump = setInterval(processQueue, 100);

    return () => {
      clearInterval(pump);
      newSocket.disconnect();
      workerRef.current?.terminate();
    };
  }, [identity]); // Deps

  // Sync completed count for UI
  useEffect(() => {
    const i = setInterval(
      () => setCompletedCount(completedCountRef.current),
      500,
    );
    return () => clearInterval(i);
  }, []);

  return {
    status,
    completedCount,
    workerId,
    opsScore,
    setOpsScore,
    activeThreads,
    updateThrottle, // Use this one
    throttle: currentThrottle,
    socket,
    isRunning: isRunningRef.current,
    startSwarm,
    pauseSwarm,
    stopSwarm,
  };
};
```

## File: client/src/utils/worker.ts
```typescript
/// <reference lib="webworker" />

// Limits
const LOGICAL_CORES = navigator.hardwareConcurrency || 4;
const TOTAL_RAM_BYTES = (navigator as any).deviceMemory
  ? (navigator as any).deviceMemory * 1e9
  : 4e9;

// State - Use Map for better tracking
const threadPool = new Map<
  number,
  {
    worker: Worker;
    busy: boolean;
    currentChunkId: string | null;
  }
>();

let currentRamUsage = 0;
let throttleLimit = 0.3; // Default 30%
let nextWorkerId = 0;

// --- KERNEL 1: Math Stress (Legacy) ---
const runStressTest = (iterations: number) => {
  let sum = 0;
  for (let i = 0; i < iterations; i++) {
    sum += Math.sqrt(i) * Math.sin(i);
  }
  return sum;
};

// --- KERNEL 2: Matrix Multiplication (ML Foundation) ---
const runMatrixMul = (rowA: number[], matrixB: number[][]) => {
  const resultRow = new Array(matrixB[0].length).fill(0);
  for (let j = 0; j < matrixB[0].length; j++) {
    let sum = 0;
    for (let k = 0; k < rowA.length; k++) {
      sum += rowA[k] * matrixB[k][j];
    }
    resultRow[j] = sum;
  }
  return resultRow;
};

// --- SUB-WORKER FACTORY ---
const createSubWorker = (workerId: number) => {
  const blob = new Blob(
    [
      `
    const runStressTest = ${runStressTest.toString()};
    const runMatrixMul = ${runMatrixMul.toString()};

    self.onmessage = (e) => {
      try {
        const { type, data } = e.data;
        let result;

        if (type === "MATH_STRESS") {
          result = runStressTest(data[0]);
        } 
        else if (type === "MATRIX_MUL") {
          result = runMatrixMul(data.row, data.matrixB);
        }
        else {
          throw new Error("Unknown Kernel: " + type);
        }

        self.postMessage({ success: true, result });
      } catch (err) {
        self.postMessage({ success: false, error: err.message });
      }
    }
  `,
    ],
    { type: "application/javascript" },
  );
  const worker = new Worker(URL.createObjectURL(blob));

  // Store workerId on the worker object for tracking
  (worker as any).workerId = workerId;

  return worker;
};

const calculateBenchmark = (): number => {
  const start = performance.now();
  let sum = 0;
  const duration = 100;
  while (performance.now() - start < duration) {
    for (let i = 0; i < 10000; i++) {
      sum += Math.sqrt(i) * Math.sin(i);
    }
  }
  return Math.round((sum / (performance.now() - start)) * 100);
};

// Find first available worker
const findAvailableWorker = (): { id: number; worker: Worker } | null => {
  for (const [id, thread] of threadPool.entries()) {
    if (!thread.busy) {
      return { id, worker: thread.worker };
    }
  }
  return null;
};

// --- MAIN CONTROLLER ---
self.onmessage = async (e: MessageEvent) => {
  const { type, chunk, throttleLevel, workerId } = e.data;

  // SYSTEM: BENCHMARK
  if (type === "BENCHMARK") {
    self.postMessage({
      type: "BENCHMARK_COMPLETE",
      score: calculateBenchmark(),
    });
    return;
  }

  // SYSTEM: CONFIG UPDATE
  if (type === "UPDATE_CONFIG") {
    throttleLimit = throttleLevel;
    const targetThreadCount = Math.max(
      1,
      Math.floor(LOGICAL_CORES * throttleLimit),
    );

    const currentCount = threadPool.size;

    // Scale Up
    if (targetThreadCount > currentCount) {
      for (let i = currentCount; i < targetThreadCount; i++) {
        const workerId = nextWorkerId++;
        const worker = createSubWorker(workerId);
        threadPool.set(workerId, {
          worker,
          busy: false,
          currentChunkId: null,
        });
      }
    }

    // Scale Down - Only remove idle workers
    if (targetThreadCount < currentCount) {
      const toRemove = currentCount - targetThreadCount;
      let removed = 0;

      for (const [id, thread] of threadPool.entries()) {
        if (!thread.busy && removed < toRemove) {
          thread.worker.terminate();
          threadPool.delete(id);
          removed++;
        }
      }
    }

    self.postMessage({
      type: "CONFIG_APPLIED",
      threads: threadPool.size,
      limit: throttleLimit,
      score: calculateBenchmark(),
    });
    return;
  }

  // EXECUTION: JOB HANDLING
  if (type === "JOB_CHUNK") {
    // 1. RAM CHECK
    const estimatedSize = 50000;
    if (currentRamUsage + estimatedSize > TOTAL_RAM_BYTES * throttleLimit) {
      self.postMessage({
        type: "JOB_ERROR",
        chunkId: chunk.id,
        error: "OOM_PREVENTED",
      });
      return;
    }

    // 2. FIND AVAILABLE WORKER
    const available = findAvailableWorker();
    if (!available) {
      self.postMessage({
        type: "JOB_ERROR",
        chunkId: chunk.id,
        error: "CPU_SATURATED",
      });
      return;
    }

    // 3. RUN
    const { id: threadId, worker } = available;
    const start = performance.now();

    currentRamUsage += estimatedSize;
    const thread = threadPool.get(threadId)!;
    thread.busy = true;
    thread.currentChunkId = chunk.id;

    worker.onmessage = (ev) => {
      currentRamUsage -= estimatedSize;

      // Only update if thread still exists (might have been scaled down)
      const currentThread = threadPool.get(threadId);
      if (currentThread) {
        currentThread.busy = false;
        currentThread.currentChunkId = null;
      }

      const duration = Math.round(performance.now() - start);

      if (ev.data.success) {
        self.postMessage({
          type: "JOB_COMPLETE",
          chunkId: chunk.id,
          result: ev.data.result,
          workerId: workerId,
          durationMs: duration,
          timestamp: performance.now(),
        });
      } else {
        self.postMessage({
          type: "JOB_ERROR",
          chunkId: chunk.id,
          error: ev.data.error,
        });
      }
    };

    worker.postMessage({ type: chunk.type, data: chunk.data });
  }
};

export {};
```

## File: server/src/JobQueue.ts
```typescript
import { type JobChunk, type WorkerResult } from "../../shared/types";

export class JobQueue {
  public queue: JobChunk[];
  private results: Map<string, any> = new Map();

  constructor() {
    this.queue = [];
    this.generateMoreJobs(50);
  }

  getNextJob(): JobChunk | null {
    const job = this.queue.find((j) => j.status === "PENDING");
    if (job) {
      job.status = "ASSIGNED";
      return job;
    }
    return null;
  }

  completeJob(result: WorkerResult) {
    this.results.set(result.chunkId, result.result);
    const job = this.queue.find((j) => j.id === result.chunkId);
    if (job) job.status = "COMPLETED";
  }

  reclaimJob(chunkId: string) {
    const job = this.queue.find((j) => j.id === chunkId);
    if (job) {
      // console.log(`Reclaiming ${job.type} chunk ${chunkId}`);
      job.status = "PENDING";
    }
  }

  /**
   * GENERATOR 1: Matrix Multiplication (ML)
   * A 300x300 Matrix * 300 vectors = 300 Jobs.
   */
  private generateMatrixBatch(count: number) {
    const size = 300;

    // The "Weights" Matrix (Constant for this batch)
    const matrixB = Array(size)
      .fill(0)
      .map(() =>
        Array(size)
          .fill(0)
          .map(() => Math.random()),
      );

    for (let i = 0; i < count; i++) {
      const rowA = Array(size)
        .fill(0)
        .map(() => Math.random());

      this.queue.push({
        id: `mx_${Date.now()}_${i}`,

        createdAt: Date.now(),
        type: "MAT_MUL",
        data: {
          row: rowA,
          matrixB: matrixB,
        },
        status: "PENDING",
      });
    }
  }

  /**
   * GENERATOR 2: CPU Stress (Maintenance)
   */
  private generateStressBatch(count: number) {
    for (let i = 0; i < count; i++) {
      this.queue.push({
        id: `stress_${Date.now()}_${i}`,
        createdAt: Date.now(),
        type: "MATH_STRESS",
        data: [4000000], // 4 Million iterations
        status: "PENDING",
      });
    }
  }

  generateMoreJobs(count: number) {
    // 50/50 Split
    if (Math.random() > 0.5) {
      console.log(`Generating ${count} Matrix/ML Jobs...`);
      this.generateMatrixBatch(count);
    } else {
      console.log(`Generating ${count} Stress Jobs...`);
      this.generateStressBatch(count);
    }
  }
}
```

## File: server/src/swarm/DeviceRegistry.ts
```typescript
import {
  type DeviceInfo,
  type DeviceStatus,
  type DeviceHealth,
  type DeviceType,
} from "../../../shared/types";
import { EventEmitter } from "events";

export class DeviceRegistry extends EventEmitter {
  private devices = new Map<string, DeviceInfo>();
  private socketToDevice = new Map<string, string>();
  private healthChecks = new Map<string, DeviceHealth>();

  // Health check configuration
  private readonly HEARTBEAT_TIMEOUT = 30000; // 30 seconds
  private readonly HEALTH_CHECK_INTERVAL = 10000; // 10 seconds

  constructor() {
    super();
    this.startHealthMonitoring();
  }

  register(device: DeviceInfo): void {
    this.devices.set(device.id, device);
    this.socketToDevice.set(device.socketId, device.id);
    this.emit("deviceJoined", device);
  }

  unregister(deviceId: string): DeviceInfo | undefined {
    const device = this.devices.get(deviceId);
    if (device) {
      this.devices.delete(deviceId);
      this.socketToDevice.delete(device.socketId);
      this.healthChecks.delete(deviceId);
      this.emit("deviceLeft", deviceId, device);
    }
    return device;
  }

  getBySocketId(socketId: string): DeviceInfo | undefined {
    const deviceId = this.socketToDevice.get(socketId);
    return deviceId ? this.devices.get(deviceId) : undefined;
  }

  get(deviceId: string): DeviceInfo | undefined {
    return this.devices.get(deviceId);
  }

  getAll(): DeviceInfo[] {
    return Array.from(this.devices.values());
  }

  getOnline(): DeviceInfo[] {
    return this.getAll().filter(
      (d) => d.status === "ONLINE" || d.status === "BUSY",
    );
  }

  getAvailable(): DeviceInfo[] {
    return this.getOnline().filter(
      (d) =>
        d.status === "ONLINE" && d.currentLoad < d.capabilities.maxConcurrency,
    );
  }

  getByType(type: DeviceType): DeviceInfo[] {
    return this.getAll().filter((d) => d.type === type);
  }

  updateStatus(deviceId: string, status: DeviceStatus): boolean {
    const device = this.devices.get(deviceId);
    if (device) {
      device.status = status;
      device.lastHeartbeat = Date.now();
      this.emit("statusChanged", deviceId, status);
      return true;
    }
    return false;
  }

  updateLoad(deviceId: string, load: number): boolean {
    const device = this.devices.get(deviceId);
    if (device) {
      device.currentLoad = load;
      device.status = load > 0 ? "BUSY" : "ONLINE";
      device.lastHeartbeat = Date.now();
      return true;
    }
    return false;
  }

  updateStats(
    deviceId: string,
    stats: {
      opsScore?: number;
      totalJobsCompleted?: number;
      avgJobDuration?: number;
    },
  ): boolean {
    const device = this.devices.get(deviceId);
    if (device) {
      if (stats.opsScore !== undefined) device.opsScore = stats.opsScore;
      if (stats.totalJobsCompleted !== undefined)
        device.totalJobsCompleted = stats.totalJobsCompleted;
      if (stats.avgJobDuration !== undefined)
        device.avgJobDuration = stats.avgJobDuration;
      return true;
    }
    return false;
  }

  recordHeartbeat(deviceId: string, health: DeviceHealth): void {
    this.healthChecks.set(deviceId, health);

    const device = this.devices.get(deviceId);
    if (device) {
      device.lastHeartbeat = Date.now();

      // Auto-update status based on health
      if (!health.isHealthy && device.status !== "ERROR") {
        this.updateStatus(deviceId, "ERROR");
      } else if (health.isHealthy && device.status === "ERROR") {
        this.updateStatus(deviceId, device.currentLoad > 0 ? "BUSY" : "ONLINE");
      }
    }

    this.emit("heartbeat", deviceId, health);
  }

  getHealth(deviceId: string): DeviceHealth | undefined {
    return this.healthChecks.get(deviceId);
  }

  getStats() {
    const all = this.getAll();
    const online = this.getOnline();

    return {
      totalDevices: all.length,
      onlineDevices: online.length,
      busyDevices: online.filter((d) => d.status === "BUSY").length,
      errorDevices: all.filter((d) => d.status === "ERROR").length,
      totalCores: all.reduce((sum, d) => sum + d.capabilities.cpuCores, 0),
      totalMemoryGB: all.reduce((sum, d) => sum + d.capabilities.memoryGB, 0),
      devicesByType: all.reduce(
        (acc, d) => {
          acc[d.type] = (acc[d.type] || 0) + 1;
          return acc;
        },
        {} as Record<string, number>,
      ),
    };
  }

  private startHealthMonitoring(): void {
    setInterval(() => {
      const now = Date.now();

      for (const [deviceId, device] of this.devices.entries()) {
        // Check for stale devices
        if (now - device.lastHeartbeat > this.HEARTBEAT_TIMEOUT) {
          if (device.status !== "OFFLINE") {
            this.updateStatus(deviceId, "OFFLINE");
            this.emit("deviceStale", deviceId);
          }
        }

        // Check health thresholds
        const health = this.healthChecks.get(deviceId);
        if (health) {
          const isHealthy =
            health.cpuUsage < 95 &&
            health.memoryUsage < 90 &&
            health.networkLatency < 1000;

          if (!isHealthy && device.status !== "ERROR") {
            this.updateStatus(deviceId, "ERROR");
          }
        }
      }
    }, this.HEALTH_CHECK_INTERVAL);
  }

  // Find best device for job assignment
  findBestDevice(preferredTypes?: string[]): DeviceInfo | null {
    const available = this.getAvailable();

    if (available.length === 0) return null;

    // Score each device
    const scored = available.map((device) => {
      let score = device.opsScore;

      // Penalize high load
      score *= 1 - device.currentLoad / device.capabilities.maxConcurrency;

      // Bonus for preferred types
      if (preferredTypes?.includes(device.type)) {
        score *= 1.2;
      }

      return { device, score };
    });

    // Sort by score descending
    scored.sort((a, b) => b.score - a.score);

    return scored[0]?.device || null;
  }

  // For work stealing - find overloaded and underloaded devices
  getLoadBalancingPairs(): Array<{
    overloaded: DeviceInfo;
    underloaded: DeviceInfo;
  }> {
    const online = this.getOnline();
    const pairs: Array<{ overloaded: DeviceInfo; underloaded: DeviceInfo }> =
      [];

    const overloaded = online.filter(
      (d) => d.currentLoad >= d.capabilities.maxConcurrency * 0.8,
    );

    const underloaded = online.filter(
      (d) => d.currentLoad < d.capabilities.maxConcurrency * 0.3,
    );

    for (const over of overloaded) {
      // Find best underloaded device to steal work
      const best = underloaded
        .filter((u) => u.id !== over.id)
        .sort((a, b) => b.opsScore - a.opsScore)[0];

      if (best) {
        pairs.push({ overloaded: over, underloaded: best });
      }
    }

    return pairs;
  }

  dispose(): void {
    this.devices.clear();
    this.socketToDevice.clear();
    this.healthChecks.clear();
    this.removeAllListeners();
  }
}
```

## File: server/src/swarm/JoinCodeManager.ts
```typescript
import { type JoinCode } from "../../../shared/types";
import { randomBytes } from "crypto";

export class JoinCodeManager {
  private codes = new Map<string, JoinCode>();
  private readonly DEFAULT_EXPIRY = 24 * 60 * 60 * 1000; // 24 hours
  private readonly CLEANUP_INTERVAL = 60 * 60 * 1000; // 1 hour

  constructor() {
    this.startCleanup();
  }

  generateCode(options?: {
    expiresIn?: number;
    maxUses?: number;
    createdBy?: string;
    metadata?: JoinCode["metadata"];
  }): string {
    // Generate a 6-character alphanumeric code
    const code = this.generateRandomCode();
    
    const joinCode: JoinCode = {
      code,
      expiresAt: Date.now() + (options?.expiresIn || this.DEFAULT_EXPIRY),
      maxUses: options?.maxUses || 100,
      usedCount: 0,
      createdBy: options?.createdBy || "system",
      metadata: options?.metadata
    };
    
    this.codes.set(code, joinCode);
    return code;
  }

  validateCode(code: string): { valid: boolean; error?: string; joinCode?: JoinCode } {
    const joinCode = this.codes.get(code.toUpperCase());
    
    if (!joinCode) {
      return { valid: false, error: "Invalid join code" };
    }
    
    if (Date.now() > joinCode.expiresAt) {
      this.codes.delete(code);
      return { valid: false, error: "Join code has expired" };
    }
    
    if (joinCode.usedCount >= joinCode.maxUses) {
      return { valid: false, error: "Join code has reached maximum uses" };
    }
    
    return { valid: true, joinCode };
  }

  useCode(code: string): boolean {
    const result = this.validateCode(code);
    
    if (!result.valid || !result.joinCode) {
      return false;
    }
    
    result.joinCode.usedCount++;
    
    // Auto-delete if max uses reached
    if (result.joinCode.usedCount >= result.joinCode.maxUses) {
      this.codes.delete(code);
    }
    
    return true;
  }

  revokeCode(code: string): boolean {
    return this.codes.delete(code.toUpperCase());
  }

  getCode(code: string): JoinCode | undefined {
    return this.codes.get(code.toUpperCase());
  }

  getAllCodes(): JoinCode[] {
    return Array.from(this.codes.values());
  }

  getActiveCodes(): JoinCode[] {
    return this.getAllCodes().filter(code => 
      Date.now() < code.expiresAt && 
      code.usedCount < code.maxUses
    );
  }

  getStats() {
    const all = this.getAllCodes();
    return {
      totalCodes: all.length,
      activeCodes: all.filter(c => Date.now() < c.expiresAt && c.usedCount < c.maxUses).length,
      expiredCodes: all.filter(c => Date.now() >= c.expiresAt).length,
      depletedCodes: all.filter(c => c.usedCount >= c.maxUses).length,
      totalUses: all.reduce((sum, c) => sum + c.usedCount, 0)
    };
  }

  private generateRandomCode(): string {
    // Generate 6-character alphanumeric code
    return randomBytes(4)
      .toString("base64")
      .replace(/[^a-zA-Z0-9]/g, "")
      .substring(0, 6)
      .toUpperCase();
  }

  private startCleanup(): void {
    setInterval(() => {
      const now = Date.now();
      let cleaned = 0;
      
      for (const [code, joinCode] of this.codes.entries()) {
        if (now > joinCode.expiresAt) {
          this.codes.delete(code);
          cleaned++;
        }
      }
      
      if (cleaned > 0) {
        console.log(`[JoinCodeManager] Cleaned up ${cleaned} expired codes`);
      }
    }, this.CLEANUP_INTERVAL);
  }

  // Generate a URL for mobile/Colab devices
  generateConnectionUrl(code: string, baseUrl: string): string {
    return `${baseUrl}/join/${code}`;
  }

  // Generate a QR code data URL (simplified - actual QR generation would be on client)
  generateQRData(code: string, baseUrl: string): { url: string; code: string } {
    const url = this.generateConnectionUrl(code, baseUrl);
    return { url, code };
  }
}
```

## File: server/src/swarm/SwarmCoordinator.ts
```typescript
import { Server as SocketIOServer } from "socket.io";
import { DeviceRegistry } from "./DeviceRegistry";
import { WorkStealingScheduler } from "./WorkStealingScheduler";
import { JoinCodeManager } from "./JoinCodeManager";
import {
  type DeviceInfo,
  type JobChunk,
  type WorkerResult,
  type DeviceHealth,
  type SwarmStats,
} from "../../../shared/types";
import { EventEmitter } from "events";

interface SwarmOptions {
  enableWorkStealing?: boolean;
  enableHealthChecks?: boolean;
  autoRebalance?: boolean;
}

export class SwarmCoordinator extends EventEmitter {
  private io: SocketIOServer;
  private registry: DeviceRegistry;
  private scheduler: WorkStealingScheduler;
  private joinCodeManager: JoinCodeManager;
  private options: SwarmOptions;

  constructor(io: SocketIOServer, options: SwarmOptions = {}) {
    super();
    this.io = io;
    this.registry = new DeviceRegistry();
    this.scheduler = new WorkStealingScheduler();
    this.joinCodeManager = new JoinCodeManager();
    this.options = {
      enableWorkStealing: true,
      enableHealthChecks: true,
      autoRebalance: true,
      ...options,
    };

    this.setupEventHandlers();
    this.startAutoRebalancing();
  }

  // Device Management
  registerDevice(
    socketId: string,
    deviceInfo: Partial<DeviceInfo>,
  ): DeviceInfo {
    // 1. CRITICAL FIX: Check for existing device by Persistent ID first
    // The client sends 'id' which is the persistent localStorage ID.
    let device = deviceInfo.id ? this.registry.get(deviceInfo.id) : undefined;

    if (device) {
      // 2. RECONNECT: Update existing device record
      console.log(`[Swarm] Device reconnected: ${device.name} (${device.id})`);

      // Update the socket mapping in registry
      // We need to access the private map or add a method in DeviceRegistry
      // For now, assuming we can update the device object directly:
      device.socketId = socketId;
      device.status = "ONLINE";
      device.lastHeartbeat = Date.now();

      // Update registry internal mappings (You might need to add a method to DeviceRegistry for this)
      this.registry["socketToDevice"].set(socketId, device.id);

      // Do NOT emit "deviceJoined" for reconnects to prevent log spam
      this.emit("deviceReconnect", device);
      return device;
    }

    // 3. NEW REGISTRATION: Only if no ID found
    const newId = deviceInfo.id || this.generateDeviceId();

    device = {
      id: newId,
      socketId,
      name: deviceInfo.name || `Device-${newId.slice(0, 4)}`,
      type: deviceInfo.type || "DESKTOP",
      status: "ONLINE",
      capabilities: deviceInfo.capabilities || {
        cpuCores: 2,
        memoryGB: 4,
        gpuAvailable: false,
        maxConcurrency: 2,
        supportedJobs: [],
      },
      opsScore: deviceInfo.opsScore || 0,
      currentLoad: 0,
      totalJobsCompleted: 0,
      avgJobDuration: 0,
      connectedAt: Date.now(),
      lastHeartbeat: Date.now(),
      throttleLevel: 1.0,
      isThrottled: false,
    };

    this.registry.register(device);
    console.log(`[Swarm] New Device joined: ${device.name}`);
    this.emit("deviceJoined", device);
    this.broadcastStats();

    return device;
  }

  unregisterDevice(deviceId: string): void {
    const device = this.registry.unregister(deviceId);
    if (device) {
      // Reassign any pending jobs from this device
      const jobs = this.scheduler.getWorkForDevice(deviceId);
      jobs.forEach((job) => {
        job.status = "PENDING";
        job.assignedTo = undefined;
        job.assignedAt = undefined;
      });

      console.log(`[Swarm] Device left: ${device.name}`);
      this.emit("deviceLeft", deviceId);
      this.broadcastStats();
    }
  }

  // Job Management
  submitJob(job: JobChunk): void {
    this.scheduler.submitJob(job);
    this.tryAssignPendingJobs();
  }

  submitBatch(jobs: JobChunk[]): void {
    this.scheduler.submitBatch(jobs);
    this.tryAssignPendingJobs();
  }

  requestWork(deviceId: string): JobChunk | null {
    const device = this.registry.get(deviceId);
    if (!device || device.status === "OFFLINE" || device.status === "ERROR") {
      return null;
    }

    const job = this.scheduler.getNextJob(
      deviceId,
      device.capabilities.supportedJobs,
    );

    if (job) {
      this.registry.updateLoad(deviceId, device.currentLoad + 1);
      this.emit("jobAssigned", job, deviceId);
    }

    return job;
  }

  requestBatch(deviceId: string, count: number): JobChunk[] {
    const device = this.registry.get(deviceId);
    if (!device || device.status === "OFFLINE" || device.status === "ERROR") {
      return [];
    }

    const jobs = this.scheduler.getBatch(
      deviceId,
      count,
      device.capabilities.supportedJobs,
    );

    if (jobs.length > 0) {
      this.registry.updateLoad(deviceId, device.currentLoad + jobs.length);
      this.emit("batchAssigned", jobs, deviceId);
    }

    return jobs;
  }

  completeJob(result: WorkerResult): void {
    const success = this.scheduler.completeJob(result);

    if (success && result.deviceId) {
      const device = this.registry.get(result.deviceId);
      if (device) {
        device.totalJobsCompleted++;
        device.avgJobDuration = result.durationMs || device.avgJobDuration;
        this.registry.updateLoad(
          result.deviceId,
          Math.max(0, device.currentLoad - 1),
        );
        this.registry.updateStats(result.deviceId, {
          totalJobsCompleted: device.totalJobsCompleted,
          avgJobDuration: device.avgJobDuration,
        });
      }
    }

    this.tryAssignPendingJobs();
    this.broadcastStats();
  }

  // Work Stealing
  stealWork(thiefId: string): JobChunk[] {
    if (!this.options.enableWorkStealing) return [];

    const stolen = this.scheduler.stealWork(thiefId);

    if (stolen.length > 0) {
      const thief = this.registry.get(thiefId);
      if (thief) {
        this.registry.updateLoad(thiefId, thief.currentLoad + stolen.length);
      }

      this.emit("workStolen", stolen, thiefId);
    }

    return stolen;
  }

  offerWork(deviceId: string): JobChunk[] {
    if (!this.options.enableWorkStealing) return [];

    const device = this.registry.get(deviceId);
    if (!device || !this.scheduler.shouldOfferWork(deviceId)) {
      return [];
    }

    // Find best target for offloading
    const available = this.registry
      .getAvailable()
      .filter((d) => d.id !== deviceId)
      .sort((a, b) => b.opsScore - a.opsScore)[0];

    if (available) {
      return this.scheduler.stealWork(available.id, 3);
    }

    return [];
  }

  // Health & Monitoring
  recordHeartbeat(deviceId: string, health: DeviceHealth): void {
    this.registry.recordHeartbeat(deviceId, health);

    // Update device stats based on health
    if (health.cpuUsage > 90) {
      const device = this.registry.get(deviceId);
      if (device && !device.isThrottled) {
        device.isThrottled = true;
        device.throttleLevel = 0.7;
        this.emit("deviceThrottled", deviceId, 0.7);
      }
    }
  }

  updateDeviceStats(deviceId: string, stats: { opsScore: number }): void {
    this.registry.updateStats(deviceId, stats);
  }

  // Join Codes
  generateJoinCode(
    options?: Parameters<JoinCodeManager["generateCode"]>[0],
  ): string {
    return this.joinCodeManager.generateCode(options);
  }

  validateJoinCode(code: string): ReturnType<JoinCodeManager["validateCode"]> {
    return this.joinCodeManager.validateCode(code);
  }

  useJoinCode(code: string): boolean {
    return this.joinCodeManager.useCode(code);
  }

  // Statistics
  getStats(): SwarmStats {
    const deviceStats = this.registry.getStats();
    const queueMetrics = this.scheduler.getMetrics();

    return {
      totalDevices: deviceStats.totalDevices,
      onlineDevices: deviceStats.onlineDevices,
      busyDevices: deviceStats.busyDevices,
      totalCores: deviceStats.totalCores,
      totalMemoryGB: deviceStats.totalMemoryGB,
      pendingJobs: queueMetrics.pendingJobs,
      activeJobs: queueMetrics.assignedJobs,
      completedJobs: this.scheduler["completedJobs"].size,
      failedJobs: this.scheduler.getFailedCount(),
      globalVelocity: this.calculateGlobalVelocity(),
      avgLatency: this.calculateAvgLatency(),
      devicesByType: deviceStats.devicesByType,
    };
  }

  getDevices(): DeviceInfo[] {
    return this.registry.getAll();
  }

  getDevice(deviceId: string): DeviceInfo | undefined {
    return this.registry.get(deviceId);
  }

  // Private Methods
  private setupEventHandlers(): void {
    // Device registry events
    this.registry.on("deviceStale", (deviceId: string) => {
      console.log(`[Swarm] Device ${deviceId} marked as stale`);
      this.emit("deviceStale", deviceId);
    });

    // Scheduler events
    this.scheduler.on("jobTimeout", (jobId: string) => {
      console.log(`[Swarm] Job ${jobId} timed out, reassigning...`);
      this.tryAssignPendingJobs();
    });
  }

  private tryAssignPendingJobs(): void {
    const pendingCount = this.scheduler.getPendingCount();
    if (pendingCount === 0) return;

    const available = this.registry.getAvailable();

    for (const device of available) {
      const capacity = device.capabilities.maxConcurrency - device.currentLoad;
      if (capacity <= 0) continue;

      // Request batch of jobs based on capacity
      const jobs = this.scheduler.getBatch(
        device.id,
        capacity,
        device.capabilities.supportedJobs,
      );

      if (jobs.length > 0) {
        this.registry.updateLoad(device.id, device.currentLoad + jobs.length);
        this.emit("batchAssigned", jobs, device.id);

        // Send jobs to device
        const socket = this.io.sockets.sockets.get(device.socketId);
        if (socket) {
          socket.emit("BATCH_DISPATCH", jobs);
        }
      }
    }
  }

  private startAutoRebalancing(): void {
    if (!this.options.autoRebalance) return;

    setInterval(() => {
      const pairs = this.registry.getLoadBalancingPairs();

      for (const { overloaded, underloaded } of pairs) {
        const stolen = this.scheduler.stealWork(underloaded.id, 3);

        if (stolen.length > 0) {
          this.registry.updateLoad(
            overloaded.id,
            Math.max(0, overloaded.currentLoad - stolen.length),
          );
          this.registry.updateLoad(
            underloaded.id,
            underloaded.currentLoad + stolen.length,
          );

          // Send stolen jobs to underloaded device
          const socket = this.io.sockets.sockets.get(underloaded.socketId);
          if (socket) {
            socket.emit("BATCH_DISPATCH", stolen);
          }

          this.emit("workStolen", stolen, overloaded.id, underloaded.id);
        }
      }
    }, 10000); // Rebalance every 10 seconds
  }

  private broadcastStats(): void {
    const stats = this.getStats();
    this.io.emit("SWARM_STATS", stats);
  }

  private calculateGlobalVelocity(): number {
    const devices = this.registry.getOnline();
    if (devices.length === 0) return 0;

    const totalJobsLastMinute = devices.reduce((sum, d) => {
      // Estimate based on avg duration
      if (d.avgJobDuration > 0) {
        return sum + (60000 / d.avgJobDuration) * d.currentLoad;
      }
      return sum;
    }, 0);

    return Math.round(totalJobsLastMinute / 60); // Jobs per second
  }

  private calculateAvgLatency(): number {
    const metrics = this.scheduler.getMetrics();
    return Math.round(metrics.avgWaitTime);
  }

  private generateDeviceId(): string {
    return `dev-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`;
  }

  // Cleanup
  dispose(): void {
    this.registry.dispose();
    this.scheduler.dispose();
    this.removeAllListeners();
  }
}
```

## File: server/src/swarm/WorkStealingScheduler.ts
```typescript
import {
  type JobChunk,
  type WorkerResult,
  type JobType,
} from "../../../shared/types";
import { EventEmitter } from "events";

interface QueueMetrics {
  totalJobs: number;
  pendingJobs: number;
  assignedJobs: number;
  avgWaitTime: number;
  jobsByType: Record<JobType, number>;
}

interface AssignmentRecord {
  jobId: string;
  deviceId: string;
  assignedAt: number;
  expiresAt: number;
  retryCount: number;
}

export class WorkStealingScheduler extends EventEmitter {
  private jobQueue: JobChunk[] = [];
  private assignments = new Map<string, AssignmentRecord>();
  private completedJobs = new Set<string>();
  private failedJobs = new Map<string, { error: string; retries: number }>();

  // Configuration
  private readonly JOB_TIMEOUT = 60000; // 60 seconds
  private readonly MAX_RETRIES = 3;
  private readonly STEAL_THRESHOLD = 5; // Steal if device has 5+ jobs pending
  private readonly STEAL_BATCH_SIZE = 3;

  constructor() {
    super();
    this.startReaper();
  }

  submitJob(job: JobChunk): void {
    job.createdAt = Date.now();
    job.status = "PENDING";
    this.jobQueue.push(job);
    this.emit("jobSubmitted", job);
  }

  submitBatch(jobs: JobChunk[]): void {
    const now = Date.now();
    jobs.forEach((job) => {
      job.createdAt = now;
      job.status = "PENDING";
    });
    this.jobQueue.push(...jobs);
    this.emit("batchSubmitted", jobs);
  }

  getNextJob(deviceId: string, capabilities?: JobType[]): JobChunk | null {
    // Find first compatible job
    const index = this.jobQueue.findIndex(
      (job) =>
        job.status === "PENDING" &&
        (!capabilities || capabilities.includes(job.type)),
    );

    if (index === -1) return null;

    const job = this.jobQueue[index];
    job.status = "ASSIGNED";
    job.assignedTo = deviceId;
    job.assignedAt = Date.now();

    // Track assignment
    this.assignments.set(job.id, {
      jobId: job.id,
      deviceId,
      assignedAt: job.assignedAt,
      expiresAt: job.assignedAt + this.JOB_TIMEOUT,
      retryCount: this.failedJobs.get(job.id)?.retries || 0,
    });

    this.emit("jobAssigned", job, deviceId);
    return job;
  }

  getBatch(
    deviceId: string,
    count: number,
    capabilities?: JobType[],
  ): JobChunk[] {
    const jobs: JobChunk[] = [];
    let remaining = count;

    for (let i = 0; i < this.jobQueue.length && remaining > 0; i++) {
      const job = this.jobQueue[i];
      if (
        job.status === "PENDING" &&
        (!capabilities || capabilities.includes(job.type))
      ) {
        job.status = "ASSIGNED";
        job.assignedTo = deviceId;
        job.assignedAt = Date.now();

        this.assignments.set(job.id, {
          jobId: job.id,
          deviceId,
          assignedAt: job.assignedAt,
          expiresAt: job.assignedAt + this.JOB_TIMEOUT,
          retryCount: this.failedJobs.get(job.id)?.retries || 0,
        });

        jobs.push(job);
        remaining--;
      }
    }

    if (jobs.length > 0) {
      this.emit("batchAssigned", jobs, deviceId);
    }

    return jobs;
  }

  completeJob(result: WorkerResult): boolean {
    const assignment = this.assignments.get(result.chunkId);

    if (!assignment) {
      console.warn(`[Scheduler] Completion for unknown job: ${result.chunkId}`);
      return false;
    }

    if (result.error) {
      // Handle failure
      return this.handleFailure(result);
    }

    // Success - mark as completed
    const job = this.jobQueue.find((j) => j.id === result.chunkId);
    if (job) {
      job.status = "COMPLETED";
    }

    this.completedJobs.add(result.chunkId);
    this.assignments.delete(result.chunkId);
    this.failedJobs.delete(result.chunkId);

    this.emit("jobCompleted", result);
    this.cleanupCompletedJobs();

    return true;
  }

  private handleFailure(result: WorkerResult): boolean {
    const jobId = result.chunkId;
    const currentFails = this.failedJobs.get(jobId);
    const retryCount = (currentFails?.retries || 0) + 1;

    if (retryCount >= this.MAX_RETRIES) {
      // Max retries reached - permanently fail
      const job = this.jobQueue.find((j) => j.id === jobId);
      if (job) {
        job.status = "COMPLETED"; // Mark as completed to remove from queue
      }

      this.failedJobs.set(jobId, {
        error: result.error!,
        retries: retryCount,
      });
      this.assignments.delete(jobId);

      this.emit("jobFailed", result, retryCount);
      return true;
    }

    // Retry - reset to pending
    const job = this.jobQueue.find((j) => j.id === jobId);
    if (job) {
      job.status = "PENDING";
      job.assignedTo = undefined;
      job.assignedAt = undefined;
    }

    this.failedJobs.set(jobId, {
      error: result.error!,
      retries: retryCount,
    });
    this.assignments.delete(jobId);

    this.emit("jobRetry", result, retryCount);
    return false;
  }

  // Work Stealing - called when a device is idle but has no work
  stealWork(
    thiefId: string,
    maxJobs: number = this.STEAL_BATCH_SIZE,
  ): JobChunk[] {
    // Find jobs assigned to busy devices that can be stolen
    const stealable: JobChunk[] = [];

    for (const [jobId, assignment] of this.assignments.entries()) {
      if (
        assignment.deviceId !== thiefId &&
        Date.now() - assignment.assignedAt > 5000
      ) {
        // Only steal jobs assigned >5s ago
        const job = this.jobQueue.find((j) => j.id === jobId);
        if (job && job.status === "ASSIGNED") {
          stealable.push(job);
        }
      }

      if (stealable.length >= maxJobs) break;
    }

    // Reassign stolen jobs
    stealable.forEach((job) => {
      const oldDevice = this.assignments.get(job.id)?.deviceId;

      job.assignedTo = thiefId;
      job.assignedAt = Date.now();

      this.assignments.set(job.id, {
        jobId: job.id,
        deviceId: thiefId,
        assignedAt: job.assignedAt,
        expiresAt: job.assignedAt + this.JOB_TIMEOUT,
        retryCount: this.assignments.get(job.id)?.retryCount || 0,
      });

      this.emit("workStolen", job, oldDevice, thiefId);
    });

    return stealable;
  }

  // Check if a device should offer work to steal
  shouldOfferWork(deviceId: string): boolean {
    const deviceJobs = Array.from(this.assignments.values()).filter(
      (a) => a.deviceId === deviceId,
    ).length;

    return deviceJobs >= this.STEAL_THRESHOLD;
  }

  getWorkForDevice(deviceId: string): JobChunk[] {
    return this.jobQueue.filter(
      (job) => job.assignedTo === deviceId && job.status === "ASSIGNED",
    );
  }

  // Metrics
  getMetrics(): QueueMetrics {
    const now = Date.now();
    const pending = this.jobQueue.filter((j) => j.status === "PENDING");
    const assigned = this.jobQueue.filter((j) => j.status === "ASSIGNED");

    const waitTimes = pending
      .filter((j) => j.createdAt)
      .map((j) => now - j.createdAt);

    const jobsByType = this.jobQueue.reduce(
      (acc, job) => {
        acc[job.type] = (acc[job.type] || 0) + 1;
        return acc;
      },
      {} as Record<JobType, number>,
    );

    return {
      totalJobs: this.jobQueue.length,
      pendingJobs: pending.length,
      assignedJobs: assigned.length,
      avgWaitTime:
        waitTimes.length > 0
          ? waitTimes.reduce((a, b) => a + b, 0) / waitTimes.length
          : 0,
      jobsByType,
    };
  }

  getPendingCount(): number {
    return this.jobQueue.filter((j) => j.status === "PENDING").length;
  }

  getAssignedCount(): number {
    return this.assignments.size;
  }

  getFailedCount(): number {
    return this.failedJobs.size;
  }

  // Reaper - handles timeouts and cleanup
  private startReaper(): void {
    setInterval(() => {
      const now = Date.now();

      // Check for timed out assignments
      for (const [jobId, assignment] of this.assignments.entries()) {
        if (now > assignment.expiresAt) {
          console.log(`[Scheduler] Job ${jobId} timed out, retrying...`);

          const job = this.jobQueue.find((j) => j.id === jobId);
          if (job) {
            job.status = "PENDING";
            job.assignedTo = undefined;
            job.assignedAt = undefined;
          }

          this.assignments.delete(jobId);
          this.emit("jobTimeout", jobId);
        }
      }
    }, 5000); // Check every 5 seconds
  }

  private cleanupCompletedJobs(): void {
    // Keep only last 1000 completed jobs to prevent memory bloat
    if (this.completedJobs.size > 1000) {
      const toDelete = Array.from(this.completedJobs).slice(
        0,
        this.completedJobs.size - 1000,
      );
      toDelete.forEach((id) => {
        this.completedJobs.delete(id);
        const index = this.jobQueue.findIndex((j) => j.id === id);
        if (index !== -1) {
          this.jobQueue.splice(index, 1);
        }
      });
    }
  }

  // Emergency flush - clear all pending jobs
  flush(): JobChunk[] {
    const pending = this.jobQueue.filter((j) => j.status === "PENDING");
    pending.forEach((job) => {
      job.status = "COMPLETED";
      this.emit("jobFlushed", job);
    });
    return pending;
  }

  dispose(): void {
    this.jobQueue = [];
    this.assignments.clear();
    this.completedJobs.clear();
    this.failedJobs.clear();
    this.removeAllListeners();
  }
}
```

## File: shared/types.ts
```typescript
export type ChunkStatus = "PENDING" | "ASSIGNED" | "COMPLETED";
export type DeviceType = "DESKTOP" | "MOBILE" | "COLAB" | "SERVER" | "TABLET";
export type DeviceStatus = "ONLINE" | "OFFLINE" | "BUSY" | "ERROR";

export type JobErrorType =
  | "OOM_PREVENTED"
  | "CPU_SATURATED"
  | "EXECUTION_ERROR"
  | "DEVICE_DISCONNECTED"
  | "TIMEOUT";

export type JobType = "MATH_STRESS" | "MAT_MUL" | "TEXT_TOKENIZE" | "CUSTOM";

export interface JobChunk {
  id: string;
  type: JobType;
  data: any;
  script?: string;
  status: ChunkStatus;
  priority?: number;
  assignedTo?: string;
  assignedAt?: number;
  createdAt: number;
}

export interface WorkerResult {
  chunkId: string;
  workerId: string;
  deviceId?: string;
  result?: any;
  error?: JobErrorType;
  details?: string;
  durationMs?: number;
  timestamp: number;
}

export interface WorkerPayload {
  chunk: JobChunk;
  workerId: string;
}

// Enhanced Device Types for Multi-Device Swarm
export interface DeviceCapabilities {
  cpuCores: number;
  memoryGB: number;
  gpuAvailable: boolean;
  gpuType?: string;
  maxConcurrency: number;
  supportedJobs: JobType[];
}

export interface DeviceInfo {
  id: string;
  socketId: string;
  name: string;
  type: DeviceType;
  status: DeviceStatus;
  capabilities: DeviceCapabilities;

  // Performance Metrics
  opsScore: number;
  currentLoad: number;
  totalJobsCompleted: number;
  avgJobDuration: number;

  // Connection Info
  ip?: string;
  region?: string;
  connectedAt: number;
  lastHeartbeat: number;

  // Throttling
  throttleLevel: number;
  isThrottled: boolean;
}

export interface SwarmStats {
  totalDevices: number;
  onlineDevices: number;
  busyDevices: number;
  totalCores: number;
  totalMemoryGB: number;

  // Job Stats
  pendingJobs: number;
  activeJobs: number;
  completedJobs: number;
  failedJobs: number;

  // Performance
  globalVelocity: number;
  avgLatency: number;

  // By Device Type
  devicesByType: Record<DeviceType, number>;
}

export interface JoinCode {
  code: string;
  expiresAt: number;
  maxUses: number;
  usedCount: number;
  createdBy: string;
  metadata?: {
    description?: string;
    tags?: string[];
  };
}

export interface WorkStealRequest {
  thiefId: string;
  victimId: string;
  requestedJobs: number;
}

export interface DeviceHealth {
  deviceId: string;
  timestamp: number;
  cpuUsage: number;
  memoryUsage: number;
  temperature?: number;
  networkLatency: number;
  isHealthy: boolean;
}

// Events
export type SwarmEvent =
  | { type: "DEVICE_JOINED"; device: DeviceInfo }
  | { type: "DEVICE_LEFT"; deviceId: string }
  | { type: "DEVICE_STATUS_CHANGED"; deviceId: string; status: DeviceStatus }
  | { type: "JOB_ASSIGNED"; jobId: string; deviceId: string }
  | { type: "JOB_COMPLETED"; result: WorkerResult }
  | { type: "JOB_FAILED"; jobId: string; error: JobErrorType }
  | { type: "WORK_STOLEN"; from: string; to: string; count: number }
  | { type: "HEARTBEAT"; deviceId: string; health: DeviceHealth };
```

## File: client/src/App.tsx
```typescript
import { useState, useEffect, useCallback } from "react";
import { Zap, Share2 } from "lucide-react";
import { useComputeSwarm } from "./hooks/useComputeSwarm";

import { GpuStatusMonitor } from "./components/dashboard/GpuStatusMonitor";
import { DeviceHealth } from "./components/dashboard/DeviceHealth";
import { ThrottleControl } from "./components/dashboard/ThrottleControl";
import { LiveTerminal } from "./components/dashboard/LiveTerminal";
import { DeviceConnector } from "./components/dashboard/DeviceConnector";
import { ThemeToggle } from "./components/ui/ThemeToggle";

import { SwarmDashboard } from "./components/dashboard/SwarmDashboard";
import type { DeviceInfo, SwarmStats } from "../../shared/types";
import { SwarmControls } from "./components/dashboard/SwarmControls";

function App() {
  const [showQR, setShowQR] = useState(false);
  const [logs, setLogs] = useState<string[]>([]);

  // Swarm state
  const [devices, setDevices] = useState<DeviceInfo[]>([]);
  const [swarmStats, setSwarmStats] = useState<SwarmStats>({
    totalDevices: 0,
    onlineDevices: 0,
    busyDevices: 0,
    totalCores: 0,
    totalMemoryGB: 0,
    pendingJobs: 0,
    activeJobs: 0,
    completedJobs: 0,
    failedJobs: 0,
    globalVelocity: 0,
    avgLatency: 0,
    devicesByType: {
      DESKTOP: 0,
      MOBILE: 0,
      COLAB: 0,
      SERVER: 0,
      TABLET: 0,
    },
  });
  const [joinCode, setJoinCode] = useState("LOADING...");
  // 1. Create a stable log function
  const addLog = useCallback((msg: string) => {
    setLogs((prev) => [...prev.slice(-19), `> ${msg}`]); // Keep last 20
  }, []);
  const {
    status,
    completedCount,
    workerId,
    opsScore,
    updateThrottle,
    throttle,
    activeThreads,
    socket,
    isRunning,
    startSwarm,
    pauseSwarm,
    stopSwarm,
  } = useComputeSwarm(addLog);
  // Listen for swarm updates
  useEffect(() => {
    if (!socket) return;
    // 1. Fetch the initial list of connected devices via REST
    const fetchDevices = () => {
      fetch(`${serverUrl}/api/devices`)
        .then((res) => res.json())
        .then((data) => setDevices(data))
        .catch((err) => console.error("Fetch error:", err));
    };

    // 3. Initial Fetch (Get data immediately upon connection)
    fetchDevices();
    // 4. Polling Fallback (Refresh every 5 seconds)
    // This guarantees the list fixes itself even if an event is missed
    const interval = setInterval(fetchDevices, 5000);

    // 5. Real-time Listeners
    socket.on("DEVICE_JOINED", fetchDevices); // Just re-fetch to be safe
    socket.on("DEVICE_LEFT", fetchDevices);
    socket.on("CURRENT_DEVICES", (data) => setDevices(data));
    // 2. Fetch initial stats
    fetch(`${serverUrl}/api/stats`)
      .then((res) => res.json())
      .then((data) => {
        setSwarmStats(data);
      })
      .catch((err) => console.error("Failed to fetch stats:", err));

    // Request initial join code
    socket.emit("REQUEST_JOIN_CODE");

    socket.on("JOIN_CODE", (data: { code: string }) => {
      setJoinCode(data.code);
    });

    socket.on("SWARM_STATS", (stats: SwarmStats) => {
      setSwarmStats(stats);
    });

    socket.on("DEVICE_JOINED", (device: DeviceInfo) => {
      // 1. Update the Device List (Deduplicate)
      setDevices((prev) => {
        // If we already have this device ID, just update it (don't add duplicates)
        const exists = prev.some((d) => d.id === device.id);

        // ONLY log if this is actually a new device
        if (!exists) {
          setLogs((currentLogs) => [
            ...currentLogs.slice(-8),
            `> [${new Date().toLocaleTimeString()}] Device joined: ${device.name}`,
          ]);
        }

        // Return the updated list (filter out old version, add new)
        return [...prev.filter((d) => d.id !== device.id), device];
      });
    });
    // New listener for the direct update from server
    socket.on("CURRENT_DEVICES", (currentDevices: DeviceInfo[]) => {
      setDevices(currentDevices);
    });
    socket.on("DEVICE_LEFT", (data: { deviceId: string }) => {
      setDevices((prev) => {
        const device = prev.find((d) => d.id === data.deviceId);
        if (device) {
          setLogs((logs) => [
            ...logs.slice(-8),
            `> [${new Date().toLocaleTimeString()}] Device left: ${device.name}`,
          ]);
        }
        return prev.filter((d) => d.id !== data.deviceId);
      });
    });

    return () => {
      socket.off("JOIN_CODE");
      socket.off("SWARM_STATS");
      clearInterval(interval);
      socket.off("DEVICE_JOINED");
      socket.off("DEVICE_LEFT");
      socket.off("CURRENT_DEVICES");
    };
  }, [socket]);

  const serverUrl = `${window.location.protocol}//${window.location.host}`;

  return (
    <div className="min-h-screen relative bg-grain p-6 md:p-12 transition-colors duration-500">
      {/* HEADER */}
      <header className="flex justify-between items-center mb-12 relative z-10 max-w-7xl mx-auto">
        <div className="flex items-center gap-4">
          <div className="w-12 h-12 bg-linear-to-br from-indigo-500 to-violet-600 rounded-2xl flex items-center justify-center shadow-lg shadow-indigo-500/20">
            <Zap className="text-white fill-white" size={24} />
          </div>
          <div>
            <h1 className="text-2xl font-bold tracking-tight text-arc-text">
              Ostrich Legs
            </h1>
            <div className="flex items-center gap-2">
              <span
                className={`flex h-2 w-2 rounded-full ${
                  status === "WORKING"
                    ? "bg-emerald-500 animate-pulse"
                    : "bg-arc-muted"
                }`}
              />
              <p className="text-arc-muted text-xs font-medium uppercase tracking-wider">
                {status === "WORKING" ? "Swarm Active" : "Swarm Idle"}
              </p>
            </div>
          </div>
        </div>

        <div className="flex gap-3">
          <ThemeToggle />
          <button
            onClick={() => setShowQR(true)}
            className="group flex items-center gap-2 px-5 py-2.5 rounded-full bg-arc-card border border-arc-border hover:border-indigo-500/30 transition-all shadow-sm active:scale-95"
          >
            <Share2
              size={16}
              className="text-arc-muted group-hover:text-indigo-500 transition-colors"
            />
            <span className="text-sm font-semibold text-arc-text group-hover:text-indigo-500">
              Connect
            </span>
          </button>
        </div>
      </header>

      {/* DASHBOARD GRID */}
      <div className="grid grid-cols-1 md:grid-cols-12 gap-6 max-w-7xl mx-auto relative z-10">
        {/* Main Row */}
        <GpuStatusMonitor
          completedCount={completedCount}
          throttle={throttle}
          currentThrottle={throttle}
        />
        <div className="md:col-span-4 h-90 flex gap-4">
          {/* 1. The Health Card (Takes remaining width) */}
          <DeviceHealth
            className="flex-1 h-full"
            status={status}
            opsScore={opsScore}
            workerId={workerId}
          />
          {/* 2. The Vertical Controls Strip */}
          <SwarmControls
            isRunning={isRunning}
            status={status}
            onStart={startSwarm}
            onPause={pauseSwarm}
            onStop={stopSwarm}
          />
        </div>

        {/* Control Row */}
        <ThrottleControl
          throttle={throttle}
          setThrottle={(val) => updateThrottle(val)} // Wiring fixed
          updateThrottle={() => {}} // Deprecated prop, can remove from component
          activeThreads={activeThreads}
        />
        <LiveTerminal logs={logs} status={status} />

        {/* Swarm Overview */}
        <SwarmDashboard devices={devices} stats={swarmStats} />

        {/* Logs */}
      </div>
      <DeviceConnector
        isOpen={showQR}
        joinCode={joinCode}
        serverUrl={serverUrl}
        onClose={() => setShowQR(false)}
      />
    </div>
  );
}

export default App;
```

## File: server/src/index.ts
```typescript
console.log("Starting Ostrich Swarm Coordinator...");

import express from "express";
import { createServer } from "http";
import { Server } from "socket.io";
import cors from "cors";
import { SwarmCoordinator } from "./swarm";
import {
  type JobChunk,
  type WorkerResult,
  type DeviceInfo,
  type DeviceType,
  type DeviceCapabilities,
} from "../../shared/types";

const app = express();
app.use(cors());
app.use(express.json());

const httpServer = createServer(app);
const io = new Server(httpServer, {
  cors: { origin: "*", methods: ["GET", "POST"] },
  transports: ["websocket", "polling"], // Support both for mobile/Colab compatibility
});

// Initialize Swarm Coordinator
const swarm = new SwarmCoordinator(io, {
  enableWorkStealing: true,
  enableHealthChecks: true,
  autoRebalance: true,
});

// Generate initial join code
const initialJoinCode = swarm.generateJoinCode({
  maxUses: 1000,
  metadata: {
    description: "Default swarm join code",
    tags: ["general"],
  },
});
console.log(`[Server] Initial join code: ${initialJoinCode}`);

// REST API Endpoints

// Get swarm statistics
app.get("/api/stats", (req, res) => {
  res.json(swarm.getStats());
});

// Get all connected devices
app.get("/api/devices", (req, res) => {
  res.json(swarm.getDevices());
});

// Generate new join code
app.post("/api/join-codes", (req, res) => {
  const { maxUses, expiresIn, description } = req.body;
  const code = swarm.generateJoinCode({
    maxUses,
    expiresIn,
    metadata: { description },
  });
  res.json({ code, url: `/join/${code}` });
});

// Validate join code
app.get("/api/join-codes/:code", (req, res) => {
  const result = swarm.validateJoinCode(req.params.code);
  res.json(result);
});

// Submit jobs via REST API (for Colab/batch processing)
app.post("/api/jobs", (req, res) => {
  const jobs: JobChunk[] = req.body.jobs;

  if (!Array.isArray(jobs)) {
    res.status(400).json({ error: "Jobs must be an array" });
    return;
  }

  jobs.forEach((job) => {
    job.id =
      job.id ||
      `job-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`;
    swarm.submitJob(job);
  });

  res.json({
    submitted: jobs.length,
    jobIds: jobs.map((j) => j.id),
  });
});

// Get job queue status
app.get("/api/jobs/status", (req, res) => {
  // Access scheduler metrics through coordinator
  const stats = swarm.getStats();
  res.json({
    pending: stats.pendingJobs,
    active: stats.activeJobs,
    completed: stats.completedJobs,
    failed: stats.failedJobs,
  });
});

// Socket.IO Handlers
io.on("connection", (socket) => {
  console.log(`[Socket] New connection: ${socket.id}`);

  let deviceId: string | null = null;

  // Send join code on request
  socket.on("REQUEST_JOIN_CODE", () => {
    socket.emit("JOIN_CODE", { code: initialJoinCode });
  });

  // Device Registration
  socket.on(
    "REGISTER_DEVICE",
    (data: {
      name?: string;
      type?: DeviceType;
      capabilities?: DeviceCapabilities;
      opsScore?: number;
      joinCode?: string;
    }) => {
      // Validate join code if provided
      if (data.joinCode) {
        const validation = swarm.validateJoinCode(data.joinCode);
        if (!validation.valid) {
          socket.emit("REGISTRATION_FAILED", { error: validation.error });
          return;
        }
        swarm.useJoinCode(data.joinCode);
      }

      // Register device
      const device = swarm.registerDevice(socket.id, {
        name: data.name,
        type: data.type || "DESKTOP",
        capabilities: data.capabilities,
        opsScore: data.opsScore,
      });

      deviceId = device.id;

      socket.emit("REGISTERED", {
        deviceId: device.id,
        swarmStats: swarm.getStats(),
      });
      socket.emit("CURRENT_DEVICES", swarm.getDevices());
      console.log(
        `[Socket] Device registered: ${device.name} (${device.type})`,
      );
    },
  );

  // Work Requests
  socket.on("REQUEST_WORK", () => {
    if (!deviceId) {
      socket.emit("ERROR", { message: "Device not registered" });
      return;
    }

    const job = swarm.requestWork(deviceId);
    if (job) {
      socket.emit("JOB_DISPATCH", job);
    } else {
      socket.emit("NO_WORK");
    }
  });

  socket.on("REQUEST_BATCH", (count: number) => {
    if (!deviceId) {
      socket.emit("ERROR", { message: "Device not registered" });
      return;
    }

    const jobs = swarm.requestBatch(deviceId, count);
    if (jobs.length > 0) {
      socket.emit("BATCH_DISPATCH", jobs);
    } else {
      socket.emit("NO_WORK");
    }
  });

  // Job Completion
  socket.on("JOB_COMPLETE", (result: WorkerResult) => {
    if (!deviceId) return;

    result.deviceId = deviceId;
    result.timestamp = Date.now();

    swarm.completeJob(result);
    socket.emit("WORK_ACK", { chunkId: result.chunkId });
  });

  // Work Stealing
  socket.on("STEAL_WORK", () => {
    if (!deviceId) return;

    const stolen = swarm.stealWork(deviceId);
    if (stolen.length > 0) {
      socket.emit("BATCH_DISPATCH", stolen);
    }
  });

  socket.on("OFFER_WORK", () => {
    if (!deviceId) return;

    const jobs = swarm.offerWork(deviceId);
    if (jobs.length > 0) {
      socket.emit("WORK_OFFLOADED", jobs);
    }
  });

  // Health & Monitoring
  socket.on(
    "HEARTBEAT",
    (health: {
      cpuUsage: number;
      memoryUsage: number;
      temperature?: number;
      networkLatency: number;
      currentLoad: number;
    }) => {
      if (!deviceId) return;

      swarm.recordHeartbeat(deviceId, {
        deviceId,
        timestamp: Date.now(),
        cpuUsage: health.cpuUsage,
        memoryUsage: health.memoryUsage,
        temperature: health.temperature,
        networkLatency: health.networkLatency,
        isHealthy: health.cpuUsage < 95 && health.memoryUsage < 90,
      });

      // Update load
      swarm["registry"].updateLoad(deviceId, health.currentLoad);
    },
  );

  socket.on("BENCHMARK_RESULT", (data: { opsScore: number }) => {
    if (!deviceId) return;

    swarm.updateDeviceStats(deviceId, { opsScore: data.opsScore });
  });

  // Throttling
  socket.on("UPDATE_THROTTLE", (data: { level: number }) => {
    if (!deviceId) return;

    const device = swarm.getDevice(deviceId);
    if (device) {
      device.throttleLevel = data.level;
      device.isThrottled = data.level < 1.0;
    }
  });

  // Disconnection
  socket.on("disconnect", () => {
    if (deviceId) {
      swarm.unregisterDevice(deviceId);
      console.log(`[Socket] Device disconnected: ${deviceId}`);
    }
  });
});

// Swarm Event Listeners
swarm.on("deviceJoined", (device: DeviceInfo) => {
  io.emit("DEVICE_JOINED", device);
});

swarm.on("deviceLeft", (deviceId: string) => {
  io.emit("DEVICE_LEFT", { deviceId });
});

swarm.on("jobAssigned", (job: JobChunk, deviceId: string) => {
  console.log(`[Swarm] Job ${job.id} assigned to ${deviceId}`);
});

swarm.on("workStolen", (jobs: JobChunk[], from: string, to: string) => {
  console.log(`[Swarm] Work stolen: ${jobs.length} jobs from ${from} to ${to}`);
});

// Job Generator - Keep the queue full with sample jobs
function generateSampleJobs(count: number = 50): void {
  const jobs: JobChunk[] = [];

  for (let i = 0; i < count; i++) {
    const isMatrix = Math.random() > 0.5;

    if (isMatrix) {
      // Matrix multiplication job
      const size = 200 + Math.floor(Math.random() * 100);
      jobs.push({
        id: `mat-${Date.now()}-${i}`,
        type: "MAT_MUL",
        data: {
          size,
          matrixA: Array(size)
            .fill(0)
            .map(() =>
              Array(size)
                .fill(0)
                .map(() => Math.random()),
            ),
          matrixB: Array(size)
            .fill(0)
            .map(() =>
              Array(size)
                .fill(0)
                .map(() => Math.random()),
            ),
        },
        status: "PENDING",
        createdAt: Date.now(),
      });
    } else {
      // Math stress job
      jobs.push({
        id: `stress-${Date.now()}-${i}`,
        type: "MATH_STRESS",
        data: {
          iterations: 2000000 + Math.floor(Math.random() * 1000000),
        },
        status: "PENDING",
        createdAt: Date.now(),
      });
    }
  }

  swarm.submitBatch(jobs);
  console.log(`[Generator] Generated ${count} sample jobs`);
}

// Generate initial jobs
setTimeout(() => generateSampleJobs(100), 1000);

// Auto-refill jobs when queue is low
setInterval(() => {
  const stats = swarm.getStats();
  if (stats.pendingJobs < 50) {
    generateSampleJobs(50);
  }
}, 30000);

// Start server
try {
  const PORT = process.env.PORT || 3000;
  httpServer.listen(PORT, () => {
    console.log(`[Server] Ostrich Swarm Coordinator running on port: ${PORT}`);
    console.log(
      `[Server] Join URL: http://localhost:${PORT}/join/${initialJoinCode}`,
    );
  });
} catch (e) {
  console.error("[Server] Failed to start:", e);
}
```
