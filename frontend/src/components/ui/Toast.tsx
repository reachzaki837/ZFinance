import { useEffect, useState } from "react";
import { CheckCircle, X } from "lucide-react";
import { Button } from "@/components/ui/Button";

interface ToastProps {
  message: string;
  onClose: () => void;
  duration?: number;
}

export function Toast({ message, onClose, duration = 4000 }: ToastProps) {
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    requestAnimationFrame(() => setVisible(true));
    const timer = setTimeout(() => {
      setVisible(false);
      setTimeout(onClose, 300);
    }, duration);
    return () => clearTimeout(timer);
  }, [duration, onClose]);

  return (
    <div
      className={`fixed bottom-6 right-6 z-50 flex items-center gap-3 bg-[var(--color-surface)] border border-[var(--color-border)] rounded-xl px-4 py-3 card-shadow transition-all duration-300 ${
        visible ? "opacity-100 translate-y-0" : "opacity-0 translate-y-4"
      }`}
    >
      <CheckCircle size={18} className="text-[var(--color-success)] shrink-0" />
      <span className="text-sm font-medium text-[var(--color-ink)]">{message}</span>
      <Button
        variant="ghost"
        size="icon"
        onClick={() => { setVisible(false); setTimeout(onClose, 300); }}
        className="ml-1"
        title="Dismiss"
      >
        <X size={14} />
      </Button>
    </div>
  );
}
