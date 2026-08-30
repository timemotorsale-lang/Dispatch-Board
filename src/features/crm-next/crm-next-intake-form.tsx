"use client";

import { type FormEvent, useMemo, useState } from "react";
import { AlertCircle, CheckCircle2, UserPlus } from "lucide-react";

import styles from "./crm-next-shell.module.css";

type IntakeMode = "customer" | "prospect";

type SaveState =
  | { kind: "idle" }
  | { kind: "saving"; message: string }
  | { kind: "success"; message: string; customerHref: string }
  | { kind: "error"; message: string };

const DEFAULT_LOCATION_ID = "loc-time-motor-sales-minneapolis";

function formText(data: FormData, key: string) {
  const value = data.get(key);
  return typeof value === "string" ? value.trim() : "";
}

function idempotencyKey() {
  const cryptoValue = globalThis.crypto?.randomUUID?.();
  return cryptoValue ?? `crm-next-${Date.now()}-${Math.random().toString(16).slice(2)}`;
}

async function readJson(response: Response) {
  const value = await response.json().catch(() => null);
  return value && typeof value === "object" ? value as Record<string, unknown> : {};
}

function customerFrom(value: unknown) {
  if (!value || typeof value !== "object") return null;
  const record = value as Record<string, unknown>;
  return typeof record.id === "string" ? { id: record.id, displayName: String(record.displayName ?? "Customer") } : null;
}

export function CrmNextIntakeForm() {
  const [mode, setMode] = useState<IntakeMode>("customer");
  const [state, setState] = useState<SaveState>({ kind: "idle" });

  const submitLabel = useMemo(() => mode === "prospect" ? "Save prospect" : "Save customer", [mode]);

  async function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const data = new FormData(event.currentTarget);
    setState({ kind: "saving", message: "Saving customer..." });

    const customerPayload = {
      address: formText(data, "address"),
      displayName: formText(data, "displayName"),
      email: formText(data, "email"),
      locationId: formText(data, "locationId") || DEFAULT_LOCATION_ID,
      phoneNumber: formText(data, "phoneNumber"),
      preferredContactMethod: formText(data, "preferredContactMethod") || "PHONE"
    };

    try {
      const customerResponse = await fetch("/api/service-intake/customers", {
        body: JSON.stringify(customerPayload),
        headers: { "Content-Type": "application/json" },
        method: "POST"
      });
      const customerJson = await readJson(customerResponse);
      if (!customerResponse.ok) {
        throw new Error(typeof customerJson.error === "string" ? customerJson.error : "Customer could not be saved.");
      }

      const customer = customerFrom(customerJson.customer);
      if (!customer) throw new Error("Customer saved, but the customer record could not be opened.");

      const customerHref = `/crm-next/customers/${customer.id}`;
      if (mode === "prospect") {
        setState({ kind: "saving", message: "Creating prospect lead..." });
        const leadResponse = await fetch("/api/customers/leads", {
          body: JSON.stringify({
            customerId: customer.id,
            idempotencyKey: idempotencyKey(),
            qualification: {
              budget: formText(data, "budget"),
              customerNeed: formText(data, "customerNeed"),
              desiredTimeline: formText(data, "desiredTimeline"),
              notes: formText(data, "notes"),
              preferredContactMethod: customerPayload.preferredContactMethod
            },
            sourceCode: "CRM_NEXT",
            vehicleInterest: formText(data, "vehicleInterest") || null
          }),
          headers: { "Content-Type": "application/json" },
          method: "POST"
        });
        const leadJson = await readJson(leadResponse);
        if (!leadResponse.ok) {
          setState({
            kind: "success",
            customerHref,
            message: `${customer.displayName} is saved. Open Customer 360 to continue; lead setup needs attention: ${typeof leadJson.error === "string" ? leadJson.error : "lead could not be created."}`
          });
          return;
        }
      }

      setState({
        kind: "success",
        customerHref,
        message: `${customer.displayName} is ready in CRM Next.`
      });
      window.location.assign(customerHref);
    } catch (error) {
      setState({ kind: "error", message: error instanceof Error ? error.message : "Customer could not be saved." });
    }
  }

  return (
    <form className={styles.intakeCard} onSubmit={onSubmit}>
      <header className={styles.panelHeader}>
        <div>
          <h2>Customer details</h2>
          <p className={styles.muted}>Start with the person. Add prospect details only when there is a sales opportunity.</p>
        </div>
        <div className={styles.segmentedControl} aria-label="Intake type">
          <button aria-pressed={mode === "customer"} onClick={() => setMode("customer")} type="button">Customer</button>
          <button aria-pressed={mode === "prospect"} onClick={() => setMode("prospect")} type="button">Prospect</button>
        </div>
      </header>

      <input name="locationId" type="hidden" value={DEFAULT_LOCATION_ID} />

      <div className={styles.intakeFields}>
        <label>
          <span>Name</span>
          <input autoComplete="name" name="displayName" placeholder="First and last name" required />
        </label>
        <label>
          <span>Phone</span>
          <input autoComplete="tel" name="phoneNumber" placeholder="612 342 5656" />
        </label>
        <label>
          <span>Email</span>
          <input autoComplete="email" name="email" placeholder="customer@example.com" type="email" />
        </label>
        <label>
          <span>Preferred contact</span>
          <select defaultValue="PHONE" name="preferredContactMethod">
            <option value="PHONE">Phone</option>
            <option value="EMAIL">Email</option>
            <option value="TEXT">Text</option>
          </select>
        </label>
        <label className={styles.fullField}>
          <span>Address</span>
          <input autoComplete="street-address" name="address" placeholder="Street, city, state" />
        </label>
      </div>

      {mode === "prospect" ? (
        <section className={styles.prospectFields} aria-label="Prospect details">
          <h3>Prospect details</h3>
          <div className={styles.intakeFields}>
            <label>
              <span>Vehicle interest</span>
              <input name="vehicleInterest" placeholder="2021 Toyota RAV4, SUV, financing..." />
            </label>
            <label>
              <span>Timeline</span>
              <input name="desiredTimeline" placeholder="Today, this week, this month..." />
            </label>
            <label>
              <span>Budget</span>
              <input name="budget" placeholder="$350/month, under $18k..." />
            </label>
            <label>
              <span>Customer need</span>
              <input name="customerNeed" placeholder="Replace vehicle, first car, trade-in..." />
            </label>
            <label className={styles.fullField}>
              <span>Notes</span>
              <textarea name="notes" placeholder="Anything the next staff member should know" rows={3} />
            </label>
          </div>
        </section>
      ) : null}

      {state.kind !== "idle" ? (
        <div className={styles.intakeStatus} data-state={state.kind}>
          {state.kind === "error" ? <AlertCircle size={18} /> : <CheckCircle2 size={18} />}
          <span>{state.message}</span>
          {state.kind === "success" ? <a href={state.customerHref}>Open Customer 360</a> : null}
        </div>
      ) : null}

      <div className={styles.intakeFooter}>
        <button className={styles.primaryButton} disabled={state.kind === "saving"} type="submit">
          <UserPlus size={16} /> {state.kind === "saving" ? "Saving..." : submitLabel}
        </button>
        <a className={styles.secondaryButton} href="/crm-next">Cancel</a>
      </div>
    </form>
  );
}
