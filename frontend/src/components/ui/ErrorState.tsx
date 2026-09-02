import { AlertCircle, RefreshCw } from "lucide-react";
import { Button } from "@/components/ui/Button";

interface ErrorStateProps {
  message: string;
  /** When supplied, a "Try again" button is rendered that invokes this callback. */
  onRetry?: () => void;
  className?: string;
}

/**
 * Standardized failed-fetch treatment shared by every data-loading component.
 * Replaces the ad-hoc red error strings that used to differ per screen.
 */
export function ErrorState({ message, onRetry, className = "" }: ErrorStateProps) {
  return (
    <div className={`flex flex-col items-center justify-center gap-3 py-8 text-center ${className}`}>
      <AlertCircle size={28} style={{ color: "var(--color-danger)" }} />
      <p className="text-sm text-[var(--color-ink)] font-[var(--font-body)]">{message}</p>
      {onRetry && (
        <Button variant="outline" size="sm" onClick={onRetry}>
          <RefreshCw size={13} />
          Try again
        </Button>
      )}
    </div>
  );
}
