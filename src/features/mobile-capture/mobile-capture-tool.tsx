"use client";

import { useEffect, useMemo, useRef, useState } from "react";
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
  Send,
  UploadCloud,
  UserRound,
  Wrench,
  X
} from "lucide-react";

import styles from "./mobile-capture-tool.module.css";

type CaptureDestinationKey = "CUSTOMER" | "VEHICLE" | "CLAIM" | "REPAIR_ORDER" | "TASK" | "VENDOR" | "GENERAL";
type CaptureKindKey = "AUTO" | "PHOTO" | "ID" | "BUSINESS_CARD" | "ESTIMATE" | "DOCUMENT";
type CaptureMode = "READY" | "CAMERA" | "PREVIEW" | "SENT";

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
  const [destinationKey, setDestinationKey] = useState<CaptureDestinationKey>("CLAIM");
  const [captureKind, setCaptureKind] = useState<CaptureKindKey>("AUTO");
  const [reference, setReference] = useState("");
  const [note, setNote] = useState("");
  const [mode, setMode] = useState<CaptureMode>("READY");
  const [notice, setNotice] = useState("Choose where this scan belongs, then capture or upload.");
  const [busy, setBusy] = useState(false);
  const [capturedImageUrl, setCapturedImageUrl] = useState("");
  const [result, setResult] = useState<UploadResponse | null>(null);
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const cameraUploadRef = useRef<HTMLInputElement | null>(null);
  const streamRef = useRef<MediaStream | null>(null);

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

  async function startCamera() {
    setResult(null);
    setNotice("Opening camera...");
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
      setNotice("Fill the screen with the document or photo, then capture.");
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

  async function captureImage() {
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
    if (capturedImageUrl) URL.revokeObjectURL(capturedImageUrl);
    setCapturedImageUrl(URL.createObjectURL(blob));
    setMode("PREVIEW");
    setNotice("Review the image, then send it to the selected destination.");
  }

  function closeCamera() {
    stopCamera();
    setMode("READY");
    setNotice("Camera closed. You can scan again or upload a file.");
  }

  function retake() {
    if (capturedImageUrl) URL.revokeObjectURL(capturedImageUrl);
    setCapturedImageUrl("");
    void startCamera();
  }

  async function sendFile(file: File | null) {
    if (!file) return;
    setBusy(true);
    setResult(null);
    try {
      const ownerLabel = reference.trim() || `${destination.label} mobile capture inbox`;
      const form = new FormData();
      form.append("file", file);
      form.append("console", destination.console);
      form.append("intent", destination.intent);
      form.append("ownerType", destination.ownerType);
      form.append("ownerLabel", ownerLabel);
      form.append("ownerId", `${destination.key.toLowerCase()}-${slug(ownerLabel)}`);
      form.append("purpose", `${destination.label} mobile capture${captureKind === "AUTO" ? "" : ` - ${captureKind.toLowerCase().replaceAll("_", " ")}`}.`);
      form.append("reason", note.trim() || `Mobile capture routed to ${destination.label}.`);
      const documentType = documentTypeByKind[captureKind];
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
      if (capturedImageUrl) URL.revokeObjectURL(capturedImageUrl);
      setCapturedImageUrl("");
    } catch {
      setNotice("Capture could not reach the document service.");
    } finally {
      setBusy(false);
    }
  }

  async function sendCapture() {
    if (!capturedImageUrl) return;
    const response = await fetch(capturedImageUrl);
    const blob = await response.blob();
    await sendFile(new File([blob], `mobile-capture-${Date.now()}.jpg`, { type: "image/jpeg" }));
  }

  const DestinationIcon = destination.icon;

  return (
    <main className={styles.page} aria-labelledby="mobile-capture-title">
      <header className={styles.header}>
        <Link href="/">Home</Link>
        <span>Mobile tool</span>
      </header>

      <section className={styles.hero}>
        <div>
          <span><Camera size={16} /> Capture</span>
          <h1 id="mobile-capture-title">Scan and send</h1>
        </div>
        <p>{notice}</p>
      </section>

      <section className={styles.toolPanel} aria-label="Capture destination">
        <h2>Send to</h2>
        <div className={styles.destinationGrid}>
          {destinations.map((item) => {
            const Icon = item.icon;
            return (
              <button
                className={item.key === destinationKey ? styles.selectedDestination : ""}
                key={item.key}
                onClick={() => setDestinationKey(item.key)}
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
          <input onChange={(event) => setReference(event.target.value)} placeholder="Leave blank to send to review inbox" value={reference} />
        </label>
        <label className={styles.field}>
          <span>Note</span>
          <input onChange={(event) => setNote(event.target.value)} placeholder="Optional short reason or instruction" value={note} />
        </label>
      </section>

      <section className={styles.kindPanel} aria-label="Capture type">
        {captureKinds.map((item) => (
          <button className={item.key === captureKind ? styles.selectedKind : ""} key={item.key} onClick={() => setCaptureKind(item.key)} type="button">
            {item.key === "ID" ? <IdCard size={16} /> : null}
            {item.label}
          </button>
        ))}
      </section>

      <section className={styles.actions} aria-label="Capture actions">
        <button disabled={busy} onClick={() => void startCamera()} type="button"><Camera size={20} /> Scan / photo</button>
        <input
          accept="image/*"
          capture="environment"
          className={styles.nativeCameraInput}
          disabled={busy}
          onChange={(event) => void sendFile(event.currentTarget.files?.[0] ?? null)}
          ref={cameraUploadRef}
          type="file"
        />
        <label>
          <UploadCloud size={20} />
          Upload
          <input accept="application/pdf,image/*,text/plain" disabled={busy} onChange={(event) => void sendFile(event.currentTarget.files?.[0] ?? null)} type="file" />
        </label>
      </section>

      {mode === "CAMERA" ? (
        <section className={styles.cameraOverlay} aria-label="Camera scanner">
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
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img alt="Captured scan preview" src={capturedImageUrl} />
          <footer>
            <button disabled={busy} onClick={() => void sendCapture()} type="button"><Send size={20} /> {busy ? "Sending..." : "Send"}</button>
            <button disabled={busy} onClick={retake} type="button"><RotateCcw size={20} /> Retake</button>
            <button disabled={busy} onClick={() => setMode("READY")} type="button"><X size={20} /> Cancel</button>
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
            <button onClick={() => { setMode("READY"); setResult(null); setNotice("Ready for the next scan."); }} type="button">Scan another</button>
            <Link href="/documents">Review queue</Link>
          </div>
        </section>
      ) : null}

      <canvas ref={canvasRef} />
    </main>
  );
}
