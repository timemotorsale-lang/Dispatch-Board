"use client";

import { Camera, RotateCcw, UploadCloud, X } from "lucide-react";
import { useEffect, useEffectEvent, useId, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { cameraErrorMessage, captureCameraFrame, createCameraSession } from "./scanner-camera";
import { qualifyAutoCapture, sameCaptureFrame, type AutoCaptureSample } from "./auto-capture";
import styles from "./photo-camera.module.css";

export function PhotoCamera({ onClose, onPhoto, titleText = "Take a photo", shutterLabel = "Capture photo", guidance = "Frame the subject, then take the photo.", framing }: {
  onClose: () => void; onPhoto: (file: File) => string | void; titleText?: string; shutterLabel?: string; guidance?: string; framing?: "document" | "id" | "business";
}) {
  const title = useId();
  const statusId = useId();
  const dialog = useRef<HTMLDialogElement>(null);
  const video = useRef<HTMLVideoElement>(null);
  const native = useRef<HTMLInputElement>(null);
  const upload = useRef<HTMLInputElement>(null);
  const session = useRef<ReturnType<typeof createCameraSession> | null>(null);
  const activeTrack = useRef<MediaStreamTrack | null>(null);
  const taking = useRef(false);
  const [attempt, setAttempt] = useState(0);
  const [state, setState] = useState<"opening" | "ready" | "taking" | "unavailable">("opening");
  const [status, setStatus] = useState("Starting camera…");
  const [automatic, setAutomatic] = useState(Boolean(framing));
  const [framed, setFramed] = useState(false);
  const [canUseLight, setCanUseLight] = useState(false);
  const [light, setLight] = useState(false);

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
      activeTrack.current = null;
      setCanUseLight(false);
      setLight(false);
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
        const track = stream.getVideoTracks()[0];
        activeTrack.current = track ?? null;
        const capabilities = track?.getCapabilities?.() as (MediaTrackCapabilities & { focusMode?: string[]; torch?: boolean }) | undefined;
        if (track && capabilities?.focusMode?.includes("continuous")) void track.applyConstraints({ advanced: [{ focusMode: "continuous" } as MediaTrackConstraintSet] }).catch(() => {});
        setCanUseLight(Boolean(capabilities?.torch));
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
    return () => { active = false; current.stop(); if (session.current === current) { session.current = null; activeTrack.current = null; } document.removeEventListener("visibilitychange", visibility); };
  }, [attempt, guidance]);

  function retry() {
    setStatus("Starting camera…");
    setState("opening");
    setAttempt(value => value + 1);
  }

  async function toggleLight() {
    const track = activeTrack.current;
    if (!track || track.readyState !== "live") return;
    try {
      await track.applyConstraints({ advanced: [{ torch: !light } as MediaTrackConstraintSet] });
      if (activeTrack.current === track) setLight(!light);
    } catch {
      if (activeTrack.current === track) setStatus("The camera light did not respond. Try better lighting or use the shutter.");
    }
  }

  function review(file: File) {
    const error = onPhoto(file);
    if (error) setStatus(error);
  }

  async function capture(fromAuto = false) {
    const target = video.current;
    const current = session.current;
    if (!target || !current || state !== "ready" || taking.current) return;
    taking.current = true;
    setState("taking");
    try {
      const file = await captureCameraFrame(target, framing === "document" ? "document-page.jpg" : framing === "id" ? "id-front.jpg" : framing === "business" ? "business-card.jpg" : "mobile-capture.jpg");
      if (session.current !== current) return;
      setState("ready");
      review(file);
    } catch (error) {
      if (session.current !== current) return;
      setStatus(error instanceof Error ? error.message : "Could not take the photo. Try again.");
      if (fromAuto) setAutomatic(false);
      setState("ready");
    } finally { taking.current = false; }
  }

  const autoRelease = useEffectEvent(() => { void capture(true); });
  useEffect(() => {
    if (!automatic || state !== "ready") return;
    const source = video.current;
    if (!source) return;
    const canvas = document.createElement("canvas");
    const context = canvas.getContext("2d", { willReadFrequently: true });
    if (!context) return;
    let lastTime = -1;
    let stable = 0;
    let previous: AutoCaptureSample | null = null;
    const timer = window.setInterval(() => {
      if (document.hidden || taking.current || source.readyState < 2 || source.currentTime === lastTime || !source.videoWidth || !source.videoHeight) return;
      lastTime = source.currentTime;
      const scale = 160 / Math.max(source.videoWidth, source.videoHeight);
      const width = Math.max(1, Math.round(source.videoWidth * scale)), height = Math.max(1, Math.round(source.videoHeight * scale));
      if (canvas.width !== width) canvas.width = width;
      if (canvas.height !== height) canvas.height = height;
      try {
        context.drawImage(source, 0, 0, width, height);
        const current = qualifyAutoCapture(context.getImageData(0, 0, width, height).data, width, height, Boolean(framing));
        stable = current ? (previous && sameCaptureFrame(previous, current) ? stable + 1 : 1) : 0;
        previous = current;
        setFramed(stable > 0);
        if (stable >= 4) { window.clearInterval(timer); autoRelease(); }
      } catch { window.clearInterval(timer); setAutomatic(false); setStatus("Auto capture could not read this camera. Use the shutter."); }
    }, 140);
    return () => window.clearInterval(timer);
  }, [automatic, state, framing]);

  return createPortal(<dialog aria-describedby={statusId} aria-labelledby={title} className={framing ? `${styles.dialog} ${styles.fullscreen}` : styles.dialog} onCancel={event => { event.preventDefault(); onClose(); }} ref={dialog}>
    <div className={styles.layout}>
      <header><h2 id={title}>{titleText}</h2><button aria-label="Close camera" onClick={onClose} type="button"><X size={20} /></button></header>
      <div className={styles.viewfinder}><video aria-label={framing === "document" ? "Live document preview" : framing === "id" ? "Live ID front preview" : framing === "business" ? "Live business card preview" : "Live photo preview"} autoPlay muted playsInline ref={video} />{framing && state !== "unavailable" ? <span aria-hidden="true" data-framed={automatic && framed} className={framing === "document" ? styles.documentGuide : styles.idGuide} /> : null}</div>
      <footer>
        <button className={styles.shutter} disabled={state !== "ready"} onClick={() => void capture()} type="button"><Camera size={22} />{state === "taking" ? "Capturing…" : shutterLabel}</button>
        <p id={statusId} role="status">{automatic && state === "ready" && framed ? "Hold steady for auto capture." : status}</p>
        <div className={styles.secondary}>
          {state !== "unavailable" && <button type="button" aria-pressed={automatic} disabled={state === "taking"} onClick={() => { setAutomatic(value => !value); setFramed(false); }}>{automatic ? "Auto on" : "Auto off"}</button>}
          {canUseLight && state === "ready" && <button type="button" aria-pressed={light} onClick={() => void toggleLight()}>{light ? "Light on" : "Light off"}</button>}
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
