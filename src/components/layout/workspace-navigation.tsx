"use client";

import { Menu, X } from "lucide-react";
import { useCallback, useEffect, useId, useRef, useState, useSyncExternalStore, type MouseEvent, type ReactNode } from "react";
import { readBrowserPreference, writeBrowserPreference } from "@/lib/browser-preferences";

const preferenceKey = "dispatch-board.sidebar";
const preferenceEvent = "sidebar-preference";
let sessionCollapsed: boolean | null = null;

function subscribePreference(listener: () => void) {
  window.addEventListener("storage", listener);
  window.addEventListener(preferenceEvent, listener);
  return () => {
    window.removeEventListener("storage", listener);
    window.removeEventListener(preferenceEvent, listener);
  };
}

function readCollapsed() {
  return sessionCollapsed ?? (readBrowserPreference(preferenceKey) === "collapsed");
}

export type WorkspaceSidebarControls = { id: string; desktopToggle: ReactNode };

export function useWorkspaceNavigation({ breakpoint = 980, routeKey = "" } = {}) {
  const id = useId();
  const opener = useRef<HTMLButtonElement | null>(null);
  const [openRoute, setOpenRoute] = useState<string | null>(null);
  const query = `(max-width: ${breakpoint}px)`;
  const subscribeViewport = useCallback((listener: () => void) => {
    const viewport = window.matchMedia(query);
    const onChange = () => { setOpenRoute(null); listener(); };
    viewport.addEventListener("change", onChange);
    return () => viewport.removeEventListener("change", onChange);
  }, [query]);
  const small = useSyncExternalStore(subscribeViewport, () => window.matchMedia(query).matches, () => false);
  const collapsed = useSyncExternalStore(subscribePreference, readCollapsed, () => false);
  const drawerOpen = small && openRoute === routeKey;

  function toggleDesktop() {
    const next = !collapsed;
    sessionCollapsed = writeBrowserPreference(preferenceKey, next ? "collapsed" : "expanded") ? null : next;
    window.dispatchEvent(new Event(preferenceEvent));
  }

  function openDrawer(event: MouseEvent<HTMLButtonElement>) {
    opener.current = event.currentTarget;
    setOpenRoute(routeKey);
  }

  const closeDrawer = useCallback(() => {
    setOpenRoute(null);
    requestAnimationFrame(() => opener.current?.focus());
  }, []);

  useEffect(() => {
    if (!drawerOpen) return;
    const drawer = document.getElementById(id);
    if (!drawer) return;
    drawer.querySelector<HTMLElement>("[data-navigation-close]")?.focus();
    function manageFocus(event: KeyboardEvent) {
      if (event.key === "Escape" && !event.defaultPrevented) {
        event.preventDefault();
        closeDrawer();
      }
      if (event.key !== "Tab" || !drawer) return;
      const items = Array.from(drawer.querySelectorAll<HTMLElement>("a[href], button:not([disabled]), summary, [tabindex='0']"))
        .filter(item => item.tabIndex >= 0 && item.getClientRects().length > 0);
      const first = items[0], last = items.at(-1);
      if (first && last && (!drawer.contains(document.activeElement) || document.activeElement === (event.shiftKey ? first : last))) {
        event.preventDefault();
        (event.shiftKey ? last : first).focus();
      }
    }
    document.addEventListener("keydown", manageFocus);
    return () => document.removeEventListener("keydown", manageFocus);
  }, [closeDrawer, drawerOpen, id]);

  return { id, collapsed, drawerOpen, toggleDesktop, openDrawer, closeDrawer };
}

export function WorkspaceNavigationToggle({ id, expanded, label, onClick, className }: {
  id?: string; expanded: boolean; label: string; onClick(event: MouseEvent<HTMLButtonElement>): void; className?: string;
}) {
  return <button type="button" className={`workspace-navigation-toggle ${className ?? ""}`} aria-controls={id}
    aria-expanded={expanded} aria-label={label} title={label} onClick={onClick}><Menu size={20} aria-hidden="true" /></button>;
}

export function WorkspaceNavigationClose({ onClick }: { onClick(): void }) {
  return <button type="button" className="workspace-navigation-toggle workspace-navigation-drawer-close"
    data-navigation-close aria-label="Close navigation" onClick={onClick}><X size={20} aria-hidden="true" /></button>;
}

export function WorkspaceNavigationScrim({ onClick }: { onClick(): void }) {
  return <button type="button" className="workspace-navigation-overlay" aria-label="Dismiss navigation" tabIndex={-1} onClick={onClick} />;
}
