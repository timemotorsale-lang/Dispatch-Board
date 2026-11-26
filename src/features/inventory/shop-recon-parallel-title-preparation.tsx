"use client";

import { useMemo, useState } from "react";
import { AlertTriangle, Check, CheckCircle2, FileCheck2, GitBranch, LockKeyhole, Save } from "lucide-react";
import { TITLE_PREPARATION_CHECKS } from "@/server/shop-recon/parallel-title-preparation-domain";
import {DocumentReadingPanel} from "@/features/document-library/document-reading-panel";

type Operation = {
  id: string;
  status: "IN_PROGRESS" | "BLOCKED" | "READY_FOR_INVENTORY_REVIEW" | "REVALIDATION_REQUIRED" | "CANCELLED";
  ownerUserId: string;
  ownerName: string;
  checklist: unknown;
  evidenceReferences: unknown;
  blockerNote: string | null;
  handoffNote: string | null;
  version: number;
  startedAt: string;
  updatedAt: string;
  binding: { valid: boolean; reasons: string[]; policyVersion: string };
};
export type TitlePreparationWorkspace = { eligible: boolean; canEdit: boolean; lifecycleInitialized: boolean; operation: Operation | null; policyVersion: string } | null;

function checklist(value: unknown) {
  const source = value && typeof value === "object" && !Array.isArray(value) ? value as Record<string, unknown> : {};
  return Object.fromEntries(TITLE_PREPARATION_CHECKS.map(item => [item.code, source[item.code] === true])) as Record<string, boolean>;
}
function evidence(value: unknown) { return Array.isArray(value) ? value.map(String) : []; }
function label(value: string) { return value.replaceAll("_", " ").toLowerCase().replace(/\b\w/g, letter => letter.toUpperCase()); }

export function ShopReconParallelTitlePreparation({ currentStageLabel, initial, repairOrderId }: { currentStageLabel: string; initial: TitlePreparationWorkspace; repairOrderId: string }) {
  const [workspace, setWorkspace] = useState(initial);
  const operation = workspace?.operation ?? null;
  const [checks, setChecks] = useState(() => checklist(operation?.checklist));
  const [evidenceText, setEvidenceText] = useState(() => evidence(operation?.evidenceReferences).join("\n"));
  const [handoffNote, setHandoffNote] = useState(operation?.handoffNote ?? "");
  const [blockerNote, setBlockerNote] = useState(operation?.blockerNote ?? "");
  const [busy, setBusy] = useState(false), [feedback, setFeedback] = useState<string | null>(null);
  const complete = useMemo(() => TITLE_PREPARATION_CHECKS.filter(item => checks[item.code]).length, [checks]);
  const locked = !workspace?.canEdit || operation?.status === "READY_FOR_INVENTORY_REVIEW" || operation?.status === "CANCELLED" || operation?.status === "REVALIDATION_REQUIRED";

  async function request(method: "POST" | "PATCH", body: Record<string, unknown>) {
    setBusy(true); setFeedback(null);
    try {
      const response = await fetch(`/api/shop-recon/${encodeURIComponent(repairOrderId)}/parallel-title-preparation`, { method, headers: { "content-type": "application/json" }, body: JSON.stringify({ ...body, idempotencyKey: crypto.randomUUID() }) });
      const result = await response.json();
      if (!response.ok) throw new Error(result.error ?? "Parallel preparation could not be updated.");
      const next = result.workspace ?? workspace;
      setWorkspace(next);
      if (next?.operation) {
        setChecks(checklist(next.operation.checklist)); setEvidenceText(evidence(next.operation.evidenceReferences).join("\n"));
        setHandoffNote(next.operation.handoffNote ?? ""); setBlockerNote(next.operation.blockerNote ?? "");
      }
      setFeedback(result.revalidationRequired ? "Source facts changed. Preparation is frozen for inventory review and revalidation." : method === "POST" ? "Parallel preparation started. The recon stage did not move." : body.action === "SUBMIT_FOR_REVIEW" ? "Preparation sent to Inventory for review. This did not declare title readiness." : "Parallel preparation saved. The recon stage did not move.");
    } catch (error) { setFeedback(error instanceof Error ? error.message : "Parallel preparation could not be updated."); }
    finally { setBusy(false); }
  }
  function update(action: "SAVE" | "BLOCK" | "RESUME" | "SUBMIT_FOR_REVIEW") {
    if (!operation) return;
    return request("PATCH", { action, blockerNote, checklist: checks, evidenceReferences: evidenceText.split("\n").map(item => item.trim()).filter(Boolean), expectedVersion: operation.version, handoffNote, reason: action === "SUBMIT_FOR_REVIEW" ? "Submit the bounded title and document preparation packet for Inventory review." : `${label(action)} the bounded title and document preparation packet.` });
  }

  if (!workspace?.eligible) return null;
  return <section className={`srv-parallel-operation ${operation?.status.toLowerCase().replaceAll("_", "-") ?? "available"}`} aria-label="Safe parallel title and document preparation">
    <header>
      <span><GitBranch /></span>
      <div><h2>Title follow-up</h2><p>Prepare documents for Inventory review without moving {currentStageLabel}.</p></div>
      <b>{operation ? label(operation.status) : "Available"}</b>
    </header>
    {!workspace.canEdit && <p className="srv-parallel-feedback">Read only. The preparation owner or a manager with repair access must make changes.</p>}
    {!operation ? workspace.canEdit && <div className="srv-parallel-start"><button disabled={busy || !workspace.lifecycleInitialized} onClick={() => request("POST", { reason: "Start bounded title and document preparation beside active Inventory Recon work." })} type="button"><GitBranch />{busy ? "Starting…" : "Start parallel preparation"}</button>{!workspace.lifecycleInitialized ? <small>Save the current recon task once before starting title follow-up.</small> : null}</div> : <>
      <p className="srv-parallel-feedback">Owner: {operation.ownerName} · {complete}/{TITLE_PREPARATION_CHECKS.length} checks</p>
      {!locked && <details><summary>Read a title document</summary><DocumentReadingPanel purpose="TITLE" disabled={busy} onApply={(reading,fields)=>{const note=`Reviewed ${reading.fileName}: ${Object.entries(fields).filter(([,value])=>value).map(([key,value])=>`${key}: ${value}`).join("; ")}`;setHandoffNote(current=>[current,note].filter(Boolean).join("\n"));setFeedback("Reviewed title details added to the handoff draft. Verify evidence and checklist items, then save separately.");}}/></details>}
      {!operation.binding.valid || operation.status === "REVALIDATION_REQUIRED" ? <p className="srv-parallel-warning"><AlertTriangle /><span><strong>Revalidation required</strong>Source identity, inventory unit, or recon scope changed. Inventory must revalidate this packet before it can continue.</span></p> : null}
      <div className="srv-parallel-body">
        <section><h3>Preparation checks</h3>{TITLE_PREPARATION_CHECKS.map(item => <label className={checks[item.code] ? "checked" : ""} key={item.code}><input checked={checks[item.code]} disabled={busy || locked} onChange={event => setChecks(current => ({ ...current, [item.code]: event.target.checked }))} type="checkbox" /><i>{checks[item.code] ? <Check /> : null}</i><span>{item.label}</span></label>)}</section>
        <section><label><span>Document or source references</span><textarea disabled={busy || locked} onChange={event => setEvidenceText(event.target.value)} placeholder="One secure document, source system, or reference per line" value={evidenceText} /></label><label><span>Inventory review handoff</span><textarea disabled={busy || locked} onChange={event => setHandoffNote(event.target.value)} placeholder="What Inventory must verify, decide, or obtain next" value={handoffNote} /></label><label><span>Blocker, if any</span><textarea disabled={busy || locked} onChange={event => setBlockerNote(event.target.value)} placeholder="Missing document, payoff dependency, owner, and next check" value={blockerNote} /></label></section>
      </div>
      <footer><div><LockKeyhole /><span><strong>Preparation ≠ readiness</strong>Only Inventory can accept this handoff and declare the title/document gate ready.</span></div>{!locked ? <nav><button disabled={busy} onClick={() => update("SAVE")} type="button"><Save />Save</button>{operation.status === "BLOCKED" ? <button disabled={busy} onClick={() => update("RESUME")} type="button">Resume</button> : <button disabled={busy || blockerNote.trim().length < 3} onClick={() => update("BLOCK")} type="button"><AlertTriangle />Block</button>}<button disabled={busy || complete !== TITLE_PREPARATION_CHECKS.length || !evidenceText.trim() || !handoffNote.trim()} onClick={() => update("SUBMIT_FOR_REVIEW")} type="button"><FileCheck2 />Submit for Inventory review</button></nav> : <span className="srv-parallel-locked"><CheckCircle2 />{operation.status === "READY_FOR_INVENTORY_REVIEW" ? "Awaiting Inventory decision" : "Edits locked"}</span>}</footer>
    </>}
    {feedback ? <p className="srv-parallel-feedback">{feedback}</p> : null}
  </section>;
}
