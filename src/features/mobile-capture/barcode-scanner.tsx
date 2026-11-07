"use client";

import { useEffect, useId, useRef, useState } from "react";
import { Camera, Check, Flashlight, RotateCcw, SwitchCamera, UploadCloud, X } from "lucide-react";
import { createPortal } from "react-dom";
import { idFromBarcode, vinFromBarcode } from "./barcode-review";
import { cameraErrorMessage, createCameraSession } from "./scanner-camera";
import styles from "./barcode-scanner.module.css";

export type ScanResult = { format: string; value: string };

export function BarcodeScanner({ vinOnly = false, idOnly = false, onClose, onConfirm }: {
  vinOnly?: boolean;
  idOnly?: boolean;
  onClose: () => void;
  onConfirm: (result: ScanResult, image?: File) => void;
}) {
  const titleId = useId();
  const [facing, setFacing] = useState("environment");
  const [cameraId, setCameraId] = useState("");
  const [cameras, setCameras] = useState<Array<{ id: string; label: string }>>([]);
  const [zoomRange, setZoomRange] = useState<{ min: number; max: number; step: number } | null>(null);
  const [zoom, setZoom] = useState(1);
  const [attempt, setAttempt] = useState(0);
  const [status, setStatus] = useState("Starting camera…");
  const [result, setResult] = useState<ScanResult | null>(null);
  const [image, setImage] = useState<File>();
  const [manual, setManual] = useState("");
  const [torchAvailable, setTorchAvailable] = useState(false);
  const [torch, setTorch] = useState(false);
  const [reading, setReading] = useState(false);
  const [idConfirmed, setIdConfirmed] = useState(false);
  const [revealId, setRevealId] = useState(false);
  const idFields = result && idOnly ? idFromBarcode(result.value) : null;
  const videoRef = useRef<HTMLVideoElement>(null);
  const dialogRef = useRef<HTMLDivElement>(null);
  const uploadRef = useRef<HTMLInputElement>(null);
  const trackRef = useRef<MediaStreamTrack | null>(null);
  const stopRef = useRef<() => void>(() => {});
  const fileSequence = useRef(0);
  const constraintSequence = useRef(0);
  const closeRef = useRef(onClose);
  useEffect(() => { closeRef.current = onClose; }, [onClose]);

  useEffect(() => {
    const previousFocus = document.activeElement instanceof HTMLElement ? document.activeElement : null;
    const overflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    dialogRef.current?.focus();
    function keyboard(event: KeyboardEvent) {
      if (event.key === "Escape") closeRef.current();
      if (event.key !== "Tab") return;
      const controls = Array.from(dialogRef.current?.querySelectorAll<HTMLElement>('button:not(:disabled), input:not(:disabled):not([type="file"]), select:not(:disabled)') ?? []);
      const first = controls[0], last = controls.at(-1);
      if (event.shiftKey && (document.activeElement === first || document.activeElement === dialogRef.current)) { event.preventDefault(); last?.focus(); }
      else if (!event.shiftKey && document.activeElement === last) { event.preventDefault(); first?.focus(); }
    }
    document.addEventListener("keydown", keyboard);
    return () => {
      fileSequence.current += 1;
      document.body.style.overflow = overflow;
      document.removeEventListener("keydown", keyboard);
      previousFocus?.focus();
    };
  }, []);

  useEffect(() => {
    const video = videoRef.current;
    if (!video || result) return;
    const session = createCameraSession();
    let cancelled = false;
    let timer: ReturnType<typeof setTimeout> | undefined;
    function stop() {
      cancelled = true;
      clearTimeout(timer);
      session.stop();
      trackRef.current = null;
      constraintSequence.current += 1;
      video!.srcObject = null;
    }
    stopRef.current = stop;
    async function start() {
      if (!window.isSecureContext || !navigator.mediaDevices?.getUserMedia) {
        setStatus("Live camera needs HTTPS or localhost in a supported browser. On your phone, use the app’s reachable HTTPS address. Localhost on the phone refers to the phone itself. You can also choose a photo or return to manual intake.");
        return;
      }
      try {
        const { BarcodeFormat, BrowserMultiFormatReader, BrowserPDF417Reader } = await import("@zxing/browser");
        if (cancelled) return;
        const reader = idOnly ? new BrowserPDF417Reader() : new BrowserMultiFormatReader();
        const stream = await session.open(video!, facing, cameraId);
        if (!stream || cancelled) return;
        trackRef.current = stream.getVideoTracks()[0] ?? null;
        const capabilities = trackRef.current?.getCapabilities?.() as (MediaTrackCapabilities & { torch?: boolean; zoom?: { min: number; max: number; step: number }; focusMode?: string[] }) | undefined;
        setTorchAvailable(Boolean(capabilities?.torch));
        const range = capabilities?.zoom;
        setZoomRange(range && Number.isFinite(range.min) && Number.isFinite(range.max) && range.max > range.min ? { ...range, step: range.step > 0 ? range.step : 0.1 } : null);
        const settings = (trackRef.current?.getSettings?.() ?? {}) as MediaTrackSettings & { zoom?: number };
        setZoom(settings.zoom ?? range?.min ?? 1);
        if (capabilities?.focusMode?.includes("continuous")) {
          await trackRef.current?.applyConstraints({ advanced: [{ focusMode: "continuous" } as MediaTrackConstraintSet] }).catch(() => {});
        }
        if (cancelled) return;
        if (navigator.mediaDevices.enumerateDevices) {
          const devices = await navigator.mediaDevices.enumerateDevices().catch(() => []);
          if (cancelled) return;
          setCameras(devices.filter(device => device.kind === "videoinput" && device.deviceId).map((device, index) => ({ id: device.deviceId, label: device.label || `Camera ${index + 1}` })));
        }
        setStatus(idOnly ? "Turn the ID over. Hold the wide PDF417 barcode flat inside the guide. Move closer until the bars look sharp." : vinOnly ? "Aim at the VIN barcode or a QR code containing a VIN. Scanning is automatic." : "Aim at a barcode or QR code. Scanning is automatic.");
        const scanStartedAt = Date.now();
        function scan() {
          if (cancelled) return;
          try {
            if (video!.readyState >= 2) {
              const decoded = reader.decode(video!);
              const value = vinOnly ? vinFromBarcode(decoded.getText()) : decoded.getText().trim();
              if (idOnly && !idFromBarcode(decoded.getText())) { setStatus("Barcode read, but recognizable ID fields were not found. Check the back of the ID or enter details in the customer form."); timer = setTimeout(scan, 500); return; }
              if (value) {
                const canvas = document.createElement("canvas");
                canvas.width = video!.videoWidth;
                canvas.height = video!.videoHeight;
                canvas.getContext("2d")?.drawImage(video!, 0, 0);
                canvas.toBlob((blob) => {
                  if (cancelled) return;
                  setImage(blob ? new File([blob], "barcode-scan.jpg", { type: "image/jpeg" }) : undefined);
                  setResult({ format: BarcodeFormat[decoded.getBarcodeFormat()], value });
                  setStatus("Code found. Check the result before continuing.");
                }, "image/jpeg", 0.92);
                session.stop();
                return;
              }
              setStatus("Code read, but no 17-character VIN was found. Try the vehicle’s VIN barcode or enter it below.");
            }
          } catch {
            if (Date.now() - scanStartedAt > 10000) setStatus(idOnly ? "Still looking for the ID barcode. Fill the guide with the entire stacked barcode, tilt away from glare, or choose a sharper photo." : "Still looking for a VIN. Try the door-jamb label, switch cameras or adjust zoom. You can also enter the VIN below.");
          }
          timer = setTimeout(scan, 300);
        }
        scan();
      } catch (error) {
        session.stop();
        if (!cancelled) setStatus(cameraErrorMessage(error));
      }
    }
    void start();
    function visibility() {
      if (document.hidden) { stop(); setStatus("Camera paused while the app was in the background. Tap Try again to resume."); }
    }
    document.addEventListener("visibilitychange", visibility);
    return () => { stop(); document.removeEventListener("visibilitychange", visibility); };
  }, [attempt, facing, result, vinOnly, idOnly, cameraId]);

  async function readPhoto(file: File | undefined) {
    if (!file) return;
    if (!file.type.startsWith("image/") || file.size > 25 * 1024 * 1024) { setStatus("Choose an image under 25 MB."); return; }
    const sequence = ++fileSequence.current;
    stopRef.current();
    setReading(true);
    setStatus("Reading photo…");
    const url = URL.createObjectURL(file);
    try {
      const { BarcodeFormat, BrowserMultiFormatReader, BrowserPDF417Reader } = await import("@zxing/browser");
      const decoded = await (idOnly ? new BrowserPDF417Reader() : new BrowserMultiFormatReader()).decodeFromImageUrl(url);
      if (sequence !== fileSequence.current) return;
      const value = vinOnly ? vinFromBarcode(decoded.getText()) : decoded.getText().trim();
      if (idOnly && !idFromBarcode(decoded.getText())) { setStatus("This barcode did not contain recognizable ID fields. Use a clear photo of the barcode on the back of the ID."); return; }
      if (!value) { setStatus("No VIN in this code. Choose a VIN barcode photo or enter the VIN."); return; }
      setImage(file);
      setResult({ format: BarcodeFormat[decoded.getBarcodeFormat()], value });
      setStatus("Code found. Check the result before continuing.");
    } catch {
      if (sequence === fileSequence.current) setStatus("No readable code found. Choose a sharper photo with the whole code visible, or try the camera again.");
    } finally {
      URL.revokeObjectURL(url);
      if (sequence === fileSequence.current) setReading(false);
    }
  }

  async function toggleTorch() {
    const track = trackRef.current;
    if (!track || track.readyState !== "live") { setStatus("Camera is paused. Tap Try again before using the light."); return; }
    try {
      await track.applyConstraints({ advanced: [{ torch: !torch } as MediaTrackConstraintSet] });
      setTorch(!torch);
    } catch { setStatus("Flashlight is unavailable on this camera. Move to a brighter area."); }
  }

  async function changeZoom(value: number) {
    const track = trackRef.current;
    if (!track || track.readyState !== "live" || !zoomRange) return;
    const request = ++constraintSequence.current;
    try {
      await track.applyConstraints({ advanced: [{ zoom: value } as MediaTrackConstraintSet] });
      if (trackRef.current === track && request === constraintSequence.current) setZoom(value);
    } catch { if (trackRef.current === track) setStatus("This camera could not adjust zoom. Move the phone closer while keeping the whole code visible."); }
  }

  function retry() {
    fileSequence.current += 1;
    setReading(false);
    setResult(null);
    setImage(undefined);
    setTorch(false);
    setIdConfirmed(false);
    setRevealId(false);
    setTorchAvailable(false);
    setZoomRange(null);
    setStatus("Starting camera…");
    setAttempt((current) => current + 1);
  }

  function reviewManual() {
    const value = vinOnly ? vinFromBarcode(manual) : manual.trim();
    if (!value) { setStatus(vinOnly ? "Enter a complete 17-character VIN. VINs do not contain I, O or Q." : "Enter a code before continuing."); return; }
    fileSequence.current += 1;
    stopRef.current();
    setReading(false);
    setImage(undefined);
    setResult({ format: "MANUAL", value });
    setStatus("Check the entered value before continuing.");
  }

  return createPortal(<div className={styles.backdrop}>
    <div aria-labelledby={titleId} aria-modal="true" className={styles.dialog} ref={dialogRef} role="dialog" tabIndex={-1}>
      <header><div><span>{idOnly ? "ID capture · back of card" : "Camera scanner"}</span><h2 id={titleId}>{idOnly ? "Scan ID barcode" : vinOnly ? "Scan vehicle VIN" : "Scan barcode or QR"}</h2></div><button aria-label="Close scanner" onClick={onClose} type="button"><X /></button></header>
      <div className={styles.viewfinder}>
        <video autoPlay muted playsInline ref={videoRef} hidden={Boolean(result)} />
        {result ? <div className={styles.result}><Check size={36} /><strong>{idOnly ? "Review ID details" : result.format === "MANUAL" ? vinOnly ? "VIN entered" : "Code entered" : "Code found"}</strong>{idOnly ? <dl className={styles.idDetails}><div><dt>Name</dt><dd>{idFields?.name || "Not available"}</dd></div><div><dt>Issuing state</dt><dd>{idFields?.state || "Not available"}</dd></div><div><dt>ID number</dt><dd>{revealId ? idFields?.number : `•••• ${idFields?.number.slice(-4) ?? ""}`}</dd></div></dl> : <code>{result.value}</code>}<p>{idOnly ? "Compare these fields with the front of the card. Reading a barcode does not verify identity or card authenticity." : "Confirm against the vehicle or label. Scanned links are never opened automatically."}</p></div> : <div aria-hidden="true" className={`${styles.guide} ${idOnly ? styles.idGuide : ""}`}><Camera /><span>{idOnly ? "Back of ID · wide barcode" : vinOnly ? "VIN barcode / QR" : "Barcode / QR code"}</span></div>}
      </div>
      <p className={styles.status} role="status">{status}</p>
      {result ? <>{idOnly ? <div className={styles.idReview}><button aria-pressed={revealId} onClick={() => setRevealId(!revealId)} type="button">{revealId ? "Hide ID number" : "Show ID number"}</button><label><input checked={idConfirmed} onChange={(event) => setIdConfirmed(event.target.checked)} type="checkbox" /> I checked these details against the front of the ID.</label><p>Details stay in this capture session until you choose an action. No customer record is changed automatically.</p></div> : null}<div className={styles.controls}><button className={styles.primary} disabled={idOnly && (!idFields || !idConfirmed)} onClick={() => onConfirm(result, image)} type="button"><Check />{idOnly ? "Use reviewed ID" : vinOnly ? "Use this VIN" : "Use this code"}</button><button onClick={retry} type="button"><RotateCcw />Scan again</button></div></> : <>
        <div className={styles.controls}><button disabled={reading} onClick={retry} type="button"><RotateCcw />Try again</button><button disabled={reading} onClick={() => { retry(); setCameraId(""); setFacing((current) => current === "environment" ? "user" : "environment"); }} type="button"><SwitchCamera />Flip camera</button>{torchAvailable ? <button aria-pressed={torch} onClick={() => void toggleTorch()} type="button"><Flashlight />Light {torch ? "on" : "off"}</button> : null}<button disabled={reading} onClick={() => uploadRef.current?.click()} type="button"><UploadCloud />Choose photo</button></div>
        {(cameras.length > 1 || zoomRange) && <div className={styles.cameraSettings}>
          {cameras.length > 1 && <label>Camera<select value={cameraId} disabled={reading} onChange={event => { retry(); setCameraId(event.target.value); }}><option value="">Automatic rear camera</option>{cameras.map(camera => <option key={camera.id} value={camera.id}>{camera.label}</option>)}</select></label>}
          {zoomRange && <label>Zoom · {zoom.toFixed(1)}×<input aria-label="Camera zoom" type="range" min={zoomRange.min} max={zoomRange.max} step={zoomRange.step} value={zoom} disabled={reading} onChange={event => void changeZoom(Number(event.target.value))} /></label>}
        </div>}
        <p className={styles.tip}>{idOnly ? "1. Turn the card over. 2. Keep the entire stacked barcode visible. 3. Hold steady and tilt slightly to remove glare. If it will not read, choose a sharp photo. Not all IDs use a supported PDF417 format." : "Hold steady, keep the entire code visible, and avoid glare. For an ID, scan the barcode on the back."}</p>
        {!idOnly ? <div className={styles.manual}><label htmlFor={`${titleId}-code`}>{vinOnly ? "Enter VIN instead" : "Enter code instead"}</label><input autoCapitalize={vinOnly ? "characters" : "off"} autoComplete="off" id={`${titleId}-code`} maxLength={vinOnly ? 17 : 120} onChange={(event) => setManual(vinOnly ? event.target.value.toUpperCase() : event.target.value)} onKeyDown={(event) => { if (event.key === "Enter") { event.preventDefault(); reviewManual(); } }} placeholder={vinOnly ? "17-character VIN" : "Type or use a connected barcode reader"} value={manual} /><button disabled={vinOnly ? !vinFromBarcode(manual) : !manual.trim()} onClick={reviewManual} type="button">{vinOnly ? "Review VIN" : "Review code"}</button></div> : null}
      </>}
      <input accept="image/*" hidden onChange={(event) => { void readPhoto(event.target.files?.[0]); event.target.value = ""; }} ref={uploadRef} type="file" />
    </div>
  </div>, document.body);
}
