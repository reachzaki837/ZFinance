import { useState, useRef, useEffect } from "react";
import { Sun, Moon, Menu, Settings as SettingsIcon, LogOut } from "lucide-react";
import { useStore } from "@/store/useStore";
import { BUSINESS_ID } from "@/lib/api";

export function TopBar() {
  const { darkMode, toggleDark, setMobileMenu, businessName, setScreen } = useStore();
  const [menuOpen, setMenuOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);

  const initials = businessName
    .split(" ")
    .filter((w) => w.length > 0 && !["Pvt.", "Ltd.", "Inc.", "LLC"].includes(w))
    .slice(0, 2)
    .map((w) => w[0])
    .join("")
    .toUpperCase() || "ZF";

  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        setMenuOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

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

      {/* Center: business name — now dynamic */}
      <span className="text-sm font-semibold font-[var(--font-display)] text-[var(--color-ink)] truncate max-w-[50%]">
        {businessName}
      </span>

      {/* Right: dark mode + profile dropdown */}
      <div className="flex items-center gap-2 relative" ref={menuRef}>
        <button
          onClick={toggleDark}
          className="p-2 rounded-lg text-[var(--color-muted)] hover:bg-[var(--color-border)] hover:text-[var(--color-ink)] transition-all duration-200"
          title={darkMode ? "Switch to light mode" : "Switch to dark mode"}
        >
          {darkMode ? <Sun size={16} /> : <Moon size={16} />}
        </button>

        <button
          onClick={() => setMenuOpen((o) => !o)}
          className="w-8 h-8 rounded-full flex items-center justify-center text-white text-xs font-bold font-[var(--font-display)] shrink-0 transition-transform hover:scale-105"
          style={{ background: "linear-gradient(135deg, var(--color-accent), color-mix(in srgb, var(--color-accent) 60%, var(--color-success)))" }}
        >
          {initials}
        </button>

        {menuOpen && (
          <div className="absolute right-0 top-11 w-56 bg-[var(--color-surface)] border border-[var(--color-border)] rounded-xl card-shadow py-2 z-50">
            <div className="px-4 py-2 border-b border-[var(--color-border)]">
              <p className="text-sm font-semibold font-[var(--font-display)] text-[var(--color-ink)] truncate">
                {businessName}
              </p>
              <p className="text-xs font-[var(--font-mono)] text-[var(--color-muted)]">{BUSINESS_ID}</p>
            </div>
            <button
              onClick={() => { setScreen("settings"); setMenuOpen(false); }}
              className="w-full flex items-center gap-2.5 px-4 py-2.5 text-sm text-[var(--color-ink)] hover:bg-[var(--color-border)] transition-colors font-[var(--font-display)]"
            >
              <SettingsIcon size={15} className="text-[var(--color-muted)]" />
              Business Settings
            </button>
            <button
              disabled
              title="No authentication configured — this is a single-business local dashboard"
              className="w-full flex items-center gap-2.5 px-4 py-2.5 text-sm text-[var(--color-muted)] opacity-50 cursor-not-allowed font-[var(--font-display)]"
            >
              <LogOut size={15} />
              Sign out
            </button>
          </div>
        )}
      </div>
    </header>
  );
}