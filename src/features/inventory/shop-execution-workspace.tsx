"use client";

import Link from "next/link";
import { catalogJobRequirements } from "@/lib/catalog-job-readiness";
import { missingCatalogResourceCapabilities } from "@/lib/catalog-resource-readiness";
import { waitingJobPartsReady } from "@/lib/repair-job-parts-readiness";
import { notifyRepairReviewSaved } from "@/lib/repair-workflow-review";
import { FormEvent, useMemo, useState } from "react";

type User = { id: string; name: string; roles?: string[] };
type Resource = { id: string; code: string; name: string; locationId: string; userId: string | null; attributes?: unknown; resourceType: { kind: string; name: string } };
type Dispatch = { id: string; technicianUserId: string; position: string; status: string; scheduledStartAt: string; scheduledEndAt: string; technicianUser: User; bayResource: { id: string; code: string; name: string } | null };
type Clock = { technicianUserId: string; state: string; accumulatedMinutes: number; lastResumedAt: string | null };
type RepairOrderSummary = {
  id: string;
  repairOrderNumber: string;
  stage: string;
  locationId: string;
  targetAt: string;
  nextAction: string;
  assignedTechnicianUserId: string | null;
  assignedTechnician: User | null;
  ownerUser: User;
  location: { id: string; name: string };
  inventoryUnit?: { inventoryNumber: string } | null;
  vehicle: { id?: string; vehicleNumber: string; vin?: string | null; year: number | null; make: string | null; model: string | null };
  serviceVisit: { concernSummary: string; promisedAt: string | null };
};
type Job = {
  workTypeCode?: string;
  authorizedLineKey?: string;
  laborGuideMinutes?: number;
  bayRequirements?: unknown;
  id: string;
  jobNumber: string;
  description: string;
  plannedCorrection: string;
  status: string;
  partsRequired?: boolean;
  executionBlockerReason?: string | null;
  partDemands?: { status: string; quantityRequired: number; quantityReserved: number }[];
  dispatches: Dispatch[];
  laborClocks: Clock[];
  repairOrder: {
    id?: string;
    repairOrderNumber: string;
    locationId: string;
    location: { id: string; name: string };
    ownerUser: User;
    assignedTechnician?: User | null;
    inventoryUnit: { inventoryNumber: string } | null;
    vehicle: { id?: string; vehicleNumber: string; vin?: string | null; year: number | null; make: string | null; model: string | null };
    customer: { displayName: string } | null;
    serviceVisit: { promisedAt: string | null; concernSummary: string };
  };
};
type Model = {
  canAddTechnician?: boolean;
  canPublishProcedure?: boolean;
  procedures?: { workTypeCode: string; effectiveFrom: string; effectiveTo: string | null }[];
  jobs: Job[];
  repairOrders?: RepairOrderSummary[];
  users: User[];
  resources: Resource[];
};
type SourceVehicle = { id: string; vehicleNumber: string; vin: string | null; stockNumber: string | null; year: number | null; make: string | null; model: string | null };

const local = (value: Date) => new Date(value.getTime() - value.getTimezoneOffset() * 60_000).toISOString().slice(0, 16);
const executableJob = (job: Job) => ["READY_FOR_REPAIR", "DISPATCHED"].includes(job.status) ||
  (job.status === "WAITING_PARTS" && waitingJobPartsReady(job));
const vehicleName = (vehicle: { year: number | null; make: string | null; model: string | null }) => [vehicle.year, vehicle.make, vehicle.model].filter(Boolean).join(" ") || "Vehicle";
const shortConcern = (value: string, length = 70) => value.length > length ? `${value.slice(0, length - 1)}…` : value;
const stageLabel = (value: string) => value.replaceAll("_", " ").toLowerCase();
const searchableOrderText = (order: RepairOrderSummary) => [
  vehicleName(order.vehicle),
  order.vehicle.vehicleNumber,
  order.vehicle.vin,
  order.inventoryUnit?.inventoryNumber,
  order.repairOrderNumber,
  order.stage,
  order.location.name,
  order.ownerUser.name,
  order.assignedTechnician?.name,
  order.serviceVisit.concernSummary,
  order.nextAction,
].filter(Boolean).join(" ").toLowerCase();

function derivedRepairOrders(model: Model): RepairOrderSummary[] {
  if (model.repairOrders) return model.repairOrders;
  return model.jobs.map((job) => ({
    id: job.repairOrder.id ?? "",
    repairOrderNumber: job.repairOrder.repairOrderNumber,
    stage: job.status,
    locationId: job.repairOrder.locationId,
    targetAt: "",
    nextAction: "",
    assignedTechnicianUserId: job.repairOrder.assignedTechnician?.id ?? null,
    assignedTechnician: job.repairOrder.assignedTechnician ?? null,
    ownerUser: job.repairOrder.ownerUser,
    location: job.repairOrder.location,
    inventoryUnit: job.repairOrder.inventoryUnit,
    vehicle: job.repairOrder.vehicle,
    serviceVisit: job.repairOrder.serviceVisit,
  })).filter((order, index, orders) => order.id && orders.findIndex((item) => item.id === order.id) === index);
}

export function ShopExecutionWorkspace({ initial, initialRepairOrderId, initialVehicleId, sourceVehicle, reviewOrderId }: { initial: Model; initialRepairOrderId?: string; initialVehicleId?: string; sourceVehicle?: SourceVehicle | null; reviewOrderId?: string }) {
  const initialOrders = derivedRepairOrders(initial);
  const initialOrderExists = initialRepairOrderId ? initialOrders.some((order) => order.id === initialRepairOrderId) : false;
  const initialVehicleOrder = initialVehicleId ? initialOrders.find((order) => order.vehicle.id === initialVehicleId) : null;
  const firstOrderId = initialRepairOrderId ? initialOrderExists ? initialRepairOrderId : initialVehicleOrder?.id ?? "" : initialVehicleId ? initialVehicleOrder?.id ?? "" : initial.jobs.find((job) => job.status === "READY_FOR_REPAIR")?.repairOrder.id ?? initialOrders[0]?.id ?? "";
  const firstJob = initial.jobs.find((job) => job.repairOrder.id === firstOrderId && executableJob(job)) ?? initial.jobs.find((job) => job.repairOrder.id === firstOrderId);
  const firstOrder = initialOrders.find((order) => order.id === firstOrderId);
  const firstTechnicianId = firstJob?.dispatches.find((item) => ["ACTIVE", "STAGED"].includes(item.status))?.technicianUserId ?? firstOrder?.assignedTechnicianUserId ?? firstOrder?.ownerUser.id ?? initial.resources.find((resource) => resource.resourceType.kind === "STAFF" && resource.userId)?.userId ?? "";
  const now = new Date();
  const later = new Date(now.getTime() + 60 * 60_000);

  const [model, setModel] = useState(initial);
  const [repairOrderId, setRepairOrderId] = useState(firstOrderId);
  const [jobId, setJobId] = useState(firstJob?.id ?? "");
  const [notice, setNotice] = useState("");
  const [busy, setBusy] = useState(false);
  const [vehicleQuery, setVehicleQuery] = useState("");
  const [assignment, setAssignment] = useState({
    technicianUserId: firstTechnicianId,
    bayResourceId: "",
    resourceIds: [] as string[],
    position: "CURRENT",
    scheduledStartAt: local(now),
    scheduledEndAt: local(later),
    overrideReason: "",
  });

  const repairOrders = derivedRepairOrders(model);
  const normalizedVehicleQuery = vehicleQuery.trim().toLowerCase();
  const visibleRepairOrders = normalizedVehicleQuery ? repairOrders.filter((order) => searchableOrderText(order).includes(normalizedVehicleQuery)) : repairOrders;
  const selectedOrder = repairOrders.find((order) => order.id === repairOrderId);
  const orderJobs = model.jobs.filter((job) => job.repairOrder.id === repairOrderId);
  const selectedJob = orderJobs.find((job) => job.id === jobId);
  const catalogRequirements = catalogJobRequirements(selectedJob?.authorizedLineKey ?? "", {
    bayRequirements: Array.isArray(selectedJob?.bayRequirements) ? selectedJob.bayRequirements.filter((value): value is string => typeof value === "string") : [],
  });
  const workTypeCode = selectedJob && (catalogRequirements.workTypeCode ?? selectedJob.workTypeCode);
  const bookingStart = Date.parse(assignment.scheduledStartAt);
  const bookingEnd = Date.parse(assignment.scheduledEndAt);
  const validBookingTime = Number.isFinite(bookingStart) && Number.isFinite(bookingEnd) && bookingEnd > bookingStart;
  const bookingDuration = bookingEnd - bookingStart;
  const coveredBookingStart = validBookingTime && workTypeCode
    ? (model.procedures ?? [])
      .filter(procedure => procedure.workTypeCode === workTypeCode)
      .map(procedure => ({
        start: Math.ceil(Math.max(bookingStart, Date.parse(procedure.effectiveFrom)) / 60_000) * 60_000,
        end: procedure.effectiveTo ? Date.parse(procedure.effectiveTo) : Infinity
      }))
      .filter(window => window.start + bookingDuration <= window.end)
      .sort((a, b) => a.start - b.start)[0]?.start
    : undefined;
  const procedureMissing = Boolean(validBookingTime && workTypeCode && model.procedures && !model.procedures.some(procedure =>
    procedure.workTypeCode === workTypeCode &&
    Date.parse(procedure.effectiveFrom) <= bookingStart &&
    (!procedure.effectiveTo || Date.parse(procedure.effectiveTo) >= bookingEnd)
  ));
  const procedureBlocksBooking = procedureMissing && Boolean(catalogRequirements.systemId);
  const matchingVehicleOrder = initialVehicleId ? repairOrders.find((order) => order.vehicle.id === initialVehicleId) : null;
  const incomingRepairOrderMissing = Boolean(initialRepairOrderId && !repairOrders.some((order) => order.id === initialRepairOrderId));
  const sourceVehicleWithoutRepairOrder = Boolean(initialVehicleId && sourceVehicle && !matchingVehicleOrder);
  const technicians = useMemo(() => {
    const staff = model.resources.filter((resource) => resource.resourceType.kind === "STAFF" && resource.userId).map((resource) => model.users.find((user) => user.id === resource.userId)).filter((user): user is User => Boolean(user));
    const repairTechnicians = staff.filter((user) => user.roles?.some((role) => ["Mechanic", "Technician"].includes(role)));
    return repairTechnicians.length ? repairTechnicians : staff;
  }, [model]);
  const locationResources = model.resources.filter((resource) => !selectedOrder || resource.locationId === selectedOrder.locationId);
  const requiresServiceBay = Boolean(catalogRequirements.systemId && catalogRequirements.bayRequirements.length);
  const serviceBays = locationResources.filter(resource => resource.resourceType.kind === "SERVICE_BAY"
    && (!requiresServiceBay || !missingCatalogResourceCapabilities(catalogRequirements.bayRequirements, [resource]).length));
  const bayResourceId = serviceBays.some(bay => bay.id === assignment.bayResourceId) ? assignment.bayResourceId : "";
  const bayRequired = requiresServiceBay && !bayResourceId;
  const locationStaff = model.users.filter(user => locationResources.some(resource => resource.resourceType.kind === "STAFF" && resource.userId === user.id));
  const preferredTechnicians = locationStaff.filter(user => user.roles?.some(role => ["Mechanic", "Technician"].includes(role)));
  const locationTechnicians = preferredTechnicians.length ? preferredTechnicians : locationStaff;
  const technicianCandidates = model.users.filter(user => user.roles?.some(role => ["Mechanic", "Technician"].includes(role))
    && !locationResources.some(resource => resource.userId === user.id));
  const technicianUserId = locationTechnicians.some(user => user.id === assignment.technicianUserId)
    ? assignment.technicianUserId : locationTechnicians[0]?.id ?? "";
  const canBookJob = Boolean(selectedJob && executableJob(selectedJob));
  const bookingStatus = !canBookJob ? "Planning assignment"
    : !technicianUserId ? "Technician setup needed"
    : !validBookingTime ? "Booking time needed"
    : procedureBlocksBooking ? "Procedure required"
    : bayRequired ? "Service bay required"
    : "Ready to book";
  const openDispatches = model.jobs.flatMap((job) => job.dispatches.filter((dispatch) => ["ACTIVE", "STAGED"].includes(dispatch.status)).map((dispatch) => ({ job, ...dispatch })));

  async function request(url: string, init?: RequestInit) {
    const response = await fetch(url, init);
    const body = await response.json().catch(() => ({}));
    if (!response.ok) throw new Error(body.error ?? "Shop dispatch request failed.");
    return body;
  }

  async function submit(url: string, value: Record<string, unknown>, success: string, afterSave?: () => void, stayOnAssignment = false) {
    setBusy(true);
    setNotice("");
    try {
      await request(url, { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ ...value, idempotencyKey: crypto.randomUUID() }) });
      afterSave?.();
      setNotice(success);
      const next = await request("/api/shop-execution") as Model;
      setModel(reviewOrderId ? { ...next, jobs: next.jobs.filter(job => job.repairOrder.id === reviewOrderId), repairOrders: derivedRepairOrders(next).filter(order => order.id === reviewOrderId) } : next);
      if (reviewOrderId) notifyRepairReviewSaved(reviewOrderId, stayOnAssignment ? "assignment" : undefined);
    } catch (error) {
      setNotice(error instanceof Error ? error.message : "Shop dispatch request failed.");
    } finally {
      setBusy(false);
    }
  }

  function chooseRepairOrder(nextRepairOrderId: string) {
    const nextOrder = repairOrders.find((order) => order.id === nextRepairOrderId);
    const nextJob = model.jobs.find((job) => job.repairOrder.id === nextRepairOrderId && executableJob(job)) ?? model.jobs.find((job) => job.repairOrder.id === nextRepairOrderId);
    const technicianUserId = nextJob?.dispatches.find((item) => ["ACTIVE", "STAGED"].includes(item.status))?.technicianUserId ?? nextOrder?.assignedTechnicianUserId ?? nextOrder?.ownerUser.id ?? "";
    setRepairOrderId(nextRepairOrderId);
    setJobId(nextJob?.id ?? "");
    setAssignment((current) => ({ ...current, technicianUserId }));
  }

  function chooseJob(nextJobId: string) {
    const nextJob = model.jobs.find((job) => job.id === nextJobId);
    const technicianUserId = nextJob?.dispatches.find((item) => ["ACTIVE", "STAGED"].includes(item.status))?.technicianUserId ?? selectedOrder?.assignedTechnicianUserId ?? assignment.technicianUserId;
    setJobId(nextJobId);
    setAssignment((current) => ({ ...current, technicianUserId }));
  }

  return <section className="page-stack shop-dispatch-workspace">
    <header className="page-copy shop-dispatch-header">
      <div><span className="eyebrow">Shop Dispatch</span><h1>Assign work. Keep the shop moving.</h1><p>Select the repair order, technician, queue position, bay, and time in one place.</p></div>
      <div className="form-actions"><Link className="pill pill-secondary" href="/vehicles/shop-planning">Planning &amp; approvals</Link><Link className="pill pill-secondary" href="/vehicles/parts">Parts readiness</Link><Link className="pill pill-secondary" href="/vehicles/quality-control">Quality control</Link></div>
    </header>

    {incomingRepairOrderMissing && !sourceVehicleWithoutRepairOrder ? <div className="notice notice-danger"><p>The repair order you came from was not found in this dispatch list. Select the vehicle below before assigning a technician.</p></div> : null}
    {sourceVehicleWithoutRepairOrder && sourceVehicle ? <div className="notice notice-danger"><p>{vehicleName(sourceVehicle)} is the vehicle you came from, but it does not have an open dispatch repair order/job yet. Start or prepare the repair order first; then Shop Dispatch can assign the technician.</p></div> : null}
    {notice ? <div className={/required|must|conflict|not |already|only/i.test(notice) ? "notice notice-danger" : "notice notice-success"}><p>{notice}</p></div> : null}

    <section className="shop-dispatch-metrics">
      <article><strong>{model.jobs.filter((job) => job.status !== "DISPATCHED" && executableJob(job)).length}</strong><span>Ready</span></article>
      <article><strong>{openDispatches.length}</strong><span>Assigned</span></article>
      <article><strong>{model.jobs.filter((job) => job.status === "IN_PROGRESS").length}</strong><span>Working</span></article>
      <article><strong>{model.jobs.filter((job) => job.status === "PAUSED").length}</strong><span>Blocked</span></article>
    </section>

    <section className="panel-card page-stack shop-dispatch-desk">
      <header><div><span className="eyebrow">One-step assignment</span><h2>Repair job assignment</h2></div><span className={bookingStatus === "Ready to book" ? "shop-dispatch-ready" : "shop-dispatch-waiting"}>{bookingStatus}</span></header>

      <section className="shop-dispatch-picker" aria-label="Choose vehicle for dispatch">
        <header><strong>Choose the vehicle first</strong><span>Pick by vehicle, stock/inventory, concern, and current stage — not by internal RO codes.</span></header>
        <label className="shop-dispatch-search"><span>Search vehicle, RO, concern, stage, location, or technician</span><input aria-label="Search dispatch vehicles" onChange={(event) => setVehicleQuery(event.target.value)} placeholder="Example: Corolla, 137543, check engine, Walter, intake" value={vehicleQuery} /></label>
        <div>
          {sourceVehicleWithoutRepairOrder && sourceVehicle ? <article className="shop-dispatch-source-vehicle">
            <small>Vehicle from your workbench</small>
            <strong>{vehicleName(sourceVehicle)}</strong>
            <span>{sourceVehicle.vehicleNumber} · Stock {sourceVehicle.stockNumber ?? "not recorded"} · VIN {sourceVehicle.vin ?? "not recorded"}</span>
            <p>No dispatchable RO/job exists yet. Create or prepare the repair order before assigning shop labor.</p>
            <Link href={`/vehicles/repair-workbench?vehicleId=${encodeURIComponent(sourceVehicle.id)}&returnTo=${encodeURIComponent("/vehicles/shop-dispatch")}`}>Start repair order</Link>
          </article> : null}
          {visibleRepairOrders.map((order) => <button className={order.id === repairOrderId ? "selected" : ""} key={order.id} onClick={() => chooseRepairOrder(order.id)} type="button">
            <strong>{vehicleName(order.vehicle)}</strong>
            <span>{order.vehicle.vehicleNumber} · {order.inventoryUnit?.inventoryNumber ? `Stock ${order.inventoryUnit.inventoryNumber} · ` : ""}{order.repairOrderNumber} · {stageLabel(order.stage)}</span>
            <small>{shortConcern(order.serviceVisit.concernSummary)}</small>
          </button>)}
          {visibleRepairOrders.length ? null : <p className="shop-dispatch-no-results">No dispatch vehicles match “{vehicleQuery}”. Clear the search or check the originating workbench.</p>}
        </div>
      </section>

      <div className="shop-dispatch-context-grid">
        <label className="form-field"><span>Vehicle / repair order</span><select aria-label="Vehicle and repair order" value={repairOrderId} onChange={(event) => chooseRepairOrder(event.target.value)}><option value="">Select vehicle to assign</option>{repairOrders.map((order) => <option key={order.id} value={order.id}>{vehicleName(order.vehicle)} · {order.inventoryUnit?.inventoryNumber ? `Stock ${order.inventoryUnit.inventoryNumber} · ` : ""}{order.vehicle.vehicleNumber} · {shortConcern(order.serviceVisit.concernSummary, 42)} · {stageLabel(order.stage)}</option>)}</select></label>
        <label className="form-field"><span>Repair job</span><select aria-label="Repair job" disabled={!orderJobs.length} value={jobId} onChange={(event) => chooseJob(event.target.value)}><option value="">{orderJobs.length ? "Select repair job for this vehicle" : "No repair job created yet"}</option>{orderJobs.map((job) => <option key={job.id} value={job.id}>{job.description} · {stageLabel(job.status === "WAITING_PARTS" && waitingJobPartsReady(job) ? "READY_FOR_REPAIR" : job.status)}</option>)}</select></label>
      </div>

      {selectedOrder ? <>
        <section className="shop-dispatch-vehicle-summary"><div><small>Selected vehicle</small><strong>{vehicleName(selectedOrder.vehicle)}</strong><span>{selectedOrder.vehicle.vehicleNumber} · {selectedOrder.inventoryUnit?.inventoryNumber ? `Stock ${selectedOrder.inventoryUnit.inventoryNumber} · ` : ""}{selectedOrder.repairOrderNumber} · {selectedOrder.location.name}</span></div><div><small>Concern</small><strong>{selectedOrder.serviceVisit.concernSummary}</strong>{!reviewOrderId && <span>Next: {selectedOrder.nextAction || "Complete repair planning"}</span>}</div></section>

        <form className="shop-dispatch-preassign" onSubmit={(event: FormEvent) => { event.preventDefault(); if (technicianUserId) submit(`/api/repair-orders/${selectedOrder.id}/technician-assignment`, { technicianUserId, reason: "Preassign the accountable technician from the Shop Dispatch assignment desk." }, "Technician assignment saved."); }}>
          <label className="form-field"><span>Technician</span><select aria-label="Technician" disabled={!locationTechnicians.length} value={technicianUserId} onChange={(event) => setAssignment((current) => ({ ...current, technicianUserId: event.target.value }))}>{!locationTechnicians.length && <option value="">No technician at this site</option>}{locationTechnicians.map((technician) => <option key={technician.id} value={technician.id}>{technician.name}</option>)}</select></label>
          {!reviewOrderId && <button className="button button-secondary" disabled={busy || !technicianUserId}>Save technician</button>}
          {!reviewOrderId && <small>This selection carries forward. Final booking stays protected until an authorized repair job is ready.</small>}
        </form>
        {model.canAddTechnician && technicianCandidates.length > 0 ? <details key={selectedOrder.id}>
          <summary>Add technician at this site</summary>
          <form className="shop-dispatch-preassign" onSubmit={event => {
            event.preventDefault();
            const technicianUserId = String(new FormData(event.currentTarget).get("siteTechnician") ?? "");
            if (busy || !technicianCandidates.some(user => user.id === technicianUserId)) return;
            void submit(`/api/repair-orders/${encodeURIComponent(selectedOrder.id)}/technicians`,
              { technicianUserId, expectedLocationId: selectedOrder.locationId, reason: "Set up a technician for scheduling at this repair order’s site." },
              "Technician added to this site. Review the booking details and select Book work.",
              () => setAssignment(current => ({ ...current, technicianUserId })), true);
          }}>
            <label className="form-field"><span>Technician to add at {selectedOrder.location.name}</span>
              <select name="siteTechnician" defaultValue="" required disabled={busy}>
                <option value="">Choose an existing technician</option>
                {technicianCandidates.map(user => <option key={user.id} value={user.id}>{user.name}</option>)}
              </select>
            </label>
            <button type="submit" className="button button-secondary" disabled={busy}>Add technician</button>
          </form>
        </details> : !locationTechnicians.length && <p role="status">{model.canAddTechnician
          ? "No active mechanic or technician account is available to add."
          : "Ask a manager to add a technician at this scheduling site."}</p>}

        {procedureMissing && selectedJob && executableJob(selectedJob) && <section className="notice notice-info" id="booking-procedure-required" tabIndex={-1} aria-label="Work procedure required">
          <p><strong>{procedureBlocksBooking ? "Work procedure required" : "Optional work procedure"} for {selectedJob.description}</strong></p>
          <p>No active procedure for {workTypeCode} covers the scheduled work. {procedureBlocksBooking ? "Choose a covered time or have a manager publish the reviewed procedure." : "You can book using the approved repair scope."}</p>
          {coveredBookingStart !== undefined && <button type="button" className="button button-secondary" onClick={() => {
            setAssignment(current => ({
              ...current,
              scheduledStartAt: local(new Date(coveredBookingStart)),
              scheduledEndAt: local(new Date(coveredBookingStart + bookingDuration))
            }));
            setNotice("Time updated. Review the new slot, then book work.");
          }}>Use next covered time</button>}
          {model.canPublishProcedure && <details key={workTypeCode}><summary>Publish work procedure</summary>
            <form onSubmit={event => {
              event.preventDefault();
              const fields = new FormData(event.currentTarget);
              const entries = (name: string) => String(fields.get(name) ?? "").split("\n").map(value => value.trim()).filter(Boolean);
              const effectiveFrom = new Date();
              void submit("/api/shop-execution/procedures", {
                workTypeCode, title: fields.get("title"), effectiveFrom: effectiveFrom.toISOString(),
                standardMinutes: selectedJob.laborGuideMinutes ?? 0,
                instructions: entries("instructions"), safetySteps: entries("safetySteps"),
                requiredEvidence: entries("requiredEvidence"), qcRules: entries("qcRules"),
                reason: "Publish the reviewed shop procedure for this repair work type.",
              }, "Procedure published. Review the booking time and book work.", () => {
                setAssignment(current => {
                  const start = Date.parse(current.scheduledStartAt);
                  const end = Date.parse(current.scheduledEndAt);
                  if (start >= effectiveFrom.getTime()) return current;
                  const nextStart = Math.ceil(effectiveFrom.getTime() / 60_000) * 60_000;
                  const duration = end > start ? end - start : 60 * 60_000;
                  return {
                    ...current,
                    scheduledStartAt: local(new Date(nextStart)),
                    scheduledEndAt: local(new Date(nextStart + duration))
                  };
                });
              });
            }}>
              <label>Procedure title <input name="title" required maxLength={200} /></label>
              <label>Work instructions <textarea name="instructions" required /></label>
              <label>Safety steps <textarea name="safetySteps" required /></label>
              <label>Required evidence <textarea name="requiredEvidence" required /></label>
              <label>QC checks <textarea name="qcRules" required /></label>
              <button disabled={busy} type="submit">Publish procedure</button>
            </form>
          </details>}
        </section>}
        {selectedJob && executableJob(selectedJob) ? <form className="shop-dispatch-booking-grid" onSubmit={(event: FormEvent) => { event.preventDefault(); if (procedureBlocksBooking) {
            const procedureNotice = document.getElementById("booking-procedure-required");
            procedureNotice?.focus();
            procedureNotice?.scrollIntoView({ block: "center" });
            setNotice(`Booking requires an active ${workTypeCode} procedure covering the selected time. ${model.canPublishProcedure ? "Publish the reviewed procedure above or choose a covered time." : "Ask a shop manager to publish the reviewed procedure, then reopen this assignment."}`);
            return;
          }
          if (technicianUserId && validBookingTime && !bayRequired) submit(`/api/repair-jobs/${selectedJob.id}/dispatch`, { ...assignment, bayResourceId, scheduledStartAt: new Date(bookingStart).toISOString(), scheduledEndAt: new Date(bookingEnd).toISOString(), technicianUserId, reason: "Assign qualified technician and protected resources to repair work." }, "Repair job dispatched."); }}>
          <label className="form-field"><span>Queue position</span><select value={assignment.position} onChange={(event) => setAssignment((current) => ({ ...current, position: event.target.value }))}><option value="CURRENT">Current</option><option value="NEXT">Next</option></select></label>
          {serviceBays.length > 0 ? <label className="form-field"><span>{requiresServiceBay ? "Service bay" : "Service bay (optional)"}</span><select value={bayResourceId} onChange={(event) => setAssignment((current) => ({ ...current, bayResourceId: event.target.value }))}><option value="">{requiresServiceBay ? "Choose a service bay" : "No dedicated bay"}</option>{serviceBays.map(bay => <option key={bay.id} value={bay.id}>{bay.code} · {bay.name}</option>)}</select></label>
            : <div className="form-field"><span>Service bay</span><span>{requiresServiceBay ? "No suitable service bay at this site" : "No dedicated bay needed"}</span></div>}
          <label className="form-field"><span>Start</span><input type="datetime-local" value={assignment.scheduledStartAt} onChange={(event) => setAssignment((current) => ({ ...current, scheduledStartAt: event.target.value }))} /></label>
          <label className="form-field"><span>End</span><input type="datetime-local" value={assignment.scheduledEndAt} onChange={(event) => setAssignment((current) => ({ ...current, scheduledEndAt: event.target.value }))} /></label>
          <label className="form-field shop-dispatch-override"><span>Conflict note (only if needed)</span><input value={assignment.overrideReason} onChange={(event) => setAssignment((current) => ({ ...current, overrideReason: event.target.value }))} /></label>
          {!technicianUserId && <p id="booking-technician-required" role="status">Booking requires an active technician at <strong>{selectedOrder.location.name}</strong>, the repair order’s scheduling site.</p>}
          {!validBookingTime && <p id="booking-time-required" role="status">Enter a start time and an end time after it.</p>}
          {bayRequired && <p id="booking-bay-required" role="status">{serviceBays.length ? "Choose a service bay that meets this job’s requirements." : "Ask a manager to set up a suitable service bay at this site before booking this job."}</p>}
          <button className="button button-primary" disabled={busy || !technicianUserId || !validBookingTime || bayRequired} aria-describedby={[
            !technicianUserId && "booking-technician-required",
            !validBookingTime && "booking-time-required",
            procedureBlocksBooking && "booking-procedure-required",
            bayRequired && "booking-bay-required",
          ].filter(Boolean).join(" ") || undefined}>Book work</button>
        </form> : <section className="shop-dispatch-gate"><div><strong>{orderJobs.length ? "Repair job is not ready to book" : "Repair job has not been created"}</strong><span>Your technician choice can be saved now. Finish the repair plan, authorization, and parts readiness; then booking unlocks here.</span></div><Link className="button button-primary" href={`/vehicles/repair-workbench?repairOrderId=${selectedOrder.id}`}>Prepare repair job</Link></section>}
      </> : <div className="shop-dispatch-empty"><strong>Select a vehicle or repair order</strong><span>The technician assignment appears immediately—even before the repair job is ready.</span></div>}
    </section>

    <section className="panel-card page-stack shop-dispatch-queues"><h2>Technician current / next</h2><div>{technicians.map((technician) => { const queue = openDispatches.filter((item) => item.technicianUserId === technician.id); return <article key={technician.id}><h3>{technician.name}</h3>{queue.length ? queue.sort((a, b) => a.position.localeCompare(b.position)).map((item) => <p key={item.id}><strong>{item.position}</strong> · {item.job.jobNumber} · {item.job.description}</p>) : <p>Available · no work staged</p>}</article>; })}</div></section>
  </section>;
}
