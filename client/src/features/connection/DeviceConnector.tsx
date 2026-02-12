import { QRCodeSVG } from "qrcode.react";
import { X, Copy, RefreshCw, LogOut, ArrowRight } from "lucide-react";
import { Card } from "../../components/Card";
import { useEffect, useState, useCallback } from "react";

interface DeviceConnectorProps {
  readonly isOpen: boolean;
  readonly onClose: () => void;
  readonly onRegenerateToken: () => Promise<string>;
  readonly onManualJoin: (code: string) => void;
  readonly onLeave: () => void;
  readonly isGuest: boolean;
}

export const DeviceConnector = ({
  isOpen,
  onClose,
  onRegenerateToken,
  onManualJoin,
  onLeave,
  isGuest,
}: DeviceConnectorProps) => {
  const [token, setToken] = useState<string>("");
  const [inputCode, setInputCode] = useState<string>("");
  const [isLoading, setIsLoading] = useState(false);

  const joinUrl = token
    ? `${window.location.origin}/?invite=${token}`
    : window.location.origin;

  const handleRegenerate = useCallback(async () => {
    if (isGuest || isLoading) return;
    setIsLoading(true);
    try {
      const newToken = await onRegenerateToken();
      setToken(newToken);
    } catch (err) {
      console.error("Token failed", err);
    } finally {
      setIsLoading(false);
    }
  }, [onRegenerateToken, isGuest, isLoading]);

  // FIXED: No more generating 10 tokens per second.
  useEffect(() => {
    if (isOpen && !isGuest && !token && !isLoading) {
      handleRegenerate();
    }
  }, [isOpen, isGuest, token, isLoading, handleRegenerate]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-gray-900/60 backdrop-blur-md p-6">
      <Card
        className="max-w-sm w-full relative p-6 space-y-6"
        variant="elevated"
      >
        <button
          onClick={onClose}
          className="absolute top-4 right-4 p-2 hover:bg-gray-100 rounded-full transition-colors"
        >
          <X size={18} className="text-text-muted" />
        </button>

        <div className="text-center space-y-4">
          <h3 className="text-xl font-bold">Swarm Access</h3>

          {isGuest ? (
            <div className="p-4 bg-red-50 border border-red-100 rounded-2xl space-y-3">
              <p className="text-[10px] font-black text-red-500 uppercase">
                Swarm Guest Mode
              </p>
              <button
                onClick={onLeave}
                className="w-full flex items-center justify-center gap-2 bg-red-500 text-white py-3 rounded-xl font-bold text-xs hover:bg-red-600 transition-all"
              >
                <LogOut size={14} /> Exit Swarm
              </button>
            </div>
          ) : (
            <div className="space-y-4">
              <div className="relative inline-block p-4 bg-white border border-border-soft rounded-3xl shadow-sm">
                {isLoading && (
                  <div className="absolute inset-0 z-10 bg-white/80 flex items-center justify-center rounded-3xl">
                    <RefreshCw
                      size={24}
                      className="animate-spin text-brand-orange"
                    />
                  </div>
                )}
                <QRCodeSVG value={joinUrl} size={160} level="M" includeMargin />
              </div>

              <div className="bg-gray-100 p-3 rounded-xl border border-dashed flex items-center justify-between">
                <div className="text-left">
                  <p className="text-[9px] font-black text-gray-400 uppercase">
                    Your Join Code
                  </p>
                  <p className="font-mono font-bold text-brand-orange">
                    {token || "..."}
                  </p>
                </div>
                <div className="flex gap-1">
                  <button
                    onClick={handleRegenerate}
                    className="p-2 hover:bg-white rounded-lg transition-colors"
                  >
                    <RefreshCw
                      size={16}
                      className={isLoading ? "animate-spin" : ""}
                    />
                  </button>
                  <button
                    onClick={() => navigator.clipboard.writeText(token)}
                    className="p-2 hover:bg-white rounded-lg transition-colors"
                  >
                    <Copy size={16} />
                  </button>
                </div>
              </div>
            </div>
          )}
        </div>

        <div className="border-t pt-6 space-y-3">
          <p className="text-[10px] font-black text-text-muted uppercase text-left tracking-widest">
            Join Remote Swarm
          </p>
          <div className="flex gap-2">
            <input
              type="text"
              maxLength={6}
              value={inputCode}
              onChange={(e) => setInputCode(e.target.value.toUpperCase())}
              placeholder="ENTER CODE"
              className="flex-1 bg-gray-100 border border-border-soft rounded-xl px-4 py-3 font-mono font-bold text-sm focus:outline-brand-orange"
            />
            <button
              onClick={() => {
                onManualJoin(inputCode);
                onClose();
              }}
              disabled={inputCode.length < 4}
              className="bg-gray-900 text-white p-3 rounded-xl disabled:opacity-50 hover:bg-black transition-all"
            >
              <ArrowRight size={20} />
            </button>
          </div>
        </div>
      </Card>
    </div>
  );
};
