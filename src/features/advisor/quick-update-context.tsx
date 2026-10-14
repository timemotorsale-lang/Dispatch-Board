"use client";

import Link from "next/link";
import { useCallback, useEffect, useRef, useState } from "react";
import { CheckCircle2, History, Link2, Search } from "lucide-react";
import styles from "./quick-update-context.module.css";

type ContextPayload = {
  candidates: Array<{ id: string; customerNumber: string; displayName: string; phoneNumber: string | null; email: string | null; confirmed: boolean; counts: { notes: number; repairOrders: number; tasks: number; workdayQuickUpdates: number } }>;
  history: Array<{ id: string; boardDate: string; category: string; company: string; convertedTaskId: string | null; dueWindow: string; followUpNeeded: boolean; ownerName: string; person: string; text: string }>;
  summary: string;
  trend: { dayCount: number; openFollowUps: number; topCategories: Array<{ category: string; count: number }>; totalUpdates: number };
};

function categoryLabel(value: string) {
  return value.replaceAll("_", " ").toLocaleLowerCase().replace(/^./, (letter) => letter.toLocaleUpperCase());
}

export function QuickUpdateContext({ company = "", disabled = false, onCustomerSelected, onLinked, person = "", phoneNumber = "", relatedCustomerId = null, text = "", updateId }: {
  company: string;
  disabled?: boolean;
  onCustomerSelected?: (customerId: string | null) => void;
  onLinked?: () => Promise<void> | void;
  person: string;
  phoneNumber: string;
  relatedCustomerId?: string | null;
  text: string;
  updateId?: string;
}) {
  const [data, setData] = useState<ContextPayload | null>(null);
  const [loading, setLoading] = useState(false);
  const [autoChecking, setAutoChecking] = useState(false);
  const [expanded, setExpanded] = useState(false);
  const [notice, setNotice] = useState("");
  const requestId = useRef(0);

  const findContext = useCallback(async (options: { automatic?: boolean; expand?: boolean } = {}) => {
    const currentRequest = ++requestId.current;
    if (options.automatic) setAutoChecking(true); else setLoading(true);
    setNotice("");
    try {
      const params = new URLSearchParams({ company, person, phoneNumber, text });
      if (updateId) params.set("updateId", updateId);
      const response = await fetch(`/api/coo-workbook/quick-updates/context?${params}`);
      const payload = await response.json().catch(() => null) as ContextPayload & { error?: string } | null;
      if (!response.ok || !payload) throw new Error(payload?.error ?? "Unable to find related history.");
      if (currentRequest !== requestId.current) return;
      setData(payload); setExpanded(true);
      if (!options.expand) setExpanded(false);
    } catch (error) {
      if (currentRequest !== requestId.current) return;
      setNotice(options.automatic ? "Automatic match check is temporarily unavailable. You can search again." : error instanceof Error ? error.message : "Unable to find related history.");
    } finally {
      if (currentRequest === requestId.current) {
        setLoading(false);
        setAutoChecking(false);
      }
    }
  }, [company, person, phoneNumber, text, updateId]);

  const hasIdentity = Boolean(updateId || phoneNumber.replace(/\D/g, "").length >= 7 || person.trim().length >= 3 || company.trim().length >= 3);
  const autoSignature = [updateId, person.trim().toLocaleLowerCase(), phoneNumber.replace(/\D/g, ""), company.trim().toLocaleLowerCase()].join("|");
  useEffect(() => {
    if (disabled || !hasIdentity) return;
    const timer = window.setTimeout(() => void findContext({ automatic: true }), updateId ? 100 : 700);
    return () => window.clearTimeout(timer);
  }, [autoSignature, disabled, findContext, hasIdentity, updateId]);

  async function selectCustomer(customerId: string) {
    setLoading(true); setNotice("");
    try {
      if (updateId) {
        const response = await fetch("/api/coo-workbook/quick-updates/context", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ customerId, updateId }) });
        const payload = await response.json().catch(() => null) as { error?: string } | null;
        if (!response.ok) throw new Error(payload?.error ?? "Unable to link this customer.");
      }
      onCustomerSelected?.(customerId); setNotice("Customer identity confirmed. Related activity will stay connected.");
      await onLinked?.();
      await findContext({ expand: true });
    } catch (error) { setNotice(error instanceof Error ? error.message : "Unable to link this customer."); setLoading(false); }
  }

  const canSearch = Boolean(person.trim() || phoneNumber.trim() || company.trim() || text.trim() || updateId);
  const relatedCount = data?.trend.totalUpdates ?? 0;
  const crmCount = data?.candidates.length ?? 0;
  return <section className={styles.context} aria-label="Related Quick Update context">
    <button className={styles.trigger} disabled={disabled || loading || !canSearch} onClick={() => void findContext({ expand: true })} type="button"><Search /> {loading ? "Checking history…" : data ? "Search again" : "Find related context"}</button>
    {autoChecking ? <span className={styles.checking}>Checking for matches…</span> : data ? <button className={relatedCount || crmCount ? styles.found : styles.clear} onClick={() => setExpanded((current) => !current)} type="button">{relatedCount ? `${relatedCount} related update${relatedCount === 1 ? "" : "s"} found` : crmCount ? `${crmCount} possible CRM match${crmCount === 1 ? "" : "es"}` : "No related matches"}</button> : null}
    {relatedCustomerId ? <span className={styles.confirmed}><CheckCircle2 /> Identity confirmed</span> : null}
    {expanded && data ? <div className={styles.panel}>
      <header><div><History /><span><strong>Related history and trend</strong><small>{data.summary}</small></span></div>{relatedCustomerId ? <Link href={`/crm/customers/${encodeURIComponent(relatedCustomerId)}`}>Open CRM record</Link> : null}</header>
      {data.candidates.length ? <section className={styles.matches}><strong>Possible CRM matches</strong><small>Confirm the person before connecting records. A name match alone is never merged automatically.</small><div>{data.candidates.map((candidate) => <article key={candidate.id}><span><b>{candidate.displayName}</b><small>{[candidate.customerNumber, candidate.phoneNumber, candidate.email].filter(Boolean).join(" · ")}</small><em>{candidate.counts.workdayQuickUpdates} updates · {candidate.counts.tasks} tasks · {candidate.counts.repairOrders} ROs</em></span><button disabled={disabled || loading || relatedCustomerId === candidate.id} onClick={() => void selectCustomer(candidate.id)} type="button">{relatedCustomerId === candidate.id ? "Confirmed" : "Use this customer"}</button></article>)}</div></section> : null}
      {data.trend.totalUpdates ? <section className={styles.trend}><span><b>{data.trend.totalUpdates}</b><small>related updates</small></span><span><b>{data.trend.dayCount}</b><small>workdays</small></span><span><b>{data.trend.openFollowUps}</b><small>open follow-ups</small></span><span><b>{data.trend.topCategories.map((item) => `${categoryLabel(item.category)} (${item.count})`).join(", ") || "No trend"}</b><small>recurring themes</small></span></section> : null}
      {data.history.length ? <details className={styles.timeline}><summary>Review the related timeline</summary><div>{data.history.map((item) => <article key={item.id}><time>{item.boardDate}</time><span><strong>{categoryLabel(item.category)} · {item.person || item.company || "General update"}</strong><p>{item.text}</p><small>{item.ownerName}{item.followUpNeeded ? ` · Follow-up ${item.dueWindow || "needed"}` : ""}</small></span>{item.convertedTaskId ? <Link href={`/tasks/${encodeURIComponent(item.convertedTaskId)}`}>Open task</Link> : null}</article>)}</div></details> : <p className={styles.empty}>No prior Quick Updates match the confirmed identity or entered details.</p>}
    </div> : null}
    {notice ? <p className={styles.notice} role="status"><Link2 /> {notice}</p> : null}
  </section>;
}
