"use client";

import Link from "next/link";
import { dealGroup } from "@/lib/deal-dashboard";
import { dealDocumentHref, type DealWorkIndicators } from "@/lib/deal-dashboard-enterprise";
import { SAVED_DEAL_STATUSES, type SavedDealStatus } from "@/lib/saved-deal-status";
import { DealRowPopover } from "./deal-row-popover";
import type { DealLifecycleAction } from "./deal-lifecycle-dialog";
import styles from "./deal-draft-workspace.module.css";

export type DealLibraryRow = { id: string; draftId?: string | null; draftRevision?: number | null; jacketId?: string | null; dealNumber?: string | null; packetState?: string | null; customerId?: string | null; customerName: string; vehicleReference: string; pathway: string; status: SavedDealStatus; updatedAt: string; ownerName?: string; nextAction?: string; dueAt?: string | null; taskHref?: string | null; stage?: string; documentsReady?: number; documentsTotal?: number; documentChecklist?: Array<{ id: string; label: string; phase: string; status: string }>; indicators?: DealWorkIndicators };
export function dealRowStatus(deal: DealLibraryRow) { return deal.stage === "Completed" && deal.status === "SOLD" ? "Sold · finalized" : deal.status === "SOLD" && !deal.stage ? "Sold · paperwork pending" : deal.stage || SAVED_DEAL_STATUSES[deal.status] || deal.status; }
export function DealRowStatus({ deal, onDetails }: { deal: DealLibraryRow; onDetails: () => void }) {
  const nextDocument = deal.documentChecklist?.find(item => item.label === deal.nextAction);
  const nextHref = deal.taskHref || (deal.jacketId && nextDocument ? dealDocumentHref(deal.jacketId, nextDocument.id) : null);
  const alerts = deal.indicators?.alerts || [];
  const milestone = (value: DealWorkIndicators["funding"]) => value?.state === "VERIFIED" ? "Verified" : value?.state === "NOT_REQUIRED" ? "Not required · reason recorded" : "Pending / not verified";
  return <div className={styles.rowStatus}>
    <DealRowPopover label={`Status details for ${deal.customerName}`} trigger={dealRowStatus(deal)} triggerClassName={`${styles.badge} ${styles.rowStatusTrigger}`} status={deal.status} finalized={deal.status === "SOLD" && deal.stage === "Completed"}>
      <p><strong>{dealRowStatus(deal)}</strong></p>
      <small>Last saved: {new Date(deal.updatedAt).toLocaleString("en-US", { timeZone: "America/Chicago" })} Central</small>
      <dl className={styles.rowProgress}><dt>Paperwork</dt><dd>{deal.packetState === "CLOSED" ? "Finalized" : deal.documentsTotal ? `${deal.documentsReady ?? 0}/${deal.documentsTotal} reviewed` : "Checklist not prepared"}</dd><dt>Funding</dt><dd>{milestone(deal.indicators?.funding || null)}</dd><dt>Delivery</dt><dd>{milestone(deal.indicators?.delivery || null)}</dd></dl>
      {deal.documentChecklist?.length ? <><h3>Document steps</h3><ul className={styles.documentChecklist}>{deal.documentChecklist.map(item => <li key={`${item.phase}:${item.id}`}><strong>{item.phase === "RETURN" ? "Return" : item.phase === "CHECKOUT" ? "Checkout" : "Closing"} · {item.label}</strong><span>{item.status}</span>{deal.jacketId && <Link href={dealDocumentHref(deal.jacketId, item.id)}>Open this document step</Link>}</li>)}</ul></> : null}
      {alerts.length > 0 && <ul className={styles.dealFlags}>{alerts.map(alert => <li key={alert}>{alert}</li>)}</ul>}
      <button type="button" onClick={onDetails}>View full deal details</button>
    </DealRowPopover>
    {deal.nextAction && <small className={styles.rowNextAction}>{nextHref ? <Link href={nextHref}>{deal.nextAction}</Link> : deal.nextAction}</small>}
    {alerts.length > 0 && <small className={styles.dealAlert} title={alerts.join(" · ")}>{alerts[0]}{alerts.length > 1 ? ` · +${alerts.length - 1}` : ""}</small>}
  </div>;
}

export function DealRowActions({ deal, canManage, disabled, archiveBusy, onOpen, onDetails, onLifecycle, onArchive }: { deal: DealLibraryRow; canManage: boolean; disabled: boolean; archiveBusy: boolean; onOpen: () => void; onDetails: (tab: string) => void; onLifecycle: (action: DealLifecycleAction) => void; onArchive: () => void }) {
  const inactive = ["ARCHIVED", "CANCELLED", "LOST"].includes(deal.status);
  const preserved = ["CLOSED", "DELIVERED_FUNDING_PENDING", "UNWIND_PENDING"].includes(deal.packetState || "");
  const canContinue = !inactive && !preserved && deal.status !== "COMPLETED" && deal.stage !== "Completed" && Boolean(deal.draftId || !deal.jacketId) && deal.indicators?.canEdit !== false;
  const canClose = !inactive && Boolean(deal.draftId) && (deal.indicators?.canEdit !== false || canManage) && ["SALES", "LEASING"].includes(dealGroup(deal.pathway)) && deal.packetState !== "UNWIND_PENDING";
  const paperwork = canClose && deal.status === "SOLD" && deal.stage !== "Completed";
  const primary = paperwork ? "paperwork" : canContinue && deal.stage !== "Completed" ? "continue" : deal.jacketId ? "packet" : "details";
  const canReopen = canManage && Boolean(deal.draftId && deal.jacketId) && ["SALES", "LEASING"].includes(dealGroup(deal.pathway)) && ["CLOSED", "DELIVERED_FUNDING_PENDING"].includes(deal.packetState || "") && !inactive;
  const canArchive = !preserved && Boolean(deal.draftId) && deal.indicators?.canEdit !== false && Number.isInteger(deal.draftRevision) && ["IN_PROGRESS", "PENDING"].includes(deal.status);
  const loanerHref = `/crm-next/deals/start?${new URLSearchParams({ new: "1", pathway: "vehicle-loaner", ...(deal.draftId ? { sourceDraftId: deal.draftId } : { sourceJacketId: deal.jacketId || deal.id }) })}`;
  const menuItem = { role: "menuitem", tabIndex: -1 } as const;
  return <div className={styles.rowActionBar}>
    {primary === "paperwork" ? <button type="button" data-completion="pending" disabled={disabled} onClick={() => onLifecycle("FINISH")}>Complete paperwork</button> : primary === "continue" ? <button type="button" aria-label={`Open deal for ${deal.customerName}`} disabled={disabled} onClick={onOpen}>Continue</button> : primary === "packet" ? <Link aria-label={`Open packet for ${deal.customerName}`} href={dealDocumentHref(deal.jacketId!)}>Open packet</Link> : <button type="button" onClick={() => onDetails("Documents")}>View details</button>}
    <DealRowPopover label={`Actions for ${deal.customerName}`} trigger="Actions" menu width={248} triggerClassName={styles.rowActionsTrigger}>
      <div role="group" aria-label="Open and follow up">
        {primary !== "continue" && canContinue && <button {...menuItem} type="button" disabled={disabled} onClick={onOpen}>Continue deal</button>}
        {primary !== "packet" && deal.jacketId && <Link {...menuItem} href={dealDocumentHref(deal.jacketId)}>Open packet</Link>}
        <button {...menuItem} type="button" aria-label={`Deal details for ${deal.customerName}`} onClick={() => onDetails("Documents")}>Details & actions</button>
        {!inactive && <button {...menuItem} type="button" disabled={disabled} onClick={() => onDetails("Follow-ups")}>Set deal reminder</button>}
        {!inactive && !["vehicle-loaner", "daily-rental", "test-drive"].includes(deal.pathway) && <Link {...menuItem} href={loanerHref}>Issue loaner</Link>}
      </div>
      {canClose && !["SOLD", "COMPLETED"].includes(deal.status) && deal.stage !== "Completed" && <><div role="separator" /><button {...menuItem} type="button" disabled={disabled} onClick={() => onLifecycle("MARK_SOLD")}>Mark sold</button></>}
      {(canReopen || canArchive) && <><div role="separator" /><div role="group" aria-label="Manager and archive actions">
        {canReopen && <><button {...menuItem} type="button" disabled={disabled} onClick={() => onLifecycle("REOPEN")}>Reopen for corrections</button><button {...menuItem} type="button" disabled={disabled} className={styles.rowCautionAction} onClick={() => onLifecycle("REQUEST_UNWIND")}>Request unwind review</button></>}
        {canArchive && <button {...menuItem} type="button" disabled={disabled || archiveBusy} className={styles.rowCautionAction} onClick={onArchive}>Archive duplicate</button>}
      </div></>}
    </DealRowPopover>
  </div>;
}
