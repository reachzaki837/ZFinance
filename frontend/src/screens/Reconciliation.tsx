import { useState } from "react";
import { Upload, CheckCircle, Sparkles, AlertTriangle, ChevronDown, ChevronUp, PlayCircle } from "lucide-react";
import { Card, CardHeader, CardContent } from "@/components/ui/Card";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { Chip } from "@/components/ui/Chip";
import { DropZone } from "@/components/ui/DropZone";
import { ErrorState } from "@/components/ui/ErrorState";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from "recharts";
import { useStore } from "@/store/useStore";
import { getReconciliationDemo, runReconciliation } from "@/lib/api";

function formatINR(value: number): string {
  return "₹" + Math.abs(value).toLocaleString("en-IN");
}

const STAGE_MESSAGES = [
  "Stage 1: Exact matching…",
  "Stage 2: AI fuzzy matching…",
  "Stage 3: Classifying exceptions…",
];

const EXCEPTION_TYPE_LABELS: Record<string, string> = {
  missing_from_bank: "Missing from Bank",
  amount_discrepancy: "Amount Difference",
  date_shift: "Date Shift",
  description_mismatch: "Description Mismatch",
  split_transaction: "Split Transaction",
  bank_duplicate: "Duplicate",
  unknown: "Unknown",
};

interface ExceptionItem {
  ledger_ref: string;
  amount: number;
  date: string;
  description: string;
  exception_type: string;
  confidence: number;
  evidence: string;
  recommendation: string;
  candidates: string[];
}

interface ReconciliationResult {
  summary: {
    total_ledger: number;
    total_bank: number;
    exact_matches: number;
    fuzzy_matches: number;
    exceptions: number;
    unmatched_bank: number;
    match_rate: number;
  };
  exceptions: ExceptionItem[];
}

/** Labelled CSV drop target: wraps the shared DropZone with this screen's icon + caption. */
function CsvDropZone({ label, file, onSelect }: { label: string; file: File | null; onSelect: (f: File) => void }) {
  return (
    <DropZone
      onSelect={onSelect}
      state={file ? "success" : "idle"}
      icon={
        file
          ? <CheckCircle size={28} style={{ color: "var(--color-success)" }} />
          : <Upload size={28} style={{ color: "var(--color-accent)" }} />
      }
    >
      <p className="text-sm font-semibold font-[var(--font-display)] text-[var(--color-ink)] text-center">{label}</p>
      <p className="text-xs text-[var(--color-muted)]">{file ? file.name : "Click or drag to upload"}</p>
    </DropZone>
  );
}

export function Reconciliation() {
  const [ledgerFile, setLedgerFile] = useState<File | null>(null);
  const [bankFile, setBankFile] = useState<File | null>(null);
  const [running, setRunning] = useState(false);
  const [stageIndex, setStageIndex] = useState(0);
  const [result, setResult] = useState<ReconciliationResult | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [openException, setOpenException] = useState<string | null>(null);
  // True when the displayed result came from the bundled sample files rather than an upload.
  const [isDemoData, setIsDemoData] = useState(false);
  const { darkMode } = useStore();

  const barColor = darkMode ? "#FFB84D" : "#F5A623";
  const axisColor = darkMode ? "#9C97A8" : "#8A8580";
  const gridColor = darkMode ? "#2E2C3A" : "#E8E4DA";

  async function execute(runner: () => Promise<any>, demo: boolean) {
    setRunning(true);
    setError(null);
    setResult(null);
    setStageIndex(0);
    setIsDemoData(demo);

    // Cosmetic stage progression while the real request is in flight —
    // the backend doesn't stream per-stage events, so this approximates
    // the pipeline's real 3-stage structure (accurate, just not live-ticked).
    const stageTimer = setInterval(() => {
      setStageIndex((s) => Math.min(s + 1, STAGE_MESSAGES.length - 1));
    }, 8000);

    try {
      const data = await runner();
      clearInterval(stageTimer);
      setStageIndex(STAGE_MESSAGES.length - 1);
      setResult(data);
    } catch (err: any) {
      clearInterval(stageTimer);
      console.error("Reconciliation failed:", err);
      setError(err.message || "Reconciliation failed. Check that the backend is running.");
    } finally {
      setRunning(false);
    }
  }

  const exceptionChartData = result
    ? Object.entries(
        result.exceptions.reduce((acc: Record<string, number>, e) => {
          acc[e.exception_type] = (acc[e.exception_type] || 0) + 1;
          return acc;
        }, {})
      ).map(([type, count]) => ({ type, count }))
    : [];

  return (
    <div className="space-y-5 pb-8">
      {/* Upload section */}
      <Card>
        <CardHeader>
          <h2 className="text-sm font-semibold font-[var(--font-display)] text-[var(--color-ink)]">
            AI Reconciliation Agent
          </h2>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-5">
            <CsvDropZone label="Upload Ledger CSV" file={ledgerFile} onSelect={setLedgerFile} />
            <CsvDropZone label="Upload Bank Statement CSV" file={bankFile} onSelect={setBankFile} />
          </div>

          {running && (
            <div className="mb-5 p-4 rounded-xl bg-[var(--color-border)]">
              <p className="text-sm font-medium font-[var(--font-display)] text-[var(--color-ink)] mb-3">
                {STAGE_MESSAGES[stageIndex]}
              </p>
              <div className="w-full bg-[var(--color-surface)] rounded-full h-2 overflow-hidden">
                <div
                  className="h-full rounded-full transition-all duration-700"
                  style={{
                    width: `${((stageIndex + 1) / STAGE_MESSAGES.length) * 100}%`,
                    background: "linear-gradient(90deg, var(--color-accent), var(--color-success))",
                  }}
                />
              </div>
              <p className="text-xs text-[var(--color-muted)] mt-2">
                Real AI calls in progress — this can take 30-90 seconds for larger files.
              </p>
            </div>
          )}

          {error && <ErrorState message={error} />}

          <div className="flex gap-3 flex-wrap">
            <Button
              disabled={!ledgerFile || !bankFile || running}
              onClick={() => execute(() => runReconciliation(ledgerFile!, bankFile!), false)}
            >
              {running ? "Running…" : "Run Reconciliation"}
            </Button>
            <Button
              variant="outline"
              disabled={running}
              onClick={() => execute(() => getReconciliationDemo(), true)}
            >
              <PlayCircle size={14} />
              Try with sample data
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Results */}
      {result && (
        <>
          <div className="flex items-center gap-2">
            <h2 className="text-sm font-semibold font-[var(--font-display)] text-[var(--color-ink)]">
              Reconciliation Results
            </h2>
            {isDemoData && <Badge variant="accent">Sample data</Badge>}
          </div>

          {/* Stat cards */}
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
            {[
              { label: "Match Rate", value: `${(result.summary.match_rate * 100).toFixed(1)}%`, extra: result.summary.match_rate * 100 },
              { label: "Exact Matches", value: result.summary.exact_matches, icon: <CheckCircle size={16} /> },
              { label: "Fuzzy Matches", value: result.summary.fuzzy_matches, icon: <Sparkles size={16} /> },
              { label: "Exceptions", value: result.summary.exceptions, icon: <AlertTriangle size={16} /> },
            ].map(({ label, value, extra }) => (
              <Card key={label}>
                <CardContent className="pt-5 text-center">
                  {label === "Match Rate" && extra !== undefined && (
                    <div className="mx-auto mb-3 relative w-16 h-16">
                      <svg viewBox="0 0 64 64" className="w-full h-full -rotate-90">
                        <circle cx="32" cy="32" r="26" fill="none" stroke="var(--color-border)" strokeWidth="6" />
                        <circle
                          cx="32" cy="32" r="26" fill="none"
                          stroke="var(--color-success)" strokeWidth="6"
                          strokeDasharray={`${(extra / 100) * 163.4} 163.4`}
                          strokeLinecap="round"
                          style={{ transition: "stroke-dasharray 0.8s ease-out" }}
                        />
                      </svg>
                      <span className="absolute inset-0 flex items-center justify-center text-sm font-bold font-[var(--font-mono)] text-[var(--color-ink)]">
                        {extra.toFixed(0)}%
                      </span>
                    </div>
                  )}
                  {label !== "Match Rate" && (
                    <p className="text-3xl font-bold font-[var(--font-mono)] text-[var(--color-ink)] mb-1">{value}</p>
                  )}
                  <p className="text-xs font-semibold uppercase tracking-wider text-[var(--color-muted)] font-[var(--font-display)]">{label}</p>
                </CardContent>
              </Card>
            ))}
          </div>

          {/* Exception chart */}
          {exceptionChartData.length > 0 && (
            <Card>
              <CardHeader>
                <h2 className="text-sm font-semibold font-[var(--font-display)] text-[var(--color-ink)]">
                  Exception Breakdown
                </h2>
              </CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={Math.max(120, exceptionChartData.length * 44)}>
                  <BarChart data={exceptionChartData} layout="vertical" margin={{ top: 0, right: 16, left: 140, bottom: 0 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke={gridColor} horizontal={false} />
                    <XAxis type="number" allowDecimals={false} tick={{ fill: axisColor, fontSize: 11, fontFamily: "JetBrains Mono, monospace" }} axisLine={false} tickLine={false} />
                    <YAxis
                      type="category" dataKey="type"
                      tickFormatter={(v) => EXCEPTION_TYPE_LABELS[v] || v}
                      tick={{ fill: axisColor, fontSize: 11, fontFamily: "var(--font-display)" }}
                      axisLine={false} tickLine={false} width={140}
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
          )}

          {/* Exception cards */}
          <div className="space-y-3">
            <h2 className="text-sm font-semibold font-[var(--font-display)] text-[var(--color-ink)]">
              Exception Details
            </h2>
            {result.exceptions.length === 0 ? (
              <Card>
                <CardContent className="py-8 text-center">
                  <CheckCircle size={32} className="mx-auto mb-2" style={{ color: "var(--color-success)" }} />
                  <p className="text-sm text-[var(--color-muted)]">No unresolved exceptions — everything reconciled.</p>
                </CardContent>
              </Card>
            ) : result.exceptions.map((ex) => {
              const isOpen = openException === ex.ledger_ref;
              const isCritical = ex.exception_type === "bank_duplicate" || ex.confidence < 0.5;
              return (
                <Card key={ex.ledger_ref}>
                  <Button
                    variant="ghost"
                    className="w-full flex justify-between px-5 py-4 text-left rounded-none"
                    onClick={() => setOpenException(isOpen ? null : ex.ledger_ref)}
                  >
                    <div className="flex items-center gap-3 flex-wrap">
                      <span className="text-xs font-[var(--font-mono)] text-[var(--color-muted)]">{ex.ledger_ref}</span>
                      <span className="text-sm font-bold font-[var(--font-mono)] text-[var(--color-ink)]">
                        {formatINR(ex.amount)}
                      </span>
                      <span className="text-xs text-[var(--color-muted)] font-[var(--font-mono)]">{ex.date}</span>
                      <Badge variant={isCritical ? "danger" : "warning"}>
                        {EXCEPTION_TYPE_LABELS[ex.exception_type] || ex.exception_type}
                      </Badge>
                    </div>
                    {isOpen ? <ChevronUp size={14} className="text-[var(--color-muted)] shrink-0" /> : <ChevronDown size={14} className="text-[var(--color-muted)] shrink-0" />}
                  </Button>
                  {isOpen && (
                    <div className="px-5 pb-5 border-t border-[var(--color-border)] pt-4">
                      <p className="text-sm text-[var(--color-ink)] leading-relaxed mb-3">{ex.evidence}</p>
                      {ex.recommendation && (
                        <p className="text-xs text-[var(--color-muted)] italic mb-4">
                          Recommendation: {ex.recommendation}
                        </p>
                      )}
                      {ex.candidates.length > 0 ? (
                        <div>
                          <p className="text-xs font-semibold uppercase tracking-wider text-[var(--color-muted)] mb-2">
                            Candidates Considered
                          </p>
                          <div className="flex flex-wrap gap-2">
                            {ex.candidates.map((c) => (
                              <Chip key={c} className="font-[var(--font-mono)]">{c}</Chip>
                            ))}
                          </div>
                        </div>
                      ) : (
                        <p className="text-xs text-[var(--color-muted)] italic">No bank candidates found within the search window.</p>
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