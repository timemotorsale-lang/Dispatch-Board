"use client";

import { readBrowserPreference, writeBrowserPreference } from "@/lib/browser-preferences";
import { createContext, type ReactNode, useContext, useState, useSyncExternalStore } from "react";

import { APPEARANCE_STORAGE_KEY } from "./appearance-config";

export type AppAppearance = "light" | "dark";

type AppearanceContextValue = {
  appearance: AppAppearance;
  setAppearance(appearance: AppAppearance): void;
};

const AppearanceContext = createContext<AppearanceContextValue | null>(null);

function readStoredAppearance(): AppAppearance {
  return readBrowserPreference(APPEARANCE_STORAGE_KEY) === "dark" ? "dark" : "light";
}

function applyAppearance(appearance: AppAppearance) {
  document.documentElement.dataset.appTheme = appearance;
  document.documentElement.style.colorScheme = appearance;
}

function subscribeToAppearance(onStoreChange: () => void) {
  function handleStorage(event: StorageEvent) {
    if (event.key === APPEARANCE_STORAGE_KEY) onStoreChange();
  }
  window.addEventListener("storage", handleStorage);
  window.addEventListener("tms-appearance-change", onStoreChange);
  return () => {
    window.removeEventListener("storage", handleStorage);
    window.removeEventListener("tms-appearance-change", onStoreChange);
  };
}

export function AppearanceProvider({ children }: { children: ReactNode }) {
  const [sessionAppearance, setSessionAppearance] = useState<AppAppearance | null>(null);
  const storedAppearance = useSyncExternalStore(subscribeToAppearance, readStoredAppearance, (): AppAppearance => "light");

  const appearance = sessionAppearance ?? storedAppearance;

  function setAppearance(nextAppearance: AppAppearance) {
    applyAppearance(nextAppearance);
    const saved = writeBrowserPreference(APPEARANCE_STORAGE_KEY, nextAppearance);
    setSessionAppearance(saved ? null : nextAppearance);
    window.dispatchEvent(new Event("tms-appearance-change"));
  }

  return <AppearanceContext.Provider value={{ appearance, setAppearance }}>{children}</AppearanceContext.Provider>;
}

export function useAppearance() {
  const context = useContext(AppearanceContext);
  if (!context) throw new Error("useAppearance must be used within AppearanceProvider.");
  return context;
}
