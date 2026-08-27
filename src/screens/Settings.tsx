import { useState } from "react";
import { Save, Trash2, AlertTriangle } from "lucide-react";
import { Card, CardHeader, CardContent } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { ingestedWeeks } from "@/data/mockData";

export function Settings() {
  const [businessName, setBusinessName] = useState("Patel Enterprises Pvt. Ltd.");
  const [saved, setSaved] = useState(false);
  const [llmModel, setLlmModel] = useState("llama3.1");
  const [anomalySensitivity, setAnomalySensitivity] = useState(2.5);
  const [amountTolerance, setAmountTolerance] = useState(500);
  const [dateTolerance, setDateTolerance] = useState(3);
  const [confidenceThreshold, setConfidenceThreshold] = useState(0.75);
  const [weeks, setWeeks] = useState(ingestedWeeks);
  const [deleteTarget, setDeleteTarget] = useState<string | null>(null);

  function handleSave() {
    setSaved(true);
    setTimeout(() => setSaved(false), 2000);
  }

  function confirmDelete(week: string) {
    setDeleteTarget(week);
  }

  function doDelete() {
    if (!deleteTarget) return;
    setWeeks((prev) => prev.filter((w) => w.week !== deleteTarget));
    setDeleteTarget(null);
  }

  return (
    <div className="space-y-5 max-w-2xl pb-8">
      {/* Delete confirmation modal */}
      {deleteTarget && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm">
          <div className="bg-[var(--color-surface)] border border-[var(--color-border)] rounded-2xl p-6 w-full max-w-sm mx-4 card-shadow">
            <div className="flex items-center gap-3 mb-4">
              <AlertTriangle size={20} style={{ color: "var(--color-danger)" }} />
              <h3 className="text-base font-semibold font-[var(--font-display)] text-[var(--color-ink)]">Delete Week Data?</h3>
            </div>
            <p className="text-sm text-[var(--color-muted)] mb-5 font-[var(--font-body)]">
              This will permanently remove all transaction data for <strong className="text-[var(--color-ink)]">{deleteTarget}</strong>. This action cannot be undone.
            </p>
            <div className="flex gap-3 justify-end">
              <Button variant="outline" onClick={() => setDeleteTarget(null)}>Cancel</Button>
              <Button variant="danger" onClick={doDelete}>Delete</Button>
            </div>
          </div>
        </div>
      )}

      {/* Business Profile */}
      <Card>
        <CardHeader>
          <span className="text-sm font-semibold font-[var(--font-display)] text-[var(--color-ink)]">Business Profile</span>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <div>
              <label className="block text-xs font-semibold uppercase tracking-wider text-[var(--color-muted)] mb-1.5 font-[var(--font-display)]">
                Business ID
              </label>
              <p className="text-sm font-[var(--font-mono)] text-[var(--color-muted)] bg-[var(--color-border)] px-3 py-2 rounded-lg">
                BIZ-00142
              </p>
            </div>
            <div>
              <label className="block text-xs font-semibold uppercase tracking-wider text-[var(--color-muted)] mb-1.5 font-[var(--font-display)]">
                Business Name
              </label>
              <input
                type="text"
                value={businessName}
                onChange={(e) => setBusinessName(e.target.value)}
                className="w-full text-sm px-3 py-2 rounded-lg bg-[var(--color-border)] text-[var(--color-ink)] border border-[var(--color-border)] focus:outline-none focus:ring-2 focus:ring-[var(--color-accent)] transition-all font-[var(--font-body)]"
              />
            </div>
            <Button onClick={handleSave}>
              <Save size={14} />
              {saved ? "Saved!" : "Save Changes"}
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* AI Engine Configuration */}
      <Card>
        <CardHeader>
          <span className="text-sm font-semibold font-[var(--font-display)] text-[var(--color-ink)]">AI Engine Configuration</span>
        </CardHeader>
        <CardContent>
          <div className="space-y-5">
            <div>
              <label className="block text-xs font-semibold uppercase tracking-wider text-[var(--color-muted)] mb-1.5 font-[var(--font-display)]">
                LLM Model
              </label>
              <select
                value={llmModel}
                onChange={(e) => setLlmModel(e.target.value)}
                className="w-full text-sm px-3 py-2 rounded-lg bg-[var(--color-border)] text-[var(--color-ink)] border border-[var(--color-border)] focus:outline-none focus:ring-2 focus:ring-[var(--color-accent)] transition-all font-[var(--font-body)]"
              >
                {["llama3.1", "phi4-mini", "mistral", "groq-llama3-8b"].map((m) => (
                  <option key={m} value={m}>{m}</option>
                ))}
              </select>
            </div>
            <div>
              <div className="flex items-center justify-between mb-1.5">
                <label className="text-xs font-semibold uppercase tracking-wider text-[var(--color-muted)] font-[var(--font-display)]">
                  Anomaly Sensitivity
                </label>
                <span className="text-sm font-bold font-[var(--font-mono)] text-[var(--color-accent)]">
                  {anomalySensitivity.toFixed(1)}σ
                </span>
              </div>
              <input
                type="range"
                min={1.5}
                max={4.0}
                step={0.1}
                value={anomalySensitivity}
                onChange={(e) => setAnomalySensitivity(Number(e.target.value))}
                className="w-full accent-[var(--color-accent)] cursor-pointer"
              />
              <div className="flex justify-between text-[10px] text-[var(--color-muted)] mt-1 font-[var(--font-mono)]">
                <span>1.5σ (sensitive)</span>
                <span>4.0σ (strict)</span>
              </div>
            </div>
            <div>
              <label className="block text-xs font-semibold uppercase tracking-wider text-[var(--color-muted)] mb-1.5 font-[var(--font-display)]">
                Embedding Model
              </label>
              <p className="text-sm font-[var(--font-mono)] text-[var(--color-muted)] bg-[var(--color-border)] px-3 py-2 rounded-lg">
                all-MiniLM-L6-v2
              </p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Reconciliation Settings */}
      <Card>
        <CardHeader>
          <span className="text-sm font-semibold font-[var(--font-display)] text-[var(--color-ink)]">Reconciliation Settings</span>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-semibold uppercase tracking-wider text-[var(--color-muted)] mb-1.5 font-[var(--font-display)]">
                  Amount Tolerance (₹)
                </label>
                <input
                  type="number"
                  value={amountTolerance}
                  onChange={(e) => setAmountTolerance(Number(e.target.value))}
                  className="w-full text-sm px-3 py-2 rounded-lg bg-[var(--color-border)] text-[var(--color-ink)] border border-[var(--color-border)] focus:outline-none focus:ring-2 focus:ring-[var(--color-accent)] transition-all font-[var(--font-mono)]"
                />
              </div>
              <div>
                <label className="block text-xs font-semibold uppercase tracking-wider text-[var(--color-muted)] mb-1.5 font-[var(--font-display)]">
                  Date Tolerance (days)
                </label>
                <input
                  type="number"
                  value={dateTolerance}
                  onChange={(e) => setDateTolerance(Number(e.target.value))}
                  className="w-full text-sm px-3 py-2 rounded-lg bg-[var(--color-border)] text-[var(--color-ink)] border border-[var(--color-border)] focus:outline-none focus:ring-2 focus:ring-[var(--color-accent)] transition-all font-[var(--font-mono)]"
                />
              </div>
            </div>
            <div>
              <div className="flex items-center justify-between mb-1.5">
                <label className="text-xs font-semibold uppercase tracking-wider text-[var(--color-muted)] font-[var(--font-display)]">
                  Confidence Threshold
                </label>
                <span className="text-sm font-bold font-[var(--font-mono)] text-[var(--color-accent)]">
                  {confidenceThreshold.toFixed(2)}
                </span>
              </div>
              <input
                type="range"
                min={0.5}
                max={1.0}
                step={0.01}
                value={confidenceThreshold}
                onChange={(e) => setConfidenceThreshold(Number(e.target.value))}
                className="w-full accent-[var(--color-accent)] cursor-pointer"
              />
              <div className="flex justify-between text-[10px] text-[var(--color-muted)] mt-1 font-[var(--font-mono)]">
                <span>0.50 (permissive)</span>
                <span>1.00 (exact only)</span>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Data Management */}
      <Card>
        <CardHeader>
          <span className="text-sm font-semibold font-[var(--font-display)] text-[var(--color-ink)]">Data Management</span>
        </CardHeader>
        <CardContent>
          {weeks.length === 0 ? (
            <p className="text-sm text-[var(--color-muted)] py-4 text-center">No ingested data found.</p>
          ) : (
            <div className="space-y-2">
              {weeks.map((w) => (
                <div
                  key={w.week}
                  className="flex items-center justify-between py-3 px-4 rounded-xl bg-[var(--color-border)]"
                >
                  <div>
                    <p className="text-sm font-medium font-[var(--font-display)] text-[var(--color-ink)]">{w.week}</p>
                    <p className="text-xs text-[var(--color-muted)] font-[var(--font-mono)]">{w.txCount} transactions</p>
                  </div>
                  <Button variant="danger" size="sm" onClick={() => confirmDelete(w.week)}>
                    <Trash2 size={12} />
                    Delete
                  </Button>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
