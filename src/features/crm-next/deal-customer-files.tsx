"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { archiveFileHref, archiveKindLabel, type ArchiveTarget, type CaptureArchiveRow } from "@/features/mobile-capture/capture-archive-contract";
import styles from "@/features/mobile-capture/capture-archive.module.css";

type Files = { items: CaptureArchiveRow[]; destination: ArchiveTarget | null };
type LoadState = { kind: "ready"; files: Files } | { kind: "denied" } | { kind: "error" };

export function DealCustomerFiles({ dealId, savedCustomerId, selectedCustomerId }: {
  dealId?: string; savedCustomerId?: string | null; selectedCustomerId: string;
}) {
  return <section className={styles.panel} aria-label="Customer files">
    <h2>Customer files</h2>
    {dealId && savedCustomerId && savedCustomerId === selectedCustomerId
      ? <SavedCustomerFiles key={JSON.stringify([dealId, savedCustomerId])} dealId={dealId} customerId={savedCustomerId} />
      : <p>Save this deal with the matching customer record to see their files here.</p>}
  </section>;
}

export function SavedCustomerFiles({ dealId, customerId }: { dealId?: string; customerId: string }) {
  const [status, setStatus] = useState<LoadState | null>(null);
  const [attempt, setAttempt] = useState(0);

  useEffect(() => {
    const controller = new AbortController();
    const query = new URLSearchParams(dealId ? { dealId } : { ownerType: "CUSTOMER", ownerId: customerId });
    void fetch(`/api/capture-archive?${query}`, { signal: controller.signal, cache: "no-store" })
      .then(async response => {
        if ([401, 403, 404].includes(response.status)) {
          if (!controller.signal.aborted) setStatus({ kind: "denied" });
          return;
        }
        if (!response.ok) throw new Error("Could not load customer files.");
        const files: Files = await response.json();
        if (!controller.signal.aborted) setStatus(files.destination?.id === customerId ? { kind: "ready", files } : { kind: "denied" });
      }).catch(() => { if (!controller.signal.aborted) setStatus({ kind: "error" }); });
    return () => controller.abort();
  }, [dealId, customerId, attempt]);

  if (!status) return <p role="status">Loading customer files…</p>;
  if (status.kind === "denied") return <p>These customer files are unavailable with your current access.</p>;
  if (status.kind === "error") return <><p role="alert">Could not load customer files.</p><button type="button" onClick={() => { setStatus(null); setAttempt(value => value + 1); }}>Retry</button></>;
  const { items } = status.files;
  return <>
    {dealId && <p>These originals stay on the customer record. They are not signed deal paperwork.</p>}
    {items.length ? <ul className={styles.items}>
      {items.slice(0, 5).map(item => <li className={styles.item} key={item.id}>
        <strong>{archiveKindLabel[item.kind]} · {item.fileName}</strong>
        {item.description && <span>{item.description}</span>}
        {item.originalAvailable && <a href={archiveFileHref(item.id)} target="_blank" rel="noreferrer">Open original<span className="sr-only"> {item.fileName} (new tab)</span></a>}
      </li>)}
    </ul> : <p>No customer files are available to you yet.</p>}
    <div className={styles.actions}>
      <Link href={`/capture/archive?${new URLSearchParams({ ownerType: "CUSTOMER", ownerId: customerId })}`} target="_blank" rel="noreferrer">Open all customer files (new tab)</Link>
    </div>
  </>;
}
