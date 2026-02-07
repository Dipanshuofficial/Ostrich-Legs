import { useState, useEffect } from "react";
import { Card } from "../ui/Card";
import { QrCode, Copy, Check, Smartphone, Laptop, Server } from "lucide-react";
import { QRCodeSVG } from "qrcode.react";
import type { DeviceType } from "../../../shared/types";

interface DeviceConnectorProps {
  serverUrl: string;
  joinCode: string;
  onJoinCodeChange?: (code: string) => void;
}

export function DeviceConnector({ serverUrl, joinCode, onJoinCodeChange }: DeviceConnectorProps) {
  const [copied, setCopied] = useState(false);
  const [showQR, setShowQR] = useState(true);
  const [customCode, setCustomCode] = useState("");
  const [activeTab, setActiveTab] = useState<"qr" | "code" | "link">("qr");

  const fullJoinUrl = `${serverUrl}/join/${joinCode}`;

  const copyToClipboard = async (text: string) => {
    try {
      await navigator.clipboard.writeText(text);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch (err) {
      console.error("Failed to copy:", err);
    }
  };

  const deviceTypes: Array<{ type: DeviceType; icon: any; label: string; color: string }> = [
    { type: "MOBILE", icon: Smartphone, label: "Mobile", color: "#10b981" },
    { type: "DESKTOP", icon: Laptop, label: "Desktop", color: "#6366f1" },
    { type: "COLAB", icon: Server, label: "Colab/Cloud", color: "#f43f5e" },
  ];

  return (
    <Card className="md:col-span-6 h-auto" noPadding>
      <div className="p-6">
        <div className="flex items-center gap-3 mb-4">
          <div className="w-10 h-10 rounded-xl bg-indigo-500/10 flex items-center justify-center">
            <QrCode className="text-indigo-500" size={20} />
          </div>
          <div>
            <h3 className="text-lg font-medium text-arc-text">Connect Devices</h3>
            <p className="text-sm text-arc-muted">Add mobile, laptop, or cloud resources</p>
          </div>
        </div>

        {/* Tabs */}
        <div className="flex gap-2 mb-4">
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
                  ? "bg-indigo-500 text-white"
                  : "bg-arc-bg text-arc-muted hover:text-arc-text"
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>

        {/* QR Code Tab */}
        {activeTab === "qr" && (
          <div className="flex flex-col items-center gap-4">
            <div className="p-4 bg-white rounded-xl">
              <QRCodeSVG
                value={fullJoinUrl}
                size={180}
                level="H"
                includeMargin={false}
              />
            </div>
            <p className="text-xs text-arc-muted text-center">
              Scan with mobile camera or QR app
            </p>
          </div>
        )}

        {/* Join Code Tab */}
        {activeTab === "code" && (
          <div className="space-y-4">
            <div className="relative">
              <div className="flex items-center justify-center py-6 bg-arc-bg rounded-xl border border-arc-border">
                <span className="text-4xl font-mono font-bold tracking-wider text-arc-text">
                  {joinCode}
                </span>
              </div>
              <button
                onClick={() => copyToClipboard(joinCode)}
                className="absolute right-3 top-1/2 -translate-y-1/2 p-2 rounded-lg bg-arc-card border border-arc-border hover:border-indigo-500/50 transition-all"
              >
                {copied ? (
                  <Check size={16} className="text-emerald-500" />
                ) : (
                  <Copy size={16} className="text-arc-muted" />
                )}
              </button>
            </div>

            <div className="space-y-2">
              <p className="text-xs text-arc-muted">Or enter a custom code:</p>
              <div className="flex gap-2">
                <input
                  type="text"
                  value={customCode}
                  onChange={(e) => setCustomCode(e.target.value.toUpperCase())}
                  placeholder="ENTER CODE"
                  className="flex-1 px-4 py-2 bg-arc-bg border border-arc-border rounded-lg text-arc-text uppercase tracking-wider font-mono text-sm focus:border-indigo-500 outline-none"
                  maxLength={6}
                />
                <button
                  onClick={() => onJoinCodeChange?.(customCode)}
                  disabled={customCode.length !== 6}
                  className="px-4 py-2 bg-indigo-500 text-white rounded-lg text-sm font-medium disabled:opacity-50 disabled:cursor-not-allowed hover:bg-indigo-600 transition-colors"
                >
                  Connect
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Direct Link Tab */}
        {activeTab === "link" && (
          <div className="space-y-4">
            <div className="p-3 bg-arc-bg rounded-lg border border-arc-border">
              <p className="text-xs text-arc-muted mb-1">Share this link:</p>
              <div className="flex items-center gap-2">
                <code className="flex-1 text-xs text-arc-text truncate font-mono">
                  {fullJoinUrl}
                </code>
                <button
                  onClick={() => copyToClipboard(fullJoinUrl)}
                  className="p-1.5 rounded hover:bg-arc-card transition-colors"
                >
                  {copied ? (
                    <Check size={14} className="text-emerald-500" />
                  ) : (
                    <Copy size={14} className="text-arc-muted" />
                  )}
                </button>
              </div>
            </div>

            <div className="space-y-3">
              <p className="text-xs text-arc-muted">Connect via:</p>
              <div className="grid grid-cols-3 gap-2">
                {deviceTypes.map(({ type, icon: Icon, label, color }) => (
                  <button
                    key={type}
                    onClick={() => copyToClipboard(`${fullJoinUrl}?type=${type}`)}
                    className="flex flex-col items-center gap-2 p-3 rounded-xl bg-arc-bg border border-arc-border hover:border-indigo-500/50 transition-all group"
                  >
                    <Icon size={20} style={{ color }} className="group-hover:scale-110 transition-transform" />
                    <span className="text-xs text-arc-muted">{label}</span>
                  </button>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* Instructions */}
        <div className="mt-4 pt-4 border-t border-arc-border">
          <p className="text-xs text-arc-muted">
            Devices will appear in the swarm once connected. You can manage them from the dashboard.
          </p>
        </div>
      </div>
    </Card>
  );
}
