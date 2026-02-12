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
  const [isScanning, setIsScanning] = useState(false);
  const scannerRef = useRef<Html5Qrcode | null>(null);

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
  const startScanner = useCallback(async () => {
    setIsScanning(true);
    const html5QrCode = new Html5Qrcode("reader");
    scannerRef.current = html5QrCode;

    try {
      await html5QrCode.start(
        { facingMode: "environment" },
        { fps: 10, qrbox: { width: 250, height: 250 } },
        (decodedText) => {
          // Extract token from URL or use raw text
          const code = decodedText.includes("invite=")
            ? decodedText.split("invite=")[1]
            : decodedText;

          stopScanner();
          onManualJoin(code);
          onClose();
        },
        () => {}, // Silent on errors
      );
    } catch (err) {
      console.error("Camera failed", err);
      setIsScanning(false);
    }
  }, [onManualJoin, onClose]);

  const stopScanner = useCallback(async () => {
    if (scannerRef.current && scannerRef.current.isScanning) {
      await scannerRef.current.stop();
      scannerRef.current.clear();
    }
    setIsScanning(false);
  }, []);

  // Clean up scanner on close
  useEffect(() => {
    if (!isOpen && isScanning) stopScanner();
  }, [isOpen, isScanning, stopScanner]);

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
            <div className="space-y-6">
              {/* Mode Toggle Tabs */}
              <div className="flex bg-gray-100/80 p-1 rounded-2xl shadow-inner border border-gray-200/50 mx-auto w-fit">
                <button
                  onClick={() => {
                    stopScanner();
                    setIsScanning(false);
                  }}
                  className={`flex items-center gap-2 px-4 py-1.5 rounded-xl text-[10px] font-black uppercase tracking-wider transition-all ${!isScanning ? "bg-white text-brand-orange shadow-sm border border-gray-100" : "text-text-muted hover:text-text-main"}`}
                >
                  <Smartphone size={12} /> Share
                </button>
                <button
                  onClick={startScanner}
                  className={`flex items-center gap-2 px-4 py-1.5 rounded-xl text-[10px] font-black uppercase tracking-wider transition-all ${isScanning ? "bg-white text-brand-orange shadow-sm border border-gray-100" : "text-text-muted hover:text-text-main"}`}
                >
                  <Camera size={12} /> Scan
                </button>
              </div>

              {!isScanning ? (
                <div className="space-y-4 animate-in fade-in slide-in-from-bottom-2 duration-300">
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
                      value={joinUrl}
                      size={160}
                      level="M"
                      includeMargin
                    />
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
              ) : (
                <div className="animate-in fade-in zoom-in-95 duration-300">
                  {/* Skeuomorphic Lens Container */}
                  <div className="relative w-full aspect-square max-w-60 mx-auto bg-black rounded-[40px] border-8 border-surface-white shadow-[10px_10px_20px_#d1d5db,-10px_-10px_20px_#ffffff,inset_0_2px_10px_rgba(0,0,0,0.5)] overflow-hidden">
                    <div id="reader" className="w-full h-full" />
                    <div className="absolute inset-0 border-2 border-brand-orange/30 rounded-3xl pointer-events-none" />
                    <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-48 h-48 border border-white/20 rounded-2xl pointer-events-none" />
                  </div>
                  <p className="text-[10px] font-bold text-text-muted uppercase mt-4 tracking-widest">
                    Point at a Swarm QR Code
                  </p>
                </div>
              )}
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
