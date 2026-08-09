"use client";

import {
  AlertTriangle,
  Boxes,
  CalendarClock,
  CheckCircle2,
  ChevronDown,
  ClipboardCheck,
  ExternalLink,
  Factory,
  FileText,
  KeyRound,
  MessageSquareText,
  PackageCheck,
  ShoppingCart,
  ShieldCheck,
  UserRound,
  Wrench,
} from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";

import { AdvisorResponsePanel } from "@/features/advisor/advisor-response-panel";
import { BackToServiceAdvisorWorkspace } from "@/features/advisor/advisor-return-link";
import { OutsideRepairWorkPanel } from "@/features/advisor/outside-repair-work-panel";
import type { getShopPlanningDetail } from "@/server/shop-planning/service";

type Order = Awaited<ReturnType<typeof getShopPlanningDetail>>;
type WorkspaceTab = "COMMUNICATIONS" | "ESTIMATE" | "OVERVIEW" | "QUALITY" | "REPAIR" | "TIMELINE";
type CommunicationAudience = "CUSTOMER" | "MANAGEMENT" | "TEAM" | "VENDOR";
type AdvisorUpdate = Order["advisorUpdates"][number];

function format(value: string) {
  return value.replaceAll("_", " ").toLocaleLowerCase().replace(/^./, (letter) => letter.toUpperCase());
}

function date(value: string | Date | null | undefined) {
  return value ? new Date(value).toLocaleString([], { month: "short", day: "numeric", hour: "numeric", minute: "2-digit" }) : "Not recorded";
}

function vehicleLabel(order: Order) {
  return [order.vehicle.year, order.vehicle.make, order.vehicle.model].filter(Boolean).join(" ") || order.vehicle.vehicleNumber;
}

function codes(value: unknown) {
  return Array.isArray(value) ? value.filter((item): item is string => typeof item === "string") : [];
}

function evidenceCount(value: unknown) {
  if (Array.isArray(value)) return value.length;
  if (value && typeof value === "object") return Object.keys(value).length;
  return value ? 1 : 0;
}

function communicationAudience(update: AdvisorUpdate): CommunicationAudience {
  const exceptionCodes = codes(update.exceptionCodes);
  if (exceptionCodes.includes("VENDOR_COORDINATION")) return "VENDOR";
  if (exceptionCodes.includes("MANAGER_REVIEW")) return "MANAGEMENT";
  if (update.contactDirection === "INTERNAL" || update.contactChannel === "INTERNAL" || exceptionCodes.some((code) => ["TECHNICIAN_CLARIFICATION", "WAITING_PARTS"].includes(code))) return "TEAM";
  return "CUSTOMER";
}

function customerSafeUpdate(order: Order) {
  const diagnosis = order.diagnosisVersions[0] ?? null;
  const estimate = order.estimateVersions[0] ?? null;
  const waitingParts = order.partDemands.some((part) => part.quantityReserved < part.quantityRequired);
  const inventoryRecon = order.origin === "INVENTORY_RECON" || Boolean(order.inventoryUnit);
  if (waitingParts) return "We are waiting on parts readiness before the repair can move forward. The current promise should be reviewed before committing a completion time.";
  if (!diagnosis) return "The vehicle is in intake/diagnosis. The technician still needs to confirm findings before we present a repair recommendation.";
  if (!estimate) return `Diagnosis information is available. The next step is preparing or reviewing the estimate before ${inventoryRecon ? "internal recon approval" : "customer authorization"}.`;
  return `The estimate is ${format(estimate.status)}. Review ${inventoryRecon ? "internal approval" : "customer authorization"} status before representing the work as approved.`;
}

function advisorActionPlan(order: Order) {
  const diagnosis = order.diagnosisVersions[0] ?? null;
  const estimate = order.estimateVersions[0] ?? null;
  const authorization = estimate?.authorizations.find((item) => ["ACCEPTED", "PARTIAL"].includes(item.disposition)) ?? null;
  const waitingParts = order.partDemands.some((part) => part.quantityReserved < part.quantityRequired);
  const inventoryRecon = order.origin === "INVENTORY_RECON" || Boolean(order.inventoryUnit);
  if (order.inventoryUnit && ["BLOCKED", "WAITING"].includes(order.inventoryUnit.operatingState)) return { defaultContactOutcome: "Inventory lifecycle decision requested", defaultExceptionCodes: order.inventoryUnit.operatingState === "BLOCKED" ? ["MANAGER_REVIEW"] : [], defaultStatusCode: "IN_PROGRESS", href: "#advisor-response", label: "Coordinate inventory dependency", text: order.inventoryUnit.nextAction };
  if (order.shopReconLifecycle && ["BLOCKED", "WAITING"].includes(order.shopReconLifecycle.operatingState)) return { defaultContactOutcome: "Shop & Recon response requested", defaultExceptionCodes: ["TECHNICIAN_CLARIFICATION"], defaultStatusCode: "WAITING_TECHNICIAN_CLARIFICATION", href: "#advisor-response", label: "Coordinate shop dependency", text: order.shopReconLifecycle.nextAction };
  if (waitingParts) return { defaultContactOutcome: "Parts ETA or promise update needed", defaultExceptionCodes: ["WAITING_PARTS", "PROMISE_RISK"], defaultStatusCode: "WAITING_PARTS", href: "#advisor-response", label: "Record ETA / promise update", text: "Confirm parts ETA, then record the customer-safe promise update here." };
  if (!diagnosis) return { defaultContactOutcome: "Technician clarification requested before customer update", defaultExceptionCodes: ["TECHNICIAN_CLARIFICATION"], defaultStatusCode: "WAITING_TECHNICIAN_CLARIFICATION", href: "#advisor-response", label: "Request technician clarification", text: "Use Communications to document what clarification is needed before calling the customer." };
  if (!estimate) return { defaultContactOutcome: "Estimate preparation or advisor review needed", defaultExceptionCodes: [], defaultStatusCode: "IN_PROGRESS", href: `/diagnostics/advisor-review?repairOrderId=${encodeURIComponent(order.id)}`, label: "Prepare advisor estimate review", text: "Diagnosis is available. Prepare customer-safe estimate language or route the estimate for advisor review." };
  if (!authorization) return inventoryRecon
    ? { defaultContactOutcome: "Internal recon approval requested", defaultExceptionCodes: ["MANAGER_REVIEW"], defaultStatusCode: "WAITING_APPROVAL", href: `/diagnostics/advisor-review?repairOrderId=${encodeURIComponent(order.id)}`, label: "Record internal approval", text: "Route the exact estimate version to the authorized inventory approver and record the attributable decision." }
    : { defaultContactOutcome: "Customer authorization requested", defaultExceptionCodes: ["CUSTOMER_ACTION"], defaultStatusCode: "WAITING_APPROVAL", href: `/diagnostics/advisor-review?repairOrderId=${encodeURIComponent(order.id)}`, label: "Record customer decision", text: "Contact the customer and record the authorization outcome against the presented estimate." };
  return { defaultContactOutcome: "Customer updated on repair progress", defaultExceptionCodes: [], defaultStatusCode: "CUSTOMER_UPDATED", href: "#advisor-response", label: "Record customer update", text: "Monitor repair/QC status and record the next customer-safe update or handoff note." };
}

function lifecycleDependency(order: Order, waitingParts: boolean) {
  const candidates: Array<{ detail: string; href: string; label: string; severity: number; source: "inventory" | "shop" }> = [];
  if (order.inventoryUnit && ["BLOCKED", "WAITING"].includes(order.inventoryUnit.operatingState)) {
    candidates.push({ detail: order.inventoryUnit.stateReason ?? order.inventoryUnit.nextAction, href: `/vehicles/inventory?inventoryUnitId=${encodeURIComponent(order.inventoryUnit.id)}`, label: `Inventory is ${format(order.inventoryUnit.operatingState)}`, severity: order.inventoryUnit.operatingState === "BLOCKED" ? 2 : 1, source: "inventory" });
  }
  if (order.shopReconLifecycle && ["BLOCKED", "WAITING"].includes(order.shopReconLifecycle.operatingState)) {
    candidates.push({ detail: order.shopReconLifecycle.nextAction, href: `/vehicles/shop-recon/${encodeURIComponent(order.id)}?returnTo=${encodeURIComponent(`/vehicles/repair-workbench?repairOrderId=${order.id}`)}`, label: `Shop & Recon is ${format(order.shopReconLifecycle.operatingState)}`, severity: order.shopReconLifecycle.operatingState === "BLOCKED" ? 2 : 1, source: "shop" });
  }
  if (waitingParts) candidates.push({ detail: "Parts are not fully reserved. Confirm ETA before changing the customer or inventory completion target.", href: `/vehicles/parts-operations?repairOrderId=${encodeURIComponent(order.id)}`, label: "Parts readiness is blocking progress", severity: 1, source: "shop" });
  return candidates.sort((left, right) => right.severity - left.severity)[0] ?? null;
}

const workspaceTabs: Array<{ id: WorkspaceTab; label: string }> = [
  { id: "OVERVIEW", label: "Overview" },
  { id: "COMMUNICATIONS", label: "Communications" },
  { id: "ESTIMATE", label: "Estimate & Approval" },
  { id: "REPAIR", label: "Repair" },
  { id: "QUALITY", label: "Quality" },
  { id: "TIMELINE", label: "Timeline" },
];

export function getRepairPrimaryAction(order: Order) {
  const diagnosis = order.diagnosisVersions[0] ?? null;
  const estimate = order.estimateVersions[0] ?? null;
  const latestDecision = estimate?.authorizations[0] ?? null;
  const approvedAuthorization = latestDecision && ["ACCEPTED", "PARTIAL"].includes(latestDecision.disposition) ? latestDecision : null;
  const isInventoryRecon = order.origin === "INVENTORY_RECON" || Boolean(order.inventoryUnit);
  const advisorReturnPath = `/vehicles/repair-workbench?repairOrderId=${encodeURIComponent(order.id)}`;
  const planningHref = `/vehicles/shop-planning?repairOrderId=${encodeURIComponent(order.id)}&returnTo=${encodeURIComponent(advisorReturnPath)}`;
  if (order.repairJobs.length) return { href: `/vehicles/shop-dispatch?repairOrderId=${encodeURIComponent(order.id)}&returnTo=${encodeURIComponent(advisorReturnPath)}`, label: "Open repair jobs", mode: "link" as const };
  if (!order.inspectionVersions.length) return { href: planningHref, label: isInventoryRecon ? "Start recon inspection" : "Start vehicle inspection", mode: "link" as const };
  if (!diagnosis) return { href: planningHref, label: "Record diagnosis", mode: "link" as const };
  if (!estimate) return { href: planningHref, label: "Build repair plan", mode: "link" as const };
  if (!approvedAuthorization) return { href: planningHref, label: isInventoryRecon ? "Review internal approval" : "Review customer authorization", mode: "link" as const };
  return { href: "", label: "Create approved repair job", mode: "create" as const };
}

export function AdvisorRepairOrderStatusView({ compose, initialTab, order, returnTo }: { compose?: "customer" | "management" | "team"; initialTab?: WorkspaceTab; order: Order; returnTo?: string }) {
  const router = useRouter();
  const [activeTab, setActiveTab] = useState<WorkspaceTab>(initialTab ?? (compose ? "COMMUNICATIONS" : "OVERVIEW"));
  const [audience, setAudience] = useState<CommunicationAudience>(compose === "management" ? "MANAGEMENT" : compose === "team" || (!compose && order.origin === "INVENTORY_RECON") ? "TEAM" : "CUSTOMER");
  const [creatingJobs, setCreatingJobs] = useState(false);
  const [repairActionMessage, setRepairActionMessage] = useState<{ kind: "error" | "success"; text: string } | null>(null);
  const diagnosis = order.diagnosisVersions[0] ?? null;
  const estimate = order.estimateVersions[0] ?? null;
  const authorization = estimate?.authorizations.find((item) => ["ACCEPTED", "PARTIAL"].includes(item.disposition)) ?? null;
  const waitingParts = order.partDemands.some((part) => part.quantityReserved < part.quantityRequired);
  const isInventoryRecon = order.origin === "INVENTORY_RECON" || Boolean(order.inventoryUnit);
  const vendorWorks = order.vendorWorks ?? [];
  const activeVendorWork = vendorWorks.find((work) => !["COMPLETED", "CANCELLED"].includes(work.status)) ?? vendorWorks[0] ?? null;
  const dependency = lifecycleDependency(order, waitingParts);
  const nextAdvisorAction = advisorActionPlan(order);
  const vehicle = vehicleLabel(order);
  const advisorReturnPath = `/vehicles/repair-workbench?repairOrderId=${encodeURIComponent(order.id)}`;
  const partsOperationsHref = `/vehicles/service-close-parts?repairOrderId=${encodeURIComponent(order.id)}&returnTo=${encodeURIComponent(`${advisorReturnPath}&tab=repair&workspace=advisor`)}&returnLabel=${encodeURIComponent(`Return to ${order.repairOrderNumber}`)}`;
  const repairPrimaryAction = getRepairPrimaryAction(order);
  const communicationUpdates = order.advisorUpdates.filter((update) => communicationAudience(update) === audience);
  const composeDefaults = audience === "CUSTOMER"
    ? { channel: "SMS", direction: "OUTBOUND", exceptionCodes: [] as string[], outcome: "Customer communication follow-up", statusCode: "CUSTOMER_UPDATED" }
    : audience === "MANAGEMENT"
      ? { channel: "INTERNAL", direction: "INTERNAL", exceptionCodes: ["MANAGER_REVIEW"], outcome: "Management review requested", statusCode: "IN_PROGRESS" }
      : audience === "VENDOR"
        ? { channel: "INTERNAL", direction: "INTERNAL", exceptionCodes: ["VENDOR_COORDINATION"], outcome: activeVendorWork ? `${activeVendorWork.vendorName} progress follow-up` : "Outside vendor follow-up", statusCode: "VENDOR_WORK" }
        : { channel: "INTERNAL", direction: "INTERNAL", exceptionCodes: ["TECHNICIAN_CLARIFICATION"], outcome: "Internal team response requested", statusCode: "WAITING_TECHNICIAN_CLARIFICATION" };
  const currentTimelineIndex = ({
    INTAKE: 0,
    DIAGNOSIS: 1,
    ESTIMATE: 2,
    AUTHORIZATION: 3,
    READY_FOR_REPAIR: 4,
    REPAIR: 4,
    QUALITY_CONTROL: 5,
    ADVISOR_REVIEW: 5,
    HANDOFF: 6,
  } as Record<string, number>)[order.stage] ?? 0;
  const timeline = ["Intake", "Diagnosis", "Estimate", "Authorization", "Repair", "Quality", "Handoff"].map((label, index) => ({
    current: index === currentTimelineIndex,
    done: index < currentTimelineIndex,
    label,
  }));

  return <section className="advisor-ro-status">
    <header className="advisor-ro-hero">
      <div><BackToServiceAdvisorWorkspace href={returnTo} label={returnTo ? "Back to My Workday" : undefined} /><div className="advisor-ro-eyebrow"><p>Advisor Repair Order Status</p><b className={isInventoryRecon ? "inventory" : "customer"}>{isInventoryRecon ? "Inventory recon" : "Customer service"}</b>{activeVendorWork ? <b className="vendor">Offsite · {activeVendorWork.vendorName}</b> : null}</div><h1>{order.repairOrderNumber}</h1><span>{order.customer?.displayName ?? order.inventoryUnit?.inventoryNumber ?? "Internal vehicle"} · {vehicle}</span></div>
      <aside><strong>{format(order.stage)}</strong><span>{activeVendorWork ? `Offsite · ${format(activeVendorWork.status)}` : format(order.operatingState)}</span><small>{activeVendorWork ? `Expected return: ${date(activeVendorWork.expectedReturnAt)}` : `Promise: ${date(order.serviceVisit.promisedAt ?? order.targetAt)}`}</small></aside>
    </header>

    <section className="advisor-ro-timeline" aria-label="Repair order status timeline">{timeline.map((step) => <span aria-current={step.current ? "step" : undefined} className={[step.done ? "done" : "", step.current ? "current" : ""].filter(Boolean).join(" ")} key={step.label}><i>{step.done ? <CheckCircle2 /> : null}</i>{step.label}</span>)}</section>

    <nav className="advisor-ro-workspace-tabs" aria-label="Repair order workspace sections">
      {workspaceTabs.map((tab) => <button aria-selected={activeTab === tab.id} key={tab.id} onClick={() => setActiveTab(tab.id)} role="tab" type="button">{tab.label}{tab.id === "COMMUNICATIONS" && order.advisorUpdates.length ? <b>{order.advisorUpdates.length}</b> : null}</button>)}
    </nav>

    {activeTab === "OVERVIEW" ? <>
      <section className="advisor-ro-summary">
        <article><UserRound /><span>{isInventoryRecon ? "Work unit" : "Customer"}</span><strong>{order.customer?.displayName ?? order.inventoryUnit?.inventoryNumber ?? "No customer linked"}</strong><small>{isInventoryRecon ? "Internal inventory repair" : order.serviceVisit.appointmentId ? "Appointment matched" : "Walk-in / no appointment match"}</small></article>
        <article><CalendarClock /><span>Promise / target</span><strong>{date(order.serviceVisit.promisedAt ?? order.targetAt)}</strong><small>{order.nextAction}</small></article>
        <article className={waitingParts ? "attention" : ""}><PackageCheck /><span>Parts readiness</span><strong>{waitingParts ? "Waiting on parts" : "No blocking demand"}</strong><small>{order.partDemands.length} demand item(s)</small></article>
        <article><ShieldCheck /><span>{isInventoryRecon ? "Internal approval" : "Authorization"}</span><strong>{authorization?.disposition ?? (isInventoryRecon ? "Not approved" : "Not authorized")}</strong><small>{estimate ? `Estimate ${format(estimate.status)}` : "Estimate not prepared"}</small></article>
      </section>
      {dependency ? <section className={`advisor-cross-lifecycle-dependency ${dependency.source}`}><AlertTriangle /><div><small>Cross-workspace dependency</small><strong>{dependency.label}</strong><span>{dependency.detail}</span></div><Link href={dependency.href}>Review source <ExternalLink /></Link></section> : null}
      {order.inventoryUnit || order.shopReconLifecycle ? <details className="advisor-related-lifecycles">
        <summary><span><strong>Related lifecycle</strong><small>Read-only context from the owning workspaces</small></span><b>{order.inventoryUnit ? `Inventory: ${format(order.inventoryUnit.lifecycleStage)}` : "No inventory unit"}{order.shopReconLifecycle ? ` · Shop: ${format(order.shopReconLifecycle.stage)}` : ""}</b><ChevronDown /></summary>
        <div className="advisor-related-lifecycle-grid">
          {order.inventoryUnit ? <article><header><Boxes /><span><small>Inventory-owned</small><strong>{order.inventoryUnit.inventoryNumber}</strong></span><i className={order.inventoryUnit.operatingState.toLocaleLowerCase()}>{format(order.inventoryUnit.operatingState)}</i></header><dl><div><dt>Lifecycle</dt><dd>{format(order.inventoryUnit.lifecycleStage)}</dd></div><div><dt>Owner</dt><dd>{order.inventoryUnit.ownerUser.name}</dd></div><div><dt>Target</dt><dd>{date(order.inventoryUnit.targetAt)}</dd></div><div><dt>Next action</dt><dd>{order.inventoryUnit.nextAction}</dd></div></dl><Link href={`/vehicles/inventory?inventoryUnitId=${encodeURIComponent(order.inventoryUnit.id)}`}>View in Inventory <ExternalLink /></Link></article> : null}
          {order.shopReconLifecycle ? <article><header><Factory /><span><small>Shop & Recon-owned</small><strong>{format(order.shopReconLifecycle.stage)}</strong></span><i className={order.shopReconLifecycle.operatingState.toLocaleLowerCase()}>{format(order.shopReconLifecycle.operatingState)}</i></header><dl><div><dt>Zone</dt><dd>{order.shopReconLifecycle.zoneCode}</dd></div><div><dt>Target</dt><dd>{date(order.shopReconLifecycle.targetAt)}</dd></div><div><dt>Next action</dt><dd>{order.shopReconLifecycle.nextAction}</dd></div><div><dt>Blockers</dt><dd>{codes(order.shopReconLifecycle.blockerCodes).map(format).join(", ") || "None recorded"}</dd></div></dl><Link href={`/vehicles/shop-recon/${encodeURIComponent(order.id)}?returnTo=${encodeURIComponent(advisorReturnPath)}`}>Open Shop & Recon <ExternalLink /></Link></article> : null}
        </div>
        <footer><ShieldCheck /><span><strong>Ownership protection</strong> These statuses come from their source workspaces. The advisor can review them here, but inventory disposition, shop execution, and customer authorization remain separately governed.</span></footer>
      </details> : null}
      <div className="advisor-ro-layout"><main>
        <section className="advisor-ro-card concern"><header><MessageSquareText /><div><strong>Customer concern</strong><span>Preserved from intake</span></div></header><p>{order.serviceVisit.concernSummary}</p></section>
        <section className="advisor-ro-card"><header><FileText /><div><strong>{isInventoryRecon ? "Stakeholder-safe update" : "Customer-safe update"}</strong><span>{isInventoryRecon ? "Use this when updating Inventory without changing its source record." : "Use this as the starting language before contacting the customer."}</span></div></header><p>{customerSafeUpdate(order)}</p></section>
      </main><aside>
        <section className="advisor-ro-card next"><header><Wrench /><div><strong>Next advisor action</strong><span>What the advisor should do next</span></div></header><strong>{nextAdvisorAction.text}</strong>{nextAdvisorAction.href.startsWith("#") ? <button onClick={() => { setAudience(nextAdvisorAction.defaultExceptionCodes.includes("MANAGER_REVIEW") ? "MANAGEMENT" : nextAdvisorAction.defaultExceptionCodes.includes("TECHNICIAN_CLARIFICATION") || isInventoryRecon ? "TEAM" : "CUSTOMER"); setActiveTab("COMMUNICATIONS"); }} type="button">{nextAdvisorAction.label}</button> : <Link href={nextAdvisorAction.href}>{nextAdvisorAction.label}</Link>}</section>
        <section className="advisor-ro-card"><header><KeyRound /><div><strong>Custody and intake</strong><span>Useful before customer update</span></div></header><dl><div><dt>Keys</dt><dd>{order.serviceVisit.keysReceivedCount} · {order.serviceVisit.keyTag ?? "No tag"}</dd></div><div><dt>Transport</dt><dd>{format(order.serviceVisit.transportMode)}</dd></div><div><dt>Arrived</dt><dd>{date(order.serviceVisit.arrivedAt)}</dd></div><div><dt>Owner</dt><dd>{order.ownerUser.name}</dd></div></dl></section>
      </aside></div>
    </> : null}

    {activeTab === "COMMUNICATIONS" ? <section className="advisor-ro-communications">
      <header><div><MessageSquareText /><span><strong>Repair-order communications</strong><small>Customer contact, private team collaboration, and management escalation remain separated by audience.</small></span></div><b>{order.advisorUpdates.length} recorded update(s)</b></header>
      <nav aria-label="Communication audience">{(["CUSTOMER", "TEAM", "MANAGEMENT", ...(vendorWorks.length ? ["VENDOR" as const] : [])] as const).map((item) => <button aria-selected={audience === item} key={item} onClick={() => setAudience(item)} role="tab" type="button">{item === "CUSTOMER" ? "Customer" : item === "TEAM" ? "Internal Team" : item === "MANAGEMENT" ? "Management" : "Vendor"}<span>{order.advisorUpdates.filter((update) => communicationAudience(update) === item).length}</span></button>)}</nav>
      <section className={`advisor-communication-boundary ${audience.toLocaleLowerCase()}`}>
        <strong>{audience === "CUSTOMER" ? `Customer conversation · ${order.customer?.displayName ?? "No customer linked"}` : audience === "TEAM" ? "Private shop collaboration" : audience === "MANAGEMENT" ? "Structured management escalation" : `Vendor coordination · ${activeVendorWork?.vendorName ?? "Outside vendor"}`}</strong>
        <span>{audience === "CUSTOMER" ? [order.customer?.phoneNumber, order.customer?.email].filter(Boolean).join(" · ") || "No customer phone or email is recorded." : audience === "TEAM" ? `Internal notes are never included in customer-facing updates.${isInventoryRecon ? " Inventory and Shop & Recon collaborators remain responsible for their source records." : ""}` : audience === "MANAGEMENT" ? `Document the requested decision, ${isInventoryRecon ? "inventory target" : "customer impact"}, urgency, and response deadline.` : "Vendor estimates, progress, supplements, pickup, and return notes stay private from customer communications."}</span>
        {audience === "CUSTOMER" ? <em>External SMS/email delivery is not connected. Contact activity is recorded, not transmitted.</em> : null}
      </section>
      <AdvisorResponsePanel key={audience} defaultContactChannel={composeDefaults.channel} defaultContactDirection={composeDefaults.direction} defaultContactOutcome={composeDefaults.outcome} defaultExceptionCodes={composeDefaults.exceptionCodes} defaultStatusCode={composeDefaults.statusCode} defaultSummary={customerSafeUpdate(order)} latestUpdates={JSON.parse(JSON.stringify(communicationUpdates))} repairOrderId={order.id} />
    </section> : null}

    {activeTab === "ESTIMATE" ? <section className="advisor-ro-section-grid">
      <section className="advisor-ro-card"><header><ClipboardCheck /><div><strong>Diagnosis</strong><span>Advisor-readable findings</span></div></header><dl><div><dt>Recommendation</dt><dd>{diagnosis?.recommendation ?? "Not yet recorded"}</dd></div><div><dt>Technician</dt><dd>{diagnosis?.technicianUser.name ?? "Not assigned in diagnosis"}</dd></div><div><dt>Evidence</dt><dd>{diagnosis ? `${evidenceCount(diagnosis.evidence)} evidence item(s)` : "Awaiting diagnosis"}</dd></div></dl></section>
      <section className="advisor-ro-card"><header><ShieldCheck /><div><strong>{isInventoryRecon ? "Estimate & internal approval" : "Estimate & authorization"}</strong><span>{isInventoryRecon ? "Exact inventory approver decision context" : "Exact customer decision context"}</span></div></header><dl><div><dt>Estimate</dt><dd>{estimate ? `$${(estimate.totalCents / 100).toFixed(2)} · ${format(estimate.status)}` : "Not yet prepared"}</dd></div><div><dt>{isInventoryRecon ? "Approval" : "Authorization"}</dt><dd>{authorization ? format(authorization.disposition) : isInventoryRecon ? "Not approved" : "Not authorized"}</dd></div>{activeVendorWork ? <><div><dt>Vendor estimate</dt><dd>{activeVendorWork.estimateAmountCents == null ? "Not recorded" : `$${(activeVendorWork.estimateAmountCents / 100).toFixed(2)}`}</dd></div><div><dt>Vendor approval</dt><dd>{format(activeVendorWork.approvalStatus)}</dd></div></> : null}<div><dt>Jobs</dt><dd>{order.repairJobs.length ? `${order.repairJobs.length} job(s) created` : "No approved repair jobs yet"}</dd></div></dl>{diagnosis ? <Link href={`/diagnostics/advisor-review?repairOrderId=${encodeURIComponent(order.id)}`}>Open estimate and approval review</Link> : null}</section>
    </section> : null}

    {activeTab === "REPAIR" ? <section className="advisor-ro-section-grid">
      <section className="advisor-ro-card advisor-repair-job-card"><header><Wrench /><div><strong>Repair jobs</strong><span>Authorized execution status</span></div></header>{order.repairJobs.length ? <dl>{order.repairJobs.map((job) => <div key={job.id}><dt>{job.jobNumber}</dt><dd>{job.description} · {format(job.status)}</dd></div>)}</dl> : <div className="advisor-repair-empty"><p>No internal repair jobs have been created.</p><small>The next safe action is selected from this repair order&apos;s current evidence and approval status.</small></div>}{!activeVendorWork ? repairPrimaryAction.mode === "link" ? <Link className="advisor-repair-primary" href={repairPrimaryAction.href}>{repairPrimaryAction.label}</Link> : <button className="advisor-repair-primary" disabled={creatingJobs} onClick={async()=>{setCreatingJobs(true);setRepairActionMessage(null);try{const response=await fetch(`/api/repair-orders/${encodeURIComponent(order.id)}/planning`,{method:"POST",headers:{"content-type":"application/json"},body:JSON.stringify({action:"CREATE_APPROVED_JOBS",idempotencyKey:crypto.randomUUID(),reason:"Create repair jobs from the exact approved estimate scope."})}),body=await response.json().catch(()=>null) as {error?:string;result?:{message?:string}}|null;if(!response.ok)throw new Error(body?.error??"The approved repair job could not be created.");setRepairActionMessage({kind:"success",text:body?.result?.message??"Approved repair job created."});router.refresh();}catch(error){setRepairActionMessage({kind:"error",text:error instanceof Error?error.message:"The approved repair job could not be created."});}finally{setCreatingJobs(false);}}} type="button">{creatingJobs?"Creating approved work...":repairPrimaryAction.label}</button> : null}{!activeVendorWork ? <OutsideRepairWorkPanel repairOrderId={order.id} work={null} /> : null}{repairActionMessage?<p className={`advisor-repair-action-message ${repairActionMessage.kind}`} role="status">{repairActionMessage.text}</p>:null}</section>
      <section className="advisor-ro-card advisor-parts-readiness-card"><header><PackageCheck /><div><strong>Parts readiness</strong><span>Demand that may affect the customer promise</span></div></header>{order.partDemands.length ? <dl>{order.partDemands.map((demand) => <div key={demand.id}><dt>{demand.part.partNumber}</dt><dd>{demand.part.description} · {demand.quantityReserved}/{demand.quantityRequired} reserved</dd></div>)}</dl> : <p>No part demands are recorded.</p>}<div className="advisor-parts-purchase"><span><ShoppingCart /><small>{order.partDemands.length ? "Source, order, receive, and track these parts." : "Add the needed parts, compare sourcing, and place a governed order."}</small></span><Link href={partsOperationsHref}>{order.partDemands.length ? "Open parts purchasing" : "Add / buy parts"}</Link></div></section>
      {activeVendorWork ? <OutsideRepairWorkPanel repairOrderId={order.id} work={JSON.parse(JSON.stringify(activeVendorWork))} /> : null}
    </section> : null}

    {activeTab === "QUALITY" ? <section className="advisor-ro-section-grid">
      <section className="advisor-ro-card"><header><CheckCircle2 /><div><strong>Quality readiness</strong><span>{isInventoryRecon ? "Return-to-inventory context" : "Customer-facing release context"}</span></div></header><dl><div><dt>Current stage</dt><dd>{format(order.stage)}</dd></div><div><dt>Repair jobs</dt><dd>{order.repairJobs.length ? `${order.repairJobs.length} tracked` : "No jobs ready for quality"}</dd></div><div><dt>Handoff</dt><dd>{order.stage === "HANDOFF" ? "Ready for handoff review" : "Not yet at handoff"}</dd></div></dl></section>
      <section className="advisor-ro-card"><header><ShieldCheck /><div><strong>Release protection</strong><span>{isInventoryRecon ? "Repair QC does not equal frontline ready" : "No customer completion promise from stage alone"}</span></div></header><p>{isInventoryRecon ? "Confirm repair completion, independent quality evidence, parts closure, keys, and custody transfer before returning the vehicle to Inventory. Inventory retains authority over frontline readiness and disposition." : "Confirm repair completion, independent quality evidence, parts closure, keys, and release authorization before telling the customer the vehicle is ready."}</p></section>
    </section> : null}

    {activeTab === "TIMELINE" ? <section className="advisor-ro-card advisor-ro-history"><header><CalendarClock /><div><strong>Advisor communication timeline</strong><span>Recorded customer contact and internal collaboration</span></div></header>{order.advisorUpdates.length ? order.advisorUpdates.map((update) => <article key={update.id}><span className={`advisor-inbox-audience ${communicationAudience(update).toLocaleLowerCase()}`}>{communicationAudience(update) === "CUSTOMER" ? "Customer" : communicationAudience(update) === "TEAM" ? "Internal team" : "Management"}</span><div><strong>{update.contactOutcome}</strong><p>{communicationAudience(update) === "CUSTOMER" ? update.customerVisibleSummary : update.internalNotes ?? update.contactOutcome}</p><small>{format(update.contactChannel)} · {format(update.contactDirection)} · {update.authorUser.name}</small></div><time>{date(update.occurredAt)}</time></article>) : <p>No advisor communication has been recorded.</p>}</section> : null}
  </section>;
}
