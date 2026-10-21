"use client";
import { repairReviewHref } from "@/lib/repair-workflow-review";

import { useEffect, useState, type ComponentProps } from "react";
import { EnterpriseLaborGuideConsole } from "./enterprise-labor-guide-console";
import { assertExplorerDraftTarget, explorerEstimateIssues, explorerEstimateSeed } from "@/lib/explorer-estimate-handoff";
import { parsePreviewDraft } from "@/features/prototype/repair-explorer/estimate";
import Link from "next/link";
import styles from "@/features/inventory/estimate-workflow-next-step.module.css";
import { laborGuideHref } from "./labor-guide-view-switch";

type ConsoleProps = ComponentProps<typeof EnterpriseLaborGuideConsole>;
type Transfer = ReturnType<typeof explorerEstimateSeed>;
export function LaborGuideEntry({ explorerStorageKey, ...props }: ConsoleProps & { explorerStorageKey?: string }) {
  const [loaded, setLoaded] = useState<{ key: string; transfer?: Transfer; error?: string; issues?: ReturnType<typeof explorerEstimateIssues> } | null>(null);
  const taxonomy = props.repairTaxonomy, systems = props.connectedSystemIds;
  useEffect(() => {
    if (!explorerStorageKey) return;
    let cancelled = false;
    void Promise.resolve().then(() => {
      let raw: string | null = null;
      let verifiedTarget = false;
      try {
        raw = window.sessionStorage.getItem(explorerStorageKey);
        if (!raw) throw new Error("No draft was transferred in this tab. Return to Repair Explorer and choose Generate / Print Estimate.");
        const draft = parsePreviewDraft(raw);
        if (draft) { assertExplorerDraftTarget(draft, props.activeRepairOrder); verifiedTarget = true; }
        const transfer = explorerEstimateSeed(raw, taxonomy.flatMap(system => system.groups.flatMap(group => group.operations)), systems ?? ["brakes", "steering"]);
        assertExplorerDraftTarget(transfer.draft, props.activeRepairOrder);
        if (!cancelled) setLoaded({ key: explorerStorageKey, transfer });
      } catch (failure) {
        if (!cancelled) setLoaded({ key: explorerStorageKey, error: failure instanceof Error ? failure.message : "Draft transfer failed. Your browser draft was kept.", issues: verifiedTarget && raw ? explorerEstimateIssues(raw, taxonomy.flatMap(system => system.groups.flatMap(group => group.operations)), systems ?? ["brakes", "steering"]) : [] });
      }
    });
    return () => { cancelled = true; };
  }, [explorerStorageKey, taxonomy, systems, props.activeRepairOrder]);
  if (!explorerStorageKey) return <EnterpriseLaborGuideConsole {...props} />;
  const result = loaded?.key === explorerStorageKey ? loaded : null;
  if (!result) return <p role="status">Opening your estimate worksheet…</p>;
  if (!result.transfer) return <EstimateHandoffReview error={result.error ?? "Review the draft before continuing."} issues={result.issues} reviewWorkflow={props.reviewWorkflow} repairOrder={props.activeRepairOrder} />;
  return <>
    <details style={{ margin: "12px 24px" }}><summary>Imported draft · {result.transfer.draft.lines.length} work item(s) · original saved</summary><p>{props.activeRepairOrder ? `Proposed work for ${props.activeRepairOrder.repairOrderNumber}. Vehicle identity was verified from the repair order; approval is still separate.` : "Select the actual RO below. The sample vehicle and approvals were not transferred."} Shop rate policy applies; Explorer planning rate was ${result.transfer.draft.rate.toFixed(2)} / hour. Parts allowances require itemization.</p><ul>{result.transfer.draft.lines.map(line => <li key={line.id}>{line.label} · {line.hours} planning hours · parts allowance {line.parts === null ? "not priced" : `$${line.parts.toFixed(2)}`}{line.laborConfiguration ? ` · unverified reported configuration: ${line.laborConfiguration} (${line.reportedJobCount} jobs)` : ""}</li>)}</ul><a href={laborGuideHref("new", props.activeRepairOrder?.id, props.reviewWorkflow)}>Return to saved browser draft</a></details>
    <EnterpriseLaborGuideConsole {...props} initialExplorerSeed={result.transfer.seed} />
  </>;
}

export function EstimateHandoffReview({ error, issues = [], repairOrder, reviewWorkflow = false }: { reviewWorkflow?: boolean; error: string; issues?: ReturnType<typeof explorerEstimateIssues>; repairOrder?: { id: string; repairOrderNumber: string } | null }) {
  return <section className={styles.review}><h1>Review selected work</h1>{repairOrder && <p>{repairOrder.repairOrderNumber} · Estimate planning</p>}<p role="alert">{error}</p><ul>{issues.map(issue => <li key={issue.id}><strong>{issue.label}</strong>: {issue.message}</li>)}</ul><p>The browser draft is retained. This transfer has not saved an estimate or authorized repairs. Review the listed operations; catalog approval is not automatic.</p><nav aria-label="Continue estimate planning"><Link href={laborGuideHref("new", repairOrder?.id, reviewWorkflow)}>Edit selected work · saved browser draft</Link><Link href={laborGuideHref("legacy", repairOrder?.id, reviewWorkflow)}>Open existing guide for staff review</Link>{repairOrder && <Link href={reviewWorkflow ? repairReviewHref(repairOrder.id, "estimate") : `/vehicles/shop-planning?${new URLSearchParams({ repairOrderId: repairOrder.id })}`}>Return to this RO’s planning</Link>}</nav><p>Next: estimate review → authorization → parts and assignment → repair → QC → closeout / handoff. Opening planning does not advance these steps.</p></section>;
}
