import { useEffect, useState } from "react";
import { TrendingUp, TrendingDown, DollarSign, BarChart2, PiggyBank, Percent } from "lucide-react";
import { Card, CardContent } from "@/components/ui/Card";
import { Skeleton } from "@/components/ui/Skeleton";
import { getTrend } from "@/lib/api";

const ICONS = [DollarSign, BarChart2, PiggyBank, Percent];

function formatINR(value: number): string {
  return "₹" + Math.abs(value).toLocaleString("en-IN");
}

interface WeekTotal {
  week: string;
  revenue: number;
  expenses: number;
}

interface KPI {
  label: string;
  value: number;
  delta: number;
  isPercent?: boolean;
}

function computeKPIs(data: WeekTotal[]): KPI[] {
  if (data.length === 0) return [];

  const current = data[data.length - 1];
  const previous = data.length > 1 ? data[data.length - 2] : null;

  const netProfit = current.revenue - current.expenses;
  const margin = current.revenue > 0 ? (netProfit / current.revenue) * 100 : 0;

  const prevNetProfit = previous ? previous.revenue - previous.expenses : null;
  const prevMargin = previous && previous.revenue > 0 ? (prevNetProfit! / previous.revenue) * 100 : null;

  const pctDelta = (curr: number, prev: number | null) =>
    prev && prev !== 0 ? ((curr - prev) / Math.abs(prev)) * 100 : 0;

  return [
    { label: "Revenue", value: current.revenue, delta: pctDelta(current.revenue, previous?.revenue ?? null) },
    { label: "Expenses", value: current.expenses, delta: pctDelta(current.expenses, previous?.expenses ?? null) },
    { label: "Net Profit", value: netProfit, delta: pctDelta(netProfit, prevNetProfit) },
    { label: "Margin %", value: margin, delta: pctDelta(margin, prevMargin), isPercent: true },
  ];
}

export function KPICards() {
  const [kpis, setKpis] = useState<KPI[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    getTrend()
      .then((data: WeekTotal[]) => {
        if (!cancelled) setKpis(computeKPIs(data));
      })
      .catch((err) => {
        console.error("Failed to fetch trend for KPIs:", err);
        if (!cancelled) setError("Could not load KPIs");
      })
      .finally(() => { if (!cancelled) setLoading(false); });
    return () => { cancelled = true; };
  }, []);

  if (loading) {
    return (
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {[0, 1, 2, 3].map((i) => (
          <Card key={i}><CardContent className="pt-5"><Skeleton className="h-20 w-full" /></CardContent></Card>
        ))}
      </div>
    );
  }

  if (error || kpis.length === 0) {
    return (
      <Card>
        <CardContent className="pt-5">
          <p className="text-sm text-[var(--color-muted)]">
            {error || "No data ingested yet — upload transactions to see KPIs."}
          </p>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
      {kpis.map((kpi, i) => {
        const Icon = ICONS[i];
        const isPositive = kpi.delta >= 0;
        const isBad = kpi.label === "Expenses" && isPositive;
        const finalColor = isBad ? "var(--color-danger)" : isPositive ? "var(--color-success)" : "var(--color-danger)";

        return (
          <Card key={kpi.label} className="group hover:scale-[1.01] transition-transform duration-200">
            <CardContent className="pt-5">
              <div className="flex items-start justify-between mb-3">
                <div
                  className="w-9 h-9 rounded-lg flex items-center justify-center shrink-0"
                  style={{ background: `color-mix(in srgb, var(--color-accent) 12%, transparent)` }}
                >
                  <Icon size={16} style={{ color: "var(--color-accent)" }} />
                </div>
                <span
                  className="flex items-center gap-1 text-xs font-semibold font-[var(--font-mono)] px-2 py-0.5 rounded-full"
                  style={{ color: finalColor, background: `color-mix(in srgb, ${finalColor} 12%, transparent)` }}
                >
                  {isPositive ? <TrendingUp size={11} /> : <TrendingDown size={11} />}
                  {Math.abs(kpi.delta).toFixed(1)}%
                </span>
              </div>
              <p className="text-[11px] font-medium font-[var(--font-display)] text-[var(--color-muted)] uppercase tracking-wider mb-1">
                {kpi.label}
              </p>
              <p className="text-2xl font-bold font-[var(--font-mono)] text-[var(--color-ink)] leading-none">
                {kpi.isPercent ? `${kpi.value.toFixed(2)}%` : formatINR(kpi.value)}
              </p>
              <p className="text-[10px] text-[var(--color-muted)] mt-1.5">vs last week</p>
            </CardContent>
          </Card>
        );
      })}
    </div>
  );
}