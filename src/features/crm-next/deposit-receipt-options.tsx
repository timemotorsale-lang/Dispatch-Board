"use client";

import { createPortal } from "react-dom";
import { useCallback, useEffect, useRef, useState } from "react";
import { depositNumber } from "@/lib/customer-sales-deposits";
import styles from "./customer360-workspace.module.css";

export function DepositReceiptOptions({ url, id, newlySaved, onClose }: {
  url: string; id: string; canRecord: boolean; newlySaved: boolean; onClose: () => void;
}) {
  const [printFeedback, setPrintFeedback] = useState("");
  const [preview, setPreview] = useState<{ printHtml: string } | null>(null);
  const [loadError, setLoadError] = useState(false);
  const [attempt, setAttempt] = useState(0);
  const title = useRef<HTMLHeadingElement>(null);
  const receipt = `${url}?receipt=${encodeURIComponent(id)}`;
  const headingId = `deposit-receipt-${id}`;
  const load = useCallback(async (signal?: AbortSignal) => {
    const response = await fetch(`${url}?printPreview=${encodeURIComponent(id)}`, { cache: "no-store", signal });
    if (!response.ok) throw new Error("Could not load the printable receipt.");
    return await response.json() as { printHtml: string };
  }, [url, id]);

  useEffect(() => { title.current?.focus(); }, []);
  useEffect(() => {
    const controller = new AbortController();
    void load(controller.signal).then(setPreview).catch(() => { if (!controller.signal.aborted) setLoadError(true); });
    return () => controller.abort();
  }, [load, attempt]);

  function printReceipt() {
    setPrintFeedback("If no print dialog opens, download the receipt and print the file.");
    try { window.print(); } catch { /* The download remains available when printing is disabled. */ }
  }

  return <section className={styles.subsection} aria-labelledby={headingId}>
    <h3 id={headingId} ref={title} tabIndex={-1}>{newlySaved ? "Deposit recorded" : "Deposit agreement and receipt"}</h3>
    <p><strong>{depositNumber(id)}</strong> · The agreement and receipt is saved on this customer record.</p>
    <div className={styles.actions}>
      <button type="button" className={styles.primaryReceiptPrint} disabled={!preview?.printHtml} onClick={printReceipt}>
        {!preview && !loadError ? "Preparing receipt…" : "Print receipt"}
      </button>
      <a href={`${receipt}&download=1`}>Download receipt</a>
      <button type="button" onClick={onClose}>Close receipt options</button>
    </div>
    {printFeedback && <p role="status">{printFeedback}</p>}
    {preview?.printHtml && createPortal(<article className={styles.depositPrintDocument} aria-label="Printable receipt"
      dangerouslySetInnerHTML={{ __html: preview.printHtml }} />, document.body)}
    {loadError && <p role="alert">Could not prepare printing. Download the receipt or try again. <button type="button" onClick={() => { setLoadError(false); setAttempt(n => n + 1); }}>Retry</button></p>}
  </section>;
}
