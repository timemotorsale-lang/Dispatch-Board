"use client";

import { Camera, RotateCcw, UploadCloud, X } from "lucide-react";
import { useEffect, useId, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { cameraErrorMessage, captureCameraFrame, createCameraSession } from "./scanner-camera";
import styles from "./photo-camera.module.css";

export function PhotoCamera({ onClose, onPhoto, titleText = "Take a photo", shutterLabel = "Capture photo", guidance = "Frame the subject, then take the photo.", framing }: {
  onClose: () => void; onPhoto: (file: File) => string | void; titleText?: string; shutterLabel?: string; guidance?: string; framing?: "document" | "id";
}) {
  const title = useId();
  const statusId = useId();
  const dialog = useRef<HTMLDialogElement>(null);
  const video = useRef<HTMLVideoElement>(null);
  const native = useRef<HTMLInputElement>(null);
  const upload = useRef<HTMLInputElement>(null);
  const session = useRef<ReturnType<typeof createCameraSession> | null>(null);
  const taking = useRef(false);
  const [attempt, setAttempt] = useState(0);
  const [state, setState] = useState<"opening" | "ready" | "taking" | "unavailable">("opening");
  const [status, setStatus] = useState("Starting camera…");

  useEffect(() => {
    const element = dialog.current;
    const previous = document.activeElement instanceof HTMLElement ? document.activeElement : null;
    element?.showModal();
    return () => { element?.close(); if (previous?.isConnected) previous.focus(); };
  }, []);

  useEffect(() => {
    const target = video.current;
    if (!target) return;
    const current = createCameraSession();
    session.current = current;
    let active = true;
    const pause = () => {
      current.stop();
      session.current = null;
      setState("unavailable");
      setStatus("Camera paused. Try again or choose a photo.");
    };
    const visibility = () => { if (document.hidden) pause(); };
    if (document.hidden) {
      const timer = window.setTimeout(pause, 0);
      return () => { window.clearTimeout(timer); current.stop(); session.current = null; };
    }
    if (window.isSecureContext && typeof navigator.mediaDevices?.getUserMedia === "function") {
      void current.open(target, "environment").then(stream => {
        if (!active || !stream || session.current !== current) return;
        setStatus(guidance);
        setState("ready");
      }).catch((error: unknown) => {
        if (!active || session.current !== current) return;
        setStatus(cameraErrorMessage(error));
        setState("unavailable");
      });
    } else {
      queueMicrotask(() => {
        if (!active) return;
        setStatus("Live camera needs HTTPS and a supported browser. Use device camera or choose a photo.");
        setState("unavailable");
      });
    }
    document.addEventListener("visibilitychange", visibility);
    return () => { active = false; current.stop(); if (session.current === current) session.current = null; document.removeEventListener("visibilitychange", visibility); };
  }, [attempt, guidance]);

  function retry() {
    setStatus("Starting camera…");
    setState("opening");
    setAttempt(value => value + 1);
  }

  function review(file: File) {
    const error = onPhoto(file);
    if (error) setStatus(error);
  }

  async function capture() {
    const target = video.current;
    const current = session.current;
    if (!target || !current || state !== "ready" || taking.current) return;
    taking.current = true;
    setState("taking");
    try {
      const file = await captureCameraFrame(target, framing === "document" ? "document-page.jpg" : framing === "id" ? "id-front.jpg" : "mobile-capture.jpg");
      if (session.current !== current) return;
      setState("ready");
      review(file);
    } catch (error) {
      if (session.current !== current) return;
      setStatus(error instanceof Error ? error.message : "Could not take the photo. Try again.");
      setState("ready");
    } finally { taking.current = false; }
  }

  return createPortal(<dialog aria-describedby={statusId} aria-labelledby={title} className={framing ? `${styles.dialog} ${styles.fullscreen}` : styles.dialog} onCancel={event => { event.preventDefault(); onClose(); }} ref={dialog}>
    <div className={styles.layout}>
      <header><h2 id={title}>{titleText}</h2><button aria-label="Close camera" onClick={onClose} type="button"><X size={20} /></button></header>
      <div className={styles.viewfinder}><video aria-label={framing === "document" ? "Live document preview" : framing === "id" ? "Live ID front preview" : "Live photo preview"} autoPlay muted playsInline ref={video} />{framing && state !== "unavailable" ? <span aria-hidden="true" className={framing === "id" ? styles.idGuide : styles.documentGuide} /> : null}</div>
      <footer>
        <button className={styles.shutter} disabled={state !== "ready"} onClick={() => void capture()} type="button"><Camera size={22} />{state === "taking" ? "Capturing…" : shutterLabel}</button>
        <p id={statusId} role="status">{status}</p>
        <div className={styles.secondary}>
          {state === "unavailable" && <button onClick={retry} type="button"><RotateCcw size={16} />Try again</button>}
          {state !== "ready" && <button disabled={state === "taking"} onClick={() => native.current?.click()} type="button">Use device camera</button>}
          <button disabled={state === "taking"} onClick={() => upload.current?.click()} type="button"><UploadCloud size={16} />Choose photo</button>
        </div>
      </footer>
      <input accept="image/*" capture="environment" hidden ref={native} type="file" onChange={event => { const file = event.currentTarget.files?.[0]; event.currentTarget.value = ""; if (file) review(file); }} />
      <input accept="image/*" hidden ref={upload} type="file" onChange={event => { const file = event.currentTarget.files?.[0]; event.currentTarget.value = ""; if (file) review(file); }} />
    </div>
  </dialog>, document.body);
}
