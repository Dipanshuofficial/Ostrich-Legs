// client/src/features/connection/DeviceConnector.tsx
import { QRCodeSVG } from "qrcode.react";
import {
  X,
  Copy,
  RefreshCw,
  LogOut,
  ArrowRight,
  Camera,
  Smartphone,
} from "lucide-react";
import { Card } from "../../components/Card";
import { useEffect, useState, useCallback, useRef } from "react";
import { Html5Qrcode } from "html5-qrcode";

interface DeviceConnectorProps {
  readonly isOpen: boolean;
  readonly onClose: () => void;
  readonly onRegenerateToken: () => Promise<string>;
  readonly onManualJoin: (code: string) => Promise<void>;
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
  const [isScanning, setIsScanning] = useState(false);
  const [showSuccess, setShowSuccess] = useState(false);
  const [isError, setIsError] = useState(false);
  const scannerRef = useRef<Html5Qrcode | null>(null);

  const handleRegenerate = useCallback(async () => {
    if (isGuest || isLoading) return;
    setIsLoading(true);
    try {
      const newToken = await onRegenerateToken();
      setToken(newToken);
    } catch (err) {
      console.error("[UI] Token Generation Failed", err);
    } finally {
      setIsLoading(false);
    }
  }, [onRegenerateToken, isGuest, isLoading]);

  const stopScanner = useCallback(async () => {
    if (scannerRef.current?.isScanning) {
      await scannerRef.current.stop();
    }
    setIsScanning(false);
  }, []);

  const startScanner = useCallback(async () => {
    setIsScanning(true);
    setTimeout(async () => {
      const element = document.getElementById("reader");
      if (!element) {
        setIsScanning(false);
        return;
      }
      try {
        const html5QrCode = new Html5Qrcode("reader");
        scannerRef.current = html5QrCode;
        await html5QrCode.start(
          { facingMode: "environment" },
          { fps: 20, qrbox: { width: 220, height: 220 }, aspectRatio: 1.0 },
          async (decodedText) => {
            const code = decodedText.includes("invite=")
              ? decodedText.split("invite=")[1].split("&")[0]
              : decodedText.trim();

            await stopScanner();
            handleJoinProtocol(code);
          },
          () => {},
        );
      } catch (err) {
        setIsScanning(false);
      }
    }, 150);
  }, [stopScanner]);

  const handleJoinProtocol = async (code: string) => {
    setIsLoading(true);
    setIsError(false);
    try {
      await onManualJoin(code);
      setShowSuccess(true);
      setTimeout(() => {
        onClose();
        setShowSuccess(false);
        setInputCode("");
      }, 1200);
    } catch (err) {
      setIsError(true);
      setTimeout(() => setIsError(false), 1000);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    if (isOpen && !isGuest && !token && !isLoading) handleRegenerate();
  }, [isOpen, isGuest, token, isLoading, handleRegenerate]);

  useEffect(() => {
    const handleEsc = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    if (isOpen) document.addEventListener("keydown", handleEsc);
    return () => document.removeEventListener("keydown", handleEsc);
  }, [isOpen, onClose]);

  useEffect(() => {
    if (!isOpen && isScanning) stopScanner();
  }, [isOpen, isScanning, stopScanner]);

  if (!isOpen) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-gray-900/60 backdrop-blur-md p-6"
      onClick={onClose}
    >
      <div className="modal-content" onClick={(e) => e.stopPropagation()}>
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
                  className="w-full flex items-center justify-center gap-2 bg-red-500 text-white py-3 rounded-xl font-bold text-xs hover:bg-red-600"
                >
                  <LogOut size={14} /> Exit Swarm
                </button>
              </div>
            ) : (
              <div className="space-y-6">
                <div className="flex bg-gray-100/80 p-1 rounded-2xl shadow-inner border border-gray-200/50 mx-auto w-fit">
                  <button
                    onClick={stopScanner}
                    className={`flex items-center gap-2 px-4 py-1.5 rounded-xl text-[10px] font-black uppercase tracking-wider transition-all ${!isScanning ? "bg-white text-brand-orange shadow-sm" : "text-text-muted"}`}
                  >
                    <Smartphone size={12} /> Share
                  </button>
                  <button
                    onClick={startScanner}
                    className={`flex items-center gap-2 px-4 py-1.5 rounded-xl text-[10px] font-black uppercase tracking-wider transition-all ${isScanning ? "bg-white text-brand-orange shadow-sm" : "text-text-muted"}`}
                  >
                    <Camera size={12} /> Scan
                  </button>
                </div>
                {!isScanning ? (
                  <div className="space-y-4 animate-in fade-in slide-in-from-bottom-2">
                    <div className="relative inline-block p-4 bg-white border border-border-soft rounded-3xl shadow-sm">
                      {isLoading && (
                        <div className="absolute inset-0 z-10 bg-white/80 flex items-center justify-center rounded-3xl">
                          <RefreshCw
                            size={24}
                            className="animate-spin text-brand-orange"
                          />
                        </div>
                      )}
                      <QRCodeSVG
                        value={token || "OSTRICH_WAITING"}
                        size={180}
                        level="M"
                        includeMargin
                      />
                    </div>
                    <div className="bg-gray-100 p-3 rounded-xl border border-dashed flex items-center justify-between">
                      <div className="text-left">
                        <p className="text-[9px] font-black text-gray-400 uppercase">
                          Join Code
                        </p>
                        <p className="font-mono font-bold text-brand-orange">
                          {token || "GENERATING..."}
                        </p>
                      </div>
                      <div className="flex gap-1">
                        <button
                          onClick={handleRegenerate}
                          className="p-2 hover:bg-white rounded-lg"
                        >
                          <RefreshCw
                            size={16}
                            className={isLoading ? "animate-spin" : ""}
                          />
                        </button>
                        <button
                          onClick={() =>
                            token && navigator.clipboard.writeText(token)
                          }
                          className="p-2 hover:bg-white rounded-lg"
                        >
                          <Copy size={16} />
                        </button>
                      </div>
                    </div>
                  </div>
                ) : (
                  <div className="animate-in fade-in zoom-in-95">
                    <div className="relative w-full aspect-square max-w-60 mx-auto bg-black rounded-[40px] border-8 border-surface-white overflow-hidden shadow-inner">
                      <div
                        id="reader"
                        className="w-full h-full [&_video]:object-cover [&_video]:rounded-[32px]"
                      />
                      <div className="absolute inset-0 border-2 border-brand-orange/30 rounded-[32px] pointer-events-none">
                        <div className="absolute top-0 left-0 w-full h-2 bg-brand-orange/50 shadow-[0_0_15px_rgba(255,125,84,0.8)] animate-[scan_2s_linear_infinite]" />
                      </div>
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>
          <div className="border-t pt-6 space-y-3">
            <div className="flex gap-2">
              <input
                type="text"
                maxLength={6}
                value={inputCode}
                onChange={(e) => {
                  setIsError(false);
                  setInputCode(e.target.value.toUpperCase());
                }}
                placeholder="ENTER CODE"
                className={`flex-1 bg-gray-100 border rounded-xl px-4 py-3 font-mono font-bold text-sm focus:outline-brand-orange transition-all ${isError ? "border-red-500 animate-shake" : "border-border-soft"}`}
              />
              <button
                onClick={() => handleJoinProtocol(inputCode)}
                disabled={inputCode.length < 4 || isLoading || showSuccess}
                className={`p-3 rounded-xl transition-all duration-200 ${showSuccess ? "bg-green-500" : isError ? "bg-red-500" : "bg-gray-900"} text-white`}
              >
                {isLoading ? (
                  <RefreshCw size={20} className="animate-spin" />
                ) : (
                  <ArrowRight size={20} />
                )}
              </button>
            </div>
          </div>
        </Card>
      </div>
    </div>
  );
};
