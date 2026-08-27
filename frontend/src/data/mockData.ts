export function formatINR(value: number): string {
  return "₹" + Math.abs(value).toLocaleString("en-IN");
}

export function formatINRShort(value: number): string {
  if (Math.abs(value) >= 10_00_000) {
    return "₹" + (Math.abs(value) / 10_00_000).toFixed(1) + "L";
  }
  if (Math.abs(value) >= 1_00_000) {
    return "₹" + (Math.abs(value) / 1_00_000).toFixed(1) + "L";
  }
  if (Math.abs(value) >= 1000) {
    return "₹" + (Math.abs(value) / 1000).toFixed(0) + "k";
  }
  return "₹" + Math.abs(value).toLocaleString("en-IN");
}

export const healthScore = 74;
export const healthScoreReason = "Strong margins, stable revenue growth";

export interface KPI {
  label: string;
  value: number;
  delta: number;
  deltaLabel: string;
  prefix?: string;
  suffix?: string;
  isPercent?: boolean;
}

export const kpiData: KPI[] = [
  { label: "Revenue", value: 18_45_230, delta: 12.4, deltaLabel: "vs last week", prefix: "₹" },
  { label: "Expenses", value: 11_22_840, delta: 3.1, deltaLabel: "vs last week", prefix: "₹" },
  { label: "Net Profit", value: 7_22_390, delta: 28.7, deltaLabel: "vs last week", prefix: "₹" },
  { label: "Margin %", value: 39.15, delta: 4.8, deltaLabel: "vs last week", isPercent: true },
];

export interface WeeklyDataPoint {
  week: string;
  revenue: number;
  expenses: number;
}

export const chartData: WeeklyDataPoint[] = [
  { week: "W01", revenue: 13_20_000, expenses: 9_40_000 },
  { week: "W02", revenue: 14_10_000, expenses: 9_80_000 },
  { week: "W03", revenue: 13_80_000, expenses: 10_20_000 },
  { week: "W04", revenue: 15_30_000, expenses: 10_50_000 },
  { week: "W05", revenue: 14_90_000, expenses: 10_10_000 },
  { week: "W06", revenue: 16_20_000, expenses: 10_80_000 },
  { week: "W07", revenue: 15_70_000, expenses: 11_00_000 },
  { week: "W08", revenue: 16_80_000, expenses: 10_60_000 },
  { week: "W09", revenue: 17_10_000, expenses: 11_30_000 },
  { week: "W10", revenue: 16_50_000, expenses: 10_90_000 },
  { week: "W11", revenue: 17_80_000, expenses: 11_10_000 },
  { week: "W12", revenue: 18_45_230, expenses: 11_22_840 },
];

export const aiNarrative = [
  "Patel Enterprises closed Week 12 with its strongest revenue in the trailing 12 weeks — ₹18,45,230 — driven primarily by a 23% uptick in the Wholesale channel and a robust performance in B2B services. The operating leverage is clear: revenue grew faster than expenses for the third consecutive week, pushing net profit to ₹7,22,390.",
  "Expense discipline held firm. Total outflows of ₹11,22,840 represent only a 3.1% increase week-over-week, well below the 12.4% revenue growth rate. The largest expense categories remain Salaries & Wages (₹4,10,000) and Vendor Payments (₹3,85,000), both in line with historical run rates. No significant cost overruns were detected.",
  "Looking ahead, the current trajectory puts the business on track to cross ₹20L weekly revenue within the next 2–3 weeks if the Wholesale momentum sustains. Margin compression risk exists if vendor input costs rise; the AI anomaly radar is watching the Procurement category closely. Overall financial health is rated 74/100 — solid fundamentals with room to grow.",
];

export interface Anomaly {
  id: string;
  category: string;
  sigma: number;
  isCritical: boolean;
  description: string;
}

export const anomalies: Anomaly[] = [
  {
    id: "a1",
    category: "Marketing",
    sigma: 3.2,
    isCritical: false,
    description: "Ad spend jumped 41% above 8-week average — ₹82,000 vs typical ₹58,000. Likely tied to the product launch campaign.",
  },
  {
    id: "a2",
    category: "Vendor Payments",
    sigma: 4.7,
    isCritical: true,
    description: "Two duplicate payments detected to Supplier #V-0042 totalling ₹1,14,000. Requires immediate review.",
  },
];

export interface Transaction {
  id: string;
  date: string;
  description: string;
  category: string;
  amount: number;
}

const CATEGORIES = ["Sales", "Rent", "Salaries", "Marketing", "Vendor", "Utilities", "Travel", "Software", "Refund", "Loan"];
const CATEGORY_COLORS: Record<string, string> = {
  Sales: "#0FA968",
  Rent: "#F0453F",
  Salaries: "#5B3FF0",
  Marketing: "#F5A623",
  Vendor: "#00B8D9",
  Utilities: "#E84393",
  Travel: "#6C5CE7",
  Software: "#00CC88",
  Refund: "#F5A623",
  Loan: "#F0453F",
};

export { CATEGORY_COLORS };

export const transactions: Transaction[] = [
  { id: "T001", date: "2026-08-24", description: "B2B Sales — Mehta & Sons", category: "Sales", amount: 4_80_000 },
  { id: "T002", date: "2026-08-24", description: "Google Ads Campaign", category: "Marketing", amount: -82_000 },
  { id: "T003", date: "2026-08-23", description: "Office Rent — Aug", category: "Rent", amount: -95_000 },
  { id: "T004", date: "2026-08-23", description: "Wholesale Channel — Gupta Traders", category: "Sales", amount: 3_20_000 },
  { id: "T005", date: "2026-08-23", description: "Staff Salaries — Aug W3", category: "Salaries", amount: -4_10_000 },
  { id: "T006", date: "2026-08-22", description: "Vendor Payment — V-0042 (Dup)", category: "Vendor", amount: -57_000 },
  { id: "T007", date: "2026-08-22", description: "Vendor Payment — V-0042", category: "Vendor", amount: -57_000 },
  { id: "T008", date: "2026-08-22", description: "Retail Sales — Online", category: "Sales", amount: 2_10_000 },
  { id: "T009", date: "2026-08-21", description: "Electricity Bill — Aug", category: "Utilities", amount: -18_500 },
  { id: "T010", date: "2026-08-21", description: "SaaS — Zoho Suite", category: "Software", amount: -12_000 },
  { id: "T011", date: "2026-08-21", description: "Export Order — Dubai", category: "Sales", amount: 6_20_000 },
  { id: "T012", date: "2026-08-20", description: "Sales Return — SKU#4821", category: "Refund", amount: -24_000 },
  { id: "T013", date: "2026-08-20", description: "Business Travel — Mumbai", category: "Travel", amount: -38_000 },
  { id: "T014", date: "2026-08-20", description: "Wholesale — Sharma Distributors", category: "Sales", amount: 1_85_000 },
  { id: "T015", date: "2026-08-19", description: "Vendor Payment — V-0019 Raw Materials", category: "Vendor", amount: -2_71_840 },
  { id: "T016", date: "2026-08-19", description: "Corporate Sales — TechCo India", category: "Sales", amount: 1_30_000 },
  { id: "T017", date: "2026-08-19", description: "Internet & Telecom", category: "Utilities", amount: -8_200 },
  { id: "T018", date: "2026-08-18", description: "Term Loan Repayment", category: "Loan", amount: -1_20_000 },
  { id: "T019", date: "2026-08-18", description: "Direct Sales — Walk-in", category: "Sales", amount: 1_00_230 },
  { id: "T020", date: "2026-08-18", description: "Facebook Ads", category: "Marketing", amount: -22_000 },
];

export const weeks = [
  "Aug 18 – Aug 24, 2026",
  "Aug 11 – Aug 17, 2026",
  "Aug 04 – Aug 10, 2026",
  "Jul 28 – Aug 03, 2026",
  "Jul 21 – Jul 27, 2026",
  "Jul 14 – Jul 20, 2026",
];

export interface ReconciliationException {
  id: string;
  ledgerRef: string;
  amount: number;
  date: string;
  type: "missing_from_bank" | "amount_diff" | "date_shift" | "description_mismatch" | "split_transaction" | "duplicate";
  evidence: string;
  candidates: string[];
}

export const reconciliationExceptions: ReconciliationException[] = [
  {
    id: "e1",
    ledgerRef: "LDG-2026-0842",
    amount: 57000,
    date: "2026-08-22",
    type: "duplicate",
    evidence: "Two identical entries found in bank statement for ₹57,000 to V-0042 on Aug 22. Ledger has only one. Likely double-payment error.",
    candidates: ["BNK-220822-0041", "BNK-220822-0042"],
  },
  {
    id: "e2",
    ledgerRef: "LDG-2026-0798",
    amount: 480000,
    date: "2026-08-24",
    type: "amount_diff",
    evidence: "Ledger records ₹4,80,000 from Mehta & Sons. Bank shows ₹4,78,500 — a ₹1,500 shortfall, possibly a bank fee deduction.",
    candidates: ["BNK-240822-0011"],
  },
  {
    id: "e3",
    ledgerRef: "LDG-2026-0761",
    amount: 38000,
    date: "2026-08-20",
    type: "date_shift",
    evidence: "Travel expense of ₹38,000 recorded in ledger on Aug 20, but bank debit shows Aug 22. 2-day settlement lag.",
    candidates: ["BNK-220822-0029"],
  },
  {
    id: "e4",
    ledgerRef: "LDG-2026-0710",
    amount: 100000,
    date: "2026-08-17",
    type: "missing_from_bank",
    evidence: "Ledger entry of ₹1,00,000 has no matching bank credit within ±3 days. May be a cheque not yet cleared.",
    candidates: [],
  },
];

export const exceptionChartData = [
  { type: "missing_from_bank", count: 1 },
  { type: "amount_diff", count: 1 },
  { type: "date_shift", count: 1 },
  { type: "description_mismatch", count: 0 },
  { type: "split_transaction", count: 0 },
  { type: "duplicate", count: 1 },
];

export const ingestedWeeks = [
  { week: "Aug 18 – Aug 24, 2026", txCount: 42 },
  { week: "Aug 11 – Aug 17, 2026", txCount: 38 },
  { week: "Aug 04 – Aug 10, 2026", txCount: 45 },
  { week: "Jul 28 – Aug 03, 2026", txCount: 41 },
];

export const chatResponses: Record<string, string> = {
  "Why did costs rise last week?":
    "Costs rose 3.1% last week, primarily driven by a ₹82,000 spike in Marketing (Google Ads campaign for the product launch) and a duplicate vendor payment of ₹57,000 to V-0042. Excluding the duplicate, underlying expense growth was just 1.4% — well within acceptable range.",
  "Which category had the highest spend?":
    "Salaries & Wages was the highest spend category at ₹4,10,000, accounting for 36.5% of total expenses. This is consistent with the 8-week average. The next largest was Vendor Payments at ₹3,85,000 (34.3%), followed by Rent at ₹95,000 (8.5%).",
  "What was our best revenue week?":
    "Week 12 (Aug 18–24, 2026) is your best revenue week in the trailing 12 weeks at ₹18,45,230. This was driven by the Export Order to Dubai (₹6,20,000) and strong B2B sales to Mehta & Sons (₹4,80,000). The previous high was Week 11 at ₹17,80,000.",
  "Are there any anomalies I should worry about?":
    "Yes — two anomalies flagged this week. First, a **duplicate payment** of ₹57,000 to Supplier V-0042 (4.7σ deviation — CRITICAL). This requires immediate action to request a reversal. Second, Marketing spend is elevated at 3.2σ above average, but this appears intentional (product launch). Prioritize the duplicate payment review.",
};
