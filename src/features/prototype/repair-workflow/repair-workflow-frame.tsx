"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useRef, useState, useTransition, type ReactNode } from "react";
import { repairReviewHref, repairWorkflowLabels, repairWorkflowSteps, type RepairWorkflowStep } from "@/lib/repair-workflow-review";
import { repairBillingHref } from "@/lib/service-billing-workflow";
import { findReconRepairPath, reconRepairPathOptions, type ReconRepairPath } from "@/lib/recon-repair-paths";
import { VehicleWorkflowSwitch } from "./vehicle-workflow-switch";
import { customerInventoryLifecycleNotice, inventoryLifecycleHref, shopReconLifecycleHref } from "@/lib/vehicle-lifecycle-links";
import styles from "./repair-workflow.module.css";

const recordTools = [
  ["progress", "Progress / Updates"],
  ["subtasks", "Subtasks"],
  ["checklist", "Checklist"],
  ["comments", "Comments"],
  ["fullTools", "Full tools"],
  ["repairDetails", "RO statistics"],
] as const;

const queueHref = "/vehicles/repair-workbench?view=all";

type Props = {
  repairOrderId: string;
  vehicleId: string;
  number: string;
  vehicle: string;
  stock: string;
  location: string;
  owner: string;
  concern: string;
  inventoryRecon: boolean;
  current: RepairWorkflowStep;
  selected: RepairWorkflowStep;
  closed: boolean;
  returnTo?: string;
  returnLabel?: string;
  auxiliary?: boolean;
  activeTool?: string;
  canCompose?: boolean;
  inventoryStage?: string;
  customerOwned?: boolean;
  repairPath?: string;
  canChoosePath?: boolean;
  chosenPath?: ReconRepairPath;
  shopView?: boolean;
  advisorRepairTab?: boolean;
  stageOpen?: boolean;
  custody?: string;
  target?: string;
  vendorAmount?: string;
  nextAction?: { label: string; detail?: string; href?: string };
  inlineNextAction?: boolean;
  suppressFooterAction?: boolean;
  recordedWork?: ReactNode;
  stepStatus: Record<RepairWorkflowStep, string>;
  children: ReactNode;
};

export function RepairWorkflowFrame({
  repairOrderId, vehicleId, number, vehicle, stock, location, owner, concern, inventoryRecon,
  current, selected, closed, returnTo, returnLabel, auxiliary, activeTool, canCompose,
  inventoryStage, customerOwned, repairPath, canChoosePath, chosenPath, shopView, advisorRepairTab, stageOpen = true, custody, target, vendorAmount, nextAction, inlineNextAction, suppressFooterAction, recordedWork, stepStatus, children,
}: Props) {
  const router = useRouter();
  const dirty = useRef(false);
  const menu = useRef<HTMLDetailsElement>(null);
  const trigger = useRef<HTMLElement>(null);
  const [pathOpen, setPathOpen] = useState(false);
  const [pathPending, startPathTransition] = useTransition();
  const pathPanel = useRef<HTMLElement>(null);
  const pathToggle = useRef<HTMLButtonElement>(null);
  const mayLeave = () => !dirty.current || window.confirm("Leave this task without saving your entered changes?");
  const context = { returnTo, returnLabel, reconPath: chosenPath };
  const workbenchHref = repairReviewHref(repairOrderId, undefined, context);
  const shopHref = repairReviewHref(repairOrderId, undefined, { ...context, workflow: "shop" });
  const currentStageHref = repairReviewHref(repairOrderId, current, { ...context, workflow: "shop" });
  const currentHref = shopView ? shopHref : workbenchHref;
  const workOrderReturn = repairReviewHref(repairOrderId, stageOpen ? selected : undefined, {
    ...context, tool: activeTool, workflow: shopView ? "shop" : undefined
  }) + (advisorRepairTab ? "&tab=repair" : "");
  const inventoryHref = customerOwned ? undefined : inventoryLifecycleHref(vehicleId, repairOrderId, workbenchHref);
  const lifecycleHref = shopReconLifecycleHref(repairOrderId, workbenchHref);
  const toolHref = (tool: string) => repairReviewHref(repairOrderId, undefined, { ...context, tool });
  const actionHref = nextAction?.href ?? (auxiliary || selected !== current ? `${currentHref}#repair-workflow-action` : "#repair-workflow-action");
  const actionLabel = nextAction?.label ?? repairWorkflowLabels[current];
  const activeToolLabel = recordTools.find(([tool]) => tool === activeTool)?.[1];
  const pathLabel = findReconRepairPath(chosenPath)?.label ?? repairPath;
  const guidedDiagnosis = current === "diagnosis" && Boolean(chosenPath);
  const actionContext = guidedDiagnosis ? pathLabel : [repairWorkflowLabels[current], pathLabel].filter(Boolean).join(" · ");
  const taskLabel = guidedDiagnosis && selected === "diagnosis" ? pathLabel : repairWorkflowLabels[selected];

  function choosePath(path: ReconRepairPath) {
    if (chosenPath === path || !mayLeave()) return;
    dirty.current = false;
    const url = new URL(window.location.href);
    url.searchParams.set("reconPath", path);
    startPathTransition(() => router.replace(`${url.pathname}${url.search}`, { scroll: false }));
  }

  useEffect(() => {
    if (pathOpen) pathPanel.current?.focus();
  }, [pathOpen]);

  useEffect(() => {
    const saved = (event: Event) => {
      const detail = (event as CustomEvent<{ repairOrderId: string; step?: RepairWorkflowStep }>).detail;
      if (detail?.repairOrderId !== repairOrderId) return;
      dirty.current = false;
      if (detail.step !== selected) router.push(repairReviewHref(repairOrderId, detail.step, { returnTo, returnLabel, reconPath: chosenPath, workflow: shopView ? "shop" : undefined }));
      router.refresh();
    };
    const beforeUnload = (event: BeforeUnloadEvent) => {
      if (dirty.current) { event.preventDefault(); event.returnValue = ""; }
    };
    window.addEventListener("beforeunload", beforeUnload);
    window.addEventListener("repair-workflow-saved", saved);
    return () => {
      window.removeEventListener("beforeunload", beforeUnload);
      window.removeEventListener("repair-workflow-saved", saved);
    };
  }, [chosenPath, repairOrderId, returnLabel, returnTo, router, selected, shopView]);

  const photosHref = `/vehicles/360/${encodeURIComponent(vehicleId)}?${new URLSearchParams({ section: "photos", returnTo: currentHref })}`;
  const billingHref = `/vehicles/service-billing?${new URLSearchParams({ repairOrderId, returnTo: currentHref })}`;

  return <section className={styles.workspace} aria-label="Repair workbench" onChangeCapture={() => { dirty.current = true; }} onClickCapture={event => {
    const link = (event.target as HTMLElement).closest("a");
    if (link && !link.getAttribute("href")?.startsWith("#") && !mayLeave()) {
      event.preventDefault();
      event.stopPropagation();
    }
  }}>
    <header className={canChoosePath || pathLabel ? `${styles.header} ${styles.headerWithPath}` : styles.header}>
      <div>
        <Link href={shopView ? workbenchHref : returnTo ?? queueHref}>← {shopView ? "Return to Repair Workbench" : returnTo ? returnLabel ?? "Back to source" : "All Repair Orders"}</Link>
        <h1>{shopView ? "Repair stages" : "Repair Workbench"}</h1>
        <strong>{vehicle} · {number}</strong>
        <p>{inventoryRecon ? "Inventory recon" : "Customer repair"} · {stock}</p>
      </div>
      {canChoosePath ? <button aria-controls="recon-path-options" aria-expanded={pathOpen} className={styles.pathToggle}
        ref={pathToggle} type="button" onClick={() => setPathOpen(open => !open)}>
        <strong>{chosenPath ? "Change recon path" : "Choose recon path"}</strong>
        {chosenPath && <small>{pathLabel}</small>}
      </button> : pathLabel && <div className={styles.pathToggle}><strong>Recon path</strong><small>{pathLabel}</small></div>}
      <details className={styles.toolsMenu} ref={menu} onKeyDown={event => {
        if (event.key === "Escape" && menu.current?.open) {
          menu.current.open = false;
          trigger.current?.focus();
          event.stopPropagation();
        }
      }}>
        <summary ref={trigger}>Tools <span aria-hidden="true">⋮</span></summary>
        <nav aria-label="Repair order tools">
          <strong>Documents &amp; photos</strong>
          <Link href={`${toolHref("details")}#repair-order-document`}>View RO</Link>
          <a href={`/api/repair-orders/${encodeURIComponent(repairOrderId)}/print`} target="_blank" rel="noreferrer">Print RO</a>
          <Link href={`/vehicles/repair-workbench/technician-work-order?${new URLSearchParams({ repairOrderId, returnTo: workOrderReturn })}`}>Technician work order</Link>
          <Link href={photosHref}>360 Photos</Link>
          <strong>Parts &amp; costs</strong>
          <Link href={repairReviewHref(repairOrderId, "parts", { ...context, workflow: shopView ? "shop" : undefined })}>Parts readiness</Link>
          <Link href={billingHref}>Billing &amp; receipts</Link>
          {!inventoryRecon && <>
            <Link href={repairBillingHref(repairOrderId, { mode: "invoice", returnTo: currentHref })}>Convert estimate to invoice</Link>
            {!closed && <Link href={repairBillingHref(repairOrderId, { mode: "deposit", returnTo: currentHref })}>Record deposit</Link>}
          </>}
          {inventoryRecon && <>
            <Link href={`/money-resources?${new URLSearchParams({ vehicleId, repairOrderId, returnTo: currentHref })}`}>Record spending</Link>
            <Link href={toolHref("recon")}>Recon Report</Link>
          </>}
          <strong>Repair record</strong>
          <Link href={toolHref("history")}>History</Link>
          <Link href={toolHref("details")}>Full RO details</Link>
          {shopView && !closed && <Link href={`/vehicles/shop-recon/${encodeURIComponent(repairOrderId)}?${new URLSearchParams({ returnTo: currentHref })}`}>Detailed Shop &amp; Recon tools</Link>}
          {canCompose && <Link href={toolHref("advisor")}>Advisor tools</Link>}
          {!closed && <Link href={toolHref("close")}>Close without further work</Link>}
          <Link href={queueHref}>All Repair Orders</Link>
        </nav>
      </details>
    </header>

    {canChoosePath && <section className={styles.pathPanel} id="recon-path-options" aria-busy={pathPending}
      aria-labelledby="recon-path-title" hidden={!pathOpen} ref={pathPanel} tabIndex={-1}
      onKeyDown={event => {
        if (event.key !== "Escape") return;
        setPathOpen(false);
        pathToggle.current?.focus();
      }}>
      <h2 id="recon-path-title">Choose recon path</h2>
      <div className={styles.pathOptions}>
        {reconRepairPathOptions.map(option => <button key={option.value} type="button" disabled={pathPending}
          aria-pressed={chosenPath === option.value} onClick={() => choosePath(option.value)}>
          <strong>{option.label}</strong>
          <span>{option.detail}</span>
        </button>)}
      </div>
    </section>}

    {concern && <p className={styles.concern}><strong>Concern</strong> {concern}</p>}
    <div className={shopView ? styles.workflowBar : styles.overview}>
      <VehicleWorkflowSwitch inventoryHref={inventoryHref} shopHref={lifecycleHref}
        inventoryUnavailableReason={customerOwned ? customerInventoryLifecycleNotice : undefined}
        overviewStages={shopView ? undefined : { inventory: inventoryStage, shop: closed ? "Closed" : repairWorkflowLabels[current] }} />
      {shopView && (!stageOpen || selected !== current) && <Link href={currentStageHref}>Open current stage · {repairWorkflowLabels[current]}</Link>}
      {!shopView &&
      <section className={styles.nextAction} aria-label="Next action">
        <div aria-live="polite">
          <small>{closed ? "Repair order closed" : `Next action · ${actionContext}`}</small>
          <h2>{actionLabel}</h2>
          {nextAction?.detail && <p>{nextAction.detail}</p>}
        </div>
        {!inlineNextAction && <Link className={styles.primaryAction} href={actionHref}>{actionLabel}</Link>}
      </section>}
    </div>

    {shopView ? <nav className={styles.steps} aria-label="Repair workflow">
      {repairWorkflowSteps.map((step, index) => {
        const expanded = stageOpen && selected === step;
        const status = step === current && !closed ? "Current" : index > repairWorkflowSteps.indexOf(current) ? "Upcoming" : undefined;
        return <Link key={step} aria-current={(stageOpen ? selected : current) === step ? "step" : undefined}
          aria-expanded={expanded} aria-controls="shop-stage-panel"
          data-current={step === current && !closed ? "true" : undefined}
          href={expanded ? shopHref : repairReviewHref(repairOrderId, step, { ...context, workflow: "shop" })} scroll={false}>
          <span>{index + 1}. {repairWorkflowLabels[step]}</span>
          <small>{status ? `${status} · ` : ""}{stepStatus[step]}</small>
        </Link>;
      })}
    </nav> : <>
    <dl className={styles.facts}>
      <div><dt>Custody / location</dt><dd>{custody || location}</dd></div>
      <div><dt>Owner</dt><dd>{owner}</dd></div>
      <div><dt>Target</dt><dd>{target ?? "Not recorded"}</dd></div>
      {vendorAmount && <div><dt>Vendor amount</dt><dd>{vendorAmount}</dd></div>}
    </dl>
    <nav className={styles.recordTools} aria-label="Repair record tools">
      {recordTools.map(([tool, label]) => <Link key={tool} aria-current={activeTool === tool ? "page" : undefined} href={`${toolHref(tool)}#repair-workflow-action`}>{label}</Link>)}
    </nav>
    </>}

    <div id="shop-stage-panel" hidden={!stageOpen}>
    {stageOpen && <><header className={styles.task} id="repair-workflow-action" tabIndex={-1}>
      <h2>{auxiliary ? activeToolLabel ?? "Repair order tools" : closed ? "Closeout / handoff" : taskLabel}</h2>
    </header>
    <div className={styles.tool} data-repair-workflow-tool>{children}</div>
    {!auxiliary && <details className={styles.recordSummary}><summary>Saved repair record</summary>{recordedWork}</details>}
    </>}
    </div>
    <footer className={styles.footer} aria-label="Repair order actions">
      <Link href={billingHref}>Billing &amp; receipts</Link>
      {returnTo && <Link href={returnTo}>{returnLabel ?? "Source workspace"}</Link>}
      {canCompose && <Link href={toolHref("advisor")}>Advisor tools</Link>}
      <Link href={queueHref}>All Repair Orders</Link>
      {!shopView && !suppressFooterAction && <Link className={styles.primaryAction} href={actionHref}>{actionLabel}</Link>}
    </footer>
  </section>;
}
