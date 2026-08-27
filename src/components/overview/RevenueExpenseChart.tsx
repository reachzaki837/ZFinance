import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from "recharts";
import { Card, CardHeader, CardContent } from "@/components/ui/Card";
import { chartData, formatINRShort } from "@/data/mockData";
import { useStore } from "@/store/useStore";

function CustomTooltip({ active, payload, label }: any) {
  if (!active || !payload?.length) return null;
  return (
    <div className="bg-[var(--color-surface)] border border-[var(--color-border)] rounded-xl px-4 py-3 card-shadow text-xs">
      <p className="font-semibold font-[var(--font-display)] text-[var(--color-ink)] mb-2">{label}</p>
      {payload.map((entry: any) => (
        <div key={entry.name} className="flex items-center gap-2 mb-1">
          <span className="w-2.5 h-2.5 rounded-full shrink-0" style={{ background: entry.color }} />
          <span className="text-[var(--color-muted)] font-[var(--font-display)]">{entry.name}:</span>
          <span className="font-semibold font-[var(--font-mono)] text-[var(--color-ink)]">
            {"₹" + Number(entry.value).toLocaleString("en-IN")}
          </span>
        </div>
      ))}
    </div>
  );
}

export function RevenueExpenseChart() {
  const { darkMode } = useStore();
  const gridColor = darkMode ? "#2E2C3A" : "#E8E4DA";
  const axisColor = darkMode ? "#9C97A8" : "#8A8578";
  const revenueColor = darkMode ? "#7C67FF" : "#5B3FF0";
  const expenseColor = darkMode ? "#FFB84D" : "#F5A623";

  return (
    <Card>
      <CardHeader>
        <span className="text-sm font-semibold font-[var(--font-display)] text-[var(--color-ink)]">
          Revenue vs Expenses
        </span>
        <span className="text-xs text-[var(--color-muted)] font-[var(--font-body)]">Last 12 weeks</span>
      </CardHeader>
      <CardContent className="pb-6">
        <ResponsiveContainer width="100%" height={260}>
          <LineChart data={chartData} margin={{ top: 4, right: 8, left: 0, bottom: 0 }}>
            <CartesianGrid strokeDasharray="3 3" stroke={gridColor} vertical={false} />
            <XAxis
              dataKey="week"
              tick={{ fill: axisColor, fontSize: 11, fontFamily: "JetBrains Mono, monospace" }}
              axisLine={false}
              tickLine={false}
            />
            <YAxis
              tickFormatter={formatINRShort}
              tick={{ fill: axisColor, fontSize: 11, fontFamily: "JetBrains Mono, monospace" }}
              axisLine={false}
              tickLine={false}
              width={52}
            />
            <Tooltip content={<CustomTooltip />} />
            <Legend
              wrapperStyle={{ fontSize: 12, fontFamily: "var(--font-display)", paddingTop: 16 }}
              formatter={(value) => <span style={{ color: axisColor }}>{value}</span>}
            />
            <Line
              type="monotone"
              dataKey="revenue"
              name="Revenue"
              stroke={revenueColor}
              strokeWidth={2.5}
              dot={false}
              activeDot={{ r: 5, fill: revenueColor, stroke: "var(--color-surface)", strokeWidth: 2 }}
              animationDuration={800}
              animationEasing="ease-out"
            />
            <Line
              type="monotone"
              dataKey="expenses"
              name="Expenses"
              stroke={expenseColor}
              strokeWidth={2.5}
              dot={false}
              activeDot={{ r: 5, fill: expenseColor, stroke: "var(--color-surface)", strokeWidth: 2 }}
              animationDuration={800}
              animationEasing="ease-out"
            />
          </LineChart>
        </ResponsiveContainer>
      </CardContent>
    </Card>
  );
}
