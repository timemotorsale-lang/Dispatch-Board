"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { FormEvent, useRef, useState } from "react";
import { ArrowRight } from "lucide-react";
import type { VehicleJourneyModel } from "@/server/inventory-unit/journey-service";
import styles from "./vehicle-workflow-choice.module.css";

export function AsIsSaleWorkspace({ journey, canStart, ownerUserId, existingCaseId }: { journey: VehicleJourneyModel; canStart: boolean; ownerUserId: string; existingCaseId?: string }) {
  const router = useRouter();
  const [reason, setReason] = useState("");
  const [defects, setDefects] = useState(journey.intake?.handoff?.condition ?? "");
  const [busy, setBusy] = useState(false), [error, setError] = useState("");
  const key = useRef<string | null>(null);
  const title = [journey.vehicle.year, journey.vehicle.make, journey.vehicle.model].filter(Boolean).join(" ") || journey.vehicle.vehicleNumber;
  async function submit(event: FormEvent) {
    event.preventDefault();
    if (!journey.unit || !canStart || busy) return;
    setBusy(true); setError("");
    key.current ??= crypto.randomUUID();
    try {
      const response = await fetch("/api/disposition-wholesale", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ action: "CREATE_DISPOSITION_CANDIDATE", idempotencyKey: key.current, occurredAt: new Date().toISOString(), inventoryUnitId: journey.unit.id, ownerUserId, targetAt: new Date(Date.now() + 3 * 86400000).toISOString(), reasonCodes: ["AS_IS_SALE_REVIEW", "RECON_DECLINED"], saleCondition: "AS_IS", reconDecisionReason: reason, knownDefects: defects, reason }) });
      const body = await response.json();
      if (!response.ok) throw new Error(body.error ?? "Unable to start as-is sale review.");
      if (!body.result?.id) throw new Error("The sale review did not return a case reference.");
      router.push(`/vehicles/disposition-wholesale?caseId=${encodeURIComponent(body.result.id)}`);
    } catch (failure) { setError(failure instanceof Error ? failure.message : "Unable to start sale review."); } finally { setBusy(false); }
  }
  return <section className={styles.workspace}><header><Link href={`/vehicles/${encodeURIComponent(journey.vehicle.id)}/workbench`}>Vehicle Workbench</Link><h1>Start As-Is Sale</h1></header><div className={styles.handoff}><h2>{title}</h2><dl><div><dt>VIN</dt><dd>{journey.vehicle.vin ?? "Not recorded"}</dd></div><div><dt>Inventory</dt><dd>{journey.unit?.inventoryNumber}</dd></div><div><dt>Recorded incurred costs</dt><dd>{journey.costs ? new Intl.NumberFormat("en-US", { style: "currency", currency: "USD" }).format(journey.costs.incurredCents / 100) : "Restricted"}</dd></div></dl></div>
    {journey.blocked ? <p className={styles.hold}>Existing hold remains active: {journey.unit?.stateReason ?? "Review required"}</p> : null}
    {error ? <p role="alert">{error}</p> : null}
    {existingCaseId ? <Link href={`/vehicles/disposition-wholesale?caseId=${encodeURIComponent(existingCaseId)}`}>Continue existing disposition review<ArrowRight size={16}/></Link> : <form className={styles.saleForm} onSubmit={submit}><label>Why recon is being declined<textarea required minLength={10} maxLength={2000} rows={3} value={reason} onChange={event => setReason(event.target.value)} disabled={!canStart || busy}/></label><label>Known defects and condition disclosure<textarea required minLength={10} maxLength={4000} rows={5} value={defects} onChange={event => setDefects(event.target.value)} disabled={!canStart || busy}/></label><button type="submit" disabled={!canStart || busy}>{busy ? "Starting review..." : "Start as-is disposition review"}<ArrowRight size={16}/></button>{!canStart ? <p>Inventory release permission is required to start this review.</p> : null}</form>}
  </section>;
}
