import { QRCodeSVG } from "qrcode.react";
import { X, Copy, Share2 } from "lucide-react";
import { Card } from "../../components/Card";

interface DeviceConnectorProps {
  readonly isOpen: boolean;
  readonly joinCode: string;
  readonly onClose: () => void;
}

export const DeviceConnector = ({
  isOpen,
  joinCode,
  onClose,
}: DeviceConnectorProps) => {
  if (!isOpen) return null;

  const copyCode = () => {
    navigator.clipboard.writeText(joinCode);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-gray-900/40 backdrop-blur-md p-6">
      <Card
        className="max-w-sm w-full relative animate-in zoom-in-95 duration-200"
        variant="elevated"
      >
        <button
          onClick={onClose}
          className="absolute top-4 right-4 p-2 hover:bg-gray-100 rounded-full transition-colors"
        >
          <X size={18} className="text-text-muted" />
        </button>

        <div className="text-center space-y-6 py-4">
          <div className="space-y-2">
            <h3 className="text-xl font-bold">Add Compute Node</h3>
            <p className="text-xs text-text-muted">
              Scan to join the distributed swarm
            </p>
          </div>

          <div className="inline-block p-4 bg-white border border-border-soft rounded-3xl shadow-sm">
            <QRCodeSVG
              value={`https://ostrich.legs/join/${joinCode}`}
              size={160}
            />
          </div>

          <div className="space-y-2">
            <p className="text-[10px] font-bold text-text-muted uppercase tracking-widest">
              Manual Join Code
            </p>
            <div className="flex items-center gap-2 bg-gray-100 p-2 rounded-xl border border-border-soft">
              <code className="flex-1 font-mono font-bold text-lg text-brand-orange">
                {joinCode}
              </code>
              <button
                onClick={copyCode}
                className="p-2 hover:bg-white rounded-lg shadow-sm transition-all active:scale-90"
              >
                <Copy size={16} className="text-text-muted" />
              </button>
            </div>
          </div>
        </div>
      </Card>
    </div>
  );
};
