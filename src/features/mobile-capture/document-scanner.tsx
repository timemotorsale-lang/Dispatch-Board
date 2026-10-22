"use client";

import { useEffect, useId, useRef, useState } from "react";
import { createPortal } from "react-dom";
import ImagePreview from "next/image";
import { Camera, FileCheck, Plus, RotateCw, UploadCloud, X } from "lucide-react";
import { cameraErrorMessage, createCameraSession } from "./scanner-camera";
import { correctDocument, detectDocumentCorners, documentQualityHints, fullPageCorners, validCorners, type DocumentCorners } from "./document-image";
import { buildScannedPdf, MAX_SCAN_BYTES, MAX_SCAN_PAGES, type ScannedPage } from "./document-pdf";
import styles from "./document-scanner.module.css";

type DraftPage = { source: ImageData; url: string };
const cornerNames = ["Top left", "Top right", "Bottom right", "Bottom left"];

export function DocumentScanner({ onClose, onComplete, onImageComplete }: { onClose: () => void; onComplete?: (file: File) => void; onImageComplete?: (file: File) => void }) {
  const titleId = useId();
  const [draft, setDraft] = useState<DraftPage | null>(null);
  const [corners, setCorners] = useState<DocumentCorners>(fullPageCorners);
  const [pages, setPages] = useState<ScannedPage[]>([]);
  const [camera, setCamera] = useState(false);
  const [ready, setReady] = useState(false);
  const [busy, setBusy] = useState(false);
  const [grayscale, setGrayscale] = useState(false);
  const [notice, setNotice] = useState("Photograph one page at a time or choose a page photo. Nothing is uploaded until you accept and send.");
  const videoRef = useRef<HTMLVideoElement>(null);
  const uploadRef = useRef<HTMLInputElement>(null);
  const nativeRef = useRef<HTMLInputElement>(null);
  const dialogRef = useRef<HTMLDivElement>(null);
  const urlsRef = useRef(new Set<string>());
  const generation = useRef(0);
  const dragRef = useRef<number | null>(null);
  const closeRef = useRef(onClose);
  useEffect(() => { closeRef.current = () => { if ((!draft && !pages.length) || window.confirm("Discard this unsent document scan?")) onClose(); }; }, [onClose, draft, pages.length]);
  useEffect(() => {
    const previous = document.activeElement instanceof HTMLElement ? document.activeElement : null;
    const overflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    dialogRef.current?.focus();
    function keyboard(event: KeyboardEvent) {
      if (event.key === "Escape") closeRef.current();
      if (event.key !== "Tab") return;
      const controls = Array.from(dialogRef.current?.querySelectorAll<HTMLElement>('button:not(:disabled), input:not(:disabled):not([type="file"]), summary') ?? []);
      const visible = controls.filter((control) => control.getClientRects().length);
      if (event.shiftKey && (document.activeElement === visible[0] || document.activeElement === dialogRef.current)) { event.preventDefault(); visible.at(-1)?.focus(); }
      else if (!event.shiftKey && document.activeElement === visible.at(-1)) { event.preventDefault(); visible[0]?.focus(); }
    }
    document.addEventListener("keydown", keyboard);
    const urls = urlsRef.current;
    return () => { generation.current += 1; urls.forEach((url) => URL.revokeObjectURL(url)); document.body.style.overflow = overflow; document.removeEventListener("keydown", keyboard); previous?.focus(); };
  }, []);

  useEffect(() => {
    if (!camera || !videoRef.current) return;
    const session = createCameraSession();
    let cancelled = false;
    void session.open(videoRef.current, "environment").then((stream) => {
      if (!stream || cancelled) return;
      setReady(true);
      setNotice("Place the page on a contrasting surface. Include all four corners and avoid glare.");
    }).catch((error: unknown) => {
      if (!cancelled) { setCamera(false); setNotice(cameraErrorMessage(error)); }
    });
    function visibility() {
      if (document.hidden) { session.stop(); setCamera(false); setReady(false); setNotice("Camera paused. Tap Add page to resume when ready."); }
    }
    document.addEventListener("visibilitychange", visibility);
    return () => { cancelled = true; session.stop(); document.removeEventListener("visibilitychange", visibility); };
  }, [camera]);

  function rememberUrl(blob: Blob) {
    const url = URL.createObjectURL(blob);
    urlsRef.current.add(url);
    return url;
  }
  function releaseUrl(url: string) { URL.revokeObjectURL(url); urlsRef.current.delete(url); }

  async function loadPage(file: File | undefined) {
    if (!file) return;
    if (!file.type.startsWith("image/") || !file.size || file.size > MAX_SCAN_BYTES) { setNotice("Choose a page image under 25 MB. Use regular Upload for an existing PDF."); return; }
    const current = ++generation.current;
    setCamera(false);
    setReady(false);
    setBusy(true);
    const url = rememberUrl(file);
    try {
      const image = new Image();
      image.src = url;
      await image.decode();
      if (current !== generation.current) return;
      const scale = Math.min(1, 2400 / Math.max(image.naturalWidth, image.naturalHeight));
      const canvas = document.createElement("canvas");
      canvas.width = Math.round(image.naturalWidth * scale); canvas.height = Math.round(image.naturalHeight * scale);
      const context = canvas.getContext("2d", { willReadFrequently: true });
      if (!context || canvas.width < 100 || canvas.height < 100) throw new Error("Choose a larger, readable page photo.");
      context.drawImage(image, 0, 0, canvas.width, canvas.height);
      const source = context.getImageData(0, 0, canvas.width, canvas.height);
      const preview = document.createElement("canvas");
      preview.width = 240; preview.height = Math.max(2, Math.round(canvas.height * 240 / canvas.width));
      const previewContext = preview.getContext("2d")!;
      previewContext.drawImage(canvas, 0, 0, preview.width, preview.height);
      const previewData = previewContext.getImageData(0, 0, preview.width, preview.height).data;
      const detected = detectDocumentCorners(previewData, preview.width, preview.height);
      const qualityHints = documentQualityHints(previewData, preview.width, preview.height);
      if (draft) releaseUrl(draft.url);
      setDraft({ source, url });
      setCorners(detected ?? fullPageCorners());
      setNotice([detected ? "Page edges suggested. Adjust the four corners if needed, then keep the page." : "Edges were unclear. Drag the corners to the page edges, or keep the full photo.", ...qualityHints].join(" "));
    } catch (error) {
      releaseUrl(url);
      if (current === generation.current) setNotice(error instanceof Error ? error.message : "Could not read this page photo.");
    } finally { if (current === generation.current) setBusy(false); }
  }

  function startCamera() {
    if (!window.isSecureContext || !navigator.mediaDevices?.getUserMedia) { setNotice("Live camera needs HTTPS. Use your phone camera or choose a page photo."); nativeRef.current?.click(); return; }
    setReady(false); setCamera(true); setNotice("Starting document camera…");
  }

  async function capture() {
    const video = videoRef.current;
    if (!video?.videoWidth || !video.videoHeight) { setNotice("Wait for the camera image, then capture."); return; }
    setBusy(true);
    const current = generation.current;
    const canvas = document.createElement("canvas"); canvas.width = video.videoWidth; canvas.height = video.videoHeight;
    canvas.getContext("2d")!.drawImage(video, 0, 0);
    const blob = await new Promise<Blob | null>((resolve) => canvas.toBlob(resolve, "image/jpeg", 0.94));
    if (current !== generation.current) return;
    if (blob) await loadPage(new File([blob], "document-page.jpg", { type: "image/jpeg" }));
    else { setBusy(false); setNotice("The page could not be captured. Try again."); }
  }

  function changeCorner(index: number, axis: "horizontal" | "vertical", value: number) {
    setCorners((current) => current.map((point, position) => position === index ? { ...point, [axis]: Math.min(1, Math.max(0, value)) } : point) as DocumentCorners);
  }

  async function keepPage() {
    if (!draft || !validCorners(corners) || busy) return;
    const current = generation.current;
    setBusy(true); setNotice("Straightening and preparing the page…");
    try {
      await new Promise((resolve) => setTimeout(resolve, 0));
      const corrected = correctDocument(draft.source, corners, grayscale);
      const canvas = document.createElement("canvas"); canvas.width = corrected.width; canvas.height = corrected.height;
      canvas.getContext("2d")!.putImageData(new ImageData(corrected.pixels, corrected.width, corrected.height), 0, 0);
      const blob = await new Promise<Blob | null>((resolve) => canvas.toBlob(resolve, "image/jpeg", 0.9));
      if (current !== generation.current) return;
      if (!blob) throw new Error("Could not prepare this page. Try again.");
      if (onImageComplete) { onImageComplete(new File([blob], "id-front.jpg", { type: "image/jpeg" })); return; }
      if (pages.length >= MAX_SCAN_PAGES || pages.reduce((total, page) => total + page.bytes.length, 0) + blob.size > MAX_SCAN_BYTES) throw new Error("Scan limit reached. Use up to 12 pages and 25 MB, or split this document.");
      const bytes = new Uint8Array(await blob.arrayBuffer());
      if (current !== generation.current) return;
      setPages((existing) => [...existing, { id: crypto.randomUUID(), bytes, rotation: 0, url: rememberUrl(blob) }]);
      releaseUrl(draft.url); setDraft(null); setNotice("Page added. Review it below, add another page, or create the PDF.");
    } catch (error) { if (current === generation.current) setNotice(error instanceof Error ? error.message : "Page could not be prepared."); }
    finally { if (current === generation.current) setBusy(false); }
  }

  async function finish() {
    const current = generation.current;
    setBusy(true); setNotice("Creating your PDF. Please keep this window open…");
    try {
      const bytes = await buildScannedPdf(pages);
      if (current === generation.current) onComplete?.(new File([new Uint8Array(bytes)], "scanned-document.pdf", { type: "application/pdf" }));
    } catch (error) { if (current === generation.current) setNotice(error instanceof Error ? error.message : "PDF could not be created. Your pages are still here."); }
    finally { if (current === generation.current) setBusy(false); }
  }

  return createPortal(<div className={styles.backdrop}><div className={styles.dialog} aria-labelledby={titleId} aria-modal="true" ref={dialogRef} role="dialog" tabIndex={-1}>
    <header><div><span>{onImageComplete ? "ID capture · front of card" : `Document scanner · ${pages.length} / ${MAX_SCAN_PAGES} pages`}</span><h2 id={titleId}>{onImageComplete ? "Capture front of ID" : "Scan a document"}</h2></div><button aria-label="Close document scanner" onClick={() => closeRef.current()} type="button"><X /></button></header>
    <p role="status">{notice}</p>
    {camera ? <div className={styles.camera}><video autoPlay muted playsInline ref={videoRef} /><div className={styles.controls}><button disabled={!ready || busy} onClick={() => void capture()} type="button"><Camera />Capture page</button><button disabled={busy} onClick={() => { setCamera(false); setReady(false); }} type="button">Back to pages</button></div></div> : draft ? <>
      <svg className={styles.crop} viewBox={`0 0 ${draft.source.width} ${draft.source.height}`} aria-label="Adjust document corners" onPointerMove={(event) => {
        if (dragRef.current === null || busy) return;
        const matrix = event.currentTarget.getScreenCTM();
        if (!matrix) return;
        const point = new DOMPoint(event.clientX, event.clientY).matrixTransform(matrix.inverse());
        changeCorner(dragRef.current, "horizontal", point.x / draft.source.width);
        changeCorner(dragRef.current, "vertical", point.y / draft.source.height);
      }} onPointerUp={() => { dragRef.current = null; }} onPointerCancel={() => { dragRef.current = null; }}>
        <image href={draft.url} width={draft.source.width} height={draft.source.height} />
        <polygon points={corners.map((point) => `${point.horizontal * draft.source.width},${point.vertical * draft.source.height}`).join(" ")} />
        {corners.map((point, index) => <circle key={cornerNames[index]} cx={point.horizontal * draft.source.width} cy={point.vertical * draft.source.height} r={Math.max(draft.source.width, draft.source.height) * 0.027} onPointerDown={(event) => { if (!busy) { dragRef.current = index; event.currentTarget.setPointerCapture(event.pointerId); } }} />)}
      </svg>
      <details><summary>Fine-tune corners</summary>{corners.map((point, index) => <fieldset disabled={busy} key={cornerNames[index]}><legend>{cornerNames[index]}</legend>{(["horizontal", "vertical"] as const).map((axis) => <label key={axis}>{axis}<input aria-label={`${cornerNames[index]} ${axis}`} type="range" min={0} max={1} step={0.005} value={point[axis]} onChange={(event) => changeCorner(index, axis, Number(event.target.value))} /></label>)}</fieldset>)}</details>
      {!validCorners(corners) ? <p role="alert">Corners must follow the page edges without crossing. Reset to the full photo if needed.</p> : null}
      <label><input disabled={busy} type="checkbox" checked={grayscale} onChange={(event) => setGrayscale(event.target.checked)} /> Enhance text · grayscale</label>
      <div className={styles.controls}><button disabled={busy || !validCorners(corners)} onClick={() => void keepPage()} type="button"><FileCheck />{onImageComplete ? "Use front photo" : "Keep page"}</button><button disabled={busy} onClick={() => setCorners(fullPageCorners())} type="button">Full photo</button><button disabled={busy} onClick={() => { releaseUrl(draft.url); setDraft(null); setNotice("Page discarded. Capture or choose another photo."); }} type="button">Discard page</button></div>
    </> : <div className={styles.controls}><button disabled={busy || pages.length >= MAX_SCAN_PAGES} onClick={startCamera} type="button"><Plus />Add page with camera</button><button disabled={busy || pages.length >= MAX_SCAN_PAGES} onClick={() => uploadRef.current?.click()} type="button"><UploadCloud />Choose page photo</button></div>}
    {pages.length ? <ol className={styles.pages} aria-label="Scanned pages">{pages.map((page, index) => <li key={page.id}>
      <ImagePreview unoptimized alt={`Scanned page ${index + 1}`} src={page.url} width={400} height={500} style={{ transform: `rotate(${page.rotation}deg)` }} />
      <strong>Page {index + 1}</strong><div className={styles.controls}>
        <button aria-label={`Rotate page ${index + 1}`} disabled={busy || camera} onClick={() => setPages((current) => current.map((item) => item.id === page.id ? { ...item, rotation: (item.rotation + 90) % 360 } : item))} type="button"><RotateCw /></button>
        <button disabled={busy || camera || index === 0} onClick={() => setPages((current) => { const reordered = [...current]; [reordered[index - 1], reordered[index]] = [reordered[index], reordered[index - 1]]; return reordered; })} type="button">Move up</button>
        <button aria-label={`Remove page ${index + 1}`} disabled={busy || camera} onClick={() => { releaseUrl(page.url); setPages((current) => current.filter((item) => item.id !== page.id)); }} type="button"><X /></button>
      </div></li>)}</ol> : null}
    <footer>{!onImageComplete ? <button className={styles.primary} disabled={busy || camera || Boolean(draft) || !pages.length} onClick={() => void finish()} type="button">{busy ? "Preparing…" : `Create PDF · ${pages.length} ${pages.length === 1 ? "page" : "pages"}`}</button> : null}<small>{onImageComplete ? "Keep the entire card visible. After you use the photo, it is sent to this app’s OCR service to suggest fields for review; it is not filed or used to change a customer record." : "Review the PDF before sending. Auto-crop is a suggestion; check that no text was cut off."}</small></footer>
    <input accept="image/*" hidden ref={uploadRef} onChange={(event) => { void loadPage(event.target.files?.[0]); event.target.value = ""; }} type="file" />
    <input accept="image/*" capture="environment" hidden ref={nativeRef} onChange={(event) => { void loadPage(event.target.files?.[0]); event.target.value = ""; }} type="file" />
  </div></div>, document.body);
}
