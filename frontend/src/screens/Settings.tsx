import { useState, useEffect } from "react";
import { Save, Trash2, AlertTriangle } from "lucide-react";
import { Card, CardHeader, CardContent } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { Skeleton } from "@/components/ui/Skeleton";
import { getWeeks, deleteWeek, BUSINESS_ID } from "@/lib/api";
import { useStore } from "@/store/useStore";

export function Settings() {
  const { businessName, setBusinessName } = useStore();
  const [nameInput, setNameInput] = useState(businessName);
  const [saved, setSaved] = useState(false);
  const [llmModel] = useState("openai/gpt-oss-20b (via Groq)");
  const [anomalySensitivity, setAnomalySensitivity] = useState(2.5);
  const [amountTolerance, setAmountTolerance] = useState(500);
  const [dateTolerance, setDateTolerance] = useState(3);
  const [confidenceThreshold, setConfidenceThreshold] = useState(0.75);

  const [weeks, setWeeks] = useState<string[]>([]);
  const [loadingWeeks, setLoadingWeeks] = useState(true);
  const [weeksError, setWeeksError] = useState<string | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<string | null>(null);
  const [deleting, setDeleting] = useState(false);

  function loadWeeks() {
    setLoadingWeeks(true);
    setWeeksError(null);
    getWeeks()
      .then((w: string[]) => setWeeks(w))
      .catch((err) => {
        console.error("Failed to fetch weeks:", err);
        setWeeksError("Could not load ingested weeks");
      })
      .finally(() => setLoadingWeeks(false));
  }

  useEffect(() => {
    loadWeeks();
  }, []);

  function handleSave() {
    setBusinessName(nameInput.trim() || "Unnamed Business");
    setSaved(true);
    setTimeout(() => setSaved(false), 2000);
  }

  function confirmDelete(week: string) {
    setDeleteTarget(week);
  }

  async function doDelete() {
    if (!deleteTarget) return;
    setDeleting(true);
    try {
      await deleteWeek(deleteTarget);
      setWeeks((prev) => prev.filter((w) => w !== deleteTarget));
    } catch (err) {
      console.error("Failed to delete week:", err);
    } finally {
      setDeleting(false);
      setDeleteTarget(null);
    }
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
              <Button variant="outline" onClick={() => setDeleteTarget(null)} disabled={deleting}>Cancel</Button>
              <Button variant="danger" onClick={doDelete} disabled={deleting}>
                {deleting ? "Deleting…" : "Delete"}
              </Button>
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
                {BUSINESS_ID}
              </p>
            </div>
            <div>
              <label className="block text-xs font-semibold uppercase tracking-wider text-[var(--color-muted)] mb-1.5 font-[var(--font-display)]">
                Business Name
              </label>
              <input
                type="text"
                value={nameInput}
                onChange={(e) => setNameInput(e.target.value)}
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
              <p className="text-sm font-[var(--font-mono)] text-[var(--color-muted)] bg-[var(--color-border)] px-3 py-2 rounded-lg">
                {llmModel}
              </p>
              <p className="text-[10px] text-[var(--color-muted)] mt-1.5">
                Configured server-side via LLM_MODEL in the backend .env — not user-editable here to avoid pointing at an unsupported model.
              </p>
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
            <p className="text-[10px] text-[var(--color-muted)]">
              Reconciliation thresholds are configured server-side via AMOUNT_TOLERANCE, DATE_TOLERANCE, and CONFIDENCE_ACCEPT in the backend .env. The sliders above are illustrative — wire a settings-write endpoint if you want these to control the live engine.
            </p>
          </div>
        </CardContent>
      </Card>

      {/* Data Management */}
      <Card>
        <CardHeader>
          <span className="text-sm font-semibold font-[var(--font-display)] text-[var(--color-ink)]">Data Management</span>
        </CardHeader>
        <CardContent>
          {loadingWeeks ? (
            <div className="space-y-2">
              <Skeleton className="h-14 w-full rounded-xl" />
              <Skeleton className="h-14 w-full rounded-xl" />
            </div>
          ) : weeksError ? (
            <p className="text-sm text-[var(--color-danger)] py-4 text-center">{weeksError}</p>
          ) : weeks.length === 0 ? (
            <p className="text-sm text-[var(--color-muted)] py-4 text-center">No ingested data found.</p>
          ) : (
            <div className="space-y-2">
              {weeks.map((week) => (
                <div
                  key={week}
                  className="flex items-center justify-between py-3 px-4 rounded-xl bg-[var(--color-border)]"
                >
                  <div>
                    <p className="text-sm font-medium font-[var(--font-display)] text-[var(--color-ink)]">{week}</p>
                    <p className="text-xs text-[var(--color-muted)] font-[var(--font-mono)]">Ingested</p>
                  </div>
                  <Button variant="danger" size="sm" onClick={() => confirmDelete(week)}>
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