"use client";

import { useEffect, useId, useRef, useState } from "react";
import { Camera, Check, Flashlight, RotateCcw, SwitchCamera, UploadCloud, X } from "lucide-react";
import { createPortal } from "react-dom";
import { idFromBarcode, vinFromBarcode } from "./barcode-review";
import { cameraErrorMessage, captureCameraFrame, createCameraSession } from "./scanner-camera";
import { createNativeBarcodeReader, createSoftwareBarcodeReader, normalizeScan, type ScanResult } from "./live-barcode-reader";
import styles from "./barcode-scanner.module.css";

export type { ScanResult } from "./live-barcode-reader";

export function BarcodeScanner({ vinOnly = false, idOnly = false, onClose, onConfirm, onUnreadablePhoto }: {
  vinOnly?: boolean;
  idOnly?: boolean;
  onClose: () => void;
  onConfirm: (result: ScanResult, image?: File) => void;
  onUnreadablePhoto?: (image: File) => void;
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
  const [unreadablePhoto, setUnreadablePhoto] = useState<File>();
  const [manual, setManual] = useState("");
  const [torchAvailable, setTorchAvailable] = useState(false);
  const [torch, setTorch] = useState(false);
  const [reading, setReading] = useState(false);
  const [cameraReady, setCameraReady] = useState(false);
  const [idConfirmed, setIdConfirmed] = useState(false);
  const [revealId, setRevealId] = useState(false);
  const idFields = result && idOnly ? idFromBarcode(result.value) : null;
  const videoRef = useRef<HTMLVideoElement>(null);
  const dialogRef = useRef<HTMLDivElement>(null);
  const uploadRef = useRef<HTMLInputElement>(null);
  const nativeRef = useRef<HTMLInputElement>(null);
  const trackRef = useRef<MediaStreamTrack | null>(null);
  const stopRef = useRef<() => void>(() => {});
  const fileSequence = useRef(0);
  const manualCapture = useRef(false);
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
        const mode = idOnly ? "id" : vinOnly ? "vin" : "all";
        let native: Awaited<ReturnType<typeof createNativeBarcodeReader>> = null;
        let nativeInFlight = false;
        void createNativeBarcodeReader(mode).then(detector => { if (!cancelled) native = detector; });
        const [stream, decode] = await Promise.all([session.open(video!, facing, cameraId), createSoftwareBarcodeReader(mode)]);
        if (!stream || cancelled) return;
        trackRef.current = stream.getVideoTracks()[0] ?? null;
        const capabilities = trackRef.current?.getCapabilities?.() as (MediaTrackCapabilities & { torch?: boolean; zoom?: { min: number; max: number; step: number }; focusMode?: string[] }) | undefined;
        setTorchAvailable(Boolean(capabilities?.torch));
        const range = capabilities?.zoom;
        setZoomRange(range && Number.isFinite(range.min) && Number.isFinite(range.max) && range.max > range.min ? { ...range, step: range.step > 0 ? range.step : 0.1 } : null);
        const settings = (trackRef.current?.getSettings?.() ?? {}) as MediaTrackSettings & { zoom?: number };
        setZoom(settings.zoom ?? range?.min ?? 1);
        if (capabilities?.focusMode?.includes("continuous")) {
          void trackRef.current?.applyConstraints({ advanced: [{ focusMode: "continuous" } as MediaTrackConstraintSet] }).catch(() => {});
        }
        if (navigator.mediaDevices.enumerateDevices) {
          void navigator.mediaDevices.enumerateDevices().then(devices => {
            if (!cancelled) setCameras(devices.filter(device => device.kind === "videoinput" && device.deviceId).map((device, index) => ({ id: device.deviceId, label: device.label || `Camera ${index + 1}` })));
          }).catch(() => {});
        }
        setCameraReady(true);
        setStatus(idOnly ? "Scanning automatically. Fit the entire barcode on the back of the ID in the guide." : vinOnly ? "Scanning automatically. Center the VIN barcode and hold steady." : "Scanning automatically. Center the entire barcode or QR code.");
        const scanStartedAt = Date.now();
        let currentFrame = -1;
        let pass = 0;
        let completed = false;
        let hinted = false;
        function accept(code: ScanResult) {
          if (cancelled || completed || manualCapture.current) return;
          completed = true;
          clearTimeout(timer);
          const sequence = ++fileSequence.current;
          const snapshot = captureCameraFrame(video!, "barcode-scan.jpg");
          session.stop();
          setCameraReady(false);
          void snapshot.catch(() => undefined).then(file => {
            if (cancelled || sequence !== fileSequence.current) return;
            setImage(file);
            setResult(code);
            setStatus("Code found. Check the result before continuing.");
          });
        }
        function scan() {
          if (cancelled || completed) return;
          if (!manualCapture.current && video!.readyState >= 2 && video!.currentTime !== currentFrame) {
            currentFrame = video!.currentTime;
            if (native && !nativeInFlight) {
              nativeInFlight = true;
              void native.detect(video!).then(codes => {
                for (const item of codes) {
                  const code = normalizeScan(mode, item.format, item.rawValue);
                  if (code) { accept(code); break; }
                }
              }).catch(() => { native = null; }).finally(() => { nativeInFlight = false; });
            }
            const code = decode(video!, pass++);
            if (code) accept(code);
            else if (!hinted && Date.now() - scanStartedAt > 4200) {
              hinted = true;
              setStatus(idOnly ? "Keep the entire barcode visible. Move a little closer or tilt away from glare." : vinOnly ? "Try the VIN label on the door jamb. Fill the guide, then move slightly back if the bars look blurry." : "Try moving closer or tilting away from glare. The whole code should be visible.");
            }
          }
          if (!completed) timer = setTimeout(scan, 120);
        }
        scan();
      } catch (error) {
        session.stop();
        if (!cancelled) setStatus(cameraErrorMessage(error));
      }
    }
    void start();
    function visibility() {
      if (document.hidden) { stop(); setCameraReady(false); setStatus("Camera paused while the app was in the background. Tap Try again to resume."); }
    }
    document.addEventListener("visibilitychange", visibility);
    return () => { stop(); document.removeEventListener("visibilitychange", visibility); };
  }, [attempt, facing, result, vinOnly, idOnly, cameraId]);

  async function readPhoto(file: File | undefined, liveCapture = false) {
    if (!file) return;
    if (!file.type.startsWith("image/") || !file.size || file.size > 25 * 1024 * 1024) { setStatus("Choose a nonempty image under 25 MB."); return; }
    const sequence = ++fileSequence.current;
    setUnreadablePhoto(undefined);
    manualCapture.current = true;
    if (!liveCapture) { stopRef.current(); setCameraReady(false); }
    setReading(true);
    setStatus("Reading photo…");
    const url = URL.createObjectURL(file);
    try {
      const { BarcodeFormat, BrowserMultiFormatReader, BrowserPDF417Reader } = await import("@zxing/browser");
      const reader = idOnly ? new BrowserPDF417Reader() : new BrowserMultiFormatReader();
      let decoded;
      try { decoded = await reader.decodeFromImageUrl(url); }
      catch (error) {
        if (!idOnly || sequence !== fileSequence.current) throw error;
        const source = new Image();
        source.src = url;
        await source.decode();
        if (sequence !== fileSequence.current) return;
        const canvas = document.createElement("canvas");
        const scale = Math.min(1, 2400 / Math.max(source.naturalWidth, source.naturalHeight));
        canvas.width = Math.round(source.naturalHeight * scale);
        canvas.height = Math.round(source.naturalWidth * scale);
        const context = canvas.getContext("2d");
        if (!context) throw error;
        context.translate(canvas.width, 0);
        context.rotate(Math.PI / 2);
        context.drawImage(source, 0, 0, canvas.height, canvas.width);
        decoded = reader.decodeFromCanvas(canvas);
      }
      if (sequence !== fileSequence.current) return;
      const value = vinOnly ? vinFromBarcode(decoded.getText()) : decoded.getText().trim();
      if (idOnly && !idFromBarcode(decoded.getText())) {
        if (onUnreadablePhoto) setUnreadablePhoto(file);
        setStatus("This barcode did not contain recognizable ID fields. Use a clear photo of the barcode on the back of the ID."); return;
      }
      if (!value) { setStatus("No VIN in this code. Choose a VIN barcode photo or enter the VIN."); return; }
      stopRef.current();
      setCameraReady(false);
      setImage(file);
      setResult({ format: BarcodeFormat[decoded.getBarcodeFormat()], value });
      setStatus("Code found. Check the result before continuing.");
    } catch {
      if (sequence === fileSequence.current) {
        if (onUnreadablePhoto) setUnreadablePhoto(file);
        setStatus("No readable code found. Choose a sharper photo with the whole code visible, or try the camera again.");
      }
    } finally {
      URL.revokeObjectURL(url);
      if (sequence === fileSequence.current) { manualCapture.current = false; setReading(false); }
    }
  }

  async function captureBarcode() {
    if (!videoRef.current || !cameraReady || manualCapture.current) return;
    manualCapture.current = true;
    const sequence = ++fileSequence.current;
    setReading(true);
    setStatus("Capturing barcode…");
    try {
      const file = await captureCameraFrame(videoRef.current, "barcode-scan.jpg");
      if (sequence === fileSequence.current) await readPhoto(file, true);
    } catch (error) {
      if (sequence === fileSequence.current) setStatus(error instanceof Error ? error.message : "Could not capture the barcode. Try again.");
    } finally {
      if (sequence === fileSequence.current) { manualCapture.current = false; setReading(false); }
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
    manualCapture.current = false;
    setCameraReady(false);
    setReading(false);
    setResult(null);
    setImage(undefined);
    setUnreadablePhoto(undefined);
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
      {!result && unreadablePhoto && onUnreadablePhoto && <div className={styles.controls}><button disabled={reading} onClick={() => { stopRef.current(); onUnreadablePhoto(unreadablePhoto); }} type="button">Keep back photo without barcode</button></div>}
      {result ? <>{idOnly ? <div className={styles.idReview}><button aria-pressed={revealId} onClick={() => setRevealId(!revealId)} type="button">{revealId ? "Hide ID number" : "Show ID number"}</button><label><input checked={idConfirmed} onChange={(event) => setIdConfirmed(event.target.checked)} type="checkbox" /> I checked these details against the front of the ID.</label><p>Details stay in this capture session until you choose an action. No customer record is changed automatically.</p></div> : null}<div className={styles.controls}><button className={styles.primary} disabled={idOnly && (!idFields || !idConfirmed)} onClick={() => onConfirm(result, image)} type="button"><Check />{idOnly ? "Use reviewed ID" : vinOnly ? "Use this VIN" : "Use this code"}</button><button onClick={retry} type="button"><RotateCcw />Scan again</button></div></> : <>
        <div className={styles.controls}><button disabled={reading || !cameraReady} onClick={() => void captureBarcode()} type="button"><Camera />{reading ? "Reading photo…" : "Capture barcode"}</button><button disabled={reading} onClick={() => uploadRef.current?.click()} type="button"><UploadCloud />Choose photo</button></div>
        <div className={styles.controls}>{!cameraReady ? <><button disabled={reading} onClick={retry} type="button"><RotateCcw />Try again</button><button disabled={reading} onClick={() => nativeRef.current?.click()} type="button">Use device camera</button></> : <button disabled={reading} onClick={() => { retry(); setCameraId(""); setFacing((current) => current === "environment" ? "user" : "environment"); }} type="button"><SwitchCamera />Flip camera</button>}{cameraReady && torchAvailable ? <button aria-pressed={torch} onClick={() => void toggleTorch()} type="button"><Flashlight />Light {torch ? "on" : "off"}</button> : null}</div>
        {(cameras.length > 1 || zoomRange) && <div className={styles.cameraSettings}>
          {cameras.length > 1 && <label>Camera<select value={cameraId} disabled={reading} onChange={event => { retry(); setCameraId(event.target.value); }}><option value="">Automatic rear camera</option>{cameras.map(camera => <option key={camera.id} value={camera.id}>{camera.label}</option>)}</select></label>}
          {zoomRange && <label>Zoom · {zoom.toFixed(1)}×<input aria-label="Camera zoom" type="range" min={zoomRange.min} max={zoomRange.max} step={zoomRange.step} value={zoom} disabled={reading} onChange={event => void changeZoom(Number(event.target.value))} /></label>}
        </div>}
        <p className={styles.tip}>{idOnly ? "1. Turn the card over. 2. Keep the entire stacked barcode visible. 3. Hold steady and tilt slightly to remove glare. If it will not read, choose a sharp photo. Not all IDs use a supported PDF417 format." : "Hold steady, keep the entire code visible, and avoid glare. For an ID, scan the barcode on the back."}</p>
        {!idOnly ? <div className={styles.manual}><label htmlFor={`${titleId}-code`}>{vinOnly ? "Enter VIN instead" : "Enter code instead"}</label><input autoCapitalize={vinOnly ? "characters" : "off"} autoComplete="off" id={`${titleId}-code`} maxLength={vinOnly ? 17 : 120} onChange={(event) => setManual(vinOnly ? event.target.value.toUpperCase() : event.target.value)} onKeyDown={(event) => { if (event.key === "Enter") { event.preventDefault(); reviewManual(); } }} placeholder={vinOnly ? "17-character VIN" : "Type or use a connected barcode reader"} value={manual} /><button disabled={vinOnly ? !vinFromBarcode(manual) : !manual.trim()} onClick={reviewManual} type="button">{vinOnly ? "Review VIN" : "Review code"}</button></div> : null}
      </>}
      <input accept="image/*" hidden onChange={(event) => { void readPhoto(event.target.files?.[0]); event.target.value = ""; }} ref={uploadRef} type="file" />
      <input accept="image/*" capture="environment" hidden onChange={(event) => { void readPhoto(event.target.files?.[0]); event.target.value = ""; }} ref={nativeRef} type="file" />
    </div>
  </div>, document.body);
}
