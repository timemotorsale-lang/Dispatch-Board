"use client";
import { useEffect, useRef, useState } from "react";
import { ArrowLeft, ArrowRight, ZoomIn, ZoomOut } from "lucide-react";
import type { PDFDocumentProxy, PDFDocumentLoadingTask, RenderTask } from "pdfjs-dist";
import styles from "./inventory-transfer-workspace.module.css";

export function PurchasePdfPreview({ file }: { file: File }) {
  const canvas = useRef<HTMLCanvasElement>(null);
  const [document, setDocument] = useState<PDFDocumentProxy | null>(null);
  const [error, setError] = useState("");
  const [page, setPage] = useState(1);
  const [zoom, setZoom] = useState(1);
  const [rendered, setRendered] = useState("");
  const key = `${page}:${zoom}`;
  useEffect(() => {
    let active = true, task: PDFDocumentLoadingTask | undefined;
    void import("pdfjs-dist").then(async pdf => {
      if (!active) return;
      pdf.GlobalWorkerOptions.workerSrc = "/api/vehicles/transfers/pdf-worker";
      const bytes = new Uint8Array(await file.arrayBuffer());
      if (!active) return;
      task = pdf.getDocument({ data: bytes, useSystemFonts: true, useWorkerFetch: false });
      const loaded = await task.promise;
      if (active) setDocument(loaded);
    }).catch(() => { if (active) setError("PDF preview could not be loaded. Open the original PDF to review it."); });
    return () => { active = false; void task?.destroy(); };
  }, [file]);
  useEffect(() => {
    if (!document) return;
    let active = true, task: RenderTask | undefined;
    void document.getPage(page).then(async source => {
      if (!active || !canvas.current) return;
      const original = source.getViewport({ scale: 1 });
      if (![original.width, original.height].every(size => Number.isFinite(size) && size > 0)) throw new Error("Invalid PDF dimensions.");
      const scale = Math.min(1200 * zoom / original.width, 4096 / original.width, 4096 / original.height, Math.sqrt(8_000_000 / (original.width * original.height)));
      const viewport = source.getViewport({ scale });
      canvas.current.width = Math.ceil(viewport.width); canvas.current.height = Math.ceil(viewport.height);
      task = source.render({ canvas: canvas.current, viewport });
      await task.promise;
      if (active) setRendered(key);
    }).catch(() => { if (active) setError("This PDF page could not be displayed. Open the original PDF to review it."); });
    return () => { active = false; task?.cancel(); };
  }, [document, page, zoom, key]);
  return <div aria-label="Original purchase PDF" aria-busy={!error && (!document || rendered !== key)}>
    {error ? <p role="alert" className={styles.error}>{error}</p> : null}
    <div className={styles.toolbar}>
      <button title="Previous document page" aria-label="Previous document page" disabled={!document || page === 1} onClick={() => setPage(value => value - 1)}><ArrowLeft size={16} /></button>
      <span>Page {page} / {document?.numPages ?? "-"}</span>
      <button title="Next document page" aria-label="Next document page" disabled={!document || page >= document.numPages} onClick={() => setPage(value => value + 1)}><ArrowRight size={16} /></button>
      <button title="Zoom out" aria-label="Zoom out document" disabled={zoom <= 1} onClick={() => setZoom(value => value - .5)}><ZoomOut size={16} /></button>
      <button title="Zoom in" aria-label="Zoom in document" disabled={zoom >= 3} onClick={() => setZoom(value => value + .5)}><ZoomIn size={16} /></button>
    </div>
    {!error && (!document || rendered !== key) ? <p role="status">Rendering original PDF...</p> : null}
    <div className={styles.pdfViewport}><canvas ref={canvas} aria-label={`Original PDF page ${page}`} style={{ width: `${zoom * 100}%`, visibility: rendered === key ? "visible" : "hidden" }} /></div>
  </div>;
}
