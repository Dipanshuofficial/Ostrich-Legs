import { Card } from "../../components/Card";

interface Props {
  readonly total: number;
  readonly completed: number;
}

export const JobGauge = ({ total, completed }: Props) => {
  const percentage = total > 0 ? Math.round((completed / total) * 100) : 0;
  const radius = 45;
  const circumference = 2 * Math.PI * radius;
  const strokeDashoffset = circumference - (percentage / 100) * circumference;

  return (
    <Card className="flex flex-col items-center justify-center p-6 bg-surface-white">
      <div className="relative w-40 h-40 mb-4">
        {/* Rotated SVG container to start from 12 o'clock */}
        <svg className="w-full h-full -rotate-90" viewBox="0 0 128 128">
          {/* Background Track */}
          <circle
            cx="64"
            cy="64"
            r={radius}
            stroke="#f3f4f6"
            strokeWidth="12"
            fill="transparent"
            strokeLinecap="round"
          />
          {/* Active Progress */}
          <circle
            cx="64"
            cy="64"
            r={radius}
            stroke="#ff7d54"
            strokeWidth="12"
            fill="transparent"
            strokeDasharray={circumference}
            strokeDashoffset={strokeDashoffset}
            strokeLinecap="round"
            className="transition-all duration-1000 ease-out"
          />
        </svg>

        {/* Center Text (Counter-rotated to stay upright) */}
        <div className="absolute inset-0 flex flex-col items-center justify-center">
          <span className="text-3xl font-black text-text-main">{total}</span>
          <span className="text-[10px] font-bold text-text-muted uppercase tracking-widest">
            Total Jobs
          </span>
        </div>
      </div>

      <div className="w-full space-y-2 px-2">
        <div className="flex justify-between text-[10px] font-bold text-text-muted uppercase">
          <span>Progress</span>
          <span>{percentage}%</span>
        </div>
        <div className="w-full h-2 bg-gray-100 rounded-full overflow-hidden shadow-inner">
          <div
            className="h-full bg-brand-orange transition-all duration-500"
            style={{ width: `${percentage}%` }}
          />
        </div>
      </div>
    </Card>
  );
};
