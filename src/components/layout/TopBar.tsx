import { Sun, Moon, Menu } from "lucide-react";
import { useStore } from "@/store/useStore";

export function TopBar() {
  const { darkMode, toggleDark, setMobileMenu } = useStore();

  return (
    <header className="h-14 shrink-0 flex items-center justify-between px-4 md:px-6 border-b border-[var(--color-border)] bg-[var(--color-surface)] transition-colors duration-300 z-20">
      {/* Left: mobile menu + logo */}
      <div className="flex items-center gap-3">
        <button
          className="md:hidden p-1.5 rounded-lg text-[var(--color-muted)] hover:bg-[var(--color-border)] transition-colors"
          onClick={() => setMobileMenu(true)}
        >
          <Menu size={18} />
        </button>
        <span
          className="md:hidden text-base font-bold font-[var(--font-display)] tracking-tight"
          style={{ background: "linear-gradient(135deg, var(--color-accent), color-mix(in srgb, var(--color-accent) 70%, var(--color-success)))", WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent", backgroundClip: "text" }}
        >
          ZFinance
        </span>
      </div>

      {/* Center: business name */}
      <span className="text-sm font-semibold font-[var(--font-display)] text-[var(--color-ink)]">
        Patel Enterprises Pvt. Ltd.
      </span>

      {/* Right: dark mode + avatar */}
      <div className="flex items-center gap-2">
        <button
          onClick={toggleDark}
          className="p-2 rounded-lg text-[var(--color-muted)] hover:bg-[var(--color-border)] hover:text-[var(--color-ink)] transition-all duration-200"
          title={darkMode ? "Switch to light mode" : "Switch to dark mode"}
        >
          {darkMode ? <Sun size={16} /> : <Moon size={16} />}
        </button>
        <div
          className="w-8 h-8 rounded-full flex items-center justify-center text-white text-xs font-bold font-[var(--font-display)] shrink-0"
          style={{ background: "linear-gradient(135deg, var(--color-accent), color-mix(in srgb, var(--color-accent) 60%, var(--color-success)))" }}
        >
          RP
        </div>
      </div>
    </header>
  );
}
