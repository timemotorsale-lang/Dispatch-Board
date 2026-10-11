"use client";

import Image from "next/image";
import { useEffect, useRef, useState } from "react";
import { ArrowLeft, ArrowRight, Camera, Check, Download, Grip, RefreshCw, Star, Trash2, Upload, Video, X } from "lucide-react";
import type { SalesMediaItem, SalesMediaModel } from "@/server/vehicle-360/sales-media-domain";
import styles from "./vehicle-sales-media-workspace.module.css";
import { inferVehiclePhotoAngle, vehiclePhotoAngles } from "@/lib/vehicle-photo-coverage";

type UploadItem = { id: string; file: File; purpose: string; angle: string; retentionUntil: string; status: "pending" | "uploading" | "done" | "failed"; error?: string };
const endpoint = "/api/vehicle-evidence/sales-media";
const isPhoto = (item: SalesMediaItem) => item.contentType.startsWith("image/");
const message = (error: unknown) => error instanceof Error ? error.message : "Media request failed.";
async function request(body?: unknown, vehicleId?: string): Promise<SalesMediaModel> {
  const response = await fetch(body ? endpoint : `${endpoint}?vehicleId=${encodeURIComponent(vehicleId!)}`, body ? { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) } : { cache: "no-store" });
  const result = await response.json();
  if (!response.ok) throw new Error(result.error || "Media request failed.");
  return result;
}
function base64(file: File): Promise<string> {
  return new Promise((resolve, reject) => { const reader = new FileReader(); reader.onload = () => resolve(String(reader.result).split(",")[1]); reader.onerror = () => reject(new Error("Could not read this file.")); reader.readAsDataURL(file); });
}

export function VehicleSalesMediaWorkspace({ vehicleId, initialModel = null, onChange, initialKind = "photos", intakeOnly = false }: { vehicleId: string; initialModel?: SalesMediaModel | null; onChange?: (model: SalesMediaModel) => void; initialKind?: string; intakeOnly?: boolean }) {
  const [model, setModel] = useState(initialModel), [kind, setKind] = useState(intakeOnly ? "intake" : initialKind), [angle, setAngle] = useState("front"), [size, setSize] = useState("small"), [selected, setSelected] = useState<string[]>([]), [reorder, setReorder] = useState(false);
  const [queue, setQueue] = useState<UploadItem[]>([]), [busy, setBusy] = useState(false), [error, setError] = useState(""), [viewer, setViewer] = useState<string | null>(null), [removal, setRemoval] = useState<string[] | null>(null);
  const uploadInput = useRef<HTMLInputElement>(null), captureInput = useRef<HTMLInputElement>(null), viewerDialog = useRef<HTMLDialogElement>(null), removeDialog = useRef<HTMLDialogElement>(null);
  const intake = model?.intakeItems ?? [], isIntake = kind === "intake";
  const photos = (model?.items ?? []).filter(isPhoto), videos = (model?.items ?? []).filter(item => !isPhoto(item)), items = isIntake ? intake : kind === "photos" ? photos : videos;
  const viewed = [...(model?.items ?? []), ...intake].find(item => item.id === viewer), primary = photos.find(item => item.href)?.id, canManage = model?.canManage === true;
  const requiredAngles = vehiclePhotoAngles.filter(item => item.code !== "damage_closeup"), covered = new Set(intake.filter(item => item.href).map(item => inferVehiclePhotoAngle(item.name)));
  const reusable = intake.filter(item => selected.includes(item.id) && item.reusable && !photos.some(photo => photo.id === item.id));
  useEffect(() => { if (viewer && !viewerDialog.current?.open) viewerDialog.current?.showModal(); if (!viewer) viewerDialog.current?.close(); }, [viewer]);
  useEffect(() => { if (removal && !removeDialog.current?.open) removeDialog.current?.showModal(); if (!removal) removeDialog.current?.close(); }, [removal]);

  async function refresh() { const next = await request(undefined, vehicleId); setModel(next); onChange?.(next); return next; }
  async function update(order: string[], removeIds: string[] = [], addIds: string[] = []) {
    if (!model || busy) return;
    setBusy(true); setError("");
    try { await request({ action: "update", vehicleId, expectedVersion: model.version, idempotencyKey: crypto.randomUUID(), order, removeIds, addIds, reason: addIds.length ? "Reviewed selected intake photos for use in the internal advertising gallery; no publication authorized." : removeIds.length ? "Remove selected items from the vehicle sales gallery; retain protected originals." : "Update the vehicle sales gallery order and primary photo." }); await refresh(); setSelected([]); setRemoval(null); }
    catch (cause) { setError(message(cause)); try { await refresh(); } catch { /* Keep the current gallery if refresh also fails. */ } }
    finally { setBusy(false); }
  }
  async function uploadBatch(batch: UploadItem[]) {
    if (busy || !canManage) return;
    setBusy(true); setError("");
    for (const entry of batch) {
      setQueue(current => current.map(item => item.id === entry.id ? { ...item, status: "uploading", error: undefined } : item));
      try {
        if (!["image/jpeg", "image/png", "image/webp", "video/mp4"].includes(entry.file.type)) throw new Error("Use JPEG, PNG, WebP or MP4.");
        if (!entry.file.size || entry.file.size > 10 * 1024 * 1024) throw new Error("Each file must be between 1 byte and 10 MB.");
        const result = await request({ action: entry.purpose === "intake" ? "upload-intake" : "upload", angle: entry.angle, vehicleId, fileName: entry.file.name, contentType: entry.file.type, contentBase64: await base64(entry.file), retentionUntil: entry.retentionUntil, idempotencyKey: entry.id }) as unknown as { evidence: { status: string } };
        setQueue(current => current.map(item => item.id === entry.id ? { ...item, status: "done", error: result.evidence.status === "QUARANTINED" ? "Quarantined by file safety scan." : undefined } : item));
      } catch (cause) { setQueue(current => current.map(item => item.id === entry.id ? { ...item, status: "failed", error: message(cause) } : item)); }
    }
    try { await refresh(); } catch (cause) { setError(message(cause)); }
    setBusy(false);
  }
  function addFiles(files: FileList | null) {
    if (!files || !canManage || busy) return;
    const chosen = Array.from(files), incomingPhotos = chosen.filter(file => file.type.startsWith("image/")).length, incomingVideos = chosen.filter(file => file.type === "video/mp4").length;
    if (!isIntake && (photos.length + incomingPhotos > 40 || videos.length + incomingVideos > 5)) { setError("This selection exceeds the 40-photo or 5-video limit. Choose fewer files."); return; }
    if (isIntake && chosen.some(file => !["image/jpeg", "image/png", "image/webp"].includes(file.type))) { setError("Intake photos must be JPEG, PNG or WebP."); return; }
    const retention = new Date(); retention.setUTCFullYear(retention.getUTCFullYear() + (isIntake ? 3 : 1));
    const batch: UploadItem[] = chosen.map(file => ({ id: crypto.randomUUID(), file, purpose: kind, angle, retentionUntil: retention.toISOString(), status: "pending" }));
    setQueue(current => [...current.filter(item => item.status !== "done"), ...batch]); void uploadBatch(batch);
  }
  function move(id: string, direction: number) {
    const order = (model?.items ?? []).map(item => item.id), group = items.map(item => item.id), index = group.indexOf(id), other = group[index + direction];
    if (!other) return;
    const a = order.indexOf(id), b = order.indexOf(other); [order[a], order[b]] = [order[b], order[a]]; void update(order);
  }
  async function download() {
    const chosen = items.filter(item => selected.includes(item.id) && item.href);
    if (!chosen.length || busy) return;
    setBusy(true); setError("");
    try {
      const { zipSync } = await import("fflate"); const files: Record<string, Uint8Array> = {};
      for (const [index, item] of chosen.entries()) { const response = await fetch(item.href!); if (!response.ok) throw new Error(`Could not download ${item.name}.`); files[`${index + 1}-${item.name.replace(/[\\/:*?"<>|]/g, "_")}`] = new Uint8Array(await response.arrayBuffer()); }
      const zip = zipSync(files, { level: 0 }), url = URL.createObjectURL(new Blob([Uint8Array.from(zip)], { type: "application/zip" })), anchor = document.createElement("a");
      anchor.href = url; anchor.download = `vehicle-${vehicleId}-media.zip`; anchor.click(); setTimeout(() => URL.revokeObjectURL(url), 1000);
    } catch (cause) { setError(message(cause)); } finally { setBusy(false); }
  }
  return <div className={styles.workspace}>
    <div className={styles.tabs} aria-label="Vehicle media categories">{[...(intakeOnly ? [] : [["photos", `Photos (${photos.length} / 40)`], ["videos", `Videos (${videos.length} / 5)`]]), ["intake", `Intake & Condition (${intake.length})`]].map(([value, label]) => <button type="button" key={value} aria-pressed={kind === value} onClick={() => { setKind(value); setSelected([]); setReorder(false); }}>{label}</button>)}</div>
    {isIntake ? <section className={styles.coverage} aria-label="Intake photo coverage"><h3>Required coverage: {requiredAngles.filter(item => covered.has(item.code)).length} / 10 angles</h3><div>{vehiclePhotoAngles.map(item => <button type="button" key={item.code} aria-pressed={angle === item.code} onClick={() => setAngle(item.code)}>{covered.has(item.code) ? <Check size={14}/> : <Camera size={14}/>} {item.label}{item.code === "damage_closeup" ? " (optional)" : ""}</button>)}</div></section> : <h3 className={styles.purpose}>Advertising gallery · Internal, not published</h3>}
    <div className={styles.toolbar}>
      {isIntake ? <label>Photo angle<select aria-label="Photo angle" value={angle} onChange={event => setAngle(event.target.value)}>{vehiclePhotoAngles.map(item => <option key={item.code} value={item.code}>{item.label}</option>)}<option value="other">Other condition</option></select></label> : null}
      <button type="button" disabled={!canManage || busy || (!isIntake && (kind === "photos" ? photos.length >= 40 : videos.length >= 5))} onClick={() => uploadInput.current?.click()}><Upload size={16}/>Upload</button>
      {kind !== "videos" ? <button type="button" title="Take a photo" aria-label="Take a photo" disabled={!canManage || busy || (!isIntake && photos.length >= 40)} onClick={() => captureInput.current?.click()}><Camera size={16}/></button> : null}
      {!isIntake ? <><button type="button" aria-pressed={reorder} title="Reorder media" disabled={!canManage || busy || items.length < 2} onClick={() => setReorder(!reorder)}><Grip size={16}/>Reorder</button><button type="button" title="Remove selected media" disabled={!canManage || busy || !selected.length} onClick={() => setRemoval(selected)}><Trash2 size={16}/>Remove selected</button></> : !intakeOnly ? <button type="button" disabled={!canManage || busy || !reusable.length || reusable.length !== selected.length || photos.length + reusable.length > 40} onClick={() => { if (window.confirm(`Add ${reusable.length} reviewed intake photo(s) to the advertising gallery? This reuses protected originals and does not publish them.`)) void update([...(model?.items ?? []).map(item => item.id), ...reusable.map(item => item.id)], [], reusable.map(item => item.id)); }}>Use selected for advertising</button> : null}
      <button type="button" disabled={busy || !items.some(item => selected.includes(item.id) && item.href)} onClick={() => void download()}><Download size={16}/>Download</button>
      <button type="button" title="Refresh media" aria-label="Refresh media" disabled={busy} onClick={() => { setError(""); void refresh().catch(cause => setError(message(cause))); }}><RefreshCw size={16}/></button>
      <label>Thumbnail size<select aria-label="Thumbnail size" value={size} onChange={event => setSize(event.target.value)}><option value="small">Small</option><option value="large">Large</option></select></label>
    </div>
    <input ref={uploadInput} type="file" hidden multiple accept={kind !== "videos" ? "image/jpeg,image/png,image/webp" : "video/mp4"} onChange={event => { addFiles(event.target.files); event.target.value = ""; }}/>
    <input ref={captureInput} type="file" hidden accept="image/jpeg,image/png,image/webp" capture="environment" onChange={event => { addFiles(event.target.files); event.target.value = ""; }}/>
    {error ? <p role="alert" className={styles.error}>{error}</p> : null}
    {!model ? <p>Sales media could not be loaded. Retry using Refresh.</p> : !canManage ? <p>Read-only. Media changes require existing inventory evidence authorization and an enabled rollout.</p> : null}
    {model && !items.length ? <p>{isIntake ? "No intake or condition photos yet." : `No sales ${kind} yet.`}</p> : null}
    {items.length ? <label className={styles.selectAll}><input type="checkbox" checked={items.every(item => selected.includes(item.id))} onChange={event => setSelected(event.target.checked ? items.map(item => item.id) : [])}/>Select all ({items.length})</label> : null}
    <div className={`${styles.grid} ${size === "large" ? styles.large : ""}`}>{items.map((item, index) => <article key={item.id} className={styles.tile}>
      <div className={styles.tileHeader}><input type="checkbox" aria-label={`Select ${item.name}`} checked={selected.includes(item.id)} onChange={event => setSelected(current => event.target.checked ? [...current, item.id] : current.filter(id => id !== item.id))}/>{isIntake ? <span>{inferVehiclePhotoAngle(item.name) === "damage_closeup" ? "Damage evidence" : "Intake evidence"}</span> : primary === item.id ? <span><Star size={12}/>Primary</span> : null}</div>
      <button className={styles.preview} type="button" aria-label={`Preview ${item.name}`} disabled={!item.href} onClick={() => setViewer(item.id)}>{item.href && isPhoto(item) ? <Image src={item.href} alt={item.name} width={320} height={240} unoptimized/> : <div><Video size={32}/><span>{item.href ? "Video" : item.status}</span></div>}</button>
      <span className={styles.fileName} title={item.name}>{item.name}</span>
      <div className={styles.tileActions}>{!isIntake && canManage && isPhoto(item) && item.href ? <button type="button" aria-label={`Set ${item.name} as primary`} title="Set as primary photo" disabled={busy || primary === item.id} onClick={() => void update([item.id, ...(model?.items ?? []).filter(other => other.id !== item.id).map(other => other.id)])}><Star size={14}/></button> : null}{item.href ? <a href={item.href} download={item.name} title="Download file" aria-label={`Download ${item.name}`}><Download size={14}/></a> : null}{reorder ? <><button type="button" title="Move earlier" aria-label={`Move ${item.name} earlier`} disabled={busy || index === 0} onClick={() => move(item.id, -1)}><ArrowLeft size={14}/></button><button type="button" title="Move later" aria-label={`Move ${item.name} later`} disabled={busy || index === items.length - 1} onClick={() => move(item.id, 1)}><ArrowRight size={14}/></button></> : null}</div>
    </article>)}</div>
    {queue.length ? <div className={styles.queue} aria-live="polite"><strong>{queue.filter(item => item.status === "done").length} / {queue.length} uploaded</strong>{queue.map(item => <div key={item.id}><span>{item.file.name}</span><span>{item.status === "done" ? <Check size={14}/> : item.status} {item.error}</span>{item.status === "failed" ? <button type="button" disabled={busy || !canManage} onClick={() => void uploadBatch([item])}><RefreshCw size={14}/>Retry</button> : null}</div>)}</div> : null}
    <dialog ref={viewerDialog} className={styles.dialog} onCancel={() => setViewer(null)} onClose={() => setViewer(null)}><header><strong>{viewed?.name}</strong><button type="button" aria-label="Close media preview" onClick={() => setViewer(null)}><X size={18}/></button></header>{viewed?.href ? isPhoto(viewed) ? <Image src={viewed.href} alt={viewed.name} width={1000} height={750} unoptimized/> : <video src={viewed.href} controls preload="metadata"/> : null}<footer><button type="button" disabled={items.findIndex(item => item.id === viewer) <= 0} onClick={() => setViewer(items[items.findIndex(item => item.id === viewer) - 1]?.id ?? null)}><ArrowLeft size={16}/>Previous</button><button type="button" disabled={items.findIndex(item => item.id === viewer) >= items.length - 1} onClick={() => setViewer(items[items.findIndex(item => item.id === viewer) + 1]?.id ?? null)}>Next<ArrowRight size={16}/></button></footer></dialog>
    <dialog ref={removeDialog} className={styles.confirm} onCancel={event => { if (busy) event.preventDefault(); else setRemoval(null); }}><h2>Remove {removal?.length} sales media item(s)?</h2><p>Protected originals and history will be retained. Inspection and acquisition evidence will not change.</p>{error ? <p role="alert">{error}</p> : null}<footer><button type="button" disabled={busy} onClick={() => setRemoval(null)}>Cancel</button><button type="button" disabled={busy} onClick={() => void update((model?.items ?? []).filter(item => !removal?.includes(item.id)).map(item => item.id), removal ?? [])}><Trash2 size={16}/>Remove from gallery</button></footer></dialog>
  </div>;
}
