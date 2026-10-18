"use client";

import { useEffect, useState, type ComponentProps } from "react";
import { EnterpriseLaborGuideConsole } from "./enterprise-labor-guide-console";
import { explorerEstimateSeed } from "@/lib/explorer-estimate-handoff";

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
        if (!cancelled) setLoaded({ key: explorerStorageKey, transfer });
      } catch (failure) {
        if (!cancelled) setLoaded({ key: explorerStorageKey, error: failure instanceof Error ? failure.message : "Draft transfer failed. Your browser draft was kept." });
      }
    });
    return () => { cancelled = true; };
  }, [explorerStorageKey, taxonomy, systems]);
  if (!explorerStorageKey) return <EnterpriseLaborGuideConsole {...props} />;
  const result = loaded?.key === explorerStorageKey ? loaded : null;
  if (!result) return <p role="status">Opening your estimate worksheet…</p>;
  if (!result.transfer) return <section><h1>Estimate worksheet</h1><p role="alert">{result.error}</p><a href="/prototype/repair-explorer">Return to saved browser draft</a></section>;
  return <>
    <details style={{ margin: "12px 24px" }}><summary>Imported draft · {result.transfer.draft.lines.length} work item(s) · original saved</summary><p>Select the actual RO below. The sample vehicle and approvals were not transferred. Shop rate policy applies; Explorer planning rate was ${result.transfer.draft.rate.toFixed(2)} / hour. Parts allowances require itemization.</p><ul>{result.transfer.draft.lines.map(line => <li key={line.id}>{line.label} · {line.hours} planning hours · parts allowance {line.parts === null ? "not priced" : `$${line.parts.toFixed(2)}`}{line.laborConfiguration ? ` · unverified reported configuration: ${line.laborConfiguration} (${line.reportedJobCount} jobs)` : ""}</li>)}</ul><a href="/prototype/repair-explorer">Return to saved browser draft</a></details>
    <EnterpriseLaborGuideConsole {...props} initialExplorerSeed={result.transfer.seed} />
  </>;
}
