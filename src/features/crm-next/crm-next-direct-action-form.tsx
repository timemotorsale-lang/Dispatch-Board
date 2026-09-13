"use client";

import Link from "next/link";
import type { ReactNode } from "react";
import { useMemo, useState } from "react";

import styles from "./crm-next-shell.module.css";

type DirectActionField = {
  label: string;
  placeholder: string;
};

function dateOffset(days: number) {
  const date = new Date();
  date.setDate(date.getDate() + days);
  return date.toISOString().slice(0, 10);
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

export function CrmNextDirectActionForm({
  cancelHref,
  children,
  disabled,
  fields,
  saveLabel,
  successMessage
}: {
  cancelHref: string;
  children?: ReactNode;
  disabled: boolean;
  fields: DirectActionField[];
  saveLabel: string;
  successMessage: string;
}) {
  const [values, setValues] = useState(() => fields.map(() => ""));
  const [dateValues, setDateValues] = useState(() => fields.map(() => ""));
  const [savedMessage, setSavedMessage] = useState<string | null>(null);
  const canSave = useMemo(
    () => values.some((value) => value.trim().length > 2) || dateValues.some((value) => value.trim().length > 0),
    [dateValues, values]
  );

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
          disabled={disabled || !canSave}
          onClick={() => setSavedMessage(successMessage)}
          type="button"
        >
          {saveLabel}
        </button>
        <Link href={cancelHref}>Cancel</Link>
      </div>
      {savedMessage ? <p className={styles.directActionSaved} role="status">{savedMessage}</p> : null}
    </div>
  );
}
