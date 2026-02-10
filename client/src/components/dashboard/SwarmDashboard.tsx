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
  Unplug,
  type LucideIcon,
} from "lucide-react";

import {
  type DeviceInfo,
  type DeviceType,
  DeviceState,
  type SwarmSnapshot,
} from "../../../../shared/types";

interface SwarmDashboardProps {
  devices: DeviceInfo[];
  stats: SwarmSnapshot["stats"] & {
    onlineDevices: number;
    totalDevices: number;
    globalVelocity: number;
    totalCores: number;
    totalMemoryGB: number;
  };
  onToggleDevice?: (id: string, state: boolean) => void;
}

export function SwarmDashboard({
  devices,
  stats,
  onToggleDevice,
}: SwarmDashboardProps) {
  const getDeviceIcon = (type: DeviceType) => {
    switch (type) {
      case "MOBILE":
        return Smartphone;
      case "SERVER":
        return Server;
      default:
        return Laptop;
    }
  };

  const getStatusColor = (status: DeviceState) => {
    switch (status) {
      case "ONLINE":
        return "#10b981";
      case "BUSY":
        return "#f59e0b";
      case "ERROR":
        return "#f43f5e";
      case "DISABLED":
        return "#52525b";
      default:
        return "#6b7280";
    }
  };

  const getStatusIcon = (status: DeviceState) => {
    switch (status) {
      case "ONLINE":
        return Wifi;
      case "BUSY":
        return Activity;
      case "ERROR":
        return AlertCircle;
      case "DISABLED":
        return Unplug;
      default:
        return WifiOff;
    }
  };

  return (
    <Card className="md:col-span-12 h-auto" noPadding>
      <div className="p-6">
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
          <div className="text-right">
            <p className="text-2xl font-bold text-arc-text">
              {stats.globalVelocity}
            </p>
            <p className="text-xs text-arc-muted">jobs/sec</p>
          </div>
        </div>

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

        <div>
          <p className="text-xs font-medium text-arc-muted uppercase tracking-wider mb-3">
            Connected Devices
          </p>
          <div className="space-y-2 max-h-64 overflow-y-auto">
            {devices.map((device) => {
              const Icon = getDeviceIcon(device.type);
              const StatusIcon = getStatusIcon(device.state);
              const statusColor = getStatusColor(device.state);
              const isEnabled = device.state !== DeviceState.DISABLED;

              return (
                <div
                  key={device.id}
                  className={`flex items-center gap-3 p-3 rounded-xl bg-arc-bg border border-arc-border transition-all ${isEnabled ? "hover:border-indigo-500/30" : "opacity-60"}`}
                >
                  <div
                    className="w-10 h-10 rounded-lg flex items-center justify-center"
                    style={{ backgroundColor: `${statusColor}15` }}
                  >
                    <Icon size={18} style={{ color: statusColor }} />
                  </div>

                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <span className="text-sm font-medium text-arc-text truncate">
                        {device.name}
                      </span>
                      <StatusIcon size={12} style={{ color: statusColor }} />
                    </div>
                    <div className="flex items-center gap-2 text-xs text-arc-muted">
                      <span>{device.capabilities?.cpuCores} cores</span>
                      <span>•</span>
                      <span>{device.capabilities?.memoryGB}GB</span>
                    </div>
                  </div>

                  <button
                    onClick={() => onToggleDevice?.(device.id, !isEnabled)}
                    className={`w-12 h-6 rounded-full p-1 transition-colors relative ${isEnabled ? "bg-emerald-500/20" : "bg-zinc-500/20"}`}
                  >
                    <div
                      className={`w-4 h-4 rounded-full shadow-sm transition-all duration-300 ${isEnabled ? "translate-x-6 bg-emerald-500" : "translate-x-0 bg-zinc-400"}`}
                    />
                  </button>

                  <div className="text-right w-20">
                    <div className="text-sm font-medium text-arc-text">
                      {device.totalJobsCompleted}
                    </div>
                    <div className="text-xs text-arc-muted">jobs</div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </Card>
  );
}

function StatBox({
  label,
  value,
  icon: Icon,
  color,
}: {
  label: string;
  value: string | number;
  icon: LucideIcon;
  color: string;
}) {
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
