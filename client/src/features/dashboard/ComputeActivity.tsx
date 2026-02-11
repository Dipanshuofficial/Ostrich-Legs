import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  ResponsiveContainer,
  Cell,
  Tooltip,
} from "recharts";
import { Card } from "../../components/Card";

const data = [
  { day: "Mon", value: 4.6 },
  { day: "Tue", value: 6.3 },
  { day: "Wed", value: 4.8 },
  { day: "Thu", value: 7.8, peak: true },
  { day: "Fri", value: 6.1 },
  { day: "Sat", value: 4.7 },
  { day: "Sun", value: 5.2 },
];

export const ComputeActivity = () => {
  return (
    <Card className="h-96 flex flex-col">
      <div className="flex justify-between items-center mb-6 shrink-0">
        <div>
          <h3 className="font-bold text-lg text-text-main">Compute Activity</h3>
          <p className="text-xs text-text-muted mt-1 italic">
            Peak activity detected on Thursday at 7.8 Hrs
          </p>
        </div>
        <div className="flex gap-1 bg-surface-muted p-1 rounded-lg border border-border-soft">
          {["Week", "Month", "Year"].map((t) => (
            <button
              key={t}
              className={`px-3 py-1 text-[10px] font-bold rounded ${t === "Week" ? "bg-surface-white shadow-sm text-text-main" : "text-text-muted"}`}
            >
              {t}
            </button>
          ))}
        </div>
      </div>

      {/* Constraints added here to fix width(-1) error */}
      <div className="flex-1 w-full min-h-0 min-w-0">
        <ResponsiveContainer width="100%" height="100%">
          <BarChart
            data={data}
            margin={{ top: 10, right: 0, left: -20, bottom: 0 }}
          >
            <XAxis
              dataKey="day"
              axisLine={false}
              tickLine={false}
              tick={{ fontSize: 10, fontWeight: 600, fill: "#9ca3af" }}
              dy={10}
            />
            <YAxis hide domain={[0, 10]} />
            <Tooltip
              cursor={{ fill: "transparent" }}
              content={({ active, payload }) => {
                if (active && payload && payload.length) {
                  return (
                    <div className="bg-gray-900 text-white px-3 py-1.5 rounded-lg text-xs font-bold shadow-xl border border-white/10">
                      {payload[0].value} Hrs
                    </div>
                  );
                }
                return null;
              }}
            />
            <Bar dataKey="value" radius={[6, 6, 6, 6]} barSize={40}>
              {data.map((entry, index) => (
                <Cell
                  key={`cell-${index}`}
                  fill={entry.peak ? "url(#peakGradient)" : "#e5e7eb"}
                />
              ))}
            </Bar>
            <defs>
              <linearGradient id="peakGradient" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor="#ff7d54" stopOpacity={1} />
                <stop offset="100%" stopColor="#ffb09c" stopOpacity={0.6} />
              </linearGradient>
            </defs>
          </BarChart>
        </ResponsiveContainer>
      </div>
    </Card>
  );
};
