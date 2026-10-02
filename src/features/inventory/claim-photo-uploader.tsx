"use client";

import { Camera, Plus, Trash2, Upload, X } from "lucide-react";
import { useEffect, useRef, useState } from "react";

import { CLAIM_PHOTO_ACCEPT, validateClaimPhoto, type ClaimPhotoCategory } from "@/lib/claim-photo-upload";

import styles from "./claims-workspace-review.module.css";

type Photo = { id: string; file: File; url: string; status: "Ready" | "Uploading" | "Saved" | "Failed"; error?: string };
const labels: Record<ClaimPhotoCategory, string> = { DAMAGE_PHOTO: "Damage photos", ODOMETER_PHOTO: "Odometer photos", VIN_PHOTO: "VIN photos" };

export function ClaimPhotoUploader({ claimId, category, customer, onClose, onSaved }: {
  claimId: string; category: ClaimPhotoCategory; customer: string; onClose: () => void; onSaved: () => void;
}) {
  const [photos, setPhotos] = useState<Photo[]>([]);
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const [notes, setNotes] = useState("");
  const [selectedCategory, setSelectedCategory] = useState(category);
  const picker = useRef<HTMLInputElement>(null);
  const camera = useRef<HTMLInputElement>(null);
  const close = useRef<HTMLButtonElement>(null);
  const urls = useRef(new Set<string>());
  const inFlight = useRef(false);
  const hasSaved = photos.some((photo) => photo.status === "Saved");

  useEffect(() => {
    const previous = document.activeElement as HTMLElement | null;
    close.current?.focus();
    const allocated = urls.current;
    return () => { allocated.forEach((url) => URL.revokeObjectURL(url)); previous?.focus(); };
  }, []);

  function finish() { if (!inFlight.current) { if (hasSaved) onSaved(); else onClose(); } }

  function add(files: FileList | null) {
    if (!files || inFlight.current) return;
    const additions: Photo[] = [];
    const errors: string[] = [];
    for (const file of Array.from(files)) {
      const invalid = validateClaimPhoto(file);
      if (invalid) { errors.push(`${file.name}: ${invalid}`); continue; }
      if ([...photos, ...additions].some((photo) => photo.file.name === file.name && photo.file.size === file.size && photo.file.lastModified === file.lastModified)) continue;
      const url = URL.createObjectURL(file);
      urls.current.add(url);
      additions.push({ id: crypto.randomUUID(), file, url, status: "Ready" });
    }
    setPhotos((current) => [...current, ...additions]);
    setError(errors.join(" "));
  }

  async function upload() {
    if (inFlight.current) return;
    inFlight.current = true;
    setBusy(true);
    setError("");
    const pending = photos.filter((photo) => photo.status !== "Saved");
    for (const photo of pending) {
      setPhotos((current) => current.map((item) => item.id === photo.id ? { ...item, status: "Uploading", error: undefined } : item));
      try {
        const form = new FormData();
        form.set("file", photo.file);
        form.set("category", selectedCategory);
        form.set("title", `${labels[selectedCategory]} - ${photo.file.name}`);
        form.set("notes", notes);
        form.set("relationshipTargets", "CLAIM,CUSTOMER,VEHICLE");
        form.set("status", "RECEIVED");
        const response = await fetch(`/api/claims-workspace/claims/${encodeURIComponent(claimId)}/evidence`, { method: "POST", body: form });
        const payload = await response.json().catch(() => null);
        if (!response.ok) throw new Error(payload?.error ?? "Upload failed. Try again.");
        setPhotos((current) => current.map((item) => item.id === photo.id ? { ...item, status: "Saved" } : item));
      } catch (caught) {
        setPhotos((current) => current.map((item) => item.id === photo.id ? { ...item, status: "Failed", error: caught instanceof Error ? caught.message : "Upload failed. Try again." } : item));
      }
    }
    inFlight.current = false;
    setBusy(false);
  }

  const saved = photos.filter((photo) => photo.status === "Saved").length;
  const pending = photos.length - saved;
  return (
    <div className={styles.drawerBackdrop}>
      <aside aria-label={labels[selectedCategory]} aria-modal="true" role="dialog" className={`${styles.timelineDrawer} ${styles.photoUploadDrawer}`} onKeyDown={(event) => {
        if (event.key === "Escape") { event.preventDefault(); finish(); }
        if (event.key === "Tab") {
          const controls = Array.from(event.currentTarget.querySelectorAll<HTMLElement>('button:not(:disabled), textarea:not(:disabled), select:not(:disabled), input:not([hidden]):not(:disabled)')).filter((element) => element.tabIndex >= 0);
          const first = controls[0]; const last = controls.at(-1);
          if (event.shiftKey && document.activeElement === first) { event.preventDefault(); last?.focus(); }
          if (!event.shiftKey && document.activeElement === last) { event.preventDefault(); first?.focus(); }
        }
      }}>
        <header><div><h2>{labels[selectedCategory]}</h2><p>{customer}</p></div><button ref={close} aria-label="Close photo upload" disabled={busy} onClick={finish} type="button"><X size={20} /></button></header>
        <label className={styles.photoUploadNote}>Photo type<select disabled={busy || hasSaved} value={selectedCategory} onChange={(event) => setSelectedCategory(event.target.value as ClaimPhotoCategory)}>{Object.entries(labels).map(([value, label]) => <option value={value} key={value}>{label}</option>)}</select></label>
        <div className={styles.photoUploadToolbar}>
          <button disabled={busy} onClick={() => picker.current?.click()} type="button"><Plus size={18} /> Add photos</button>
          <button disabled={busy} onClick={() => camera.current?.click()} type="button"><Camera size={18} /> Take photo</button>
        </div>
        <input hidden ref={picker} aria-label="Choose claim photos" accept={CLAIM_PHOTO_ACCEPT} multiple type="file" onChange={(event) => { add(event.target.files); event.target.value = ""; }} />
        <input hidden ref={camera} aria-label="Capture claim photo" accept={CLAIM_PHOTO_ACCEPT} capture="environment" type="file" onChange={(event) => { add(event.target.files); event.target.value = ""; }} />
        {error ? <p role="alert">{error}</p> : null}
        <div className={styles.photoUploadGrid}>
          {photos.map((photo) => <article className={styles.photoUploadItem} key={photo.id}>
            {/* Local object URLs are retained only while this upload window is open. */}
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={photo.url} alt={photo.file.name} />
            <strong>{photo.file.name}</strong><small>{(photo.file.size / 1024 / 1024).toFixed(1)} MB - {photo.status}</small>
            {photo.error ? <p role="alert">{photo.error}</p> : null}
            {photo.status !== "Saved" ? <button aria-label={`Remove ${photo.file.name}`} title="Remove photo" disabled={busy} onClick={() => {
              URL.revokeObjectURL(photo.url); urls.current.delete(photo.url); setPhotos((current) => current.filter((item) => item.id !== photo.id));
            }} type="button"><Trash2 size={18} /></button> : null}
          </article>)}
        </div>
        <label className={styles.photoUploadNote}>Notes (optional)<textarea disabled={busy} value={notes} onChange={(event) => setNotes(event.target.value)} rows={2} /></label>
        <p role="status" aria-live="polite">{saved} of {photos.length} photos saved{busy ? " - uploading..." : photos.some((photo) => photo.status === "Failed") ? " - some photos need retry" : ""}</p>
        <div className={styles.photoUploadToolbar}>
          <button disabled={busy || !pending} onClick={() => void upload()} type="button"><Upload size={18} />{busy ? "Uploading..." : photos.some((photo) => photo.status === "Failed") ? "Retry unsaved photos" : `Upload ${pending} photos`}</button>
          <button disabled={busy} onClick={finish} type="button">{hasSaved ? "Done" : "Cancel"}</button>
        </div>
      </aside>
    </div>
  );
}
