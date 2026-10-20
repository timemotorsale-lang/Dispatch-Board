import Link from "next/link";
import Image from "next/image";
import { ArrowLeft, ArrowRight, Car, ClipboardCheck, UserRound, Wrench } from "lucide-react";
import type { VehicleJourneyModel } from "@/server/inventory-unit/journey-service";
import styles from "./vehicle-workflow-choice.module.css";

export function VehicleWorkflowChoice({ journey, photo }: { journey: VehicleJourneyModel; photo?: string | null }) {
  const id = encodeURIComponent(journey.vehicle.id);
  const title = [journey.vehicle.year, journey.vehicle.make, journey.vehicle.model].filter(Boolean).join(" ") || journey.vehicle.vehicleNumber;
  const eligible = journey.access.inventory && Boolean(journey.unit) && journey.intake?.status === "CONFIRMED";
  return <section className={styles.workspace}>
    <header><Link href={`/vehicles/inventory/units${journey.unit ? `?inventoryUnitId=${encodeURIComponent(journey.unit.id)}` : ""}`}><ArrowLeft size={16}/>Inventory worklist</Link><h1>Choose Vehicle Workflow</h1></header>
    <div className={styles.identity}>
      <div className={styles.photo}>{photo ? <Image src={photo} alt={title} width={240} height={180} unoptimized/> : <Car size={40} aria-label="Vehicle photo not available"/>}</div>
      <div><h2>{title}</h2><dl>{[["Stock / vehicle", journey.vehicle.stockNumber ?? journey.vehicle.vehicleNumber], ["VIN", journey.vehicle.vin ?? "Not recorded"], ["Intake", journey.intake?.status ?? "Not started"], ["Owner", journey.unit?.ownerUser.name ?? "Unassigned"], ["Location", journey.unit?.location.name ?? "Not recorded"]].map(([label, value]) => <div key={label}><dt>{label}</dt><dd>{value}</dd></div>)}</dl></div>
    </div>
    {journey.blocked ? <p className={styles.hold} role="status">On hold: {journey.unit?.stateReason ?? journey.frontline?.nextAction ?? "Readiness review required"}</p> : null}
    {!eligible ? <p role="status">Confirm acquisition intake and open the inventory cycle before selecting an inventory path. <Link href={`/vehicles/${id}/intake`}>Open intake<ArrowRight size={16}/></Link></p> : null}
    <div className={styles.paths}>
      <article><ClipboardCheck size={28}/><h2>Prepare for Sale</h2><p>Pricing, media, documents and retail readiness.</p>{eligible ? <Link href={`/vehicles/${id}/frontline`}>Prepare for sale<ArrowRight size={18}/></Link> : <button disabled type="button">Prepare for sale<ArrowRight size={18}/></button>}</article>
      <article><Wrench size={28}/><h2>Inventory Recon</h2><p>Inspection, diagnostics, repair planning and parts.</p>{eligible ? <Link href={`/vehicles/${id}/inventory-planning`}>Open recon<ArrowRight size={18}/></Link> : <button disabled type="button">Open recon<ArrowRight size={18}/></button>}</article>
      <article><UserRound size={28}/><h2>Customer Repair</h2><p>Customer-owned vehicles use service intake, not acquisition intake.</p><button disabled type="button">Customer repair<ArrowRight size={18}/></button><span>Not applicable to this inventory cycle</span><Link href="/vehicles/workflows/add-vehicle?returnTo=%2Fvehicles%2Frepair-orders">Add customer vehicle<ArrowRight size={16}/></Link></article>
    </div>
    <div className={styles.handoff}><h2>Intake Handoff</h2><dl><div><dt>Condition</dt><dd>{journey.intake?.handoff?.condition || "Not recorded"}</dd></div><div><dt>Pending items</dt><dd>{journey.intake?.pendingItems.join(", ") || "None recorded"}</dd></div><div><dt>Next action</dt><dd>{journey.unit?.nextAction ?? "Review vehicle record"}</dd></div></dl></div>
  </section>;
}
