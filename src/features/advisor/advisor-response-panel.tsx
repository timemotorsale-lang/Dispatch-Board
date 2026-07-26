"use client";

import { FormEvent, useMemo, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { MessageSquarePlus, Save } from "lucide-react";

const STATUS_OPTIONS = [
  "IN_PROGRESS",
  "WAITING_DIAGNOSIS",
  "WAITING_TECHNICIAN_CLARIFICATION",
  "WAITING_APPROVAL",
  "WAITING_PARTS",
  "PROMISE_RISK",
  "READY_FOR_DELIVERY",
  "CUSTOMER_UPDATED"
];

const CHANNEL_OPTIONS = ["PHONE", "SMS", "EMAIL", "IN_PERSON", "INTERNAL"];
const DIRECTION_OPTIONS = ["OUTBOUND", "INBOUND", "INTERNAL"];
const EXCEPTION_OPTIONS = [
  { code: "CUSTOMER_ACTION", label: "Customer action needed" },
  { code: "TECHNICIAN_CLARIFICATION", label: "Technician clarification needed" },
  { code: "PROMISE_RISK", label: "Promise risk" },
  { code: "WAITING_PARTS", label: "Waiting on parts" },
  { code: "MANAGER_REVIEW", label: "Manager review needed" }
];

type AdvisorUpdate = {
  authorUser: { name: string };
  contactChannel: string;
  contactOutcome: string;
  customerVisibleSummary: string;
  exceptionCodes: unknown;
  occurredAt: string | Date;
  statusCode: string;
  version: number;
};

function nowLocal() {
  const now = new Date();
  now.setMinutes(now.getMinutes() - now.getTimezoneOffset());
  return now.toISOString().slice(0, 16);
}

function codes(value: unknown) {
  return Array.isArray(value) ? value.filter((item): item is string => typeof item === "string") : [];
}

export function AdvisorResponsePanel({
  defaultSummary,
  latestUpdates,
  repairOrderId
}: {
  defaultSummary: string;
  latestUpdates: AdvisorUpdate[];
  repairOrderId: string;
}) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [statusCode, setStatusCode] = useState("WAITING_TECHNICIAN_CLARIFICATION");
  const [contactChannel, setContactChannel] = useState("INTERNAL");
  const [contactDirection, setContactDirection] = useState("INTERNAL");
  const [contactOutcome, setContactOutcome] = useState("Technician clarification requested");
  const [customerVisibleSummary, setCustomerVisibleSummary] = useState(defaultSummary);
  const [internalNotes, setInternalNotes] = useState("");
  const [promiseAt, setPromiseAt] = useState("");
  const [nextContactAt, setNextContactAt] = useState("");
  const [selectedCodes, setSelectedCodes] = useState<string[]>(["TECHNICIAN_CLARIFICATION"]);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const canSubmit = contactOutcome.trim().length > 0 && customerVisibleSummary.trim().length > 0 && !isPending;
  const latest = useMemo(() => latestUpdates.slice(0, 3), [latestUpdates]);

  function toggleCode(code: string) {
    setSelectedCodes((current) => current.includes(code) ? current.filter((item) => item !== code) : [...current, code]);
  }

  function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);
    setMessage(null);
    startTransition(async () => {
      const response = await fetch(`/api/repair-orders/${repairOrderId}/advisor-update`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          contactChannel,
          contactDirection,
          contactOutcome,
          customerVisibleSummary,
          exceptionCodes: selectedCodes,
          idempotencyKey: crypto.randomUUID(),
          internalNotes,
          nextContactAt: nextContactAt ? new Date(nextContactAt).toISOString() : null,
          occurredAt: new Date().toISOString(),
          promiseAt: promiseAt ? new Date(promiseAt).toISOString() : null,
          reason: "Record service advisor response, customer communication, and next-action ownership.",
          statusCode
        })
      });
      const payload = await response.json().catch(() => ({}));
      if (!response.ok) {
        setError(typeof payload.error === "string" ? payload.error : "Advisor response could not be saved.");
        return;
      }
      setMessage("Advisor response saved to the repair-order timeline.");
      setInternalNotes("");
      router.refresh();
    });
  }

  return (
    <section className="advisor-ro-card advisor-response-workbench">
      <header>
        <MessageSquarePlus />
        <div>
          <strong>Advisor response</strong>
          <span>Document customer contact, technician clarification, promise risk, and next step.</span>
        </div>
      </header>

      <form onSubmit={submit}>
        <label>
          <span>Response type</span>
          <select value={statusCode} onChange={(event) => setStatusCode(event.target.value)}>
            {STATUS_OPTIONS.map((option) => <option key={option}>{option}</option>)}
          </select>
        </label>
        <label>
          <span>Channel</span>
          <select value={contactChannel} onChange={(event) => setContactChannel(event.target.value)}>
            {CHANNEL_OPTIONS.map((option) => <option key={option}>{option}</option>)}
          </select>
        </label>
        <label>
          <span>Direction</span>
          <select value={contactDirection} onChange={(event) => setContactDirection(event.target.value)}>
            {DIRECTION_OPTIONS.map((option) => <option key={option}>{option}</option>)}
          </select>
        </label>
        <label>
          <span>Promise / callback time</span>
          <input type="datetime-local" value={promiseAt} min={nowLocal()} onChange={(event) => setPromiseAt(event.target.value)} />
        </label>
        <label>
          <span>Next contact due</span>
          <input type="datetime-local" value={nextContactAt} min={nowLocal()} onChange={(event) => setNextContactAt(event.target.value)} />
        </label>
        <label className="wide">
          <span>Outcome / technician response</span>
          <input value={contactOutcome} onChange={(event) => setContactOutcome(event.target.value)} placeholder="Example: requested technician clarification before calling customer." />
        </label>
        <label className="wide">
          <span>Customer-safe update</span>
          <textarea value={customerVisibleSummary} onChange={(event) => setCustomerVisibleSummary(event.target.value)} />
        </label>
        <label className="wide">
          <span>Internal advisor notes</span>
          <textarea value={internalNotes} onChange={(event) => setInternalNotes(event.target.value)} placeholder="Private operational notes for technician, manager, or next advisor." />
        </label>

        <fieldset>
          <legend>Flags / blockers</legend>
          {EXCEPTION_OPTIONS.map((option) => (
            <button aria-pressed={selectedCodes.includes(option.code)} key={option.code} onClick={() => toggleCode(option.code)} type="button">
              {option.label}
            </button>
          ))}
        </fieldset>

        {error ? <p className="advisor-response-error">{error}</p> : null}
        {message ? <p className="advisor-response-success">{message}</p> : null}

        <button disabled={!canSubmit} type="submit"><Save /> Save advisor response</button>
      </form>

      <div className="advisor-response-history">
        <strong>Recent advisor history</strong>
        {latest.length ? latest.map((update) => (
          <article key={update.version}>
            <span>v{update.version} • {update.statusCode} • {new Date(update.occurredAt).toLocaleString()}</span>
            <p>{update.customerVisibleSummary}</p>
            <small>{update.contactChannel}: {update.contactOutcome}{codes(update.exceptionCodes).length ? ` • ${codes(update.exceptionCodes).join(", ")}` : ""}</small>
            <em>{update.authorUser.name}</em>
          </article>
        )) : <p>No advisor responses have been recorded yet.</p>}
      </div>
    </section>
  );
}
