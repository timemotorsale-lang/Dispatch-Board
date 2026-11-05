"use client";
import Link from "next/link";
import { useEffect, useState, type ReactNode } from "react";
import { DEAL_WORKSPACE_SECTIONS, dealNextAction, type DealWorkspaceSection } from "@/lib/deal-workspace-navigation";
import { SAVED_DEAL_STATUSES } from "@/lib/saved-deal-status";
import styles from "./deal-workspace-overview.module.css";

export function DealWorkspaceOverview({ savedSummary, customer, vehicle, pathway, pathwayLabel, owner, status, finalized, saved, saveStatus, section, onNavigate, pathwayOptions = [], selectedPreset, onPathway }: {
 savedSummary?: ReactNode;
 pathwayOptions?: Array<{id:string;label:string}>; selectedPreset?: string; onPathway?: (id:string)=>void;
 customer: string; vehicle: string; pathway: string; pathwayLabel: string; owner: string; status: keyof typeof SAVED_DEAL_STATUSES; finalized: boolean; saved: boolean; saveStatus: string; section: DealWorkspaceSection; onNavigate: (section: DealWorkspaceSection) => void;
}) {
 const next = dealNextAction({ customer: Boolean(customer), vehicle: Boolean(vehicle), pathway, status, finalized });
 const statusLabel = status === "SOLD" ? finalized ? "Sold · finalized" : "Sold · paperwork pending" : pathway === "daily-rental" ? "Daily Rental · checkout & return" : SAVED_DEAL_STATUSES[status];
 return <div className={styles.workspace}>
  <header className={styles.heading}><div><h1>{pathway === "daily-rental" ? "Daily Rental" : savedSummary ? "Deal summary" : "Deal overview"}</h1><p>{pathway === "daily-rental" ? "Prepare checkout, activate the rental, monitor due-back and record return." : saved ? "Continue this saved deal" : "Prepare the deal; it is saved when you select a customer or save your work."}</p></div><div className={styles.links}><Link href="/crm-next/deals">Deals Home</Link><span className={styles.status} data-state={status === "SOLD" ? finalized ? "complete" : "pending" : undefined}>{statusLabel}</span></div></header>
  {(!savedSummary || section !== "overview") && <div className={styles.identity} aria-label="Deal identity summary"><div><small>Customer</small><strong>{customer || "Choose customer"}</strong></div><div><small>Vehicle</small><strong>{vehicle || "Choose vehicle"}</strong></div><div><small>Pathway</small><strong>{pathwayLabel}</strong></div><div><small>Assigned staff</small><strong>{owner}</strong><small>{saveStatus}</small></div></div>}
  {pathwayOptions.length > 0 && <details open={!saved} className={styles.advanced} aria-label="Revenue pathway chooser"><summary>Choose or change revenue pathway</summary><div className={styles.actions}>{pathwayOptions.map(option=><button key={option.id} type="button" aria-pressed={selectedPreset === option.id} onClick={event=>{onPathway?.(option.id);const chooser=event.currentTarget.closest("details");if(chooser)chooser.open=false;}}>{option.label}</button>)}</div></details>}
  <nav className={styles.nav} role="tablist" aria-label="Deal workspace sections" onKeyDown={event => {
   if (!["ArrowLeft", "ArrowRight", "Home", "End"].includes(event.key)) return;
   event.preventDefault(); const index = DEAL_WORKSPACE_SECTIONS.findIndex(([key]) => key === section);
   const nextIndex = event.key === "Home" ? 0 : event.key === "End" ? DEAL_WORKSPACE_SECTIONS.length - 1 : (index + (event.key === "ArrowRight" ? 1 : -1) + DEAL_WORKSPACE_SECTIONS.length) % DEAL_WORKSPACE_SECTIONS.length;
   onNavigate(DEAL_WORKSPACE_SECTIONS[nextIndex][0]);event.currentTarget.querySelectorAll<HTMLButtonElement>('button')[nextIndex]?.focus();
  }}>{DEAL_WORKSPACE_SECTIONS.map(([key,label]) => <button key={key} id={`deal-workspace-tab-${key}`} aria-controls="deal-workspace-panel" role="tab" aria-selected={section === key} tabIndex={section === key ? 0 : -1} onClick={() => onNavigate(key)} type="button">{pathway === "daily-rental" && key === "completion" ? "Checkout & Return" : label}</button>)}</nav>
  {section === "overview" && <div id="deal-workspace-panel" role="tabpanel" aria-labelledby="deal-workspace-tab-overview">{savedSummary || <><section className={styles.next} aria-label="Next deal action"><div><small>Next action</small><h2>{next.title}</h2><p>{next.detail}</p></div><button className={styles.primary} onClick={() => onNavigate(next.section)} type="button">{next.action}</button></section><div className={styles.cards} style={{marginTop:12}}>{[
   ["identity","Customer & Vehicle", customer && vehicle ? "Shared identities linked. Review or change the selection." : "Choose the customer and canonical vehicle."],
   ["terms","Terms & Payments","Review pricing, signing amounts and the pathway's calculator."],
   ["documents","Documents","Select forms, generate and preview the packet, or review signed uploads."],
   ["completion","Completion",status === "SOLD" ? "Finish remaining paperwork, funding and delivery checks." : "Record the sale or manage the vehicle-use assignment."],
   ["activity","Activity & Follow-up","Review this deal's history, owner, milestones and follow-up."],
  ].map(([key,label,detail]) => <section key={key} className={styles.card}><h2>{label}</h2><p>{detail}</p><div className={styles.actions}><button onClick={() => onNavigate(key as DealWorkspaceSection)} type="button">Open {label}</button></div></section>)}</div></>}</div>}
 </div>;
}
export function DealActivityPanel({ draftId, saved }: { draftId: string; saved: boolean }) {
 const [data,setData] = useState<{ history: Array<{ id: string; action: string; actorName: string; at: string; note?: string }> } | null>(null), [error,setError] = useState("");
 useEffect(() => {
  if (!saved) return;
  const controller=new AbortController();
  void fetch(`/api/crm/v1/deal-drafts?${new URLSearchParams({view:"operations",draftId})}`,{signal:controller.signal,cache:"no-store"}).then(async response=>{const body=await response.json();if(!response.ok)throw new Error(body.error||"Deal history could not be loaded.");if(!controller.signal.aborted)setData(body);}).catch(error=>{if(!controller.signal.aborted)setError(error.message);});
  return ()=>controller.abort();
 },[draftId,saved]);
 return <section className={styles.panel} aria-label="Deal activity"><h2>Activity and follow-up</h2>{!saved ? <p>Save this deal to start its recorded history.</p> : error ? <p role="alert">{error}</p> : !data ? <p role="status">Loading deal history…</p> : data.history.length ? <ol className={styles.activity}>{data.history.map(event=><li key={event.id}><strong>{event.action.replaceAll("_"," ")}</strong><small>{event.actorName} · {new Date(event.at).toLocaleString("en-US",{timeZone:"America/Chicago"})} Central</small>{event.note && <span>{event.note}</span>}</li>)}</ol> : <p>No recorded changes yet.</p>}<div className={styles.links}><Link href="/crm-next/deals">Open Deals Home for reminders, assignment and verified money actions</Link></div></section>;
}
