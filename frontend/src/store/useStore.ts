import { createContext, useContext, useState } from "react";

export type Screen = "overview" | "transactions" | "reconciliation" | "ask" | "settings";

export interface AppState {
  activeScreen: Screen;
  sidebarCollapsed: boolean;
  darkMode: boolean;
  selectedWeek: string;
  mobileMenuOpen: boolean;
  businessName: string;
  setScreen: (s: Screen) => void;
  toggleSidebar: () => void;
  toggleDark: () => void;
  setWeek: (w: string) => void;
  setMobileMenu: (open: boolean) => void;
  setBusinessName: (name: string) => void;
}

function getInitialDark(): boolean {
  try {
    const stored = localStorage.getItem("zfinance-dark");
    if (stored !== null) return stored === "true";
    return window.matchMedia("(prefers-color-scheme: dark)").matches;
  } catch {
    return false;
  }
}

function getInitialBusinessName(): string {
  try {
    return localStorage.getItem("zfinance-business-name") || "Patel Enterprises Pvt. Ltd.";
  } catch {
    return "Patel Enterprises Pvt. Ltd.";
  }
}

function applyDark(dark: boolean) {
  if (dark) {
    document.documentElement.classList.add("dark");
  } else {
    document.documentElement.classList.remove("dark");
  }
}

export const AppContext = createContext<AppState | null>(null);

export function useAppState(): AppState {
  const [activeScreen, setActiveScreen] = useState<Screen>("overview");
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [darkMode, setDarkMode] = useState(() => {
    const d = getInitialDark();
    applyDark(d);
    return d;
  });
  const [selectedWeek, setSelectedWeek] = useState("Aug 18 – Aug 24, 2026");
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [businessName, setBusinessNameState] = useState(getInitialBusinessName);

  return {
    activeScreen,
    sidebarCollapsed,
    darkMode,
    selectedWeek,
    mobileMenuOpen,
    businessName,
    setScreen: (s: Screen) => { setActiveScreen(s); setMobileMenuOpen(false); },
    toggleSidebar: () => setSidebarCollapsed((c) => !c),
    toggleDark: () => setDarkMode((d) => {
      const next = !d;
      applyDark(next);
      try { localStorage.setItem("zfinance-dark", String(next)); } catch {}
      return next;
    }),
    setWeek: setSelectedWeek,
    setMobileMenu: setMobileMenuOpen,
    setBusinessName: (name: string) => {
      setBusinessNameState(name);
      try { localStorage.setItem("zfinance-business-name", name); } catch {}
    },
  };
}

export function useStore(): AppState {
  const ctx = useContext(AppContext);
  if (!ctx) throw new Error("useStore must be used within AppProvider");
  return ctx;
}