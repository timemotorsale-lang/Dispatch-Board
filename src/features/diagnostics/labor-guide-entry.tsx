"use client";

import { useEffect, useState, type ComponentProps } from "react";
import Link from "next/link";
import { EnterpriseLaborGuideConsole } from "./enterprise-labor-guide-console";
import { assertExplorerDraftTarget, explorerEstimateIssues, prepareExplorerQuote } from "@/lib/explorer-estimate-handoff";
import { parsePreviewDraft } from "@/features/prototype/repair-explorer/estimate";
import styles from "@/features/inventory/estimate-workflow-next-step.module.css";
import { laborGuideHref } from "./labor-guide-view-switch";

type ConsoleProps = ComponentProps<typeof EnterpriseLaborGuideConsole>;
type Transfer = ReturnType<typeof prepareExplorerQuote>;

export function LaborGuideEntry({ explorerStorageKey, ...props }: ConsoleProps & { explorerStorageKey?: string }) {
  const [loaded, setLoaded] = useState<{ key: string; transfer?: Transfer; error?: string } | null>(null);
  const taxonomy = props.repairTaxonomy, systems = props.connectedSystemIds;
  useEffect(() => {
    if (!explorerStorageKey) return;
    let cancelled = false;
    void Promise.resolve().then(() => {
      try {
        const raw = window.sessionStorage.getItem(explorerStorageKey);
        if (!raw) throw new Error("No estimate was transferred. Open your saved work and try again.");
        const draft = parsePreviewDraft(raw);
        if (!draft) throw new Error("The saved estimate is invalid.");
        assertExplorerDraftTarget(draft, props.activeRepairOrder);
        const transfer = prepareExplorerQuote(raw, taxonomy.flatMap(system => system.groups.flatMap(group => group.operations)), systems ?? ["brakes", "steering"], () => crypto.randomUUID());
        if (!cancelled) setLoaded({ key: explorerStorageKey, transfer });
      } catch (failure) {
        if (!cancelled) setLoaded({ key: explorerStorageKey, error: failure instanceof Error ? failure.message : "Unable to open the estimate." });
      }
    });
    return () => { cancelled = true; };
  }, [explorerStorageKey, taxonomy, systems, props.activeRepairOrder]);
  if (!explorerStorageKey) return <EnterpriseLaborGuideConsole {...props} />;
  const result = loaded?.key === explorerStorageKey ? loaded : null;
  if (!result) return <p role="status">Opening estimate…</p>;
  if (!result.transfer) return <EstimateHandoffReview error={result.error ?? "Unable to open the estimate."} reviewWorkflow={props.reviewWorkflow} repairOrder={props.activeRepairOrder} />;
  return <EnterpriseLaborGuideConsole {...props} initialExplorerSeed={result.transfer.seed} />;
}

export function EstimateHandoffReview({ error, issues = [], repairOrder, reviewWorkflow = false }: { reviewWorkflow?: boolean; error: string; issues?: ReturnType<typeof explorerEstimateIssues>; repairOrder?: { id: string; repairOrderNumber: string } | null }) {
  return <section className={styles.review}><h1>Estimate</h1>{repairOrder && <p>{repairOrder.repairOrderNumber}</p>}<p role="alert">{error}</p>{issues.length > 0 && <ul>{issues.map(issue => <li key={issue.id}>{issue.label}: {issue.message}</li>)}</ul>}<Link href={laborGuideHref("new", repairOrder?.id, reviewWorkflow)}>Return to saved work</Link></section>;
}
