import { useEffect, useState, useCallback } from "react";
import { Sparkles, RefreshCw } from "lucide-react";
import { Card, CardHeader, CardContent, CardFooter } from "@/components/ui/Card";
import { Skeleton } from "@/components/ui/Skeleton";
import { getNarrative } from "@/lib/api";

export function AINarrative() {
  const [narrative, setNarrative] = useState<string>("");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchNarrative = useCallback(() => {
    setLoading(true);
    setError(null);
    getNarrative()
      .then((text) => setNarrative(text))
      .catch((err) => {
        console.error("Failed to fetch narrative:", err);
        setError("Could not load narrative");
      })
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => {
    fetchNarrative();
  }, [fetchNarrative]);

  // Split into paragraphs for the same visual layout as before
  const paragraphs = narrative
    .split(/\n\s*\n/)
    .map((p) => p.replace(/\*\*/g, "").trim())
    .filter(Boolean);

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center gap-2">
          <div
            className="w-7 h-7 rounded-lg flex items-center justify-center"
            style={{ background: "linear-gradient(135deg, var(--color-accent), color-mix(in srgb, var(--color-accent) 60%, var(--color-success)))" }}
          >
            <Sparkles size={14} className="text-white" />
          </div>
          <span className="text-sm font-semibold font-[var(--font-display)] text-[var(--color-ink)]">
            This Week's Summary
          </span>
        </div>
        <button
          onClick={fetchNarrative}
          disabled={loading}
          className="p-1.5 rounded-lg text-[var(--color-muted)] hover:bg-[var(--color-border)] hover:text-[var(--color-ink)] transition-colors disabled:opacity-40"
          title="Regenerate summary"
        >
          <RefreshCw size={14} className={loading ? "animate-spin" : ""} />
        </button>
      </CardHeader>
      <CardContent>
        {loading ? (
          <div className="space-y-3">
            <div className="space-y-2">
              <Skeleton className="h-4 w-full" />
              <Skeleton className="h-4 w-5/6" />
              <Skeleton className="h-4 w-4/5" />
            </div>
            <div className="space-y-2">
              <Skeleton className="h-4 w-full" />
              <Skeleton className="h-4 w-3/4" />
            </div>
            <div className="space-y-2">
              <Skeleton className="h-4 w-full" />
              <Skeleton className="h-4 w-5/6" />
              <Skeleton className="h-4 w-2/3" />
            </div>
          </div>
        ) : error ? (
          <p className="text-sm text-[var(--color-danger)]">{error}</p>
        ) : (
          <div className="space-y-3">
            {paragraphs.map((para, i) => (
              <p
                key={i}
                className="text-sm leading-relaxed text-[var(--color-ink)] opacity-90"
                style={{ fontFamily: "var(--font-body)" }}
              >
                {para}
              </p>
            ))}
          </div>
        )}
      </CardContent>
      <CardFooter>
        <p className="text-[10px] text-[var(--color-muted)] font-[var(--font-body)]">
          Generated locally — your data never leaves this machine.
        </p>
      </CardFooter>
    </Card>
  );
}