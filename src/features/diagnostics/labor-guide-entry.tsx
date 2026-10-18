"use client";

import { useState, type ComponentProps } from "react";
import { EnterpriseLaborGuideConsole } from "./enterprise-labor-guide-console";
import { explorerEstimateSeed } from "@/lib/explorer-estimate-handoff";

type ConsoleProps = ComponentProps<typeof EnterpriseLaborGuideConsole>;
export function LaborGuideEntry({ explorerStorageKey, ...props }: ConsoleProps & { explorerStorageKey?: string }) {
  const [transfer, setTransfer] = useState<ReturnType<typeof explorerEstimateSeed> | null>(null);
  const [confirmed, setConfirmed] = useState(false);
  const [error, setError] = useState("");
  if (!explorerStorageKey) return <EnterpriseLaborGuideConsole {...props} />;
  function load() {
    try {
      const raw = window.sessionStorage.getItem(explorerStorageKey!);
      if (!raw) throw new Error("No estimate was transferred in this tab. Return to Repair Explorer and choose Generate / Print Estimate.");
      const catalog = props.repairTaxonomy.flatMap(system => system.groups.flatMap(group => group.operations));
      setTransfer(explorerEstimateSeed(raw, catalog, props.connectedSystemIds ?? ["brakes", "steering"]));
      setError("");
    } catch (failure) { setError(failure instanceof Error ? failure.message : "Browser storage is unavailable. Your original draft was kept."); }
  }
  return <>
    <section aria-label="Repair Explorer estimate transfer" style={{ margin: 24, padding: 24, border: "1px solid #bdc9e0", borderRadius: 12 }}>
      <h1>Generate / Print Estimate</h1>
      <p>Select the actual customer, vehicle and repair order below. The Explorer reference vehicle is not transferred. Nothing is issued or authorized until you complete the existing estimate review.</p>
      {!transfer && <button onClick={load} type="button">Review transferred draft</button>}
      {error && <p role="alert">{error}</p>}
      {transfer && <><p>Explorer planning rate: ${transfer.draft.rate.toFixed(2)} / hour. The editor uses the current shop policy rate; any override needs its existing review and permission.</p><ul>{transfer.draft.lines.map(line => <li key={line.id}>{line.label} — {line.hours} planning hours · parts allowance {line.parts === null ? "not priced" : `$${line.parts.toFixed(2)}`}{line.laborConfiguration ? ` · reported configuration: ${line.laborConfiguration} (${line.reportedJobCount} jobs; not verified for this vehicle)` : ""}</li>)}</ul><p>Parts allowances are not billable parts. Replace each unitemized allowance with actual item descriptions, part numbers, prices and fitment review, or explicitly remove it. Labor source, overlap, vehicle procedures and taxes must be reviewed again. Your original browser draft is preserved.</p>{!confirmed && <button onClick={() => setConfirmed(true)} type="button">Continue to customer / vehicle and estimate review</button>}</>}
      <p><a href="/prototype/repair-explorer">Return to Repair Explorer — load saved draft</a></p>
    </section>
    {confirmed && transfer && <EnterpriseLaborGuideConsole {...props} initialExplorerSeed={transfer.seed} />}
  </>;
}
