"use client";

import { useMemo, useState } from "react";
import Link from "next/link";

import { CRM_NEXT_DEALS_HREF } from "@/features/crm/crm-route-authority";
import type { CrmNextCommandCenter } from "@/server/crm-next/read-model";

import styles from "./crm-next-shell.module.css";

type DealWorkflowId =
  | "finance"
  | "bhph"
  | "retail-sale"
  | "lease-to-own"
  | "repairs"
  | "daily-rental"
  | "warranty-products"
  | "financing-products"
  | "wholesale"
  | "outside-finance-one-pay";

type DealWorkflow = {
  id: DealWorkflowId;
  label: string;
  intent: string;
  startsWith: string;
  required: string[];
  sourceChecks: string[];
  executionSteps: string[];
  nextWorkspace: string;
};

const DEAL_WORKFLOWS: DealWorkflow[] = [
  {
    id: "finance",
    label: "Finance",
    intent: "Retail vehicle sale that needs lender, stipulation, down payment, and approval controls.",
    startsWith: "Customer, vehicle, selling price, credit path, lender status",
    required: ["Customer", "Vehicle", "Selling price", "Credit path"],
    sourceChecks: ["Customer 360", "Vehicle 360", "Inventory status", "Finance approval"],
    executionSteps: ["Confirm vehicle", "Capture credit path", "Track lender status", "Move to finance desk"],
    nextWorkspace: "Finance deal desk"
  },
  {
    id: "bhph",
    label: "BHPH",
    intent: "Buy-here-pay-here sale with down payment, recurring payment, term, and internal risk controls.",
    startsWith: "Customer, vehicle, down payment, payment plan, term",
    required: ["Customer", "Vehicle", "Down payment", "Payment terms"],
    sourceChecks: ["Customer 360", "Vehicle 360", "BHPH eligibility", "Payment schedule"],
    executionSteps: ["Confirm eligibility", "Capture proof", "Structure payment", "Move to BHPH desk"],
    nextWorkspace: "BHPH deal desk"
  },
  {
    id: "retail-sale",
    label: "Retail Sale",
    intent: "Standard retail vehicle sale where staff confirms the buyer, vehicle, sale amount, and payment/funding condition.",
    startsWith: "Customer, vehicle, selling price, funds method, title readiness",
    required: ["Customer", "Vehicle", "Selling price", "Payment / funding method"],
    sourceChecks: ["Customer 360", "Vehicle 360", "Inventory status", "Title readiness"],
    executionSteps: ["Confirm vehicle", "Capture payment/funding method", "Check title readiness", "Move to retail desk"],
    nextWorkspace: "Retail sale desk"
  },
  {
    id: "lease-to-own",
    label: "Lease-to-Own",
    intent: "Lease-to-own workflow with eligibility, deposit, recurring payment, term, and contract-readiness controls.",
    startsWith: "Customer, vehicle, deposit, recurring payment, term",
    required: ["Customer", "Vehicle", "Deposit", "Payment terms"],
    sourceChecks: ["Customer 360", "Vehicle 360", "Eligibility checklist", "Payment schedule"],
    executionSteps: ["Confirm eligibility", "Capture deposit", "Structure terms", "Move to lease-to-own desk"],
    nextWorkspace: "Lease-to-own deal desk"
  },
  {
    id: "repairs",
    label: "Repairs",
    intent: "Customer repair revenue workflow with concern, estimate, authorization, and service handoff controls.",
    startsWith: "Customer, vehicle, repair concern, estimate path, authorization",
    required: ["Customer", "Vehicle", "Repair concern", "Authorization path"],
    sourceChecks: ["Customer 360", "Vehicle 360", "Service intake", "Estimate controls"],
    executionSteps: ["Capture concern", "Confirm vehicle", "Prepare estimate path", "Move to repair desk"],
    nextWorkspace: "Repair revenue desk"
  },
  {
    id: "daily-rental",
    label: "Daily Rental",
    intent: "Rental workflow with date window, availability, checkout, payment, and return controls.",
    startsWith: "Customer, vehicle, rental dates, availability, checkout readiness",
    required: ["Customer", "Vehicle", "Date window", "Availability status"],
    sourceChecks: ["Customer 360", "Rental availability", "Payment authorization", "Return condition"],
    executionSteps: ["Confirm date window", "Check availability", "Prepare checkout", "Move to rental desk"],
    nextWorkspace: "Daily rental desk"
  },
  {
    id: "warranty-products",
    label: "Warranty Products",
    intent: "Warranty product workflow with eligibility, presentation, acceptance, and contract controls.",
    startsWith: "Customer or deal context, product interest, eligibility, presentation path",
    required: ["Customer", "Product interest", "Eligibility", "Deal context"],
    sourceChecks: ["Customer 360", "Warranty eligibility", "Finance context", "Contract readiness"],
    executionSteps: ["Confirm interest", "Check eligibility", "Prepare presentation", "Move to warranty desk"],
    nextWorkspace: "Warranty product desk"
  },
  {
    id: "financing-products",
    label: "Financing Products",
    intent: "Finance-product workflow for credit, lender, menu, product, and handoff readiness.",
    startsWith: "Customer, finance intent, credit path, product/handoff status",
    required: ["Customer", "Finance intent", "Credit path", "Handoff status"],
    sourceChecks: ["Customer 360", "Finance readiness", "Lender status", "Product menu"],
    executionSteps: ["Confirm finance intent", "Capture credit path", "Prepare menu", "Move to finance product desk"],
    nextWorkspace: "Financing product desk"
  },
  {
    id: "wholesale",
    label: "Wholesale",
    intent: "Dealer-to-dealer or wholesale disposition with buyer, amount, and release controls.",
    startsWith: "Buyer, vehicle, wholesale price, title/release readiness",
    required: ["Buyer", "Vehicle", "Wholesale price", "Release status"],
    sourceChecks: ["Vendor/Buyer profile", "Vehicle 360", "Title readiness", "Release checklist"],
    executionSteps: ["Confirm buyer", "Capture wholesale amount", "Check title/release", "Move to wholesale desk"],
    nextWorkspace: "Wholesale deal desk"
  },
  {
    id: "outside-finance-one-pay",
    label: "Outside Finance / One Pay",
    intent: "Sale funded through outside finance or a one-pay arrangement with funding-proof controls.",
    startsWith: "Customer, vehicle, selling price, outside lender or one-pay proof",
    required: ["Customer", "Vehicle", "Selling price", "Funding proof"],
    sourceChecks: ["Customer 360", "Vehicle 360", "Funding proof", "Title readiness"],
    executionSteps: ["Confirm funding path", "Capture proof", "Check title readiness", "Move to outside finance desk"],
    nextWorkspace: "Outside finance deal desk"
  }
];

const FIELD_LABELS = {
  customer: "Customer / buyer",
  vehicle: "Vehicle / stock #",
  amount: "Amount / estimate / reserve",
  owner: "Owner",
  note: "Start note"
};

function dollarsToCents(value: string) {
  const normalized = value.trim().replace(/[$,]/g, "");
  if (!normalized) return null;
  if (!/^\d+(\.\d{1,2})?$/.test(normalized)) return NaN;
  return Math.round(Number(normalized) * 100);
}

function tomorrowIso() {
  const date = new Date();
  date.setDate(date.getDate() + 1);
  date.setHours(10, 0, 0, 0);
  return date.toISOString();
}

function RetailSaleExecutionDesk({
  amount,
  onAmountChange,
  onVehicleChange,
  vehicle
}: {
  amount: string;
  onAmountChange: (value: string) => void;
  onVehicleChange: (value: string) => void;
  vehicle: string;
}) {
  return (
    <div className={styles.retailExecutionDesk}>
      <section className={styles.retailSection}>
        <header>
          <span>Applicant info</span>
          <strong>Find or capture the buyer</strong>
        </header>
        <div className={styles.retailActionRow}>
          <button type="button">Add co-buyer</button>
          <button type="button">Print credit application</button>
        </div>
        <label className={styles.retailSearch}>
          <span>Search existing customer</span>
          <input placeholder="Name, phone, email, or customer #" />
        </label>
        <div className={styles.retailFieldGrid}>
          <label><span>First name</span><input /></label>
          <label><span>Middle</span><input /></label>
          <label><span>Last name</span><input /></label>
          <label><span>Suffix</span><input /></label>
          <label><span>Nickname</span><input /></label>
          <label><span>Date of birth</span><input placeholder="MM/DD/YYYY" /></label>
          <label><span>SSN / ITIN</span><input /></label>
          <label><span>ID type</span><select><option>Driver license</option><option>State ID</option><option>Passport</option></select></label>
          <label><span>ID state</span><select><option>MN</option><option>WI</option><option>IA</option><option>ND</option><option>SD</option></select></label>
          <label><span>ID number</span><input /></label>
        </div>
      </section>

      <section className={styles.retailSection}>
        <header>
          <span>Residence & contact</span>
          <strong>Keep the deal reachable</strong>
        </header>
        <div className={styles.retailFieldGrid}>
          <label className={styles.retailWide}><span>Street</span><input /></label>
          <label><span>City</span><input /></label>
          <label><span>State</span><select><option>MN</option><option>WI</option><option>IA</option><option>ND</option><option>SD</option></select></label>
          <label><span>Zip</span><input /></label>
          <label><span>County</span><input /></label>
          <label><span>Residence type</span><select><option>Own</option><option>Rent</option><option>Family</option><option>Other</option></select></label>
          <label><span>Rent / mortgage</span><input placeholder="$0.00" /></label>
          <label><span>Years at address</span><input /></label>
          <label><span>Months</span><input /></label>
          <label><span>Cell phone</span><input /></label>
          <label><span>Email</span><input /></label>
        </div>
      </section>

      <section className={styles.retailSection}>
        <header>
          <span>Vehicle info</span>
          <strong>Confirm the unit and book values</strong>
        </header>
        <div className={styles.retailFieldGrid}>
          <label><span>Search inventory</span><input value={vehicle} onChange={(event) => onVehicleChange(event.target.value)} placeholder="Stock, VIN, or vehicle" /></label>
          <label><span>Vehicle type</span><select><option>Auto</option><option>Truck</option><option>SUV</option><option>Van</option></select></label>
          <label><span>New / used</span><select><option>Used</option><option>New</option></select></label>
          <label><span>VIN</span><input /></label>
          <label><span>Stock no.</span><input /></label>
          <label><span>Year</span><input /></label>
          <label><span>Make</span><input /></label>
          <label><span>Model</span><input /></label>
          <label><span>Trim</span><input /></label>
          <label><span>Engine</span><input /></label>
          <label><span>Transmission</span><input /></label>
          <label><span>Drive train</span><input /></label>
          <label><span>Mileage</span><input /></label>
          <label><span>Title readiness</span><select><option>Check before delivery</option><option>Ready</option><option>Needs work</option></select></label>
          <label><span>Title brand</span><select><option>Clean</option><option>Prior salvage</option><option>Rebuilt</option><option>Unknown</option></select></label>
          <label><span>KBB retail</span><input placeholder="$0.00" /></label>
          <label><span>KBB wholesale</span><input placeholder="$0.00" /></label>
          <label><span>J.D. Power</span><input placeholder="$0.00" /></label>
          <label><span>Black Book retail</span><input placeholder="$0.00" /></label>
          <label><span>Black Book wholesale</span><input placeholder="$0.00" /></label>
          <label><span>MMR</span><input placeholder="$0.00" /></label>
        </div>
      </section>

      <section className={styles.retailSection}>
        <header>
          <span>Trade-in info</span>
          <strong>Capture payoff and allowance before numbers move</strong>
        </header>
        <div className={styles.retailFieldGrid}>
          <label><span>Trade vehicle search</span><input placeholder="VIN, plate, or customer vehicle" /></label>
          <label><span>Trade VIN</span><input /></label>
          <label><span>Trade allowance</span><input placeholder="$0.00" /></label>
          <label><span>Trade ACV</span><input placeholder="$0.00" /></label>
          <label><span>Trade payoff</span><input placeholder="$0.00" /></label>
          <label><span>Lienholder</span><input /></label>
          <label><span>Year</span><input /></label>
          <label><span>Make</span><input /></label>
          <label><span>Model</span><input /></label>
          <label><span>Trim</span><input /></label>
        </div>
      </section>

      <section className={styles.retailSection}>
        <header>
          <span>Deal info</span>
          <strong>Build the first working numbers</strong>
        </header>
        <div className={styles.retailFieldGrid}>
          <label><span>Price</span><input value={amount} onChange={(event) => onAmountChange(event.target.value)} placeholder="$0.00" /></label>
          <label><span>Fees</span><input placeholder="$0.00" /></label>
          <label><span>Insurance / GAP / VSI</span><input placeholder="$0.00" /></label>
          <label><span>Accessories</span><input placeholder="$0.00" /></label>
          <label><span>VSC / products</span><input placeholder="$0.00" /></label>
          <label><span>Total tax</span><input placeholder="$0.00" /></label>
          <label><span>Cash received</span><input placeholder="$0.00" /></label>
          <label><span>Trade in</span><input placeholder="$0.00" /></label>
          <label><span>Amount financed</span><input placeholder="$0.00" /></label>
          <label><span>Term</span><input placeholder="0 months" /></label>
          <label><span>Interest rate</span><input placeholder="0.000%" /></label>
          <label><span>Monthly payment</span><input placeholder="$0.00" /></label>
          <label><span>First payment</span><input placeholder="30 days" /></label>
          <label><span>Payment / funding</span><select><option>Cash / certified funds</option><option>Outside finance</option><option>One pay</option><option>To be confirmed</option></select></label>
          <label><span>Delivery target</span><input placeholder="Today, tomorrow, or date" /></label>
        </div>
      </section>

      <aside className={styles.retailFundingPanel} aria-label="Retail sale execution checks">
        <header>
          <span>Execution checks</span>
          <strong>Before staff promises delivery</strong>
        </header>
        <dl>
          <div><dt>Identity</dt><dd>Applicant and ID captured</dd></div>
          <div><dt>Vehicle</dt><dd>Stock/VIN confirmed</dd></div>
          <div><dt>Funding</dt><dd>Payment path selected</dd></div>
          <div><dt>Delivery</dt><dd>Title and release checked</dd></div>
        </dl>
      </aside>
    </div>
  );
}

export function CrmNextDealStartTool({ model }: { model: CrmNextCommandCenter }) {
  const [workflowId, setWorkflowId] = useState<DealWorkflowId>("retail-sale");
  const [form, setForm] = useState({
    amount: "",
    customerId: model.customers[0]?.id ?? "",
    note: "",
    ownerUserId: model.userId,
    vehicle: ""
  });
  const [status, setStatus] = useState<{ kind: "idle" | "saving" | "success" | "error"; message: string; href?: string }>({ kind: "idle", message: "" });
  const workflow = DEAL_WORKFLOWS.find((item) => item.id === workflowId) ?? DEAL_WORKFLOWS[0];
  const selectedCustomer = model.customers.find((customer) => customer.id === form.customerId) ?? model.customers[0] ?? null;
  const estimatedValueCents = useMemo(() => dollarsToCents(form.amount), [form.amount]);
  const completedCount = useMemo(() => [form.customerId, form.vehicle, form.amount].filter((value) => value.trim()).length, [form]);
  const ready = completedCount === 3 && Boolean(form.ownerUserId) && Number.isFinite(estimatedValueCents);

  function update(key: keyof typeof form, value: string) {
    setForm((current) => ({ ...current, [key]: value }));
  }

  async function startDeal() {
    if (!ready || !selectedCustomer || typeof estimatedValueCents !== "number") return;
    setStatus({ kind: "saving", message: "Starting deal..." });
    const response = await fetch("/api/crm/v1/opportunities", {
      body: JSON.stringify({
        customerId: selectedCustomer.id,
        estimatedValueCents,
        idempotencyKey: crypto.randomUUID(),
        nextActionDueAt: tomorrowIso(),
        nextActionLabel: `Execute ${workflow.label} workflow for ${selectedCustomer.name}`,
        ownerUserId: form.ownerUserId,
        summary: [
          `Revenue channel: ${workflow.label}`,
          `Vehicle/reference: ${form.vehicle}`,
          form.note ? `Staff note: ${form.note}` : null
        ].filter(Boolean).join("\n"),
        title: `${workflow.label}: ${selectedCustomer.name}`
      }),
      headers: { "content-type": "application/json" },
      method: "POST"
    });
    const payload = await response.json().catch(() => ({}));
    if (!response.ok) {
      setStatus({ kind: "error", message: typeof payload.error === "string" ? payload.error : "Deal could not be started." });
      return;
    }
    setStatus({ kind: "success", href: payload.opportunity?.href, message: payload.duplicate ? "Execution path replayed safely." : `Execution path opened: ${payload.opportunity?.opportunityNumber ?? "new opportunity"}` });
  }

  return (
    <section className={styles.dealStartTool} aria-label="Revenue execution desk">
      <header className={styles.dealStartHeader}>
        <div>
          <span className={styles.eyebrow}>Revenue execution desk</span>
          <h1>Work the revenue path</h1>
          <p>Choose the channel unfolding in front of staff. The desk asks for only the facts needed to open the right execution path.</p>
        </div>
        <Link className={styles.secondaryButton} href={CRM_NEXT_DEALS_HREF}>Back to deals</Link>
      </header>

      <main className={styles.dealStartLayout}>
        <section className={styles.dealStartStep}>
          <span>1</span>
          <div>
            <h2>Choose channel</h2>
            <p>Channel controls the next facts, source checks, and execution desk.</p>
          </div>
          <select aria-label="Select revenue channel" value={workflowId} onChange={(event) => setWorkflowId(event.target.value as DealWorkflowId)}>
            {DEAL_WORKFLOWS.map((item) => <option key={item.id} value={item.id}>{item.label}</option>)}
          </select>
        </section>

        <section className={styles.dealStartStep}>
          <span>2</span>
          <div>
            <h2>Capture working facts</h2>
            <p>{workflow.startsWith}</p>
          </div>
          {workflow.id === "retail-sale" ? (
            <>
              <div className={styles.dealStartForm}>
                <label><span>{FIELD_LABELS.customer}</span><select value={form.customerId} onChange={(event) => update("customerId", event.target.value)}><option value="">Select customer</option>{model.customers.map((customer) => <option key={customer.id} value={customer.id}>{customer.name}</option>)}</select></label>
                <label><span>{FIELD_LABELS.owner}</span><input disabled value={model.userName} /></label>
              </div>
              <RetailSaleExecutionDesk
                amount={form.amount}
                onAmountChange={(value) => update("amount", value)}
                onVehicleChange={(value) => update("vehicle", value)}
                vehicle={form.vehicle}
              />
              <label className={`${styles.dealStartWide} ${styles.retailNote}`}><span>{FIELD_LABELS.note}</span><textarea value={form.note} onChange={(event) => update("note", event.target.value)} placeholder="Optional context staff needs before working this retail sale" rows={3} /></label>
            </>
          ) : (
            <div className={styles.dealStartForm}>
              <label><span>{FIELD_LABELS.customer}</span><select value={form.customerId} onChange={(event) => update("customerId", event.target.value)}><option value="">Select customer</option>{model.customers.map((customer) => <option key={customer.id} value={customer.id}>{customer.name}</option>)}</select></label>
              <label><span>{FIELD_LABELS.vehicle}</span><input value={form.vehicle} onChange={(event) => update("vehicle", event.target.value)} placeholder="Stock, VIN, or vehicle" /></label>
              <label><span>{FIELD_LABELS.amount}</span><input value={form.amount} onChange={(event) => update("amount", event.target.value)} placeholder="$0.00" /></label>
              <label><span>{FIELD_LABELS.owner}</span><input disabled value={model.userName} /></label>
              <label className={styles.dealStartWide}><span>{FIELD_LABELS.note}</span><textarea value={form.note} onChange={(event) => update("note", event.target.value)} placeholder="Optional context staff needs before working this channel" rows={3} /></label>
            </div>
          )}
        </section>

        <section className={styles.dealStartReview}>
          <span>3</span>
          <div>
            <h2>Execute next</h2>
            <p>{workflow.intent}</p>
          </div>
          <dl>
            <div><dt>Revenue channel</dt><dd>{workflow.label}</dd></div>
            <div><dt>Execution desk</dt><dd>{workflow.nextWorkspace}</dd></div>
            <div><dt>Readiness</dt><dd>{ready ? "Ready to execute" : `${completedCount}/3 required facts`}</dd></div>
          </dl>
          <div className={styles.dealStartChecklist}>
            <strong>Facts needed now</strong>
            {workflow.required.map((item) => <span key={item}>{item}</span>)}
          </div>
          <div className={styles.dealStartChecklist}>
            <strong>Execution path</strong>
            {workflow.executionSteps.map((item) => <span key={item}>{item}</span>)}
          </div>
          <details className={styles.dealStartDisclosure}>
            <summary>Source checks</summary>
            <div>{workflow.sourceChecks.map((item) => <span key={item}>{item}</span>)}</div>
          </details>
          <button disabled={!ready || status.kind === "saving"} onClick={() => void startDeal()} type="button">{status.kind === "saving" ? "Opening..." : ready ? "Open execution path" : "Complete required facts"}</button>
          {status.kind !== "idle" ? <p className={status.kind === "error" ? styles.dealStartError : styles.dealStartStatus}>{status.message}{status.href ? <> <Link href={status.href}>Open opportunity</Link></> : null}</p> : null}
          <small>Opens a Unified CRM opportunity through the governed backend command with idempotency, audit, and source checks.</small>
        </section>
      </main>
    </section>
  );
}
