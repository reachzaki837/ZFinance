import { AlertCircle, RefreshCw, X } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { useStore } from "@/store/useStore";

/**
 * Persistent strip shown above the TopBar whenever the backend health check fails.
 * Dismissing hides it until the next failed poll, so it re-appears while the
 * server is still down rather than staying silently hidden.
 */
export function BackendBanner() {
  const { backendReachable, bannerDismissed, checkBackend, dismissBanner } = useStore();

  if (backendReachable || bannerDismissed) return null;

  return (
    <div
      role="status"
      className="shrink-0 flex items-center gap-3 px-4 md:px-6 py-2.5 border-b"
      style={{
        background: "color-mix(in srgb, var(--color-danger) 12%, transparent)",
        borderColor: "color-mix(in srgb, var(--color-danger) 30%, transparent)",
      }}
    >
      <AlertCircle size={16} className="shrink-0" style={{ color: "var(--color-danger)" }} />
      <p className="flex-1 text-sm font-[var(--font-body)] text-[var(--color-ink)]">
        Can't reach the ZFinance server. Make sure the backend is running.
      </p>
      <Button variant="ghost" size="icon" onClick={checkBackend} title="Retry connection">
        <RefreshCw size={14} />
      </Button>
      <Button variant="ghost" size="icon" onClick={dismissBanner} title="Dismiss">
        <X size={14} />
      </Button>
    </div>
  );
}
