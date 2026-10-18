"use client";

import { useEffect, useState, type ComponentProps } from "react";
import { EnterpriseLaborGuideConsole } from "./enterprise-labor-guide-console";
import { assertExplorerDraftTarget, explorerEstimateSeed } from "@/lib/explorer-estimate-handoff";
import { laborGuideHref } from "./labor-guide-view-switch";

type ConsoleProps = ComponentProps<typeof EnterpriseLaborGuideConsole>;
type Transfer = ReturnType<typeof explorerEstimateSeed>;
export function LaborGuideEntry({ explorerStorageKey, ...props }: ConsoleProps & { explorerStorageKey?: string }) {
  const [loaded, setLoaded] = useState<{ key: string; transfer?: Transfer; error?: string } | null>(null);
  const taxonomy = props.repairTaxonomy, systems = props.connectedSystemIds;
  useEffect(() => {
    if (!explorerStorageKey) return;
    let cancelled = false;
    void Promise.resolve().then(() => {
      try {
        const raw = window.sessionStorage.getItem(explorerStorageKey);
        if (!raw) throw new Error("No draft was transferred in this tab. Return to Repair Explorer and choose Generate / Print Estimate.");
        const transfer = explorerEstimateSeed(raw, taxonomy.flatMap(system => system.groups.flatMap(group => group.operations)), systems ?? ["brakes", "steering"]);
        assertExplorerDraftTarget(transfer.draft, props.activeRepairOrder);
        if (!cancelled) setLoaded({ key: explorerStorageKey, transfer });
      } catch (failure) {
        if (!cancelled) setLoaded({ key: explorerStorageKey, error: failure instanceof Error ? failure.message : "Draft transfer failed. Your browser draft was kept." });
      }
    });
    return () => { cancelled = true; };
  }, [explorerStorageKey, taxonomy, systems, props.activeRepairOrder]);
  if (!explorerStorageKey) return <EnterpriseLaborGuideConsole {...props} />;
  const result = loaded?.key === explorerStorageKey ? loaded : null;
  if (!result) return <p role="status">Opening your estimate worksheet…</p>;
  if (!result.transfer) return <section><h1>Estimate worksheet</h1><p role="alert">{result.error}</p><a href={laborGuideHref("new", props.activeRepairOrder?.id)}>Return to saved browser draft</a></section>;
  return <>
    <details style={{ margin: "12px 24px" }}><summary>Imported draft · {result.transfer.draft.lines.length} work item(s) · original saved</summary><p>{props.activeRepairOrder ? `Proposed work for ${props.activeRepairOrder.repairOrderNumber}. Vehicle identity was verified from the repair order; approval is still separate.` : "Select the actual RO below. The sample vehicle and approvals were not transferred."} Shop rate policy applies; Explorer planning rate was ${result.transfer.draft.rate.toFixed(2)} / hour. Parts allowances require itemization.</p><ul>{result.transfer.draft.lines.map(line => <li key={line.id}>{line.label} · {line.hours} planning hours · parts allowance {line.parts === null ? "not priced" : `$${line.parts.toFixed(2)}`}{line.laborConfiguration ? ` · unverified reported configuration: ${line.laborConfiguration} (${line.reportedJobCount} jobs)` : ""}</li>)}</ul><a href={laborGuideHref("new", props.activeRepairOrder?.id)}>Return to saved browser draft</a></details>
    <EnterpriseLaborGuideConsole {...props} initialExplorerSeed={result.transfer.seed} />
  </>;
}
