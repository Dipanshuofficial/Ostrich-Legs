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
