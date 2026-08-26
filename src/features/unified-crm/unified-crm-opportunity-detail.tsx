"use client";

import { AlertTriangle, ArrowLeft, ExternalLink, RefreshCw, ShieldCheck } from "lucide-react";
import Link from "next/link";
import { startTransition, useState, type FormEvent } from "react";
import { useRouter } from "next/navigation";

import type { UnifiedCrmOpportunityDetailReadModel } from "@/server/unified-crm/opportunity-detail-contract";
import {
  buildUnifiedCrmCustomerReturn,
  withUnifiedCrmOpportunityReturn
} from "@/server/unified-crm/opportunity-review-return";

import { UnifiedCrmOpportunityActions } from "./unified-crm-opportunity-actions";
import styles from "./unified-crm-opportunity-detail.module.css";
import { getUnifiedCrmOpportunityReturnContext } from "./unified-crm-opportunity-return-context";

type FailureKind = "error" | "not-available" | "restricted" | "unavailable";

type OpportunityDetailProps = {
  errorMessage?: string;
  failureKind?: FailureKind;
  model?: UnifiedCrmOpportunityDetailReadModel;
  returnHref: string;
};

function formatDate(value: string) {
  return new Intl.DateTimeFormat("en-US", {
    dateStyle: "medium",
    timeStyle: "short",
    timeZone: "America/Chicago"
  }).format(new Date(value));
}

function readModeLabel(value: UnifiedCrmOpportunityDetailReadModel["source"]["readMode"]) {
  return value === "HELD_REVIEW" ? "held review only" : "read only";
}

function stageLabel(value: string) {
  return value.replaceAll("_", " ").toLowerCase().replace(/\b\w/g, (letter) => letter.toUpperCase());
}

function sourceRecordFreshnessLabel(model: UnifiedCrmOpportunityDetailReadModel) {
  return model.freshness.sourceRecordUpdatedAt
    ? `Latest visible source update ${formatDate(model.freshness.sourceRecordUpdatedAt)}`
    : "No persisted source record is visible yet.";
}

function localDateTimeValue(date: Date) {
  const year = date.getFullYear();
  const month = `${date.getMonth() + 1}`.padStart(2, "0");
  const day = `${date.getDate()}`.padStart(2, "0");
  const hour = `${date.getHours()}`.padStart(2, "0");
  const minute = `${date.getMinutes()}`.padStart(2, "0");
  return `${year}-${month}-${day}T${hour}:${minute}`;
}

function defaultTaskDueValue(value: string | null) {
  if (value) {
    const parsed = new Date(value);
    if (!Number.isNaN(parsed.getTime())) return localDateTimeValue(parsed);
  }
  return localDateTimeValue(new Date(Date.now() + 60 * 60 * 1000));
}

function createIdempotencyKey(opportunityId: string) {
  return globalThis.crypto?.randomUUID?.() ?? `crm-opportunity-task-${opportunityId}-${Date.now()}`;
}

function createAppointmentIdempotencyKey(opportunityId: string) {
  return globalThis.crypto?.randomUUID?.() ?? `crm-opportunity-appointment-${opportunityId}-${Date.now()}`;
}

function createDispatchIdempotencyKey(opportunityId: string) {
  return globalThis.crypto?.randomUUID?.() ?? `crm-opportunity-dispatch-${opportunityId}-${Date.now()}`;
}

function defaultAppointmentNumber(opportunityId: string) {
  return `CRM-${opportunityId}-${Date.now().toString(36).toUpperCase()}`.slice(0, 120);
}

function withOpportunityTaskReturn(href: string | null | undefined, opportunityId: string, returnHref: string) {
  if (!href || !href.startsWith("/tasks/") || href.startsWith("//")) return href ?? null;
  const opportunityReturn = `/crm/opportunities/${encodeURIComponent(opportunityId)}?crmReturnTo=${encodeURIComponent(returnHref)}`;
  try {
    const url = new URL(href, "https://crm.local");
    url.searchParams.set("returnTo", opportunityReturn);
    return `${url.pathname}${url.search}${url.hash}`;
  } catch {
    return href;
  }
}

function withOpportunityAppointmentReturn(href: string | null | undefined, opportunityId: string, returnHref: string) {
  if (!href || !href.startsWith("/appointments") || href.startsWith("//")) return href ?? null;
  const opportunityReturn = `/crm/opportunities/${encodeURIComponent(opportunityId)}?crmReturnTo=${encodeURIComponent(returnHref)}`;
  try {
    const url = new URL(href, "https://crm.local");
    url.searchParams.set("returnTo", opportunityReturn);
    return `${url.pathname}${url.search}${url.hash}`;
  } catch {
    return href;
  }
}

function withOpportunityDispatchReturn(href: string | null | undefined, opportunityId: string, returnHref: string) {
  if (!href || (!href.startsWith("/vehicles/repair-workbench") && !href.startsWith("/vehicles/shop-dispatch")) || href.startsWith("//")) return href ?? null;
  const opportunityReturn = `/crm/opportunities/${encodeURIComponent(opportunityId)}?crmReturnTo=${encodeURIComponent(returnHref)}`;
  try {
    const url = new URL(href, "https://crm.local");
    url.searchParams.set("returnTo", opportunityReturn);
    return `${url.pathname}${url.search}${url.hash}`;
  } catch {
    return href;
  }
}

function customerContextHref(model: UnifiedCrmOpportunityDetailReadModel, returnHref: string) {
  if (!model.customerContext) return null;

  try {
    const url = new URL(returnHref, "http://crm.local");
    const match = url.pathname.match(/^\/crm\/customers\/([^/]+)$/);
    if (match && decodeURIComponent(match[1] ?? "").trim() === model.customerContext.customerId) {
      return `${url.pathname}${url.search}`;
    }
  } catch {
    return buildUnifiedCrmCustomerReturn(model.customerContext.customerId, returnHref);
  }

  return buildUnifiedCrmCustomerReturn(model.customerContext.customerId, returnHref);
}

function StatePanel({ kind, message, returnHref }: { kind: FailureKind; message?: string; returnHref: string }) {
  const returnContext = getUnifiedCrmOpportunityReturnContext(returnHref);
  const title = kind === "not-available"
    ? "Opportunity detail isn’t available"
    : kind === "restricted"
      ? "Opportunity detail isn’t available to you"
      : kind === "unavailable"
        ? "Opportunity detail is temporarily unavailable"
        : "Opportunity detail couldn’t be loaded";
  const detail = message ?? (kind === "not-available"
    ? "This opportunity record may not exist, may be held, or may be outside your permitted opportunity scope."
    : kind === "restricted"
      ? "Your current CRM access does not include this opportunity detail."
      : "No opportunity detail was displayed. Retry or return to the Pipeline review.");
  const retryable = kind === "error" || kind === "unavailable";
  return (
    <main className={styles.page}>
      <Link className={styles.backLink} href={returnHref}><ArrowLeft aria-hidden="true" size={15} />{returnContext.backLabel}</Link>
      <section className={styles.statePanel} role={retryable ? "alert" : "status"}>
        {retryable ? <AlertTriangle aria-hidden="true" size={28} /> : <ShieldCheck aria-hidden="true" size={28} />}
        <h1>{title}</h1>
        <p>{detail}</p>
        <div className={styles.stateActions}>
          {retryable ? <button onClick={() => window.location.reload()} type="button"><RefreshCw aria-hidden="true" size={14} />Retry</button> : null}
          <Link href={returnHref}>{returnContext.returnLabel}</Link>
          <Link href="/crm?view=pipeline">Open CRM Pipeline<ExternalLink aria-hidden="true" size={13} /></Link>
        </div>
      </section>
    </main>
  );
}

function OpportunityTaskBridgeForm({ model, returnHref }: { model: UnifiedCrmOpportunityDetailReadModel; returnHref: string }) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [pending, setPending] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [messageHref, setMessageHref] = useState<string | null>(null);
  const [tone, setTone] = useState<"idle" | "error" | "success">("idle");
  const [title, setTitle] = useState(`Follow up: ${model.identity.title}`);
  const [brief, setBrief] = useState("Document the opportunity follow-up, customer commitment, and next operational step.");
  const [dueAt, setDueAt] = useState(() => defaultTaskDueValue(model.lifecycle.nextActionDueAt));
  const [idempotencyKey, setIdempotencyKey] = useState(() => createIdempotencyKey(model.requestedOpportunityId));
  const available = Boolean(model.taskActivity.createTaskHref && model.lifecycle.version !== null);

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!model.taskActivity.createTaskHref || model.lifecycle.version === null) return;
    setPending(true);
    setMessage(null);
    setMessageHref(null);
    setTone("idle");

    try {
      const response = await fetch(model.taskActivity.createTaskHref, {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          brief,
          dueAt: new Date(dueAt).toISOString(),
          expectedVersion: model.lifecycle.version,
          idempotencyKey,
          title
        })
      });
      const payload = await response.json().catch(() => null) as {
        duplicate?: boolean;
        error?: string;
        task?: { href?: string; title?: string };
      } | null;
      if (!response.ok) {
        throw new Error(payload?.error ?? "CRM opportunity task handoff could not be completed safely.");
      }
      setTone("success");
      setMessageHref(withOpportunityTaskReturn(payload?.task?.href, model.requestedOpportunityId, returnHref));
      setMessage(
        payload?.duplicate
          ? "This governed opportunity task was already recorded. The existing task is ready to open."
          : "Governed opportunity task created. The opportunity activity list is refreshing with the protected link."
      );
      setIdempotencyKey(createIdempotencyKey(model.requestedOpportunityId));
      setOpen(false);
      startTransition(() => router.refresh());
    } catch (error) {
      setTone("error");
      setMessage(error instanceof Error ? error.message : "CRM opportunity task handoff could not be completed safely.");
    } finally {
      setPending(false);
    }
  }

  return (
    <section className={styles.taskActivityPanel} aria-labelledby="opportunity-task-activity-heading">
      <header className={styles.taskActivityHeader}>
        <div>
          <span className={styles.eyebrow}>Opportunity activity</span>
          <h2 id="opportunity-task-activity-heading">Create a linked follow-up task</h2>
          <p>{model.taskActivity.summary}</p>
        </div>
        {available ? (
          <button
            aria-controls="opportunity-task-bridge-panel"
            aria-expanded={open}
            className={styles.primaryButton}
            disabled={pending}
            onClick={() => setOpen((value) => !value)}
            type="button"
          >
            {open ? "Close" : "Create linked task"}
          </button>
        ) : null}
      </header>
      {message ? (
        <p className={tone === "error" ? styles.formError : styles.formSuccess} role={tone === "error" ? "alert" : "status"}>
          {message} {messageHref ? <Link href={messageHref}>Open task</Link> : null}
        </p>
      ) : null}
      {open && available ? (
        <form className={styles.taskForm} id="opportunity-task-bridge-panel" onSubmit={(event) => void submit(event)}>
          <p className={styles.formHelper}>
            This creates tracked internal work in Tasks and keeps this opportunity as the correlated CRM source. No appointment or dispatch link is created here.
          </p>
          <label className={styles.formWide}>
            <span>Task title</span>
            <input onChange={(event) => setTitle(event.target.value)} required value={title} />
          </label>
          <label className={styles.formWide}>
            <span>Brief</span>
            <textarea onChange={(event) => setBrief(event.target.value)} required rows={3} value={brief} />
          </label>
          <label>
            <span>Due time</span>
            <input onChange={(event) => setDueAt(event.target.value)} required type="datetime-local" value={dueAt} />
          </label>
          <div className={styles.formActions}>
            <button disabled={pending || title.trim().length < 8 || brief.trim().length < 16} type="submit">
              {pending ? "Creating linked task..." : "Create linked task"}
            </button>
            <span>Uses opportunity version {model.lifecycle.version}; refresh if the record changed.</span>
          </div>
        </form>
      ) : null}
      {model.taskActivity.links.length ? (
        <ol className={styles.historyList}>
          {model.taskActivity.links.map((link) => (
            <li key={`${link.taskId}-${link.createdAt}`}>
              <strong>{link.title}</strong>
              <span>{link.state} · due {formatDate(link.dueAt)} · created {formatDate(link.createdAt)} by {link.actorLabel}</span>
              <p>{link.brief}</p>
              <Link className={styles.sourceLink} href={withOpportunityTaskReturn(link.href, model.requestedOpportunityId, returnHref) ?? link.href}>Open task<ExternalLink aria-hidden="true" size={13} /></Link>
            </li>
          ))}
        </ol>
      ) : <p className={styles.formHelper}>No linked opportunity tasks have been recorded yet.</p>}
    </section>
  );
}

function OpportunityAppointmentBridgeForm({ model, returnHref }: { model: UnifiedCrmOpportunityDetailReadModel; returnHref: string }) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [pending, setPending] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [messageHref, setMessageHref] = useState<string | null>(null);
  const [tone, setTone] = useState<"idle" | "error" | "success">("idle");
  const [appointmentNumber, setAppointmentNumber] = useState(() => defaultAppointmentNumber(model.requestedOpportunityId));
  const [locationId, setLocationId] = useState("");
  const [title, setTitle] = useState(`Appointment: ${model.identity.title}`);
  const [schedulingTimezone, setSchedulingTimezone] = useState("America/Chicago");
  const [startsAt, setStartsAt] = useState("");
  const [endsAt, setEndsAt] = useState("");
  const [idempotencyKey, setIdempotencyKey] = useState(() => createAppointmentIdempotencyKey(model.requestedOpportunityId));
  const available = Boolean(model.appointmentActivity.createAppointmentHref && model.lifecycle.version !== null);

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!model.appointmentActivity.createAppointmentHref || model.lifecycle.version === null) return;
    setPending(true);
    setMessage(null);
    setMessageHref(null);
    setTone("idle");

    try {
      const response = await fetch(model.appointmentActivity.createAppointmentHref, {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          appointmentNumber,
          endsAt: endsAt ? new Date(endsAt).toISOString() : null,
          expectedVersion: model.lifecycle.version,
          idempotencyKey,
          locationId,
          schedulingTimezone,
          startsAt: startsAt ? new Date(startsAt).toISOString() : null,
          title
        })
      });
      const payload = await response.json().catch(() => null) as {
        appointment?: { href?: string };
        duplicate?: boolean;
        error?: string;
      } | null;
      if (!response.ok) {
        throw new Error(payload?.error ?? "CRM opportunity appointment bridge could not be completed safely.");
      }
      setTone("success");
      setMessageHref(withOpportunityAppointmentReturn(payload?.appointment?.href, model.requestedOpportunityId, returnHref));
      setMessage(
        payload?.duplicate
          ? "This governed appointment bridge was already recorded. The existing appointment is ready to open."
          : "Governed draft appointment created. The opportunity appointment activity list is refreshing."
      );
      setAppointmentNumber(defaultAppointmentNumber(model.requestedOpportunityId));
      setIdempotencyKey(createAppointmentIdempotencyKey(model.requestedOpportunityId));
      setOpen(false);
      startTransition(() => router.refresh());
    } catch (error) {
      setTone("error");
      setMessage(error instanceof Error ? error.message : "CRM opportunity appointment bridge could not be completed safely.");
    } finally {
      setPending(false);
    }
  }

  return (
    <section className={styles.taskActivityPanel} aria-labelledby="opportunity-appointment-activity-heading">
      <header className={styles.taskActivityHeader}>
        <div>
          <span className={styles.eyebrow}>Appointment bridge</span>
          <h2 id="opportunity-appointment-activity-heading">Create a linked draft appointment</h2>
          <p>{model.appointmentActivity.summary}</p>
        </div>
        {available ? (
          <button
            aria-controls="opportunity-appointment-bridge-panel"
            aria-expanded={open}
            className={styles.primaryButton}
            disabled={pending}
            onClick={() => setOpen((value) => !value)}
            type="button"
          >
            {open ? "Close" : "Create draft appointment"}
          </button>
        ) : null}
      </header>
      {message ? (
        <p className={tone === "error" ? styles.formError : styles.formSuccess} role={tone === "error" ? "alert" : "status"}>
          {message} {messageHref ? <Link href={messageHref}>Open appointment</Link> : null}
        </p>
      ) : null}
      {open && available ? (
        <form className={styles.taskForm} id="opportunity-appointment-bridge-panel" onSubmit={(event) => void submit(event)}>
          <p className={styles.formHelper}>
            This creates a draft in the appointment workspace and keeps appointment scheduling authoritative. Provide start/end only when the time is already known.
          </p>
          <label>
            <span>Appointment number</span>
            <input onChange={(event) => setAppointmentNumber(event.target.value)} required value={appointmentNumber} />
          </label>
          <label>
            <span>Location ID</span>
            <input onChange={(event) => setLocationId(event.target.value)} required value={locationId} />
          </label>
          <label>
            <span>Timezone</span>
            <input onChange={(event) => setSchedulingTimezone(event.target.value)} required value={schedulingTimezone} />
          </label>
          <label className={styles.formWide}>
            <span>Appointment title</span>
            <input onChange={(event) => setTitle(event.target.value)} required value={title} />
          </label>
          <label>
            <span>Start</span>
            <input onChange={(event) => setStartsAt(event.target.value)} type="datetime-local" value={startsAt} />
          </label>
          <label>
            <span>End</span>
            <input onChange={(event) => setEndsAt(event.target.value)} type="datetime-local" value={endsAt} />
          </label>
          <div className={styles.formActions}>
            <button disabled={pending || title.trim().length < 8 || locationId.trim().length < 3 || appointmentNumber.trim().length < 6} type="submit">
              {pending ? "Creating draft appointment..." : "Create draft appointment"}
            </button>
            <span>Uses opportunity version {model.lifecycle.version}; appointment approval and scheduling still happen in Appointments.</span>
          </div>
        </form>
      ) : null}
      {model.appointmentActivity.links.length ? (
        <ol className={styles.historyList}>
          {model.appointmentActivity.links.map((link) => (
            <li key={`${link.appointmentNumber}-${link.createdAt}`}>
              <strong>{link.title}</strong>
              <span>{link.state} · {link.appointmentNumber} · version {link.version} · created {formatDate(link.createdAt)} by {link.actorLabel}</span>
              <p>{link.startsAt && link.endsAt ? `${formatDate(link.startsAt)} to ${formatDate(link.endsAt)}` : "Draft appointment is not scheduled yet."}</p>
              <Link className={styles.sourceLink} href={withOpportunityAppointmentReturn(link.href, model.requestedOpportunityId, returnHref) ?? link.href}>Open appointment<ExternalLink aria-hidden="true" size={13} /></Link>
            </li>
          ))}
        </ol>
      ) : <p className={styles.formHelper}>No linked opportunity appointments have been recorded yet.</p>}
    </section>
  );
}

function OpportunityDispatchBridgeForm({ model, returnHref }: { model: UnifiedCrmOpportunityDetailReadModel; returnHref: string }) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [pending, setPending] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [messageHref, setMessageHref] = useState<string | null>(null);
  const [tone, setTone] = useState<"idle" | "error" | "success">("idle");
  const [targetKind, setTargetKind] = useState<"REPAIR_ORDER" | "REPAIR_JOB">("REPAIR_ORDER");
  const [targetId, setTargetId] = useState("");
  const [expectedTargetVersion, setExpectedTargetVersion] = useState("1");
  const [idempotencyKey, setIdempotencyKey] = useState(() => createDispatchIdempotencyKey(model.requestedOpportunityId));
  const available = Boolean(model.dispatchActivity.createDispatchHref && model.lifecycle.version !== null);

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!model.dispatchActivity.createDispatchHref || model.lifecycle.version === null) return;
    const parsedTargetVersion = Number(expectedTargetVersion);
    if (!Number.isInteger(parsedTargetVersion) || parsedTargetVersion < 0) {
      setTone("error");
      setMessage("Target version must be a whole number.");
      return;
    }

    setPending(true);
    setMessage(null);
    setMessageHref(null);
    setTone("idle");

    try {
      const response = await fetch(model.dispatchActivity.createDispatchHref, {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          expectedTargetVersion: parsedTargetVersion,
          expectedVersion: model.lifecycle.version,
          idempotencyKey,
          ...(targetKind === "REPAIR_ORDER"
            ? { repairOrderId: targetId.trim(), targetKind }
            : { repairJobId: targetId.trim(), targetKind })
        })
      });
      const payload = await response.json().catch(() => null) as {
        duplicate?: boolean;
        error?: string;
        target?: { href?: string; title?: string };
      } | null;
      if (!response.ok) {
        throw new Error(payload?.error ?? "CRM opportunity dispatch bridge could not be completed safely.");
      }
      setTone("success");
      setMessageHref(withOpportunityDispatchReturn(payload?.target?.href, model.requestedOpportunityId, returnHref));
      setMessage(
        payload?.duplicate
          ? "This governed dispatch bridge was already recorded. The existing work is ready to open."
          : "Governed dispatch link recorded. The opportunity dispatch activity list is refreshing."
      );
      setTargetId("");
      setIdempotencyKey(createDispatchIdempotencyKey(model.requestedOpportunityId));
      setOpen(false);
      startTransition(() => router.refresh());
    } catch (error) {
      setTone("error");
      setMessage(error instanceof Error ? error.message : "CRM opportunity dispatch bridge could not be completed safely.");
    } finally {
      setPending(false);
    }
  }

  return (
    <section className={styles.taskActivityPanel} aria-labelledby="opportunity-dispatch-activity-heading">
      <header className={styles.taskActivityHeader}>
        <div>
          <span className={styles.eyebrow}>Dispatch bridge</span>
          <h2 id="opportunity-dispatch-activity-heading">Link existing repair work</h2>
          <p>{model.dispatchActivity.summary}</p>
        </div>
        {available ? (
          <button
            aria-controls="opportunity-dispatch-bridge-panel"
            aria-expanded={open}
            className={styles.primaryButton}
            disabled={pending}
            onClick={() => setOpen((value) => !value)}
            type="button"
          >
            {open ? "Close" : "Link dispatch work"}
          </button>
        ) : null}
      </header>
      {message ? (
        <p className={tone === "error" ? styles.formError : styles.formSuccess} role={tone === "error" ? "alert" : "status"}>
          {message} {messageHref ? <Link href={messageHref}>Open dispatch work</Link> : null}
        </p>
      ) : null}
      {open && available ? (
        <form className={styles.taskForm} id="opportunity-dispatch-bridge-panel" onSubmit={(event) => void submit(event)}>
          <p className={styles.formHelper}>
            Link an existing repair order or repair job. Dispatch remains the source of truth; CRM records the relationship, version, and audit trail.
          </p>
          <label>
            <span>Target type</span>
            <select onChange={(event) => setTargetKind(event.target.value as "REPAIR_ORDER" | "REPAIR_JOB")} value={targetKind}>
              <option value="REPAIR_ORDER">Repair order</option>
              <option value="REPAIR_JOB">Repair job</option>
            </select>
          </label>
          <label>
            <span>{targetKind === "REPAIR_ORDER" ? "Repair order ID" : "Repair job ID"}</span>
            <input onChange={(event) => setTargetId(event.target.value)} required value={targetId} />
          </label>
          <label>
            <span>Target version</span>
            <input min="0" onChange={(event) => setExpectedTargetVersion(event.target.value)} required type="number" value={expectedTargetVersion} />
          </label>
          <div className={styles.formActions}>
            <button disabled={pending || targetId.trim().length < 3} type="submit">
              {pending ? "Linking dispatch work..." : "Link dispatch work"}
            </button>
            <span>Uses opportunity version {model.lifecycle.version}; refresh if either record changed.</span>
          </div>
        </form>
      ) : null}
      {model.dispatchActivity.links.length ? (
        <ol className={styles.historyList}>
          {model.dispatchActivity.links.map((link) => (
            <li key={`${link.targetKind}-${link.repairOrderId}-${link.repairJobId ?? "order"}-${link.createdAt}`}>
              <strong>{link.title}</strong>
              <span>{link.state} · {link.relationship} · RO {link.repairOrderNumber}{link.repairJobNumber ? ` · job ${link.repairJobNumber}` : ""} · version {link.version}</span>
              <p>Linked {formatDate(link.createdAt)} by {link.actorLabel}.</p>
              <Link className={styles.sourceLink} href={withOpportunityDispatchReturn(link.href, model.requestedOpportunityId, returnHref) ?? link.href}>Open dispatch work<ExternalLink aria-hidden="true" size={13} /></Link>
            </li>
          ))}
        </ol>
      ) : <p className={styles.formHelper}>No linked repair order or job has been recorded yet.</p>}
    </section>
  );
}

export function UnifiedCrmOpportunityDetail({ errorMessage, failureKind = "error", model, returnHref }: OpportunityDetailProps) {
  if (!model) {
    return <StatePanel kind={failureKind} message={errorMessage} returnHref={returnHref} />;
  }
  const returnContext = getUnifiedCrmOpportunityReturnContext(returnHref);
  const customerHref = customerContextHref(model, returnHref);

  return (
    <main className={styles.page}>
      <Link className={styles.backLink} href={returnHref}><ArrowLeft aria-hidden="true" size={15} />{returnContext.backLabel}</Link>

      <section aria-labelledby="opportunity-detail-heading" className={styles.identityCard}>
        <div className={styles.identityMain}>
          <span className={styles.eyebrow}>Opportunity detail · read only</span>
          <h1 id="opportunity-detail-heading">{model.identity.title}</h1>
          <p>Requested review id {model.requestedOpportunityId} · {model.identity.ownerScopeLabel}</p>
        </div>
        <div className={styles.statusMeta}>
          <span className={styles.statusPill}>{model.identity.lifecycleStatus}</span>
          <span><small>Stage</small><strong>{stageLabel(model.lifecycle.stage)}</strong></span>
          <span><small>Version</small><strong>{model.lifecycle.version ?? "Held"}</strong></span>
          <span><small>Visibility</small><strong>{model.visibility === "organization" ? "Organization" : "Owned only"}</strong></span>
        </div>
      </section>

      <section aria-label="Opportunity source and freshness" className={styles.trustBar}>
        <span><ShieldCheck aria-hidden="true" size={14} /><strong>{model.source.label}</strong> · {readModeLabel(model.source.readMode)}</span>
        <span><ShieldCheck aria-hidden="true" size={14} />Current · observed {formatDate(model.freshness.observedAt)}</span>
        <span><ShieldCheck aria-hidden="true" size={14} />{sourceRecordFreshnessLabel(model)}</span>
        <span><ShieldCheck aria-hidden="true" size={14} />{returnContext.returnContextLabel}</span>
        <Link className={styles.sourceLink} href={withUnifiedCrmOpportunityReturn(model.source.href, returnHref)}>Open pipeline source review<ExternalLink aria-hidden="true" size={13} /></Link>
      </section>

      <section className={styles.summaryGrid} aria-label="Opportunity summary">
        <article>
          <span className={styles.eyebrow}>Customer</span>
          <strong>{model.summary.customer}</strong>
          <p>Customer context is shown exactly as the current permitted read-only opportunity view supplies it.</p>
          {customerHref ? <Link className={styles.sourceLink} href={customerHref}>Open Customer 360<ExternalLink aria-hidden="true" size={13} /></Link> : null}
        </article>
        <article><span className={styles.eyebrow}>Owner</span><strong>{model.summary.owner}</strong><p>Ownership stays visible here without enabling reassignment or any write action from this surface.</p></article>
        <article><span className={styles.eyebrow}>Next action</span><strong>{model.summary.nextAction}</strong><p>Next-step context stays readable here while authoritative source workflows remain in control.</p></article>
        <article><span className={styles.eyebrow}>Due state</span><strong>{model.summary.dueState}</strong><p>Timing and due-state context is displayed exactly as the current permitted read-only model provides it.</p></article>
      </section>

      <section className={styles.lifecycleGrid} aria-label="Opportunity lifecycle">
        <article className={styles.bridgeCard}>
          <header>
            <strong>Lifecycle</strong>
            <span className={styles.heldTag}>{model.lifecycle.terminal ? "Terminal" : "Active"}</span>
          </header>
          <p>Current stage is {stageLabel(model.lifecycle.stage)} at version {model.lifecycle.version ?? "held"}.</p>
          {model.lifecycle.allowedNextStages.length ? (
            <small>Allowed next moves: {model.lifecycle.allowedNextStages.map(stageLabel).join(", ")}</small>
          ) : <small>No approved next move is available from this stage.</small>}
          {model.lifecycle.transitionHref ? (
            <Link className={styles.sourceLink} href={withUnifiedCrmOpportunityReturn(model.lifecycle.transitionHref, returnHref)}>Move opportunity stage<ExternalLink aria-hidden="true" size={13} /></Link>
          ) : null}
        </article>
        <article className={styles.bridgeCard}>
          <header>
            <strong>Stage history</strong>
            <span className={styles.heldTag}>{model.stageHistory.length ? `${model.stageHistory.length} event(s)` : "Empty"}</span>
          </header>
          {model.stageHistory.length ? (
            <ol className={styles.historyList}>
              {model.stageHistory.map((event) => (
                <li key={`${event.occurredAt}-${event.toStage}`}>
                  <strong>{event.fromStage ? `${stageLabel(event.fromStage)} -> ${stageLabel(event.toStage)}` : stageLabel(event.toStage)}</strong>
                  <span>{formatDate(event.occurredAt)} by {event.actorLabel}</span>
                  <p>{event.reason}</p>
                </li>
              ))}
            </ol>
          ) : <p>No stage history has been recorded for this opportunity yet.</p>}
        </article>
      </section>

      <section className={styles.bridgeGrid} aria-label="Same-customer read-only opportunities">
        <article className={styles.bridgeCard}>
          <header>
            <strong>Same-customer read-only opportunities</strong>
            <span className={styles.heldTag}>{model.relatedRecordsObservation.state === "READY" ? `${model.relatedRecordsObservation.visibleRecordCount} visible` : "Pending"}</span>
          </header>
          <p>{model.relatedRecordsObservation.detail}</p>
          <small>{model.relatedRecordsObservation.freshnessLabel}</small>
        </article>
        {model.relatedRecords.map((item) => (
          <Link className={styles.bridgeCard} href={withUnifiedCrmOpportunityReturn(item.href, returnHref)} key={item.id}>
            <header>
              <strong>{item.title}</strong>
              <span className={styles.heldTag}>Read only</span>
            </header>
            <p>{item.summary}</p>
            <small>{item.ownerLabel} · updated {formatDate(item.updatedAt)}</small>
          </Link>
        ))}
      </section>

      <OpportunityTaskBridgeForm model={model} returnHref={returnHref} />
      <OpportunityAppointmentBridgeForm model={model} returnHref={returnHref} />
      <OpportunityDispatchBridgeForm model={model} returnHref={returnHref} />

      <section className={styles.bridgeGrid} aria-label="Opportunity bridge review">
        <article className={styles.bridgeCard}>
          <header><strong>{model.sourceBridge.label}</strong><span className={styles.heldTag}>{model.sourceBridge.state}</span></header>
          <p>{model.sourceBridge.detail}</p>
        </article>
        {model.workBridges.map((bridge) => (
          <article className={styles.bridgeCard} key={bridge.domain}>
            <header><strong>{bridge.label}</strong><span className={styles.heldTag}>{bridge.state}</span></header>
            <p>{bridge.detail}</p>
            {bridge.actionHref && bridge.domain === "TASKS" ? (
              <small>Use the Opportunity activity panel above to create this governed task link.</small>
            ) : null}
            {bridge.actionHref && bridge.domain === "APPOINTMENTS" ? (
              <small>Use the Appointment bridge panel above to create this governed draft appointment.</small>
            ) : null}
            {bridge.actionHref && bridge.domain === "DISPATCH" ? (
              <small>Use the Dispatch bridge panel above to link existing repair work.</small>
            ) : null}
          </article>
        ))}
      </section>

      <section className={styles.unlockGrid} aria-label="Next unlocks">
        {model.nextUnlocks.map((item) => (
          <article className={styles.unlockCard} key={item}>
            <header><strong>Next unlock</strong><span className={styles.heldTag}>Review</span></header>
            <p>{item}</p>
          </article>
        ))}
      </section>

      <section className={styles.statePanel} aria-label="Opportunity review actions">
        <UnifiedCrmOpportunityActions
          eyebrow="Continue reviewing"
          title="Keep the opportunity flow one click away"
          actions={[
            {
              label: "Review queue flow",
              description: "Inspect the first opportunity queue so owned and at-risk work stays clear before live prioritization exists.",
              href: `/crm/opportunities/queue?crmReturnTo=${encodeURIComponent(returnHref)}`,
              state: "REVIEW"
            },
            {
              label: "Review create flow",
              description: "Validate the first governed create experience before live opportunity writes are enabled.",
              href: `/crm/opportunities/new?crmReturnTo=${encodeURIComponent(returnHref)}`,
              state: "REVIEW"
            },
            {
              label: "Review transition flow",
              description: "Inspect stage-movement checks, required evidence, and rollback expectations.",
              href: `/crm/opportunities/${encodeURIComponent(model.requestedOpportunityId)}/transition?crmReturnTo=${encodeURIComponent(returnHref)}`,
              state: "REVIEW"
            },
            {
              label: returnContext.returnShortLabel,
              description: "Go back to the originating held CRM review context for the broader opportunity workflow.",
              href: returnHref,
              state: "REVIEW"
            }
          ]}
        />
      </section>
    </main>
  );
}

export function UnifiedCrmOpportunityDetailLoading() {
  return (
    <main className={styles.page}>
      <section aria-busy="true" aria-labelledby="opportunity-detail-loading-heading" className={styles.loading}>
        <span className={styles.eyebrow}>Unified CRM</span>
        <h1 id="opportunity-detail-loading-heading">Loading permitted opportunity detail</h1>
        <p>Checking access and loading the held review surface. No operational opportunity action has been completed.</p>
        <div aria-hidden="true" className={styles.skeletons}>
          {Array.from({ length: 4 }, (_, index) => <span key={index} />)}
        </div>
      </section>
    </main>
  );
}
