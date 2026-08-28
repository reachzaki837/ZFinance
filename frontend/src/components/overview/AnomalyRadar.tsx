import { useEffect, useState } from "react";
import { AlertTriangle, CheckCircle, ShieldAlert } from "lucide-react";
import { Card, CardHeader, CardContent } from "@/components/ui/Card";
import { Badge } from "@/components/ui/Badge";
import { Skeleton } from "@/components/ui/Skeleton";
import { getAnomalies } from "@/lib/api";

interface Anomaly {
  text: string;
  category: string;
  sigma: number;
  is_critical: boolean;
}

export function AnomalyRadar() {
  const [anomalies, setAnomalies] = useState<Anomaly[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setError(null);

    getAnomalies()
      .then((data: Anomaly[]) => {
        if (!cancelled) setAnomalies(data);
      })
      .catch((err) => {
        console.error("Failed to fetch anomalies:", err);
        if (!cancelled) setError("Could not load anomalies");
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });

    return () => { cancelled = true; };
  }, []);

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center gap-2">
          <AlertTriangle size={16} style={{ color: "var(--color-warning)" }} />
          <span className="text-sm font-semibold font-[var(--font-display)] text-[var(--color-ink)]">
            Anomaly Radar
          </span>
        </div>
        {!loading && !error && (
          <Badge variant={anomalies.length > 0 ? "warning" : "success"}>
            {anomalies.length > 0 ? `${anomalies.length} detected` : "All clear"}
          </Badge>
        )}
      </CardHeader>
      <CardContent>
        {loading ? (
          <div className="space-y-3">
            <Skeleton className="h-16 w-full rounded-xl" />
            <Skeleton className="h-16 w-full rounded-xl" />
          </div>
        ) : error ? (
          <p className="text-sm text-[var(--color-danger)]">{error}</p>
        ) : anomalies.length === 0 ? (
          <div className="flex flex-col items-center py-8 gap-3">
            <CheckCircle size={40} style={{ color: "var(--color-success)" }} />
            <p className="text-sm font-medium text-[var(--color-muted)]">No anomalies detected this week</p>
          </div>
        ) : (
          <div className="space-y-3">
            {anomalies.map((a, i) => (
              <div
                key={i}
                className="flex items-start gap-4 p-4 rounded-xl border transition-colors duration-200"
                style={{
                  borderColor: a.is_critical ? "color-mix(in srgb, var(--color-danger) 30%, transparent)" : "color-mix(in srgb, var(--color-warning) 30%, transparent)",
                  background: a.is_critical ? "color-mix(in srgb, var(--color-danger) 5%, transparent)" : "color-mix(in srgb, var(--color-warning) 5%, transparent)",
                }}
              >
                <ShieldAlert
                  size={18}
                  className="shrink-0 mt-0.5"
                  style={{ color: a.is_critical ? "var(--color-danger)" : "var(--color-warning)" }}
                />
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-1 flex-wrap">
                    <span className="text-sm font-semibold font-[var(--font-display)] text-[var(--color-ink)]">
                      {a.category}
                    </span>
                    <Badge variant={a.is_critical ? "danger" : "warning"}>
                      {a.is_critical ? "CRITICAL" : `${a.sigma.toFixed(1)}σ`}
                    </Badge>
                  </div>
                  <p className="text-xs text-[var(--color-muted)] leading-relaxed">{a.text}</p>
                </div>
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}