# ZFinance Financial Dashboard — Implementation Plan

## Context

Build ZFinance, an AI-powered portfolio and reconciliation platform for SMBs. The app is a blank-slate Vite + React 19 + TypeScript + Tailwind CSS v4 project. We need a full multi-screen financial dashboard with sidebar navigation, animated health score, KPI cards, AI narrative, Recharts line charts, and anomaly detection.

**Aesthetic stance:** Clean, editorial, data-forward — calm UI chrome with vivid chart colors. Light mode default, system-preference-aware on first load, user choice persisted to localStorage. NOT generic SaaS. The visual identity is: quiet shell, vibrant data.

### Exact Color Palette

**Light mode (default):**
| Token | Value |
|---|---|
| Background | `#FAFAF7` |
| Surface/card | `#FFFFFF` |
| Primary text | `#1A1A1A` |
| Muted text | `#8A8578` |
| Border | `#E8E4DA` |
| Accent | `#5B3FF0` |
| Success | `#0FA968` |
| Danger | `#F0453F` |
| Warning | `#F5A623` |

**Dark mode:**
| Token | Value |
|---|---|
| Background | `#16151F` |
| Surface/card | `#201F2B` |
| Primary text | `#F5F3EE` |
| Muted text | `#9C97A8` |
| Border | `#2E2C3A` |
| Accent | `#7C67FF` |
| Success | `#1FCE84` |
| Danger | `#FF5F58` |
| Warning | `#FFB84D` |

**Chart colors (vivid, both modes — light values / dark values):**
1. `#5B3FF0` / `#7C67FF` — cobalt violet
2. `#0FA968` / `#1FCE84` — kelly green
3. `#F0453F` / `#FF5F58` — coral red
4. `#F5A623` / `#FFB84D` — marigold
5. `#00B8D9` / `#22D3EE` — electric cyan
6. `#E84393` / `#FF6EB4` — hot pink

**Shadows:**
- Light: warm-gray drop shadow, large blur, low opacity
- Dark: accent-tinted glow shadow at very low opacity

**Typography:** DM Sans (headings/UI), Inter (body), JetBrains Mono (all numbers and monetary values)

**Animations:** 300ms ease-out for theme/state transitions; chart draw-in on load; health score dial 0→score over 600ms ease-out; theme cross-fade (no flash)

---

## Dependencies to Install

```bash
pnpm add recharts lucide-react zustand
```

shadcn/ui requires a CLI setup incompatible with this environment — build equivalent UI primitives manually with Tailwind.

---

## Font Wiring (src/index.css)

Add Google Fonts `@import` before `@import 'tailwindcss'`:

```css
@import url('https://fonts.googleapis.com/css2?family=DM+Sans:wght@400;500;600;700&family=Inter:wght@400;500;600&family=JetBrains+Mono:wght@400;500&display=swap');
@import 'tailwindcss';
```

Add `@theme` block in `src/index.css` for design tokens (dark theme defaults):
- `--background: #0b0f1a` (deep navy)
- `--foreground: #e8eaf0`
- `--card: #131929`
- `--card-foreground: #e8eaf0`
- `--primary: #6366f1` (indigo)
- `--muted: #1e2a3a`
- `--muted-foreground: #8b9ab0`
- `--border: rgba(255,255,255,0.08)`
- Revenue green: `#10b981`; Expenses amber: `#f59e0b`; Danger: `#ef4444`

---

## File Structure

```
src/
  index.css                    # font imports + Tailwind + CSS tokens
  App.tsx                      # root: sidebar + topbar + screen router
  store/
    useStore.ts                # Zustand: active screen, sidebar collapsed, dark mode, week
  data/
    mockData.ts                # all mock data (KPIs, chart series, anomalies, transactions)
  components/
    layout/
      Sidebar.tsx              # collapsible nav with 5 items
      TopBar.tsx               # logo, week selector, dark/light toggle, avatar
    ui/
      Card.tsx                 # Card, CardHeader, CardContent, CardFooter
      Badge.tsx                # variant: default | success | warning | danger
      Button.tsx               # variant: default | ghost | outline
      Skeleton.tsx             # animated shimmer skeleton
    overview/
      HealthScoreGauge.tsx     # Recharts RadialBarChart, 0-100, animates on mount
      KPICards.tsx             # 4-card grid row
      AINarrative.tsx          # AI summary card with shimmer + refresh
      RevenueExpenseChart.tsx  # Recharts LineChart, 12 weeks, dual lines
      AnomalyRadar.tsx         # anomaly list or empty state
  screens/
    Overview.tsx               # composes all overview components
    Transactions.tsx           # table of transactions (mock data, sortable columns)
    Reconciliation.tsx         # placeholder with status cards
    AskZFinance.tsx            # chat-style AI interface (static mock)
    Settings.tsx               # preference toggles (mock)
```

---

## Implementation Details

### src/store/useStore.ts
Zustand store with:
- `activeScreen: 'overview' | 'transactions' | 'reconciliation' | 'ask' | 'settings'`
- `sidebarCollapsed: boolean`
- `darkMode: boolean`
- `selectedWeek: string` (e.g. "Aug 18 – Aug 24")

### src/data/mockData.ts
Export typed objects:
```ts
export const kpiData = { revenue, expenses, netProfit, margin, ... }
export const chartData: WeeklyDataPoint[]  // 12 entries with week, revenue, expenses
export const anomalies: Anomaly[]
export const transactions: Transaction[]
export const healthScore = 74
export const aiNarrative: string[]  // 3 paragraphs
```

All numbers use Indian comma grouping: ₹1,45,230 (custom formatter function).

### HealthScoreGauge (Recharts)
- Use `RadialBarChart` with a single `RadialBar`
- Animate from 0 → actual score on mount using `useState` + `useEffect` with a short delay
- Color: red < 40, amber 40–70, green ≥ 70 — computed dynamically
- Overlay score text and label in absolute-positioned div centered on chart

### RevenueExpenseChart (Recharts)
- `LineChart` with `CartesianGrid`, `XAxis`, `YAxis`, `Tooltip`, `Legend`
- Two `Line` components: revenue (indigo/blue) and expenses (amber)
- Custom `Tooltip` styled to match dark theme
- `tickFormatter` on YAxis for Indian number formatting

### AINarrative Card
- Two states: `loading` (shimmer Skeleton lines) and `loaded` (3 paragraphs)
- Simulate 1.5s loading on mount with `setTimeout`
- Refresh button re-triggers loading state
- Footer disclaimer in muted small text

### AnomalyRadar
- Map over `anomalies` array; empty array renders green checkmark empty state
- Each anomaly: category name, severity Badge (amber for σ < 4, red for CRITICAL), description

### Sidebar
- Desktop: full width (220px) or icon-only (64px) based on `sidebarCollapsed`
- Tablet (~1024px): icon-only by default
- Mobile (<768px): hidden; hamburger in TopBar reveals it as overlay drawer
- Transition: `transition-all duration-200`

### TopBar
- Left: ZFinance wordmark (DM Sans bold, indigo gradient text)
- Center: business name "Patel Enterprises Pvt. Ltd." + week selector (styled `<select>`)
- Right: dark/light toggle (Sun/Moon icon button), user avatar circle

### Indian Number Formatter
```ts
export function formatINR(value: number): string {
  return '₹' + value.toLocaleString('en-IN');
}
```

---

## Screen 2: Transactions

**a) CSV Upload Zone**
- Full-width dashed-border dropzone using `onDragOver` / `onDrop` handlers (no real file parsing — simulate)
- Upload icon + label; on "upload", animate a progress bar from 0→100% over ~1.5s
- After progress completes, show a success toast (custom fixed-position toast component): "42 transactions ingested for week W12"

**b) Filter Bar**
- Week selector `<select>`, category multi-select rendered as toggleable chips (click to active/inactive), free-text search input
- Filter state in local `useState`; filter logic applied to mock data array

**c) Transaction Table**
- Columns: Date | Description | Category (colored Badge) | Amount
- Amount: green text for positive (revenue), red for expense/negative
- Sortable headers for Date and Amount — click toggles asc/desc, shows sort arrow icon
- 20 rows per page; pagination controls (prev/next + page indicator) at bottom
- Row hover: subtle background highlight

---

## Screen 3: Reconciliation

**a) Two-file upload section**
- Side-by-side Cards: "Upload Ledger CSV" and "Upload Bank Statement CSV", each with a dropzone
- "Run Reconciliation" button disabled until both "files" are uploaded (simulated via click-to-upload state)
- On run: animated multi-stage progress — "Stage 1: Exact matching…", "Stage 2: AI fuzzy matching…", "Stage 3: Classifying exceptions…" — cycling with a progress bar, auto-advances every ~1s

**b) Results summary row (4 stat cards)**
- Match Rate (large %, circular SVG progress ring), Exact Matches (count + checkmark), Fuzzy Matches (count + sparkle), Exceptions (count + alert, red if > 0)
- Rendered only after reconciliation "completes"

**c) Exception breakdown chart**
- Recharts `BarChart` (horizontal) with bar per exception type: missing_from_bank, amount_diff, date_shift, description_mismatch, split_transaction, duplicate
- Amber/red color fill

**d) Exception detail list (expandable cards)**
- Each card collapsed by default; click header to expand
- Header: Ledger ref ID + amount + date + exception type Badge
- Expanded: plain-English evidence text + "Candidates considered" list of bank refs evaluated but rejected
- `useState` per-card open/close, or a single `openId` state

---

## Screen 4: Ask ZFinance

**a) Empty state**
- Centered sparkle icon + heading "Ask anything about your finances"
- 4 clickable suggestion chips that populate the input

**b) Chat message list**
- User messages: right-aligned solid indigo bubble
- AI responses: left-aligned Card with subtle border (not bubble)
- Typing indicator: 3 animated bouncing dots, shown ~1.5s then replaced by mock AI response
- Messages in `useState` array; suggestion chips push a user message + trigger AI reply

**c) Fixed input bar**
- Text input + send button (PaperPlane icon), disabled when empty
- On send: append user message, show typing indicator, then append mock AI response after delay

---

## Screen 5: Settings

**a) Business Profile card** — read-only Business ID (monospace), editable Business Name input, Save button (shows "Saved!" flash on click)

**b) AI Engine Configuration card** — LLM Model `<select>` (llama3.1 / phi4-mini / mistral / groq-llama3-8b), Anomaly Sensitivity slider (1.5–4.0σ with live value display), Embedding Model read-only field

**c) Reconciliation Settings card** — Amount Tolerance number input (₹), Date Tolerance number input (days), Confidence Threshold slider (0.5–1.0)

**d) Data Management card** — table of ingested weeks (Week label, Tx count, Delete button); Delete triggers a confirmation modal (`<dialog>` or custom overlay) before removing the row from local state

---

## Verification

1. `pnpm dev` — app loads in preview panel
2. Sidebar navigation switches between all 5 screens
3. Sidebar collapse/expand works
4. Health gauge animates on Overview load
5. Revenue/Expense chart renders with hover tooltips
6. AI Narrative shows shimmer then text after ~1.5s
7. Anomaly list renders; empty state shown when array is empty
8. Dark/light mode toggle switches color scheme
9. Responsive: sidebar collapses on narrow viewport
