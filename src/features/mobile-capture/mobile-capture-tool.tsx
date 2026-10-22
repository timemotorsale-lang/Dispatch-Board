"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { useSearchParams } from "next/navigation";
import Link from "next/link";
import {
  BriefcaseBusiness,
  Building2,
  Camera,
  CarFront,
  CheckCircle2,
  ClipboardCheck,
  FileText,
  IdCard,
  RotateCcw,
  ScanBarcode,
  Send,
  UploadCloud,
  UserRound,
  Wrench,
  X
} from "lucide-react";

import styles from "./mobile-capture-tool.module.css";
import { idFromBarcode, vinFromBarcode } from "./barcode-review";
import { BarcodeScanner } from "./barcode-scanner";
import { cameraErrorMessage, createCameraSession } from "./scanner-camera";
import { DocumentScanner } from "./document-scanner";
import { IdFrontCapture } from "./id-front-capture";
import type { FrontIdFields } from "./id-capture-fields";

type CaptureDestinationKey = "CUSTOMER" | "VEHICLE" | "CLAIM" | "REPAIR_ORDER" | "TASK" | "VENDOR" | "GENERAL" | "QUICK_UPDATE";
type CaptureKindKey = "AUTO" | "PHOTO" | "ID" | "BUSINESS_CARD" | "ESTIMATE" | "DOCUMENT";
type CaptureMode = "READY" | "CAMERA" | "PREVIEW" | "SENT";
type CaptureIntent = "PHOTO" | "BARCODE" | "DOCUMENT";
type BarcodeResult = { format: string; value: string };

const MAX_UPLOAD_BYTES = 25 * 1024 * 1024;
const ACCEPTED_UPLOAD_TYPES = new Set([
  "application/pdf",
  "image/gif",
  "image/jpeg",
  "image/png",
  "image/webp",
  "text/plain"
]);

type SmartField = {
  key: string;
  label: string;
  value: string;
};

type UploadResponse = {
  error?: string;
  smartIntake?: {
    classificationConfidence: number;
    classificationLabel: string;
    extractedFields: SmartField[];
    reviewStatus: string;
    routingTarget: string;
    warnings: string[];
  };
  storageDraft?: {
    fileName: string;
    reference: string;
  };
};

const destinations = [
  {
    console: "CRM_CONSOLE",
    icon: UserRound,
    intent: "CUSTOMER_FILE",
    key: "CUSTOMER",
    label: "Customer",
    ownerType: "CUSTOMER",
    prompt: "Customer name, phone, or email"
  },
  {
    console: "INVENTORY_CONSOLE",
    icon: CarFront,
    intent: "GENERAL_SUPPORT",
    key: "VEHICLE",
    label: "Vehicle",
    ownerType: "VEHICLE",
    prompt: "VIN, stock number, or plate"
  },
  {
    console: "CLAIMS_WORKSPACE",
    icon: ClipboardCheck,
    intent: "CLAIM_EVIDENCE",
    key: "CLAIM",
    label: "Claim",
    ownerType: "CLAIM",
    prompt: "Claim number, VIN, or customer"
  },
  {
    console: "REPAIR_ORDER_CONSOLE",
    icon: Wrench,
    intent: "REPAIR_EVIDENCE",
    key: "REPAIR_ORDER",
    label: "Repair order",
    ownerType: "REPAIR_ORDER",
    prompt: "RO number, VIN, or vehicle"
  },
  {
    console: "TASK_CONSOLE",
    icon: BriefcaseBusiness,
    intent: "TASK_ATTACHMENT",
    key: "TASK",
    label: "Task",
    ownerType: "TASK",
    prompt: "Task number or brief reference"
  },
  {
    console: "VENDOR_CONSOLE",
    icon: Building2,
    intent: "VENDOR_COMPLIANCE",
    key: "VENDOR",
    label: "Vendor",
    ownerType: "VENDOR",
    prompt: "Vendor name"
  },
  {
    console: "DOCUMENT_LIBRARY",
    icon: FileText,
    intent: "GENERAL_SUPPORT",
    key: "GENERAL",
    label: "Inbox",
    ownerType: "CUSTOMER",
    prompt: "Optional reference"
  },
  {
    console: "DOCUMENT_LIBRARY",
    icon: ClipboardCheck,
    intent: "GENERAL_SUPPORT",
    key: "QUICK_UPDATE",
    label: "Quick Update",
    ownerType: "QUICK_UPDATE",
    prompt: "Update reference"
  }
] as const;

const captureKinds = [
  { key: "AUTO", label: "Auto" },
  { key: "PHOTO", label: "Photo" },
  { key: "ID", label: "ID" },
  { key: "BUSINESS_CARD", label: "Business card" },
  { key: "ESTIMATE", label: "Estimate" },
  { key: "DOCUMENT", label: "Document" }
] as const;

const documentTypeByKind: Partial<Record<CaptureKindKey, string>> = {
  BUSINESS_CARD: "BUSINESS_CARD",
  DOCUMENT: "SUPPORTING_DOCUMENT",
  ESTIMATE: "INSURANCE_ESTIMATE",
  ID: "CUSTOMER_ID",
  PHOTO: "DAMAGE_PHOTOS"
};

function slug(value: string) {
  return value.trim().toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "") || "mobile-capture-inbox";
}

export function MobileCaptureTool() {
  const searchParams = useSearchParams();
  const requestedDestination = searchParams.get("destination");
  const requestedKind = searchParams.get("kind");
  const [destinationKey, setDestinationKey] = useState<CaptureDestinationKey>(() => destinations.some((item) => item.key === requestedDestination) ? requestedDestination as CaptureDestinationKey : "GENERAL");
  const [captureKind, setCaptureKind] = useState<CaptureKindKey>(() => captureKinds.some((item) => item.key === requestedKind) ? requestedKind as CaptureKindKey : "AUTO");
  const [reference, setReference] = useState(() => searchParams.get("reference")?.slice(0, 120) ?? "");
  const [note, setNote] = useState("");
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
  const [startingCamera, setStartingCamera] = useState(false);
  const [result, setResult] = useState<UploadResponse | null>(null);
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const cameraUploadRef = useRef<HTMLInputElement | null>(null);
  const fileUploadRef = useRef<HTMLInputElement | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const cameraSessionRef = useRef<ReturnType<typeof createCameraSession> | null>(null);
  const returnTo = searchParams.get("returnTo");
  const requestedOwnerId = searchParams.get("ownerId");

  const destination = useMemo(
    () => destinations.find((item) => item.key === destinationKey) ?? destinations[0],
    [destinationKey]
  );

  useEffect(() => () => {
    cameraSessionRef.current?.stop();
    streamRef.current?.getTracks().forEach((track) => track.stop());
  }, []);

  useEffect(() => () => {
    if (capturedImageUrl) URL.revokeObjectURL(capturedImageUrl);
  }, [capturedImageUrl]);

  useEffect(() => {
    if (mode !== "CAMERA" || !videoRef.current) return;
    const session = createCameraSession();
    cameraSessionRef.current = session;
    let cancelled = false;
    void session.open(videoRef.current, "environment").then((stream) => {
      if (!stream || cancelled) return;
      streamRef.current = stream;
      setStartingCamera(false);
      setNotice("Fill the screen with the item, then capture.");
    }).catch((error: unknown) => {
      if (cancelled) return;
      setStartingCamera(false);
      setMode("READY");
      setNotice(cameraErrorMessage(error));
    });
    return () => { cancelled = true; session.stop(); };
  }, [mode]);

  function stopCamera() {
    cameraSessionRef.current?.stop();
    streamRef.current?.getTracks().forEach((track) => track.stop());
    streamRef.current = null;
    if (videoRef.current) videoRef.current.srcObject = null;
  }

  function clearFileInputs() {
    if (cameraUploadRef.current) cameraUploadRef.current.value = "";
    if (fileUploadRef.current) fileUploadRef.current.value = "";
  }

  function resetCapturedImage() {
    setReviewedIdFields(null);
    if (capturedImageUrl) URL.revokeObjectURL(capturedImageUrl);
    setCapturedImageUrl("");
    setCapturedFile(null);
    setBarcode(null);
    setBarcodeNotice("");
  }

  async function readBarcode(file = capturedFile) {
    if (!file?.type.startsWith("image/") || readingBarcode) return;
    setReadingBarcode(true);
    setBarcodeNotice("Reading barcode...");
    try {
      const bitmap = await createImageBitmap(file);
      const canvas = canvasRef.current;
      if (!canvas) throw new Error("Scanner unavailable");
      canvas.width = bitmap.width;
      canvas.height = bitmap.height;
      canvas.getContext("2d")?.drawImage(bitmap, 0, 0);
      bitmap.close();
      const { BarcodeFormat, BrowserMultiFormatReader, BrowserPDF417Reader } = await import("@zxing/browser");
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
      setBarcodeNotice("No barcode found. Retake with the barcode sharp and fully in frame.");
    } finally {
      setReadingBarcode(false);
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

  function previewFile(file: File | null) {
    if (!file) return;
    const error = validateFile(file);
    if (error) { setNotice(error); clearFileInputs(); return; }
    resetCapturedImage();
    setCapturedFile(file);
    setCapturedImageUrl(URL.createObjectURL(file));
    setMode("PREVIEW");
    setNotice(activeIntent === "BARCODE" ? "Barcode captured. Accept it, retake it, or cancel." : "Photo captured. Accept it, retake it, or cancel.");
    if (activeIntent === "BARCODE") void readBarcode(file);
  }

  function validateFile(file: File) {
    if (file.size <= 0) return "That file appears to be empty.";
    if (file.size > MAX_UPLOAD_BYTES) return "That file is too large. Use a file under 25 MB.";
    if (file.type && !ACCEPTED_UPLOAD_TYPES.has(file.type)) return "Use a PDF, image, or text file.";
    return "";
  }

  async function startCamera(intent: CaptureIntent = activeIntent) {
    if (busy || startingCamera) return;
    setActiveIntent(intent);
    setResult(null);
    setNotice(intent === "BARCODE" ? "Opening barcode scanner..." : "Opening photo capture...");
    if (typeof window !== "undefined" && !window.isSecureContext) {
      setNotice("Live camera requires a secure phone browser. Opening the phone camera picker instead.");
      cameraUploadRef.current?.click();
      return;
    }
    if (!navigator.mediaDevices?.getUserMedia) {
      setNotice("Live camera is not available here. Opening the phone camera picker instead.");
      cameraUploadRef.current?.click();
      return;
    }
    stopCamera();
    setStartingCamera(true);
    setMode("CAMERA");
  }

  function startPhotoCapture() {
    setCaptureKind("PHOTO");
    void startCamera("PHOTO");
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

  async function captureImage() {
    if (busy) return;
    const video = videoRef.current;
    const canvas = canvasRef.current;
    if (!video || !canvas || video.videoWidth === 0 || video.videoHeight === 0) {
      setNotice("Camera is still warming up. Try again in a moment.");
      return;
    }
    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;
    const context = canvas.getContext("2d");
    if (!context) {
      setNotice("Could not prepare the capture. Use upload instead.");
      return;
    }
    context.drawImage(video, 0, 0, canvas.width, canvas.height);
    const blob = await new Promise<Blob | null>((resolve) => canvas.toBlob(resolve, "image/jpeg", 0.92));
    if (!blob) {
      setNotice("Could not capture the image. Try again.");
      return;
    }
    stopCamera();
    resetCapturedImage();
    const file = new File([blob], "mobile-capture.jpg", { type: "image/jpeg" });
    setCapturedFile(file);
    setCapturedImageUrl(URL.createObjectURL(file));
    setMode("PREVIEW");
    setNotice(activeIntent === "BARCODE" ? "Barcode captured. Accept it, retake it, or cancel." : "Photo captured. Accept it, retake it, or cancel.");
    if (activeIntent === "BARCODE") void readBarcode(file);
  }

  function closeCamera() {
    stopCamera();
    setStartingCamera(false);
    setMode("READY");
    setNotice("Capture canceled. Choose Photo or Barcode Scan when ready.");
  }

  function retake() {
    resetCapturedImage();
    clearFileInputs();
    if (activeIntent === "DOCUMENT" && captureKind === "ID") { setMode("READY"); setFrontScannerOpen(true); }
    else if (activeIntent === "DOCUMENT") { setMode("READY"); setDocumentScannerOpen(true); }
    else if (activeIntent === "BARCODE") { setMode("READY"); setScannerOpen(true); }
    else void startCamera(activeIntent);
  }

  async function sendFile(file: File | null) {
    if (!file) return;
    if (busy) return;
    const validationError = validateFile(file);
    if (validationError) {
      clearFileInputs();
      setNotice(validationError);
      return;
    }
    setBusy(true);
    setResult(null);
    setNotice(`Sending to ${destination.label} review...`);
    try {
      const ownerLabel = reference.trim() || `${destination.label} mobile capture inbox`;
      const form = new FormData();
      form.append("file", file);
      form.append("console", destination.console);
      form.append("intent", destination.intent);
      form.append("ownerType", destination.ownerType);
      form.append("ownerLabel", ownerLabel);
      form.append("ownerId", destinationKey === "QUICK_UPDATE" && requestedOwnerId ? requestedOwnerId : `${destination.key.toLowerCase()}-${slug(ownerLabel)}`);
      form.append("purpose", `${destination.label} mobile capture${captureKind === "AUTO" ? "" : ` - ${captureKind.toLowerCase().replaceAll("_", " ")}`}.`);
      form.append("reason", note.trim() || `Mobile capture routed to ${destination.label}.`);
      const documentType = destinationKey === "QUICK_UPDATE" ? "QUICK_UPDATE_PHOTO" : documentTypeByKind[captureKind];
      if (documentType) form.append("documentType", documentType);
      const response = await fetch("/api/document-library/uploads", {
        body: form,
        method: "POST"
      });
      const body = await response.json().catch(() => null) as UploadResponse | null;
      if (!response.ok) {
        setNotice(body?.error ?? "Capture could not be sent.");
        return;
      }
      setResult(body);
      setMode("SENT");
      setNotice(body?.smartIntake ? `${body.smartIntake.classificationLabel} sent to ${destination.label} review.` : `Capture sent to ${destination.label} review.`);
      resetCapturedImage();
      clearFileInputs();
    } catch {
      setNotice("Capture could not reach the document service. Keep this preview open and try Accept again.");
    } finally {
      setBusy(false);
    }
  }

  async function sendCapture() {
    if (busy) return;
    await sendFile(capturedFile);
  }

  const DestinationIcon = destination.icon;

  return (
    <main className={styles.page} aria-labelledby="mobile-capture-title">
      <header className={styles.header}>
        <Link href={returnTo?.startsWith("/") && !returnTo.startsWith("//") && !returnTo.includes("\\") ? returnTo : "/"}>Back</Link>
        <span>Mobile tool</span>
      </header>

      <section className={styles.hero}>
        <div>
          <span><Camera size={16} /> Capture</span>
          <h1 id="mobile-capture-title">Scan or capture</h1>
        </div>
        <p aria-live="polite">{notice}</p>
      </section>

      <section className={styles.toolPanel} aria-label="Capture destination">
        <h2>Send to</h2>
        <div className={styles.destinationGrid}>
          {destinations.filter((item) => item.key !== "QUICK_UPDATE" || requestedOwnerId).map((item) => {
            const Icon = item.icon;
            return (
              <button
                className={item.key === destinationKey ? styles.selectedDestination : ""}
                disabled={busy || mode === "CAMERA" || mode === "PREVIEW"}
                key={item.key}
                onClick={() => setDestinationKey(item.key)}
                aria-pressed={item.key === destinationKey}
                type="button"
              >
                <Icon size={20} />
                <span>{item.label}</span>
              </button>
            );
          })}
        </div>
        <label className={styles.field}>
          <span>{destination.prompt}</span>
          <input disabled={busy} maxLength={120} onChange={(event) => setReference(event.target.value)} placeholder="Leave blank to send to review inbox" value={reference} />
        </label>
        <label className={styles.field}>
          <span>Note</span>
          <input disabled={busy} maxLength={180} onChange={(event) => setNote(event.target.value)} placeholder="Optional short reason or instruction" value={note} />
        </label>
        <div className={styles.routeSummary}>
          <DestinationIcon size={18} />
          <span>{reference.trim() ? `Ready for ${destination.label}: ${reference.trim()}` : `No exact ${destination.label.toLowerCase()} selected. This will land in ${destination.label} review.`}</span>
        </div>
      </section>

      <section className={styles.kindPanel} aria-label="Capture type">
        {captureKinds.map((item) => (
          <button aria-pressed={item.key === captureKind} className={item.key === captureKind ? styles.selectedKind : ""} disabled={busy} key={item.key} onClick={() => setCaptureKind(item.key)} type="button">
            {item.key === "ID" ? <IdCard size={16} /> : null}
            {item.label}
          </button>
        ))}
      </section>

      <section aria-busy={busy} className={styles.actions} aria-label="Capture actions">
        <button aria-pressed={activeIntent === "PHOTO" && mode !== "SENT"} disabled={busy} onClick={startPhotoCapture} type="button"><Camera size={20} /> Photo</button>
        <button aria-pressed={activeIntent === "BARCODE" && mode !== "SENT"} disabled={busy} onClick={startBarcodeCapture} type="button"><ScanBarcode size={20} /> Scan barcode / QR</button>
        <button disabled={busy} onClick={() => { setCaptureKind("ID"); setActiveIntent("BARCODE"); setScannerOpen(true); }} type="button"><IdCard size={20} /> Scan ID barcode</button>
        <button disabled={busy} onClick={() => { setCaptureKind("ID"); setActiveIntent("DOCUMENT"); setFrontScannerOpen(true); }} type="button"><IdCard size={20} /> Capture ID front / back</button>
        <button disabled={busy} onClick={startDocumentCapture} type="button"><FileText size={20} /> Scan document</button>
        <input
          accept="image/*"
          capture="environment"
          className={styles.nativeCameraInput}
          disabled={busy}
          onChange={(event) => previewFile(event.currentTarget.files?.[0] ?? null)}
          ref={cameraUploadRef}
          type="file"
        />
        <label>
          <UploadCloud size={20} />
          Upload
          <input accept="application/pdf,image/*,text/plain" disabled={busy} onChange={(event) => void sendFile(event.currentTarget.files?.[0] ?? null)} ref={fileUploadRef} type="file" />
        </label>
      </section>

      {frontScannerOpen ? <IdFrontCapture onClose={() => setFrontScannerOpen(false)} onComplete={(file, fields, mismatch) => {
        resetCapturedImage();
        setReviewedIdFields(fields);
        setCapturedFile(file);
        setCapturedImageUrl(URL.createObjectURL(file));
        setFrontScannerOpen(false);
        if (mismatch) setNote((current) => `ID front/back mismatch; manual review required. ${current}`.trim().slice(0, 180));
        setMode("PREVIEW");
        setNotice("Reviewed ID capture ready. Choose Accept and send to file the images for review, or copy the reviewed fields for your intake form.");
      }} /> : null}

      {documentScannerOpen ? <DocumentScanner onClose={() => setDocumentScannerOpen(false)} onComplete={(file) => {
        resetCapturedImage();
        setCapturedFile(file);
        setCapturedImageUrl(URL.createObjectURL(file));
        setDocumentScannerOpen(false);
        setMode("PREVIEW");
        setNotice("PDF ready. Review every page, then accept and send to your selected destination.");
      }} /> : null}

      {scannerOpen ? <BarcodeScanner idOnly={captureKind === "ID"} onClose={() => setScannerOpen(false)} onConfirm={(scan, image) => {
        resetCapturedImage();
        setBarcode(scan);
        setBarcodeNotice(captureKind === "ID" ? "ID fields reviewed. Copy the ID number only when needed, or send the captured photo for customer-file review. No customer record has been changed." : "Code confirmed. Use the VIN, copy the value, or send the photo for review.");
        if (image) { setCapturedFile(image); setCapturedImageUrl(URL.createObjectURL(image)); }
        setScannerOpen(false);
        setMode("PREVIEW");
        setNotice("Code ready. Choose what to do next.");
      }} /> : null}

      {mode === "CAMERA" ? (
        <section className={styles.cameraOverlay} aria-label="Camera scanner">
          <header>
            <span>{activeIntent === "BARCODE" ? "Barcode scan" : "Photo capture"}</span>
            <strong>{activeIntent === "BARCODE" ? "Center the barcode and capture" : "Frame the photo and capture"}</strong>
          </header>
          <video muted playsInline ref={videoRef} />
          <span aria-hidden="true" />
          <footer>
            <button disabled={busy || startingCamera} onClick={() => void captureImage()} type="button"><Camera size={22} /> {startingCamera ? "Starting…" : "Capture"}</button>
            <button onClick={closeCamera} type="button"><X size={22} /> Close</button>
          </footer>
        </section>
      ) : null}

      {mode === "PREVIEW" ? (
        <section className={styles.previewOverlay} aria-label="Capture preview">
          <header>
            <span>{activeIntent === "DOCUMENT" ? "Document review" : activeIntent === "BARCODE" ? "Barcode review" : "Photo review"}</span>
            <strong>Accept, retake, or cancel</strong>
          </header>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          {capturedFile?.type === "application/pdf" ? <iframe src={capturedImageUrl} title="Document PDF preview" style={{ width: "100%", height: "100%", minHeight: 0, border: 0, background: "white" }} /> : capturedImageUrl ? <img alt="Captured scan preview" src={capturedImageUrl} /> : <p>Code ready for review</p>}
          <div className={styles.barcodeReview} aria-live="polite">
            {capturedFile?.type === "application/pdf" ? <a href={capturedImageUrl} target="_blank" rel="noreferrer">Open PDF preview</a> : <button disabled={!capturedFile || readingBarcode || busy} onClick={() => void readBarcode()} type="button">{readingBarcode ? "Reading..." : activeIntent === "BARCODE" ? "Read again" : "Read barcode"}</button>}
            {barcodeNotice ? <p>{barcodeNotice}</p> : null}
            {reviewedIdFields ? <><p>Reviewed ID: {reviewedIdFields.fullName || "Name not entered"} · {reviewedIdFields.issuingState || "State not entered"} · ID ending {reviewedIdFields.licenseNumber.slice(-4) || "not entered"}</p><button onClick={async () => { try { await navigator.clipboard.writeText(JSON.stringify(reviewedIdFields, null, 2)); setBarcodeNotice("Reviewed fields copied. Paste only into the intended customer intake form."); } catch { setBarcodeNotice("Copy is unavailable in this browser."); } }} type="button">Copy reviewed ID fields</button></> : null}
            {scannedVin ? <Link href={`/vehicles/workflows/add-vehicle?vin=${encodeURIComponent(scannedVin)}`}>Use VIN {scannedVin}</Link> : null}
            {idFields?.number ? <p>ID: {idFields.name || "Name unavailable"} · {idFields.state || "State unavailable"} · ending {idFields.number.slice(-4)}</p> : null}
            {idFields?.number ? <button onClick={() => void copyIdNumber()} type="button">Copy ID number</button> : null}
            {barcode && !scannedVin && !idFields?.number && barcode.format !== "PDF_417" ? <><p>{barcode.format}: {barcode.value.slice(0, 80)}</p><button onClick={() => void copyBarcode()} type="button">Copy barcode</button></> : null}
            {barcode?.format === "PDF_417" && !idFields?.number ? <p>PDF417 read. Review the captured ID photo to confirm its details.</p> : null}
          </div>
          <footer>
            <button disabled={busy || !capturedFile} onClick={() => void sendCapture()} type="button"><Send size={20} /> {busy ? "Sending..." : "Accept and send"}</button>
            <button disabled={busy} onClick={retake} type="button"><RotateCcw size={20} /> Retake</button>
            <button disabled={busy} onClick={() => { resetCapturedImage(); clearFileInputs(); setMode("READY"); setNotice("Capture canceled. Choose Photo or Barcode Scan when ready."); }} type="button"><X size={20} /> Cancel</button>
          </footer>
        </section>
      ) : null}

      {mode === "SENT" ? (
        <section className={styles.sentPanel} aria-label="Capture result">
          <CheckCircle2 size={26} />
          <div>
            <span><DestinationIcon size={16} /> {destination.label} review</span>
            <h2>{result?.smartIntake?.classificationLabel ?? "Capture sent"}</h2>
            <p>{result?.smartIntake ? `${result.smartIntake.classificationConfidence}% OCR confidence. Review lane: ${result.smartIntake.routingTarget.replaceAll("_", " ").toLowerCase()}.` : "The file is staged for review."}</p>
          </div>
          {result?.smartIntake?.warnings?.length ? <ul aria-label="Document review notes">{result.smartIntake.warnings.map((warning, index) => <li key={`${index}-${warning}`}>{warning}</li>)}</ul> : null}
          {result?.smartIntake?.extractedFields?.length ? (
            <dl>
              {result.smartIntake.extractedFields.slice(0, 4).map((field) => (
                <div key={field.key}>
                  <dt>{field.label}</dt>
                  <dd>{field.value}</dd>
                </div>
              ))}
            </dl>
          ) : null}
          <div className={styles.sentActions}>
            <button onClick={() => { setMode("READY"); setResult(null); setNotice("Choose Photo or Barcode Scan to start capture."); }} type="button">Capture another</button>
            <Link href={destinationKey === "QUICK_UPDATE" && requestedOwnerId ? `/documents?ownerId=${encodeURIComponent(requestedOwnerId)}#smart-intake` : "/documents"}>Review queue</Link>
          </div>
        </section>
      ) : null}

      <canvas ref={canvasRef} />
    </main>
  );
}
