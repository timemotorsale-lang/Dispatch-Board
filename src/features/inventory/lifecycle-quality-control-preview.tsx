"use client";

import { BadgeCheck, Car, FileText, ShieldCheck, Wrench } from "lucide-react";
import Link from "next/link";

import { IqiQualityTool } from "@/features/prototype/iqi-quality-tool";

type PreviewInspection = {
  disposition: string;
};

type PreviewJob = {
  id: string;
  jobNumber: string;
  description: string;
  plannedCorrection: string;
  status: string;
  qualityInspections: PreviewInspection[];
};

type PreviewOrder = {
  id: string;
  repairOrderNumber: string;
  origin: string;
  targetAt: string;
  vehicle: { vehicleNumber: string; year: number | null; make: string | null; model: string | null };
  customer: { displayName: string } | null;
  inventoryUnit: { inventoryNumber: string } | null;
  location: { name: string };
  serviceVisit: { concernSummary: string; promisedAt: string | null };
  repairJobs: PreviewJob[];
};

type PreviewModel = {
  repairOrders: PreviewOrder[];
};

function vehicleName(order: PreviewOrder) {
  return [order.vehicle.year, order.vehicle.make, order.vehicle.model].filter(Boolean).join(" ") || order.vehicle.vehicleNumber;
}

function dateTime(value?: string | null) {
  return value ? new Date(value).toLocaleString([], { month: "short", day: "numeric", hour: "numeric", minute: "2-digit" }) : "Not set";
}

function workbenchHref(order: PreviewOrder) {
  return `/vehicles/repair-workbench?repairOrderId=${encodeURIComponent(order.id)}`;
}

export function LifecycleQualityControlPreview({
  initial,
  initialRepairOrderId,
  returnTo,
}: {
  initial: PreviewModel;
  initialRepairOrderId?: string;
  returnTo: string;
}) {
  const order = initial.repairOrders.find((item) => item.id === initialRepairOrderId) ?? initial.repairOrders[0];
  const job = order?.repairJobs.find((item) => item.status === "READY_FOR_QC") ?? order?.repairJobs[0];
  const latestInspection = job?.qualityInspections[0];
  const ownerLabel = order?.customer?.displayName ?? order?.inventoryUnit?.inventoryNumber ?? order?.origin ?? "Unassigned";
  const hasRepairContext = Boolean(order && job);

  return (
    <section className="qc-workspace-home">
      <header className="qc-hero">
        <div>
          <Link href={returnTo}>← Return to inventory lifecycle</Link>
          <p>Initial Quality Control Workspace</p>
          <h1>Open the approved IQI mockup directly.</h1>
          <span>This lifecycle preview now opens the exact Initial QC form you approved as the main workspace.</span>
        </div>
        <nav aria-label="Lifecycle Initial QC actions">
          <Link href={order ? workbenchHref(order) : "/vehicles/repair-workbench"}><FileText /> Repair Order</Link>
          <Link href="/my-tasks"><BadgeCheck /> My Work</Link>
          <Link href="/vehicles/quality-control"><ShieldCheck /> Live QC Queue</Link>
        </nav>
      </header>

      <section className="qc-panel qc-selected" aria-label="Selected repair">
        <header>
          <div>
            <strong>Selected repair</strong>
            <span>Inspection context carried into Initial QC</span>
          </div>
          {order ? <Link href={workbenchHref(order)}>Open RO</Link> : null}
        </header>
        {hasRepairContext ? (
          <div className="qc-selected-body">
            <p><Car /><span><strong>{vehicleName(order)}</strong><small>{order.vehicle.vehicleNumber} · {order.location.name}</small></span></p>
            <p><FileText /><span><strong>{order.repairOrderNumber} · {job.jobNumber}</strong><small>{order.serviceVisit.concernSummary || "No concern summary"}</small></span></p>
            <p><Wrench /><span><strong>{job.description}</strong><small>{job.plannedCorrection || "No planned correction"}</small></span></p>
            <p><ShieldCheck /><span><strong>{latestInspection?.disposition ?? "No QC result yet"}</strong><small>Owner: {ownerLabel} · Promise: {dateTime(order.serviceVisit.promisedAt ?? order.targetAt)}</small></span></p>
          </div>
        ) : (
          <div className="qc-selected-body">
            <p><ShieldCheck /><span><strong>Preview mode</strong><small>No live repair is selected right now, but the approved IQI form below is still available for planning and review.</small></span></p>
          </div>
        )}
      </section>

      <section aria-label="Approved Initial QC mockup">
        <IqiQualityTool onProgressChange={() => undefined} />
      </section>
    </section>
  );
}
