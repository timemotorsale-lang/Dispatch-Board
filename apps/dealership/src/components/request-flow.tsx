"use client";

import Link from "next/link";
import { ArrowLeft, ArrowRight, Camera, Check, FileText } from "lucide-react";
import { useEffect, useRef, useState, type FormEvent } from "react";
import type { Listing, RequestKind } from "../lib/domain";

export async function command(operation: string, value: unknown, key = crypto.randomUUID()) {
  const response = await fetch("/api/preview", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ operation, value, key }) });
  const output = await response.json();
  if (!response.ok) throw new Error(output.error || "We could not confirm the result. Your details have been kept.");
  return output as { reference: string; message: string };
}

export function VehicleEntry({ onReview }: { onReview: (details: Record<string, string>) => void }) {
  const [details, setDetails] = useState({ vin: "", year: "", make: "", model: "", mileage: "" });
  const [camera, setCamera] = useState(false);
  const [feedback, setFeedback] = useState("");
  const video = useRef<HTMLVideoElement>(null);
  const update = (field: string, value: string) => setDetails(current => ({ ...current, [field]: value }));

  useEffect(() => {
    if (!camera) return;
    let disposed = false;
    let controls: { stop: () => void } | undefined;
    const start = async () => {
      try {
        const { BrowserMultiFormatReader } = await import("@zxing/browser");
        const reader = new BrowserMultiFormatReader();
        const active = await reader.decodeFromVideoDevice(undefined, video.current!, result => {
          const candidate = result?.getText().toUpperCase().match(/[A-HJ-NPR-Z0-9]{17}/)?.[0];
          if (candidate && !disposed) {
            setDetails(current => ({ ...current, vin: candidate }));
            setFeedback("VIN captured. Review it and enter the vehicle details below. VIN decoding is not connected yet.");
            setCamera(false);
          }
        });
        if (disposed) active.stop(); else controls = active;
      } catch {
        if (!disposed) { setFeedback("Camera unavailable or permission denied. Enter the VIN or vehicle details instead."); setCamera(false); }
      }
    };
    void start();
    return () => { disposed = true; controls?.stop(); };
  }, [camera]);

  function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (details.vin && !/^[A-HJ-NPR-Z0-9]{17}$/.test(details.vin)) { setFeedback("Review the 17-character VIN, or leave it blank for manual entry."); return; }
    onReview(details);
  }

  return <form onSubmit={submit} className="stack">
    <div className="notice">No account or ownership upload is required to start. VIN scanning does not unlock dealership records.</div>
    <button className="button primary" type="button" onClick={() => { setCamera(true); setFeedback("Align the VIN barcode in the camera. You can cancel and type it instead."); }}><Camera size={20} />Scan VIN with camera</button>
    {camera && <div className="camera"><video ref={video} autoPlay playsInline muted aria-label="VIN barcode camera" /><button className="button" type="button" onClick={() => setCamera(false)}>Stop camera and enter instead</button></div>}
    <p className="muted small" role="status">{feedback || "Enter a VIN or use manual details. The decoder integration remains pending; no decoded facts are fabricated."}</p>
    <label>VIN <span className="muted">(optional for manual entry)</span><input name="vin" value={details.vin} onChange={event => update("vin", event.target.value.toUpperCase())} maxLength={17} autoComplete="off" placeholder="17-character VIN" /></label>
    <div className="form-grid"><label>Year<input name="year" required type="number" min="1886" max={new Date().getFullYear() + 2} value={details.year} onChange={event => update("year", event.target.value)} /></label><label>Make<input name="make" required maxLength={60} value={details.make} onChange={event => update("make", event.target.value)} /></label></div>
    <label>Model<input name="model" required maxLength={80} value={details.model} onChange={event => update("model", event.target.value)} /></label>
    <label>Current mileage <span className="muted">(optional)</span><input name="mileage" type="number" min="0" value={details.mileage} onChange={event => update("mileage", event.target.value)} /></label>
    <button className="button primary" type="submit">Review vehicle<ArrowRight size={18} /></button>
  </form>;
}

const requestTitles: Record<RequestKind, string> = { PURCHASE: "Start your purchase", QUESTION: "Ask about this vehicle", TEST_DRIVE: "Request a test drive", SELL: "Sell or trade your vehicle", SERVICE: "Request service" };

export function RequestFlow({ kind, listing, initialVehicle, preview, onSaved }: { kind: RequestKind; listing?: Listing; initialVehicle?: Record<string, string>; preview: boolean; onSaved: () => void }) {
  const [stage, setStage] = useState(listing || initialVehicle || ["QUESTION", "TEST_DRIVE"].includes(kind) ? 1 : 0);
  const [details, setDetails] = useState<Record<string, string>>({ ...(kind === "PURCHASE" ? { paymentPath: "unsure", trade: "not-now" } : {}), ...(kind === "SELL" ? { intent: "sell", condition: "Not sure", loan: "Not sure" } : {}), ...(["SERVICE", "TEST_DRIVE"].includes(kind) ? { flexible: "yes", window: "", date: "" } : {}), ...initialVehicle });
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [notes, setNotes] = useState("");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const [receipt, setReceipt] = useState<{ reference: string; message: string } | null>(null);
  const [consent, setConsent] = useState(false);
  const key = useRef("");
  const dirty = () => { key.current = ""; setError(""); };
  const update = (field: string, value: string) => { setDetails(current => ({ ...current, [field]: value })); dirty(); };
  const vehicleTitle = listing ? `${listing.year} ${listing.make} ${listing.model}` : `${details.year || ""} ${details.make || ""} ${details.model || ""}`.trim();

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!email.trim() && !phone.trim()) { setError("Provide an email address or phone number. One is enough."); return; }
    setBusy(true); setError("");
    key.current ||= crypto.randomUUID();
    try {
      const result = await command("REQUEST", { kind, vehicleId: listing?.id ?? "", name, email, phone, notes, details }, key.current);
      setReceipt(result); onSaved();
    } catch (problem) { setError(problem instanceof Error ? problem.message : "Could not confirm submission. Your details have been kept."); }
    finally { setBusy(false); }
  }

  if (receipt) return <section className="container narrow stack"><div className="success-icon"><Check /></div><p className="eyebrow">Private preview receipt</p><h1>Request saved.</h1><div className="notice"><strong>{receipt.message}</strong><p>No appointment, reservation, offer, payment or repair has been authorized.</p></div><div className="panel"><strong>{vehicleTitle}</strong><p>Sample reference</p><code className="break">{receipt.reference}</code></div><p>Your entry is stored for this browser&apos;s local preview session. Cross-device email account access and staff delivery are not connected.</p><Link href="/garage" className="button primary">View preview Garage<ArrowRight size={18} /></Link><Link className="text-link" href="/">Back to Home</Link></section>;

  return <section className="container narrow stack"><Link href={listing ? `/vehicles/${listing.id}` : "/"} className="text-link"><ArrowLeft size={17} />{listing ? "Back to vehicle" : "Home"}</Link><p className="eyebrow">Simple steps. Human support.</p><h1>{requestTitles[kind]}</h1><p className="lead">{kind === "SELL" ? "Sell outright or trade. Start with what you know." : kind === "SERVICE" ? "Tell us what you notice. Our service team confirms the visit." : "Prepare your next step. No charge or reservation."}</p><div className="step-line" aria-label={`Step ${stage + 1} of 3`}><span className={stage === 0 ? "active" : ""}>Vehicle</span><span className={stage === 1 ? "active" : ""}>Your preferences</span><span className={stage === 2 ? "active" : ""}>Review & contact</span></div>
    {listing && <div className="vehicle-summary"><strong>{vehicleTitle}</strong><span>{listing.trim} · {listing.mileage.toLocaleString()} miles</span></div>}
    {stage === 0 && <VehicleEntry onReview={value => { setDetails(current => ({ ...current, ...value })); setStage(1); dirty(); }} />}
    {stage === 1 && <form className="stack" onSubmit={event => { event.preventDefault(); setStage(2); }}>
      {!listing && <div className="panel row between"><strong>{vehicleTitle}</strong><button type="button" className="text-link" onClick={() => setStage(0)}>Edit vehicle</button></div>}
      {kind === "PURCHASE" && <><h2>How would you like to pay?</h2><div className="choices">{[["cash", "Cash"], ["partner", "Dealership partner financing"], ["own-bank", "My bank or credit union"], ["unsure", "Not sure — help me choose"]].map(([value, title]) => <label className="choice" key={value}><input type="radio" name="paymentPath" checked={details.paymentPath === value} onChange={() => update("paymentPath", value)} />{title}</label>)}</div><label>Have a trade-in?<select value={details.trade} onChange={event => update("trade", event.target.value)}><option value="not-now">Not now</option><option value="yes">Yes</option><option value="no">No</option></select></label><p className="muted small">No credit application, inquiry or charge at this step. Partner services are not connected.</p></>}
      {kind === "SELL" && <><label>What would you like to do?<select value={details.intent} onChange={event => update("intent", event.target.value)}><option value="sell">Sell outright</option><option value="trade">Trade toward a purchase</option></select></label><label>Overall condition<select value={details.condition} onChange={event => update("condition", event.target.value)}>{["Not sure", "Good", "Fair", "Needs work"].map(value => <option key={value}>{value}</option>)}</select></label><label>Known issues <span className="muted">(optional)</span><textarea maxLength={1000} value={details.issues ?? ""} onChange={event => update("issues", event.target.value)} /></label><label>Is there a loan or lease?<select value={details.loan} onChange={event => update("loan", event.target.value)}>{["Not sure", "Yes", "No"].map(value => <option key={value}>{value}</option>)}</select></label><div className="notice"><Camera size={20} /><strong>Photos are recommended, not required initially.</strong><p>Secure photo uploads are not connected in this foundation. Do not send private documents here. Staff may need photos before an estimate.</p></div></>}
      {["SERVICE", "TEST_DRIVE"].includes(kind) && <><label>{kind === "SERVICE" ? "Describe what you notice" : "Anything you would like us to know?"}<textarea maxLength={1000} value={details.service ?? ""} placeholder="Not sure? Describe it in your own words." onChange={event => update("service", event.target.value)} /></label><label className="choice"><input type="checkbox" checked={details.flexible === "yes"} onChange={event => update("flexible", event.target.checked ? "yes" : "no")} />I&apos;m flexible — contact me</label>{details.flexible !== "yes" && <><label>Preferred date<input type="date" required min={new Date().toLocaleDateString("en-CA")} value={details.date} onChange={event => update("date", event.target.value)} /></label><label>Preferred time or alternative<textarea maxLength={500} value={details.window} onChange={event => update("window", event.target.value)} placeholder="A preference, not a guaranteed slot" /></label></>}<div className="notice">Sales and service hours are not configured yet. This is a request only; staff must confirm the time. Submitting does not authorize paid repairs.</div></>}
      {kind === "QUESTION" && <label>Your question<textarea maxLength={1000} required value={details.service ?? ""} onChange={event => update("service", event.target.value)} /></label>}
      <button className="button primary" type="submit">Review request<ArrowRight size={18} /></button>
    </form>}
    {stage === 2 && <form className="stack" onSubmit={submit}><div className="panel"><div className="row between"><h2>Review your request</h2><button type="button" className="text-link" onClick={() => setStage(1)}>Edit</button></div><p><strong>{vehicleTitle}</strong></p><dl className="review-list">{Object.entries(details).filter(([, value]) => value).map(([field, value]) => <div key={field}><dt>{field.replace(/([A-Z])/g, " $1")}</dt><dd>{value}</dd></div>)}</dl></div><label>Name <span className="muted">(optional while requirements are reviewed)</span><input autoComplete="name" maxLength={150} value={name} onChange={event => { setName(event.target.value); dirty(); }} /></label><h2>Email or phone. One is enough.</h2><label>Email address<input type="email" autoComplete="email" value={email} maxLength={254} onChange={event => { setEmail(event.target.value); dirty(); }} /></label><label>Phone number<input type="tel" autoComplete="tel" value={phone} maxLength={40} onChange={event => { setPhone(event.target.value); dirty(); }} /></label><p className="muted small">Providing a phone number does not authorize texting. Texting and marketing services are not enabled.</p><label>Additional notes <span className="muted">(optional)</span><textarea maxLength={2500} value={notes} onChange={event => { setNotes(event.target.value); dirty(); }} /></label><div className="notice">{preview ? "Use fictitious information only. This request is saved locally for review, not sent to staff." : "Live request delivery is not connected. No request will be sent."}</div>{preview && <label className="choice"><input type="checkbox" checked={consent} onChange={event => setConsent(event.target.checked)} required />I understand this is a private preview and will use sample information.</label>}<p role="alert" className="error-text">{error}</p><button type="submit" className="button primary" disabled={busy || !preview || !consent}>{busy ? "Checking submission…" : "Save preview request"}<ArrowRight size={18} /></button><p className="muted small">Not a booking, offer, reservation, financing approval or charge. Do not include sensitive ID, financial or bank data.</p></form>}
  </section>;
}

export function UnavailableStep({ title, description }: { title: string; description: string }) {
  return <section className="panel stack"><FileText size={28} /><h2>{title}</h2><p>{description}</p><span className="pill neutral">Not connected</span><Link href="/how-it-works" className="text-link">See the buying process<ArrowRight size={16} /></Link></section>;
}
