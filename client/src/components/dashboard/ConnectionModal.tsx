import { QRCodeSVG } from "qrcode.react";
import { motion, AnimatePresence } from "framer-motion";
import { X, Smartphone, Share2 } from "lucide-react";

interface ConnectionModalProps {
  isOpen: boolean;
  onClose: () => void;
  shareUrl: string;
}

export function ConnectionModal({
  isOpen,
  onClose,
  shareUrl,
}: ConnectionModalProps) {
  return (
    <AnimatePresence>
      {isOpen && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4"
        >
          <motion.div
            initial={{ scale: 0.95, y: 10 }}
            animate={{ scale: 1, y: 0 }}
            exit={{ scale: 0.95, y: 10 }}
            className="bg-[#18181b] border border-white/10 p-6 rounded-3xl shadow-2xl max-w-sm w-full relative overflow-hidden"
          >
            <button
              onClick={onClose}
              className="absolute top-4 right-4 text-white/40 hover:text-white"
            >
              <X size={20} />
            </button>

            <div className="text-center mb-6">
              <div className="w-12 h-12 bg-white/5 rounded-full flex items-center justify-center mx-auto mb-4">
                <Smartphone size={24} className="text-white" />
              </div>
              <h3 className="text-xl font-bold text-white">Add a Device</h3>
              <p className="text-sm text-white/50 mt-1">
                Scan to join the swarm instantly.
              </p>
            </div>

            <div className="bg-white p-4 rounded-xl mx-auto w-fit mb-6">
              <QRCodeSVG value={shareUrl} size={180} />
            </div>

            <div className="bg-white/5 p-3 rounded-lg flex items-center justify-between gap-3 border border-white/5">
              <div className="overflow-hidden">
                <p className="text-[10px] text-white/40 uppercase font-bold">
                  Or use link
                </p>
                <p className="text-xs text-blue-400 truncate">{shareUrl}</p>
              </div>
              <button
                onClick={() => navigator.clipboard.writeText(shareUrl)}
                className="p-2 hover:bg-white/10 rounded-md transition-colors"
              >
                <Share2 size={16} className="text-white/60" />
              </button>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
