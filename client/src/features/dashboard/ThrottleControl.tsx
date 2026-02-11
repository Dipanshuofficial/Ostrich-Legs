import { Card } from "../../components/Card";
import { Cpu, Server, Box } from "lucide-react"; // Added Box for GPU icon

interface Props {
  value: number;
  onChange: (val: number) => void;
  totalCores: number;
  totalMemory: number;
  totalGPUs: number; // New Prop
}

export const ThrottleControl = ({
  value,
  onChange,
  totalCores = 0,
  totalMemory = 0,
  totalGPUs = 0,
}: Props) => {
  const percent = value / 100;

  return (
    <Card className="relative overflow-hidden group p-5 bg-surface-white">
      <div className="flex justify-between items-center mb-6">
        <div>
          <h3 className="font-bold text-sm text-text-muted uppercase tracking-widest">
            Global Allocation
          </h3>
          <p className="text-2xl font-black text-text-main">{value}%</p>
        </div>

        {/* Resource Badges */}
        <div className="flex flex-wrap gap-2 justify-end max-w-45">
          {/* CPU */}
          <div className="flex items-center gap-1.5 bg-gray-50 px-2 py-1 rounded-lg border border-gray-100">
            <Cpu size={12} className="text-brand-orange" />
            <span className="text-[10px] font-bold text-gray-600">
              {Math.round(totalCores * percent)} / {totalCores}
            </span>
          </div>

          {/* RAM */}
          <div className="flex items-center gap-1.5 bg-gray-50 px-2 py-1 rounded-lg border border-gray-100">
            <Server size={12} className="text-blue-500" />
            <span className="text-[10px] font-bold text-gray-600">
              {Math.round(totalMemory * percent)} GB
            </span>
          </div>

          {/* GPU (New) */}
          <div
            className={`flex items-center gap-1.5 px-2 py-1 rounded-lg border ${totalGPUs > 0 ? "bg-purple-50 border-purple-100" : "bg-gray-50 border-gray-100 opacity-50"}`}
          >
            <Box
              size={12}
              className={totalGPUs > 0 ? "text-purple-600" : "text-gray-400"}
            />
            <span
              className={`text-[10px] font-bold ${totalGPUs > 0 ? "text-purple-700" : "text-gray-400"}`}
            >
              {totalGPUs} GPU{totalGPUs !== 1 ? "s" : ""}
            </span>
          </div>
        </div>
      </div>

      <input
        type="range"
        min="10"
        max="100"
        step="10"
        value={value}
        onChange={(e) => onChange(parseInt(e.target.value))}
        className="w-full h-2 bg-gray-100 rounded-lg appearance-none cursor-pointer accent-brand-orange transition-all hover:bg-gray-200"
      />

      <div className="flex justify-between mt-3 text-[10px] font-bold text-text-muted uppercase tracking-tighter">
        <span>Eco Mode</span>
        <span>Balanced</span>
        <span>Max Performance</span>
      </div>
    </Card>
  );
};
