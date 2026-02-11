import { Database, Zap, Activity } from "lucide-react";
import { Card } from "../../components/Card";
import { type SwarmStats } from "../../core/types";

interface Props {
  stats: SwarmStats;
  onlineCount: number;
}

export const ResourceStats = ({ stats, onlineCount }: Props) => {
  return (
    <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
      <StatItem
        label="Online Nodes"
        value={onlineCount}
        icon={<Database size={18} className="text-blue-600" />}
        gradient="from-blue-50 to-blue-100/50"
        border="border-blue-100"
      />
      <StatItem
        label="Active Jobs"
        value={stats.activeJobs}
        icon={<Activity size={18} className="text-brand-orange" />}
        gradient="from-orange-50 to-orange-100/50"
        border="border-orange-100"
      />
      <StatItem
        label="Pending"
        value={stats.pendingJobs}
        icon={<Zap size={18} className="text-purple-600" />}
        gradient="from-purple-50 to-purple-100/50"
        border="border-purple-100"
      />
    </div>
  );
};

const StatItem = ({ label, value, icon, gradient, border }: any) => (
  <Card
    className={`p-5 bg-linear-to-br ${gradient} border ${border} hover:-translate-y-1 transition-transform duration-300 shadow-sm`}
  >
    <div className="flex justify-between items-start">
      <div>
        <p className="text-[10px] font-black text-text-muted uppercase tracking-widest mb-2">
          {label}
        </p>
        <p className="text-3xl font-black text-text-main tracking-tight">
          {value.toLocaleString()}
        </p>
      </div>
      <div className="p-3 bg-white rounded-xl shadow-sm border border-white/50">
        {icon}
      </div>
    </div>
  </Card>
);
