import { useState, useRef, useEffect } from "react";
import { Sun, Moon, Menu, Settings as SettingsIcon, LogOut } from "lucide-react";
import { Button } from "@/components/ui/Button";
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
        <Button
          variant="ghost"
          size="icon"
          className="md:hidden"
          onClick={() => setMobileMenu(true)}
          title="Open menu"
        >
          <Menu size={18} />
        </Button>
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
        <Button
          variant="ghost"
          size="icon"
          onClick={toggleDark}
          title={darkMode ? "Switch to light mode" : "Switch to dark mode"}
        >
          {darkMode ? <Sun size={16} /> : <Moon size={16} />}
        </Button>

        <Button
          variant="ghost"
          size="icon"
          onClick={() => setMenuOpen((o) => !o)}
          title="Account menu"
          className="p-0 w-8 h-8 justify-center rounded-full text-xs font-bold shrink-0 hover:scale-105"
          style={{
            background: "linear-gradient(135deg, var(--color-accent), color-mix(in srgb, var(--color-accent) 60%, var(--color-success)))",
            color: "white",
          }}
        >
          {initials}
        </Button>

        {menuOpen && (
          <div className="absolute right-0 top-11 w-56 bg-[var(--color-surface)] border border-[var(--color-border)] rounded-xl card-shadow py-2 z-50">
            <div className="px-4 py-2 border-b border-[var(--color-border)]">
              <p className="text-sm font-semibold font-[var(--font-display)] text-[var(--color-ink)] truncate">
                {businessName}
              </p>
              <p className="text-xs font-[var(--font-mono)] text-[var(--color-muted)]">{BUSINESS_ID}</p>
            </div>
            <Button
              variant="ghost"
              onClick={() => { setScreen("settings"); setMenuOpen(false); }}
              className="w-full flex justify-start rounded-none gap-2.5 px-4 py-2.5"
            >
              <SettingsIcon size={15} className="text-[var(--color-muted)]" />
              Business Settings
            </Button>
            <Button
              variant="ghost"
              disabled
              title="No authentication configured — this is a single-business local dashboard"
              className="w-full flex justify-start rounded-none gap-2.5 px-4 py-2.5"
            >
              <LogOut size={15} />
              Sign out
            </Button>
          </div>
        )}
      </div>
    </header>
  );
}