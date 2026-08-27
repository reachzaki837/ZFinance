import { useState, useRef } from "react";
import { Upload, ArrowUpDown, ArrowUp, ArrowDown, Search, ChevronLeft, ChevronRight } from "lucide-react";
import { Card, CardContent } from "@/components/ui/Card";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { Toast } from "@/components/ui/Toast";
import { transactions, CATEGORY_COLORS, formatINR, weeks } from "@/data/mockData";
import type { Transaction } from "@/data/mockData";

const ALL_CATEGORIES = [...new Set(transactions.map((t) => t.category))].sort();
const PAGE_SIZE = 10;

type SortKey = "date" | "amount";
type SortDir = "asc" | "desc";

export function Transactions() {
  const [uploading, setUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [toast, setToast] = useState<string | null>(null);
  const [isDragging, setIsDragging] = useState(false);
  const [selectedCategories, setSelectedCategories] = useState<string[]>([]);
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedWeek, setSelectedWeek] = useState(weeks[0]);
  const [sortKey, setSortKey] = useState<SortKey>("date");
  const [sortDir, setSortDir] = useState<SortDir>("desc");
  const [page, setPage] = useState(1);
  const fileInputRef = useRef<HTMLInputElement>(null);

  function simulateUpload() {
    if (uploading) return;
    setUploading(true);
    setUploadProgress(0);
    const interval = setInterval(() => {
      setUploadProgress((p) => {
        if (p >= 100) {
          clearInterval(interval);
          setUploading(false);
          setToast("42 transactions ingested for week W12");
          return 100;
        }
        return p + 6;
      });
    }, 80);
  }

  function toggleCategory(cat: string) {
    setSelectedCategories((prev) =>
      prev.includes(cat) ? prev.filter((c) => c !== cat) : [...prev, cat]
    );
    setPage(1);
  }

  function handleSort(key: SortKey) {
    if (sortKey === key) {
      setSortDir((d) => (d === "asc" ? "desc" : "asc"));
    } else {
      setSortKey(key);
      setSortDir("desc");
    }
  }

  const filtered = transactions
    .filter((t) => selectedCategories.length === 0 || selectedCategories.includes(t.category))
    .filter((t) => t.description.toLowerCase().includes(searchQuery.toLowerCase()))
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
          <div
            onClick={() => !uploading && fileInputRef.current?.click()}
            onDragOver={(e) => { e.preventDefault(); setIsDragging(true); }}
            onDragLeave={() => setIsDragging(false)}
            onDrop={(e) => { e.preventDefault(); setIsDragging(false); simulateUpload(); }}
            className={`border-2 border-dashed rounded-xl p-10 flex flex-col items-center gap-3 cursor-pointer transition-all duration-200 ${
              isDragging
                ? "border-[var(--color-accent)] bg-[color-mix(in_srgb,var(--color-accent)_6%,transparent)]"
                : "border-[var(--color-border)] hover:border-[var(--color-accent)] hover:bg-[color-mix(in_srgb,var(--color-accent)_4%,transparent)]"
            }`}
          >
            <div
              className="w-12 h-12 rounded-full flex items-center justify-center"
              style={{ background: "color-mix(in srgb, var(--color-accent) 12%, transparent)" }}
            >
              <Upload size={22} style={{ color: "var(--color-accent)" }} />
            </div>
            {uploading ? (
              <div className="w-full max-w-sm">
                <p className="text-sm font-medium text-[var(--color-ink)] text-center mb-3">Ingesting transactions…</p>
                <div className="w-full bg-[var(--color-border)] rounded-full h-2 overflow-hidden">
                  <div
                    className="h-full rounded-full transition-all duration-100"
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
                <p className="text-xs text-[var(--color-muted)]">Supports standard bank export CSV files</p>
              </>
            )}
          </div>
          <input ref={fileInputRef} type="file" accept=".csv" className="hidden" onChange={simulateUpload} />
        </CardContent>
      </Card>

      {/* Filter bar */}
      <Card>
        <CardContent className="pt-4 pb-4">
          <div className="flex flex-col gap-3">
            <div className="flex flex-wrap gap-2 items-center">
              <select
                value={selectedWeek}
                onChange={(e) => setSelectedWeek(e.target.value)}
                className="text-xs font-[var(--font-display)] bg-[var(--color-border)] text-[var(--color-ink)] px-3 py-1.5 rounded-lg border border-[var(--color-border)] focus:outline-none focus:ring-1 focus:ring-[var(--color-accent)]"
              >
                {weeks.map((w) => <option key={w}>{w}</option>)}
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
            <div className="flex flex-wrap gap-1.5">
              {ALL_CATEGORIES.map((cat) => {
                const active = selectedCategories.includes(cat);
                const color = CATEGORY_COLORS[cat] || "var(--color-accent)";
                return (
                  <button
                    key={cat}
                    onClick={() => toggleCategory(cat)}
                    className="text-xs px-2.5 py-1 rounded-full font-medium font-[var(--font-display)] border transition-all duration-150"
                    style={{
                      color: active ? "white" : color,
                      background: active ? color : `color-mix(in srgb, ${color} 10%, transparent)`,
                      borderColor: `color-mix(in srgb, ${color} 30%, transparent)`,
                    }}
                  >
                    {cat}
                  </button>
                );
              })}
              {selectedCategories.length > 0 && (
                <button
                  onClick={() => setSelectedCategories([])}
                  className="text-xs px-2.5 py-1 rounded-full font-medium font-[var(--font-display)] text-[var(--color-muted)] hover:text-[var(--color-ink)] transition-colors"
                >
                  Clear
                </button>
              )}
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Transaction table */}
      <Card>
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
                    className={`px-5 py-3 text-left text-[10px] font-semibold font-[var(--font-display)] uppercase tracking-wider text-[var(--color-muted)] ${key ? "cursor-pointer hover:text-[var(--color-ink)] select-none" : ""}`}
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
                    No transactions match your filters.
                  </td>
                </tr>
              ) : paginated.map((tx: Transaction) => {
                const isPositive = tx.amount > 0;
                const catColor = CATEGORY_COLORS[tx.category] || "var(--color-muted)";
                return (
                  <tr
                    key={tx.id}
                    className="border-b border-[var(--color-border)] hover:bg-[var(--color-border)] transition-colors duration-100 last:border-0"
                  >
                    <td className="px-5 py-3.5 text-xs font-[var(--font-mono)] text-[var(--color-muted)] whitespace-nowrap">
                      {tx.date}
                    </td>
                    <td className="px-5 py-3.5 text-sm text-[var(--color-ink)] max-w-xs truncate">
                      {tx.description}
                    </td>
                    <td className="px-5 py-3.5">
                      <span
                        className="text-xs px-2 py-0.5 rounded-full font-medium font-[var(--font-display)]"
                        style={{
                          color: catColor,
                          background: `color-mix(in srgb, ${catColor} 12%, transparent)`,
                        }}
                      >
                        {tx.category}
                      </span>
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
        {/* Pagination */}
        <div className="flex items-center justify-between px-5 py-3 border-t border-[var(--color-border)]">
          <p className="text-xs text-[var(--color-muted)] font-[var(--font-body)]">
            {filtered.length} transaction{filtered.length !== 1 ? "s" : ""}
          </p>
          <div className="flex items-center gap-2">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setPage((p) => Math.max(1, p - 1))}
              disabled={page === 1}
            >
              <ChevronLeft size={14} />
            </Button>
            <span className="text-xs font-[var(--font-mono)] text-[var(--color-muted)]">
              {page} / {totalPages}
            </span>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
              disabled={page === totalPages}
            >
              <ChevronRight size={14} />
            </Button>
          </div>
        </div>
      </Card>
    </div>
  );
}
