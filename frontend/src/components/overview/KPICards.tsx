import { TrendingUp, TrendingDown, DollarSign, BarChart2, PiggyBank, Percent } from "lucide-react";
import { Card, CardContent } from "@/components/ui/Card";
import { kpiData, formatINR } from "@/data/mockData";

const ICONS = [DollarSign, BarChart2, PiggyBank, Percent];

export function KPICards() {
  return (
    <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
      {kpiData.map((kpi, i) => {
        const Icon = ICONS[i];
        const isPositive = kpi.delta >= 0;
        const isProfit = kpi.label === "Net Profit" || kpi.label === "Margin %";
        const goodColor = "var(--color-success)";
        const badColor = "var(--color-danger)";
        const deltaColor = isPositive ? goodColor : badColor;
        const isBad = kpi.label === "Expenses" && isPositive;
        const finalColor = isBad ? badColor : isPositive ? goodColor : badColor;

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
                  style={{
                    color: finalColor,
                    background: `color-mix(in srgb, ${finalColor} 12%, transparent)`,
                  }}
                >
                  {isPositive
                    ? <TrendingUp size={11} />
                    : <TrendingDown size={11} />
                  }
                  {Math.abs(kpi.delta).toFixed(1)}%
                </span>
              </div>
              <p className="text-[11px] font-medium font-[var(--font-display)] text-[var(--color-muted)] uppercase tracking-wider mb-1">
                {kpi.label}
              </p>
              <p className="text-2xl font-bold font-[var(--font-mono)] text-[var(--color-ink)] leading-none">
                {kpi.isPercent
                  ? `${kpi.value.toFixed(2)}%`
                  : formatINR(kpi.value)}
              </p>
              <p className="text-[10px] text-[var(--color-muted)] mt-1.5">{kpi.deltaLabel}</p>
            </CardContent>
          </Card>
        );
      })}
    </div>
  );
}
