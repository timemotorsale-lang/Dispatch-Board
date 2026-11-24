"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { Camera, Upload } from "lucide-react";
import { cameraErrorMessage, createCameraSession } from "@/features/mobile-capture/scanner-camera";
import styles from "./crm-next-shell.module.css";

export function RentalPhotoCapture({ label, slot, documentType, missing, onFile }: {
  label: string; slot: string; documentType: "release-condition" | "return-condition"; missing?: boolean; onFile: (file: File) => void;
}) {
  const video = useRef<HTMLVideoElement>(null);
  const upload = useRef<HTMLInputElement>(null);
  const nativeCamera = useRef<HTMLInputElement>(null);
  const camera = useRef<ReturnType<typeof createCameraSession> | null>(null);
  const [cameraOpen, setCameraOpen] = useState(false);
  const [ready, setReady] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [notice, setNotice] = useState("");

  const stop = useCallback(() => {
    camera.current?.stop();
    camera.current = null;
    setCameraOpen(false);
    setReady(false);
  }, []);

  useEffect(() => {
    const section = video.current?.closest<HTMLElement>("[data-deal-workspace-section]");
    const stopWhenHidden = () => { if (document.hidden || section?.hidden) stop(); };
    const observer = section ? new MutationObserver(stopWhenHidden) : null;
    if (section) observer?.observe(section, { attributes: true, attributeFilter: ["hidden"] });
    document.addEventListener("visibilitychange", stopWhenHidden);
    return () => {
      observer?.disconnect();
      document.removeEventListener("visibilitychange", stopWhenHidden);
      camera.current?.stop();
    };
  }, [stop]);
  useEffect(() => {
    const inputs = [upload.current, nativeCamera.current];
    const saved = (event: Event) => {
      setUploading(false);
      onFile((event as CustomEvent<File>).detail);
    };
    const failed = (event: Event) => {
      setUploading(false);
      setNotice((event as CustomEvent<string>).detail);
    };
    for (const input of inputs) {
      input?.addEventListener("rental-photo-saved", saved);
      input?.addEventListener("rental-photo-error", failed);
    }
    return () => {
      for (const input of inputs) {
        input?.removeEventListener("rental-photo-saved", saved);
        input?.removeEventListener("rental-photo-error", failed);
      }
    };
  }, [onFile]);

  async function openCamera() {
    setNotice("");
    if (!window.isSecureContext || !navigator.mediaDevices?.getUserMedia || !video.current) {
      nativeCamera.current?.click();
      return;
    }
    const session = createCameraSession();
    camera.current = session;
    setCameraOpen(true);
    try {
      if (await session.open(video.current, "environment") && camera.current === session) setReady(true);
    } catch (error) {
      if (camera.current !== session) return;
      stop();
      setNotice(cameraErrorMessage(error));
    }
  }

  function capture() {
    const source = video.current, input = upload.current;
    if (!source?.videoWidth || !input || !ready) return;
    const canvas = document.createElement("canvas");
    canvas.width = source.videoWidth;
    canvas.height = source.videoHeight;
    const context = canvas.getContext("2d");
    if (!context) return;
    context.drawImage(source, 0, 0);
    setReady(false);
    const session = camera.current;
    canvas.toBlob(blob => {
      if (camera.current !== session) return;
      if (!blob || typeof DataTransfer === "undefined") {
        setNotice("The photo could not be captured. Try again or upload a photo.");
        setReady(true);
        return;
      }
      const files = new DataTransfer();
      files.items.add(new File([blob], `${documentType}-${slot}-${Date.now()}.jpg`, { type: "image/jpeg" }));
      input.files = files.files;
      input.dispatchEvent(new Event("change", { bubbles: true }));
      stop();
    }, "image/jpeg", 0.9);
  }

  return <div className={styles.rentalPhotoCapture}>
    <div className={styles.rentalPhotoActions}>
      {!cameraOpen && <button type="button" disabled={uploading} onClick={() => void openCamera()}><Camera size={16} />Take photo<span className="sr-only"> · {label}</span></button>}
      <button type="button" disabled={uploading} data-checkout-field={missing ? "release-photo" : undefined} onClick={() => upload.current?.click()}><Upload size={16} />Upload photo<span className="sr-only"> · {label}</span></button>
    </div>
    <video ref={video} hidden={!cameraOpen} muted playsInline aria-label={`${label} camera preview`} />
    {cameraOpen && <div className={styles.rentalPhotoActions}>
      <button type="button" disabled={!ready} onClick={capture}>Capture photo</button>
      <button type="button" onClick={stop}>Close camera</button>
    </div>}
    {[{ ref: upload, name: "Upload", capture: undefined }, { ref: nativeCamera, name: "Camera", capture: "environment" as const }].map(control =>
      <input key={control.name} ref={control.ref} hidden aria-label={`${control.name} ${label} image`} data-document-type={documentType} data-rental-photo={slot}
        type="file" accept="image/*" capture={control.capture} onChange={event => {
          const file = event.currentTarget.files?.[0];
          if (file) { setNotice(""); setUploading(true); }
          event.currentTarget.value = "";
        }} />)}
    {notice && <p role="alert">{notice}</p>}
    {uploading && <p role="status">Saving photo…</p>}
  </div>;
}
