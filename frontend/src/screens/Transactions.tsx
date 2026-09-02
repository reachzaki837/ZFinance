import { useState, useEffect, useCallback } from "react";
import { Upload, ArrowUpDown, ArrowUp, ArrowDown, Search, ChevronLeft, ChevronRight } from "lucide-react";
import { Card, CardContent } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { Chip } from "@/components/ui/Chip";
import { DropZone } from "@/components/ui/DropZone";
import { ErrorState } from "@/components/ui/ErrorState";
import { Toast } from "@/components/ui/Toast";
import { Skeleton } from "@/components/ui/Skeleton";
import { getTransactions, ingestCSV, getWeeks, CURRENT_WEEK } from "@/lib/api";

const PAGE_SIZE = 10;
type SortKey = "date" | "amount";
type SortDir = "asc" | "desc";

interface Transaction {
  date: string;
  description: string;
  category: string;
  amount: number;
  week: string;
}

// Stable color per category, cycling through the app's bright chart palette
const PALETTE = ["#5B3FF0", "#0FA968", "#F0453F", "#F5A623", "#00B8D9", "#E84393", "#6C5CE7", "#00CC88"];
function colorFor(category: string): string {
  let hash = 0;
  for (let i = 0; i < category.length; i++) hash = category.charCodeAt(i) + ((hash << 5) - hash);
  return PALETTE[Math.abs(hash) % PALETTE.length];
}

function formatINR(value: number): string {
  return "₹" + Math.abs(value).toLocaleString("en-IN");
}

export function Transactions() {
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [loadingTx, setLoadingTx] = useState(true);
  const [txError, setTxError] = useState<string | null>(null);

  const [weeks, setWeeks] = useState<string[]>([]);
  const [selectedWeek, setSelectedWeek] = useState<string>("");

  const [uploading, setUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [toast, setToast] = useState<string | null>(null);
  const [uploadWeek, setUploadWeek] = useState(CURRENT_WEEK);

  const [selectedCategories, setSelectedCategories] = useState<string[]>([]);
  const [searchQuery, setSearchQuery] = useState("");
  const [sortKey, setSortKey] = useState<SortKey>("date");
  const [sortDir, setSortDir] = useState<SortDir>("desc");
  const [page, setPage] = useState(1);

  const loadTransactions = useCallback((week?: string) => {
    setLoadingTx(true);
    setTxError(null);
    getTransactions(undefined, week || undefined)
      .then((tx: Transaction[]) => setTransactions(tx))
      .catch((err) => {
        console.error("Failed to fetch transactions:", err);
        setTxError("Could not load transactions");
      })
      .finally(() => setLoadingTx(false));
  }, []);

  useEffect(() => {
    getWeeks().then(setWeeks).catch(() => {});
    loadTransactions(); // all weeks by default
  }, [loadTransactions]);

  useEffect(() => {
    loadTransactions(selectedWeek);
  }, [selectedWeek, loadTransactions]);

  async function handleUpload(file: File) {
    if (uploading || !file) return;
    setUploading(true);
    setUploadProgress(15);

    // Real request in flight — we can't track true byte progress with fetch,
    // so we show a cosmetic ramp while awaiting, then snap to 100 on success.
    const rampInterval = setInterval(() => {
      setUploadProgress((p) => (p < 85 ? p + 10 : p));
    }, 200);

    try {
      const result = await ingestCSV(file, uploadWeek);
      clearInterval(rampInterval);
      setUploadProgress(100);
      setToast(`${result.chunks_stored} chunks ingested for week ${uploadWeek}`);
      loadTransactions(selectedWeek);
      getWeeks().then(setWeeks).catch(() => {});
    } catch (err: any) {
      clearInterval(rampInterval);
      console.error("Upload failed:", err);
      setToast(`Upload failed: ${err.message || "unknown error"}`);
    } finally {
      setTimeout(() => { setUploading(false); setUploadProgress(0); }, 500);
    }
  }

  function toggleCategory(cat: string) {
    setSelectedCategories((prev) => (prev.includes(cat) ? prev.filter((c) => c !== cat) : [...prev, cat]));
    setPage(1);
  }

  function handleSort(key: SortKey) {
    if (sortKey === key) setSortDir((d) => (d === "asc" ? "desc" : "asc"));
    else { setSortKey(key); setSortDir("desc"); }
  }

  const allCategories = [...new Set(transactions.map((t) => t.category).filter(Boolean))].sort();

  const filtered = transactions
    .filter((t) => selectedCategories.length === 0 || selectedCategories.includes(t.category))
    .filter((t) => t.description?.toLowerCase().includes(searchQuery.toLowerCase()))
    .sort((a, b) => {
      let cmp = 0;
      if (sortKey === "date") cmp = a.date.localeCompare(b.date);
      if (sortKey === "amount") cmp = Math.abs(a.amount) - Math.abs(b.amount);
      return sortDir === "asc" ? cmp : -cmp;
    });

  const totalPages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
  const paginated = filtered.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);

  function SortIcon({ col }: { col: SortKey }) {
    if (sortKey !== col) return <ArrowUpDown size={12} className="opacity-40" />;
    return sortDir === "asc" ? <ArrowUp size={12} /> : <ArrowDown size={12} />;
  }

  return (
    <div className="space-y-5 pb-8">
      {toast && <Toast message={toast} onClose={() => setToast(null)} />}

      {/* Upload zone */}
      <Card>
        <CardContent className="pt-5">
          <div className="flex items-center gap-3 mb-4">
            <label className="text-xs font-semibold uppercase tracking-wider text-[var(--color-muted)] font-[var(--font-display)]">
              Week label for upload:
            </label>
            <input
              type="text"
              value={uploadWeek}
              onChange={(e) => setUploadWeek(e.target.value)}
              placeholder="2026-W12"
              className="text-xs font-[var(--font-mono)] px-3 py-1.5 rounded-lg bg-[var(--color-border)] text-[var(--color-ink)] border border-[var(--color-border)] focus:outline-none focus:ring-1 focus:ring-[var(--color-accent)]"
            />
          </div>
          <DropZone
            onSelect={handleUpload}
            disabled={uploading}
            className="p-10"
            icon={
              <div
                className="w-12 h-12 rounded-full flex items-center justify-center"
                style={{ background: "color-mix(in srgb, var(--color-accent) 12%, transparent)" }}
              >
                <Upload size={22} style={{ color: "var(--color-accent)" }} />
              </div>
            }
          >
            {uploading ? (
              <div className="w-full max-w-sm">
                <p className="text-sm font-medium text-[var(--color-ink)] text-center mb-3">Ingesting transactions…</p>
                <div className="w-full bg-[var(--color-border)] rounded-full h-2 overflow-hidden">
                  <div
                    className="h-full rounded-full transition-all duration-300"
                    style={{ width: `${uploadProgress}%`, background: "var(--color-accent)" }}
                  />
                </div>
                <p className="text-xs text-[var(--color-muted)] text-center mt-2">{uploadProgress}%</p>
              </div>
            ) : (
              <>
                <p className="text-sm font-medium font-[var(--font-display)] text-[var(--color-ink)]">
                  Drag and drop your CSV here, or click to browse
                </p>
                <p className="text-xs text-[var(--color-muted)]">
                  CSV must include: date, amount (category, description optional)
                </p>
              </>
            )}
          </DropZone>
        </CardContent>
      </Card>

      {/* Filter bar */}
      <Card>
        <CardContent className="pt-4 pb-4">
          <div className="flex flex-col gap-3">
            <div className="flex flex-wrap gap-2 items-center">
              <select
                value={selectedWeek}
                onChange={(e) => { setSelectedWeek(e.target.value); setPage(1); }}
                className="text-xs font-[var(--font-display)] bg-[var(--color-border)] text-[var(--color-ink)] px-3 py-1.5 rounded-lg border border-[var(--color-border)] focus:outline-none focus:ring-1 focus:ring-[var(--color-accent)]"
              >
                <option value="">All weeks</option>
                {weeks.map((w) => <option key={w} value={w}>{w}</option>)}
              </select>
              <div className="relative flex-1 min-w-40">
                <Search size={13} className="absolute left-3 top-1/2 -translate-y-1/2 text-[var(--color-muted)]" />
                <input
                  type="text"
                  placeholder="Search description…"
                  value={searchQuery}
                  onChange={(e) => { setSearchQuery(e.target.value); setPage(1); }}
                  className="w-full pl-8 pr-3 py-1.5 text-xs rounded-lg bg-[var(--color-border)] text-[var(--color-ink)] placeholder:text-[var(--color-muted)] border border-[var(--color-border)] focus:outline-none focus:ring-1 focus:ring-[var(--color-accent)]"
                />
              </div>
            </div>
            {allCategories.length > 0 && (
              <div className="flex flex-wrap gap-1.5">
                {allCategories.map((cat) => (
                  <Chip
                    key={cat}
                    color={colorFor(cat)}
                    active={selectedCategories.includes(cat)}
                    onClick={() => toggleCategory(cat)}
                  >
                    {cat}
                  </Chip>
                ))}
                {selectedCategories.length > 0 && (
                  <Chip onClick={() => setSelectedCategories([])}>Clear</Chip>
                )}
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Transaction table */}
      <Card>
        {loadingTx ? (
          <div className="p-5 space-y-2">
            <Skeleton className="h-10 w-full" />
            <Skeleton className="h-10 w-full" />
            <Skeleton className="h-10 w-full" />
          </div>
        ) : txError ? (
          <ErrorState message={txError} onRetry={() => loadTransactions(selectedWeek)} />
        ) : (
          <>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-[var(--color-border)]">
                    {[
                      { key: "date" as SortKey, label: "Date" },
                      { key: null, label: "Description" },
                      { key: null, label: "Category" },
                      { key: "amount" as SortKey, label: "Amount" },
                    ].map(({ key, label }) => (
                      <th
                        key={label}
                        onClick={() => key && handleSort(key)}
                        className={`px-5 py-3 text-left text-xs font-semibold font-[var(--font-display)] uppercase tracking-wider text-[var(--color-muted)] ${key ? "cursor-pointer hover:text-[var(--color-ink)] select-none" : ""}`}
                      >
                        <span className="flex items-center gap-1">
                          {label}
                          {key && <SortIcon col={key} />}
                        </span>
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {paginated.length === 0 ? (
                    <tr>
                      <td colSpan={4} className="px-5 py-12 text-center text-sm text-[var(--color-muted)]">
                        {transactions.length === 0
                          ? "No transactions ingested yet — upload a CSV above to get started."
                          : "No transactions match your filters."}
                      </td>
                    </tr>
                  ) : paginated.map((tx, i) => {
                    const isPositive = tx.amount > 0;
                    const catColor = colorFor(tx.category || "");
                    return (
                      <tr
                        key={`${tx.date}-${i}`}
                        className="border-b border-[var(--color-border)] hover:bg-[var(--color-border)] transition-colors duration-100 last:border-0"
                      >
                        <td className="px-5 py-3.5 text-xs font-[var(--font-mono)] text-[var(--color-muted)] whitespace-nowrap">
                          {tx.date}
                        </td>
                        <td className="px-5 py-3.5 text-sm text-[var(--color-ink)] max-w-xs truncate">
                          {tx.description}
                        </td>
                        <td className="px-5 py-3.5">
                          <Chip color={catColor}>{tx.category}</Chip>
                        </td>
                        <td className={`px-5 py-3.5 text-sm font-bold font-[var(--font-mono)] whitespace-nowrap ${isPositive ? "text-[var(--color-success)]" : "text-[var(--color-danger)]"}`}>
                          {isPositive ? "+" : "–"}{formatINR(tx.amount)}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
            <div className="flex items-center justify-between px-5 py-3 border-t border-[var(--color-border)]">
              <p className="text-xs text-[var(--color-muted)] font-[var(--font-body)]">
                {filtered.length} transaction{filtered.length !== 1 ? "s" : ""}
              </p>
              <div className="flex items-center gap-2">
                <Button variant="ghost" size="sm" onClick={() => setPage((p) => Math.max(1, p - 1))} disabled={page === 1}>
                  <ChevronLeft size={14} />
                </Button>
                <span className="text-xs font-[var(--font-mono)] text-[var(--color-muted)]">{page} / {totalPages}</span>
                <Button variant="ghost" size="sm" onClick={() => setPage((p) => Math.min(totalPages, p + 1))} disabled={page === totalPages}>
                  <ChevronRight size={14} />
                </Button>
              </div>
            </div>
          </>
        )}
      </Card>
    </div>
  );
}