import { AlertCircle } from 'lucide-react';
import { useEffect, useState } from 'react';

interface ErrorModalProps {
  open: boolean;
  message: string;
  title?: string;
  onClose: () => void;
}

export default function ErrorModal({ open, message, title = 'Erreur', onClose }: ErrorModalProps) {
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    if (open) {
      setVisible(true);
      const t = setTimeout(() => {
        setVisible(false);
        setTimeout(onClose, 200);
      }, 2500);
      return () => clearTimeout(t);
    }
  }, [open, onClose]);

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 bg-black/70 flex items-center justify-center px-6">
      <div
        className={`bg-bg-card rounded-3xl p-6 flex flex-col items-center gap-3 max-w-sm w-full shadow-2xl transition-transform duration-200 ${
          visible ? 'scale-100' : 'scale-0'
        }`}
      >
        <div className="w-16 h-16 rounded-full bg-red-500/20 flex items-center justify-center">
          <AlertCircle size={44} className="text-red-500" />
        </div>
        <div className="text-xl font-bold text-white">{title}</div>
        <div className="text-sm text-slate-400 text-center">{message}</div>
      </div>
    </div>
  );
}
