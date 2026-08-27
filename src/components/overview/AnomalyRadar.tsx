import { AlertTriangle, CheckCircle, ShieldAlert } from "lucide-react";
import { Card, CardHeader, CardContent } from "@/components/ui/Card";
import { Badge } from "@/components/ui/Badge";
import { anomalies } from "@/data/mockData";

export function AnomalyRadar() {
  return (
    <Card>
      <CardHeader>
        <div className="flex items-center gap-2">
          <AlertTriangle size={16} style={{ color: "var(--color-warning)" }} />
          <span className="text-sm font-semibold font-[var(--font-display)] text-[var(--color-ink)]">
            Anomaly Radar
          </span>
        </div>
        <Badge variant={anomalies.length > 0 ? "warning" : "success"}>
          {anomalies.length > 0 ? `${anomalies.length} detected` : "All clear"}
        </Badge>
      </CardHeader>
      <CardContent>
        {anomalies.length === 0 ? (
          <div className="flex flex-col items-center py-8 gap-3">
            <CheckCircle size={40} style={{ color: "var(--color-success)" }} />
            <p className="text-sm font-medium text-[var(--color-muted)]">No anomalies detected this week</p>
          </div>
        ) : (
          <div className="space-y-3">
            {anomalies.map((a) => (
              <div
                key={a.id}
                className="flex items-start gap-4 p-4 rounded-xl border transition-colors duration-200"
                style={{
                  borderColor: a.isCritical ? "color-mix(in srgb, var(--color-danger) 30%, transparent)" : "color-mix(in srgb, var(--color-warning) 30%, transparent)",
                  background: a.isCritical ? "color-mix(in srgb, var(--color-danger) 5%, transparent)" : "color-mix(in srgb, var(--color-warning) 5%, transparent)",
                }}
              >
                <ShieldAlert
                  size={18}
                  className="shrink-0 mt-0.5"
                  style={{ color: a.isCritical ? "var(--color-danger)" : "var(--color-warning)" }}
                />
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-1 flex-wrap">
                    <span className="text-sm font-semibold font-[var(--font-display)] text-[var(--color-ink)]">
                      {a.category}
                    </span>
                    <Badge variant={a.isCritical ? "danger" : "warning"}>
                      {a.isCritical ? "CRITICAL" : `${a.sigma}σ`}
                    </Badge>
                  </div>
                  <p className="text-xs text-[var(--color-muted)] leading-relaxed">{a.description}</p>
                </div>
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
