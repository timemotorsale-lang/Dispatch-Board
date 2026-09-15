"use client";

import { Activity, ArrowLeft, ClipboardCheck, Download, ExternalLink, Eye, FileText, LockKeyhole, MessageSquarePlus, PackageCheck, Save, ShieldCheck, Upload, X } from "lucide-react";
import Link from "next/link";
import { type FormEvent, useState } from "react";

import type { VendorProfile, VendorProfileReadModel } from "@/server/vendors/vendor-service";

type VendorEditForm = {
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

function formFromVendor(vendor: VendorProfile): VendorEditForm {
  return {
    accountReference: vendor.accountReference ?? "",
    addressSummary: vendor.addressSummary ?? "",
    category: vendor.category,
    name: vendor.name,
    notes: vendor.notes ?? "",
    ownerUserId: vendor.ownerUser?.id ?? "",
    primaryContactName: vendor.primaryContactName ?? "",
    primaryEmail: vendor.primaryEmail ?? "",
    primaryPhone: vendor.primaryPhone ?? "",
    status: vendor.status,
    websiteOrPortalUrl: vendor.websiteOrPortalUrl ?? ""
  };
}

async function readVendorJson(response: Response) {
  const payload = await response.json().catch(() => ({}));
  if (!response.ok) {
    throw new Error(typeof payload.error === "string" ? payload.error : "Vendor action failed.");
  }
  return payload;
}

function formatDateTime(value: string) {
  return new Intl.DateTimeFormat([], { dateStyle: "medium", timeStyle: "short" }).format(new Date(value));
}

function todayDate() {
  return new Date().toISOString().slice(0, 10);
}

function defaultDueAt(date: string) {
  return new Date(`${date}T12:00:00`).toISOString();
}

function formatFileSize(bytes: number) {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${Math.round(bytes / 1024)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

function formatMoney(value: number | null) {
  if (value === null) return "Amount TBD";
  return new Intl.NumberFormat([], { currency: "USD", style: "currency" }).format(value);
}

function normalizeWebsiteHref(value: string) {
  const trimmedValue = value.trim();
  if (!trimmedValue) return "";
  if (/^https?:\/\//i.test(trimmedValue)) return trimmedValue;
  return `https://${trimmedValue}`;
}

type ProtectedVendorNote = {
  id: string;
  body: string;
  authorUser: { id: string; name: string; email?: string } | null;
  createdAt: string;
};

type VendorBatchTickets = {
  batch: VendorProfile["invoiceBatches"][number];
  jobs: VendorProfile["workJobs"];
  generatedAt: string;
};

type VendorJobEditForm = {
  amount: string;
  notes: string;
  serviceDate: string;
  vehicleReference: string;
  workDescription: string;
  workType: string;
};

function editFormFromJob(job: VendorProfile["workJobs"][number]): VendorJobEditForm {
  return {
    amount: job.amount === null ? "" : String(job.amount),
    notes: job.notes ?? "",
    serviceDate: job.serviceDate,
    vehicleReference: job.vehicleReference,
    workDescription: job.workDescription ?? "",
    workType: job.workType
  };
}

export function VendorProfilePage({ initialReadModel }: { initialReadModel: VendorProfileReadModel }) {
  const [vendor, setVendor] = useState(initialReadModel.vendor);
  const [form, setForm] = useState(() => formFromVendor(initialReadModel.vendor));
  const [noteBody, setNoteBody] = useState("");
  const [taskForm, setTaskForm] = useState({
    boardDate: todayDate(),
    description: `Follow up with ${initialReadModel.vendor.name}.`,
    dueAt: defaultDueAt(todayDate()),
    title: `Vendor follow-up: ${initialReadModel.vendor.name}`
  });
  const [documentForm, setDocumentForm] = useState({
    documentType: "GENERAL",
    file: null as File | null,
    notes: "",
    title: ""
  });
  const [workJobForm, setWorkJobForm] = useState({
    additionalVehicleReferences: "",
    amount: "",
    notes: "",
    serviceDate: todayDate(),
    vehicleReference: "",
    workDescription: "",
    workType: "Windshield replacement"
  });
  const [batchForm, setBatchForm] = useState({
    notes: "",
    title: ""
  });
  const [batchCloseForm, setBatchCloseForm] = useState({
    invoiceDate: todayDate(),
    invoiceNumber: "",
    notes: "",
    totalAmount: ""
  });
  const [notice, setNotice] = useState(`Vendor profile loaded ${formatDateTime(initialReadModel.generatedAt)}.`);
  const [busy, setBusy] = useState(false);
  const [activityDrawerOpen, setActivityDrawerOpen] = useState(false);
  const [protectedDrawerOpen, setProtectedDrawerOpen] = useState(false);
  const [protectedAccessCode, setProtectedAccessCode] = useState("");
  const [protectedUnlocked, setProtectedUnlocked] = useState(false);
  const [protectedNotes, setProtectedNotes] = useState<ProtectedVendorNote[]>([]);
  const [protectedNoteBody, setProtectedNoteBody] = useState("");
  const [batchTicketsDrawerOpen, setBatchTicketsDrawerOpen] = useState(false);
  const [batchTickets, setBatchTickets] = useState<VendorBatchTickets | null>(null);
  const [editingJobId, setEditingJobId] = useState<string | null>(null);
  const [jobEditForm, setJobEditForm] = useState<VendorJobEditForm | null>(null);

  const saveVendor = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setBusy(true);
    try {
      const response = await fetch(`/api/vendors/${vendor.id}`, {
        body: JSON.stringify({ ...form, ownerUserId: form.ownerUserId || undefined }),
        headers: { "content-type": "application/json" },
        method: "PATCH"
      });
      const payload = (await readVendorJson(response)) as { vendor: VendorProfile };
      setVendor(payload.vendor);
      setForm(formFromVendor(payload.vendor));
      setNotice(`Vendor saved ${new Date().toLocaleTimeString([], { hour: "numeric", minute: "2-digit" })}.`);
    } catch (error) {
      setNotice(error instanceof Error ? error.message : "Unable to save vendor.");
    } finally {
      setBusy(false);
    }
  };

  const addNote = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setBusy(true);
    try {
      const response = await fetch(`/api/vendors/${vendor.id}/notes`, {
        body: JSON.stringify({ body: noteBody }),
        headers: { "content-type": "application/json" },
        method: "POST"
      });
      const payload = await readVendorJson(response) as { note: VendorProfile["vendorNotes"][number] };
      setVendor({ ...vendor, noteCount: vendor.noteCount + 1, vendorNotes: [payload.note, ...vendor.vendorNotes] });
      setNoteBody("");
      setNotice(`Update saved ${new Date().toLocaleTimeString([], { hour: "numeric", minute: "2-digit" })}.`);
    } catch (error) {
      setNotice(error instanceof Error ? error.message : "Unable to save update.");
    } finally {
      setBusy(false);
    }
  };

  const createTask = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setBusy(true);
    try {
      const response = await fetch(`/api/vendors/${vendor.id}/tasks`, {
        body: JSON.stringify(taskForm),
        headers: { "content-type": "application/json" },
        method: "POST"
      });
      const payload = await readVendorJson(response) as { task: { id: string; title: string } };
      setVendor({
        ...vendor,
        linkedRecordCount: vendor.linkedRecordCount + 1,
        recordLinks: [{
          id: payload.task.id,
          labelSnapshot: payload.task.title,
          recordId: payload.task.id,
          recordType: "TASK",
          relationshipType: "CREATED_FROM_VENDOR",
          createdAt: new Date().toISOString()
        }, ...vendor.recordLinks]
      });
      setNotice(`Task created ${new Date().toLocaleTimeString([], { hour: "numeric", minute: "2-digit" })}.`);
    } catch (error) {
      setNotice(error instanceof Error ? error.message : "Unable to create task.");
    } finally {
      setBusy(false);
    }
  };

  const uploadDocument = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!documentForm.file) {
      setNotice("Choose a file to upload.");
      return;
    }

    setBusy(true);
    try {
      const formData = new FormData();
      formData.set("file", documentForm.file);
      formData.set("title", documentForm.title || documentForm.file.name);
      formData.set("documentType", documentForm.documentType);
      formData.set("notes", documentForm.notes);
      const response = await fetch(`/api/vendors/${vendor.id}/documents`, {
        body: formData,
        method: "POST"
      });
      const payload = await readVendorJson(response) as { document: VendorProfile["documents"][number] };
      setVendor({
        ...vendor,
        documents: [payload.document, ...vendor.documents]
      });
      setDocumentForm({ documentType: "GENERAL", file: null, notes: "", title: "" });
      const fileInput = event.currentTarget.querySelector<HTMLInputElement>('input[type="file"]');
      if (fileInput) fileInput.value = "";
      setNotice(`Document uploaded ${new Date().toLocaleTimeString([], { hour: "numeric", minute: "2-digit" })}.`);
    } catch (error) {
      setNotice(error instanceof Error ? error.message : "Unable to upload document.");
    } finally {
      setBusy(false);
    }
  };

  const unlockProtectedNotes = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setBusy(true);
    try {
      const response = await fetch(`/api/vendors/${vendor.id}/protected-notes`, {
        body: JSON.stringify({ accessCode: protectedAccessCode }),
        headers: { "content-type": "application/json" },
        method: "POST"
      });
      const payload = await readVendorJson(response) as { notes: ProtectedVendorNote[]; unlockedAt: string };
      setProtectedNotes(payload.notes);
      setProtectedUnlocked(true);
      setNotice(`Protected drawer unlocked ${formatDateTime(payload.unlockedAt)}.`);
    } catch (error) {
      setProtectedUnlocked(false);
      setProtectedNotes([]);
      setNotice(error instanceof Error ? error.message : "Unable to unlock protected drawer.");
    } finally {
      setBusy(false);
    }
  };

  const addProtectedNote = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setBusy(true);
    try {
      const response = await fetch(`/api/vendors/${vendor.id}/protected-notes`, {
        body: JSON.stringify({ accessCode: protectedAccessCode, body: protectedNoteBody }),
        headers: { "content-type": "application/json" },
        method: "PUT"
      });
      const payload = await readVendorJson(response) as { note: ProtectedVendorNote };
      setProtectedNotes([payload.note, ...protectedNotes]);
      setProtectedNoteBody("");
      setVendor({ ...vendor, protectedNoteCount: vendor.protectedNoteCount + 1 });
      setNotice(`Protected note saved ${new Date().toLocaleTimeString([], { hour: "numeric", minute: "2-digit" })}.`);
    } catch (error) {
      setNotice(error instanceof Error ? error.message : "Unable to save protected note.");
    } finally {
      setBusy(false);
    }
  };

  const closeProtectedDrawer = () => {
    setProtectedDrawerOpen(false);
    setProtectedUnlocked(false);
    setProtectedAccessCode("");
    setProtectedNoteBody("");
    setProtectedNotes([]);
  };

  const websiteHref = normalizeWebsiteHref(form.websiteOrPortalUrl);
  const openBatch = vendor.invoiceBatches.find((batch) => batch.status === "OPEN") ?? null;

  const recordWorkJob = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setBusy(true);
    try {
      const response = await fetch(`/api/vendors/${vendor.id}/work-jobs`, {
        body: JSON.stringify(workJobForm),
        headers: { "content-type": "application/json" },
        method: "POST"
      });
      const payload = await readVendorJson(response) as { vendor: VendorProfile };
      setVendor(payload.vendor);
      setWorkJobForm({
        additionalVehicleReferences: "",
        amount: "",
        notes: "",
        serviceDate: todayDate(),
        vehicleReference: "",
        workDescription: "",
        workType: workJobForm.workType
      });
      setNotice(`Vendor job recorded ${new Date().toLocaleTimeString([], { hour: "numeric", minute: "2-digit" })}.`);
    } catch (error) {
      setNotice(error instanceof Error ? error.message : "Unable to record vendor job.");
    } finally {
      setBusy(false);
    }
  };

  const openInvoiceBatch = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setBusy(true);
    try {
      const response = await fetch(`/api/vendors/${vendor.id}/invoice-batches`, {
        body: JSON.stringify(batchForm),
        headers: { "content-type": "application/json" },
        method: "POST"
      });
      const payload = await readVendorJson(response) as { vendor: VendorProfile };
      setVendor(payload.vendor);
      setBatchForm({ notes: "", title: "" });
      setNotice(`Batch opened ${new Date().toLocaleTimeString([], { hour: "numeric", minute: "2-digit" })}.`);
    } catch (error) {
      setNotice(error instanceof Error ? error.message : "Unable to open batch.");
    } finally {
      setBusy(false);
    }
  };

  const closeInvoiceBatch = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!openBatch) return;
    setBusy(true);
    try {
      const response = await fetch(`/api/vendors/${vendor.id}/invoice-batches/${openBatch.id}/close`, {
        body: JSON.stringify(batchCloseForm),
        headers: { "content-type": "application/json" },
        method: "POST"
      });
      const payload = await readVendorJson(response) as { vendor: VendorProfile };
      setVendor(payload.vendor);
      setBatchCloseForm({ invoiceDate: todayDate(), invoiceNumber: "", notes: "", totalAmount: "" });
      setNotice(`Batch closed ${new Date().toLocaleTimeString([], { hour: "numeric", minute: "2-digit" })}.`);
    } catch (error) {
      setNotice(error instanceof Error ? error.message : "Unable to close batch.");
    } finally {
      setBusy(false);
    }
  };

  const openBatchTickets = async (batchId: string) => {
    setBusy(true);
    setBatchTicketsDrawerOpen(true);
    setEditingJobId(null);
    setJobEditForm(null);
    try {
      const response = await fetch(`/api/vendors/${vendor.id}/invoice-batches/${batchId}`);
      const payload = await readVendorJson(response) as VendorBatchTickets;
      setBatchTickets(payload);
      setNotice(`Batch tickets loaded ${formatDateTime(payload.generatedAt)}.`);
    } catch (error) {
      setBatchTickets(null);
      setNotice(error instanceof Error ? error.message : "Unable to load batch tickets.");
    } finally {
      setBusy(false);
    }
  };

  const closeBatchTicketsDrawer = () => {
    setBatchTicketsDrawerOpen(false);
    setBatchTickets(null);
    setEditingJobId(null);
    setJobEditForm(null);
  };

  const startEditingJob = (job: VendorProfile["workJobs"][number]) => {
    setEditingJobId(job.id);
    setJobEditForm(editFormFromJob(job));
  };

  const saveEditedJob = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!editingJobId || !jobEditForm) return;
    setBusy(true);
    try {
      const response = await fetch(`/api/vendors/${vendor.id}/work-jobs/${editingJobId}`, {
        body: JSON.stringify({ ...jobEditForm, additionalVehicleReferences: [] }),
        headers: { "content-type": "application/json" },
        method: "PATCH"
      });
      const payload = await readVendorJson(response) as { job: VendorProfile["workJobs"][number]; vendor: VendorProfile };
      setVendor(payload.vendor);
      if (batchTickets) {
        const refreshedResponse = await fetch(`/api/vendors/${vendor.id}/invoice-batches/${batchTickets.batch.id}`);
        const refreshedPayload = await readVendorJson(refreshedResponse) as VendorBatchTickets;
        setBatchTickets(refreshedPayload);
      }
      setEditingJobId(null);
      setJobEditForm(null);
      setNotice(`Ticket updated ${new Date().toLocaleTimeString([], { hour: "numeric", minute: "2-digit" })}.`);
    } catch (error) {
      setNotice(error instanceof Error ? error.message : "Unable to update ticket.");
    } finally {
      setBusy(false);
    }
  };

  return (
    <section className="vendor-registry-shell vendor-profile-shell" aria-label={`${vendor.name} vendor profile`}>
      <header className="vendor-registry-header">
        <div>
          <Link className="vendor-inline-back" href="/customers/vendors"><ArrowLeft size={16} /> Vendor Registry</Link>
          <span className="vendor-registry-kicker">{vendor.vendorNumber} · {vendor.categoryLabel}</span>
          <h1>{vendor.name}</h1>
          <p>{vendor.primaryContactName || vendor.primaryEmail || vendor.primaryPhone || "No primary contact saved yet."}</p>
        </div>
        <div className="vendor-profile-header-actions">
          <button aria-expanded={activityDrawerOpen} aria-controls="vendor-activity-drawer" onClick={() => setActivityDrawerOpen(true)} type="button">
            <Activity size={16} /> Activity <span>{vendor.activities.length}</span>
          </button>
          <button aria-expanded={protectedDrawerOpen} aria-controls="vendor-protected-drawer" onClick={() => setProtectedDrawerOpen(true)} type="button">
            <LockKeyhole size={16} /> Protected <span>{vendor.protectedNoteCount}</span>
          </button>
          <span className="vendor-status-pill" data-status={vendor.status}>{vendor.statusLabel}</span>
        </div>
      </header>

      <div className="vendor-live-notice" aria-live="polite">{notice}</div>

      <div className="vendor-profile-layout">
        <main className="vendor-profile-main">
          <form className="vendor-profile-editor" onSubmit={saveVendor}>
            <header><strong>Vendor Details</strong><button disabled={busy || !initialReadModel.permissions.canUpdate} type="submit"><Save size={16} /> Save changes</button></header>
            <input aria-label="Vendor name" disabled={!initialReadModel.permissions.canUpdate} onChange={(event) => setForm({ ...form, name: event.target.value })} value={form.name} />
            <div className="vendor-two-column">
              <select aria-label="Vendor category" disabled={!initialReadModel.permissions.canUpdate} onChange={(event) => setForm({ ...form, category: event.target.value })} value={form.category}>
                {initialReadModel.categoryOptions.map((option) => <option key={option.value} value={option.value}>{option.label}</option>)}
              </select>
              <select aria-label="Vendor status" disabled={!initialReadModel.permissions.canUpdate} onChange={(event) => setForm({ ...form, status: event.target.value })} value={form.status}>
                {initialReadModel.statusOptions.map((option) => <option key={option.value} value={option.value}>{option.label}</option>)}
              </select>
            </div>
            <div className="vendor-two-column">
              <input aria-label="Primary contact" disabled={!initialReadModel.permissions.canUpdate} onChange={(event) => setForm({ ...form, primaryContactName: event.target.value })} placeholder="Primary contact" value={form.primaryContactName} />
              <input aria-label="Account reference" disabled={!initialReadModel.permissions.canUpdate} onChange={(event) => setForm({ ...form, accountReference: event.target.value })} placeholder="Account reference" value={form.accountReference} />
            </div>
            <div className="vendor-two-column">
              <input aria-label="Primary phone" disabled={!initialReadModel.permissions.canUpdate} onChange={(event) => setForm({ ...form, primaryPhone: event.target.value })} placeholder="Phone" value={form.primaryPhone} />
              <input aria-label="Primary email" disabled={!initialReadModel.permissions.canUpdate} onChange={(event) => setForm({ ...form, primaryEmail: event.target.value })} placeholder="Email" value={form.primaryEmail} />
            </div>
            <select aria-label="Vendor owner" disabled={!initialReadModel.permissions.canUpdate} onChange={(event) => setForm({ ...form, ownerUserId: event.target.value })} value={form.ownerUserId}>
              <option value="">No owner yet</option>
              {initialReadModel.assignableUsers.map((user) => <option key={user.id} value={user.id}>{user.name}</option>)}
            </select>
            <div className="vendor-website-field">
              <input aria-label="Website or portal URL" disabled={!initialReadModel.permissions.canUpdate} onChange={(event) => setForm({ ...form, websiteOrPortalUrl: event.target.value })} placeholder="Website or portal URL" value={form.websiteOrPortalUrl} />
              {websiteHref ? (
                <a href={websiteHref} target="_blank" rel="noreferrer">
                  <ExternalLink size={16} /> Open website
                </a>
              ) : null}
            </div>
            <textarea aria-label="Vendor address" disabled={!initialReadModel.permissions.canUpdate} onChange={(event) => setForm({ ...form, addressSummary: event.target.value })} placeholder="Vendor address / location notes" value={form.addressSummary} />
            <textarea aria-label="Vendor internal notes" disabled={!initialReadModel.permissions.canUpdate} onChange={(event) => setForm({ ...form, notes: event.target.value })} placeholder="Internal notes, terms, warning, account rules..." value={form.notes} />
          </form>

          <section className="vendor-profile-section vendor-work-batches">
            <header>
              <div>
                <strong>Jobs & Invoice Batches</strong>
                <span>{vendor.workJobs.length} job{vendor.workJobs.length === 1 ? "" : "s"} recorded</span>
              </div>
              <em>{openBatch ? `${openBatch.batchNumber} open` : "No open batch"}</em>
            </header>

            <div className="vendor-batch-control">
              <form onSubmit={openInvoiceBatch}>
                <strong>Begin a batch</strong>
                <input aria-label="Batch title" disabled={busy || Boolean(openBatch)} onChange={(event) => setBatchForm({ ...batchForm, title: event.target.value })} placeholder={`${vendor.name} batch`} value={batchForm.title} />
                <textarea aria-label="Batch notes" disabled={busy || Boolean(openBatch)} onChange={(event) => setBatchForm({ ...batchForm, notes: event.target.value })} placeholder="Optional batch notes..." value={batchForm.notes} />
                <button disabled={busy || Boolean(openBatch)} type="submit"><PackageCheck size={16} /> Open batch</button>
              </form>

              <form onSubmit={closeInvoiceBatch}>
                <strong>Close current batch</strong>
                <div className="vendor-two-column">
                  <input aria-label="Invoice number" disabled={busy || !openBatch} onChange={(event) => setBatchCloseForm({ ...batchCloseForm, invoiceNumber: event.target.value })} placeholder="Invoice #" value={batchCloseForm.invoiceNumber} />
                  <input aria-label="Invoice date" disabled={busy || !openBatch} onChange={(event) => setBatchCloseForm({ ...batchCloseForm, invoiceDate: event.target.value })} type="date" value={batchCloseForm.invoiceDate} />
                </div>
                <input aria-label="Invoice total" disabled={busy || !openBatch} inputMode="decimal" onChange={(event) => setBatchCloseForm({ ...batchCloseForm, totalAmount: event.target.value })} placeholder="Invoice total" value={batchCloseForm.totalAmount} />
                <textarea aria-label="Batch close notes" disabled={busy || !openBatch} onChange={(event) => setBatchCloseForm({ ...batchCloseForm, notes: event.target.value })} placeholder="Close notes or invoice summary..." value={batchCloseForm.notes} />
                <button disabled={busy || !openBatch} type="submit"><Save size={16} /> Close batch</button>
              </form>
            </div>

            <form className="vendor-work-job-form" onSubmit={recordWorkJob}>
              <header>
                <strong>Record job / install</strong>
                <span>{openBatch ? `Adds to ${openBatch.batchNumber}` : "Saved for next batch"}</span>
              </header>
              <div className="vendor-two-column">
                <input aria-label="Vehicle, stock, VIN, or RO" onChange={(event) => setWorkJobForm({ ...workJobForm, vehicleReference: event.target.value })} placeholder="Vehicle, stock #, VIN, or RO" value={workJobForm.vehicleReference} />
                <select aria-label="Work type" onChange={(event) => setWorkJobForm({ ...workJobForm, workType: event.target.value })} value={workJobForm.workType}>
                  <option>Windshield replacement</option>
                  <option>Door glass replacement</option>
                  <option>Back glass replacement</option>
                  <option>Quarter glass replacement</option>
                  <option>Chip repair</option>
                  <option>Leak repair</option>
                  <option>Calibration</option>
                  <option>Other glass work</option>
                </select>
              </div>
              <div className="vendor-two-column">
                <input aria-label="Service date" onChange={(event) => setWorkJobForm({ ...workJobForm, serviceDate: event.target.value })} type="date" value={workJobForm.serviceDate} />
                <input aria-label="Job amount" inputMode="decimal" onChange={(event) => setWorkJobForm({ ...workJobForm, amount: event.target.value })} placeholder="Amount if known" value={workJobForm.amount} />
              </div>
              <textarea aria-label="Additional vehicles" onChange={(event) => setWorkJobForm({ ...workJobForm, additionalVehicleReferences: event.target.value })} placeholder="Additional vehicles, one per line. Each line becomes its own ticket..." value={workJobForm.additionalVehicleReferences} />
              <textarea aria-label="Work description" onChange={(event) => setWorkJobForm({ ...workJobForm, workDescription: event.target.value })} placeholder="What was replaced or repaired..." value={workJobForm.workDescription} />
              <textarea aria-label="Job notes" onChange={(event) => setWorkJobForm({ ...workJobForm, notes: event.target.value })} placeholder="Optional notes, location, promise, or photo reference..." value={workJobForm.notes} />
              <button disabled={busy} type="submit"><PackageCheck size={16} /> Record job</button>
            </form>

            <div className="vendor-batch-ledger">
              <section>
                <strong>Invoice batches</strong>
                {vendor.invoiceBatches.length ? vendor.invoiceBatches.map((batch) => (
                  <article key={batch.id}>
                    <span>
                      <b>{batch.batchNumber}</b>
                      <small>{batch.title}</small>
                    </span>
                    <em>{batch.status.replaceAll("_", " ")}</em>
                    <small>{batch.jobCount} job{batch.jobCount === 1 ? "" : "s"} · {formatMoney(batch.jobTotal)}</small>
                    {batch.invoiceNumber ? <small>Invoice {batch.invoiceNumber}{batch.invoiceDate ? ` · ${batch.invoiceDate}` : ""}</small> : null}
                    <button disabled={busy} onClick={() => openBatchTickets(batch.id)} type="button"><Eye size={15} /> View tickets</button>
                  </article>
                )) : <p>No batches opened yet.</p>}
              </section>

              <section>
                <strong>Latest jobs</strong>
                {vendor.workJobs.length ? vendor.workJobs.map((job) => (
                  <article key={job.id}>
                    <span>
                      <b>{job.vehicleReference}</b>
                      <small>{job.jobNumber} · {job.workType}</small>
                    </span>
                    <em>{job.status.replaceAll("_", " ")}</em>
                    <small>{job.serviceDate} · {formatMoney(job.amount)}{job.batchNumber ? ` · ${job.batchNumber}` : ""}</small>
                    {job.workDescription ? <small>{job.workDescription}</small> : null}
                  </article>
                )) : <p>No jobs recorded yet.</p>}
              </section>
            </div>
          </section>

          <section className="vendor-profile-section">
            <header><strong>Updates & Comments</strong><span>{vendor.noteCount} saved</span></header>
            <form className="vendor-note-form" onSubmit={addNote}>
              <textarea aria-label="Add vendor update" onChange={(event) => setNoteBody(event.target.value)} placeholder="Add update/comment..." value={noteBody} />
              <button disabled={busy} type="submit"><MessageSquarePlus size={16} /> Save update</button>
            </form>
            <div className="vendor-timeline">
              {vendor.vendorNotes.length ? vendor.vendorNotes.map((note) => (
                <article key={note.id}>
                  <strong>{note.authorUser?.name ?? "Staff update"}</strong>
                  <time>{formatDateTime(note.createdAt)}</time>
                  <p>{note.body}</p>
                </article>
              )) : <p>No updates saved yet.</p>}
            </div>
          </section>
        </main>

        <aside className="vendor-profile-rail">
          <section className="vendor-profile-section vendor-document-card">
            <header><FileText size={18} /><strong>Documents</strong><span>{vendor.documents.length}</span></header>
            <form className="vendor-document-form" onSubmit={uploadDocument}>
              <input aria-label="Document title" onChange={(event) => setDocumentForm({ ...documentForm, title: event.target.value })} placeholder="Document title" value={documentForm.title} />
              <select aria-label="Document type" onChange={(event) => setDocumentForm({ ...documentForm, documentType: event.target.value })} value={documentForm.documentType}>
                <option value="GENERAL">General</option>
                <option value="BILL_STATEMENT">Bill / statement</option>
                <option value="CONTRACT">Contract</option>
                <option value="ACCOUNT_SETUP">Account setup</option>
                <option value="INSURANCE">Insurance</option>
                <option value="W9_TAX">W-9 / tax</option>
                <option value="PORTAL_SCREENSHOT">Portal screenshot</option>
                <option value="COMPLIANCE">Compliance</option>
              </select>
              <label className="vendor-file-picker">
                <Upload size={16} />
                <span>{documentForm.file ? documentForm.file.name : "Choose file"}</span>
                <input aria-label="Choose vendor document" onChange={(event) => setDocumentForm({ ...documentForm, file: event.target.files?.[0] ?? null })} type="file" />
              </label>
              <textarea aria-label="Document notes" onChange={(event) => setDocumentForm({ ...documentForm, notes: event.target.value })} placeholder="Optional note for this file..." value={documentForm.notes} />
              <button disabled={busy || !documentForm.file} type="submit"><Upload size={16} /> Upload file</button>
            </form>
            <div className="vendor-document-list">
              {vendor.documents.length ? vendor.documents.map((document) => (
                <article key={document.id}>
                  <FileText size={17} />
                  <span>
                    <strong>{document.title}</strong>
                    <small>{document.documentType.replaceAll("_", " ")} · {formatFileSize(document.fileSizeBytes)} · {formatDateTime(document.createdAt)}</small>
                  </span>
                  <span className="vendor-document-actions">
                    <a aria-label={`View ${document.title}`} href={document.viewHref} target="_blank" rel="noreferrer"><Eye size={16} /></a>
                    <a aria-label={`Download ${document.title}`} href={document.downloadHref}><Download size={16} /></a>
                  </span>
                </article>
              )) : <p>No vendor documents uploaded yet.</p>}
            </div>
          </section>

          <form className="vendor-task-card" onSubmit={createTask}>
            <header><ClipboardCheck size={18} /><strong>Create Follow-up Task</strong></header>
            <input aria-label="Task title" onChange={(event) => setTaskForm({ ...taskForm, title: event.target.value })} value={taskForm.title} />
            <div className="vendor-two-column">
              <input aria-label="Task date" onChange={(event) => setTaskForm({ ...taskForm, boardDate: event.target.value, dueAt: defaultDueAt(event.target.value) })} type="date" value={taskForm.boardDate} />
              <input aria-label="Task due time" onChange={(event) => setTaskForm({ ...taskForm, dueAt: new Date(`${taskForm.boardDate}T${event.target.value}`).toISOString() })} type="time" defaultValue="12:00" />
            </div>
            <textarea aria-label="Task details" onChange={(event) => setTaskForm({ ...taskForm, description: event.target.value })} value={taskForm.description} />
            <button disabled={busy} type="submit">Create task</button>
          </form>

          <section className="vendor-profile-section">
            <header><strong>Linked Work</strong><span>{vendor.linkedRecordCount}</span></header>
            <div className="vendor-timeline">
              {vendor.recordLinks.length ? vendor.recordLinks.map((link) => (
                <article key={link.id}>
                  <strong>{link.labelSnapshot}</strong>
                  <time>{formatDateTime(link.createdAt)}</time>
                  <p>{link.recordType} · {link.relationshipType}</p>
                </article>
              )) : <p>No linked work yet.</p>}
            </div>
          </section>

        </aside>
      </div>

      {activityDrawerOpen ? (
        <div className="vendor-activity-drawer-backdrop" role="presentation" onClick={() => setActivityDrawerOpen(false)}>
          <aside
            aria-label="Vendor activity history"
            aria-modal="true"
            className="vendor-activity-drawer"
            id="vendor-activity-drawer"
            onClick={(event) => event.stopPropagation()}
            role="dialog"
          >
            <header>
              <div>
                <span className="vendor-registry-kicker">{vendor.name}</span>
                <h2>Activity</h2>
                <p>{vendor.activities.length} saved event{vendor.activities.length === 1 ? "" : "s"}</p>
              </div>
              <button aria-label="Close activity drawer" onClick={() => setActivityDrawerOpen(false)} type="button"><X size={18} /></button>
            </header>
            <div className="vendor-timeline vendor-activity-drawer-list">
              {vendor.activities.length ? vendor.activities.map((activity) => (
                <article key={activity.id}>
                  <strong>{activity.message}</strong>
                  <time>{formatDateTime(activity.createdAt)}</time>
                  <p>{activity.actorUser?.name ?? "System"} · {activity.type.replaceAll("_", " ")}</p>
                </article>
              )) : <p>No activity yet.</p>}
            </div>
          </aside>
        </div>
      ) : null}

      {batchTicketsDrawerOpen ? (
        <div className="vendor-activity-drawer-backdrop" role="presentation" onClick={closeBatchTicketsDrawer}>
          <aside
            aria-label="Vendor batch tickets"
            aria-modal="true"
            className="vendor-activity-drawer vendor-batch-ticket-drawer"
            id="vendor-batch-ticket-drawer"
            onClick={(event) => event.stopPropagation()}
            role="dialog"
          >
            <header>
              <div>
                <span className="vendor-registry-kicker">{vendor.name}</span>
                <h2>{batchTickets?.batch.batchNumber ?? "Batch tickets"}</h2>
                <p>{batchTickets ? `${batchTickets.jobs.length} ticket${batchTickets.jobs.length === 1 ? "" : "s"} in this batch` : "Loading batch tickets..."}</p>
              </div>
              <button aria-label="Close batch tickets drawer" onClick={closeBatchTicketsDrawer} type="button"><X size={18} /></button>
            </header>

            <div className="vendor-batch-ticket-body">
              {batchTickets ? (
                <>
                  <section className="vendor-batch-ticket-summary">
                    <div>
                      <span>Status</span>
                      <strong>{batchTickets.batch.status.replaceAll("_", " ")}</strong>
                    </div>
                    <div>
                      <span>Recorded total</span>
                      <strong>{formatMoney(batchTickets.batch.jobTotal)}</strong>
                    </div>
                    <div>
                      <span>Invoice</span>
                      <strong>{batchTickets.batch.invoiceNumber || "Not entered"}</strong>
                    </div>
                    <div>
                      <span>Invoice total</span>
                      <strong>{formatMoney(batchTickets.batch.totalAmount)}</strong>
                    </div>
                  </section>

                  <div className="vendor-batch-ticket-list">
                    {batchTickets.jobs.length ? batchTickets.jobs.map((job) => (
                      <article key={job.id}>
                        {editingJobId === job.id && jobEditForm ? (
                          <form className="vendor-ticket-edit-form" onSubmit={saveEditedJob}>
                            <header>
                              <strong>Edit {job.jobNumber}</strong>
                              <button onClick={() => { setEditingJobId(null); setJobEditForm(null); }} type="button"><X size={15} /> Cancel</button>
                            </header>
                            <div className="vendor-two-column">
                              <input aria-label="Edit vehicle reference" onChange={(event) => setJobEditForm({ ...jobEditForm, vehicleReference: event.target.value })} value={jobEditForm.vehicleReference} />
                              <select aria-label="Edit work type" onChange={(event) => setJobEditForm({ ...jobEditForm, workType: event.target.value })} value={jobEditForm.workType}>
                                <option>Windshield replacement</option>
                                <option>Door glass replacement</option>
                                <option>Back glass replacement</option>
                                <option>Quarter glass replacement</option>
                                <option>Chip repair</option>
                                <option>Leak repair</option>
                                <option>Calibration</option>
                                <option>Other glass work</option>
                              </select>
                            </div>
                            <div className="vendor-two-column">
                              <input aria-label="Edit service date" onChange={(event) => setJobEditForm({ ...jobEditForm, serviceDate: event.target.value })} type="date" value={jobEditForm.serviceDate} />
                              <input aria-label="Edit amount" inputMode="decimal" onChange={(event) => setJobEditForm({ ...jobEditForm, amount: event.target.value })} placeholder="Amount if known" value={jobEditForm.amount} />
                            </div>
                            <textarea aria-label="Edit work description" onChange={(event) => setJobEditForm({ ...jobEditForm, workDescription: event.target.value })} placeholder="What was replaced or repaired..." value={jobEditForm.workDescription} />
                            <textarea aria-label="Edit job notes" onChange={(event) => setJobEditForm({ ...jobEditForm, notes: event.target.value })} placeholder="Optional notes..." value={jobEditForm.notes} />
                            <button disabled={busy} type="submit"><Save size={15} /> Save ticket</button>
                          </form>
                        ) : (
                          <>
                            <header>
                              <span>
                                <strong>{job.vehicleReference}</strong>
                                <small>{job.jobNumber} · {job.serviceDate}</small>
                              </span>
                              <em>{formatMoney(job.amount)}</em>
                            </header>
                            <p>{job.workType}</p>
                            <small>{job.batchId === batchTickets.batch.id ? "Included in this batch" : "Open vendor ticket"}</small>
                            {job.workDescription ? <small>{job.workDescription}</small> : null}
                            {job.notes ? <small>{job.notes}</small> : null}
                            <button disabled={busy} onClick={() => startEditingJob(job)} type="button"><Save size={15} /> Edit ticket</button>
                          </>
                        )}
                      </article>
                    )) : <p>No tickets are tied to this batch yet.</p>}
                  </div>
                </>
              ) : (
                <div className="vendor-batch-ticket-empty">Loading tickets...</div>
              )}
            </div>
          </aside>
        </div>
      ) : null}

      {protectedDrawerOpen ? (
        <div className="vendor-activity-drawer-backdrop" role="presentation" onClick={closeProtectedDrawer}>
          <aside
            aria-label="Protected vendor notes"
            aria-modal="true"
            className="vendor-activity-drawer vendor-protected-drawer"
            id="vendor-protected-drawer"
            onClick={(event) => event.stopPropagation()}
            role="dialog"
          >
            <header>
              <div>
                <span className="vendor-registry-kicker">{vendor.name}</span>
                <h2>Protected</h2>
                <p>{protectedUnlocked ? `${protectedNotes.length} protected note${protectedNotes.length === 1 ? "" : "s"}` : "Enter your password/code to view protected notes"}</p>
              </div>
              <button aria-label="Close protected drawer" onClick={closeProtectedDrawer} type="button"><X size={18} /></button>
            </header>

            {!protectedUnlocked ? (
              <form className="vendor-protected-unlock" onSubmit={unlockProtectedNotes}>
                <ShieldCheck size={36} />
                <strong>Protected vendor information</strong>
                <p>Use your account password/code to open this drawer.</p>
                <input
                  aria-label="Protected access code"
                  autoFocus
                  onChange={(event) => setProtectedAccessCode(event.target.value)}
                  placeholder="Password / code / PIN"
                  type="password"
                  value={protectedAccessCode}
                />
                <button disabled={busy || !protectedAccessCode.trim()} type="submit">Unlock drawer</button>
              </form>
            ) : (
              <div className="vendor-protected-drawer-body">
                <form className="vendor-note-form" onSubmit={addProtectedNote}>
                  <textarea aria-label="Add protected vendor note" onChange={(event) => setProtectedNoteBody(event.target.value)} placeholder="Add protected note..." value={protectedNoteBody} />
                  <button disabled={busy || !protectedNoteBody.trim()} type="submit"><LockKeyhole size={16} /> Save protected note</button>
                </form>
                <div className="vendor-timeline vendor-activity-drawer-list">
                  {protectedNotes.length ? protectedNotes.map((note) => (
                    <article key={note.id}>
                      <strong>{note.authorUser?.name ?? "Protected update"}</strong>
                      <time>{formatDateTime(note.createdAt)}</time>
                      <p>{note.body}</p>
                    </article>
                  )) : <p>No protected notes saved yet.</p>}
                </div>
              </div>
            )}
          </aside>
        </div>
      ) : null}
    </section>
  );
}
