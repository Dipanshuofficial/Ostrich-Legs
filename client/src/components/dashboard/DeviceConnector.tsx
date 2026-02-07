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
