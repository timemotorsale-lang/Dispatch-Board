"use client";

import { useEffect, useId, useRef, useState, type ReactNode } from "react";
import { ChevronDown, X } from "lucide-react";
import styles from "./deal-draft-workspace.module.css";

// Native popovers stay above the scrolling table and dismiss on Escape or an outside click.
export function DealRowPopover({ label, children, trigger, menu = false, width = 320, triggerClassName, status, finalized }: { label: string; children: ReactNode; trigger: ReactNode; menu?: boolean; width?: number; triggerClassName?: string; status?: string; finalized?: boolean }) {
  const id = useId(), button = useRef<HTMLButtonElement>(null), panel = useRef<HTMLDivElement>(null);
  const [open, setOpen] = useState(false), firstFocus = useRef<"first" | "last">("first");
  function position() {
    if (!button.current || !panel.current) return;
    const anchor = button.current.getBoundingClientRect(), popup = panel.current;
    const size = Math.min(width, window.innerWidth - 16);
    popup.style.width = `${size}px`;
    const above = Math.max(0, anchor.top - 14), below = Math.max(0, window.innerHeight - anchor.bottom - 14);
    const height = popup.scrollHeight || 280, flip = height > below && above > below;
    popup.style.maxHeight = `${flip ? above : below}px`;
    const actualHeight = Math.min(height, flip ? above : below);
    popup.style.left = `${Math.max(8, Math.min(menu ? anchor.right - size : anchor.left, window.innerWidth - size - 8))}px`;
    popup.style.top = `${Math.max(8, flip ? anchor.top - actualHeight - 6 : anchor.bottom + 6)}px`;
  }
  function close() { if (panel.current?.matches(":popover-open")) panel.current.hidePopover(); }
  useEffect(() => {
    if (!open) return;
    const dismiss = (event: Event) => { if (event.target instanceof Node && panel.current?.contains(event.target)) return; if (panel.current?.matches(":popover-open")) panel.current.hidePopover(); };
    window.addEventListener("scroll", dismiss, true); window.addEventListener("resize", dismiss);
    return () => { window.removeEventListener("scroll", dismiss, true); window.removeEventListener("resize", dismiss); };
  }, [open]);
  return <>
    <button ref={button} type="button" popoverTarget={id} popoverTargetAction="toggle" className={triggerClassName} aria-label={label} aria-haspopup={menu ? "menu" : "dialog"} aria-controls={id} aria-expanded={open} data-status={status} data-finalized={finalized} onClick={position} onKeyDown={event => { if (menu && ["ArrowDown", "ArrowUp"].includes(event.key)) { event.preventDefault(); firstFocus.current = event.key === "ArrowUp" ? "last" : "first"; if (panel.current?.matches(":popover-open")) { const items = panel.current.querySelectorAll<HTMLElement>('[role="menuitem"]:not(:disabled)'); (firstFocus.current === "last" ? items[items.length - 1] : items[0])?.focus(); } else button.current?.click(); } }}>{trigger}<ChevronDown size={13} aria-hidden="true" /></button>
    <div ref={panel} id={id} popover="auto" role={menu ? "menu" : "dialog"} aria-label={label} tabIndex={-1} className={`${styles.rowPopoverPanel} ${menu ? styles.rowActionMenu : styles.rowStatusPanel}`} onToggle={event => {
      const expanded = event.currentTarget.matches(":popover-open"); setOpen(expanded);
      if (expanded) { position(); if (menu) { const items = event.currentTarget.querySelectorAll<HTMLElement>('[role="menuitem"]:not(:disabled)'); (firstFocus.current === "last" ? items[items.length - 1] : items[0])?.focus(); firstFocus.current = "first"; } else event.currentTarget.focus(); }
    }} onClick={event => { if ((event.target as Element).closest(menu ? '[role="menuitem"]:not(:disabled)' : 'button:not(:disabled), a[href]')) close(); }} onKeyDown={event => {
      if (!menu) return;
      if (event.key === "Tab") { close(); return; }
      const items = Array.from(event.currentTarget.querySelectorAll<HTMLElement>('[role="menuitem"]:not(:disabled)'));
      const current = items.indexOf(document.activeElement as HTMLElement);
      let next = -1;
      if (event.key === "ArrowDown") next = (current + 1) % items.length;
      else if (event.key === "ArrowUp") next = (current - 1 + items.length) % items.length;
      else if (event.key === "Home") next = 0;
      else if (event.key === "End") next = items.length - 1;
      else if (event.key.length === 1 && /\S/.test(event.key)) next = items.findIndex((item, index) => index > current && item.textContent?.toLowerCase().startsWith(event.key.toLowerCase()));
      if (next >= 0) { event.preventDefault(); items[next]?.focus(); }
    }}>
      {!menu && <div className={styles.rowPanelHeading}><strong>Deal progress</strong><button type="button" aria-label="Close status details" onClick={close}><X size={15} aria-hidden="true" /></button></div>}
      {children}
    </div>
  </>;
}
