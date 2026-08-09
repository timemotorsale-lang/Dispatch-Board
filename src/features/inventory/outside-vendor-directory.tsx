"use client";

import { FormEvent, useState, useTransition } from "react";
import { Building2, Mail, MapPin, Phone, Plus, Save } from "lucide-react";
import { useRouter } from "next/navigation";

type Vendor = { address: string | null; code: string; contactName: string | null; defaultLeadDays: number; email: string | null; id: string; name: string; notes: string | null; phoneNumber: string | null; status: string; vendorType: string };
const format = (value: string) => value.replaceAll("_", " ").toLocaleLowerCase().replace(/^./, (letter) => letter.toUpperCase());

export function OutsideVendorDirectory({ vendors }: { vendors: Vendor[] }) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);

  function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault(); setError(null); setMessage(null);
    const form = new FormData(event.currentTarget);
    startTransition(async () => {
      const response = await fetch("/api/repair-vendors", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ address: form.get("address"), contactName: form.get("contactName"), defaultLeadDays: Number(form.get("defaultLeadDays") || 1), email: form.get("email"), name: form.get("name"), notes: form.get("notes"), phoneNumber: form.get("phoneNumber"), vendorType: form.get("vendorType"), idempotencyKey: crypto.randomUUID(), reason: "Add reusable outside repair vendor to Inventory resources." }) });
      const payload = await response.json().catch(() => ({}));
      if (!response.ok) { setError(payload.error ?? "Outside vendor could not be added."); return; }
      setMessage("Outside vendor added and available to Service Advisors."); setOpen(false); router.refresh();
    });
  }

  return <section className="outside-vendor-directory">
    <header><div><small>Inventory lifecycle · Shared resources</small><h1>Outside vendors</h1><p>Maintain body shops, specialty repairers, glass, calibration, detail, and other sublet partners once for every repair order.</p></div><button onClick={() => setOpen(true)} type="button"><Plus /> Add outside vendor</button></header>
    <section className="outside-vendor-guidance"><Building2 /><div><strong>Right data, not too much</strong><span>Service Advisors see only the vendor identity, contact, work type, expected lead time, and assignment facts needed to execute quickly.</span></div></section>
    {open ? <form onSubmit={submit}><header><strong>Add outside vendor</strong><span>This vendor becomes reusable in Service Advisor and Shop &amp; Recon workflows.</span></header><label><span>Vendor name</span><input name="name" placeholder="Diego Auto Body" required /></label><label><span>Vendor type</span><select name="vendorType"><option value="BODY_SHOP">Body shop</option><option value="MECHANICAL_SUBLET">Mechanical sublet</option><option value="GLASS">Glass</option><option value="CALIBRATION">Calibration</option><option value="DETAIL">Detail</option><option value="TRANSPORT">Transport</option><option value="OTHER">Other</option></select></label><label><span>Default lead time</span><input min="0" name="defaultLeadDays" type="number" defaultValue="1" /></label><label><span>Contact name</span><input name="contactName" /></label><label><span>Phone</span><input name="phoneNumber" type="tel" /></label><label><span>Email</span><input name="email" type="email" /></label><label className="wide"><span>Address</span><input name="address" /></label><label className="wide"><span>Operating notes</span><textarea name="notes" placeholder="Pickup hours, towing instructions, preferred estimate method, or escalation contact" /></label>{error ? <p className="advisor-response-error wide">{error}</p> : null}<button disabled={pending} type="submit"><Save /> {pending ? "Saving..." : "Save outside vendor"}</button></form> : null}
    {message ? <p className="outside-vendor-message">{message}</p> : null}
    <div className="outside-vendor-grid">{vendors.length ? vendors.map((vendor) => <article key={vendor.id}><header><Building2 /><span><strong>{vendor.name}</strong><small>{vendor.code} · {format(vendor.vendorType)}</small></span><b>{format(vendor.status)}</b></header><dl><div><dt>Contact</dt><dd>{vendor.contactName ?? "Not recorded"}</dd></div><div><dt>Lead time</dt><dd>{vendor.defaultLeadDays} day(s)</dd></div></dl>{vendor.phoneNumber ? <a href={`tel:${vendor.phoneNumber}`}><Phone /> {vendor.phoneNumber}</a> : null}{vendor.email ? <a href={`mailto:${vendor.email}`}><Mail /> {vendor.email}</a> : null}{vendor.address ? <p><MapPin /> {vendor.address}</p> : null}</article>) : <div className="outside-vendor-empty"><Building2 /><strong>No outside vendors added yet</strong><span>Add Diego Auto Body or another partner once, then select it from any repair order.</span></div>}</div>
  </section>;
}
