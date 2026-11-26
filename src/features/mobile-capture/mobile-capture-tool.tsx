"use client";

import { useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { useSearchParams } from "next/navigation";
import Link from "next/link";
import {
  Camera,
  CheckCircle2,
  FileText,
  IdCard,
  RotateCcw,
  ScanBarcode,
  Send,
  UploadCloud,
  X
} from "lucide-react";

import styles from "./mobile-capture-tool.module.css";
import { idFromBarcode, vinFromBarcode } from "./barcode-review";
import { BarcodeScanner } from "./barcode-scanner";
import { PhotoCamera } from "./photo-camera";
import { DocumentScanner } from "./document-scanner";
import { IdFrontCapture } from "./id-front-capture";
import type { FrontIdFields } from "./id-capture-fields";
import { captureToolFromQuery, MOBILE_HOME_HREF } from "./capture-navigation";
import { MobileCustomerIntake } from "./mobile-customer-intake";
import { customerFieldsFromBarcode } from "./mobile-intake-utils";

import { CaptureDestinationPicker } from "./capture-destination-picker";
import { archiveFileHref, archiveKindLabel, captureBatchLimit, captureByteLimit, captureFileError, captureKinds, captureMimeTypes, type ArchiveKind, type ArchiveTarget } from "./capture-archive-contract";
import { printCapture } from "./print-capture";
import archiveStyles from "./capture-archive.module.css";

type CaptureKindKey = ArchiveKind | "AUTO";
type CaptureMode = "READY" | "CAMERA" | "PREVIEW" | "SENT";
type CaptureIntent = "PHOTO" | "BARCODE" | "DOCUMENT";
type BarcodeResult = { format: string; value: string };
type BatchFile = { id: string; file: File; kind: ArchiveKind; description: string };
type Receipt = { batchId: string; items: { id: string; fileName: string; kind: ArchiveKind; contentType: string }[] };

function BatchPreview({ file }: { file: File }) {
  const [url, setUrl] = useState("");
  useEffect(() => {
    const current = URL.createObjectURL(file);
    const timer = window.setTimeout(() => setUrl(current), 0);
    return () => { window.clearTimeout(timer); URL.revokeObjectURL(current); };
  }, [file]);
  if (!url) return null;
  return <details><summary>Review original</summary>{file.type === "application/pdf" ?
    <a href={url} target="_blank" rel="noreferrer">Open PDF preview</a> :
    // eslint-disable-next-line @next/next/no-img-element
    <img className={archiveStyles.thumbnail} src={url} alt={`Preview of ${file.name}`} />}</details>;
}

export function MobileCaptureTool({ canPrintId = false }: { canPrintId?: boolean }) {
  const [customerDraft, setCustomerDraft] = useState<FrontIdFields | null>(null);
  const [customerIntakeOpen, setCustomerIntakeOpen] = useState(false);
  const [idMismatch, setIdMismatch] = useState(false);
  const [unreadIdBack, setUnreadIdBack] = useState(false);
  const searchParams = useSearchParams();
  const requestedDestination = searchParams.get("destination");
  const requestedKind = searchParams.get("kind");
  const requestedTool = searchParams.get("tool");
  const [destination, setDestination] = useState<ArchiveTarget | null>(null);
  const [resolving, setResolving] = useState(() => Boolean(searchParams.get("ownerId") && ["CUSTOMER", "VEHICLE", "QUICK_UPDATE"].includes(requestedDestination ?? "")));
  const [captureKind, setCaptureKind] = useState<CaptureKindKey>(() => requestedKind === "BUSINESS_CARD" || requestedKind === "ID" ? requestedKind : "AUTO");
  const [batch, setBatch] = useState<BatchFile[]>([]);
  const [reviewing, setReviewing] = useState(false);
  const [accepted, setAccepted] = useState(false);
  const batchKey = useRef("");
  const sending = useRef(false);
  const userSelected = useRef(false);
  const [mode, setMode] = useState<CaptureMode>("READY");
  const [activeIntent, setActiveIntent] = useState<CaptureIntent>("PHOTO");
  const [notice, setNotice] = useState("Choose Photo or Barcode Scan to start capture.");
  const [busy, setBusy] = useState(false);
  const [capturedImageUrl, setCapturedImageUrl] = useState("");
  const [capturedFile, setCapturedFile] = useState<File | null>(null);
  const [barcode, setBarcode] = useState<BarcodeResult | null>(null);
  const [barcodeNotice, setBarcodeNotice] = useState("");
  const [readingBarcode, setReadingBarcode] = useState(false);
  const [scannerOpen, setScannerOpen] = useState(false);
  const [documentScannerOpen, setDocumentScannerOpen] = useState(false);
  const [frontScannerOpen, setFrontScannerOpen] = useState(false);
  const [reviewedIdFields, setReviewedIdFields] = useState<FrontIdFields | null>(null);
  const [result, setResult] = useState<Receipt | null>(null);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const barcodeRequest = useRef(0);
  const previewDialog = useRef<HTMLDialogElement>(null);
  const fileUploadRef = useRef<HTMLInputElement | null>(null);
  const returnTo = searchParams.get("returnTo");
  const requestedOwnerId = searchParams.get("ownerId");

  useEffect(() => {
    const tool = captureToolFromQuery(requestedTool);
    if (!tool) return;
    const timer = window.setTimeout(() => {
      setCaptureKind(tool.kind);
      if (tool.key === "document") { setActiveIntent("DOCUMENT"); setDocumentScannerOpen(true); }
      else if (tool.key === "id-front") { setActiveIntent("DOCUMENT"); setFrontScannerOpen(true); }
      else if (tool.key === "barcode" || tool.key === "id-barcode") { setActiveIntent("BARCODE"); setScannerOpen(true); }
      else { setActiveIntent("PHOTO"); setMode("CAMERA"); }
    }, 0);
    return () => window.clearTimeout(timer);
  }, [requestedTool]);

  useEffect(() => {
    if (!requestedOwnerId || !["CUSTOMER", "VEHICLE", "QUICK_UPDATE"].includes(requestedDestination ?? "")) return;
    const controller = new AbortController();
    void fetch(`/api/capture-archive?${new URLSearchParams({ lookup: "1", type: requestedDestination!, id: requestedOwnerId })}`, { signal: controller.signal })
      .then(async response => {
        const data = await response.json();
        if (controller.signal.aborted || userSelected.current) return;
        if (!response.ok || !data.items?.[0]) throw new Error(data.error ?? "The requested destination is unavailable.");
        setDestination(data.items[0]);
        setAccepted(false);
      }).catch(error => {
        if (!controller.signal.aborted && !userSelected.current) setNotice(error instanceof Error ? error.message : "Choose a destination or send to the archive.");
      }).finally(() => { if (!controller.signal.aborted) setResolving(false); });
    return () => controller.abort();
  }, [requestedDestination, requestedOwnerId]);

  useEffect(() => {
    if (!batch.length && !capturedFile) return;
    function protect(event: BeforeUnloadEvent) { event.preventDefault(); }
    window.addEventListener("beforeunload", protect);
    return () => window.removeEventListener("beforeunload", protect);
  }, [batch.length, capturedFile]);

  useEffect(() => () => {
    if (capturedImageUrl) URL.revokeObjectURL(capturedImageUrl);
  }, [capturedImageUrl]);

  useEffect(() => {
    if (mode !== "PREVIEW") return;
    const dialog = previewDialog.current;
    const previous = document.activeElement instanceof HTMLElement ? document.activeElement : null;
    dialog?.showModal();
    return () => { dialog?.close(); if (previous?.isConnected) previous.focus(); };
  }, [mode]);

  function clearFileInputs() {
    if (fileUploadRef.current) fileUploadRef.current.value = "";
  }

  function resetCapturedImage() {
    barcodeRequest.current += 1;
    setReadingBarcode(false);
    setIdMismatch(false);
    setUnreadIdBack(false);
    setReviewedIdFields(null);
    if (capturedImageUrl) URL.revokeObjectURL(capturedImageUrl);
    setCapturedImageUrl("");
    setCapturedFile(null);
    setBarcode(null);
    setBarcodeNotice("");
  }

  async function readBarcode(file = capturedFile) {
    if (!file?.type.startsWith("image/") || readingBarcode) return;
    const request = ++barcodeRequest.current;
    setReadingBarcode(true);
    setBarcodeNotice("Reading barcode...");
    try {
      const bitmap = await createImageBitmap(file);
      if (request !== barcodeRequest.current) { bitmap.close(); return; }
      const canvas = canvasRef.current;
      if (!canvas) { bitmap.close(); return; }
      canvas.width = bitmap.width;
      canvas.height = bitmap.height;
      canvas.getContext("2d")?.drawImage(bitmap, 0, 0);
      bitmap.close();
      const { BarcodeFormat, BrowserMultiFormatReader, BrowserPDF417Reader } = await import("@zxing/browser");
      if (request !== barcodeRequest.current) return;
      let result;
      try {
        result = (captureKind === "ID" ? new BrowserPDF417Reader() : new BrowserMultiFormatReader()).decodeFromCanvas(canvas);
      } catch {
        if (captureKind !== "ID") result = new BrowserPDF417Reader().decodeFromCanvas(canvas);
      }
      if (!result) { setBarcodeNotice("No barcode found. Retake with the barcode sharp and fully in frame."); return; }
      setBarcode({ format: BarcodeFormat[result.getBarcodeFormat()], value: result.getText() });
      setBarcodeNotice("Barcode read. Confirm it against the physical document before using it.");
    } catch {
      if (request === barcodeRequest.current) setBarcodeNotice("No barcode found. Retake with the barcode sharp and fully in frame.");
    } finally {
      if (request === barcodeRequest.current) setReadingBarcode(false);
    }
  }

  const scannedVin = barcode ? vinFromBarcode(barcode.value) : null;
  const idFields = barcode && (captureKind === "ID" || barcode.format === "PDF_417") ? idFromBarcode(barcode.value) : null;

  async function copyIdNumber() {
    if (!idFields?.number) return;
    try {
      await navigator.clipboard.writeText(idFields.number);
      setBarcodeNotice("ID number copied for the intake form.");
    } catch {
      setBarcodeNotice("Copy is unavailable here. Enter the ID number from the card.");
    }
  }

  async function copyBarcode() {
    if (!barcode) return;
    try {
      await navigator.clipboard.writeText(barcode.value);
      setBarcodeNotice("Barcode value copied for the update.");
    } catch {
      setBarcodeNotice("Copy is unavailable here. Read the value from the label.");
    }
  }

  function previewPhoto(file: File) {
    const error = captureFileError(file);
    if (error) return error;
    resetCapturedImage();
    setCapturedFile(file);
    setCapturedImageUrl(URL.createObjectURL(file));
    setMode("PREVIEW");
    setNotice("Photo captured. Review it, retake it, or accept and send.");
    return "";
  }

  function startPhotoCapture(kind: "PHOTO" | "BUSINESS_CARD" = "PHOTO") {
    setCaptureKind(kind);
    setActiveIntent("PHOTO");
    setResult(null);
    setMode("CAMERA");
  }

  function startBarcodeCapture() {
    if (captureKind === "ID") setCaptureKind("AUTO");
    setActiveIntent("BARCODE");
    setScannerOpen(true);
  }

  function startDocumentCapture() {
    setCaptureKind("DOCUMENT");
    setActiveIntent("DOCUMENT");
    setDocumentScannerOpen(true);
  }

  function retake() {
    resetCapturedImage();
    clearFileInputs();
    if (activeIntent === "DOCUMENT" && captureKind === "ID") { setMode("READY"); setFrontScannerOpen(true); }
    else if (activeIntent === "DOCUMENT") { setMode("READY"); setDocumentScannerOpen(true); }
    else if (activeIntent === "BARCODE") { setMode("READY"); setScannerOpen(true); }
    else startPhotoCapture(captureKind === "BUSINESS_CARD" ? "BUSINESS_CARD" : "PHOTO");
  }

  function cancelPreview() {
    if (busy) return;
    resetCapturedImage();
    clearFileInputs();
    setMode("READY");
    setNotice("Capture canceled.");
  }

  function addFiles(files: File[], kind?: ArchiveKind, description = "") {
    if (!files.length) return false;
    const error = files.map(captureFileError).find(Boolean);
    if (error || batch.length + files.length > captureBatchLimit ||
      [...batch.map(item => item.file), ...files].reduce((total, file) => total + file.size, 0) > captureByteLimit) {
      setNotice(error || "Use up to 12 files totaling 25 MB per batch. Remove a file or send this batch first.");
      return false;
    }
    if (kind === "BUSINESS_CARD" && files.some(file => !file.type.startsWith("image/"))) {
      setNotice("Choose a JPEG, PNG, or WebP business-card image.");
      return false;
    }
    setBatch(current => [...current, ...files.map(file => ({
      file, kind: kind ?? (file.type === "application/pdf" ? "DOCUMENT" : "PHOTO"), id: crypto.randomUUID(), description
    }))]);
    setAccepted(false);
    setReviewing(false);
    setMode("READY");
    setNotice(`${files.length === 1 ? "File" : `${files.length} files`} added. Add another or review the batch.`);
    return true;
  }

  const previewKind: ArchiveKind = captureKind === "ID" || idFields ? "ID" : captureKind === "BUSINESS_CARD" ? "BUSINESS_CARD" :
    capturedFile?.type === "application/pdf" ? "DOCUMENT" : "PHOTO";

  function addCurrent() {
    const description = idMismatch ? "ID front/back mismatch. Manual review required." : unreadIdBack ? "Back photo kept. Barcode unread. Manual review required." : "";
    if (!capturedFile || !addFiles([capturedFile], previewKind, description)) return;
    resetCapturedImage();
    clearFileInputs();
  }

  async function sendCapture() {
    if (!accepted || !batch.length || sending.current || resolving) return;
    sending.current = true;
    setBusy(true);
    setNotice("Sending reviewed batch…");
    if (!batchKey.current) batchKey.current = crypto.randomUUID();
    try {
      const form = new FormData();
      form.append("manifest", JSON.stringify({
        key: batchKey.current, destination,
        items: batch.map(({ kind, description }) => ({ kind, description }))
      }));
      batch.forEach(item => form.append("file", item.file));
      const response = await fetch("/api/capture-archive", { method: "POST", body: form });
      const body = await response.json();
      if (!response.ok) throw new Error(body.error ?? "The batch could not be sent.");
      setResult(body);
      setBatch([]);
      batchKey.current = "";
      setReviewing(false);
      setAccepted(false);
      setMode("SENT");
      setNotice(destination ? `Filed to ${destination.label}. Originals are in the Capture Archive.` : "Originals saved in the Capture Archive.");
    } catch (error) {
      setNotice(error instanceof Error ? error.message : "Could not send the batch. Your files are still here.");
    } finally {
      sending.current = false;
      setBusy(false);
    }
  }

  function printBeforeSending(file: File) {
    void printCapture(file, file.type).catch(error => setNotice(error.message));
  }

  if (customerIntakeOpen) return <MobileCustomerIntake initialFields={customerDraft ?? undefined} onSaved={() => setCustomerDraft(null)} onCancel={() => { if (window.confirm("Leave customer entry and return to capture? Any unsaved details will be discarded.")) { setCustomerDraft(null); setCustomerIntakeOpen(false); } }} />;

  return (
    <main className={styles.page} aria-labelledby="mobile-capture-title">
      <Link href="/capture/documents">Read receipts, sales packets, titles, parts, transport and warranty documents</Link>
      <header className={styles.header}>
        <Link href={returnTo?.startsWith("/") && !returnTo.startsWith("//") && !returnTo.includes("\\") ? returnTo : "/"}>Back</Link>
        <Link href={MOBILE_HOME_HREF}>Mobile home</Link>
      </header>

      <section className={styles.hero}>
        <div>
          <span><Camera size={16} /> Capture</span>
          <h1 id="mobile-capture-title">Scan or capture</h1>
        </div>
        <p aria-live="polite">{notice}</p>
      </section>

      <nav className={archiveStyles.actions} aria-label="Capture destinations">
        <Link href="/capture/archive">Capture Archive</Link>
        <Link href="/capture/archive?kind=BUSINESS_CARD">Business Cards</Link>
      </nav>
      <CaptureDestinationPicker
        value={destination} disabled={busy || resolving}
        initialType={requestedDestination === "CUSTOMER" || requestedDestination === "VEHICLE" ? requestedDestination : undefined}
        onChange={value => { userSelected.current = true; setDestination(value); setAccepted(false); }}
      />

      <section aria-busy={busy} className={styles.actions} aria-label="Capture actions">
        <button aria-pressed={activeIntent === "PHOTO" && mode !== "SENT"} disabled={busy} onClick={() => startPhotoCapture()} type="button"><Camera size={20} /> Photo</button>
        <button aria-pressed={activeIntent === "BARCODE" && mode !== "SENT"} disabled={busy} onClick={startBarcodeCapture} type="button"><ScanBarcode size={20} /> Scan barcode / QR</button>
        <button disabled={busy} onClick={() => { setCaptureKind("ID"); setActiveIntent("BARCODE"); setScannerOpen(true); }} type="button"><IdCard size={20} /> Scan ID barcode</button>
        <button disabled={busy} onClick={() => { setCaptureKind("ID"); setActiveIntent("DOCUMENT"); setFrontScannerOpen(true); }} type="button"><IdCard size={20} /> Capture ID front / back</button>
        <button disabled={busy} onClick={startDocumentCapture} type="button"><FileText size={20} /> Scan document</button>
        <button disabled={busy} onClick={() => startPhotoCapture("BUSINESS_CARD")} type="button"><IdCard size={20} /> Capture business card</button>
        <button className={styles.uploadAction} disabled={busy} onClick={() => fileUploadRef.current?.click()} type="button"><UploadCloud size={20} /> Add files</button>
        <input accept={captureMimeTypes.join(",")} disabled={busy} hidden multiple onChange={event => {
          const files = Array.from(event.currentTarget.files ?? []);
          event.currentTarget.value = "";
          addFiles(files, requestedKind === "BUSINESS_CARD" || requestedKind === "ID" ? requestedKind : undefined);
        }} ref={fileUploadRef} type="file" />
      </section>

      {frontScannerOpen ? <IdFrontCapture onClose={() => setFrontScannerOpen(false)} onComplete={(file, fields, mismatch) => {
        resetCapturedImage();
        setIdMismatch(mismatch);
        setReviewedIdFields(fields);
        setCapturedFile(file);
        setCapturedImageUrl(URL.createObjectURL(file));
        setFrontScannerOpen(false);
        setMode("PREVIEW");
        setNotice("ID ready. Add it to the batch or copy the reviewed details for intake.");
      }} /> : null}

      {documentScannerOpen ? <DocumentScanner onClose={() => setDocumentScannerOpen(false)} onComplete={(file) => {
        resetCapturedImage();
        setCapturedFile(file);
        setCapturedImageUrl(URL.createObjectURL(file));
        setDocumentScannerOpen(false);
        setMode("PREVIEW");
        setNotice("PDF ready. Review it and add it to the batch.");
      }} /> : null}

      {scannerOpen ? <BarcodeScanner idOnly={captureKind === "ID"} onClose={() => setScannerOpen(false)} onUnreadablePhoto={captureKind === "ID" ? image => {
        resetCapturedImage();
        setUnreadIdBack(true);
        setCapturedFile(image);
        setCapturedImageUrl(URL.createObjectURL(image));
        setScannerOpen(false);
        setMode("PREVIEW");
        setNotice("Back photo retained without reading the barcode. Add it for manual review or retake it.");
      } : undefined} onConfirm={(scan, image) => {
        resetCapturedImage();
        setBarcode(scan);
        setBarcodeNotice(captureKind === "ID" ? "ID fields reviewed. Copy the ID number only when needed, or send the captured photo for customer-file review. No customer record has been changed." : "Code confirmed. Use the VIN, copy the value, or send the photo for review.");
        if (image) { setCapturedFile(image); setCapturedImageUrl(URL.createObjectURL(image)); }
        setScannerOpen(false);
        setMode("PREVIEW");
        setNotice("Code ready. Choose what to do next.");
      }} /> : null}

      {mode === "CAMERA" ? <PhotoCamera onClose={() => {
        setMode("READY");
        setNotice("Photo capture canceled.");
      }} {...(captureKind === "BUSINESS_CARD" ? { framing: "business" as const, titleText: "Capture a business card", shutterLabel: "Capture card" } : {})} onPhoto={previewPhoto} /> : null}

      {mode === "PREVIEW" ? createPortal(
        <dialog className={styles.previewOverlay} aria-label="Capture preview" onCancel={event => { event.preventDefault(); cancelPreview(); }} ref={previewDialog}>
          <header>
            <span>{activeIntent === "DOCUMENT" ? "Document review" : activeIntent === "BARCODE" ? "Barcode review" : "Photo review"}</span>
            <strong>Add this item, retake, or cancel</strong>
          </header>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          {capturedFile?.type === "application/pdf" ? <iframe src={capturedImageUrl} title="Document PDF preview" style={{ width: "100%", height: "100%", minHeight: 0, border: 0, background: "white" }} /> : capturedImageUrl ? <img alt="Captured scan preview" src={capturedImageUrl} /> : <p>Code ready for review</p>}
          <div className={styles.barcodeReview} aria-live="polite">
            <p role="status">{notice}</p>
            {capturedFile?.type === "application/pdf" ? <a href={capturedImageUrl} target="_blank" rel="noreferrer">Open PDF preview</a> : capturedFile ? <button disabled={readingBarcode || busy} onClick={() => void readBarcode()} type="button">{readingBarcode ? "Reading..." : activeIntent === "BARCODE" ? "Read again" : "Read barcode"}</button> : null}
            {capturedFile && (previewKind !== "ID" || canPrintId) && <button type="button" onClick={() => printBeforeSending(capturedFile)}>Print now</button>}
            {barcodeNotice ? <p>{barcodeNotice}</p> : null}
            {reviewedIdFields ? <><p>Reviewed ID: {reviewedIdFields.fullName || "Name not entered"} · {reviewedIdFields.issuingState || "State not entered"} · ID ending {reviewedIdFields.licenseNumber.slice(-4) || "not entered"}</p><button onClick={async () => { try { await navigator.clipboard.writeText(JSON.stringify(reviewedIdFields, null, 2)); setBarcodeNotice("Reviewed fields copied. Paste only into the intended customer intake form."); } catch { setBarcodeNotice("Copy is unavailable in this browser."); } }} type="button">Copy reviewed ID fields</button></> : null}
            {scannedVin ? <Link href={`/capture/vehicle?vin=${encodeURIComponent(scannedVin)}`}>Decode &amp; add vehicle · {scannedVin}</Link> : null}
            {reviewedIdFields || idFields ? <button disabled={idMismatch} type="button" onClick={() => { const draft = reviewedIdFields ?? (barcode ? customerFieldsFromBarcode(barcode.value) : null); if (draft) { setCustomerDraft(draft); setCustomerIntakeOpen(true); resetCapturedImage(); setMode("READY"); } }}>Add customer · enter phone &amp; email</button> : null}
            {idMismatch ? <p>Resolve the front/back mismatch before creating a customer from this capture. Retake the ID or use manual customer entry.</p> : null}
            {idFields?.number ? <p>ID: {idFields.name || "Name unavailable"} · {idFields.state || "State unavailable"} · ending {idFields.number.slice(-4)}</p> : null}
            {idFields?.number ? <button onClick={() => void copyIdNumber()} type="button">Copy ID number</button> : null}
            {barcode && !scannedVin && !idFields?.number && barcode.format !== "PDF_417" ? <><p>{barcode.format}: {barcode.value.slice(0, 80)}</p><button onClick={() => void copyBarcode()} type="button">Copy barcode</button></> : null}
            {barcode?.format === "PDF_417" && !idFields?.number ? <p>PDF417 read. Review the captured ID photo to confirm its details.</p> : null}
          </div>
          <footer>
            <button disabled={busy || !capturedFile} onClick={addCurrent} type="button"><Send size={20} /> Add to batch</button>
            <button disabled={busy} onClick={retake} type="button"><RotateCcw size={20} /> Retake</button>
            <button disabled={busy} onClick={cancelPreview} type="button"><X size={20} /> Cancel</button>
          </footer>
        </dialog>, document.body
      ) : null}

      {!!batch.length && <section className={archiveStyles.panel} aria-label="Capture batch">
        <h2>{reviewing ? "Review batch" : "Current batch"} · {batch.length} {batch.length === 1 ? "file" : "files"}</h2>
        <p>{destination ? `File to ${destination.label} and retain the originals in the archive.` : "Unfiled originals will go to the Capture Archive."}</p>
        <ul className={archiveStyles.items}>{batch.map((item, index) => <li className={archiveStyles.item} key={item.id}>
          <strong>{index + 1}. {item.file.name} · {archiveKindLabel[item.kind]}</strong>
          {reviewing && <BatchPreview file={item.file} />}
          {reviewing && <><label>File type<select value={item.kind} disabled={busy || item.kind === "ID"} onChange={event => {
            setBatch(items => items.map(row => row.id === item.id ? { ...row, kind: event.target.value as ArchiveKind } : row)); setAccepted(false);
          }}>{captureKinds.filter(kind => item.file.type !== "application/pdf" || kind === "DOCUMENT" || kind === "ID").map(kind => <option key={kind} value={kind}>{archiveKindLabel[kind]}</option>)}</select></label>
          <label>{item.kind === "BUSINESS_CARD" ? "Business description (if unclear on card)" : "Description (optional)"}<input value={item.description} maxLength={240} disabled={busy} onChange={event => {
            setBatch(items => items.map(row => row.id === item.id ? { ...row, description: event.target.value } : row)); setAccepted(false);
          }} /></label></>}
          <div className={archiveStyles.actions}>
            {(item.kind !== "ID" || canPrintId) && <button type="button" disabled={busy} onClick={() => printBeforeSending(item.file)}>Print now</button>}
            <button type="button" disabled={busy} onClick={() => { setBatch(items => items.filter(row => row.id !== item.id)); setAccepted(false); }}>Remove</button>
          </div>
        </li>)}</ul>
        <div className={archiveStyles.actions}>
          {!reviewing ? <button className={archiveStyles.primary} type="button" onClick={() => { setReviewing(true); setAccepted(false); setNotice("Review the file types and destination, then accept the batch."); }}>Review batch</button> :
            accepted ? <button className={archiveStyles.primary} type="button" disabled={busy} onClick={() => void sendCapture()}>{busy ? "Sending…" : "Send batch"}</button> :
              <button className={archiveStyles.primary} disabled={resolving} type="button" onClick={() => { setAccepted(true); setNotice("Batch accepted. Choose Send batch to save the originals."); }}>Accept batch</button>}
        </div>
        {reviewing && <p role="status">{notice}</p>}
      </section>}
      {mode === "SENT" && result ? <section className={styles.sentPanel} aria-label="Capture result">
        <CheckCircle2 size={26} /><h2>{result.items.length} {result.items.length === 1 ? "file" : "files"} saved</h2>
        <div className={styles.sentActions}>
          <Link href={`/capture/archive?batch=${encodeURIComponent(result.batchId)}`}>Open saved batch</Link>
          <Link href="/capture/archive">Search archive</Link>
          {destination && <Link href={`/capture/archive?${new URLSearchParams({ ownerType: destination.type, ownerId: destination.id })}`}>Open filed captures</Link>}
          <button type="button" onClick={() => { setMode("READY"); setResult(null); setNotice("Choose a capture tool to start a new batch."); }}>Capture another</button>
        </div>
        <ul className={archiveStyles.items}>{result.items.filter(item => item.kind !== "ID" || canPrintId).map(item => <li key={item.id}>
          <button type="button" onClick={() => void printCapture(`${archiveFileHref(item.id)}&print=1`, item.contentType).catch(error => setNotice(error.message))}>Print {item.fileName}</button>
        </li>)}</ul>
      </section> : null}

      <canvas ref={canvasRef} />
    </main>
  );
}
