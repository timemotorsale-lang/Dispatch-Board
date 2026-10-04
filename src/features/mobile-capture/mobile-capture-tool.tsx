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

type CaptureDestinationKey = "CUSTOMER" | "VEHICLE" | "CLAIM" | "REPAIR_ORDER" | "TASK" | "VENDOR" | "GENERAL" | "QUICK_UPDATE";
type CaptureKindKey = "AUTO" | "PHOTO" | "ID" | "BUSINESS_CARD" | "ESTIMATE" | "DOCUMENT";
type CaptureMode = "READY" | "CAMERA" | "PREVIEW" | "SENT";
type CaptureIntent = "PHOTO" | "BARCODE";
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
  const [result, setResult] = useState<UploadResponse | null>(null);
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const cameraUploadRef = useRef<HTMLInputElement | null>(null);
  const fileUploadRef = useRef<HTMLInputElement | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const returnTo = searchParams.get("returnTo");
  const requestedOwnerId = searchParams.get("ownerId");

  const destination = useMemo(
    () => destinations.find((item) => item.key === destinationKey) ?? destinations[0],
    [destinationKey]
  );

  useEffect(() => () => {
    streamRef.current?.getTracks().forEach((track) => track.stop());
    if (capturedImageUrl) URL.revokeObjectURL(capturedImageUrl);
  }, [capturedImageUrl]);

  function stopCamera() {
    streamRef.current?.getTracks().forEach((track) => track.stop());
    streamRef.current = null;
    if (videoRef.current) videoRef.current.srcObject = null;
  }

  function clearFileInputs() {
    if (cameraUploadRef.current) cameraUploadRef.current.value = "";
    if (fileUploadRef.current) fileUploadRef.current.value = "";
  }

  function resetCapturedImage() {
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

  const scannedVin = destinationKey === "VEHICLE" && barcode ? vinFromBarcode(barcode.value) : null;
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
    if (busy) return;
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
    try {
      stopCamera();
      const stream = await navigator.mediaDevices.getUserMedia({
        audio: false,
        video: {
          facingMode: { ideal: "environment" },
          height: { ideal: 1920 },
          width: { ideal: 1080 }
        }
      });
      streamRef.current = stream;
      setMode("CAMERA");
      setNotice(intent === "BARCODE" ? "Center the barcode in the guide, then capture." : "Fill the screen with the item, then capture.");
      requestAnimationFrame(() => {
        if (!videoRef.current) return;
        videoRef.current.srcObject = stream;
        void videoRef.current.play();
      });
    } catch {
      setNotice("Live camera permission was blocked. Opening the phone camera picker instead.");
      cameraUploadRef.current?.click();
    }
  }

  function startPhotoCapture() {
    setCaptureKind("PHOTO");
    void startCamera("PHOTO");
  }

  function startBarcodeCapture() {
    setActiveIntent("BARCODE");
    void startCamera("BARCODE");
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
    setMode("READY");
    setNotice("Capture canceled. Choose Photo or Barcode Scan when ready.");
  }

  function retake() {
    resetCapturedImage();
    clearFileInputs();
    void startCamera(activeIntent);
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
          <h1 id="mobile-capture-title">Capture and send</h1>
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
        <button aria-pressed={activeIntent === "BARCODE" && mode !== "SENT"} disabled={busy} onClick={startBarcodeCapture} type="button"><ScanBarcode size={20} /> Barcode Scan</button>
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

      {mode === "CAMERA" ? (
        <section className={styles.cameraOverlay} aria-label="Camera scanner">
          <header>
            <span>{activeIntent === "BARCODE" ? "Barcode scan" : "Photo capture"}</span>
            <strong>{activeIntent === "BARCODE" ? "Center the barcode and capture" : "Frame the photo and capture"}</strong>
          </header>
          <video muted playsInline ref={videoRef} />
          <span aria-hidden="true" />
          <footer>
            <button disabled={busy} onClick={() => void captureImage()} type="button"><Camera size={22} /> Capture</button>
            <button onClick={closeCamera} type="button"><X size={22} /> Close</button>
          </footer>
        </section>
      ) : null}

      {mode === "PREVIEW" ? (
        <section className={styles.previewOverlay} aria-label="Capture preview">
          <header>
            <span>{activeIntent === "BARCODE" ? "Barcode review" : "Photo review"}</span>
            <strong>Accept, retake, or cancel</strong>
          </header>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          {capturedFile?.type === "application/pdf" ? <p>{capturedFile.name}</p> : <img alt="Captured scan preview" src={capturedImageUrl} />}
          <div className={styles.barcodeReview} aria-live="polite">
            <button disabled={readingBarcode || busy} onClick={() => void readBarcode()} type="button">{readingBarcode ? "Reading..." : activeIntent === "BARCODE" ? "Read again" : "Read barcode"}</button>
            {barcodeNotice ? <p>{barcodeNotice}</p> : null}
            {scannedVin ? <Link href={`/vehicles/workflows/add-vehicle?vin=${encodeURIComponent(scannedVin)}`}>Use VIN {scannedVin}</Link> : null}
            {idFields?.number ? <p>ID: {idFields.name || "Name unavailable"} · {idFields.state || "State unavailable"} · ending {idFields.number.slice(-4)}</p> : null}
            {idFields?.number ? <button onClick={() => void copyIdNumber()} type="button">Copy ID number</button> : null}
            {barcode && !scannedVin && !idFields?.number && barcode.format !== "PDF_417" ? <><p>{barcode.format}: {barcode.value.slice(0, 80)}</p><button onClick={() => void copyBarcode()} type="button">Copy barcode</button></> : null}
            {barcode?.format === "PDF_417" && !idFields?.number ? <p>PDF417 read. Review the captured ID photo to confirm its details.</p> : null}
          </div>
          <footer>
            <button disabled={busy} onClick={() => void sendCapture()} type="button"><Send size={20} /> {busy ? "Sending..." : "Accept and send"}</button>
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
