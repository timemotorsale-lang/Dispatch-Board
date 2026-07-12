"use client";

import { createContext, type ReactNode, useContext, useEffect, useState } from "react";

export type WorkspaceMode = "standard" | "compact" | "focus";

type WorkspaceModeContextValue = {
  mode: WorkspaceMode;
  setMode(mode: WorkspaceMode): void;
};

const WORKSPACE_MODE_STORAGE_KEY = "dispatch-board:workspace-mode";
const WorkspaceModeContext = createContext<WorkspaceModeContextValue | null>(null);

function isWorkspaceMode(value: string | null): value is WorkspaceMode {
  return value === "standard" || value === "compact" || value === "focus";
}

export function WorkspaceModeProvider({ children }: { children: ReactNode }) {
  const [mode, setMode] = useState<WorkspaceMode>("compact");

  useEffect(() => {
    const storedMode = window.localStorage.getItem(WORKSPACE_MODE_STORAGE_KEY);

    if (isWorkspaceMode(storedMode)) {
      // Restore the user preference after hydration so server markup stays deterministic.
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setMode(storedMode);
    }
  }, []);

  function handleModeChange(nextMode: WorkspaceMode) {
    setMode(nextMode);
    window.localStorage.setItem(WORKSPACE_MODE_STORAGE_KEY, nextMode);
  }

  return (
    <WorkspaceModeContext.Provider value={{ mode, setMode: handleModeChange }}>
      {children}
    </WorkspaceModeContext.Provider>
  );
}

export function useWorkspaceMode() {
  const context = useContext(WorkspaceModeContext);

  if (!context) {
    throw new Error("useWorkspaceMode must be used within WorkspaceModeProvider.");
  }

  return context;
}
