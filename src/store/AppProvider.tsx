import { type ReactNode } from "react";
import { AppContext, useAppState } from "./useStore";

export function AppProvider({ children }: { children: ReactNode }) {
  const state = useAppState();
  return <AppContext.Provider value={state}>{children}</AppContext.Provider>;
}
