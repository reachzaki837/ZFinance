import { useState } from "react";
import { Upload, CheckCircle, Sparkles, AlertTriangle, ChevronDown, ChevronUp } from "lucide-react";
import { Card, CardHeader, CardContent } from "@/components/ui/Card";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from "recharts";
import { reconciliationExceptions, exceptionChartData, formatINR } from "@/data/mockData";
import { useStore } from "@/store/useStore";

const STAGES = [
  "Stage 1: Exact matching…",
  "Stage 2: AI fuzzy matching…",
  "Stage 3: Classifying exceptions…",
  "Complete",
];

const EXCEPTION_TYPE_LABELS: Record<string, string> = {
  missing_from_bank: "Missing from Bank",
  amount_diff: "Amount Difference",
  date_shift: "Date Shift",
  description_mismatch: "Description Mismatch",
  split_transaction: "Split Transaction",
  duplicate: "Duplicate",
};

function DropZone({ label, uploaded, onUpload }: { label: string; uploaded: boolean; onUpload: () => void }) {
  const [dragging, setDragging] = useState(false);
  return (
    <div
      onClick={onUpload}
      onDragOver={(e) => { e.preventDefault(); setDragging(true); }}
      onDragLeave={() => setDragging(false)}
      onDrop={(e) => { e.preventDefault(); setDragging(false); onUpload(); }}
      className={`border-2 border-dashed rounded-xl p-8 flex flex-col items-center gap-3 cursor-pointer transition-all duration-200 ${
        uploaded
          ? "border-[var(--color-success)] bg-[color-mix(in_srgb,var(--color-success)_6%,transparent)]"
          : dragging
          ? "border-[var(--color-accent)] bg-[color-mix(in_srgb,var(--color-accent)_6%,transparent)]"
          : "border-[var(--color-border)] hover:border-[var(--color-accent)] hover:bg-[color-mix(in_srgb,var(--color-accent)_4%,transparent)]"
      }`}
    >
      {uploaded ? (
        <CheckCircle size={28} style={{ color: "var(--color-success)" }} />
      ) : (
        <Upload size={28} style={{ color: "var(--color-accent)" }} />
      )}
      <p className="text-sm font-semibold font-[var(--font-display)] text-[var(--color-ink)] text-center">{label}</p>
      <p className="text-xs text-[var(--color-muted)]">{uploaded ? "File loaded — ready" : "Click or drag to upload"}</p>
    </div>
  );
}

export function Reconciliation() {
  const [ledgerUploaded, setLedgerUploaded] = useState(false);
  const [bankUploaded, setBankUploaded] = useState(false);
  const [running, setRunning] = useState(false);
  const [stageIndex, setStageIndex] = useState(-1);
  const [done, setDone] = useState(false);
  const [openException, setOpenException] = useState<string | null>(null);
  const { darkMode } = useStore();

  const barColor = darkMode ? "#FFB84D" : "#F5A623";
  const axisColor = darkMode ? "#9C97A8" : "#8A8578";
  const gridColor = darkMode ? "#2E2C3A" : "#E8E4DA";

  function runReconciliation() {
    setRunning(true);
    setStageIndex(0);
    let idx = 0;
    const interval = setInterval(() => {
      idx += 1;
      setStageIndex(idx);
      if (idx >= STAGES.length - 1) {
        clearInterval(interval);
        setTimeout(() => { setRunning(false); setDone(true); }, 600);
      }
    }, 1100);
  }

  const matchRate = 89;
  const exactMatches = 31;
  const fuzzyMatches = 5;
  const exceptions = reconciliationExceptions.length;

  return (
    <div className="space-y-5 pb-8">
      {/* Upload section */}
      <Card>
        <CardHeader>
          <span className="text-sm font-semibold font-[var(--font-display)] text-[var(--color-ink)]">
            AI Reconciliation Agent
          </span>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-5">
            <DropZone label="Upload Ledger CSV" uploaded={ledgerUploaded} onUpload={() => setLedgerUploaded(true)} />
            <DropZone label="Upload Bank Statement CSV" uploaded={bankUploaded} onUpload={() => setBankUploaded(true)} />
          </div>

          {running && (
            <div className="mb-5 p-4 rounded-xl bg-[var(--color-border)]">
              <p className="text-sm font-medium font-[var(--font-display)] text-[var(--color-ink)] mb-3">
                {STAGES[Math.min(stageIndex, STAGES.length - 1)]}
              </p>
              <div className="w-full bg-[var(--color-surface)] rounded-full h-2 overflow-hidden">
                <div
                  className="h-full rounded-full transition-all duration-700"
                  style={{
                    width: `${Math.min(100, ((stageIndex + 1) / STAGES.length) * 100)}%`,
                    background: "linear-gradient(90deg, var(--color-accent), var(--color-success))",
                  }}
                />
              </div>
            </div>
          )}

          <Button
            disabled={!ledgerUploaded || !bankUploaded || running || done}
            onClick={runReconciliation}
          >
            {done ? "Reconciliation Complete" : running ? "Running…" : "Run Reconciliation"}
          </Button>
        </CardContent>
      </Card>

      {/* Results */}
      {done && (
        <>
          {/* Stat cards */}
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
            {[
              { label: "Match Rate", value: `${matchRate}%`, icon: null, variant: "success" as const, extra: matchRate },
              { label: "Exact Matches", value: exactMatches, icon: <CheckCircle size={16} />, variant: "success" as const },
              { label: "Fuzzy Matches", value: fuzzyMatches, icon: <Sparkles size={16} />, variant: "accent" as const },
              { label: "Exceptions", value: exceptions, icon: <AlertTriangle size={16} />, variant: exceptions > 0 ? "danger" as const : "success" as const },
            ].map(({ label, value, variant, extra }) => (
              <Card key={label}>
                <CardContent className="pt-5 text-center">
                  {label === "Match Rate" && (
                    <div className="mx-auto mb-3 relative w-16 h-16">
                      <svg viewBox="0 0 64 64" className="w-full h-full -rotate-90">
                        <circle cx="32" cy="32" r="26" fill="none" stroke="var(--color-border)" strokeWidth="6" />
                        <circle
                          cx="32" cy="32" r="26" fill="none"
                          stroke="var(--color-success)" strokeWidth="6"
                          strokeDasharray={`${(extra! / 100) * 163.4} 163.4`}
                          strokeLinecap="round"
                          style={{ transition: "stroke-dasharray 0.8s ease-out" }}
                        />
                      </svg>
                      <span className="absolute inset-0 flex items-center justify-center text-sm font-bold font-[var(--font-mono)] text-[var(--color-ink)]">
                        {extra}%
                      </span>
                    </div>
                  )}
                  {label !== "Match Rate" && (
                    <p className="text-3xl font-bold font-[var(--font-mono)] text-[var(--color-ink)] mb-1">{value}</p>
                  )}
                  <p className="text-[10px] font-semibold uppercase tracking-wider text-[var(--color-muted)] font-[var(--font-display)]">{label}</p>
                </CardContent>
              </Card>
            ))}
          </div>

          {/* Exception chart */}
          <Card>
            <CardHeader>
              <span className="text-sm font-semibold font-[var(--font-display)] text-[var(--color-ink)]">
                Exception Breakdown
              </span>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={200}>
                <BarChart
                  data={exceptionChartData}
                  layout="vertical"
                  margin={{ top: 0, right: 16, left: 120, bottom: 0 }}
                >
                  <CartesianGrid strokeDasharray="3 3" stroke={gridColor} horizontal={false} />
                  <XAxis
                    type="number"
                    allowDecimals={false}
                    tick={{ fill: axisColor, fontSize: 11, fontFamily: "JetBrains Mono, monospace" }}
                    axisLine={false}
                    tickLine={false}
                  />
                  <YAxis
                    type="category"
                    dataKey="type"
                    tickFormatter={(v) => EXCEPTION_TYPE_LABELS[v] || v}
                    tick={{ fill: axisColor, fontSize: 11, fontFamily: "var(--font-display)" }}
                    axisLine={false}
                    tickLine={false}
                    width={120}
                  />
                  <Tooltip
                    formatter={(v) => [v, "Count"]}
                    contentStyle={{ background: "var(--color-surface)", border: "1px solid var(--color-border)", borderRadius: 12, fontSize: 12 }}
                  />
                  <Bar dataKey="count" fill={barColor} radius={[0, 4, 4, 0]} animationDuration={700} />
                </BarChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>

          {/* Exception cards */}
          <div className="space-y-3">
            <h3 className="text-sm font-semibold font-[var(--font-display)] text-[var(--color-ink)]">
              Exception Details
            </h3>
            {reconciliationExceptions.map((ex) => {
              const isOpen = openException === ex.id;
              const isCritical = ex.type === "duplicate";
              return (
                <Card key={ex.id}>
                  <button
                    className="w-full flex items-center justify-between px-5 py-4 text-left"
                    onClick={() => setOpenException(isOpen ? null : ex.id)}
                  >
                    <div className="flex items-center gap-3 flex-wrap">
                      <span className="text-xs font-[var(--font-mono)] text-[var(--color-muted)]">{ex.ledgerRef}</span>
                      <span className="text-sm font-bold font-[var(--font-mono)] text-[var(--color-ink)]">
                        {formatINR(ex.amount)}
                      </span>
                      <span className="text-xs text-[var(--color-muted)] font-[var(--font-mono)]">{ex.date}</span>
                      <Badge variant={isCritical ? "danger" : "warning"}>
                        {EXCEPTION_TYPE_LABELS[ex.type]}
                      </Badge>
                    </div>
                    {isOpen ? <ChevronUp size={14} className="text-[var(--color-muted)] shrink-0" /> : <ChevronDown size={14} className="text-[var(--color-muted)] shrink-0" />}
                  </button>
                  {isOpen && (
                    <div className="px-5 pb-5 border-t border-[var(--color-border)] pt-4">
                      <p className="text-sm text-[var(--color-ink)] leading-relaxed mb-4">{ex.evidence}</p>
                      {ex.candidates.length > 0 && (
                        <div>
                          <p className="text-[10px] font-semibold uppercase tracking-wider text-[var(--color-muted)] mb-2">
                            Candidates Considered
                          </p>
                          <div className="flex flex-wrap gap-2">
                            {ex.candidates.map((c) => (
                              <span
                                key={c}
                                className="text-xs font-[var(--font-mono)] px-2.5 py-1 rounded-lg bg-[var(--color-border)] text-[var(--color-muted)]"
                              >
                                {c}
                              </span>
                            ))}
                          </div>
                        </div>
                      )}
                      {ex.candidates.length === 0 && (
                        <p className="text-xs text-[var(--color-muted)] italic">No bank candidates found within ±3 days.</p>
                      )}
                    </div>
                  )}
                </Card>
              );
            })}
          </div>
        </>
      )}
    </div>
  );
}
