"use client";

import Link from "next/link";
import type { ReactNode } from "react";
import { useMemo, useRef, useState } from "react";

import styles from "./crm-next-shell.module.css";

type DirectActionField = {
  label: string;
  placeholder: string;
};

type DirectActionResult = {
  error?: string;
  concern?: { concernNumber?: string; title?: string };
  noteId?: string;
  task?: { href?: string; title?: string };
};

function dateOffset(days: number) {
  const date = new Date();
  date.setDate(date.getDate() + days);
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")}`;
}

function dateTimeOffset(days: number, hour: number) {
  return `${dateOffset(days)}T${String(hour).padStart(2, "0")}:00`;
}

function isDateField(label: string) {
  return label === "Due" || label === "Due / SLA";
}

function isReminderField(label: string) {
  return label === "Reminder";
}

function fieldValue(fields: DirectActionField[], values: string[], label: string) {
  const index = fields.findIndex((field) => field.label === label);
  return index >= 0 ? values[index]?.trim() ?? "" : "";
}

function dateFieldValue(fields: DirectActionField[], values: string[], label: string) {
  const index = fields.findIndex((field) => field.label === label);
  return index >= 0 ? values[index]?.trim() ?? "" : "";
}

function dueDateToIso(value: string) {
  const fallback = new Date();
  fallback.setHours(17, 0, 0, 0);
  if (fallback.getTime() < Date.now()) fallback.setDate(fallback.getDate() + 1);
  if (!value) return fallback.toISOString();
  const parsed = new Date(`${value}T17:00:00`);
  if (Number.isNaN(parsed.getTime()) || parsed.getTime() < Date.now() - 60_000) return fallback.toISOString();
  return parsed.toISOString();
}

function makeIdempotencyKey(actionId: string, customerId: string) {
  return globalThis.crypto?.randomUUID?.() ?? `crm-next-${actionId}-${customerId}-${Date.now()}`;
}

export function CrmNextDirectActionForm({
  actionId,
  cancelHref,
  children,
  customerId,
  customerName,
  disabled,
  fields,
  nextAction,
  saveLabel,
  successMessage
}: {
  actionId: string;
  cancelHref: string;
  children?: ReactNode;
  customerId?: string;
  customerName: string;
  disabled: boolean;
  fields: DirectActionField[];
  nextAction: string;
  saveLabel: string;
  successMessage: string;
}) {
  const [values, setValues] = useState(() => fields.map(() => ""));
  const [dateValues, setDateValues] = useState(() => fields.map(() => ""));
  const [isSaving, setIsSaving] = useState(false);
  const [savedMessage, setSavedMessage] = useState<string | null>(null);
  const [savedHref, setSavedHref] = useState<string | null>(null);
  const [saveFailed, setSaveFailed] = useState(false);
  const requestRef = useRef<{ fingerprint: string; key: string; dueAt: string } | null>(null);
  const isDocumentUpload = actionId === "upload-document";
  const canSave = useMemo(
    () => values.some((value) => value.trim().length > 2) || dateValues.some((value) => value.trim().length > 0),
    [dateValues, values]
  );
  const needsCustomerContext = disabled || !customerId;

  async function saveAction() {
    if (isSaving) return;
    if (needsCustomerContext) {
      setSaveFailed(true);
      setSavedMessage("This action needs a verified Customer 360 record before it can save. Open the customer record, then use Add Note from that customer.");
      return;
    }
    setIsSaving(true);
    setSavedMessage(null);
    setSavedHref(null);
    setSaveFailed(false);
    try {
      const fingerprint = JSON.stringify({ actionId, customerId, values, dateValues });
      if (requestRef.current?.fingerprint !== fingerprint) requestRef.current = { fingerprint, key: makeIdempotencyKey(actionId, customerId), dueAt: dueDateToIso(dateFieldValue(fields, dateValues, "Due")) };
      const idempotencyKey = requestRef.current.key;
      let response: Response;
      if (actionId === "add-note") {
        response = await fetch(`/api/crm-next/customers/${encodeURIComponent(customerId)}/actions`, {
          body: JSON.stringify({
            action: "add-note",
            body: fieldValue(fields, values, "Note"),
            idempotencyKey,
            visibility: "INTERNAL"
          }),
          headers: { "content-type": "application/json" },
          method: "POST"
        });
      } else if (actionId === "new-task") {
        const task = fieldValue(fields, values, "Task") || nextAction;
        response = await fetch(`/api/crm-next/customers/${encodeURIComponent(customerId)}/actions`, {
          body: JSON.stringify({
            action: "new-task",
            brief: `${task}\n\nCustomer: ${customerName}\nSource: Customer Console action.`,
            dueAt: requestRef.current.dueAt,
            idempotencyKey,
            title: task
          }),
          headers: { "content-type": "application/json" },
          method: "POST"
        });
      } else if (actionId === "new-case") {
        const summary = fieldValue(fields, values, "Case summary") || `Review customer case for ${customerName}`;
        const customerNote = fieldValue(fields, values, "Customer note");
        const resolution = fieldValue(fields, values, "Resolution needed");
        const priority = fieldValue(fields, values, "Priority").toLowerCase();
        response = await fetch("/api/concerns", {
          body: JSON.stringify({
            customerId,
            customerReference: customerName,
            daysOverdue: priority.includes("urgent") || priority.includes("high") ? 1 : 0,
            description: [summary, customerNote, resolution].filter(Boolean).join("\n\n"),
            managerSensitive: priority.includes("urgent") || priority.includes("high"),
            missingDocumentation: /document|insurance|title|proof/i.test(`${summary} ${customerNote} ${resolution}`),
            moneyRisk: /payment|finance|money|refund|deposit/i.test(`${summary} ${customerNote} ${resolution}`),
            repeatContactCount: 0,
            source: "QUICK_LOG",
            title: summary
          }),
          headers: { "content-type": "application/json", "Idempotency-Key": idempotencyKey },
          method: "POST"
        });
      } else {
        setSaveFailed(true);
        setSavedMessage("This CRM action is not wired yet.");
        return;
      }

      const result = await response.json().catch(() => null) as DirectActionResult | null;
      if (!response.ok) {
        setSaveFailed(true);
        setSavedMessage(result?.error ?? "This CRM action could not be saved right now.");
        return;
      }

      setSavedHref(result?.task?.href ?? null);
      setSavedMessage(
        actionId === "new-case" && result?.concern?.concernNumber
          ? `${successMessage} Case ${result.concern.concernNumber} was created.`
          : successMessage
      );
    } catch {
      setSaveFailed(true);
      setSavedMessage("Connection interrupted. Your text is still here. Try saving again; the same request will not create a duplicate.");
    } finally {
      setIsSaving(false);
    }
  }

  if (isDocumentUpload) {
    const query = new URLSearchParams({ ownerId: customerId ?? "", ownerLabel: customerName });
    return <section className={styles.directActionForm} aria-label="Customer document upload">
      <p>Upload and review files in Document Library with this customer already selected. Saving a note does not upload a file.</p>
      {!needsCustomerContext ? <Link className={styles.primaryButton} href={`/documents?${query}`}>Open customer document upload</Link> : <p role="alert">Select a verified customer before uploading documents.</p>}
      <Link href={cancelHref}>Back to customer</Link>
    </section>;
  }

  return (
    <div className={styles.directActionForm}>
      {fields.map((field, index) => (
        <label key={field.label}>
          <span>{field.label}</span>
          {isDateField(field.label) || isReminderField(field.label) ? (
            <div className={styles.directDateField}>
              <input
                aria-label={field.label}
                onChange={(event) => {
                  const nextDateValues = [...dateValues];
                  nextDateValues[index] = event.target.value;
                  setDateValues(nextDateValues);
                  setSavedMessage(null);
                  setSavedHref(null);
                }}
                type={isReminderField(field.label) ? "datetime-local" : "date"}
                value={dateValues[index]}
              />
              <small>{field.placeholder}</small>
              <div className={styles.directDateQuickActions}>
                <button
                  onClick={() => {
                    const nextDateValues = [...dateValues];
                    nextDateValues[index] = isReminderField(field.label) ? dateTimeOffset(0, 9) : dateOffset(0);
                    setDateValues(nextDateValues);
                    setSavedMessage(null);
                    setSavedHref(null);
                  }}
                  type="button"
                >
                  Today
                </button>
                <button
                  onClick={() => {
                    const nextDateValues = [...dateValues];
                    nextDateValues[index] = isReminderField(field.label) ? dateTimeOffset(1, 9) : dateOffset(1);
                    setDateValues(nextDateValues);
                    setSavedMessage(null);
                    setSavedHref(null);
                  }}
                  type="button"
                >
                  Tomorrow
                </button>
                <button
                  onClick={() => {
                    const nextDateValues = [...dateValues];
                    nextDateValues[index] = isReminderField(field.label) ? dateTimeOffset(7, 9) : dateOffset(7);
                    setDateValues(nextDateValues);
                    setSavedMessage(null);
                    setSavedHref(null);
                  }}
                  type="button"
                >
                  Next week
                </button>
              </div>
            </div>
          ) : (
            <textarea
              onChange={(event) => {
                const nextValues = [...values];
                nextValues[index] = event.target.value;
                setValues(nextValues);
                setSavedMessage(null);
                setSavedHref(null);
              }}
              placeholder={field.placeholder}
              rows={["Owner", "Priority"].includes(field.label) ? 1 : 4}
              value={values[index]}
            />
          )}
        </label>
      ))}
      {children}
      <div className={styles.directActionFooter}>
        <button
          data-success-message={successMessage}
          disabled={needsCustomerContext || !canSave || isSaving}
          onClick={() => void saveAction()}
          type="button"
        >
          {isSaving ? "Saving..." : saveLabel}
        </button>
        <Link href={cancelHref}>Cancel</Link>
      </div>
      {savedMessage ? <p className={saveFailed ? styles.inlineActionNotice : styles.directActionSaved} role={saveFailed ? "alert" : "status"}>{savedMessage}{savedHref ? <> <Link href={savedHref}>Open task</Link></> : !saveFailed ? <> <Link href={cancelHref}>Review customer record</Link></> : null}</p> : null}
    </div>
  );
}
