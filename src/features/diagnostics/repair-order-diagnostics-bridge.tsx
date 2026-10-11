"use client";

import { AlertTriangle, ArrowRight, Check, Stethoscope } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";

import type { getRepairOrderDiagnosticsBridge } from "@/server/diagnostics/service";
import styles from "./diagnostics.module.css";

type Bridge = Awaited<ReturnType<typeof getRepairOrderDiagnosticsBridge>>;
const label = (value: string) => value.replaceAll("_", " ").toLocaleLowerCase().replace(/^./, (letter) => letter.toUpperCase());

export function RepairOrderDiagnosticsBridge({ bridge }: { bridge: Bridge | { state: "UNAVAILABLE"; reason: string; repairOrderId: string } }) {
  const router = useRouter();
  const [riskTier, setRiskTier] = useState("R1");
  const [busy, setBusy] = useState(false);
  const [notice, setNotice] = useState("");

  async function createCase() {
    setBusy(true); setNotice("");
    try {
      const response = await fetch("/api/diagnostics/cases", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ concernKey: "PRIMARY", idempotencyKey: crypto.randomUUID(), operatingConditions: {}, reason: "Created from the authoritative Repair Order concern.", reasonCode: "CASE_REPAIR_ORDER_INTAKE", repairOrderId: bridge.repairOrderId, riskTier }) });
      const body = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(body.error ?? "Diagnostic case could not be created.");
      const caseId = body.result?.id;
      if (caseId) router.push(`/diagnostics/cases/${encodeURIComponent(caseId)}`);
      else { setNotice("Diagnostic case recorded. Refresh to open the authoritative record."); window.location.reload(); }
    } catch (error) { setNotice(error instanceof Error ? error.message : "Diagnostic case could not be created."); }
    finally { setBusy(false); }
  }

  if (bridge.state === "UNAVAILABLE") return <section className={`${styles.roBridge} ro-diagnostics-bridge-readable`}><header><Stethoscope /><div><h2>Technician Diagnosis</h2><p>Diagnostic work recorded against this Repair Order</p></div></header><div className={styles.bridgeMessage}><AlertTriangle /><span><strong>Diagnostics unavailable</strong>{bridge.reason}</span></div></section>;
  if (bridge.state === "RESTRICTED") return <section className={`${styles.roBridge} ro-diagnostics-bridge-readable`}><header><Stethoscope /><div><h2>Technician Diagnosis</h2><p>Diagnostic work recorded against this Repair Order</p></div></header><div className={styles.bridgeMessage}><AlertTriangle /><span><strong>Restricted</strong>You do not have access to diagnostic records for this Repair Order.</span></div></section>;

  return <section className={`${styles.roBridge} ro-diagnostics-bridge-readable`} id="enterprise-diagnostics">
    <header><Stethoscope /><div><h2>Technician Diagnosis</h2><p>The RO remains the source of truth · tests and findings are recorded here</p></div><Link href="/diagnostics">Diagnosis queue <ArrowRight /></Link></header>
    {notice ? <div className={styles.bridgeNotice} role="status">{notice}</div> : null}
    {bridge.cases.length ? <div className={styles.bridgeCases}>{bridge.cases.map((item) => <Link href={`/diagnostics/cases/${encodeURIComponent(item.id)}#master-technician-evidence`} key={item.id}><span className={`${styles.risk} ${styles[item.riskTier.toLocaleLowerCase()]}`}>{item.riskTier}</span><span><strong>{item.concern}</strong><small>{label(item.status)} · {item.assignedUser?.name ?? "Unassigned"} · Diagnostic record v{item.version} · Open Diagnostic Assist Inspection</small></span><ArrowRight /></Link>)}</div> : <div className={styles.bridgeCreate}><div><strong>RO ready for Diagnostic Assist Inspection</strong><p>Open technician diagnosis to start the concern-seeded inspection checklist, then record tests, evidence, and findings against this exact Repair Order.</p></div><label><span>Initial risk</span><select onChange={(event) => setRiskTier(event.target.value)} value={riskTier}>{["R1", "R2", "R3", "R4"].map((risk) => <option key={risk}>{risk}</option>)}</select></label><button disabled={busy || !bridge.canCreate} onClick={() => void createCase()} type="button">{busy ? "Opening…" : "Start assist inspection"}</button></div>}
    {!bridge.rollout.executable ? <footer><AlertTriangle />Creation is held by rollout control ({label(bridge.rollout.reason)}). Existing records remain available for review.</footer> : <footer><Check />One RO governs the work; the diagnostic record captures the technician&apos;s evidence and reasoning.</footer>}
  </section>;
}
