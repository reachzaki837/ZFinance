import { useCallback, useEffect, useState } from "react";
import { RadialBarChart, RadialBar, ResponsiveContainer } from "recharts";
import { ErrorState } from "@/components/ui/ErrorState";
import { useStore } from "@/store/useStore";
import { getHealthScore } from "@/lib/api";

function getColor(score: number, dark: boolean): string {
  if (score < 40) return dark ? "#FF5F58" : "#F0453F";
  if (score < 70) return dark ? "#FFB84D" : "#F5A623";
  return dark ? "#1FCE84" : "#0FA968";
}

function getLabel(score: number): string {
  if (score < 40) return "Needs Attention";
  if (score < 70) return "Fair";
  return "Healthy";
}

export function HealthScoreGauge() {
  const [targetScore, setTargetScore] = useState<number | null>(null);
  const [reason, setReason] = useState<string>("");
  const [displayScore, setDisplayScore] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const { darkMode } = useStore();

  // Fetch real score from backend
  const loadScore = useCallback(() => {
    setLoading(true);
    setError(null);

    getHealthScore()
      .then((data) => {
        setTargetScore(data.score ?? 0);
        setReason(data.reason ?? "");
      })
      .catch((err) => {
        console.error("Failed to fetch health score:", err);
        setError("Could not load health score");
      })
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => {
    loadScore();
  }, [loadScore]);

  // Animate from 0 to the real fetched score
  useEffect(() => {
    if (targetScore === null) return;
    const start = performance.now();
    const duration = 800;
    const animate = (now: number) => {
      const elapsed = now - start;
      const progress = Math.min(elapsed / duration, 1);
      const eased = 1 - Math.pow(1 - progress, 3);
      setDisplayScore(Math.round(eased * targetScore));
      if (progress < 1) requestAnimationFrame(animate);
    };
    const raf = requestAnimationFrame(animate);
    return () => cancelAnimationFrame(raf);
  }, [targetScore]);

  const color = getColor(displayScore, darkMode);
  const data = [
    { value: displayScore, fill: color },
  ];

  if (loading) {
    return (
      <div className="flex flex-col items-center py-8">
        <div className="w-52 h-52 rounded-full skeleton" />
        <h2 className="text-sm font-semibold font-[var(--font-display)] text-[var(--color-ink)] mt-3">
          Financial Health Score
        </h2>
      </div>
    );
  }

  if (error) {
    return <ErrorState message={error} onRetry={loadScore} />;
  }

  return (
    <div className="flex flex-col items-center py-8">
      <div className="relative w-52 h-52">
        <ResponsiveContainer width="100%" height="100%">
          <RadialBarChart
            cx="50%"
            cy="50%"
            innerRadius="65%"
            outerRadius="90%"
            startAngle={210}
            endAngle={-30}
            data={data}
            barSize={16}
          >
            <RadialBar
              dataKey="value"
              cornerRadius={8}
              background={{ fill: "var(--color-border)" }}
              isAnimationActive={false}
            />
          </RadialBarChart>
        </ResponsiveContainer>
        <div className="absolute inset-0 flex flex-col items-center justify-center">
          <span
            className="text-5xl font-bold font-[var(--font-mono)] leading-none transition-colors duration-300"
            style={{ color }}
          >
            {displayScore}
          </span>
          <span className="text-xs font-medium font-[var(--font-display)] text-[var(--color-muted)] mt-1 transition-colors duration-300" style={{ color }}>
            {getLabel(displayScore)}
          </span>
        </div>
      </div>
      <h2 className="text-sm font-semibold font-[var(--font-display)] text-[var(--color-ink)] mt-3">
        Financial Health Score
      </h2>
      <p className="text-xs text-[var(--color-muted)] mt-1">{reason}</p>
    </div>
  );
}