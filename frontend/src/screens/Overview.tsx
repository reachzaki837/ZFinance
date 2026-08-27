import { HealthScoreGauge } from "@/components/overview/HealthScoreGauge";
import { KPICards } from "@/components/overview/KPICards";
import { AINarrative } from "@/components/overview/AINarrative";
import { RevenueExpenseChart } from "@/components/overview/RevenueExpenseChart";
import { AnomalyRadar } from "@/components/overview/AnomalyRadar";
import { Card } from "@/components/ui/Card";

export function Overview() {
  return (
    <div className="space-y-6 pb-8">
      {/* Health Score */}
      <Card>
        <HealthScoreGauge />
      </Card>

      {/* KPI Cards */}
      <KPICards />

      {/* AI Narrative */}
      <AINarrative />

      {/* Revenue vs Expenses Chart */}
      <RevenueExpenseChart />

      {/* Anomaly Radar */}
      <AnomalyRadar />
    </div>
  );
}
