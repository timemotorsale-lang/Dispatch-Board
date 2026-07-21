"use client";

import type { ReactNode } from "react";
import { useEffect, useRef } from "react";

export function InventorySavedViewsMenu({ children }: { children: ReactNode }) {
  const menuRef = useRef<HTMLDetailsElement>(null);

  useEffect(() => {
    function closeMenu({ restoreFocus = false } = {}) {
      const menu = menuRef.current;
      if (!menu?.open) return;
      menu.open = false;
      if (restoreFocus) menu.querySelector<HTMLElement>("summary")?.focus();
    }

    function handlePointerDown(event: PointerEvent) {
      const menu = menuRef.current;
      if (menu?.open && event.target instanceof Node && !menu.contains(event.target)) closeMenu();
    }

    function handleKeyDown(event: KeyboardEvent) {
      if (event.key !== "Escape" || !menuRef.current?.open) return;
      event.preventDefault();
      closeMenu({ restoreFocus: true });
    }

    document.addEventListener("pointerdown", handlePointerDown);
    document.addEventListener("keydown", handleKeyDown);
    return () => {
      document.removeEventListener("pointerdown", handlePointerDown);
      document.removeEventListener("keydown", handleKeyDown);
    };
  }, []);

  return <details className="ich-saved-view-menu" ref={menuRef}>
    <summary>Saved Views</summary>
    <div>{children}</div>
  </details>;
}
