"use client";

import Image from "next/image";
import Link from "next/link";
import { ArrowLeft, ArrowRight, Camera, CarFront, Check, ShieldCheck } from "lucide-react";
import { useEffect, useRef, useState, type FormEvent } from "react";
import { appraisalChoices, appraisalImage, conditionGroups, toggleCondition, validateAppraisalStep } from "../lib/appraisal";
import { publicPath } from "../lib/paths";
import { command } from "./request-flow";
import { VinCamera } from "./vin-camera";
import styles from "./appraisal-flow.module.css";

const steps = ["Vehicle", "Condition", "History", "Photo", "Your plans", "Review & contact"];
const vehicleFields = [["year", "Year"], ["make", "Make"], ["model", "Model"], ["trim", "Trim"], ["transmission", "Transmission"], ["drivetrain", "Drivetrain"], ["engineSpec", "Engine"], ["color", "Exterior color"]];

export function SavedAppraisal({ reference, details }: { reference: string; details: Record<string, unknown> }) {
  const fields = ["vin", ...vehicleFields.map(([field]) => field), "mileage", ...conditionGroups.map(group => group.key), ...Object.keys(appraisalChoices), "issues", "zip"];
  return <section className="container narrow stack"><Link href="/garage" className="text-link"><ArrowLeft size={18} />My Garage</Link><h1>Your appraisal preview.</h1><div className="notice"><strong>Saved privately—not delivered to staff.</strong><p>No appraisal, offer, appointment or payment has been approved. Live staff updates and cross-device accounts are not connected.</p></div><div className="panel"><h2>Submitted vehicle answers</h2><dl className="review-list">{fields.filter(field => typeof details[field] === "string" && details[field]).map(field => <div key={field}><dt>{field.replace(/([A-Z])/g, " $1")}</dt><dd>{field === "vin" ? `•••••••••••${String(details[field]).slice(-6)}` : String(details[field]).split("|").join(", ")}</dd></div>)}</dl></div><p>Selected photos were not uploaded or saved.</p><p>Preview reference: <code className="break">{reference}</code></p><Link className="button primary" href="/sell">Start another appraisal</Link></section>;
}

export function AppraisalFlow({ preview, onSaved, initialVehicle }: { preview: boolean; onSaved: () => void; initialVehicle?: Record<string, string> }) {
  const [started, setStarted] = useState(Boolean(initialVehicle));
  const [stage, setStage] = useState(0);
  const [details, setDetails] = useState<Record<string, string>>({ appraisalVersion: "1", vin: "", year: "", make: "", model: "", vehicleSource: "Customer entered", ...initialVehicle });
  const [vehicleConfirmed, setVehicleConfirmed] = useState(false);
  const [camera, setCamera] = useState(false);
  const [lookupBusy, setLookupBusy] = useState(false);
  const [lookupMessage, setLookupMessage] = useState("");
  const [error, setError] = useState("");
  const [photo, setPhoto] = useState("");
  const [photoMessage, setPhotoMessage] = useState("");
  const [photoBusy, setPhotoBusy] = useState(false);
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [consent, setConsent] = useState(false);
  const [busy, setBusy] = useState(false);
  const [receipt, setReceipt] = useState<{ reference: string; message: string } | null>(null);
  const lookupController = useRef<AbortController | null>(null);
  const photoVersion = useRef(0);
  const submissionKey = useRef("");
  const heading = useRef<HTMLHeadingElement>(null);
  useEffect(() => () => { lookupController.current?.abort(); photoVersion.current += 1; }, []);
  useEffect(() => () => { if (photo) URL.revokeObjectURL(photo); }, [photo]);
  const image = appraisalImage({ year: details.year, make: details.make, model: details.model, trim: details.trim }, photo);
  const title = [details.year, details.make, details.model].filter(Boolean).join(" ") || "Your vehicle";

  function update(field: string, value: string) {
    setDetails(current => ({ ...current, [field]: value }));
    submissionKey.current = "";
    setError("");
  }
  function editVehicle(field: string, value: string) {
    lookupController.current?.abort();
    setLookupBusy(false);
    setVehicleConfirmed(false);
    photoVersion.current += 1;
    setPhotoBusy(false);
    setPhoto("");
    setPhotoMessage("");
    setLookupMessage("Vehicle details changed. Review and confirm before continuing.");
    setDetails(current => ({ ...current, ...(field === "vin" ? { year: "", make: "", model: "", trim: "", transmission: "", drivetrain: "", engineSpec: "", color: "" } : {}), [field]: value, vehicleSource: "Customer entered or corrected" }));
    submissionKey.current = "";
    setError("");
  }
  async function lookup(vin = details.vin) {
    lookupController.current?.abort();
    const controller = new AbortController();
    lookupController.current = controller;
    if (!/^[A-HJ-NPR-Z0-9]{17}$/.test(vin)) { setLookupMessage("Type a complete 17-character VIN, or enter the vehicle manually below."); return; }
    setLookupBusy(true);
    setVehicleConfirmed(false);
    setLookupMessage("Looking up basic specifications with NHTSA…");
    try {
      const response = await fetch(publicPath("/api/vin-decode"), { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ vin }), signal: controller.signal });
      const output = await response.json();
      if (!response.ok) throw new Error(output.error || "VIN lookup unavailable. Enter the vehicle manually.");
      if (controller.signal.aborted) return;
      setDetails(current => ({ ...current, ...output.vehicle, vin, color: "", vehicleSource: "NHTSA lookup; customer confirmation required" }));
      setLookupMessage(output.partial ? "Partial VIN result. Some facts could not be confirmed. Review every field or correct it manually." : "Basic vehicle details found. Confirm or correct them below. Color and installed options are not inferred.");
      submissionKey.current = "";
    } catch (problem) { if (!controller.signal.aborted) setLookupMessage(problem instanceof Error ? problem.message : "Lookup unavailable. Enter details manually."); }
    finally { if (lookupController.current === controller) setLookupBusy(false); }
  }
  async function choosePhoto(file?: File) {
    if (!file) return;
    const version = ++photoVersion.current;
    setPhotoBusy(true);
    setPhotoMessage("");
    try {
      if (!["image/jpeg", "image/png", "image/webp"].includes(file.type) || file.size > 5 * 1024 * 1024) throw new Error("Choose a JPEG, PNG or WebP photo up to 5 MB. HEIC and SVG are not supported.");
      const bytes = new Uint8Array(await file.slice(0, 12).arrayBuffer());
      const jpeg = bytes[0] === 255 && bytes[1] === 216 && bytes[2] === 255;
      const png = bytes[0] === 137 && bytes[1] === 80 && bytes[2] === 78 && bytes[3] === 71;
      const webp = new TextDecoder().decode(bytes.slice(0, 4)) === "RIFF" && new TextDecoder().decode(bytes.slice(8, 12)) === "WEBP";
      if (!(file.type === "image/jpeg" && jpeg || file.type === "image/png" && png || file.type === "image/webp" && webp)) throw new Error("The file content does not match its photo type.");
      const bitmap = await createImageBitmap(file);
      const valid = bitmap.width > 0 && bitmap.height > 0 && bitmap.width <= 12000 && bitmap.height <= 12000 && bitmap.width * bitmap.height <= 40000000;
      bitmap.close();
      if (!valid) throw new Error("Choose a photo up to 12,000 pixels per side and 40 megapixels.");
      if (version !== photoVersion.current) return;
      setPhoto(URL.createObjectURL(file));
      setPhotoMessage("Photo selected for this tab only. It will not be uploaded or included in the saved preview request.");
    } catch (problem) { if (version === photoVersion.current) setPhotoMessage(problem instanceof Error ? problem.message : "Could not read this photo. Try a JPEG or continue without one."); }
    finally { if (version === photoVersion.current) setPhotoBusy(false); }
  }
  function go(next: number) {
    setError(""); setCamera(false); setStage(next);
    requestAnimationFrame(() => { heading.current?.focus(); heading.current?.scrollIntoView({ block: "start", behavior: "instant" }); });
  }
  async function next(event: FormEvent) {
    event.preventDefault();
    const problem = validateAppraisalStep(details, stage);
    if (problem || stage === 0 && !vehicleConfirmed) { setError(problem || "Confirm that the vehicle details are correct."); return; }
    if (stage < 5) { go(stage + 1); return; }
    for (const step of [0, 1, 2, 4]) {
      const issue = validateAppraisalStep(details, step);
      if (issue) { go(step); setError(issue); return; }
    }
    if (!preview || !consent) { setError("Live appraisal delivery is not connected. Use sample information in the private preview only."); return; }
    if (details.contactMethod === "Email" && !email.trim() || details.contactMethod === "Phone call" && !phone.trim()) { setError("Enter the contact detail for your preferred response method."); return; }
    setBusy(true); setError("");
    submissionKey.current ||= crypto.randomUUID();
    try {
      const result = await command("REQUEST", { kind: "SELL", vehicleId: "", name, email, phone, notes: "", details }, submissionKey.current);
      setReceipt(result); onSaved();
    } catch (problem) { setError(problem instanceof Error ? problem.message : "Could not confirm the save. Your answers remain here; retry safely."); }
    finally { setBusy(false); }
  }
  function choice(field: string, label: string) {
    return <fieldset className={styles.group}><legend>{label}</legend><div className={styles.choices}>{appraisalChoices[field].map(value => <label className={styles.choice} key={value}><input type="radio" name={field} checked={details[field] === value} onChange={() => update(field, value)} /><span>{value}</span></label>)}</div></fieldset>;
  }
  const summary = <aside className={styles.summary} aria-label="Appraisal vehicle summary">
    <h2>{title}</h2><p>{details.vin ? `VIN •••••••••••${details.vin.slice(-6)}` : "Manual vehicle entry"}</p>
    {image.src ? <Image src={image.src} width={600} height={400} alt={photo ? "Customer-selected vehicle photo; not verified" : "Representative vehicle photo, not the actual vehicle"} unoptimized className={styles.photo} /> : <div className={styles.silhouette}><CarFront size={84} aria-hidden="true" /><span>No matched vehicle photo</span></div>}
    <p className={styles.caption}>{image.label}</p>
    <ol className={styles.progress} aria-label="Appraisal progress">{steps.map((step, index) => <li key={step} aria-current={index === stage ? "step" : undefined} className={index <= stage ? styles.current : ""}>{index < stage ? <Check size={14} aria-hidden="true" /> : index + 1}<span>{step}</span></li>)}</ol>
    <dl>{vehicleFields.slice(3).map(([field, label]) => <div key={field}><dt>{label}</dt><dd>{details[field] || "Not provided"}</dd></div>)}</dl>
    <p className={styles.caption}>Basic specifications and customer answers are not an inspection, ownership verification or market valuation.</p>
  </aside>;

  if (receipt) return <section className="container narrow stack"><Check size={40} /><h1>Appraisal preview saved.</h1><div className="notice"><strong>{receipt.message}</strong><p>No appraisal has been delivered to staff. No offer, appointment or payment has been approved.</p></div><h2>{title}</h2><p>Preview reference: <code className="break">{receipt.reference}</code></p><p>Your selected photo was not uploaded. Cross-device account access and staff appraisal updates are not connected.</p><Link href="/garage" className="button primary">View preview My Garage</Link><Link href="/sell" className="text-link">Start another appraisal</Link></section>;

  if (!started) return <section className={styles.landing}>
    <div className={styles.hero}><div><p className="eyebrow">Time Motor Sales · Sell / Trade</p><h1>Your next chapter starts here.</h1><p>Sell your vehicle or trade toward your next one. Start with the VIN, or enter what you know.</p><p className={styles.caption}>No account or ownership upload required to start. No instant offer is promised.</p></div><div className={styles.startCard}><h2>Let’s find your vehicle</h2><p>Scan a VIN barcode, type the VIN, or use manual entry.</p><button className="button primary" onClick={() => { setStarted(true); setCamera(true); }}>Scan VIN barcode<Camera size={20} /></button><button className="button" onClick={() => setStarted(true)}>Enter VIN or vehicle details<ArrowRight size={20} /></button><p className={styles.caption}>License-plate lookup is deferred. Private preview: sample information only.</p></div></div>
    <div className="container section"><h2>Simple steps. Personal support.</h2><div className={styles.how}>{[["1", "Share vehicle details", "Confirm the vehicle and tell us about its condition."], ["2", "Prepare an appraisal request", "Choose sell or trade and review your answers."], ["3", "Review next steps", "When connected, staff will review the request and confirm any inspection or offer."]].map(([number, title, text]) => <article key={number}><span>{number}</span><h3>{title}</h3><p>{text}</p></article>)}</div><div className="notice">This is a private design workflow, not a live buying service. Licensed catalog photography, secure photo uploads, staff delivery, offers and appointments are not connected.</div></div>
  </section>;

  return <section className={`container section ${styles.flow}`}>
    <div className={styles.toolbar}><button className="text-link" type="button" onClick={() => stage ? go(stage - 1) : setStarted(false)}><ArrowLeft size={18} />Back</button><span>Step {stage + 1} of {steps.length}</span><button className="text-link" type="button" onClick={() => { if (window.confirm("Exit this appraisal? Unsent answers and the selected photo will be cleared. Nothing has been sent to staff.")) window.location.assign(publicPath("/sell")); }}>Exit appraisal</button></div>
    <div className={styles.layout}><div className={styles.questions}>
      <h1 ref={heading} tabIndex={-1}>{steps[stage]}</h1><p className={styles.caption}>Answers stay while you move between steps. Leaving or reloading clears this unsent draft.</p>
      <form onSubmit={next} className="stack">
        {stage === 0 && <>
          <p>No account or document upload is required. Looking up a VIN sends only that VIN to NHTSA for basic specifications—not ownership, history, price or a photograph.</p>
          <label htmlFor="appraisal-vin">VIN (optional for manual entry)</label><input id="appraisal-vin" value={details.vin} maxLength={17} autoComplete="off" onChange={event => editVehicle("vin", event.target.value.toUpperCase())} />
          <div className="row"><button className="button primary" type="button" disabled={lookupBusy || !preview} onClick={() => void lookup()}>{lookupBusy ? "Looking up VIN…" : "Find vehicle details"}</button><button className="button" type="button" onClick={() => setCamera(true)}><Camera size={18} />Scan VIN</button></div>
          {camera && <VinCamera onClose={() => setCamera(false)} onCapture={vin => { editVehicle("vin", vin); setCamera(false); if (preview) void lookup(vin); }} />}
          <p role="status">{lookupMessage || "Manual entry is always available. Unknown trim, equipment and color are not invented."}</p>
          <div className={styles.fields}>{vehicleFields.map(([field, label]) => <label key={field}>{label}{!["year", "make", "model"].includes(field) && " (optional)"}<input value={details[field] || ""} type={field === "year" ? "number" : "text"} min={field === "year" ? 1886 : undefined} max={field === "year" ? new Date().getFullYear() + 2 : undefined} maxLength={100} onChange={event => editVehicle(field, event.target.value)} required={["year", "make", "model"].includes(field)} /></label>)}</div>
          <label className={styles.confirm}><input type="checkbox" checked={vehicleConfirmed} onChange={event => setVehicleConfirmed(event.target.checked)} />I have reviewed and confirmed these vehicle details.</label>
        </>}
        {stage === 1 && <>
          <p>Select all known issues, or choose None known or Not sure. Your answers are not a mechanical inspection.</p>
          {conditionGroups.map(group => <fieldset key={group.key} className={styles.group}><legend>{group.title}</legend><div className={styles.choices}>{[...group.options, "None known", "Not sure"].map(value => <label key={value} className={styles.choice}><input type="checkbox" checked={(details[group.key] || "").split("|").includes(value)} onChange={() => update(group.key, toggleCondition(details[group.key] || "", value))} /><span>{value}</span></label>)}</div></fieldset>)}
          {choice("windshield", "Windshield condition")}{choice("modifications", "Has the vehicle been modified?")}{choice("drivable", "Can the vehicle be driven safely?")}{details.drivable && details.drivable !== "Drivable" && <p className="notice">Do not drive an unsafe vehicle. Staff will need to discuss inspection and transport; no pickup or towing is booked here.</p>}{choice("condition", "Overall condition")}
          <label>Anything else about the condition? (optional)<textarea value={details.issues || ""} maxLength={1000} onChange={event => update("issues", event.target.value)} /></label>
        </>}
        {stage === 2 && <><label>Current mileage<input required inputMode="numeric" pattern="[0-9]{1,7}" value={details.mileage || ""} onChange={event => update("mileage", event.target.value)} /></label>{choice("accidents", "Known accident history")}{choice("smoked", "Has it been smoked in?")}{choice("tires", "Tires replaced in the past 12 months")}{choice("keys", "How many keys do you have?")}</>}
        {stage === 3 && <><h2>Add a vehicle photo (optional)</h2><p>A clear exterior photo helps you recognize your vehicle throughout this flow. Do not select IDs, titles or documents showing private information.</p><div className="notice">Photo selection is local to this tab. Secure uploads and licensed catalog images are not connected. You can continue without a photo.</div><label>Choose a vehicle photo<input type="file" accept="image/jpeg,image/png,image/webp" disabled={photoBusy} onChange={event => { void choosePhoto(event.target.files?.[0]); event.target.value = ""; }} /></label><label>Take a vehicle photo (supported phones)<input type="file" accept="image/jpeg,image/png,image/webp" capture="environment" disabled={photoBusy} onChange={event => { void choosePhoto(event.target.files?.[0]); event.target.value = ""; }} /></label><p className={styles.caption}>JPEG, PNG or WebP · 5 MB maximum. Your own photo overrides the silhouette; it is not evidence of verified condition.</p><p role="status">{photoBusy ? "Checking photo…" : photoMessage}</p>{photo && <button className="text-link" type="button" onClick={() => { photoVersion.current += 1; setPhoto(""); setPhotoMessage("Photo removed."); }}>Remove selected photo</button>}</>}
        {stage === 4 && <><label>Vehicle ZIP code<input required inputMode="numeric" pattern="[0-9]{5}" maxLength={5} value={details.zip || ""} onChange={event => update("zip", event.target.value)} /></label>{choice("loan", "Is there a loan or lease?")}{details.loan && ["Loan", "Lease"].includes(details.loan) && <p className="notice">Payoff and lender/lessor requirements need staff review later. Do not enter account numbers here.</p>}{choice("intent", "What would you like to do?")}{choice("contactMethod", "How would you prefer a response?")}<p>Phone call does not authorize SMS or marketing. No response time, pickup service or appointment is promised.</p></>}
        {stage === 5 && <><h2>Review your appraisal request</h2><p>{title}</p>{[0, 1, 2, 4].map(step => <details key={step} className={styles.review}><summary>{steps[step]} answers</summary><dl>{Object.entries(details).filter(([key, value]) => value && (step === 0 ? ["vin", ...vehicleFields.map(([field]) => field), "vehicleSource"].includes(key) : step === 1 ? [...conditionGroups.map(group => group.key), "windshield", "modifications", "drivable", "condition", "issues"].includes(key) : step === 2 ? ["mileage", "accidents", "smoked", "tires", "keys"].includes(key) : ["zip", "intent", "loan", "contactMethod"].includes(key))).map(([key, value]) => <div key={key}><dt>{key.replace(/([A-Z])/g, " $1")}</dt><dd>{value.split("|").join(", ")}</dd></div>)}</dl><button type="button" className="text-link" onClick={() => go(step)}>Edit {steps[step].toLowerCase()}</button></details>)}
          <label>Name (optional)<input maxLength={150} autoComplete="name" value={name} onChange={event => { setName(event.target.value); submissionKey.current = ""; }} /></label>
          <label>Email address {details.contactMethod === "Email" ? "(required)" : "(optional)"}<input type="email" autoComplete="email" maxLength={254} required={details.contactMethod === "Email"} value={email} onChange={event => { setEmail(event.target.value); submissionKey.current = ""; }} /></label>
          <label>Phone number {details.contactMethod === "Phone call" ? "(required)" : "(optional)"}<input type="tel" autoComplete="tel" maxLength={40} required={details.contactMethod === "Phone call"} value={phone} onChange={event => { setPhone(event.target.value); submissionKey.current = ""; }} /></label>
          <div className="notice"><ShieldCheck size={20} /><strong>No instant offer.</strong><p>{preview ? "Use fictitious information only. This saves a private preview request—not a live appraisal delivered to staff. The selected photo is not saved." : "Live appraisal requests are not connected. No request can be sent."}</p></div>
          {preview && <label className={styles.confirm}><input type="checkbox" required checked={consent} onChange={event => setConsent(event.target.checked)} />I understand this is a private preview and will use sample information only.</label>}
        </>}
        {error && <p role="alert" className="notice">{error}</p>}
        <button type="submit" className="button primary" disabled={lookupBusy || photoBusy || busy || stage === 5 && (!preview || !consent)}>{busy ? "Saving preview…" : stage === 5 ? "Save preview appraisal request" : "Continue"}<ArrowRight size={18} /></button>
      </form>
    </div>{summary}</div>
  </section>;
}
