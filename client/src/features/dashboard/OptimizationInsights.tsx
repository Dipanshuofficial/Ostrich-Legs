import { Sparkles } from "lucide-react";
import { Card } from "../../components/Card";

interface Insight {
  id: string;
  text: string;
  isWarning?: boolean;
}

const INSIGHTS: Insight[] = [
  {
    id: "1",
    text: "Shift 3 non-urgent pipelines out of Thursday's peak window to cut ~2.1 GPU hrs.",
  },
  {
    id: "2",
    text: "Scale down idle workers between 01:00-05:00 where utilization stays below 20%.",
    isWarning: true,
  },
  {
    id: "3",
    text: "Batch short experiments (<1 min) together to reduce scheduling overhead by ~15%.",
  },
];

export const OptimizationInsights = () => (
  // STRICT THEME USAGE: Gradients use brand colors defined in theme.css
  <Card className="bg-linear-to-br from-brand-orange/10 via-brand-peach/10 to-transparent border border-brand-orange/20 relative">
    <div className="flex justify-between items-center mb-6">
      <h3 className="font-bold text-lg text-text-main">
        Optimization Insights
      </h3>
      <Sparkles size={18} className="text-brand-orange" />
    </div>

    <div className="space-y-4 mb-8">
      {INSIGHTS.map((item) => (
        <div
          key={item.id}
          className="bg-surface-white/60 backdrop-blur-md p-4 rounded-2xl border border-surface-white shadow-sm flex gap-3"
        >
          <div
            className={`w-1 rounded-full shrink-0 ${item.isWarning ? "bg-amber-400" : "bg-brand-orange"}`}
          />
          <p className="text-[11px] font-semibold leading-relaxed text-text-main">
            {item.text}
          </p>
        </div>
      ))}
    </div>

    <button className="w-full bg-text-main text-surface-white py-3.5 rounded-2xl text-xs font-bold flex items-center justify-center gap-2 hover:opacity-90 transition-all shadow-xl shadow-text-main/20 active:scale-[0.98]">
      <Sparkles size={14} className="text-brand-orange fill-brand-orange" />
      Execute all recommendations
    </button>
  </Card>
);
