import { type ComponentType } from "react";
import { LayoutDashboard, ArrowLeftRight, GitCompare, MessageCircle, Settings, ChevronLeft, ChevronRight, X } from "lucide-react";
import { useStore, type Screen } from "@/store/useStore";

const NAV_ITEMS: { id: Screen; label: string; icon: ComponentType<{ size?: number; className?: string }> }[] = [
  { id: "overview", label: "Overview", icon: LayoutDashboard },
  { id: "transactions", label: "Transactions", icon: ArrowLeftRight },
  { id: "reconciliation", label: "Reconciliation", icon: GitCompare },
  { id: "ask", label: "Ask ZFinance", icon: MessageCircle },
  { id: "settings", label: "Settings", icon: Settings },
];

export function Sidebar() {
  const { activeScreen, sidebarCollapsed, mobileMenuOpen, setScreen, toggleSidebar, setMobileMenu } = useStore();

  return (
    <>
      {/* Mobile overlay */}
      {mobileMenuOpen && (
        <div
          className="fixed inset-0 z-30 bg-black/40 backdrop-blur-sm md:hidden"
          onClick={() => setMobileMenu(false)}
        />
      )}

      {/* Sidebar */}
      <aside
        className={`
          fixed top-0 left-0 h-full z-40 flex flex-col
          bg-[var(--color-surface)] border-r border-[var(--color-border)]
          transition-all duration-300 ease-out
          ${sidebarCollapsed ? "w-16" : "w-56"}
          ${mobileMenuOpen ? "translate-x-0" : "-translate-x-full"}
          md:translate-x-0 md:static md:flex
        `}
      >
        {/* Logo area */}
        <div className="flex items-center justify-between px-4 h-14 border-b border-[var(--color-border)] shrink-0">
          {!sidebarCollapsed && (
            <span
              className="text-base font-bold font-[var(--font-display)] tracking-tight"
              style={{ background: "linear-gradient(135deg, var(--color-accent), color-mix(in srgb, var(--color-accent) 70%, var(--color-success)))", WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent", backgroundClip: "text" }}
            >
              ZFinance
            </span>
          )}
          <button
            onClick={() => { toggleSidebar(); setMobileMenu(false); }}
            className="hidden md:flex p-1.5 rounded-lg text-[var(--color-muted)] hover:bg-[var(--color-border)] hover:text-[var(--color-ink)] transition-colors ml-auto"
          >
            {sidebarCollapsed ? <ChevronRight size={16} /> : <ChevronLeft size={16} />}
          </button>
          <button
            onClick={() => setMobileMenu(false)}
            className="md:hidden p-1.5 rounded-lg text-[var(--color-muted)] hover:bg-[var(--color-border)] transition-colors"
          >
            <X size={16} />
          </button>
        </div>

        {/* Nav items */}
        <nav className="flex-1 py-4 space-y-1 px-2 overflow-hidden">
          {NAV_ITEMS.map(({ id, label, icon: Icon }) => {
            const active = activeScreen === id;
            return (
              <button
                key={id}
                onClick={() => setScreen(id)}
                title={sidebarCollapsed ? label : undefined}
                className={`
                  w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium font-[var(--font-display)]
                  transition-all duration-200 group
                  ${active
                    ? "bg-[color-mix(in_srgb,var(--color-accent)_12%,transparent)] text-[var(--color-accent)]"
                    : "text-[var(--color-muted)] hover:bg-[var(--color-border)] hover:text-[var(--color-ink)]"
                  }
                `}
              >
                <Icon size={18} className="shrink-0" />
                {!sidebarCollapsed && <span className="truncate">{label}</span>}
                {active && !sidebarCollapsed && (
                  <span className="ml-auto w-1.5 h-1.5 rounded-full bg-[var(--color-accent)]" />
                )}
              </button>
            );
          })}
        </nav>

        {/* Bottom: business tag */}
        {!sidebarCollapsed && (
          <div className="px-4 py-4 border-t border-[var(--color-border)]">
            <p className="text-[10px] font-[var(--font-mono)] text-[var(--color-muted)] truncate">BIZ-00142</p>
            <p className="text-xs text-[var(--color-muted)] truncate mt-0.5">Patel Enterprises</p>
          </div>
        )}
      </aside>
    </>
  );
}
