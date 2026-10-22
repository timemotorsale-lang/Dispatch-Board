"use client";

import { useEffect, useId, useRef, useState } from "react";
import { createPortal } from "react-dom";
import ImagePreview from "next/image";
import { BarcodeScanner, type ScanResult } from "./barcode-scanner";
import { idFromBarcode } from "./barcode-review";
import { DocumentScanner } from "./document-scanner";
import { compareIdSides, emptyIdFields, idFieldLabels, type FrontIdFields, type IdFieldKey } from "./id-capture-fields";
import styles from "./document-scanner.module.css";

export function IdFrontCapture({ onClose, onComplete }: { onClose: () => void; onComplete: (file: File, fields: FrontIdFields, mismatch: boolean) => void }) {
  const titleId = useId();
  const [phase, setPhase] = useState<"FRONT" | "REVIEW" | "BACK">("FRONT");
  const [front, setFront] = useState<File | null>(null);
  const [back, setBack] = useState<{ scan: ScanResult; image?: File } | null>(null);
  const [fields, setFields] = useState<FrontIdFields>(emptyIdFields);
  const [busy, setBusy] = useState(false);
  const [notice, setNotice] = useState("");
  const [confirmed, setConfirmed] = useState(false);
  const [mismatchConfirmed, setMismatchConfirmed] = useState(false);
  const [revealed, setRevealed] = useState(false);
  const [frontUrl, setFrontUrl] = useState("");
  const controllerRef = useRef<AbortController | null>(null);
  const activeRef = useRef(true);
  const dialogRef = useRef<HTMLDivElement>(null);
  const closeRef = useRef(onClose);
  useEffect(() => { closeRef.current = onClose; }, [onClose]);
  useEffect(() => { activeRef.current = true; return () => { activeRef.current = false; controllerRef.current?.abort(); }; }, []);
  useEffect(() => () => { if (frontUrl) URL.revokeObjectURL(frontUrl); }, [frontUrl]);
  useEffect(() => {
    if (phase !== "REVIEW") return;
    const previous = document.activeElement instanceof HTMLElement ? document.activeElement : null;
    const overflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    dialogRef.current?.focus();
    function keyboard(event: KeyboardEvent) {
      if (event.key === "Escape") closeRef.current();
      if (event.key !== "Tab") return;
      const controls = Array.from(dialogRef.current?.querySelectorAll<HTMLElement>('button:not(:disabled), input:not(:disabled)') ?? []);
      if (event.shiftKey && (document.activeElement === controls[0] || document.activeElement === dialogRef.current)) { event.preventDefault(); controls.at(-1)?.focus(); }
      else if (!event.shiftKey && document.activeElement === controls.at(-1)) { event.preventDefault(); controls[0]?.focus(); }
    }
    document.addEventListener("keydown", keyboard);
    return () => { document.body.style.overflow = overflow; document.removeEventListener("keydown", keyboard); previous?.focus(); };
  }, [phase]);

  async function readFront(file: File) {
    controllerRef.current?.abort();
    const controller = new AbortController(); controllerRef.current = controller;
    setFront(file); setFrontUrl(URL.createObjectURL(file)); setBack(null); setFields(emptyIdFields()); setConfirmed(false); setMismatchConfirmed(false); setRevealed(false);
    setPhase("REVIEW"); setBusy(true); setNotice("Reading the front of the ID. Check and correct the suggested fields when ready…");
    const timeout = setTimeout(() => controller.abort(), 60000);
    try {
      const form = new FormData(); form.append("file", file);
      const response = await fetch("/api/document-library/id-front", { method: "POST", body: form, signal: controller.signal });
      const body = await response.json() as { error?: string; fields?: FrontIdFields; warnings?: string[] };
      if (!activeRef.current || controllerRef.current !== controller) return;
      if (!response.ok || !body.fields) throw new Error(body.error || "Text could not be read. Enter the visible fields manually.");
      setFields({ ...emptyIdFields(), ...body.fields });
      setNotice((body.warnings ?? ["Review and correct every field against the physical ID."]).join(" "));
    } catch (error) {
      if (activeRef.current && controllerRef.current === controller) setNotice(controller.signal.aborted ? "Reading timed out. Retake the photo or enter the fields manually." : error instanceof Error ? error.message : "Text could not be read. Enter the fields manually.");
    } finally { clearTimeout(timeout); if (activeRef.current && controllerRef.current === controller) setBusy(false); }
  }

  const backFields = back ? idFromBarcode(back.scan.value) : null;
  const comparison = backFields ? compareIdSides(fields, backFields) : [];
  const mismatch = comparison.some((item) => item.status === "MISMATCH");

  async function finish() {
    if (!front || !confirmed || (mismatch && !mismatchConfirmed)) return;
    setBusy(true); setNotice("Preparing your reviewed ID capture…");
    try {
      const { PDFDocument } = await import("pdf-lib");
      const document = await PDFDocument.create();
      document.setSubject(mismatch ? "ID capture: front/back mismatch; manual review required. Not identity verification." : "Reviewed ID capture. OCR and barcode reading do not verify identity.");
      for (const file of [front, back?.image].filter((file): file is File => Boolean(file))) {
        let bytes = new Uint8Array(await file.arrayBuffer());
        if (!["image/jpeg", "image/png"].includes(file.type)) {
          const url = URL.createObjectURL(file);
          try {
            const source = new Image(); source.src = url; await source.decode();
            const canvas = window.document.createElement("canvas"); canvas.width = source.naturalWidth; canvas.height = source.naturalHeight;
            canvas.getContext("2d")!.drawImage(source, 0, 0);
            const blob = await new Promise<Blob | null>((resolve) => canvas.toBlob(resolve, "image/jpeg", 0.92));
            if (!blob) throw new Error("Image conversion failed");
            bytes = new Uint8Array(await blob.arrayBuffer());
          } finally { URL.revokeObjectURL(url); }
        }
        const image = file.type === "image/png" ? await document.embedPng(bytes) : await document.embedJpg(bytes);
        const scale = Math.min(1, 700 / Math.max(image.width, image.height));
        const page = document.addPage([image.width * scale, image.height * scale]);
        page.drawImage(image, { x: 0, y: 0, width: image.width * scale, height: image.height * scale });
      }
      const bytes = await document.save();
      if (bytes.length > 25 * 1024 * 1024) throw new Error("The ID file is too large. Retake the images at a lower resolution.");
      if (activeRef.current) onComplete(new File([new Uint8Array(bytes)], "reviewed-id-capture.pdf", { type: "application/pdf" }), fields, mismatch);
    } catch { if (activeRef.current) setNotice("The ID file could not be prepared. Your review is still here; retry or retake the images."); }
    finally { if (activeRef.current) setBusy(false); }
  }

  if (phase === "FRONT") return <DocumentScanner onClose={onClose} onImageComplete={(file) => void readFront(file)} />;
  if (phase === "BACK") return <BarcodeScanner idOnly onClose={() => setPhase("REVIEW")} onConfirm={(scan, image) => { setBack({ scan, image }); setConfirmed(false); setMismatchConfirmed(false); setPhase("REVIEW"); setNotice("Back barcode read. Review the comparison; unread fields are not treated as matches."); }} />;
  return createPortal(<div className={styles.backdrop}><div className={styles.dialog} role="dialog" aria-modal="true" aria-labelledby={titleId} tabIndex={-1} ref={dialogRef}>
    <header><div><span>ID capture · review before use</span><h2 id={titleId}>Review front-of-ID details</h2></div><button aria-label="Close ID capture" onClick={onClose} type="button">Close</button></header>
    <p role="status">{notice}</p>
    {frontUrl ? <details><summary>View captured front</summary><ImagePreview unoptimized src={frontUrl} alt="Captured front of ID" width={960} height={640} style={{ width: "100%", height: "auto", maxHeight: "40dvh", objectFit: "contain" }} /></details> : null}
    <button aria-pressed={revealed} onClick={() => setRevealed(!revealed)} type="button">{revealed ? "Hide sensitive fields" : "Show sensitive fields"}</button>
    <div className={styles.idFields}>{(Object.keys(idFieldLabels) as IdFieldKey[]).map((key) => <label key={key} htmlFor={`${titleId}-${key}`}>{idFieldLabels[key]}<input autoComplete="off" id={`${titleId}-${key}`} disabled={busy} type={!revealed && !["fullName", "issuingState"].includes(key) ? "password" : "text"} value={fields[key]} maxLength={key === "address" ? 180 : 160} placeholder="Not read — enter from card" onChange={(event) => { setFields((current) => ({ ...current, [key]: event.target.value })); setConfirmed(false); setMismatchConfirmed(false); }} /></label>)}</div>
    {comparison.length ? <section aria-label="Front and back comparison"><h3>Front / back comparison</h3><ul>{comparison.map((item) => <li key={item.key}>{item.label}: {item.status === "MATCH" ? "Fields agree" : item.status === "MISMATCH" ? "Mismatch — check both sides" : "Not read on both sides — check manually"}</li>)}</ul></section> : null}
    <div className={styles.controls}><button disabled={busy} onClick={() => setPhase("BACK")} type="button">{back ? "Rescan back barcode" : "Scan back barcode · optional"}</button><button disabled={busy} onClick={() => setPhase("FRONT")} type="button">Retake front</button></div>
    <label><input disabled={busy} type="checkbox" checked={confirmed} onChange={(event) => setConfirmed(event.target.checked)} /> I checked the fields against the physical ID.</label>
    {mismatch ? <label><input disabled={busy} type="checkbox" checked={mismatchConfirmed} onChange={(event) => setMismatchConfirmed(event.target.checked)} /> I reviewed the front/back mismatch. Keep this capture for manual review.</label> : null}
    <p>OCR and barcode comparisons do not authenticate an ID. Missing fields remain blank. No customer record changes automatically.</p>
    <footer><button className={styles.primary} disabled={busy || !confirmed || (mismatch && !mismatchConfirmed)} onClick={() => void finish()} type="button">Use reviewed ID capture</button></footer>
  </div></div>, document.body);
}
