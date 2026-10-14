"use client";

import { Building2, CheckCircle2, ClipboardList, Plus, Search, ShieldAlert } from "lucide-react";
import Link from "next/link";
import { type FormEvent, useMemo, useState } from "react";

import type { VendorRegistryReadModel } from "@/server/vendors/vendor-service";

type VendorFormState = {
  accountReference: string;
  addressSummary: string;
  category: string;
  name: string;
  notes: string;
  ownerUserId: string;
  primaryContactName: string;
  primaryEmail: string;
  primaryPhone: string;
  status: string;
  websiteOrPortalUrl: string;
};

const emptyVendorForm: VendorFormState = {
  accountReference: "",
  addressSummary: "",
  category: "LENDER_BANK",
  name: "",
  notes: "",
  ownerUserId: "",
  primaryContactName: "",
  primaryEmail: "",
  primaryPhone: "",
  status: "ACTIVE",
  websiteOrPortalUrl: ""
};

async function readVendorJson(response: Response) {
  const payload = await response.json().catch(() => ({}));
  if (!response.ok) {
    throw new Error(typeof payload.error === "string" ? payload.error : "Vendor action failed.");
  }
  return payload;
}

function formatTime(value: string) {
  return new Intl.DateTimeFormat([], { dateStyle: "medium", timeStyle: "short" }).format(new Date(value));
}

export function VendorRegistryPage({ initialReadModel }: { initialReadModel: VendorRegistryReadModel }) {
  const [readModel, setReadModel] = useState(initialReadModel);
  const [filters, setFilters] = useState({ category: "", q: "", status: "" });
  const [form, setForm] = useState<VendorFormState>(emptyVendorForm);
  const [notice, setNotice] = useState(`Vendor registry loaded ${formatTime(initialReadModel.generatedAt)}.`);
  const [busy, setBusy] = useState(false);

  const warningText = useMemo(() => {
    if (!readModel.stats.warning) return "No warning vendors";
    return `${readModel.stats.warning} warning vendor${readModel.stats.warning === 1 ? "" : "s"}`;
  }, [readModel.stats.warning]);

  const reload = async (nextFilters = filters) => {
    const searchParams = new URLSearchParams();
    for (const [key, value] of Object.entries(nextFilters)) {
      if (value) searchParams.set(key, value);
    }
    const response = await fetch(`/api/vendors?${searchParams.toString()}`);
    const payload = (await readVendorJson(response)) as VendorRegistryReadModel;
    setReadModel(payload);
    setNotice(`Vendor registry refreshed ${formatTime(payload.generatedAt)}.`);
  };

  const submitSearch = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setBusy(true);
    try {
      await reload(filters);
    } catch (error) {
      setNotice(error instanceof Error ? error.message : "Unable to refresh vendors.");
    } finally {
      setBusy(false);
    }
  };

  const createVendor = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setBusy(true);
    try {
      const response = await fetch("/api/vendors", {
        body: JSON.stringify({ ...form, ownerUserId: form.ownerUserId || undefined }),
        headers: { "content-type": "application/json" },
        method: "POST"
      });
      await readVendorJson(response);
      setForm(emptyVendorForm);
      await reload();
      setNotice(`Vendor saved ${new Date().toLocaleTimeString([], { hour: "numeric", minute: "2-digit" })}.`);
    } catch (error) {
      setNotice(error instanceof Error ? error.message : "Unable to save vendor.");
    } finally {
      setBusy(false);
    }
  };

  return (
    <section className="vendor-registry-shell" aria-label="Vendor Registry">
      <header className="vendor-registry-header">
        <div>
          <span className="vendor-registry-kicker">CRM department</span>
          <h1>Vendor Registry</h1>
          <p>Manage banks, warranties, transport, parts, recon, auction partners, and internal vendor contacts from one clean workspace.</p>
        </div>
        <Link className="vendor-secondary-link" href="/customers">Back to CRM Console</Link>
      </header>

      <section className="vendor-stat-grid" aria-label="Vendor registry health">
        <article><Building2 size={20} /><span>Total vendors</span><strong>{readModel.stats.total}</strong></article>
        <article><CheckCircle2 size={20} /><span>Preferred</span><strong>{readModel.stats.preferred}</strong></article>
        <article><ShieldAlert size={20} /><span>{warningText}</span><strong>{readModel.stats.doNotUse} do not use</strong></article>
      </section>

      <div className="vendor-registry-layout">
        <main className="vendor-list-panel">
          <form className="vendor-filter-bar" onSubmit={submitSearch}>
            <label>
              <Search size={16} />
              <input aria-label="Search vendors" onChange={(event) => setFilters({ ...filters, q: event.target.value })} placeholder="Search vendor, contact, email, account..." value={filters.q} />
            </label>
            <select aria-label="Filter vendor category" onChange={(event) => setFilters({ ...filters, category: event.target.value })} value={filters.category}>
              <option value="">All categories</option>
              {readModel.categoryOptions.map((option) => <option key={option.value} value={option.value}>{option.label}</option>)}
            </select>
            <select aria-label="Filter vendor status" onChange={(event) => setFilters({ ...filters, status: event.target.value })} value={filters.status}>
              <option value="">All statuses</option>
              {readModel.statusOptions.map((option) => <option key={option.value} value={option.value}>{option.label}</option>)}
            </select>
            <button disabled={busy} type="submit">Apply</button>
          </form>
          <div className="vendor-live-notice" aria-live="polite">{notice}</div>
          <div className="vendor-list">
            {readModel.vendors.length ? readModel.vendors.map((vendor) => (
              <Link className="vendor-list-row" data-status={vendor.status} href={`/customers/vendors/${vendor.id}`} key={vendor.id}>
                <span>
                  <strong>{vendor.name}</strong>
                  <small>{vendor.vendorNumber} · {vendor.categoryLabel}</small>
                </span>
                <span>{vendor.primaryContactName || vendor.primaryEmail || vendor.primaryPhone || "No primary contact"}</span>
                <span>{vendor.ownerUser?.name ?? "No owner"}</span>
                <em>{vendor.statusLabel}</em>
              </Link>
            )) : <p className="vendor-empty">No vendors match this view yet.</p>}
          </div>
        </main>

        <aside className="vendor-create-panel" aria-label="Add vendor">
          <form onSubmit={createVendor}>
            <header><ClipboardList size={19} /><strong>Add Vendor</strong></header>
            <input aria-label="Vendor name" disabled={!readModel.permissions.canCreate} onChange={(event) => setForm({ ...form, name: event.target.value })} placeholder="Vendor name" value={form.name} />
            <div className="vendor-two-column">
              <select aria-label="Vendor category" disabled={!readModel.permissions.canCreate} onChange={(event) => setForm({ ...form, category: event.target.value })} value={form.category}>
                {readModel.categoryOptions.map((option) => <option key={option.value} value={option.value}>{option.label}</option>)}
              </select>
              <select aria-label="Vendor status" disabled={!readModel.permissions.canCreate} onChange={(event) => setForm({ ...form, status: event.target.value })} value={form.status}>
                {readModel.statusOptions.map((option) => <option key={option.value} value={option.value}>{option.label}</option>)}
              </select>
            </div>
            <input aria-label="Primary contact" disabled={!readModel.permissions.canCreate} onChange={(event) => setForm({ ...form, primaryContactName: event.target.value })} placeholder="Primary contact" value={form.primaryContactName} />
            <div className="vendor-two-column">
              <input aria-label="Primary phone" disabled={!readModel.permissions.canCreate} onChange={(event) => setForm({ ...form, primaryPhone: event.target.value })} placeholder="Phone" value={form.primaryPhone} />
              <input aria-label="Primary email" disabled={!readModel.permissions.canCreate} onChange={(event) => setForm({ ...form, primaryEmail: event.target.value })} placeholder="Email" value={form.primaryEmail} />
            </div>
            <input aria-label="Account reference" disabled={!readModel.permissions.canCreate} onChange={(event) => setForm({ ...form, accountReference: event.target.value })} placeholder="Account / portal reference" value={form.accountReference} />
            <textarea aria-label="Vendor address" disabled={!readModel.permissions.canCreate} onChange={(event) => setForm({ ...form, addressSummary: event.target.value })} placeholder="Vendor address / location notes" value={form.addressSummary} />
            <input aria-label="Website or portal URL" disabled={!readModel.permissions.canCreate} onChange={(event) => setForm({ ...form, websiteOrPortalUrl: event.target.value })} placeholder="Website or portal URL" value={form.websiteOrPortalUrl} />
            <select aria-label="Vendor owner" disabled={!readModel.permissions.canCreate} onChange={(event) => setForm({ ...form, ownerUserId: event.target.value })} value={form.ownerUserId}>
              <option value="">No owner yet</option>
              {readModel.assignableUsers.map((user) => <option key={user.id} value={user.id}>{user.name}</option>)}
            </select>
            <textarea aria-label="Vendor notes" disabled={!readModel.permissions.canCreate} onChange={(event) => setForm({ ...form, notes: event.target.value })} placeholder="Internal notes, terms, warning, account rules..." value={form.notes} />
            <button disabled={busy || !readModel.permissions.canCreate} type="submit"><Plus size={16} /> Save Vendor</button>
            {!readModel.permissions.canCreate ? <p>Manager access is required to add vendor master records.</p> : null}
          </form>
        </aside>
      </div>
    </section>
  );
}
