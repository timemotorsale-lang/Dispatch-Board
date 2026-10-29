"use client";

import Image from "next/image";
import { Heart, X } from "lucide-react";
import { useEffect, useId, useRef, useState, type FormEvent } from "react";
import type { Listing } from "../lib/domain";
import { publicPath } from "../lib/paths";
import styles from "./favorites-dialog.module.css";

export function FavoritesDialog({ vehicle, preview, saved, onClose, onSave }: { vehicle: Listing; preview: boolean; saved: boolean; onClose: () => void; onSave: () => Promise<void> }) {
  const dialog = useRef<HTMLDialogElement>(null);
  const pending = useRef(false);
  const key = { current: useId() };
  const [email, setEmail] = useState("");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  useEffect(() => {
    const element = dialog.current;
    const previousFocus = document.activeElement instanceof HTMLElement ? document.activeElement : null;
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    element?.showModal();
    return () => { element?.close(); document.body.style.overflow = previousOverflow; previousFocus?.focus(); };
  }, []);
  async function submit(event: FormEvent) {
    event.preventDefault();
    if (!preview || pending.current) return;
    if (!saved && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim())) { setError("Enter a valid sample email address."); return; }
    pending.current = true; setBusy(true); setError("");
    try { await onSave(); onClose(); }
    catch (problem) { setError(problem instanceof Error ? problem.message : "Could not save. Please try again."); }
    finally { pending.current = false; setBusy(false); }
  }
  return <dialog className={styles.dialog} ref={dialog} aria-labelledby={`favorite-title-${key.current}`} aria-describedby={`favorite-note-${key.current}`} onCancel={event => { event.preventDefault(); if (!busy) onClose(); }} onClick={event => { if (event.target === event.currentTarget && !busy) onClose(); }}><header className={styles.header}><span><Heart size={20} aria-hidden="true" />Save to favorites</span><button className="icon-button" aria-label="Close favorites" type="button" disabled={busy} onClick={onClose}><X /></button></header><div className={styles.content}><h2 id={`favorite-title-${key.current}`}>{saved ? "Manage your favorite" : "Keep this vehicle in view."}</h2><p id={`favorite-note-${key.current}`}>{preview ? "Private preview: your selection can be saved in this browser only. Email entry demonstrates the form; it does not look up, create or verify an account." : "Customer sign-in and favorites are not connected yet. No account will be looked up or created, and no email will be sent."}</p><div className={styles.vehicle}>{vehicle.photo && <Image src={publicPath(vehicle.photo)} alt="Illustrative sample vehicle—not the exact vehicle" width={150} height={100} unoptimized={preview} />}<div><strong>{vehicle.year} {vehicle.make} {vehicle.model}</strong><small>{vehicle.trim}</small></div></div><form className="stack" noValidate onSubmit={submit}>{!saved && <><label htmlFor={`favorite-email-${key.current}`}>{preview ? "Sample email address" : "Email address"}</label><input id={`favorite-email-${key.current}`} type="email" autoComplete="off" maxLength={254} value={email} disabled={!preview || busy} onChange={event => { setEmail(event.target.value); setError(""); }} aria-invalid={Boolean(error)} aria-describedby={`favorite-error-${key.current}`} placeholder="sample@example.com" required /><p className={styles.caption}>Use fictitious information only. This email is not sent, stored or used for marketing.</p></>}<p id={`favorite-error-${key.current}`} className="error-text" role="alert">{error}</p><button className="button primary" type="submit" disabled={!preview || busy}>{busy ? "Saving…" : saved ? "Remove from preview favorites" : "Continue — save in this browser"}</button></form><div className={styles.divider}>Account connections</div><button type="button" className="button" disabled>Continue with Google — not connected</button><button type="button" className="button" disabled>Continue with Apple — not connected</button><p className={styles.caption}>Saving does not reserve a vehicle. Cross-device favorites require verified account integration.</p></div></dialog>;
}
