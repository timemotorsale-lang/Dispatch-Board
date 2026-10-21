"use client";

import styles from "./labor-guide-view-switch.module.css";

export type LaborGuideView = "legacy" | "new";
export function laborGuideHref(view: LaborGuideView, repairOrderId?: string, reviewWorkflow = false) {
  const path = view === "new" ? "/prototype/repair-explorer" : "/diagnostics/labor-guide";
  return repairOrderId ? `${path}?${new URLSearchParams({ repairOrderId, ...(reviewWorkflow ? { workflow: "review" } : {}) })}` : path;
}

export function LaborGuideViewSwitch({ view, disabled = false, repairOrderId, activeGuide = true, reviewWorkflow = false }: { view: LaborGuideView; disabled?: boolean; repairOrderId?: string; activeGuide?: boolean; reviewWorkflow?: boolean }) {
  return <section className={styles.switcher} aria-label="Labor guide review">
    <nav aria-label="Labor guide navigation">{([ ["legacy", "Legacy guide"], ["new", "New guide · Prototype"] ] as const).map(([target, label]) => <a key={target} href={laborGuideHref(target, repairOrderId, reviewWorkflow)} target="_blank" rel="noopener noreferrer" aria-current={(activeGuide && view === target) ? "page" : undefined} aria-disabled={disabled || undefined} onClick={event => { if (disabled || (activeGuide && view === target)) event.preventDefault(); }}>{label}</a>)}</nav>
    <p>{view === "new" ? "Simplified prototype — not adopted." : "Current Labor Guide."} The other guide opens in a new tab, keeping this draft open. The prototype uses a browser draft; generating official documents requires the separate guarded RO workflow.</p>
  </section>;
}
