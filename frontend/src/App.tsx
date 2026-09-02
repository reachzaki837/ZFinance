import { useStore } from "@/store/useStore";
import { Sidebar } from "@/components/layout/Sidebar";
import { TopBar } from "@/components/layout/TopBar";
import { BackendBanner } from "@/components/layout/BackendBanner";
import { Overview } from "@/screens/Overview";
import { Transactions } from "@/screens/Transactions";
import { Reconciliation } from "@/screens/Reconciliation";
import { AskZFinance } from "@/screens/AskZFinance";
import { Settings } from "@/screens/Settings";

const SCREEN_TITLES: Record<string, string> = {
  overview: "Overview",
  transactions: "Transactions",
  reconciliation: "Reconciliation",
  ask: "Ask ZFinance",
  settings: "Settings",
};

export default function App() {
  const { activeScreen } = useStore();

  return (
    <div
      className="flex h-full transition-colors duration-300"
      style={{ background: "var(--color-bg)", color: "var(--color-ink)" }}
    >
      <Sidebar />

      <div className="flex-1 flex flex-col min-w-0 overflow-hidden">
        <BackendBanner />
        <TopBar />

        <main className="flex-1 overflow-y-auto px-4 md:px-6 py-6">
          <div className="mb-5">
            <h1 className="text-xl font-bold font-[var(--font-display)] text-[var(--color-ink)]">
              {SCREEN_TITLES[activeScreen]}
            </h1>
          </div>

          {activeScreen === "overview" && <Overview />}
          {activeScreen === "transactions" && <Transactions />}
          {activeScreen === "reconciliation" && <Reconciliation />}
          {activeScreen === "ask" && <AskZFinance />}
          {activeScreen === "settings" && <Settings />}
        </main>
      </div>
    </div>
  );
}
