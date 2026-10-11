"use client";

import Link from "next/link";
import Image from "next/image";
import { useId, useState } from "react";
import { ArrowLeft, ArrowRight, Car, CheckCircle2, FileText } from "lucide-react";
import type { VehicleJourneyModel } from "@/server/inventory-unit/journey-service";
import { VehiclePricingWorkspace, type PricingModel } from "./vehicle-pricing-workspace";
import { VehicleCostWorkspace, type VehicleCostModel } from "./vehicle-cost-workspace";
import { VehicleIntakeWorkspace } from "./vehicle-intake-workspace";
import type { VehicleIntakeModel } from "@/server/inventory-unit/intake-service";
import { VehicleLogs, VehicleTools, type VehicleRecordContext } from "./vehicle-record-tools";
import styles from "./frontline-preparation-workspace.module.css";
import { VehicleSalesMediaWorkspace } from "./vehicle-sales-media-workspace";
import type { SalesMediaModel } from "@/server/vehicle-360/sales-media-domain";

type Document = { id: string; name: string; href: string | null; image: boolean };
const tabs = ["Vehicle Info", "Marketing", "Media", "Market Data", "Purchase Info", "Activities", "Files", "Accounting", "Recon", "Logs", "Release Review"] as const;
type Tab = typeof tabs[number];
const money = (value: number | undefined) => value === undefined ? "Not recorded" : new Intl.NumberFormat("en-US", { style: "currency", currency: "USD" }).format(value / 100);

export function FrontlinePreparationWorkspace({ journey, pricing, costs, documents, mediaUnavailable = false, intake = null, recordContext = null, salesMedia = null }: { journey: VehicleJourneyModel; pricing: PricingModel | null; costs: VehicleCostModel | null; documents: Document[]; mediaUnavailable?: boolean; intake?: VehicleIntakeModel | null; recordContext?: VehicleRecordContext | null; salesMedia?: SalesMediaModel | null }) {
  const [tab, setTab] = useState<Tab>("Vehicle Info");
  const [info, setInfo] = useState("Summary");
  const [gallery, setGallery] = useState(salesMedia);
  const tabGroup = useId();
  const id = encodeURIComponent(journey.vehicle.id), vehicle = journey.vehicle;
  const photo = gallery?.items.find(item => item.contentType.startsWith("image/") && item.href);
  const ready = journey.frontline?.stage === "POST_RELEASE_VERIFICATION" && journey.frontline.operatingState === "COMPLETED";
  const title = [vehicle.year, vehicle.make, vehicle.model].filter(Boolean).join(" ") || vehicle.vehicleNumber;
  const status = journey.blocked ? "On hold" : ready ? "Frontline verified" : "Preparation required";
  return <section className={styles.workspace}>
    <header className={styles.header}><div><Link href="/vehicles/registry"><ArrowLeft size={16}/>Inventory vehicles</Link><h1>{title}</h1><span>Vehicle Details · {vehicle.stockNumber ?? vehicle.vehicleNumber} / {journey.unit?.inventoryNumber ?? "No inventory cycle"}</span></div><div className={styles.commands}><Link href={`/vehicles/${id}/intake`}>Acquisition &amp; Intake</Link><Link className={styles.primary} href={`/vehicles/inventory-to-frontline?vehicleId=${id}`}><CheckCircle2 size={16}/>Review release<ArrowRight size={16}/></Link><VehicleTools vehicleId={vehicle.id}/></div></header>
    <div className={styles.layout}>
      <aside className={styles.identity}>
        <div className={styles.photo}>{photo?.href ? <Image src={photo.href} alt={title} width={640} height={480} unoptimized/> : <Car size={56} aria-label="Vehicle photo not available"/>}</div>
        <span className={styles.status}>{status}</span>
        <dl>{[["VIN", vehicle.vin ?? "Pending"], ["Stock", vehicle.stockNumber ?? "Pending"], ["Owner", journey.unit?.ownerUser.name ?? "Unassigned"], ["Location", journey.unit?.location.name ?? "Pending"], ["Stage", journey.unit?.lifecycleStage.replaceAll("_", " ") ?? "No cycle"], ["Intake", journey.intake?.status ?? "Not started"], ["Odometer", journey.intake?.handoff?.odometer == null ? "Not recorded" : `${journey.intake.handoff.odometer.toLocaleString()} ${journey.intake.handoff.odometerUnit.toLowerCase()}`]].map(([label, value]) => <div key={label}><dt>{label}</dt><dd>{value}</dd></div>)}</dl>
        <Link href={`/vehicles/360/${id}`}>Vehicle record<ArrowRight size={16}/></Link>
      </aside>
      <div className={styles.workbench}>
        <div className={styles.tabs} role="tablist" aria-label="Vehicle detail sections">{tabs.map((item, index) => <button key={item} id={`${tabGroup}-tab-${index}`} type="button" role="tab" aria-selected={tab === item} aria-controls={`${tabGroup}-panel-${index}`} tabIndex={tab === item ? 0 : -1} onClick={() => setTab(item)} onKeyDown={event => {
          const next = event.key === "ArrowRight" ? (index + 1) % tabs.length : event.key === "ArrowLeft" ? (index + tabs.length - 1) % tabs.length : event.key === "Home" ? 0 : event.key === "End" ? tabs.length - 1 : null;
          if (next === null) return;
          event.preventDefault();
          setTab(tabs[next]);
          event.currentTarget.parentElement?.querySelectorAll<HTMLButtonElement>('[role="tab"]')[next]?.focus();
        }}>{item}</button>)}</div>
      <div className={styles.content}>
        {journey.blocked ? <p className={styles.hold} role="alert">{journey.unit?.stateReason ?? "Resolve the recorded readiness hold before release."}</p> : null}
        <div role="tabpanel" id={`${tabGroup}-panel-0`} aria-labelledby={`${tabGroup}-tab-0`} hidden={tab !== "Vehicle Info"} tabIndex={0}>
          <nav className={styles.subtabs} aria-label="Vehicle information sections">{["Summary", "General Info", "Pricing", "Description"].map(section => <button key={section} type="button" aria-pressed={info === section} onClick={() => setInfo(section)}>{section}</button>)}</nav>
          <div hidden={info !== "Summary"}>
          <div className={styles.overview}>
            <section><h2>Price &amp; Investment</h2><dl><div><dt>Proposed price</dt><dd>{money(journey.proposal?.priceCents)}</dd></div><div><dt>Incurred costs</dt><dd>{money(journey.costs?.incurredCents)}</dd></div><div><dt>Separate estimates</dt><dd>{money(journey.costs?.estimatedCents)}</dd></div><div><dt>Price review</dt><dd>{journey.proposal ? journey.proposal.stale ? "Revision required" : "Proposal recorded" : "Not proposed"}</dd></div></dl>{journey.access.pricing ? <button type="button" onClick={() => setInfo("Pricing")}>Pricing review<ArrowRight size={16}/></button> : null}</section>
            <section><h2>Readiness</h2><dl><div><dt>Release</dt><dd>{status}</dd></div><div><dt>Current workflow</dt><dd>{journey.frontline?.stage.replaceAll("_", " ") ?? "Not started"}</dd></div><div><dt>Next action</dt><dd>{journey.frontline?.nextAction ?? journey.unit?.nextAction ?? "Complete acquisition intake"}</dd></div></dl><button type="button" onClick={() => setTab("Release Review")}>Readiness review<ArrowRight size={16}/></button></section>
            <section><h2>Vehicle Condition</h2><p>{journey.intake?.handoff?.condition || "No confirmed intake condition recorded."}</p><dl><div><dt>Keys</dt><dd>{journey.intake?.handoff?.keys ?? "Not recorded"}</dd></div><div><dt>Pending items</dt><dd>{journey.intake?.pendingItems.join(", ") || "None recorded"}</dd></div></dl><Link href={`/vehicles/360/${id}`}>Specifications &amp; history<ArrowRight size={16}/></Link></section>
            <section><h2>Documents &amp; Media</h2><p>{mediaUnavailable ? "Document data is temporarily unavailable." : `${documents.length} linked files`}</p>{documents.slice(0, 4).map(item => <p key={item.id}>{item.href ? <a href={item.href}><FileText size={16}/>{item.name}</a> : item.name}</p>)}<button type="button" onClick={() => setTab("Media")}>Photos &amp; Videos<ArrowRight size={16}/></button></section>
          </div>
          <section className={styles.description}><h2>Intake Handoff</h2><p>{journey.intake?.handoff?.pendingNotes || "No additional handoff notes."}</p><p>{journey.intake?.handoff?.documents || "No confirmed document summary."}</p></section>
          </div>
          <section hidden={info !== "General Info"}><h2>General Info</h2><dl>{(recordContext?.specifications ?? []).map(([label, value]) => <div key={label}><dt>{label}</dt><dd>{value}</dd></div>)}</dl>{!recordContext?.specifications.length ? <p>No decoded specifications available.</p> : null}<Link href={`/vehicles/360/${id}`}>Review vehicle identity &amp; specifications<ArrowRight size={16}/></Link></section>
          <div hidden={info !== "Pricing"}>{journey.access.pricing ? <VehiclePricingWorkspace unit={pricing} vehicleId={vehicle.id} embedded/> : <p>Pricing permission is required.</p>}</div>
          <section hidden={info !== "Description"}><h2>Recorded Condition &amp; Description</h2><p>{journey.intake?.handoff?.condition || "No confirmed condition description."}</p><Link href={`/vehicles/${id}/intake`}>Edit intake condition</Link></section>
        </div>
        {/* Keep forms mounted so switching sections does not discard unsaved edits. */}
        <div role="tabpanel" id={`${tabGroup}-panel-7`} aria-labelledby={`${tabGroup}-tab-7`} hidden={tab !== "Accounting"} tabIndex={0}>{journey.access.costs ? <VehicleCostWorkspace unit={costs} vehicleId={vehicle.id} embedded/> : <p>Cost access is required.</p>}</div>
        <div role="tabpanel" id={`${tabGroup}-panel-6`} aria-labelledby={`${tabGroup}-tab-6`} hidden={tab !== "Files"} tabIndex={0}><section><h2>Files</h2>{mediaUnavailable ? <p>Document data is temporarily unavailable.</p> : documents.length ? documents.map(item => <p key={item.id}>{item.href ? <a href={item.href}><FileText size={16}/>{item.name}</a> : `${item.name} / unavailable`}</p>) : <p>No linked files.</p>}<Link href={`/vehicles/360/${id}?section=documents`}>Manage documents &amp; photos</Link></section></div>
        <div role="tabpanel" id={`${tabGroup}-panel-10`} aria-labelledby={`${tabGroup}-tab-10`} hidden={tab !== "Release Review"} tabIndex={0}><section><h2>Release Readiness</h2><div className={styles.checklist}>{journey.steps.map(step => <div key={step.id}><strong>{step.label}</strong><span>{step.status}</span>{step.href ? <Link href={step.href}>Open<ArrowRight size={16}/></Link> : null}</div>)}</div><Link className={styles.primary} href={`/vehicles/inventory-to-frontline?vehicleId=${id}`}>Open release workflow<ArrowRight size={16}/></Link></section></div>
        <div role="tabpanel" id={`${tabGroup}-panel-1`} aria-labelledby={`${tabGroup}-tab-1`} hidden={tab !== "Marketing"} tabIndex={0}><section><h2>Active Exports &amp; Publishing</h2><dl><div><dt>Current workflow</dt><dd>{journey.frontline?.stage.replaceAll("_", " ") ?? "Not started"}</dd></div><div><dt>Release status</dt><dd>{status}</dd></div></dl><p>External listing connectors are disabled. No external publication has been confirmed by this screen.</p><Link href={`/vehicles/inventory-to-frontline?vehicleId=${id}`}>Open merchandising &amp; publishing review<ArrowRight size={16}/></Link></section></div>
        <div role="tabpanel" id={`${tabGroup}-panel-2`} aria-labelledby={`${tabGroup}-tab-2`} hidden={tab !== "Media"} tabIndex={0}><VehicleSalesMediaWorkspace vehicleId={vehicle.id} initialModel={salesMedia} onChange={setGallery}/></div>
        <div role="tabpanel" id={`${tabGroup}-panel-3`} aria-labelledby={`${tabGroup}-tab-3`} hidden={tab !== "Market Data"} tabIndex={0}><section><h2>Market Data &amp; Appraisal</h2><p>External valuation subscriptions are not connected.</p><Link href={`/vehicles/acquisition-appraisal?vehicleId=${id}`}>Open recorded appraisal<ArrowRight size={16}/></Link><p><Link href={`/vehicles/${id}/sale?mode=as-is`}>Review as-is disposition</Link></p></section></div>
        <div role="tabpanel" id={`${tabGroup}-panel-4`} aria-labelledby={`${tabGroup}-tab-4`} hidden={tab !== "Purchase Info"} tabIndex={0}>{intake ? <VehicleIntakeWorkspace model={intake} costs={costs} embedded/> : <section><h2>Purchase Info</h2><p>Acquisition intake access is required, or the record is temporarily unavailable.</p><Link href={`/vehicles/${id}/intake`}>Open acquisition intake</Link></section>}</div>
        <div role="tabpanel" id={`${tabGroup}-panel-5`} aria-labelledby={`${tabGroup}-tab-5`} hidden={tab !== "Activities"} tabIndex={0}><section><h2>Current Activities</h2><div className={styles.checklist}>{journey.steps.map(step => <div key={step.id}><strong>{step.label}</strong><span>{step.status}</span>{step.href ? <Link href={step.href}>Open<ArrowRight size={16}/></Link> : null}</div>)}</div></section></div>
        <div role="tabpanel" id={`${tabGroup}-panel-8`} aria-labelledby={`${tabGroup}-tab-8`} hidden={tab !== "Recon"} tabIndex={0}><section><h2>Recon &amp; Repair</h2><p>{journey.unit?.nextAction ?? "No current recon action recorded."}</p>{journey.access.repair ? <Link href={`/vehicles/${id}/inventory-planning`}>Open recon planning &amp; repair orders<ArrowRight size={16}/></Link> : <p>Repair access is required.</p>}</section></div>
        <div role="tabpanel" id={`${tabGroup}-panel-9`} aria-labelledby={`${tabGroup}-tab-9`} hidden={tab !== "Logs"} tabIndex={0}><VehicleLogs context={recordContext}/></div>
      </div>
      </div>
    </div>
  </section>;
}
