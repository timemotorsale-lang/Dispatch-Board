"use client";

import Link from "next/link";
import Image from "next/image";
import { useId, useState } from "react";
import { ArrowLeft, ArrowRight, Car, CheckCircle2, FileText, Wrench } from "lucide-react";
import type { VehicleJourneyModel } from "@/server/inventory-unit/journey-service";
import { VehiclePricingWorkspace, type PricingModel } from "./vehicle-pricing-workspace";
import { VehicleCostWorkspace, type VehicleCostModel } from "./vehicle-cost-workspace";
import styles from "./frontline-preparation-workspace.module.css";

type Document = { id: string; name: string; href: string | null; image: boolean };
const tabs = ["Overview", "Pricing", "Costs", "Media & Files", "Release Review"] as const;
type Tab = typeof tabs[number];
const money = (value: number | undefined) => value === undefined ? "Not recorded" : new Intl.NumberFormat("en-US", { style: "currency", currency: "USD" }).format(value / 100);

export function FrontlinePreparationWorkspace({ journey, pricing, costs, documents, mediaUnavailable = false }: { journey: VehicleJourneyModel; pricing: PricingModel | null; costs: VehicleCostModel | null; documents: Document[]; mediaUnavailable?: boolean }) {
  const [tab, setTab] = useState<Tab>("Overview");
  const tabGroup = useId();
  const id = encodeURIComponent(journey.vehicle.id), vehicle = journey.vehicle;
  const photo = documents.find(item => item.image && item.href);
  const ready = journey.frontline?.stage === "POST_RELEASE_VERIFICATION" && journey.frontline.operatingState === "COMPLETED";
  const title = [vehicle.year, vehicle.make, vehicle.model].filter(Boolean).join(" ") || vehicle.vehicleNumber;
  const status = journey.blocked ? "On hold" : ready ? "Frontline verified" : "Preparation required";
  return <section className={styles.workspace}>
    <header className={styles.header}><div><Link href={`/vehicles/inventory/units${journey.unit ? `?inventoryUnitId=${encodeURIComponent(journey.unit.id)}` : ""}`}><ArrowLeft size={16}/>Inventory worklist</Link><h1>{title}</h1><span>{vehicle.stockNumber ?? vehicle.vehicleNumber} / {journey.unit?.inventoryNumber ?? "No inventory cycle"}</span></div><div className={styles.commands}><Link href={`/vehicles/${id}/workflow`}>Choose Workflow</Link><Link href={`/vehicles/${id}/intake`}>Acquisition &amp; Intake</Link><Link href={`/vehicles/${id}/inventory-planning`}><Wrench size={16}/>Recon Path</Link><Link className={styles.primary} href={`/vehicles/inventory-to-frontline?vehicleId=${id}`}><CheckCircle2 size={16}/>Review release<ArrowRight size={16}/></Link></div></header>
    <div className={styles.layout}>
      <aside className={styles.identity}>
        <div className={styles.photo}>{photo?.href ? <Image src={photo.href} alt={title} width={640} height={480} unoptimized/> : <Car size={56} aria-label="Vehicle photo not available"/>}</div>
        <span className={styles.status}>{status}</span>
        <dl>{[["VIN", vehicle.vin ?? "Pending"], ["Stock", vehicle.stockNumber ?? "Pending"], ["Owner", journey.unit?.ownerUser.name ?? "Unassigned"], ["Location", journey.unit?.location.name ?? "Pending"], ["Stage", journey.unit?.lifecycleStage.replaceAll("_", " ") ?? "No cycle"], ["Intake", journey.intake?.status ?? "Not started"], ["Odometer", journey.intake?.handoff?.odometer == null ? "Not recorded" : `${journey.intake.handoff.odometer.toLocaleString()} ${journey.intake.handoff.odometerUnit.toLowerCase()}`]].map(([label, value]) => <div key={label}><dt>{label}</dt><dd>{value}</dd></div>)}</dl>
        <Link href={`/vehicles/360/${id}`}>Vehicle record<ArrowRight size={16}/></Link>
      </aside>
      <div className={styles.workbench}>
        <div className={styles.tabs} role="tablist" aria-label="Frontline preparation sections">{tabs.map((item, index) => <button key={item} id={`${tabGroup}-tab-${index}`} type="button" role="tab" aria-selected={tab === item} aria-controls={`${tabGroup}-panel-${index}`} tabIndex={tab === item ? 0 : -1} onClick={() => setTab(item)} onKeyDown={event => {
          const next = event.key === "ArrowRight" ? (index + 1) % tabs.length : event.key === "ArrowLeft" ? (index + tabs.length - 1) % tabs.length : event.key === "Home" ? 0 : event.key === "End" ? tabs.length - 1 : null;
          if (next === null) return;
          event.preventDefault();
          setTab(tabs[next]);
          event.currentTarget.parentElement?.querySelectorAll<HTMLButtonElement>('[role="tab"]')[next]?.focus();
        }}>{item}</button>)}</div>
      <div className={styles.content}>
        {journey.blocked ? <p className={styles.hold} role="alert">{journey.unit?.stateReason ?? "Resolve the recorded readiness hold before release."}</p> : null}
        <div role="tabpanel" id={`${tabGroup}-panel-0`} aria-labelledby={`${tabGroup}-tab-0`} hidden={tab !== "Overview"} tabIndex={0}>
          <div className={styles.overview}>
            <section><h2>Price &amp; Investment</h2><dl><div><dt>Proposed price</dt><dd>{money(journey.proposal?.priceCents)}</dd></div><div><dt>Incurred costs</dt><dd>{money(journey.costs?.incurredCents)}</dd></div><div><dt>Separate estimates</dt><dd>{money(journey.costs?.estimatedCents)}</dd></div><div><dt>Price review</dt><dd>{journey.proposal ? journey.proposal.stale ? "Revision required" : "Proposal recorded" : "Not proposed"}</dd></div></dl>{journey.access.pricing ? <button type="button" onClick={() => setTab("Pricing")}>Pricing review<ArrowRight size={16}/></button> : null}</section>
            <section><h2>Readiness</h2><dl><div><dt>Release</dt><dd>{status}</dd></div><div><dt>Current workflow</dt><dd>{journey.frontline?.stage.replaceAll("_", " ") ?? "Not started"}</dd></div><div><dt>Next action</dt><dd>{journey.frontline?.nextAction ?? journey.unit?.nextAction ?? "Complete acquisition intake"}</dd></div></dl><button type="button" onClick={() => setTab("Release Review")}>Readiness review<ArrowRight size={16}/></button></section>
            <section><h2>Vehicle Condition</h2><p>{journey.intake?.handoff?.condition || "No confirmed intake condition recorded."}</p><dl><div><dt>Keys</dt><dd>{journey.intake?.handoff?.keys ?? "Not recorded"}</dd></div><div><dt>Pending items</dt><dd>{journey.intake?.pendingItems.join(", ") || "None recorded"}</dd></div></dl><Link href={`/vehicles/360/${id}`}>Specifications &amp; history<ArrowRight size={16}/></Link></section>
            <section><h2>Documents &amp; Media</h2><p>{mediaUnavailable ? "Document data is temporarily unavailable." : `${documents.length} linked files`}</p>{documents.slice(0, 4).map(item => <p key={item.id}>{item.href ? <a href={item.href}><FileText size={16}/>{item.name}</a> : item.name}</p>)}<Link href={`/vehicles/360/${id}?section=documents`}>Manage documents &amp; photos<ArrowRight size={16}/></Link></section>
          </div>
          <section className={styles.description}><h2>Intake Handoff</h2><p>{journey.intake?.handoff?.pendingNotes || "No additional handoff notes."}</p><p>{journey.intake?.handoff?.documents || "No confirmed document summary."}</p></section>
        </div>
        {/* Keep forms mounted so switching sections does not discard unsaved edits. */}
        <div role="tabpanel" id={`${tabGroup}-panel-1`} aria-labelledby={`${tabGroup}-tab-1`} hidden={tab !== "Pricing"} tabIndex={0}>{journey.access.pricing ? <VehiclePricingWorkspace unit={pricing} vehicleId={vehicle.id} embedded/> : <p>Pricing permission is required.</p>}</div>
        <div role="tabpanel" id={`${tabGroup}-panel-2`} aria-labelledby={`${tabGroup}-tab-2`} hidden={tab !== "Costs"} tabIndex={0}>{journey.access.costs ? <VehicleCostWorkspace unit={costs} vehicleId={vehicle.id} embedded/> : <p>Cost access is required.</p>}</div>
        <div role="tabpanel" id={`${tabGroup}-panel-3`} aria-labelledby={`${tabGroup}-tab-3`} hidden={tab !== "Media & Files"} tabIndex={0}><section><h2>Media &amp; Files</h2>{mediaUnavailable ? <p>Document data is temporarily unavailable.</p> : documents.length ? documents.map(item => <p key={item.id}>{item.href ? <a href={item.href}><FileText size={16}/>{item.name}</a> : `${item.name} / unavailable`}</p>) : <p>No linked files.</p>}<Link href={`/vehicles/360/${id}?section=documents`}>Manage documents &amp; photos</Link></section></div>
        <div role="tabpanel" id={`${tabGroup}-panel-4`} aria-labelledby={`${tabGroup}-tab-4`} hidden={tab !== "Release Review"} tabIndex={0}><section><h2>Release Readiness</h2><div className={styles.checklist}>{journey.steps.map(step => <div key={step.id}><strong>{step.label}</strong><span>{step.status}</span>{step.href ? <Link href={step.href}>Open<ArrowRight size={16}/></Link> : null}</div>)}</div><Link className={styles.primary} href={`/vehicles/inventory-to-frontline?vehicleId=${id}`}>Open release workflow<ArrowRight size={16}/></Link></section></div>
      </div>
      </div>
    </div>
  </section>;
}
