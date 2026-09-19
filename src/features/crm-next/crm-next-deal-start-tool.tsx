"use client";

import { type ReactNode, type SetStateAction, useEffect, useMemo, useState } from "react";
import Link from "next/link";

import { CRM_NEXT_DEALS_HREF } from "@/features/crm/crm-route-authority";
import { DAILY_RENTAL_FORM_PACKET, requiredDailyRentalFormIds } from "@/lib/daily-rental-form-packet";
import { allLeaseToOwnFormIds, calculateLeaseToOwn, LEASE_TO_OWN_FORM_PACKET, type LeasePaymentFrequency, type LeaseToOwnCalculatorInput } from "@/lib/lease-to-own-form-packet";
import { MN_SALE_FORM_PACKET } from "@/lib/mn-vehicle-sale-form-packet";
import type { CrmNextCommandCenter } from "@/server/crm-next/read-model";

import styles from "./crm-next-shell.module.css";

export type CrmNextDealDraft = {
  amount: string;
  customerId: string;
  note: string;
  ownerUserId: string;
  vehicle: string;
  workflowId: string;
};

export function crmNextDealDraftStorageKey(customerId: string) {
  return `crm-next:deal-draft:${customerId}`;
}

type DealWorkflowId =
  | "finance"
  | "bhph"
  | "retail-sale"
  | "lease-to-own"
  | "repairs"
  | "test-drive"
  | "daily-rental"
  | "vehicle-loaner"
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

type DealStartPreset = {
  id: string;
  label: string;
  helper: string;
  workflowId: DealWorkflowId;
};

type EnterpriseFormTemplate = {
  id: string;
  label: string;
  owner: string;
  signatureRequired: boolean;
  storage: string;
  trigger: string;
};

type DealPacketRule = {
  conditionalFormIds: string[];
  defaultFormIds: string[];
  jacketSections: string[];
  managerTriggers: string[];
  packetName: string;
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
    id: "test-drive",
    label: "Test Drive",
    intent: "Customer test-drive workflow with driver eligibility, vehicle assignment, signed release, checkout evidence, and return controls.",
    startsWith: "Customer, vehicle, driver license, insurance/protection proof, test-drive window",
    required: ["Customer", "Vehicle", "Driver license", "Signed test-drive form"],
    sourceChecks: ["Customer 360", "Vehicle 360", "Inventory status", "Return condition"],
    executionSteps: ["Confirm driver eligibility", "Assign vehicle", "Capture release evidence", "Receive vehicle back"],
    nextWorkspace: "Test drive desk"
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
    id: "vehicle-loaner",
    label: "Vehicle Loaner",
    intent: "Courtesy loaner workflow with the same rental checkout controls, but fees are deferred and waived if the customer buys the interested vehicle.",
    startsWith: "Customer, interested vehicle, loaner unit, dates, approval reason, checkout readiness",
    required: ["Customer", "Interested vehicle", "Loaner unit", "Approval reason"],
    sourceChecks: ["Customer 360", "Loaner availability", "Interested vehicle status", "Return condition"],
    executionSteps: ["Confirm interested vehicle", "Check loaner availability", "Record courtesy waiver", "Move to loaner desk"],
    nextWorkspace: "Vehicle loaner desk"
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

const DEAL_START_PRESETS: DealStartPreset[] = [
  { id: "retail-cash-one-pay", label: "Retail Cash / One Pay", helper: "Sale price, title readiness, payment proof, and delivery packet.", workflowId: "retail-sale" },
  { id: "retail-outside-finance", label: "Retail Outside Finance", helper: "Outside lender, stipulations, funding proof, and lienholder controls.", workflowId: "outside-finance-one-pay" },
  { id: "retail-dealer-finance", label: "Retail Dealer Finance", helper: "Credit path, lender status, stipulations, and financed-sale forms.", workflowId: "finance" },
  { id: "bhph-payment-sale", label: "BHPH", helper: "In-house account setup, references, payment schedule, and servicing handoff.", workflowId: "bhph" },
  { id: "lease-to-own-payment", label: "Lease-to-Own", helper: "Lease calculator, source templates, references, and title authority.", workflowId: "lease-to-own" },
  { id: "wholesale-release", label: "Wholesale", helper: "Buyer authority, funding, title release, and transport handoff.", workflowId: "wholesale" },
  { id: "courtesy-loaner", label: "Loaner", helper: "Rental-style checkout with courtesy waiver and return evidence.", workflowId: "vehicle-loaner" },
  { id: "daily-rental", label: "Daily Rental", helper: "Rental agreement, payment hold, checkout photos, and return evidence.", workflowId: "daily-rental" },
  { id: "test-drive", label: "Test Drive", helper: "Driver proof, signed release, checkout photos, and receiving plan.", workflowId: "test-drive" }
];

const ENTERPRISE_FORM_TEMPLATES: EnterpriseFormTemplate[] = [
  { id: "sales-agreement", label: "Sales agreement / purchase agreement", owner: "Sales", signatureRequired: true, storage: "Deal jacket + Library", trigger: "Every retail vehicle sale" },
  { id: "retail-installment-contract", label: "Retail installment contract", owner: "Finance", signatureRequired: true, storage: "Deal jacket + Library", trigger: "Financed sale / BHPH" },
  { id: "personal-references", label: "Personal references and verification form", owner: "Finance", signatureRequired: true, storage: "Deal jacket + Library", trigger: "Vehicle purchase on credit" },
  { id: "power-of-attorney", label: "Power of attorney / title authority", owner: "Title", signatureRequired: true, storage: "Deal jacket + Library", trigger: "Dealer handles title, lien, correction, or DVS paperwork" },
  { id: "funding-proof", label: "Funding proof", owner: "Finance", signatureRequired: false, storage: "Deal jacket + Library", trigger: "Outside finance, one-pay, lender draft, wire, or certified funds" },
  { id: "insurance-binder", label: "Insurance binder", owner: "Finance", signatureRequired: false, storage: "Deal jacket + Library", trigger: "Credit, lease, BHPH, loaner, or delivery condition" },
  { id: "vehicle-condition-report", label: "Vehicle checkout and return condition report", owner: "Operations", signatureRequired: true, storage: "Deal jacket + Library", trigger: "Rental, loaner, test drive, delivery, or custody release" },
  { id: "wholesale-bill-of-sale", label: "Wholesale bill of sale", owner: "Sales", signatureRequired: true, storage: "Deal jacket + Library", trigger: "Wholesale release" }
];

const DEAL_PACKET_RULES: Record<DealWorkflowId, DealPacketRule> = {
  finance: {
    conditionalFormIds: ["power-of-attorney", "insurance-binder"],
    defaultFormIds: ["sales-agreement", "retail-installment-contract", "personal-references", "funding-proof"],
    jacketSections: ["Customer", "Vehicle", "Credit", "Funding", "Title", "Delivery"],
    managerTriggers: ["Delivery before funding", "Open stipulations", "Missing insurance", "Title not ready"],
    packetName: "Dealer finance packet"
  },
  bhph: {
    conditionalFormIds: ["insurance-binder"],
    defaultFormIds: ["sales-agreement", "retail-installment-contract", "personal-references", "power-of-attorney"],
    jacketSections: ["Buyer proof", "Vehicle", "Payment terms", "References", "Title", "Servicing handoff"],
    managerTriggers: ["Down payment exception", "Terms exception", "Missing references", "Title not ready"],
    packetName: "BHPH account packet"
  },
  "retail-sale": {
    conditionalFormIds: ["retail-installment-contract", "personal-references", "power-of-attorney", "funding-proof", "insurance-binder"],
    defaultFormIds: ["sales-agreement"],
    jacketSections: ["Customer", "Vehicle", "Price", "Fees", "Forms", "Delivery"],
    managerTriggers: ["Manual tax/payment override", "Title not ready", "Missing payment proof", "Delivery exception"],
    packetName: "Retail sale packet"
  },
  "lease-to-own": {
    conditionalFormIds: ["insurance-binder"],
    defaultFormIds: ["personal-references", "power-of-attorney", "vehicle-condition-report"],
    jacketSections: ["Lessee", "Vehicle", "Calculator", "Lease forms", "References", "Title"],
    managerTriggers: ["Lease value exception", "Missing insurance", "Title authority missing", "Delivery hold"],
    packetName: "Lease-to-own packet"
  },
  repairs: {
    conditionalFormIds: ["funding-proof"],
    defaultFormIds: [],
    jacketSections: ["Customer", "Vehicle", "Concern", "Estimate", "Authorization", "Handoff"],
    managerTriggers: ["Estimate authorization missing", "Payment exception", "Customer promise conflict"],
    packetName: "Repair authorization packet"
  },
  "test-drive": {
    conditionalFormIds: [],
    defaultFormIds: ["vehicle-condition-report"],
    jacketSections: ["Driver", "Vehicle", "Signed release", "Checkout photos", "Return photos"],
    managerTriggers: ["Missing license", "Missing insurance", "Extended route", "Vehicle not received"],
    packetName: "Test-drive release packet"
  },
  "daily-rental": {
    conditionalFormIds: ["insurance-binder"],
    defaultFormIds: ["vehicle-condition-report"],
    jacketSections: ["Renter", "Dates", "Payment hold", "Checkout photos", "Return photos", "Signed packet"],
    managerTriggers: ["Payment hold missing", "Insurance/protection gap", "Late return", "Damage exception"],
    packetName: "Daily rental packet"
  },
  "vehicle-loaner": {
    conditionalFormIds: ["insurance-binder"],
    defaultFormIds: ["vehicle-condition-report"],
    jacketSections: ["Customer", "Interested vehicle", "Courtesy waiver", "Checkout photos", "Return photos", "Signed packet"],
    managerTriggers: ["No interested vehicle", "Courtesy waiver missing", "Insurance/protection gap", "Damage exception"],
    packetName: "Courtesy loaner packet"
  },
  "warranty-products": {
    conditionalFormIds: ["funding-proof"],
    defaultFormIds: [],
    jacketSections: ["Customer", "Deal context", "Eligibility", "Menu", "Signed product form"],
    managerTriggers: ["Eligibility conflict", "Product disclosure missing", "Cancellation-risk review"],
    packetName: "Warranty product packet"
  },
  "financing-products": {
    conditionalFormIds: ["personal-references", "funding-proof"],
    defaultFormIds: [],
    jacketSections: ["Customer", "Credit path", "Menu", "Lender", "Signed product form"],
    managerTriggers: ["Lender status missing", "Menu exception", "Unsigned disclosure"],
    packetName: "Finance product packet"
  },
  wholesale: {
    conditionalFormIds: ["power-of-attorney"],
    defaultFormIds: ["wholesale-bill-of-sale", "funding-proof"],
    jacketSections: ["Buyer", "Vehicle", "Funding", "Title", "Release", "Transport"],
    managerTriggers: ["Below reserve", "Release before funds", "Title exception", "Transport exception"],
    packetName: "Wholesale release packet"
  },
  "outside-finance-one-pay": {
    conditionalFormIds: ["personal-references", "power-of-attorney", "insurance-binder"],
    defaultFormIds: ["sales-agreement", "funding-proof"],
    jacketSections: ["Customer", "Vehicle", "Outside lender / one-pay", "Stipulations", "Title", "Delivery"],
    managerTriggers: ["Delivery before funding", "Open stipulations", "Lienholder mismatch", "Title authority needed"],
    packetName: "Outside finance / one-pay packet"
  }
};

const FIELD_LABELS = {
  customer: "Customer / buyer",
  vehicle: "Vehicle / stock #",
  amount: "Amount / estimate / reserve",
  owner: "Owner",
  note: "Start note"
};

const MN_DMV_FEE_ITEMS = [
  { amountCents: 825, code: "title-transfer", label: "Title transfer" },
  { amountCents: 1200, code: "filing-fee", label: "Filing fee" },
  { amountCents: 200, code: "lien-notation", label: "Lien notation" },
  { amountCents: 850, code: "plate-transfer", label: "Plate transfer" },
  { amountCents: 225, code: "technology-surcharge", label: "DVS technology surcharge" },
  { amountCents: 0, code: "registration-tabs", label: "Registration / tabs estimate" },
  { amountCents: 0, code: "wheelage-tax", label: "Wheelage tax by county" },
  { amountCents: 0, code: "motor-vehicle-sales-tax", label: "Motor vehicle sales tax" },
  { amountCents: 0, code: "custom-dvs-fee", label: "Custom MN DMV / DVS fee" }
];

const MN_VEHICLE_SALES_TAX_BASIS_POINTS = 685;

type RetailFeeLine = {
  amountCents: number;
  id: string;
  label: string;
};

type GeneratedContractPacket = {
  auditTrail: Array<{ action: string; actorUserId: string; at: string; detail: string }>;
  delivery: {
    downloadReady: boolean;
    emailReady: boolean;
    eSignatureReady: boolean;
    printReady: boolean;
    providerHoldReason: string;
    textReady: boolean;
  };
  documents: Array<{
    contentBase64?: string;
    contentType?: "text/html" | "application/pdf";
    downloadFileName: string;
    fieldValues?: Record<string, string>;
    formId: string;
    html: string;
    label: string;
    templatePath?: string;
  }>;
  generatedAt: string;
  packetId: string;
  packetNumber: string;
  status: "ARCHIVED";
};

type VehicleDecodeResult = {
  bodyType: string;
  make: string;
  stockNumber: string;
  valid: boolean;
  year: string;
};

const VIN_YEAR_CODES: Record<string, number> = {
  A: 2010,
  B: 2011,
  C: 2012,
  D: 2013,
  E: 2014,
  F: 2015,
  G: 2016,
  H: 2017,
  J: 2018,
  K: 2019,
  L: 2020,
  M: 2021,
  N: 2022,
  P: 2023,
  R: 2024,
  S: 2025,
  T: 2026,
  V: 2027,
  W: 2028,
  X: 2029,
  Y: 2030
};

const VIN_MAKE_PREFIXES: Record<string, string> = {
  "1C": "Chrysler",
  "1F": "Ford",
  "1G": "General Motors",
  "1H": "Honda",
  "1N": "Nissan",
  "2C": "Chrysler",
  "2F": "Ford",
  "2G": "General Motors",
  "2H": "Honda",
  "2T": "Toyota",
  "3C": "Chrysler",
  "3F": "Ford",
  "3G": "General Motors",
  "3H": "Honda",
  "3N": "Nissan",
  "4T": "Toyota",
  "5N": "Hyundai",
  "5Y": "Tesla",
  JH: "Honda",
  JT: "Toyota",
  KM: "Hyundai",
  KN: "Kia",
  WB: "BMW",
  WD: "Mercedes-Benz",
  WV: "Volkswagen"
};

function dollarsToCents(value: string) {
  const normalized = value.trim().replace(/[$,]/g, "");
  if (!normalized) return null;
  if (!/^\d+(\.\d{1,2})?$/.test(normalized)) return NaN;
  return Math.round(Number(normalized) * 100);
}

function formatCurrency(cents: number) {
  return new Intl.NumberFormat("en-US", { currency: "USD", style: "currency" }).format(cents / 100);
}

function parsePercent(value: string) {
  const normalized = value.trim().replace("%", "");
  if (!normalized) return 0;
  const parsed = Number(normalized);
  return Number.isFinite(parsed) ? parsed : 0;
}

function calculateMonthlyPayment(principalCents: number, termMonths: number, aprPercent: number) {
  if (principalCents <= 0 || termMonths <= 0) return 0;
  const principal = principalCents / 100;
  const monthlyRate = aprPercent / 100 / 12;
  if (monthlyRate <= 0) return Math.round((principal / termMonths) * 100);
  const payment = principal * monthlyRate / (1 - (1 + monthlyRate) ** -termMonths);
  return Math.round(payment * 100);
}

function documentDataUrl(document: GeneratedContractPacket["documents"][number]) {
  if (!document.contentBase64 || document.contentType !== "application/pdf") return "";
  return `data:application/pdf;base64,${document.contentBase64}`;
}

function normalizeVin(value: string) {
  return value.toUpperCase().replace(/[^A-HJ-NPR-Z0-9]/g, "").slice(0, 17);
}

function getStockNumberFromVin(vin: string) {
  return vin.length >= 6 ? vin.slice(-6) : "";
}

function getVinFromVehicleInput(value: string) {
  const normalized = normalizeVin(value);
  return normalized.length === 17 ? normalized : "";
}

function todayInputValue() {
  return new Date().toISOString().slice(0, 10);
}

function tomorrowInputValue() {
  const date = new Date();
  date.setDate(date.getDate() + 1);
  return date.toISOString().slice(0, 10);
}

function daysBetween(startDate: string, endDate: string) {
  const start = Date.parse(`${startDate}T00:00:00`);
  const end = Date.parse(`${endDate}T00:00:00`);
  if (!Number.isFinite(start) || !Number.isFinite(end) || end <= start) return 1;
  return Math.max(1, Math.ceil((end - start) / 86_400_000));
}

function decodeVin(vin: string): VehicleDecodeResult {
  const normalizedVin = normalizeVin(vin);
  const makePrefix = normalizedVin.slice(0, 2);
  const yearCode = normalizedVin.charAt(9);
  return {
    bodyType: "Auto",
    make: VIN_MAKE_PREFIXES[makePrefix] ?? "",
    stockNumber: getStockNumberFromVin(normalizedVin),
    valid: normalizedVin.length === 17,
    year: yearCode ? String(VIN_YEAR_CODES[yearCode] ?? "") : ""
  };
}

function tomorrowIso() {
  const date = new Date();
  date.setDate(date.getDate() + 1);
  date.setHours(10, 0, 0, 0);
  return date.toISOString();
}

function ExecutionSummary({
  completedCount,
  ready,
  statusKind,
  workflow,
  onStart
}: {
  completedCount: number;
  ready: boolean;
  statusKind: "idle" | "saving" | "success" | "error";
  workflow: DealWorkflow;
  onStart: () => void;
}) {
  return (
    <>
      <div>
        <h2>Execute next</h2>
        <p>{workflow.intent}</p>
      </div>
      <dl>
        <div><dt>{workflow.id === "vehicle-loaner" || workflow.id === "test-drive" ? "Workflow" : "Revenue channel"}</dt><dd>{workflow.label}</dd></div>
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
      <button disabled={!ready || statusKind === "saving"} onClick={onStart} type="button">{statusKind === "saving" ? "Opening..." : ready ? "Open execution path" : "Complete required facts"}</button>
    </>
  );
}

function formTemplateLabel(formId: string) {
  return ENTERPRISE_FORM_TEMPLATES.find((form) => form.id === formId)?.label ?? formId;
}

function StorageDestination({ children }: { children: ReactNode }) {
  return <em className={styles.evidenceStorageDestination}>Stores in {children}</em>;
}

function CompletionGateList({ missing }: { missing: string[] }) {
  if (missing.length === 0) {
    return <small className={styles.completionGateList}>All completion gates are clear.</small>;
  }
  return (
    <small className={styles.completionGateList}>
      Missing: {missing.join(", ")}
    </small>
  );
}

function CustomerIdentityDetails({
  includeCreditFields = false,
  includePhoneEmail = true
}: {
  includeCreditFields?: boolean;
  includePhoneEmail?: boolean;
}) {
  return (
    <>
      <label><span>Date of birth</span><input placeholder="MM/DD/YYYY" /></label>
      {includeCreditFields ? <label><span>SSN / ITIN</span><input /></label> : null}
      <label><span>ID type</span><select><option>Driver license</option><option>State ID</option><option>Passport</option><option>Military ID</option></select></label>
      <label><span>ID state</span><select><option>MN</option><option>WI</option><option>IA</option><option>ND</option><option>SD</option><option>Other</option></select></label>
      <label><span>ID number</span><input /></label>
      <label className={styles.retailWide}><span>Street address</span><input /></label>
      <label><span>City</span><input /></label>
      <label><span>State</span><select><option>MN</option><option>WI</option><option>IA</option><option>ND</option><option>SD</option><option>Other</option></select></label>
      <label><span>Zip</span><input /></label>
      {includePhoneEmail ? <label><span>Cell phone</span><input /></label> : null}
      {includePhoneEmail ? <label><span>Email</span><input /></label> : null}
    </>
  );
}

function VehicleIdentityDetails({
  onVehicleChange,
  vehicle
}: {
  onVehicleChange: (value: string) => void;
  vehicle: string;
}) {
  return (
    <>
      <label><span>Vehicle / stock #</span><input value={vehicle} onChange={(event) => onVehicleChange(event.target.value)} placeholder="Stock, VIN, plate, or vehicle" /></label>
      <label><span>VIN</span><input placeholder="17-character VIN" /></label>
      <label><span>Stock no.</span><input placeholder="Stock number" /></label>
      <label><span>Year</span><input /></label>
      <label><span>Make</span><input /></label>
      <label><span>Model</span><input /></label>
      <label><span>Trim</span><input /></label>
      <label><span>Color</span><input /></label>
      <label><span>Plate</span><input /></label>
      <label><span>Mileage</span><input /></label>
      <label><span>Odometer status</span><select><option>Actual miles</option><option>Not actual</option><option>Exceeds mechanical limits</option><option>Exempt</option></select></label>
      <label><span>Lot / key location</span><input placeholder="Front line, bay, row, key tag" /></label>
    </>
  );
}

function TradeInDetails() {
  return (
    <div className={styles.retailFieldGrid}>
      <label><span>Trade vehicle search</span><input placeholder="VIN, plate, or customer vehicle" /></label>
      <label><span>Trade VIN</span><input placeholder="17-character VIN" /></label>
      <label><span>Year</span><input /></label>
      <label><span>Make</span><input /></label>
      <label><span>Model</span><input /></label>
      <label><span>Trim</span><input /></label>
      <label><span>Mileage</span><input /></label>
      <label><span>Title status</span><select><option>Title in hand</option><option>Lien payoff needed</option><option>Duplicate title needed</option><option>Co-owner signature needed</option><option>Manager review</option></select></label>
      <label><span>Trade allowance</span><input placeholder="$0.00" /></label>
      <label><span>Trade ACV</span><input placeholder="$0.00" /></label>
      <label><span>Trade payoff</span><input placeholder="$0.00" /></label>
      <label><span>Lienholder</span><input /></label>
      <label><span>Payoff good through</span><input type="date" /></label>
      <label><span>Equity status</span><select><option>Positive equity</option><option>Negative equity</option><option>Payoff pending</option><option>No trade</option></select></label>
    </div>
  );
}

function EnterpriseDealControlPanel({
  amount,
  customerName,
  ownerName,
  ready,
  vehicle,
  workflow
}: {
  amount: string;
  customerName: string;
  ownerName: string;
  ready: boolean;
  vehicle: string;
  workflow: DealWorkflow;
}) {
  const rules = DEAL_PACKET_RULES[workflow.id];
  const activeTemplateIds = Array.from(new Set([...rules.defaultFormIds, ...rules.conditionalFormIds]));
  const activeTemplates = activeTemplateIds.map((id) => ENTERPRISE_FORM_TEMPLATES.find((form) => form.id === id)).filter((form): form is EnterpriseFormTemplate => Boolean(form));
  const readinessChecks = [
    { label: "Customer", ready: customerName !== "Customer not selected", value: customerName },
    { label: "Vehicle", ready: Boolean(vehicle.trim()), value: vehicle.trim() || "Not selected" },
    { label: "Value / amount", ready: Boolean(amount.trim()), value: amount.trim() || "Not captured" },
    { label: "Owner", ready: Boolean(ownerName.trim()), value: ownerName },
    { label: "Packet rules", ready: rules.defaultFormIds.length + rules.conditionalFormIds.length > 0, value: rules.packetName },
    { label: "Manager triggers", ready: rules.managerTriggers.length > 0, value: `${rules.managerTriggers.length} trigger(s) monitored` }
  ];
  const readyCount = readinessChecks.filter((item) => item.ready).length;
  const readinessScore = Math.round((readyCount / readinessChecks.length) * 100);

  return (
    <section className={styles.enterpriseDealPanel} aria-label="Enterprise desking controls">
      <header>
        <div>
          <span className={styles.eyebrow}>Enterprise deal controls</span>
          <h2>{rules.packetName}</h2>
          <p>Rules, readiness, deal jacket, approvals, customer preview, and form governance stay attached to the selected workflow.</p>
        </div>
        <strong>{readinessScore}% ready</strong>
      </header>

      <div className={styles.enterpriseDealGrid}>
        <article>
          <span>Deal packet rules engine</span>
          <strong>{workflow.label}</strong>
          <p>{rules.defaultFormIds.length} default form(s), {rules.conditionalFormIds.length} conditional form(s)</p>
          <div>{[...rules.defaultFormIds, ...rules.conditionalFormIds].map((formId) => <em key={formId}>{formTemplateLabel(formId)}</em>)}</div>
        </article>
        <article>
          <span>Packet readiness score</span>
          <strong>{ready ? "Ready to open" : `${readyCount}/${readinessChecks.length} checks`}</strong>
          <p>{ready ? "The required starting facts are ready for the execution path." : "Resolve blockers before delivery, funding, or release."}</p>
          <div>{readinessChecks.map((item) => <em key={item.label}>{item.ready ? "Clear" : "Needs"}: {item.label}</em>)}</div>
        </article>
        <article>
          <span>Unified deal jacket</span>
          <strong>One working home</strong>
          <p>Documents are recorded once in the deal jacket and mirrored to the document library for search, audit, and customer history.</p>
          <div>{rules.jacketSections.map((section) => <em key={section}>{section}</em>)}</div>
        </article>
        <article>
          <span>Conditional manager approval</span>
          <strong>{rules.managerTriggers.length} trigger(s)</strong>
          <p>Only exception paths go to a manager, so clean deals keep moving.</p>
          <div>{rules.managerTriggers.map((trigger) => <em key={trigger}>{trigger}</em>)}</div>
        </article>
        <article>
          <span>Customer-facing packet preview</span>
          <strong>Before signing</strong>
          <p>Staff can explain which documents the customer will sign, why each is included, and whether a form is required or conditional.</p>
          <div>{activeTemplates.slice(0, 5).map((form) => <em key={form.id}>{form.signatureRequired ? "Signature" : "Proof"}: {form.label}</em>)}</div>
        </article>
        <article>
          <span>Form template governance</span>
          <strong>Versioned records</strong>
          <p>Each form carries owner, trigger, signature need, and storage destination so templates can be reviewed like enterprise assets.</p>
          <div>{activeTemplates.slice(0, 5).map((form) => <em key={form.id}>{form.owner} · {form.storage}</em>)}</div>
        </article>
      </div>
    </section>
  );
}

function RetailSaleExecutionDesk({
  amount,
  customerName,
  onAmountChange,
  onVehicleChange,
  vehicle
}: {
  amount: string;
  customerName: string;
  onAmountChange: (value: string) => void;
  onVehicleChange: (value: string) => void;
  vehicle: string;
}) {
  const [selectedFeeCode, setSelectedFeeCode] = useState(MN_DMV_FEE_ITEMS[0]?.code ?? "");
  const selectedFee = MN_DMV_FEE_ITEMS.find((item) => item.code === selectedFeeCode) ?? MN_DMV_FEE_ITEMS[0];
  const [feeAmount, setFeeAmount] = useState(selectedFee ? formatCurrency(selectedFee.amountCents) : "$0.00");
  const [feeLines, setFeeLines] = useState<RetailFeeLine[]>([]);
  const [manualSalesTax, setManualSalesTax] = useState(false);
  const [manualSalesTaxAmount, setManualSalesTaxAmount] = useState("");
  const [downPayment, setDownPayment] = useState("$0.00");
  const [termMonths, setTermMonths] = useState("36");
  const [interestRate, setInterestRate] = useState("0.00%");
  const [paymentFunding, setPaymentFunding] = useState("To be confirmed");
  const [manualMonthlyPayment, setManualMonthlyPayment] = useState(false);
  const [manualMonthlyPaymentAmount, setManualMonthlyPaymentAmount] = useState("");
  const [preparedForms, setPreparedForms] = useState<string[]>([]);
  const [contractPacket, setContractPacket] = useState<GeneratedContractPacket | null>(null);
  const [packetStatus, setPacketStatus] = useState<{ kind: "idle" | "generating" | "ready" | "error"; message: string }>({ kind: "idle", message: "" });
  const [packetDrawerOpen, setPacketDrawerOpen] = useState(false);
  const [packetPreviewOpen, setPacketPreviewOpen] = useState(false);
  const [previewFormId, setPreviewFormId] = useState<string | null>(null);
  const feeTotalCents = useMemo(() => feeLines.reduce((total, line) => total + line.amountCents, 0), [feeLines]);
  const saleAmountCents = useMemo(() => dollarsToCents(amount), [amount]);
  const mnSalesTaxCents = typeof saleAmountCents === "number" && Number.isFinite(saleAmountCents)
    ? Math.round((saleAmountCents * MN_VEHICLE_SALES_TAX_BASIS_POINTS) / 10000)
    : 0;
  const displayedSalesTax = manualSalesTax ? manualSalesTaxAmount : formatCurrency(mnSalesTaxCents);
  const manualSalesTaxCents = dollarsToCents(manualSalesTaxAmount);
  const effectiveSalesTaxCents = manualSalesTax && typeof manualSalesTaxCents === "number" && Number.isFinite(manualSalesTaxCents) ? manualSalesTaxCents : mnSalesTaxCents;
  const downPaymentCents = dollarsToCents(downPayment);
  const safeDownPaymentCents = typeof downPaymentCents === "number" && Number.isFinite(downPaymentCents) ? downPaymentCents : 0;
  const amountFinancedCents = Math.max(0, (typeof saleAmountCents === "number" && Number.isFinite(saleAmountCents) ? saleAmountCents : 0) + feeTotalCents + effectiveSalesTaxCents - safeDownPaymentCents);
  const parsedTermMonths = Number.parseInt(termMonths, 10);
  const safeTermMonths = Number.isFinite(parsedTermMonths) ? parsedTermMonths : 0;
  const calculatedMonthlyPaymentCents = calculateMonthlyPayment(amountFinancedCents, safeTermMonths, parsePercent(interestRate));
  const displayedMonthlyPayment = manualMonthlyPayment ? manualMonthlyPaymentAmount : formatCurrency(calculatedMonthlyPaymentCents);
  const feeFormula = feeLines.length > 0 ? `${feeLines.map((line) => formatCurrency(line.amountCents)).join(" + ")} = ${formatCurrency(feeTotalCents)}` : "$0.00 = $0.00";
  const creditPaymentFunding = ["Dealer financing", "Outside finance", "BHPH / in-house financing"].includes(paymentFunding);
  const packetPreparedFormIds = creditPaymentFunding ? Array.from(new Set([...preparedForms, "personal-references"])) : preparedForms;
  const requiredFormCount = MN_SALE_FORM_PACKET.filter((form) => form.category === "Required").length;
  const preparedRequiredCount = MN_SALE_FORM_PACKET.filter((form) => form.category === "Required" && preparedForms.includes(form.id)).length;
  const [vehicleFacts, setVehicleFacts] = useState({
    bodyType: "Auto",
    color: "",
    driveTrain: "",
    engine: "",
    make: "",
    model: "",
    stockNumber: "",
    transmission: "",
    trim: "",
    vin: "",
    year: ""
  });
  const [decodeStatus, setDecodeStatus] = useState("Enter a 17-character VIN to decode vehicle facts.");

  function selectFee(code: string) {
    const nextFee = MN_DMV_FEE_ITEMS.find((item) => item.code === code) ?? MN_DMV_FEE_ITEMS[0];
    setSelectedFeeCode(code);
    setFeeAmount(formatCurrency(nextFee.amountCents));
  }

  function addFeeLine() {
    if (!selectedFee) return;
    const parsedAmount = dollarsToCents(feeAmount);
    if (parsedAmount === null || Number.isNaN(parsedAmount)) return;
    setFeeLines((current) => [
      ...current,
      {
        amountCents: parsedAmount,
        id: `${selectedFee.code}-${crypto.randomUUID()}`,
        label: selectedFee.label
      }
    ]);
  }

  function removeFeeLine(id: string) {
    setFeeLines((current) => current.filter((line) => line.id !== id));
  }

  function togglePreparedForm(id: string) {
    setPreparedForms((current) => current.includes(id) ? current.filter((item) => item !== id) : [...current, id]);
  }

  function prepareRequiredForms() {
    setPreparedForms((current) => Array.from(new Set([...current, ...MN_SALE_FORM_PACKET.filter((form) => form.category === "Required").map((form) => form.id)])));
  }

  async function generateContractPacket() {
    setPacketStatus({ kind: "generating", message: "Generating and archiving contract packet..." });
    const response = await fetch("/api/crm/v1/contract-packets", {
      body: JSON.stringify({
        customerName,
        dealNumber: vehicleFacts.stockNumber || vehicle || undefined,
        dealType: "Retail Sale",
        feeTotal: formatCurrency(feeTotalCents),
        idempotencyKey: crypto.randomUUID(),
        paymentFunding,
        preparedFormIds: packetPreparedFormIds,
        salePrice: amount || "$0.00",
        vehicle: vehicleFacts
      }),
      headers: { "content-type": "application/json" },
      method: "POST"
    });
    const payload = await response.json().catch(() => ({}));
    if (!response.ok) {
      setPacketStatus({ kind: "error", message: typeof payload.error === "string" ? payload.error : "Contract packet could not be generated." });
      return;
    }
    const generatedPacket = payload as GeneratedContractPacket;
    setContractPacket(generatedPacket);
    setPreviewFormId(generatedPacket.documents[0]?.formId ?? null);
    setPacketStatus({ kind: "ready", message: `Archived packet ${generatedPacket.packetNumber}.` });
  }

  const previewDocument = contractPacket?.documents.find((document) => document.formId === previewFormId) ?? contractPacket?.documents[0] ?? null;

  function packetHtml() {
    if (!contractPacket) return "";
    return `<!doctype html><html><head><meta charset="utf-8"><title>${contractPacket.packetNumber}</title></head><body>${contractPacket.documents.map((document) => document.html).join("<hr />")}</body></html>`;
  }

  function downloadPacket() {
    if (!contractPacket) return;
    const selectedDocument = previewDocument ?? contractPacket.documents[0];
    if (selectedDocument?.contentBase64 && selectedDocument.contentType === "application/pdf") {
      const url = documentDataUrl(selectedDocument);
      const link = document.createElement("a");
      link.href = url;
      link.download = selectedDocument.downloadFileName;
      link.click();
      return;
    }
    const url = URL.createObjectURL(new Blob([packetHtml()], { type: "text/html" }));
    const link = document.createElement("a");
    link.href = url;
    link.download = `${contractPacket.packetNumber}.html`;
    link.click();
    URL.revokeObjectURL(url);
  }

  function printPacket() {
    if (!contractPacket) return;
    const selectedDocument = previewDocument ?? contractPacket.documents[0];
    if (selectedDocument?.contentBase64 && selectedDocument.contentType === "application/pdf") {
      window.open(documentDataUrl(selectedDocument), "_blank", "noopener,noreferrer");
      return;
    }
    const printWindow = window.open("", "_blank", "noopener,noreferrer");
    if (!printWindow) {
      setPacketStatus({ kind: "error", message: "Print window was blocked. Download the packet instead." });
      return;
    }
    printWindow.document.write(packetHtml());
    printWindow.document.close();
    printWindow.focus();
    printWindow.print();
  }

  function queuePacketDelivery(channel: "email" | "text") {
    if (!contractPacket) return;
    setPacketStatus({ kind: "ready", message: `${channel === "email" ? "Email" : "Text"} delivery link queued for ${contractPacket.packetNumber}; signed provider delivery remains governed by CRM communications controls.` });
  }

  function openPacketPreview() {
    if (!contractPacket) return;
    setPreviewFormId((current) => current ?? contractPacket.documents[0]?.formId ?? null);
    setPacketPreviewOpen(true);
  }

  function updateVin(value: string) {
    const vin = normalizeVin(value);
    const stockNumber = getStockNumberFromVin(vin);
    setVehicleFacts((current) => ({ ...current, stockNumber, vin }));
    onVehicleChange(stockNumber || vin || vehicle);
  }

  function updateVehicleSearch(value: string) {
    onVehicleChange(value);
    const vin = getVinFromVehicleInput(value);
    if (!vin) return;
    setVehicleFacts((current) => ({ ...current, stockNumber: getStockNumberFromVin(vin), vin }));
  }

  function updateVehicleFact(key: keyof typeof vehicleFacts, value: string) {
    setVehicleFacts((current) => ({ ...current, [key]: value }));
  }

  function runVinDecode() {
    const vin = vehicleFacts.vin || getVinFromVehicleInput(vehicle);
    const decoded = decodeVin(vin);
    setVehicleFacts((current) => ({
      ...current,
      bodyType: decoded.bodyType || current.bodyType,
      make: decoded.make || current.make,
      stockNumber: decoded.stockNumber,
      vin: vin || current.vin,
      year: decoded.year || current.year
    }));
    setDecodeStatus(decoded.valid ? "VIN decoded. Confirm make, model, trim, and book values before delivery." : "Enter a full 17-character VIN in Search inventory or VIN before decoding.");
    if (decoded.stockNumber) onVehicleChange(decoded.stockNumber);
  }

  return (
    <div className={styles.retailExecutionDesk}>
      <section className={styles.retailSection} id="retail-applicant">
        <header>
          <span>Applicant info</span>
          <strong>Find or capture the buyer</strong>
        </header>
        <div className={styles.retailActionRow}>
          <button type="button">Add co-buyer</button>
          <button type="button">Print credit application</button>
          <button type="button">Text credit application</button>
          <button type="button">Email credit application</button>
        </div>
        <p className={styles.retailDeliveryNote}>Text and email delivery use the approved CRM communications provider and stay attached to the customer record.</p>
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

      <section className={styles.retailSection} id="retail-contact">
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

      <section className={styles.retailSection} id="retail-vehicle">
        <header>
          <span>Vehicle info</span>
          <strong>Confirm the unit and book values</strong>
        </header>
        <div className={styles.retailFieldGrid}>
          <label><span>Search inventory</span><input value={vehicle} onChange={(event) => updateVehicleSearch(event.target.value)} placeholder="Stock, VIN, or vehicle" /></label>
          <label><span>Vehicle type</span><select value={vehicleFacts.bodyType} onChange={(event) => updateVehicleFact("bodyType", event.target.value)}><option>Auto</option><option>Truck</option><option>SUV</option><option>Van</option></select></label>
          <label><span>New / used</span><select><option>Used</option><option>New</option></select></label>
          <label><span>VIN</span><input value={vehicleFacts.vin} onChange={(event) => updateVin(event.target.value)} placeholder="17-character VIN" /></label>
          <label><span>Stock no.</span><input readOnly value={vehicleFacts.stockNumber} placeholder="Last 6 of VIN" /></label>
          <label><span>Year</span><input value={vehicleFacts.year} onChange={(event) => updateVehicleFact("year", event.target.value)} /></label>
          <div className={styles.retailDecodeRow}>
            <button type="button" onClick={runVinDecode}>Decode VIN</button>
            <span>{decodeStatus}</span>
          </div>
          <label><span>Make</span><input value={vehicleFacts.make} onChange={(event) => updateVehicleFact("make", event.target.value)} /></label>
          <label><span>Model</span><input value={vehicleFacts.model} onChange={(event) => updateVehicleFact("model", event.target.value)} /></label>
          <label><span>Trim</span><input value={vehicleFacts.trim} onChange={(event) => updateVehicleFact("trim", event.target.value)} /></label>
          <label><span>Color</span><input value={vehicleFacts.color} onChange={(event) => updateVehicleFact("color", event.target.value)} placeholder="Exterior color" /></label>
          <label><span>Engine</span><input value={vehicleFacts.engine} onChange={(event) => updateVehicleFact("engine", event.target.value)} /></label>
          <label><span>Transmission</span><input value={vehicleFacts.transmission} onChange={(event) => updateVehicleFact("transmission", event.target.value)} /></label>
          <label><span>Drive train</span><input value={vehicleFacts.driveTrain} onChange={(event) => updateVehicleFact("driveTrain", event.target.value)} /></label>
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

      <section className={styles.retailSection} id="retail-trade">
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

      <section className={styles.retailSection} id="retail-deal">
        <header>
          <span>Deal info</span>
          <strong>Build the first working numbers</strong>
        </header>
        <div className={styles.retailFieldGrid}>
          <label><span>Price</span><input value={amount} onChange={(event) => onAmountChange(event.target.value)} placeholder="$0.00" /></label>
          <label><span>Fees</span><input readOnly value={formatCurrency(feeTotalCents)} /></label>
          <label><span>Insurance / GAP / VSI</span><input placeholder="$0.00" /></label>
          <label><span>Accessories</span><input placeholder="$0.00" /></label>
          <label><span>VSC / products</span><input placeholder="$0.00" /></label>
          <label>
            <span>Total tax</span>
            <input
              onChange={(event) => setManualSalesTaxAmount(event.target.value)}
              readOnly={!manualSalesTax}
              value={displayedSalesTax}
            />
            <small>{manualSalesTax ? "Manual tax override enabled. Confirm against the final DVS calculation." : "MN sales tax: 6.85% of selling price"}</small>
            <button type="button" onClick={() => setManualSalesTax((current) => !current)}>{manualSalesTax ? "Use 6.85% auto tax" : "Manual tax override"}</button>
          </label>
          <label><span>Down payment</span><input value={downPayment} onChange={(event) => setDownPayment(event.target.value)} placeholder="$0.00" /></label>
          <label><span>Trade in</span><input placeholder="$0.00" /></label>
          <label><span>Amount financed</span><input readOnly value={formatCurrency(amountFinancedCents)} /><small>Price + fees + tax - down payment</small></label>
          <label><span>Term</span><select value={termMonths} onChange={(event) => setTermMonths(event.target.value)}><option value="12">12 months</option><option value="24">24 months</option><option value="36">36 months</option><option value="48">48 months</option><option value="60">60 months</option><option value="72">72 months</option><option value="84">84 months</option></select></label>
          <label><span>Interest rate</span><input value={interestRate} onChange={(event) => setInterestRate(event.target.value)} placeholder="0.000%" /></label>
          <label>
            <span>Monthly payment</span>
            <input
              onChange={(event) => setManualMonthlyPaymentAmount(event.target.value)}
              readOnly={!manualMonthlyPayment}
              value={displayedMonthlyPayment}
            />
            <small>{manualMonthlyPayment ? "Manual payment override enabled. Confirm against lender approval." : "Calculated from amount financed, term, and APR"}</small>
            <button type="button" onClick={() => setManualMonthlyPayment((current) => !current)}>{manualMonthlyPayment ? "Use calculated payment" : "Manual payment override"}</button>
          </label>
          <label><span>First payment</span><input placeholder="30 days" /></label>
          <label><span>Payment / funding</span><select value={paymentFunding} onChange={(event) => setPaymentFunding(event.target.value)}><option>Cash / certified funds</option><option>Dealer financing</option><option>Outside finance</option><option>BHPH / in-house financing</option><option>One pay</option><option>To be confirmed</option></select></label>
          <label><span>Delivery target</span><input placeholder="Today, tomorrow, or date" /></label>
        </div>
        <div className={styles.retailFeeTool} aria-label="MN DMV fee calculator">
          <header>
            <span>MN DMV fees</span>
            <strong>Fee worksheet</strong>
            <small>Formula: Total fees = sum of selected MN DMV fee items. Confirm against the current Minnesota DVS schedule before delivery.</small>
          </header>
          <div className={styles.retailFeeControls}>
            <label>
              <span>Fee item</span>
              <select value={selectedFeeCode} onChange={(event) => selectFee(event.target.value)}>
                {MN_DMV_FEE_ITEMS.map((item) => (
                  <option key={item.code} value={item.code}>{item.label}</option>
                ))}
              </select>
            </label>
            <label>
              <span>Amount</span>
              <input value={feeAmount} onChange={(event) => setFeeAmount(event.target.value)} placeholder="$0.00" />
            </label>
            <button type="button" onClick={addFeeLine}>Add fee</button>
          </div>
          <div className={styles.retailFeeRows}>
            {feeLines.length > 0 ? feeLines.map((line) => (
              <div key={line.id}>
                <span>{line.label}</span>
                <strong>{formatCurrency(line.amountCents)}</strong>
                <button type="button" onClick={() => removeFeeLine(line.id)}>Remove</button>
              </div>
            )) : <p>No MN DMV / DVS fees added yet.</p>}
          </div>
          <div className={styles.retailFeeFormula}>
            <span>Total fees</span>
            <strong>{formatCurrency(feeTotalCents)}</strong>
            <small>{feeFormula}</small>
          </div>
        </div>
      </section>

      <section className={styles.retailSection} id="retail-contracts">
        <header>
          <span>Contracted forms</span>
          <strong>Minnesota sale packet</strong>
        </header>
        <div className={styles.retailPacketLauncher}>
          <div>
            <span>Packet readiness</span>
            <strong>{contractPacket ? `${contractPacket.packetNumber} archived` : `${preparedRequiredCount}/${requiredFormCount} required forms ready`}</strong>
            <small>Open the drawer to prepare forms, generate the packet, preview documents, and send or print.</small>
          </div>
          <button type="button" onClick={() => setPacketDrawerOpen(true)}>Open MN sale packet</button>
        </div>

        {packetDrawerOpen ? (
          <div className={styles.retailPacketDrawerBackdrop} role="presentation">
            <aside className={styles.retailPacketDrawer} aria-label="MN sale packet drawer">
              <header>
                <div>
                  <span>MN sale packet</span>
                  <strong>Prepare, generate, and review selling documents</strong>
                  <small>Required and conditional Minnesota sale forms stay out of the main workspace until staff needs them.</small>
                </div>
                <button type="button" onClick={() => setPacketDrawerOpen(false)}>Close</button>
              </header>

              <div className={styles.retailFormsCommand}>
                <div>
                  <span>Required forms ready</span>
                  <strong>{preparedRequiredCount}/{requiredFormCount}</strong>
                  <small>{creditPaymentFunding ? "Credit payment selected; personal references PDF will be included automatically." : "Prepare the baseline packet first, then add conditional forms based on finance, trade, products, and delivery."}</small>
                </div>
                <button type="button" onClick={prepareRequiredForms}>Prepare required forms</button>
                <button disabled={packetStatus.kind === "generating"} type="button" onClick={() => void generateContractPacket()}>
                  {packetStatus.kind === "generating" ? "Generating..." : "Generate contract packet"}
                </button>
                <button disabled={!contractPacket} type="button" onClick={openPacketPreview}>Preview generated packet</button>
              </div>
              {packetStatus.kind !== "idle" ? <p className={packetStatus.kind === "error" ? styles.retailPacketError : styles.retailPacketStatus}>{packetStatus.message}</p> : null}
              {contractPacket ? (
                <div className={styles.retailPacketArchive} aria-label="Generated contract packet archive">
                  <div>
                    <span>Archived packet</span>
                    <strong>{contractPacket.packetNumber}</strong>
                    <small>{contractPacket.documents.length} document(s) generated · {new Date(contractPacket.generatedAt).toLocaleString()}</small>
                  </div>
                  <button type="button" onClick={openPacketPreview}>Preview packet</button>
                  <button disabled={!contractPacket.delivery.downloadReady} type="button" onClick={downloadPacket}>Download packet</button>
                  <button disabled={!contractPacket.delivery.printReady} type="button" onClick={printPacket}>Print packet</button>
                  <button disabled={!contractPacket.delivery.textReady} type="button" onClick={() => queuePacketDelivery("text")}>Text link</button>
                  <button disabled={!contractPacket.delivery.emailReady} type="button" onClick={() => queuePacketDelivery("email")}>Email link</button>
                  <small>{contractPacket.delivery.providerHoldReason}</small>
                </div>
              ) : null}
              <div className={styles.retailFormsGrid}>
                {MN_SALE_FORM_PACKET.map((form) => {
                  const prepared = preparedForms.includes(form.id);
                  return (
                    <label className={prepared ? styles.retailFormReady : undefined} key={form.id}>
                      <input checked={prepared} onChange={() => togglePreparedForm(form.id)} type="checkbox" />
                      <span>{form.category}</span>
                      <strong>{form.label}</strong>
                      <small>{form.description}</small>
                      <em>{form.trigger}</em>
                      <b>{form.basis}</b>
                    </label>
                  );
                })}
              </div>

              {packetPreviewOpen && contractPacket ? (
                <div className={styles.retailPacketPreviewBackdrop} role="presentation">
                  <aside className={styles.retailPacketPreviewDrawer} aria-label="Contract packet preview">
                    <header>
                      <div>
                        <span>Packet preview</span>
                        <strong>{contractPacket.packetNumber}</strong>
                        <small>Review generated forms before download, print, text, or email.</small>
                      </div>
                      <button type="button" onClick={() => setPacketPreviewOpen(false)}>Close</button>
                    </header>
                    <div className={styles.retailPacketPreviewBody}>
                      <nav aria-label="Generated forms">
                        {contractPacket.documents.map((document) => (
                          <button
                            className={document.formId === previewDocument?.formId ? styles.retailPacketPreviewActive : undefined}
                            key={document.formId}
                            onClick={() => setPreviewFormId(document.formId)}
                            type="button"
                          >
                            {document.label}
                          </button>
                        ))}
                      </nav>
                      <section>
                        <div>
                          <span>Reviewing</span>
                          <strong>{previewDocument?.label ?? "Generated form"}</strong>
                        </div>
                        <iframe srcDoc={previewDocument?.html ?? ""} title={previewDocument?.label ?? "Generated contract form preview"} />
                      </section>
                    </div>
                  </aside>
                </div>
              ) : null}
            </aside>
          </div>
        ) : null}
      </section>

    </div>
  );
}

function percentToBasisPoints(value: string) {
  const normalized = value.trim().replace("%", "");
  if (!normalized) return 0;
  const parsed = Number(normalized);
  return Number.isFinite(parsed) ? Math.round(parsed * 100) : 0;
}

type RentalEvidenceRequirement = {
  id: string;
  label: string;
  helper: string;
};

const RENTAL_RELEASE_PHOTO_REQUIREMENTS: RentalEvidenceRequirement[] = [
  { id: "front", label: "Front", helper: "Front bumper, hood, windshield, and plate." },
  { id: "rear", label: "Rear", helper: "Rear bumper, trunk/hatch, plate, and tail lamps." },
  { id: "driver-side", label: "Driver side", helper: "Full driver-side body line and wheels." },
  { id: "passenger-side", label: "Passenger side", helper: "Full passenger-side body line and wheels." },
  { id: "interior", label: "Interior", helper: "Seats, dash, center console, and visible cleanliness." },
  { id: "odometer-fuel", label: "Odometer + fuel", helper: "Mileage and fuel level before keys leave." },
  { id: "existing-damage", label: "Existing damage", helper: "Any dents, scratches, glass, wheel, tire, or trim issue." }
];

const RENTAL_RETURN_PHOTO_REQUIREMENTS: RentalEvidenceRequirement[] = [
  { id: "return-front", label: "Return front", helper: "Front condition when received back." },
  { id: "return-rear", label: "Return rear", helper: "Rear condition when received back." },
  { id: "return-sides", label: "Return sides", helper: "Both sides or a clear combined return view." },
  { id: "return-interior", label: "Return interior", helper: "Interior condition, belongings, and cleanliness." },
  { id: "return-odometer-fuel", label: "Return odometer + fuel", helper: "Mileage and fuel level at receiving." },
  { id: "return-damage", label: "Return damage review", helper: "New damage, no-damage proof, or exception photo." }
];

const RENTAL_SIGNED_DOCUMENT_REQUIREMENTS: RentalEvidenceRequirement[] = [
  { id: "signed-agreement", label: "Signed agreement", helper: "Final signed daily rental or vehicle loaner agreement." },
  { id: "license-insurance", label: "License / insurance proof", helper: "Driver license, insurance card, or approved protection proof." },
  { id: "condition-report", label: "Condition report", helper: "Signed condition report or staff-verified exception record." }
];

const TEST_DRIVE_RELEASE_REQUIREMENTS: RentalEvidenceRequirement[] = [
  { id: "td-front", label: "Front", helper: "Front condition before the test drive." },
  { id: "td-rear", label: "Rear", helper: "Rear condition before the test drive." },
  { id: "td-sides", label: "Sides", helper: "Driver and passenger side body condition." },
  { id: "td-interior", label: "Interior", helper: "Interior, dash, and cleanliness before departure." },
  { id: "td-odometer", label: "Odometer + fuel", helper: "Mileage and fuel level before the test drive." }
];

const TEST_DRIVE_RETURN_REQUIREMENTS: RentalEvidenceRequirement[] = [
  { id: "td-return-front", label: "Return front", helper: "Front condition when the vehicle returns." },
  { id: "td-return-rear", label: "Return rear", helper: "Rear condition when the vehicle returns." },
  { id: "td-return-interior", label: "Return interior", helper: "Interior condition when the vehicle returns." },
  { id: "td-return-odometer", label: "Return odometer + fuel", helper: "Mileage and fuel level at return." },
  { id: "td-return-damage", label: "Damage review", helper: "New damage, no-damage proof, or manager exception." }
];

const TEST_DRIVE_DOCUMENT_REQUIREMENTS: RentalEvidenceRequirement[] = [
  { id: "td-signed-release", label: "Signed test-drive form", helper: "Signed test-drive release and responsibility form." },
  { id: "td-driver-license", label: "Driver license", helper: "Valid license for every approved driver." },
  { id: "td-insurance-proof", label: "Insurance proof", helper: "Insurance card or manager-approved protection proof." }
];

const BHPH_PAPERWORK_REQUIREMENTS: RentalEvidenceRequirement[] = [
  { id: "retail-installment-contract", label: "Retail installment contract", helper: "Signed BHPH finance contract with final payment schedule." },
  { id: "buyers-order", label: "Buyer order", helper: "Final buyer order with sale price, fees, taxes, down payment, and balance." },
  { id: "personal-references", label: "Personal references", helper: "Signed personal references and verification form for the payment account." },
  { id: "odometer-disclosure", label: "Odometer disclosure", helper: "Signed odometer statement tied to the exact vehicle." },
  { id: "title-application", label: "Title application", helper: "Title and registration paperwork ready for processing." },
  { id: "power-of-attorney", label: "Power of attorney / title authority", helper: "Authority for title, registration, lien, correction, or DVS paperwork handled by the dealership." },
  { id: "gps-disclosure", label: "GPS / starter interrupt disclosure", helper: "Required only if the vehicle has GPS or payment assurance equipment." },
  { id: "payment-authorization", label: "Payment authorization", helper: "ACH/card/autopay or payment method authorization." },
  { id: "arbitration-addenda", label: "Arbitration / addenda", helper: "Signed arbitration, as-is/warranty, and dealership addenda when applicable." }
];

const BHPH_EVIDENCE_REQUIREMENTS: RentalEvidenceRequirement[] = [
  { id: "driver-license", label: "Driver license / ID", helper: "Government ID for buyer and co-buyer when applicable." },
  { id: "insurance-proof", label: "Insurance proof", helper: "Active insurance binder or approved proof before delivery." },
  { id: "income-proof", label: "Income proof", helper: "Paystub, bank statement, award letter, or approved income verification." },
  { id: "residence-proof", label: "Residence proof", helper: "Utility bill, lease, mail, or approved residence verification." },
  { id: "references", label: "References", helper: "Required references or skip-tracing contact sheet." },
  { id: "vehicle-condition", label: "Vehicle condition photos", helper: "Delivery condition photos tied to the sale record." }
];

const BHPH_HANDOFF_REQUIREMENTS = [
  "Account setup",
  "Payment schedule",
  "Insurance tracking",
  "GPS / servicing handoff",
  "Document archive"
] as const;

const DEALER_FINANCE_PACKET_REQUIREMENTS: RentalEvidenceRequirement[] = [
  { id: "credit-application", label: "Credit application", helper: "Signed credit application or verified lender application record." },
  { id: "lender-approval", label: "Lender approval", helper: "Approval, callback, or lender decision notice tied to the buyer and vehicle." },
  { id: "retail-installment-contract", label: "Retail installment contract", helper: "Final finance contract matching lender-approved terms." },
  { id: "buyers-order", label: "Buyer order", helper: "Final buyer order with price, taxes, fees, products, down payment, and amount financed." },
  { id: "personal-references", label: "Personal references", helper: "Signed personal references and verification form for the credit purchase." },
  { id: "power-of-attorney", label: "Power of attorney / title authority", helper: "Authority for title, lien, registration, correction, or DVS paperwork handled by the dealership." },
  { id: "product-disclosures", label: "Product disclosures", helper: "Signed VSC, GAP, GPS, VSI, warranty, or menu acceptance/decline disclosures when applicable." },
  { id: "insurance-binder", label: "Insurance binder", helper: "Insurance proof with lienholder/loss-payee when required by the lender." }
];

const DEALER_FINANCE_EVIDENCE_REQUIREMENTS: RentalEvidenceRequirement[] = [
  { id: "driver-license", label: "Driver license / ID", helper: "Government ID for buyer and co-buyer when applicable." },
  { id: "income-proof", label: "Income / employment proof", helper: "Paystub, bank statement, award letter, or lender-accepted proof." },
  { id: "residence-proof", label: "Residence proof", helper: "Utility bill, lease, mail, or approved residence verification." },
  { id: "stipulations", label: "Stipulations", helper: "All lender stipulations satisfied or manager-approved hold recorded." },
  { id: "down-payment-proof", label: "Down payment proof", helper: "Receipt, payment reference, or accounting handoff for cash due at signing." },
  { id: "delivery-condition", label: "Delivery condition", helper: "Vehicle delivery photos, odometer, fuel, keys, and accessories evidence." }
];

const DEALER_FINANCE_HANDOFF_REQUIREMENTS = [
  "Lender contract ready",
  "Stipulations cleared",
  "Down payment posted",
  "Lienholder recorded",
  "Funding follow-up scheduled",
  "Document archive"
] as const;

const WHOLESALE_PACKET_REQUIREMENTS: RentalEvidenceRequirement[] = [
  { id: "wholesale-bill-of-sale", label: "Wholesale bill of sale", helper: "Signed wholesale bill of sale with buyer, vehicle, amount, and date." },
  { id: "purchase-agreement", label: "Dealer purchase agreement", helper: "Wholesale buyer agreement or dealer-to-dealer sale terms." },
  { id: "odometer-statement", label: "Odometer statement", helper: "Signed mileage disclosure tied to the exact VIN." },
  { id: "title-transfer", label: "Title / reassignment", helper: "Title, reassignment, or title-processing packet ready for release." },
  { id: "power-of-attorney", label: "Power of attorney / title authority", helper: "Required when title correction, duplicate title, lien release, reassignment, or release authority is needed." },
  { id: "as-is-disclosure", label: "As-is / no warranty", helper: "Wholesale as-is and no warranty acknowledgement." },
  { id: "buyer-credentials", label: "Buyer credentials", helper: "Dealer license, resale certificate, or buyer authority proof." },
  { id: "payment-receipt", label: "Payment receipt", helper: "Wire, certified funds, floorplan, or approved payment proof." },
  { id: "release-authorization", label: "Release authorization", helper: "Manager-approved vehicle, title, key, and transport release." }
];

const WHOLESALE_EVIDENCE_REQUIREMENTS: RentalEvidenceRequirement[] = [
  { id: "buyer-id", label: "Buyer / dealer ID", helper: "Buyer identity or dealer license proof." },
  { id: "funding-proof", label: "Funding proof", helper: "Payment, floorplan, wire, or settlement evidence." },
  { id: "condition-photos", label: "Condition photos", helper: "Exterior, interior, odometer, and known damage photos." },
  { id: "title-proof", label: "Title proof", helper: "Title status, lien release, reassignment, or title exception evidence." },
  { id: "transport-proof", label: "Transport / pickup proof", helper: "Pickup appointment, driver, carrier, or gate release evidence." }
];

const WHOLESALE_HANDOFF_REQUIREMENTS = [
  "Funds verified",
  "Title packet ready",
  "Keys released",
  "Transport scheduled",
  "Document archive"
] as const;

const OUTSIDE_FINANCE_PACKET_REQUIREMENTS: RentalEvidenceRequirement[] = [
  { id: "buyers-order", label: "Buyer order", helper: "Final buyer order matching lender or one-pay funding." },
  { id: "funding-instructions", label: "Funding instructions", helper: "Lender funding sheet, wire instructions, or one-pay proof path." },
  { id: "retail-contract-copy", label: "Retail contract copy", helper: "Contract or buyer-facing agreement retained for the deal jacket." },
  { id: "personal-references", label: "Personal references", helper: "Signed personal references and verification form when the customer is buying on credit." },
  { id: "odometer-disclosure", label: "Odometer disclosure", helper: "Signed mileage disclosure tied to the exact VIN." },
  { id: "title-application", label: "Title application", helper: "Title, registration, lienholder, and release paperwork." },
  { id: "power-of-attorney", label: "Power of attorney / title authority", helper: "Authority for dealership title, registration, lienholder, correction, or DVS work when needed." },
  { id: "insurance-binder", label: "Insurance binder", helper: "Insurance binder with required lienholder/loss-payee when applicable." },
  { id: "payoff-or-lienholder", label: "Payoff / lienholder proof", helper: "Trade payoff, outside lienholder, or lien placement evidence when applicable." }
];

const OUTSIDE_FINANCE_EVIDENCE_REQUIREMENTS: RentalEvidenceRequirement[] = [
  { id: "lender-approval", label: "Lender approval", helper: "Approval, callback, or lender authorization evidence." },
  { id: "stipulations", label: "Stipulations", helper: "All lender stipulations or one-pay conditions satisfied." },
  { id: "funding-proof", label: "Funding proof", helper: "Wire, check, one-pay receipt, lender draft, or cashier's check proof." },
  { id: "identity-proof", label: "Identity proof", helper: "Driver license or customer identity proof." },
  { id: "delivery-condition", label: "Delivery condition", helper: "Vehicle delivery photos and mileage/fuel proof." }
];

const OUTSIDE_FINANCE_HANDOFF_REQUIREMENTS = [
  "Funding verified",
  "Lienholder recorded",
  "Title packet ready",
  "Insurance verified",
  "Document archive"
] as const;

function DailyRentalExecutionDesk({
  amount,
  customerName,
  mode = "daily-rental",
  onComplete,
  onAmountChange,
  onSaveDraft,
  onVehicleChange,
  statusKind,
  vehicle
}: {
  amount: string;
  customerName: string;
  mode?: "daily-rental" | "vehicle-loaner";
  onComplete: () => void;
  onAmountChange: (value: string) => void;
  onSaveDraft: () => void;
  onVehicleChange: (value: string) => void;
  statusKind: "idle" | "saving" | "success" | "error";
  vehicle: string;
}) {
  const isLoaner = mode === "vehicle-loaner";
  const workflowNoun = isLoaner ? "loaner" : "rental";
  const workflowTitle = isLoaner ? "Vehicle loaner" : "Daily rental";
  const workflowUnitLabel = isLoaner ? "Loaner unit" : "Rental unit";
  const feeStatusLabel = isLoaner ? "Deferred - waived if purchase completes" : "Due at checkout";
  const [preparedForms, setPreparedForms] = useState<string[]>([]);
  const [contractPacket, setContractPacket] = useState<GeneratedContractPacket | null>(null);
  const [packetStatus, setPacketStatus] = useState<{ kind: "idle" | "generating" | "ready" | "error"; message: string }>({ kind: "idle", message: "" });
  const [packetDrawerOpen, setPacketDrawerOpen] = useState(false);
  const [packetPreviewOpen, setPacketPreviewOpen] = useState(false);
  const [previewFormId, setPreviewFormId] = useState<string | null>(null);
  const [releasePhotos, setReleasePhotos] = useState<Record<string, string>>({});
  const [returnPhotos, setReturnPhotos] = useState<Record<string, string>>({});
  const [signedDocuments, setSignedDocuments] = useState<Record<string, string>>({});
  const [returnReceived, setReturnReceived] = useState(false);
  const [vehicleFacts, setVehicleFacts] = useState({
    color: "",
    licensePlate: "",
    make: "",
    mileageOut: "",
    model: "",
    parkingLocation: "",
    stockNumber: "",
    trim: "",
    vin: "",
    year: ""
  });
  const [decodeStatus, setDecodeStatus] = useState("Enter a 17-character VIN to decode the rental unit.");
  const [rentalFacts, setRentalFacts] = useState({
    additionalDriverName: "",
    additionalDriverStatus: "None",
    cardLast4: "",
    depositHold: "$300.00",
    dob: "",
    dropoffDate: tomorrowInputValue(),
    dropoffTime: "10:00",
    fuelOut: "Full",
    insuranceCarrier: "",
    insurancePolicy: "",
    interestedVehicle: "",
    licenseNumber: "",
    licenseState: "MN",
    licenseStatus: "Valid",
    mileagePlan: "Local use / daily mileage cap",
    paymentMethod: isLoaner ? "Courtesy loaner - deferred" : "Credit card",
    pickupDate: todayInputValue(),
    pickupTime: "10:00",
    protectionPlan: "Customer insurance on file",
    ratePerDay: "$49.00",
    returnFuel: "Return full",
    secondaryId: "Not needed",
    useRestriction: "Minnesota local use"
  });

  const rentalDays = daysBetween(rentalFacts.pickupDate, rentalFacts.dropoffDate);
  const dailyRateCents = dollarsToCents(rentalFacts.ratePerDay);
  const depositHoldCents = dollarsToCents(rentalFacts.depositHold);
  const estimatedRentalCents = (Number.isFinite(dailyRateCents) && dailyRateCents !== null ? dailyRateCents : 0) * rentalDays;
  const authorizationCents = estimatedRentalCents + (Number.isFinite(depositHoldCents) && depositHoldCents !== null ? depositHoldCents : 0);
  const rentalReadyFacts = [
    customerName !== "Customer not selected",
    vehicleFacts.stockNumber || vehicleFacts.vin || vehicle,
    rentalFacts.licenseNumber,
    isLoaner ? rentalFacts.interestedVehicle : rentalFacts.cardLast4,
    rentalFacts.insuranceCarrier || rentalFacts.protectionPlan !== "Customer insurance on file"
  ].filter(Boolean).length;
  const requiredRentalForms = requiredDailyRentalFormIds();
  const preparedRequiredCount = requiredRentalForms.filter((id) => preparedForms.includes(id)).length;
  const previewDocument = contractPacket?.documents.find((document) => document.formId === previewFormId) ?? contractPacket?.documents[0] ?? null;
  const releasePhotoCount = RENTAL_RELEASE_PHOTO_REQUIREMENTS.filter((item) => releasePhotos[item.id]).length;
  const returnPhotoCount = RENTAL_RETURN_PHOTO_REQUIREMENTS.filter((item) => returnPhotos[item.id]).length;
  const signedDocumentCount = RENTAL_SIGNED_DOCUMENT_REQUIREMENTS.filter((item) => signedDocuments[item.id]).length;
  const releasePhotosReady = releasePhotoCount === RENTAL_RELEASE_PHOTO_REQUIREMENTS.length;
  const returnPhotosReady = returnPhotoCount === RENTAL_RETURN_PHOTO_REQUIREMENTS.length;
  const signedDocumentsReady = signedDocumentCount === RENTAL_SIGNED_DOCUMENT_REQUIREMENTS.length;
  const releaseEvidenceReady = releasePhotosReady && signedDocumentsReady;
  const rentalCompletionGates = [
    { label: "Customer selected", ready: customerName !== "Customer not selected" },
    { label: `${workflowUnitLabel} assigned`, ready: Boolean(vehicleFacts.stockNumber || vehicleFacts.vin || vehicle) },
    { label: "Driver license captured", ready: Boolean(rentalFacts.licenseNumber) },
    { label: isLoaner ? "Interested vehicle recorded" : "Payment hold recorded", ready: Boolean(isLoaner ? rentalFacts.interestedVehicle : rentalFacts.cardLast4) },
    { label: "Protection or insurance recorded", ready: Boolean(rentalFacts.insuranceCarrier || rentalFacts.protectionPlan !== "Customer insurance on file") },
    { label: "Release photos captured", ready: releasePhotosReady },
    { label: "Signed documents recorded", ready: signedDocumentsReady },
    { label: "Amount confirmed", ready: Boolean(amount.trim()) }
  ];
  const rentalMissingGates = rentalCompletionGates.filter((gate) => !gate.ready).map((gate) => gate.label);

  function updateRentalFact(key: keyof typeof rentalFacts, value: string) {
    const nextFacts = { ...rentalFacts, [key]: value };
    setRentalFacts(nextFacts);
    const nextDays = daysBetween(nextFacts.pickupDate, nextFacts.dropoffDate);
    const nextRate = dollarsToCents(nextFacts.ratePerDay);
    const nextDeposit = dollarsToCents(nextFacts.depositHold);
    const nextRentalCharges = (Number.isFinite(nextRate) && nextRate !== null ? nextRate : 0) * nextDays;
    const nextEstimate = isLoaner ? nextRentalCharges : nextRentalCharges + (Number.isFinite(nextDeposit) && nextDeposit !== null ? nextDeposit : 0);
    onAmountChange(formatCurrency(nextEstimate));
  }

  function updateVehicleFact(key: keyof typeof vehicleFacts, value: string) {
    setVehicleFacts((current) => ({ ...current, [key]: value }));
  }

  function updateVin(value: string) {
    const vin = normalizeVin(value);
    const stockNumber = getStockNumberFromVin(vin);
    setVehicleFacts((current) => ({ ...current, stockNumber, vin }));
    onVehicleChange(stockNumber || vin || vehicle);
  }

  function updateVehicleSearch(value: string) {
    onVehicleChange(value);
    const vin = getVinFromVehicleInput(value);
    if (!vin) return;
    setVehicleFacts((current) => ({ ...current, stockNumber: getStockNumberFromVin(vin), vin }));
  }

  function runVinDecode() {
    const vin = vehicleFacts.vin || getVinFromVehicleInput(vehicle);
    const decoded = decodeVin(vin);
    setVehicleFacts((current) => ({
      ...current,
      make: decoded.make || current.make,
      stockNumber: decoded.stockNumber,
      vin: vin || current.vin,
      year: decoded.year || current.year
    }));
    setDecodeStatus(decoded.valid ? `VIN decoded. Confirm model, color, mileage, and plate before ${workflowNoun} checkout.` : "Enter a full 17-character VIN in Search inventory or VIN before decoding.");
    if (decoded.stockNumber) onVehicleChange(decoded.stockNumber);
  }

  function useAuthorizationTotal() {
    onAmountChange(formatCurrency(isLoaner ? estimatedRentalCents : authorizationCents));
  }

  function togglePreparedForm(id: string) {
    setPreparedForms((current) => current.includes(id) ? current.filter((item) => item !== id) : [...current, id]);
  }

  function prepareRequiredForms() {
    setPreparedForms((current) => Array.from(new Set([...current, ...requiredRentalForms])));
  }

  function captureEvidence(
    setter: (value: SetStateAction<Record<string, string>>) => void,
    id: string,
    file?: File
  ) {
    if (!file) return;
    setter((current) => ({ ...current, [id]: file.name }));
  }

  function packetHtml() {
    if (!contractPacket) return "";
    return `<!doctype html><html><head><meta charset="utf-8"><title>${contractPacket.packetNumber}</title></head><body>${contractPacket.documents.map((document) => document.html).join("<hr />")}</body></html>`;
  }

  function openPacketPreview() {
    if (!contractPacket) return;
    setPreviewFormId((current) => current ?? contractPacket.documents[0]?.formId ?? null);
    setPacketPreviewOpen(true);
  }

  function downloadPacket() {
    if (!contractPacket) return;
    const url = URL.createObjectURL(new Blob([packetHtml()], { type: "text/html" }));
    const link = document.createElement("a");
    link.href = url;
    link.download = `${contractPacket.packetNumber}.html`;
    link.click();
    URL.revokeObjectURL(url);
  }

  function printPacket() {
    if (!contractPacket) return;
    const printWindow = window.open("", "_blank", "noopener,noreferrer");
    if (!printWindow) {
      setPacketStatus({ kind: "error", message: "Print window was blocked. Download the rental packet instead." });
      return;
    }
    printWindow.document.write(packetHtml());
    printWindow.document.close();
    printWindow.focus();
    printWindow.print();
  }

  function queuePacketDelivery(channel: "email" | "text") {
    if (!contractPacket) return;
    setPacketStatus({ kind: "ready", message: `${channel === "email" ? "Email" : "Text"} delivery link queued for ${contractPacket.packetNumber}; signed provider delivery remains governed by CRM communications controls.` });
  }

  async function generateRentalPacket() {
    setPacketStatus({ kind: "generating", message: `Generating and archiving ${workflowNoun} packet...` });
    const response = await fetch("/api/crm/v1/contract-packets", {
      body: JSON.stringify({
        customerName,
        dailyRental: {
          ...rentalFacts,
          estimatedAuthorization: formatCurrency(authorizationCents),
          estimatedRentalCharges: formatCurrency(estimatedRentalCents),
          mileageOut: vehicleFacts.mileageOut,
          rentalDays: String(rentalDays)
        },
        dealNumber: vehicleFacts.stockNumber || vehicle || undefined,
        dealType: workflowTitle,
        feeTotal: rentalFacts.depositHold,
        idempotencyKey: crypto.randomUUID(),
        packetType: "DAILY_RENTAL",
        paymentFunding: isLoaner
          ? `Courtesy loaner fee waiver; ${formatCurrency(estimatedRentalCents)} daily use fee deferred and waived if the interested vehicle purchase completes.`
          : `${rentalFacts.paymentMethod} hold ${rentalFacts.cardLast4 ? `ending ${rentalFacts.cardLast4}` : "not captured"}`,
        preparedFormIds: preparedForms.length > 0 ? preparedForms : requiredRentalForms,
        salePrice: formatCurrency(estimatedRentalCents),
        vehicle: {
          color: vehicleFacts.color,
          make: vehicleFacts.make,
          model: vehicleFacts.model,
          stockNumber: vehicleFacts.stockNumber,
          trim: vehicleFacts.trim,
          vin: vehicleFacts.vin,
          year: vehicleFacts.year
        }
      }),
      headers: { "content-type": "application/json" },
      method: "POST"
    });
    const payload = await response.json().catch(() => ({}));
    if (!response.ok) {
      setPacketStatus({ kind: "error", message: typeof payload.error === "string" ? payload.error : `${workflowTitle} packet could not be generated.` });
      return;
    }
    const generatedPacket = payload as GeneratedContractPacket;
    setContractPacket(generatedPacket);
    setPreviewFormId(generatedPacket.documents[0]?.formId ?? null);
    setPacketStatus({ kind: "ready", message: `Archived ${workflowNoun} packet ${generatedPacket.packetNumber}.` });
    onAmountChange(formatCurrency(isLoaner ? estimatedRentalCents : authorizationCents));
  }

  return (
    <div className={styles.retailExecutionDesk}>
      <section className={styles.retailSection} id="rental-renter">
        <header>
          <span>{isLoaner ? "Loaner driver eligibility" : "Renter eligibility"}</span>
          <strong>Confirm who can legally take the vehicle</strong>
        </header>
        <div className={styles.retailActionRow}>
          <button type="button">Scan driver license</button>
          <button type="button">Add additional driver</button>
          <button type="button">Text {workflowNoun} agreement</button>
          <button type="button">Email {workflowNoun} agreement</button>
        </div>
        <p className={styles.retailDeliveryNote}>{isLoaner ? "Vehicle loaners still require a valid driver license, age eligibility, insurance/protection review, approved dates, and a signed courtesy waiver before release." : "Most U.S. rental operators require a valid driver license, age eligibility, acceptable payment, and any needed secondary ID before release."}</p>
        <div className={styles.retailFieldGrid}>
          <label><span>{isLoaner ? "Primary loaner driver" : "Primary renter"}</span><input readOnly value={customerName} /></label>
          <label><span>Date of birth</span><input value={rentalFacts.dob} onChange={(event) => updateRentalFact("dob", event.target.value)} placeholder="MM/DD/YYYY" /></label>
          <label><span>SSN / ITIN</span><input placeholder="Only if manager-required" /></label>
          <label><span>License status</span><select value={rentalFacts.licenseStatus} onChange={(event) => updateRentalFact("licenseStatus", event.target.value)}><option>Valid</option><option>Needs review</option><option>Expired</option><option>Suspended / not eligible</option></select></label>
          <label><span>License number</span><input value={rentalFacts.licenseNumber} onChange={(event) => updateRentalFact("licenseNumber", event.target.value)} /></label>
          <label><span>License state</span><select value={rentalFacts.licenseState} onChange={(event) => updateRentalFact("licenseState", event.target.value)}><option>MN</option><option>WI</option><option>IA</option><option>ND</option><option>SD</option><option>Other</option></select></label>
          <label><span>Secondary ID</span><select value={rentalFacts.secondaryId} onChange={(event) => updateRentalFact("secondaryId", event.target.value)}><option>Not needed</option><option>Passport</option><option>Utility / bank statement</option><option>Military ID</option><option>Travel itinerary</option><option>Manager review</option></select></label>
          <label><span>Additional driver</span><select value={rentalFacts.additionalDriverStatus} onChange={(event) => updateRentalFact("additionalDriverStatus", event.target.value)}><option>None</option><option>Spouse / domestic partner</option><option>Paid additional driver</option><option>Business authorized driver</option><option>Needs approval</option></select></label>
          <label><span>Additional driver name</span><input value={rentalFacts.additionalDriverName} onChange={(event) => updateRentalFact("additionalDriverName", event.target.value)} /></label>
          <label className={styles.retailWide}><span>Street address</span><input /></label>
          <label><span>City</span><input /></label>
          <label><span>State</span><select><option>MN</option><option>WI</option><option>IA</option><option>ND</option><option>SD</option><option>Other</option></select></label>
          <label><span>Zip</span><input /></label>
          <label><span>Cell phone</span><input /></label>
          <label><span>Email</span><input /></label>
        </div>
      </section>

      <section className={styles.retailSection} id="rental-window">
        <header>
          <span>{isLoaner ? "Loaner window" : "Rental window"}</span>
          <strong>Set pickup, return, and use limits</strong>
        </header>
        <div className={styles.retailFieldGrid}>
          {isLoaner ? <label><span>Interested vehicle</span><input value={rentalFacts.interestedVehicle} onChange={(event) => updateRentalFact("interestedVehicle", event.target.value)} placeholder="Stock, VIN, or vehicle customer may buy" /></label> : null}
          <label><span>Pickup date</span><input type="date" value={rentalFacts.pickupDate} onChange={(event) => updateRentalFact("pickupDate", event.target.value)} /></label>
          <label><span>Pickup time</span><input type="time" value={rentalFacts.pickupTime} onChange={(event) => updateRentalFact("pickupTime", event.target.value)} /></label>
          <label><span>Return date</span><input type="date" value={rentalFacts.dropoffDate} onChange={(event) => updateRentalFact("dropoffDate", event.target.value)} /></label>
          <label><span>Return time</span><input type="time" value={rentalFacts.dropoffTime} onChange={(event) => updateRentalFact("dropoffTime", event.target.value)} /></label>
          <label><span>Mileage plan</span><select value={rentalFacts.mileagePlan} onChange={(event) => updateRentalFact("mileagePlan", event.target.value)}><option>Local use / daily mileage cap</option><option>Unlimited local miles</option><option>Out-of-state approved</option><option>Insurance replacement</option><option>Manager exception</option></select></label>
          <label><span>Use restriction</span><select value={rentalFacts.useRestriction} onChange={(event) => updateRentalFact("useRestriction", event.target.value)}><option>Minnesota local use</option><option>MN / WI / IA / Dakotas</option><option>No rideshare or commercial use</option><option>Insurance claim rental</option><option>Manager-approved exception</option></select></label>
        </div>
      </section>

      <section className={styles.retailSection} id="rental-unit">
        <header>
          <span>{workflowUnitLabel}</span>
          <strong>Assign a ready vehicle before checkout</strong>
        </header>
        <div className={styles.retailFieldGrid}>
          <label><span>Search inventory</span><input value={vehicle} onChange={(event) => updateVehicleSearch(event.target.value)} placeholder="Stock, VIN, plate, or unit" /></label>
          <label><span>VIN</span><input value={vehicleFacts.vin} onChange={(event) => updateVin(event.target.value)} placeholder="17-character VIN" /></label>
          <label><span>Stock no.</span><input readOnly value={vehicleFacts.stockNumber} placeholder="Last 6 of VIN" /></label>
          <div className={styles.retailDecodeRow}>
            <button type="button" onClick={runVinDecode}>Decode VIN</button>
            <span>{decodeStatus}</span>
          </div>
          <label><span>Year</span><input value={vehicleFacts.year} onChange={(event) => updateVehicleFact("year", event.target.value)} /></label>
          <label><span>Make</span><input value={vehicleFacts.make} onChange={(event) => updateVehicleFact("make", event.target.value)} /></label>
          <label><span>Model</span><input value={vehicleFacts.model} onChange={(event) => updateVehicleFact("model", event.target.value)} /></label>
          <label><span>Trim</span><input value={vehicleFacts.trim} onChange={(event) => updateVehicleFact("trim", event.target.value)} /></label>
          <label><span>Color</span><input value={vehicleFacts.color} onChange={(event) => updateVehicleFact("color", event.target.value)} /></label>
          <label><span>Plate</span><input value={vehicleFacts.licensePlate} onChange={(event) => updateVehicleFact("licensePlate", event.target.value)} /></label>
          <label><span>Mileage out</span><input value={vehicleFacts.mileageOut} onChange={(event) => updateVehicleFact("mileageOut", event.target.value)} /></label>
          <label><span>Parking location</span><input value={vehicleFacts.parkingLocation} onChange={(event) => updateVehicleFact("parkingLocation", event.target.value)} placeholder="Front line, bay, lot row" /></label>
          <label><span>Fuel out</span><select value={rentalFacts.fuelOut} onChange={(event) => updateRentalFact("fuelOut", event.target.value)}><option>Full</option><option>3/4</option><option>1/2</option><option>1/4</option><option>Empty</option></select></label>
          <label><span>Fuel return rule</span><select value={rentalFacts.returnFuel} onChange={(event) => updateRentalFact("returnFuel", event.target.value)}><option>Return full</option><option>Return same level</option><option>Prepaid fuel</option><option>Manager exception</option></select></label>
        </div>
      </section>

      <section className={styles.retailSection} id="rental-protection">
        <header>
          <span>{isLoaner ? "Fee waiver and protection" : "Payment and protection"}</span>
          <strong>{isLoaner ? "Keep fees visible while deferring customer charge" : "Secure the hold before keys leave"}</strong>
        </header>
        <div className={styles.retailFieldGrid}>
          <label><span>{isLoaner ? "Fee handling" : "Payment method"}</span><select value={rentalFacts.paymentMethod} onChange={(event) => updateRentalFact("paymentMethod", event.target.value)}>{isLoaner ? <option>Courtesy loaner - deferred</option> : null}<option>Credit card</option><option>Debit card</option><option>Insurance direct bill</option><option>Company account</option><option>Cash not accepted for hold</option></select></label>
          <label><span>Card last 4</span><input value={rentalFacts.cardLast4} onChange={(event) => updateRentalFact("cardLast4", event.target.value.slice(0, 4))} placeholder="1234" /></label>
          <label><span>Deposit / hold</span><input value={rentalFacts.depositHold} onChange={(event) => updateRentalFact("depositHold", event.target.value)} /></label>
          <label><span>Daily rate</span><input value={rentalFacts.ratePerDay} onChange={(event) => updateRentalFact("ratePerDay", event.target.value)} /></label>
          <label><span>Protection choice</span><select value={rentalFacts.protectionPlan} onChange={(event) => updateRentalFact("protectionPlan", event.target.value)}><option>Customer insurance on file</option><option>Dealer collision damage waiver</option><option>Liability supplement</option><option>Declined protection</option><option>Manager review</option></select></label>
          <label><span>Insurance carrier</span><input value={rentalFacts.insuranceCarrier} onChange={(event) => updateRentalFact("insuranceCarrier", event.target.value)} /></label>
          <label><span>Policy number</span><input value={rentalFacts.insurancePolicy} onChange={(event) => updateRentalFact("insurancePolicy", event.target.value)} /></label>
          <label><span>Estimated authorization</span><input readOnly value={formatCurrency(authorizationCents)} /></label>
        </div>
        <div className={styles.rentalSummaryStrip}>
          <div><span>Rental days</span><strong>{rentalDays}</strong></div>
          <div><span>{isLoaner ? "Loaner fee exposure" : "Rental charges"}</span><strong>{formatCurrency(estimatedRentalCents)}</strong></div>
          <div><span>Deposit / hold</span><strong>{formatCurrency(Number.isFinite(depositHoldCents) && depositHoldCents !== null ? depositHoldCents : 0)}</strong></div>
          <div><span>{isLoaner ? "Customer fee status" : "Authorization"}</span><strong>{isLoaner ? feeStatusLabel : formatCurrency(authorizationCents)}</strong></div>
          <button type="button" onClick={useAuthorizationTotal}>{isLoaner ? "Use fee exposure total" : "Use authorization total"}</button>
        </div>
        {isLoaner ? (
          <div className={styles.retailDeliveryNote}>
            <strong>Courtesy Loaner Purchase Waiver</strong>
            <p>Customer acknowledges that standard daily rental rates, mileage limits, late return charges, fuel charges, cleaning charges, damage responsibility, insurance requirements, and other use conditions remain applicable to this loaner unless expressly waived in writing.</p>
            <p>Dealer will waive the standard daily rental/use fee for the approved loaner period if Customer completes the purchase of the interested vehicle from Dealer. This waiver does not waive responsibility for damage, loss, fuel shortage, excessive cleaning, tickets, tolls, unauthorized use, late return after the approved due-back time, or other applicable charges.</p>
            <p>If Customer does not complete the purchase, cancels the purchase process, fails to return the loaner when requested, exceeds the approved loaner period, or otherwise violates this agreement, Dealer may charge the standard daily rental/use fee and any other applicable charges for the loaner period.</p>
          </div>
        ) : null}
      </section>

      <section className={styles.retailSection} id="rental-evidence">
        <header>
          <span>Release & return evidence</span>
          <strong>Photos and signed documents are required before custody changes</strong>
        </header>
        <div className={styles.rentalEvidenceSummary}>
          <div><span>Release photos</span><strong>{releasePhotoCount}/{RENTAL_RELEASE_PHOTO_REQUIREMENTS.length}</strong><small>{releasePhotosReady ? "Ready for checkout" : "Required before keys leave"}</small></div>
          <div><span>Signed documents</span><strong>{signedDocumentCount}/{RENTAL_SIGNED_DOCUMENT_REQUIREMENTS.length}</strong><small>{signedDocumentsReady ? "Recorded" : "Required before checkout"}</small></div>
          <div><span>Return photos</span><strong>{returnPhotoCount}/{RENTAL_RETURN_PHOTO_REQUIREMENTS.length}</strong><small>{returnPhotosReady ? "Ready to receive" : "Required before receiving complete"}</small></div>
        </div>
        <div className={styles.rentalEvidenceBoard}>
          <section>
            <h3>Release photos</h3>
            <p>Use a phone camera when available. These photo slots document condition before staff releases the {workflowNoun} vehicle.</p>
            <div className={styles.rentalEvidenceGrid}>
              {RENTAL_RELEASE_PHOTO_REQUIREMENTS.map((item) => (
                <label className={releasePhotos[item.id] ? styles.rentalEvidenceCaptured : undefined} key={item.id}>
                  <span>{item.label}</span>
                  <strong>{releasePhotos[item.id] ?? "Photo required"}</strong>
                  <small>{item.helper}</small>
                  <StorageDestination>vehicle file and {workflowNoun} deal jacket</StorageDestination>
                  <input accept="image/*" capture="environment" onChange={(event) => captureEvidence(setReleasePhotos, item.id, event.currentTarget.files?.[0])} type="file" />
                </label>
              ))}
            </div>
          </section>
          <section>
            <h3>Signed document recording</h3>
            <p>Record the signed packet and proof documents against this {workflowNoun} workflow. These are the documents that should be stored in the governed evidence archive once backend storage is connected here.</p>
            <div className={styles.rentalEvidenceGrid}>
              {RENTAL_SIGNED_DOCUMENT_REQUIREMENTS.map((item) => (
                <label className={signedDocuments[item.id] ? styles.rentalEvidenceCaptured : undefined} key={item.id}>
                  <span>{item.label}</span>
                  <strong>{signedDocuments[item.id] ?? "Document required"}</strong>
                  <small>{item.helper}</small>
                  <StorageDestination>customer library and {workflowNoun} deal jacket</StorageDestination>
                  <input accept="application/pdf,image/*" capture={item.id === "signed-agreement" ? undefined : "environment"} onChange={(event) => captureEvidence(setSignedDocuments, item.id, event.currentTarget.files?.[0])} type="file" />
                </label>
              ))}
            </div>
          </section>
          <section>
            <h3>Return / receiving photos</h3>
            <p>Receiving cannot be completed until staff records the return condition, mileage, fuel, interior, and damage review.</p>
            <div className={styles.rentalEvidenceGrid}>
              {RENTAL_RETURN_PHOTO_REQUIREMENTS.map((item) => (
                <label className={returnPhotos[item.id] ? styles.rentalEvidenceCaptured : undefined} key={item.id}>
                  <span>{item.label}</span>
                  <strong>{returnPhotos[item.id] ?? "Photo required"}</strong>
                  <small>{item.helper}</small>
                  <StorageDestination>vehicle file and {workflowNoun} receiving record</StorageDestination>
                  <input accept="image/*" capture="environment" onChange={(event) => captureEvidence(setReturnPhotos, item.id, event.currentTarget.files?.[0])} type="file" />
                </label>
              ))}
            </div>
            <div className={styles.retailNextActionBar} aria-label={`${workflowTitle} receiving next actions`}>
              <div>
                <span>Receiving readiness</span>
                <strong>{returnReceived ? "Return received with evidence" : returnPhotosReady ? "Ready to receive vehicle" : `${returnPhotoCount}/${RENTAL_RETURN_PHOTO_REQUIREMENTS.length} return photos ready`}</strong>
              </div>
              <button disabled={!returnPhotosReady || returnReceived} onClick={() => setReturnReceived(true)} type="button">{returnReceived ? "Return received" : "Complete receiving"}</button>
            </div>
          </section>
        </div>
      </section>

      <section className={styles.retailSection} id="rental-checkout">
        <header>
          <span>Checkout controls</span>
          <strong>Release only when the counter facts are clean</strong>
        </header>
        <div className={styles.rentalReadinessGrid}>
          {[
            ["Identity", rentalFacts.licenseNumber ? "Captured" : "Needs license"],
            [isLoaner ? "Courtesy waiver" : "Payment hold", isLoaner ? (rentalFacts.interestedVehicle ? "Ready" : "Needs interested vehicle") : (rentalFacts.cardLast4 ? "Ready" : "Needs card")],
            ["Protection", rentalFacts.insuranceCarrier || rentalFacts.protectionPlan !== "Customer insurance on file" ? "Ready" : "Needs insurance"],
            [isLoaner ? "Loaner unit" : "Vehicle", vehicleFacts.stockNumber || vehicleFacts.vin || vehicle ? "Assigned" : "Needs unit"],
            ["Return plan", rentalFacts.dropoffDate ? "Scheduled" : "Needs date"],
            ["Release evidence", releaseEvidenceReady ? "Ready" : "Needs photos/docs"]
          ].map(([label, value]) => (
            <div key={label}>
              <span>{label}</span>
              <strong>{value}</strong>
            </div>
          ))}
        </div>
        <div className={styles.retailNextActionBar} aria-label={`${workflowTitle} next actions`}>
          <div>
            <span>{workflowTitle} readiness</span>
            <strong>{rentalReadyFacts >= 5 && releaseEvidenceReady ? `Ready to complete ${workflowNoun} checkout` : releaseEvidenceReady ? `${rentalReadyFacts}/5 counter facts ready` : "Release photos and signed documents required"}</strong>
            <CompletionGateList missing={rentalMissingGates} />
          </div>
          <button type="button" onClick={onSaveDraft}>Save {workflowNoun} draft</button>
          <button disabled={rentalReadyFacts < 5 || !releaseEvidenceReady || !amount.trim() || statusKind === "saving"} onClick={onComplete} type="button">
            {statusKind === "saving" ? "Completing..." : "Complete checkout"}
          </button>
        </div>
      </section>

      <section className={styles.retailSection} id="rental-forms">
        <header>
          <span>{isLoaner ? "Loaner forms" : "Rental forms"}</span>
          <strong>{isLoaner ? "Vehicle loaner signing packet" : "Daily rental signing packet"}</strong>
        </header>
        <div className={styles.retailPacketLauncher}>
          <div>
            <span>Packet readiness</span>
            <strong>{contractPacket ? `${contractPacket.packetNumber} archived` : `${preparedRequiredCount}/${requiredRentalForms.length} required forms ready`}</strong>
            <small>Open the drawer to prepare the agreement, terms, damage responsibility, protection election, payment authorization, condition report, and incident instructions.</small>
          </div>
          <button type="button" onClick={() => setPacketDrawerOpen(true)}>Open {workflowNoun} packet</button>
        </div>

        {packetDrawerOpen ? (
          <div className={styles.retailPacketDrawerBackdrop} role="presentation">
            <aside className={styles.retailPacketDrawer} aria-label={`${workflowTitle} packet drawer`}>
              <header>
                <div>
                  <span>{workflowTitle} packet</span>
                  <strong>Prepare, generate, and review {workflowNoun} documents</strong>
                  <small>{workflowTitle} agreements stay out of the main workspace until staff needs signing, print, text, email, or archive controls.</small>
                </div>
                <button type="button" onClick={() => setPacketDrawerOpen(false)}>Close</button>
              </header>
              <div className={styles.retailFormsCommand}>
                <div>
                  <span>Required forms ready</span>
                  <strong>{preparedRequiredCount}/{requiredRentalForms.length}</strong>
                  <small>Prepare the baseline packet first, then add the additional driver addendum only when it applies.</small>
                </div>
                <button type="button" onClick={prepareRequiredForms}>Prepare required forms</button>
                <button disabled={packetStatus.kind === "generating"} type="button" onClick={() => void generateRentalPacket()}>
                  {packetStatus.kind === "generating" ? "Generating..." : `Generate ${workflowNoun} packet`}
                </button>
                <button disabled={!contractPacket} type="button" onClick={openPacketPreview}>Preview generated packet</button>
              </div>
              {packetStatus.kind !== "idle" ? <p className={packetStatus.kind === "error" ? styles.retailPacketError : styles.retailPacketStatus}>{packetStatus.message}</p> : null}
              {contractPacket ? (
                <div className={styles.retailPacketArchive} aria-label="Generated rental packet archive">
                  <div>
                    <span>Archived packet</span>
                    <strong>{contractPacket.packetNumber}</strong>
                    <small>{contractPacket.documents.length} document(s) generated · {new Date(contractPacket.generatedAt).toLocaleString()}</small>
                  </div>
                  <button type="button" onClick={openPacketPreview}>Preview packet</button>
                  <button disabled={!contractPacket.delivery.downloadReady} type="button" onClick={downloadPacket}>Download packet</button>
                  <button disabled={!contractPacket.delivery.printReady} type="button" onClick={printPacket}>Print packet</button>
                  <button disabled={!contractPacket.delivery.textReady} type="button" onClick={() => queuePacketDelivery("text")}>Text link</button>
                  <button disabled={!contractPacket.delivery.emailReady} type="button" onClick={() => queuePacketDelivery("email")}>Email link</button>
                  <small>{contractPacket.delivery.providerHoldReason}</small>
                </div>
              ) : null}
              <div className={styles.retailFormsGrid}>
                {DAILY_RENTAL_FORM_PACKET.map((form) => {
                  const prepared = preparedForms.includes(form.id);
                  return (
                    <label className={prepared ? styles.retailFormReady : undefined} key={form.id}>
                      <input checked={prepared} onChange={() => togglePreparedForm(form.id)} type="checkbox" />
                      <span>{form.category}</span>
                      <strong>{form.label}</strong>
                      <small>{form.description}</small>
                      <em>{form.trigger}</em>
                      <b>{form.basis}</b>
                    </label>
                  );
                })}
              </div>

              {packetPreviewOpen && contractPacket ? (
                <div className={styles.retailPacketPreviewBackdrop} role="presentation">
                  <aside className={styles.retailPacketPreviewDrawer} aria-label="Rental packet preview">
                    <header>
                      <div>
                        <span>Packet preview</span>
                        <strong>{contractPacket.packetNumber}</strong>
                        <small>Review generated rental forms before download, print, text, or email.</small>
                      </div>
                      <button type="button" onClick={() => setPacketPreviewOpen(false)}>Close</button>
                    </header>
                    <div className={styles.retailPacketPreviewBody}>
                      <nav aria-label="Generated rental forms">
                        {contractPacket.documents.map((document) => (
                          <button
                            className={document.formId === previewDocument?.formId ? styles.retailPacketPreviewActive : undefined}
                            key={document.formId}
                            onClick={() => setPreviewFormId(document.formId)}
                            type="button"
                          >
                            {document.label}
                          </button>
                        ))}
                      </nav>
                      <section>
                        <div>
                          <span>Reviewing</span>
                          <strong>{previewDocument?.label ?? "Generated rental form"}</strong>
                        </div>
                        <iframe srcDoc={previewDocument?.html ?? ""} title={previewDocument?.label ?? "Generated rental form preview"} />
                      </section>
                    </div>
                  </aside>
                </div>
              ) : null}
            </aside>
          </div>
        ) : null}
      </section>
    </div>
  );
}

function basisPointsFromMultiplier(value: string) {
  const parsed = Number(value.trim());
  return Number.isFinite(parsed) ? Math.round(parsed * 10000) : 10000;
}

function LeaseToOwnExecutionDesk({
  customerName,
  onAmountChange,
  onVehicleChange,
  vehicle
}: {
  customerName: string;
  onAmountChange: (value: string) => void;
  onVehicleChange: (value: string) => void;
  vehicle: string;
}) {
  const [preparedForms, setPreparedForms] = useState<string[]>([]);
  const [contractPacket, setContractPacket] = useState<GeneratedContractPacket | null>(null);
  const [packetStatus, setPacketStatus] = useState<{ kind: "idle" | "generating" | "ready" | "error"; message: string }>({ kind: "idle", message: "" });
  const [packetDrawerOpen, setPacketDrawerOpen] = useState(false);
  const [packetPreviewOpen, setPacketPreviewOpen] = useState(false);
  const [previewFormId, setPreviewFormId] = useState<string | null>(null);
  const [vehicleFacts, setVehicleFacts] = useState({
    bodyStyle: "",
    color: "",
    license: "",
    make: "",
    mileage: "",
    model: "",
    stockNumber: "",
    trim: "",
    vin: "",
    year: ""
  });
  const [leaseInputs, setLeaseInputs] = useState({
    additionalItems: "$0.00",
    capitalizedCostReduction: "$0.00",
    contractLength: "36",
    documentPreparationFee: "$375.00",
    downPayment: "$0.00",
    gpsCost: "$0.00",
    multiplier: "2.00",
    originationFee: "$0.00",
    otherRoadWorthyCost: "$0.00",
    paymentFrequency: "Monthly" as LeasePaymentFrequency,
    registrationFee: "$516.00",
    salesTaxRate: "6.875",
    titleFee: "$102.80",
    warrantyCost: "$0.00",
    wholesaleCost: "$0.00"
  });
  const [leaseFacts, setLeaseFacts] = useState({
    agentName: "",
    coLesseeName: "",
    effectiveDate: "",
    insuranceCompany: "",
    insurancePhone: "",
    lesseeEmail: "",
    lesseePhone: "",
    serviceFacility: "KAP Fleet",
    serviceFacilityPhone: ""
  });
  const [decodeStatus, setDecodeStatus] = useState("Enter a 17-character VIN to decode stock, year, and make.");

  const calculatorInput = useMemo<LeaseToOwnCalculatorInput>(() => ({
    additionalItemsCents: dollarsToCents(leaseInputs.additionalItems) || 0,
    capitalizedCostReductionCents: 0,
    contractLength: Number(leaseInputs.contractLength) || 0,
    documentPreparationFeeCents: dollarsToCents(leaseInputs.documentPreparationFee) || 0,
    downPaymentCents: dollarsToCents(leaseInputs.downPayment) || 0,
    gpsCostCents: dollarsToCents(leaseInputs.gpsCost) || 0,
    multiplierBasisPoints: basisPointsFromMultiplier(leaseInputs.multiplier),
    originationFeeCents: dollarsToCents(leaseInputs.originationFee) || 0,
    otherRoadWorthyCostCents: dollarsToCents(leaseInputs.otherRoadWorthyCost) || 0,
    paymentFrequency: leaseInputs.paymentFrequency,
    registrationFeeCents: dollarsToCents(leaseInputs.registrationFee) || 0,
    salesTaxRateBasisPoints: percentToBasisPoints(leaseInputs.salesTaxRate),
    titleFeeCents: dollarsToCents(leaseInputs.titleFee) || 0,
    warrantyCostCents: dollarsToCents(leaseInputs.warrantyCost) || 0,
    wholesaleCostCents: dollarsToCents(leaseInputs.wholesaleCost) || 0
  }), [leaseInputs]);
  const calculator = useMemo(() => calculateLeaseToOwn(calculatorInput), [calculatorInput]);
  const packetFormCount = LEASE_TO_OWN_FORM_PACKET.length;
  const preparedPacketCount = LEASE_TO_OWN_FORM_PACKET.filter((form) => preparedForms.includes(form.id)).length;
  const previewDocument = contractPacket?.documents.find((document) => document.formId === previewFormId) ?? contractPacket?.documents[0] ?? null;

  function updateLeaseInput(key: keyof typeof leaseInputs, value: string) {
    setLeaseInputs((current) => ({ ...current, [key]: key === "paymentFrequency" ? value as LeasePaymentFrequency : value }));
  }

  function updateVehicleFact(key: keyof typeof vehicleFacts, value: string) {
    setVehicleFacts((current) => ({ ...current, [key]: value }));
  }

  function updateLeaseFact(key: keyof typeof leaseFacts, value: string) {
    setLeaseFacts((current) => ({ ...current, [key]: value }));
  }

  function updateVin(value: string) {
    const vin = normalizeVin(value);
    const stockNumber = getStockNumberFromVin(vin);
    setVehicleFacts((current) => ({ ...current, stockNumber, vin }));
    onVehicleChange(stockNumber || vin || vehicle);
  }

  function updateVehicleSearch(value: string) {
    onVehicleChange(value);
    const vin = getVinFromVehicleInput(value);
    if (!vin) return;
    setVehicleFacts((current) => ({ ...current, stockNumber: getStockNumberFromVin(vin), vin }));
  }

  function runVinDecode() {
    const vin = vehicleFacts.vin || getVinFromVehicleInput(vehicle);
    const decoded = decodeVin(vin);
    setVehicleFacts((current) => ({
      ...current,
      make: decoded.make || current.make,
      stockNumber: decoded.stockNumber,
      vin: vin || current.vin,
      year: decoded.year || current.year
    }));
    setDecodeStatus(decoded.valid ? "VIN decoded. Confirm model, color, mileage, and lease values before delivery." : "Enter a full 17-character VIN in Search inventory or VIN before decoding.");
    if (decoded.stockNumber) onVehicleChange(decoded.stockNumber);
  }

  function togglePreparedForm(id: string) {
    setPreparedForms((current) => current.includes(id) ? current.filter((item) => item !== id) : [...current, id]);
  }

  function prepareRequiredForms() {
    setPreparedForms((current) => Array.from(new Set([...current, ...allLeaseToOwnFormIds()])));
  }

  async function generateLeasePacket() {
    setPacketStatus({ kind: "generating", message: "Generating and archiving lease-to-own packet..." });
    const response = await fetch("/api/crm/v1/contract-packets", {
      body: JSON.stringify({
        customerName,
        dealNumber: vehicleFacts.stockNumber || vehicle || undefined,
        dealType: "Lease-to-Own",
        feeTotal: formatCurrency(calculator.estimatedFeesAndTaxesOverTermCents),
        idempotencyKey: crypto.randomUUID(),
        leaseCalculator: calculatorInput,
        packetType: "LEASE_TO_OWN",
        paymentFunding: `${leaseInputs.paymentFrequency} payments`,
        preparedFormIds: preparedForms.length > 0 ? preparedForms : allLeaseToOwnFormIds(),
        salePrice: formatCurrency(calculator.grossCapitalizedCostCents),
        vehicle: {
          color: vehicleFacts.color,
          make: vehicleFacts.make,
          model: vehicleFacts.model,
          stockNumber: vehicleFacts.stockNumber,
          trim: vehicleFacts.trim,
          vin: vehicleFacts.vin,
          year: vehicleFacts.year
        }
      }),
      headers: { "content-type": "application/json" },
      method: "POST"
    });
    const payload = await response.json().catch(() => ({}));
    if (!response.ok) {
      setPacketStatus({ kind: "error", message: typeof payload.error === "string" ? payload.error : "Lease packet could not be generated." });
      return;
    }
    const generatedPacket = payload as GeneratedContractPacket;
    setContractPacket(generatedPacket);
    setPreviewFormId(generatedPacket.documents[0]?.formId ?? null);
    setPacketStatus({ kind: "ready", message: `Archived lease packet ${generatedPacket.packetNumber}.` });
    onAmountChange(formatCurrency(calculator.grossCapitalizedCostCents));
  }

  function packetHtml() {
    if (!contractPacket) return "";
    return `<!doctype html><html><head><meta charset="utf-8"><title>${contractPacket.packetNumber}</title></head><body>${contractPacket.documents.map((document) => document.html).join("<hr />")}</body></html>`;
  }

  function downloadPacket() {
    if (!contractPacket) return;
    const selectedDocument = previewDocument ?? contractPacket.documents[0];
    if (selectedDocument?.contentBase64 && selectedDocument.contentType === "application/pdf") {
      const link = document.createElement("a");
      link.href = documentDataUrl(selectedDocument);
      link.download = selectedDocument.downloadFileName;
      link.click();
      return;
    }
    const url = URL.createObjectURL(new Blob([packetHtml()], { type: "text/html" }));
    const link = document.createElement("a");
    link.href = url;
    link.download = `${contractPacket.packetNumber}.html`;
    link.click();
    URL.revokeObjectURL(url);
  }

  function printPacket() {
    if (!contractPacket) return;
    const selectedDocument = previewDocument ?? contractPacket.documents[0];
    if (selectedDocument?.contentBase64 && selectedDocument.contentType === "application/pdf") {
      window.open(documentDataUrl(selectedDocument), "_blank", "noopener,noreferrer");
      return;
    }
    const printWindow = window.open("", "_blank", "noopener,noreferrer");
    if (!printWindow) {
      setPacketStatus({ kind: "error", message: "Print window was blocked. Download the packet instead." });
      return;
    }
    printWindow.document.write(packetHtml());
    printWindow.document.close();
    printWindow.focus();
    printWindow.print();
  }

  function queuePacketDelivery(channel: "email" | "text") {
    if (!contractPacket) return;
    setPacketStatus({ kind: "ready", message: `${channel === "email" ? "Email" : "Text"} delivery link queued for ${contractPacket.packetNumber}; signed provider delivery remains governed by CRM communications controls.` });
  }

  function openPacketPreview() {
    if (!contractPacket) return;
    setPreviewFormId((current) => current ?? contractPacket.documents[0]?.formId ?? null);
    setPacketPreviewOpen(true);
  }

  return (
    <div className={styles.retailExecutionDesk}>
      <section className={styles.retailSection} id="lease-applicant">
        <header>
          <span>Lease applicant</span>
          <strong>Capture who will sign and stay reachable</strong>
        </header>
        <div className={styles.retailActionRow}>
          <button type="button">Add co-lessee</button>
          <button type="button">Print lease application</button>
          <button type="button">Text lease application</button>
          <button type="button">Email lease application</button>
        </div>
        <p className={styles.retailDeliveryNote}>Text and email delivery use the approved CRM communications provider and stay attached to the customer record.</p>
        <div className={styles.retailFieldGrid}>
          <label><span>Lessee</span><input readOnly value={customerName} /></label>
          <label><span>Co-lessee</span><input value={leaseFacts.coLesseeName} onChange={(event) => updateLeaseFact("coLesseeName", event.target.value)} /></label>
          <CustomerIdentityDetails includeCreditFields includePhoneEmail={false} />
          <label><span>Cell phone</span><input value={leaseFacts.lesseePhone} onChange={(event) => updateLeaseFact("lesseePhone", event.target.value)} /></label>
          <label><span>Email</span><input value={leaseFacts.lesseeEmail} onChange={(event) => updateLeaseFact("lesseeEmail", event.target.value)} /></label>
          <label><span>Insurance company</span><input value={leaseFacts.insuranceCompany} onChange={(event) => updateLeaseFact("insuranceCompany", event.target.value)} /></label>
          <label><span>Insurance agent</span><input value={leaseFacts.agentName} onChange={(event) => updateLeaseFact("agentName", event.target.value)} /></label>
          <label><span>Insurance phone</span><input value={leaseFacts.insurancePhone} onChange={(event) => updateLeaseFact("insurancePhone", event.target.value)} /></label>
          <label><span>Effective date</span><input value={leaseFacts.effectiveDate} onChange={(event) => updateLeaseFact("effectiveDate", event.target.value)} placeholder="MM/DD/YYYY" /></label>
        </div>
      </section>

      <section className={styles.retailSection} id="lease-vehicle">
        <header>
          <span>Lease vehicle</span>
          <strong>Confirm the unit before numbers move</strong>
        </header>
        <div className={styles.retailFieldGrid}>
          <label><span>Search inventory</span><input value={vehicle} onChange={(event) => updateVehicleSearch(event.target.value)} placeholder="Stock, VIN, or vehicle" /></label>
          <label><span>VIN</span><input value={vehicleFacts.vin} onChange={(event) => updateVin(event.target.value)} placeholder="17-character VIN" /></label>
          <label><span>Stock no.</span><input readOnly value={vehicleFacts.stockNumber} placeholder="Last 6 of VIN" /></label>
          <div className={styles.retailDecodeRow}>
            <button type="button" onClick={runVinDecode}>Decode VIN</button>
            <span>{decodeStatus}</span>
          </div>
          <label><span>Year</span><input value={vehicleFacts.year} onChange={(event) => updateVehicleFact("year", event.target.value)} /></label>
          <label><span>Make</span><input value={vehicleFacts.make} onChange={(event) => updateVehicleFact("make", event.target.value)} /></label>
          <label><span>Model</span><input value={vehicleFacts.model} onChange={(event) => updateVehicleFact("model", event.target.value)} /></label>
          <label><span>Trim</span><input value={vehicleFacts.trim} onChange={(event) => updateVehicleFact("trim", event.target.value)} /></label>
          <label><span>Body style</span><input value={vehicleFacts.bodyStyle} onChange={(event) => updateVehicleFact("bodyStyle", event.target.value)} /></label>
          <label><span>Color</span><input value={vehicleFacts.color} onChange={(event) => updateVehicleFact("color", event.target.value)} /></label>
          <label><span>Odometer</span><input value={vehicleFacts.mileage} onChange={(event) => updateVehicleFact("mileage", event.target.value)} /></label>
          <label><span>Plate / license</span><input value={vehicleFacts.license} onChange={(event) => updateVehicleFact("license", event.target.value)} /></label>
        </div>
      </section>

      <section className={styles.retailSection} id="lease-calculator">
        <header>
          <span>Lease calculator</span>
          <strong>Use the dealership W2 calculator structure</strong>
        </header>
        <div className={styles.retailFieldGrid}>
          <label><span>Wholesale cost</span><input value={leaseInputs.wholesaleCost} onChange={(event) => updateLeaseInput("wholesaleCost", event.target.value)} /></label>
          <label><span>GPS cost</span><input value={leaseInputs.gpsCost} onChange={(event) => updateLeaseInput("gpsCost", event.target.value)} /></label>
          <label><span>Warranty cost</span><input value={leaseInputs.warrantyCost} onChange={(event) => updateLeaseInput("warrantyCost", event.target.value)} /></label>
          <label><span>Other roadworthy cost</span><input value={leaseInputs.otherRoadWorthyCost} onChange={(event) => updateLeaseInput("otherRoadWorthyCost", event.target.value)} /></label>
          <label><span>Multiplier</span><input value={leaseInputs.multiplier} onChange={(event) => updateLeaseInput("multiplier", event.target.value)} /></label>
          <label><span>Added items over term</span><input value={leaseInputs.additionalItems} onChange={(event) => updateLeaseInput("additionalItems", event.target.value)} /></label>
          <label><span>Sales tax rate</span><input value={leaseInputs.salesTaxRate} onChange={(event) => updateLeaseInput("salesTaxRate", event.target.value)} /></label>
          <label><span>Title fee</span><input value={leaseInputs.titleFee} onChange={(event) => updateLeaseInput("titleFee", event.target.value)} /></label>
          <label><span>Registration fee</span><input value={leaseInputs.registrationFee} onChange={(event) => updateLeaseInput("registrationFee", event.target.value)} /></label>
          <label><span>Document prep fee</span><input value={leaseInputs.documentPreparationFee} onChange={(event) => updateLeaseInput("documentPreparationFee", event.target.value)} /></label>
          <label><span>Down payment</span><input value={leaseInputs.downPayment} onChange={(event) => updateLeaseInput("downPayment", event.target.value)} /></label>
          <label><span>Frequency</span><select value={leaseInputs.paymentFrequency} onChange={(event) => updateLeaseInput("paymentFrequency", event.target.value)}><option>Weekly</option><option>BiWeekly</option><option>Monthly</option></select></label>
          <label><span>Contract length</span><input value={leaseInputs.contractLength} onChange={(event) => updateLeaseInput("contractLength", event.target.value)} /></label>
          <label><span>Capitalized cost reduction</span><input readOnly value={formatCurrency(calculator.capitalizedCostReductionCents)} /></label>
          <label><span>Origination fee</span><input value={leaseInputs.originationFee} onChange={(event) => updateLeaseInput("originationFee", event.target.value)} /></label>
          <label><span>Service facility</span><input value={leaseFacts.serviceFacility} onChange={(event) => updateLeaseFact("serviceFacility", event.target.value)} /></label>
          <label><span>Facility phone</span><input value={leaseFacts.serviceFacilityPhone} onChange={(event) => updateLeaseFact("serviceFacilityPhone", event.target.value)} /></label>
        </div>
        <div className={styles.leaseCalculatorSummary}>
          <div><span>Gross cap cost</span><strong>{formatCurrency(calculator.grossCapitalizedCostCents)}</strong></div>
          <div><span>Base payment</span><strong>{formatCurrency(calculator.basePeriodicPaymentCents)}</strong></div>
          <div><span>Due at signing</span><strong>{formatCurrency(calculator.amountDueAtSigningCents)}</strong></div>
          <div><span>Costs / taxes / fees</span><strong>{formatCurrency(calculator.costsTaxesFeesCents)}</strong></div>
          <div><span>Total payments</span><strong>{formatCurrency(calculator.totalOfPaymentsCents)}</strong></div>
          <div><span>Dealer gross</span><strong>{formatCurrency(calculator.dealerGrossProfitCents)}</strong></div>
          <button type="button" onClick={() => onAmountChange(formatCurrency(calculator.grossCapitalizedCostCents))}>Use calculated amount</button>
        </div>
      </section>

      <section className={styles.retailSection} id="lease-contracts">
        <header>
          <span>Lease forms</span>
          <strong>Lease-to-own packet</strong>
        </header>
        <div className={styles.retailPacketLauncher}>
          <div>
            <span>Packet readiness</span>
            <strong>{contractPacket ? `${contractPacket.packetNumber} archived` : `${preparedPacketCount}/${packetFormCount} packet forms ready`}</strong>
            <small>Open the drawer to prepare the lease agreement, binder, Exhibit A, all addenda, and inspection form.</small>
          </div>
          <button type="button" onClick={() => setPacketDrawerOpen(true)}>Open lease packet</button>
        </div>

        {packetDrawerOpen ? (
          <div className={styles.retailPacketDrawerBackdrop} role="presentation">
            <aside className={styles.retailPacketDrawer} aria-label="Lease-to-own packet drawer">
              <header>
                <div>
                  <span>Lease-to-own packet</span>
                  <strong>Prepare, generate, and review lease documents</strong>
                  <small>Lease forms stay out of the main workspace until staff needs to review, send, print, or archive them.</small>
                </div>
                <button type="button" onClick={() => setPacketDrawerOpen(false)}>Close</button>
              </header>
              <div className={styles.retailFormsCommand}>
                <div>
                  <span>Packet forms ready</span>
                  <strong>{preparedPacketCount}/{packetFormCount}</strong>
                  <small>Prepare the full lease-to-own packet, then remove any addendum that does not apply before generation.</small>
                </div>
                <button type="button" onClick={prepareRequiredForms}>Prepare full packet</button>
                <button disabled={packetStatus.kind === "generating"} type="button" onClick={() => void generateLeasePacket()}>
                  {packetStatus.kind === "generating" ? "Generating..." : "Generate lease packet"}
                </button>
                <button disabled={!contractPacket} type="button" onClick={openPacketPreview}>Preview generated packet</button>
              </div>
              {packetStatus.kind !== "idle" ? <p className={packetStatus.kind === "error" ? styles.retailPacketError : styles.retailPacketStatus}>{packetStatus.message}</p> : null}
              {contractPacket ? (
                <div className={styles.retailPacketArchive} aria-label="Generated lease packet archive">
                  <div>
                    <span>Archived packet</span>
                    <strong>{contractPacket.packetNumber}</strong>
                    <small>{contractPacket.documents.length} document(s) generated · {new Date(contractPacket.generatedAt).toLocaleString()}</small>
                  </div>
                  <button type="button" onClick={openPacketPreview}>Preview packet</button>
                  <button disabled={!contractPacket.delivery.downloadReady} type="button" onClick={downloadPacket}>Download form</button>
                  <button disabled={!contractPacket.delivery.printReady} type="button" onClick={printPacket}>Print form</button>
                  <button disabled={!contractPacket.delivery.textReady} type="button" onClick={() => queuePacketDelivery("text")}>Text link</button>
                  <button disabled={!contractPacket.delivery.emailReady} type="button" onClick={() => queuePacketDelivery("email")}>Email link</button>
                  <small>{contractPacket.delivery.providerHoldReason}</small>
                </div>
              ) : null}
              <div className={styles.retailFormsGrid}>
                {LEASE_TO_OWN_FORM_PACKET.map((form) => {
                  const prepared = preparedForms.includes(form.id);
                  return (
                    <label className={prepared ? styles.retailFormReady : undefined} key={form.id}>
                      <input checked={prepared} onChange={() => togglePreparedForm(form.id)} type="checkbox" />
                      <span>{form.category}</span>
                      <strong>{form.label}</strong>
                      <small>{form.description}</small>
                      <em>{form.trigger}</em>
                      <b>{form.sourceFileName}</b>
                    </label>
                  );
                })}
              </div>
              {packetPreviewOpen && contractPacket ? (
                <div className={styles.retailPacketPreviewBackdrop} role="presentation">
                  <aside className={styles.retailPacketPreviewDrawer} aria-label="Lease packet preview">
                    <header>
                      <div>
                        <span>Packet preview</span>
                        <strong>{contractPacket.packetNumber}</strong>
                        <small>Review generated lease forms before download, print, text, or email.</small>
                      </div>
                      <button type="button" onClick={() => setPacketPreviewOpen(false)}>Close</button>
                    </header>
                    <div className={styles.retailPacketPreviewBody}>
                      <nav aria-label="Generated lease forms">
                        {contractPacket.documents.map((document) => (
                          <button
                            className={document.formId === previewDocument?.formId ? styles.retailPacketPreviewActive : undefined}
                            key={document.formId}
                            onClick={() => setPreviewFormId(document.formId)}
                            type="button"
                          >
                            {document.label}
                          </button>
                        ))}
                      </nav>
                      <section>
                        <div>
                          <span>Reviewing</span>
                          <strong>{previewDocument?.label ?? "Generated lease form"}</strong>
                        </div>
                        {previewDocument?.contentBase64 && previewDocument.contentType === "application/pdf" ? (
                          <iframe src={documentDataUrl(previewDocument)} title={previewDocument.label} />
                        ) : (
                          <iframe srcDoc={previewDocument?.html ?? ""} title={previewDocument?.label ?? "Generated lease form preview"} />
                        )}
                      </section>
                    </div>
                  </aside>
                </div>
              ) : null}
            </aside>
          </div>
        ) : null}
      </section>
    </div>
  );
}

function BhphExecutionDesk({
  amount,
  customerName,
  onAmountChange,
  onComplete,
  onSaveDraft,
  onVehicleChange,
  statusKind,
  vehicle
}: {
  amount: string;
  customerName: string;
  onAmountChange: (value: string) => void;
  onComplete: () => void;
  onSaveDraft: () => void;
  onVehicleChange: (value: string) => void;
  statusKind: "idle" | "saving" | "success" | "error";
  vehicle: string;
}) {
  const [paperwork, setPaperwork] = useState<Record<string, string>>({});
  const [evidence, setEvidence] = useState<Record<string, string>>({});
  const [handoff, setHandoff] = useState<Record<string, boolean>>({});
  const [terms, setTerms] = useState({
    apr: "24.00%",
    downPayment: "$0.00",
    firstPaymentDate: "",
    lateFee: "$10.00",
    paymentAmount: "",
    paymentFrequency: "Weekly",
    salePrice: amount,
    termMonths: "24"
  });
  const [proof, setProof] = useState({
    coBuyer: "",
    employer: "",
    income: "",
    references: "",
    residence: "",
    stipulations: ""
  });
  const [approval, setApproval] = useState({
    downPaymentException: false,
    insuranceException: false,
    stipulationOpen: false,
    titleException: false,
    termsException: false
  });

  const salePriceCents = dollarsToCents(terms.salePrice);
  const downPaymentCents = dollarsToCents(terms.downPayment);
  const amountFinancedCents = Math.max(0, (Number.isFinite(salePriceCents) && salePriceCents !== null ? salePriceCents : 0) - (Number.isFinite(downPaymentCents) && downPaymentCents !== null ? downPaymentCents : 0));
  const paperworkCount = BHPH_PAPERWORK_REQUIREMENTS.filter((item) => paperwork[item.id]).length;
  const evidenceCount = BHPH_EVIDENCE_REQUIREMENTS.filter((item) => evidence[item.id]).length;
  const handoffCount = BHPH_HANDOFF_REQUIREMENTS.filter((item) => handoff[item]).length;
  const approvalTriggers = Object.values(approval).filter(Boolean).length;
  const paperworkReady = paperworkCount === BHPH_PAPERWORK_REQUIREMENTS.length;
  const evidenceReady = evidenceCount === BHPH_EVIDENCE_REQUIREMENTS.length;
  const handoffReady = handoffCount === BHPH_HANDOFF_REQUIREMENTS.length;
  const proofReady = Boolean(proof.income.trim() && proof.residence.trim() && proof.references.trim());
  const termsReady = Boolean(terms.salePrice.trim() && terms.downPayment.trim() && terms.paymentAmount.trim() && terms.firstPaymentDate.trim());
  const bhphReady = Boolean(customerName !== "Customer not selected" && vehicle.trim() && termsReady && proofReady && paperworkReady && evidenceReady && handoffReady && approvalTriggers === 0);
  const bhphMissingGates = [
    { label: "Customer selected", ready: customerName !== "Customer not selected" },
    { label: "Vehicle assigned", ready: Boolean(vehicle.trim()) },
    { label: "Terms complete", ready: termsReady },
    { label: "Proof and references complete", ready: proofReady },
    { label: "Signed paperwork stored", ready: paperworkReady },
    { label: "Evidence stored", ready: evidenceReady },
    { label: "Manager reviews clear", ready: approvalTriggers === 0 },
    { label: "Servicing handoff complete", ready: handoffReady }
  ].filter((gate) => !gate.ready).map((gate) => gate.label);

  function updateTerms(key: keyof typeof terms, value: string) {
    const next = { ...terms, [key]: value };
    setTerms(next);
    const nextSalePrice = dollarsToCents(next.salePrice);
    const nextDownPayment = dollarsToCents(next.downPayment);
    const nextAmountFinanced = Math.max(0, (Number.isFinite(nextSalePrice) && nextSalePrice !== null ? nextSalePrice : 0) - (Number.isFinite(nextDownPayment) && nextDownPayment !== null ? nextDownPayment : 0));
    onAmountChange(formatCurrency(nextAmountFinanced));
  }

  function captureEvidence(
    setter: (value: SetStateAction<Record<string, string>>) => void,
    id: string,
    file?: File
  ) {
    if (!file) return;
    setter((current) => ({ ...current, [id]: file.name }));
  }

  return (
    <div className={styles.retailExecutionDesk}>
      <section className={styles.retailSection} id="bhph-buyer">
        <header>
          <span>Buyer eligibility</span>
          <strong>Confirm buyer, proof, references, and stipulations</strong>
        </header>
        <div className={styles.retailFieldGrid}>
          <label><span>Buyer</span><input readOnly value={customerName} /></label>
          <label><span>Co-buyer</span><input value={proof.coBuyer} onChange={(event) => setProof((current) => ({ ...current, coBuyer: event.target.value }))} /></label>
          <CustomerIdentityDetails includeCreditFields />
          <label><span>Employer / income source</span><input value={proof.employer} onChange={(event) => setProof((current) => ({ ...current, employer: event.target.value }))} /></label>
          <label><span>Income proof</span><input value={proof.income} onChange={(event) => setProof((current) => ({ ...current, income: event.target.value }))} placeholder="Paystub, bank statement, award letter" /></label>
          <label><span>Residence proof</span><input value={proof.residence} onChange={(event) => setProof((current) => ({ ...current, residence: event.target.value }))} placeholder="Utility, lease, mail, or verified reference" /></label>
          <label><span>References</span><input value={proof.references} onChange={(event) => setProof((current) => ({ ...current, references: event.target.value }))} placeholder="Reference count or verified sheet" /></label>
          <label className={styles.retailWide}><span>Open stipulations</span><textarea value={proof.stipulations} onChange={(event) => setProof((current) => ({ ...current, stipulations: event.target.value }))} placeholder="Any open proof, insurance, title, down payment, or manager condition" rows={3} /></label>
        </div>
      </section>

      <section className={styles.retailSection} id="bhph-vehicle">
        <header>
          <span>Vehicle</span>
          <strong>Bind the BHPH paperwork to the exact unit</strong>
        </header>
        <div className={styles.retailFieldGrid}>
          <VehicleIdentityDetails vehicle={vehicle} onVehicleChange={onVehicleChange} />
          <label><span>Title status</span><select onChange={(event) => setApproval((current) => ({ ...current, titleException: event.target.value !== "Ready" }))}><option>Ready</option><option>Needs manager review</option><option>Title work pending</option></select></label>
          <label><span>Warranty / as-is posture</span><select><option>As-is disclosure required</option><option>Limited warranty included</option><option>Service contract offered</option><option>Manager review</option></select></label>
          <label><span>Insurance status</span><select onChange={(event) => setApproval((current) => ({ ...current, insuranceException: event.target.value !== "Verified" }))}><option>Verified</option><option>Binder pending</option><option>Needs manager review</option></select></label>
        </div>
      </section>

      <section className={styles.retailSection} id="bhph-terms">
        <header>
          <span>Deal terms</span>
          <strong>Structure the BHPH payment schedule before paperwork</strong>
        </header>
        <div className={styles.retailFieldGrid}>
          <label><span>Sale price</span><input value={terms.salePrice} onChange={(event) => updateTerms("salePrice", event.target.value)} placeholder="$0.00" /></label>
          <label><span>Down payment</span><input value={terms.downPayment} onChange={(event) => updateTerms("downPayment", event.target.value)} /></label>
          <label><span>Amount financed</span><input readOnly value={formatCurrency(amountFinancedCents)} /></label>
          <label><span>APR</span><input value={terms.apr} onChange={(event) => updateTerms("apr", event.target.value)} /></label>
          <label><span>Payment amount</span><input value={terms.paymentAmount} onChange={(event) => updateTerms("paymentAmount", event.target.value)} placeholder="$0.00" /></label>
          <label><span>Payment frequency</span><select value={terms.paymentFrequency} onChange={(event) => updateTerms("paymentFrequency", event.target.value)}><option>Weekly</option><option>Biweekly</option><option>Semimonthly</option><option>Monthly</option></select></label>
          <label><span>Term</span><select value={terms.termMonths} onChange={(event) => updateTerms("termMonths", event.target.value)}><option value="12">12 months</option><option value="18">18 months</option><option value="24">24 months</option><option value="30">30 months</option><option value="36">36 months</option><option value="42">42 months</option></select></label>
          <label><span>First payment date</span><input type="date" value={terms.firstPaymentDate} onChange={(event) => updateTerms("firstPaymentDate", event.target.value)} /></label>
          <label><span>Late fee</span><input value={terms.lateFee} onChange={(event) => updateTerms("lateFee", event.target.value)} /></label>
        </div>
        <div className={styles.rentalSummaryStrip}>
          <div><span>Amount financed</span><strong>{formatCurrency(amountFinancedCents)}</strong></div>
          <div><span>Payment</span><strong>{terms.paymentAmount || "$0.00"}</strong></div>
          <div><span>Frequency</span><strong>{terms.paymentFrequency}</strong></div>
          <div><span>Term</span><strong>{terms.termMonths} mo.</strong></div>
          <button type="button" onClick={() => onAmountChange(formatCurrency(amountFinancedCents))}>Use financed amount</button>
        </div>
      </section>

      <section className={styles.retailSection} id="bhph-paperwork">
        <header>
          <span>BHPH paperwork</span>
          <strong>Required documents, proof, and signed packet recording</strong>
        </header>
        <div className={styles.rentalEvidenceSummary}>
          <div><span>Paperwork</span><strong>{paperworkCount}/{BHPH_PAPERWORK_REQUIREMENTS.length}</strong><small>{paperworkReady ? "Ready" : "Required before delivery"}</small></div>
          <div><span>Proof evidence</span><strong>{evidenceCount}/{BHPH_EVIDENCE_REQUIREMENTS.length}</strong><small>{evidenceReady ? "Recorded" : "Required before approval"}</small></div>
          <div><span>Handoff</span><strong>{handoffCount}/{BHPH_HANDOFF_REQUIREMENTS.length}</strong><small>{handoffReady ? "Ready" : "Required after signing"}</small></div>
        </div>
        <div className={styles.rentalEvidenceBoard}>
          <section>
            <h3>Required paperwork</h3>
            <p>Record every signed BHPH document once. These should later store in the central document library and show here as the deal-jacket view.</p>
            <div className={styles.rentalEvidenceGrid}>
              {BHPH_PAPERWORK_REQUIREMENTS.map((item) => (
                <label className={paperwork[item.id] ? styles.rentalEvidenceCaptured : undefined} key={item.id}>
                  <span>{item.label}</span>
                  <strong>{paperwork[item.id] ?? "Document required"}</strong>
                  <small>{item.helper}</small>
                  <StorageDestination>BHPH deal jacket and customer library</StorageDestination>
                  <input accept="application/pdf,image/*" onChange={(event) => captureEvidence(setPaperwork, item.id, event.currentTarget.files?.[0])} type="file" />
                </label>
              ))}
            </div>
          </section>
          <section>
            <h3>Evidence gates</h3>
            <p>ID, insurance, income, residence, references, and delivery condition evidence must be recorded before completion.</p>
            <div className={styles.rentalEvidenceGrid}>
              {BHPH_EVIDENCE_REQUIREMENTS.map((item) => (
                <label className={evidence[item.id] ? styles.rentalEvidenceCaptured : undefined} key={item.id}>
                  <span>{item.label}</span>
                  <strong>{evidence[item.id] ?? "Evidence required"}</strong>
                  <small>{item.helper}</small>
                  <StorageDestination>customer library, vehicle file, and BHPH deal jacket</StorageDestination>
                  <input accept="application/pdf,image/*" capture="environment" onChange={(event) => captureEvidence(setEvidence, item.id, event.currentTarget.files?.[0])} type="file" />
                </label>
              ))}
            </div>
          </section>
        </div>
      </section>

      <section className={styles.retailSection} id="bhph-approval">
        <header>
          <span>Manager approval</span>
          <strong>Exceptions must be cleared before BHPH delivery</strong>
        </header>
        <div className={styles.rentalReadinessGrid}>
          {[
            ["Down payment", approval.downPaymentException],
            ["Terms", approval.termsException],
            ["Insurance", approval.insuranceException],
            ["Title", approval.titleException],
            ["Stipulations", approval.stipulationOpen]
          ].map(([label, flagged]) => (
            <div key={String(label)}>
              <span>{label}</span>
              <strong>{flagged ? "Manager review" : "Clear"}</strong>
            </div>
          ))}
          <div>
            <span>Approval status</span>
            <strong>{approvalTriggers === 0 ? "Clear" : `${approvalTriggers} review trigger(s)`}</strong>
          </div>
        </div>
        <div className={styles.retailActionRow}>
          <button aria-pressed={approval.downPaymentException} type="button" onClick={() => setApproval((current) => ({ ...current, downPaymentException: !current.downPaymentException }))}>{approval.downPaymentException ? "Down payment review active" : "Mark down payment review"}</button>
          <button aria-pressed={approval.termsException} type="button" onClick={() => setApproval((current) => ({ ...current, termsException: !current.termsException }))}>{approval.termsException ? "Terms review active" : "Mark terms review"}</button>
          <button aria-pressed={approval.stipulationOpen} type="button" onClick={() => setApproval((current) => ({ ...current, stipulationOpen: !current.stipulationOpen }))}>{approval.stipulationOpen ? "Stipulation review active" : "Mark stipulation review"}</button>
        </div>
      </section>

      <section className={styles.retailSection} id="bhph-handoff">
        <header>
          <span>Post-sale handoff</span>
          <strong>Account setup and servicing handoff must be ready</strong>
        </header>
        <div className={styles.rentalEvidenceGrid}>
          {BHPH_HANDOFF_REQUIREMENTS.map((item) => (
            <label className={handoff[item] ? styles.rentalEvidenceCaptured : undefined} key={item}>
              <span>Handoff gate</span>
              <strong>{item}</strong>
              <small>{handoff[item] ? "Ready" : "Required before completion"}</small>
              <input checked={Boolean(handoff[item])} onChange={(event) => setHandoff((current) => ({ ...current, [item]: event.target.checked }))} type="checkbox" />
            </label>
          ))}
        </div>
        <div className={styles.retailNextActionBar} aria-label="BHPH paperwork next actions">
          <div>
            <span>BHPH readiness</span>
            <strong>{bhphReady ? "Ready to complete BHPH paperwork" : "Complete terms, proof, paperwork, approval, and handoff gates"}</strong>
            <CompletionGateList missing={bhphMissingGates} />
          </div>
          <button type="button" onClick={onSaveDraft}>Save BHPH draft</button>
          <button disabled={!bhphReady || statusKind === "saving"} onClick={onComplete} type="button">{statusKind === "saving" ? "Completing..." : "Complete BHPH paperwork"}</button>
        </div>
      </section>
    </div>
  );
}

function DealerFinanceExecutionDesk({
  amount,
  customerName,
  onAmountChange,
  onComplete,
  onSaveDraft,
  onVehicleChange,
  statusKind,
  vehicle
}: {
  amount: string;
  customerName: string;
  onAmountChange: (value: string) => void;
  onComplete: () => void;
  onSaveDraft: () => void;
  onVehicleChange: (value: string) => void;
  statusKind: "idle" | "saving" | "success" | "error";
  vehicle: string;
}) {
  const [packet, setPacket] = useState<Record<string, string>>({});
  const [evidence, setEvidence] = useState<Record<string, string>>({});
  const [handoff, setHandoff] = useState<Record<string, boolean>>({});
  const [applicant, setApplicant] = useState({
    coBuyer: "",
    creditTier: "Application pending",
    income: "",
    residence: "",
    stipulations: ""
  });
  const [lender, setLender] = useState({
    approvalNumber: "",
    buyRate: "",
    contractRate: "0.00%",
    decision: "Application pending",
    lenderName: "",
    lienholderAddress: ""
  });
  const [terms, setTerms] = useState({
    amountFinanced: amount,
    cashDue: "$0.00",
    downPayment: "$0.00",
    firstPaymentDate: "",
    salePrice: amount,
    termMonths: "60",
    tradeAllowance: "$0.00",
    tradePayoff: "$0.00"
  });
  const [approval, setApproval] = useState({
    deliveryBeforeFunding: false,
    insuranceException: false,
    rateException: false,
    stipulationOpen: false,
    titleException: false
  });

  const salePriceCents = dollarsToCents(terms.salePrice);
  const downPaymentCents = dollarsToCents(terms.downPayment);
  const tradeAllowanceCents = dollarsToCents(terms.tradeAllowance);
  const tradePayoffCents = dollarsToCents(terms.tradePayoff);
  const amountFinancedCents = Math.max(0, (Number.isFinite(salePriceCents) && salePriceCents !== null ? salePriceCents : 0) - (Number.isFinite(downPaymentCents) && downPaymentCents !== null ? downPaymentCents : 0) - (Number.isFinite(tradeAllowanceCents) && tradeAllowanceCents !== null ? tradeAllowanceCents : 0) + (Number.isFinite(tradePayoffCents) && tradePayoffCents !== null ? tradePayoffCents : 0));
  const packetCount = DEALER_FINANCE_PACKET_REQUIREMENTS.filter((item) => packet[item.id]).length;
  const evidenceCount = DEALER_FINANCE_EVIDENCE_REQUIREMENTS.filter((item) => evidence[item.id]).length;
  const handoffCount = DEALER_FINANCE_HANDOFF_REQUIREMENTS.filter((item) => handoff[item]).length;
  const approvalTriggers = Object.values(approval).filter(Boolean).length;
  const packetReady = packetCount === DEALER_FINANCE_PACKET_REQUIREMENTS.length;
  const evidenceReady = evidenceCount === DEALER_FINANCE_EVIDENCE_REQUIREMENTS.length;
  const handoffReady = handoffCount === DEALER_FINANCE_HANDOFF_REQUIREMENTS.length;
  const applicantReady = Boolean(customerName !== "Customer not selected" && applicant.income.trim() && applicant.residence.trim());
  const lenderReady = Boolean(lender.lenderName.trim() && lender.approvalNumber.trim() && lender.decision === "Approved");
  const termsReady = Boolean(terms.salePrice.trim() && terms.downPayment.trim() && terms.firstPaymentDate.trim());
  const financeReady = Boolean(vehicle.trim() && applicantReady && lenderReady && termsReady && packetReady && evidenceReady && handoffReady && approvalTriggers === 0);
  const financeMissingGates = [
    { label: "Vehicle assigned", ready: Boolean(vehicle.trim()) },
    { label: "Applicant facts complete", ready: applicantReady },
    { label: "Approved lender decision recorded", ready: lenderReady },
    { label: "Deal structure complete", ready: termsReady },
    { label: "Finance packet stored", ready: packetReady },
    { label: "Funding evidence stored", ready: evidenceReady },
    { label: "Manager reviews clear", ready: approvalTriggers === 0 },
    { label: "Funding handoff complete", ready: handoffReady }
  ].filter((gate) => !gate.ready).map((gate) => gate.label);

  function updateTerms(key: keyof typeof terms, value: string) {
    const next = { ...terms, [key]: value };
    const nextSalePrice = dollarsToCents(next.salePrice);
    const nextDownPayment = dollarsToCents(next.downPayment);
    const nextTradeAllowance = dollarsToCents(next.tradeAllowance);
    const nextTradePayoff = dollarsToCents(next.tradePayoff);
    const nextAmountFinanced = Math.max(0, (Number.isFinite(nextSalePrice) && nextSalePrice !== null ? nextSalePrice : 0) - (Number.isFinite(nextDownPayment) && nextDownPayment !== null ? nextDownPayment : 0) - (Number.isFinite(nextTradeAllowance) && nextTradeAllowance !== null ? nextTradeAllowance : 0) + (Number.isFinite(nextTradePayoff) && nextTradePayoff !== null ? nextTradePayoff : 0));
    setTerms({ ...next, amountFinanced: formatCurrency(nextAmountFinanced) });
    if (["salePrice", "downPayment", "tradeAllowance", "tradePayoff"].includes(key)) onAmountChange(formatCurrency(nextAmountFinanced));
  }

  function captureEvidence(
    setter: (value: SetStateAction<Record<string, string>>) => void,
    id: string,
    file?: File
  ) {
    if (!file) return;
    setter((current) => ({ ...current, [id]: file.name }));
  }

  return (
    <div className={styles.retailExecutionDesk}>
      <section className={styles.retailSection} id="finance-applicant">
        <header>
          <span>Finance applicant</span>
          <strong>Confirm buyer, co-buyer, income, residence, and credit path</strong>
        </header>
        <div className={styles.retailFieldGrid}>
          <label><span>Buyer</span><input readOnly value={customerName} /></label>
          <label><span>Co-buyer</span><input value={applicant.coBuyer} onChange={(event) => setApplicant((current) => ({ ...current, coBuyer: event.target.value }))} /></label>
          <CustomerIdentityDetails includeCreditFields />
          <label><span>Income / employment</span><input value={applicant.income} onChange={(event) => setApplicant((current) => ({ ...current, income: event.target.value }))} placeholder="Employer, income source, or proof reference" /></label>
          <label><span>Residence</span><input value={applicant.residence} onChange={(event) => setApplicant((current) => ({ ...current, residence: event.target.value }))} placeholder="Address or residence proof reference" /></label>
          <label><span>Credit tier</span><select value={applicant.creditTier} onChange={(event) => setApplicant((current) => ({ ...current, creditTier: event.target.value }))}><option>Application pending</option><option>Prime</option><option>Near prime</option><option>Subprime</option><option>Manual review</option></select></label>
          <label className={styles.retailWide}><span>Stipulations / notes</span><textarea value={applicant.stipulations} onChange={(event) => setApplicant((current) => ({ ...current, stipulations: event.target.value }))} placeholder="Income, residence, insurance, references, or lender conditions" rows={3} /></label>
        </div>
      </section>

      <section className={styles.retailSection} id="finance-vehicle">
        <header>
          <span>Vehicle and title</span>
          <strong>Bind lender approval to the exact unit and lienholder path</strong>
        </header>
        <div className={styles.retailFieldGrid}>
          <VehicleIdentityDetails vehicle={vehicle} onVehicleChange={onVehicleChange} />
          <label><span>Title status</span><select onChange={(event) => setApproval((current) => ({ ...current, titleException: event.target.value !== "Ready" }))}><option>Ready</option><option>Title work pending</option><option>Lien release pending</option><option>Manager exception</option></select></label>
          <label><span>Insurance status</span><select onChange={(event) => setApproval((current) => ({ ...current, insuranceException: event.target.value !== "Verified" }))}><option>Verified</option><option>Binder pending</option><option>Needs lienholder correction</option><option>Manager exception</option></select></label>
          <label><span>Delivery status</span><select onChange={(event) => setApproval((current) => ({ ...current, deliveryBeforeFunding: event.target.value !== "After funding" }))}><option>After funding</option><option>Before funding request</option><option>Spot delivery review</option></select></label>
        </div>
      </section>

      <section className={styles.retailSection} id="finance-trade">
        <header>
          <span>Trade-in info</span>
          <strong>Capture trade identity, payoff, title status, and equity before funding</strong>
        </header>
        <TradeInDetails />
      </section>

      <section className={styles.retailSection} id="finance-structure">
        <header>
          <span>Deal structure</span>
          <strong>Structure sale price, trade, cash due, and amount financed</strong>
        </header>
        <div className={styles.retailFieldGrid}>
          <label><span>Sale price</span><input value={terms.salePrice} onChange={(event) => updateTerms("salePrice", event.target.value)} placeholder="$0.00" /></label>
          <label><span>Down payment</span><input value={terms.downPayment} onChange={(event) => updateTerms("downPayment", event.target.value)} /></label>
          <label><span>Trade allowance</span><input value={terms.tradeAllowance} onChange={(event) => updateTerms("tradeAllowance", event.target.value)} /></label>
          <label><span>Trade payoff</span><input value={terms.tradePayoff} onChange={(event) => updateTerms("tradePayoff", event.target.value)} /></label>
          <label><span>Cash due at signing</span><input value={terms.cashDue} onChange={(event) => updateTerms("cashDue", event.target.value)} /></label>
          <label><span>Amount financed</span><input readOnly value={formatCurrency(amountFinancedCents)} /></label>
          <label><span>Term</span><select value={terms.termMonths} onChange={(event) => updateTerms("termMonths", event.target.value)}><option value="36">36 months</option><option value="48">48 months</option><option value="60">60 months</option><option value="72">72 months</option><option value="84">84 months</option></select></label>
          <label><span>First payment date</span><input type="date" value={terms.firstPaymentDate} onChange={(event) => updateTerms("firstPaymentDate", event.target.value)} /></label>
        </div>
        <div className={styles.rentalSummaryStrip}>
          <div><span>Amount financed</span><strong>{formatCurrency(amountFinancedCents)}</strong></div>
          <div><span>Cash due</span><strong>{terms.cashDue}</strong></div>
          <div><span>Term</span><strong>{terms.termMonths} mo.</strong></div>
          <div><span>First payment</span><strong>{terms.firstPaymentDate || "Not set"}</strong></div>
          <button type="button" onClick={() => onAmountChange(formatCurrency(amountFinancedCents))}>Use amount financed</button>
        </div>
      </section>

      <section className={styles.retailSection} id="finance-lender">
        <header>
          <span>Lender decision</span>
          <strong>Track approval, rate, lienholder, and stipulation status</strong>
        </header>
        <div className={styles.retailFieldGrid}>
          <label><span>Lender</span><input value={lender.lenderName} onChange={(event) => setLender((current) => ({ ...current, lenderName: event.target.value }))} /></label>
          <label><span>Approval / app #</span><input value={lender.approvalNumber} onChange={(event) => setLender((current) => ({ ...current, approvalNumber: event.target.value }))} /></label>
          <label><span>Decision</span><select value={lender.decision} onChange={(event) => setLender((current) => ({ ...current, decision: event.target.value }))}><option>Application pending</option><option>Approved</option><option>Approved with stipulations</option><option>Counter offer</option><option>Declined</option></select></label>
          <label><span>Buy rate</span><input value={lender.buyRate} onChange={(event) => setLender((current) => ({ ...current, buyRate: event.target.value }))} placeholder="Optional internal rate" /></label>
          <label><span>Contract rate</span><input value={lender.contractRate} onChange={(event) => setLender((current) => ({ ...current, contractRate: event.target.value }))} /></label>
          <label><span>Lienholder address</span><input value={lender.lienholderAddress} onChange={(event) => setLender((current) => ({ ...current, lienholderAddress: event.target.value }))} /></label>
        </div>
        <div className={styles.retailActionRow}>
          <button
            aria-pressed={approval.rateException}
            type="button"
            onClick={() => setApproval((current) => ({ ...current, rateException: !current.rateException }))}
          >
            {approval.rateException ? "Rate review active" : "Mark rate review"}
          </button>
          <button
            aria-pressed={approval.stipulationOpen}
            type="button"
            onClick={() => setApproval((current) => ({ ...current, stipulationOpen: !current.stipulationOpen }))}
          >
            {approval.stipulationOpen ? "Stipulation review active" : "Mark stipulation review"}
          </button>
        </div>
        <div className={styles.rentalReadinessGrid}>
          <div><span>Rate review</span><strong>{approval.rateException ? "Manager review" : "Clear"}</strong></div>
          <div><span>Stipulations</span><strong>{approval.stipulationOpen ? "Manager review" : "Clear"}</strong></div>
          <div><span>Lender decision</span><strong>{lender.decision}</strong></div>
          <div><span>Approval / app #</span><strong>{lender.approvalNumber.trim() ? "Recorded" : "Needed"}</strong></div>
        </div>
      </section>

      <section className={styles.retailSection} id="finance-packet">
        <header>
          <span>Dealer finance packet</span>
          <strong>Contracts, disclosures, proof, and delivery evidence</strong>
        </header>
        <div className={styles.rentalEvidenceSummary}>
          <div><span>Packet docs</span><strong>{packetCount}/{DEALER_FINANCE_PACKET_REQUIREMENTS.length}</strong><small>{packetReady ? "Ready" : "Required before funding"}</small></div>
          <div><span>Evidence</span><strong>{evidenceCount}/{DEALER_FINANCE_EVIDENCE_REQUIREMENTS.length}</strong><small>{evidenceReady ? "Recorded" : "Required before delivery"}</small></div>
          <div><span>Handoff</span><strong>{handoffCount}/{DEALER_FINANCE_HANDOFF_REQUIREMENTS.length}</strong><small>{handoffReady ? "Ready" : "Required before completion"}</small></div>
        </div>
        <div className={styles.rentalEvidenceBoard}>
          <section>
            <h3>Required finance documents</h3>
            <p>Record the signed finance packet and product disclosures once. These should later store in the central deal jacket and document library.</p>
            <div className={styles.rentalEvidenceGrid}>
              {DEALER_FINANCE_PACKET_REQUIREMENTS.map((item) => (
                <label className={packet[item.id] ? styles.rentalEvidenceCaptured : undefined} key={item.id}>
                  <span>{item.label}</span>
                  <strong>{packet[item.id] ?? "Document required"}</strong>
                  <small>{item.helper}</small>
                  <StorageDestination>finance packet, deal jacket, and customer library</StorageDestination>
                  <input accept="application/pdf,image/*" onChange={(event) => captureEvidence(setPacket, item.id, event.currentTarget.files?.[0])} type="file" />
                </label>
              ))}
            </div>
          </section>
          <section>
            <h3>Funding evidence</h3>
            <p>ID, income, residence, stipulations, down payment, and delivery condition evidence must be recorded before funded completion.</p>
            <div className={styles.rentalEvidenceGrid}>
              {DEALER_FINANCE_EVIDENCE_REQUIREMENTS.map((item) => (
                <label className={evidence[item.id] ? styles.rentalEvidenceCaptured : undefined} key={item.id}>
                  <span>{item.label}</span>
                  <strong>{evidence[item.id] ?? "Evidence required"}</strong>
                  <small>{item.helper}</small>
                  <StorageDestination>funding packet, vehicle file, and deal jacket</StorageDestination>
                  <input accept="application/pdf,image/*" capture="environment" onChange={(event) => captureEvidence(setEvidence, item.id, event.currentTarget.files?.[0])} type="file" />
                </label>
              ))}
            </div>
          </section>
        </div>
      </section>

      <section className={styles.retailSection} id="finance-funding">
        <header>
          <span>Funding handoff</span>
          <strong>Confirm contract, stipulations, cash due, lienholder, and archive</strong>
        </header>
        <div className={styles.rentalReadinessGrid}>
          {[
            ["Lender", lenderReady],
            ["Applicant", applicantReady],
            ["Terms", termsReady],
            ["Packet", packetReady],
            ["Evidence", evidenceReady],
            ["Approvals", approvalTriggers === 0]
          ].map(([label, clear]) => (
            <div key={String(label)}>
              <span>{label}</span>
              <strong>{clear ? "Clear" : "Needs work"}</strong>
            </div>
          ))}
        </div>
        <div className={styles.rentalEvidenceGrid}>
          {DEALER_FINANCE_HANDOFF_REQUIREMENTS.map((item) => (
            <label className={handoff[item] ? styles.rentalEvidenceCaptured : undefined} key={item}>
              <span>Funding gate</span>
              <strong>{item}</strong>
              <small>{handoff[item] ? "Ready" : "Required before completion"}</small>
              <input checked={Boolean(handoff[item])} onChange={(event) => setHandoff((current) => ({ ...current, [item]: event.target.checked }))} type="checkbox" />
            </label>
          ))}
        </div>
        <div className={styles.retailNextActionBar} aria-label="Dealer finance next actions">
          <div>
            <span>Dealer finance readiness</span>
            <strong>{financeReady ? "Ready to complete dealer finance packet" : "Complete applicant, lender, packet, evidence, approval, and funding gates"}</strong>
            <CompletionGateList missing={financeMissingGates} />
          </div>
          <button type="button" onClick={onSaveDraft}>Save finance draft</button>
          <button disabled={!financeReady || statusKind === "saving"} onClick={onComplete} type="button">{statusKind === "saving" ? "Completing..." : "Complete dealer finance packet"}</button>
        </div>
      </section>
    </div>
  );
}

function TestDriveExecutionDesk({
  customerName,
  onAmountChange,
  onComplete,
  onSaveDraft,
  onVehicleChange,
  statusKind,
  vehicle
}: {
  customerName: string;
  onAmountChange: (value: string) => void;
  onComplete: () => void;
  onSaveDraft: () => void;
  onVehicleChange: (value: string) => void;
  statusKind: "idle" | "saving" | "success" | "error";
  vehicle: string;
}) {
  const [facts, setFacts] = useState({
    approvedRoute: "Local test drive route",
    driverLicense: "",
    driverPhone: "",
    insuranceCarrier: "",
    insurancePolicy: "",
    notes: "",
    returnTime: "",
    salesperson: "",
    startTime: "",
    testDriveDate: todayInputValue()
  });
  const [releasePhotos, setReleasePhotos] = useState<Record<string, string>>({});
  const [returnPhotos, setReturnPhotos] = useState<Record<string, string>>({});
  const [documents, setDocuments] = useState<Record<string, string>>({});
  const [returnReceived, setReturnReceived] = useState(false);

  const releasePhotoCount = TEST_DRIVE_RELEASE_REQUIREMENTS.filter((item) => releasePhotos[item.id]).length;
  const returnPhotoCount = TEST_DRIVE_RETURN_REQUIREMENTS.filter((item) => returnPhotos[item.id]).length;
  const documentCount = TEST_DRIVE_DOCUMENT_REQUIREMENTS.filter((item) => documents[item.id]).length;
  const releasePhotosReady = releasePhotoCount === TEST_DRIVE_RELEASE_REQUIREMENTS.length;
  const returnPhotosReady = returnPhotoCount === TEST_DRIVE_RETURN_REQUIREMENTS.length;
  const documentsReady = documentCount === TEST_DRIVE_DOCUMENT_REQUIREMENTS.length;
  const driverReady = Boolean(facts.driverLicense.trim() && facts.insuranceCarrier.trim());
  const releaseReady = Boolean(customerName !== "Customer not selected" && vehicle.trim() && driverReady && releasePhotosReady && documentsReady);
  const testDriveMissingGates = [
    { label: "Customer selected", ready: customerName !== "Customer not selected" },
    { label: "Vehicle assigned", ready: Boolean(vehicle.trim()) },
    { label: "Driver license and insurance captured", ready: driverReady },
    { label: "Signed form and proof stored", ready: documentsReady },
    { label: "Release photos captured", ready: releasePhotosReady },
    { label: "Expected return time set", ready: Boolean(facts.returnTime) }
  ].filter((gate) => !gate.ready).map((gate) => gate.label);

  function update(key: keyof typeof facts, value: string) {
    setFacts((current) => ({ ...current, [key]: value }));
    onAmountChange("$0.00");
  }

  function captureEvidence(
    setter: (value: SetStateAction<Record<string, string>>) => void,
    id: string,
    file?: File
  ) {
    if (!file) return;
    setter((current) => ({ ...current, [id]: file.name }));
  }

  return (
    <div className={styles.retailExecutionDesk}>
      <section className={styles.retailSection} id="test-drive-driver">
        <header>
          <span>Driver eligibility</span>
          <strong>Confirm the customer can take the vehicle on a test drive</strong>
        </header>
        <div className={styles.retailFieldGrid}>
          <label><span>Customer</span><input readOnly value={customerName} /></label>
          <label><span>Driver license</span><input value={facts.driverLicense} onChange={(event) => update("driverLicense", event.target.value)} placeholder="License number or verified reference" /></label>
          <label><span>Driver phone</span><input value={facts.driverPhone} onChange={(event) => update("driverPhone", event.target.value)} /></label>
          <CustomerIdentityDetails />
          <label><span>Insurance carrier</span><input value={facts.insuranceCarrier} onChange={(event) => update("insuranceCarrier", event.target.value)} /></label>
          <label><span>Insurance policy</span><input value={facts.insurancePolicy} onChange={(event) => update("insurancePolicy", event.target.value)} /></label>
          <label><span>Salesperson</span><input value={facts.salesperson} onChange={(event) => update("salesperson", event.target.value)} /></label>
        </div>
      </section>

      <section className={styles.retailSection} id="test-drive-vehicle">
        <header>
          <span>Vehicle and route</span>
          <strong>Assign the unit and set the test-drive window</strong>
        </header>
        <div className={styles.retailFieldGrid}>
          <VehicleIdentityDetails vehicle={vehicle} onVehicleChange={onVehicleChange} />
          <label><span>Date</span><input type="date" value={facts.testDriveDate} onChange={(event) => update("testDriveDate", event.target.value)} /></label>
          <label><span>Start time</span><input type="time" value={facts.startTime} onChange={(event) => update("startTime", event.target.value)} /></label>
          <label><span>Expected return</span><input type="time" value={facts.returnTime} onChange={(event) => update("returnTime", event.target.value)} /></label>
          <label><span>Approved route</span><select value={facts.approvedRoute} onChange={(event) => update("approvedRoute", event.target.value)}><option>Local test drive route</option><option>Highway route approved</option><option>Manager-approved extended route</option><option>Staff rides with customer</option></select></label>
          <label className={styles.retailWide}><span>Notes</span><textarea value={facts.notes} onChange={(event) => update("notes", event.target.value)} placeholder="Trade-in interest, requested vehicle, route exception, or manager note" rows={3} /></label>
        </div>
      </section>

      <section className={styles.retailSection} id="test-drive-evidence">
        <header>
          <span>Test-drive evidence</span>
          <strong>Signed form and photos are required before release</strong>
        </header>
        <div className={styles.rentalEvidenceSummary}>
          <div><span>Release photos</span><strong>{releasePhotoCount}/{TEST_DRIVE_RELEASE_REQUIREMENTS.length}</strong><small>{releasePhotosReady ? "Ready" : "Required before departure"}</small></div>
          <div><span>Documents</span><strong>{documentCount}/{TEST_DRIVE_DOCUMENT_REQUIREMENTS.length}</strong><small>{documentsReady ? "Recorded" : "Required before departure"}</small></div>
          <div><span>Return photos</span><strong>{returnPhotoCount}/{TEST_DRIVE_RETURN_REQUIREMENTS.length}</strong><small>{returnPhotosReady ? "Ready to receive" : "Required at return"}</small></div>
        </div>
        <div className={styles.rentalEvidenceBoard}>
          <section>
            <h3>Signed form and proof</h3>
            <p>Attach the signed test-drive form, license proof, and insurance proof. These records should later live in the central document library and link back to customer, vehicle, and opportunity.</p>
            <div className={styles.rentalEvidenceGrid}>
              {TEST_DRIVE_DOCUMENT_REQUIREMENTS.map((item) => (
                <label className={documents[item.id] ? styles.rentalEvidenceCaptured : undefined} key={item.id}>
                  <span>{item.label}</span>
                  <strong>{documents[item.id] ?? "Document required"}</strong>
                  <small>{item.helper}</small>
                  <StorageDestination>customer library, vehicle file, and test-drive record</StorageDestination>
                  <input accept="application/pdf,image/*" capture={item.id === "td-signed-release" ? undefined : "environment"} onChange={(event) => captureEvidence(setDocuments, item.id, event.currentTarget.files?.[0])} type="file" />
                </label>
              ))}
            </div>
          </section>
          <section>
            <h3>Release photos</h3>
            <p>Capture the vehicle condition before the test drive begins.</p>
            <div className={styles.rentalEvidenceGrid}>
              {TEST_DRIVE_RELEASE_REQUIREMENTS.map((item) => (
                <label className={releasePhotos[item.id] ? styles.rentalEvidenceCaptured : undefined} key={item.id}>
                  <span>{item.label}</span>
                  <strong>{releasePhotos[item.id] ?? "Photo required"}</strong>
                  <small>{item.helper}</small>
                  <StorageDestination>vehicle file and test-drive record</StorageDestination>
                  <input accept="image/*" capture="environment" onChange={(event) => captureEvidence(setReleasePhotos, item.id, event.currentTarget.files?.[0])} type="file" />
                </label>
              ))}
            </div>
          </section>
          <section>
            <h3>Return / receiving photos</h3>
            <p>Complete receiving after the customer returns with mileage, fuel, interior, and damage review recorded.</p>
            <div className={styles.rentalEvidenceGrid}>
              {TEST_DRIVE_RETURN_REQUIREMENTS.map((item) => (
                <label className={returnPhotos[item.id] ? styles.rentalEvidenceCaptured : undefined} key={item.id}>
                  <span>{item.label}</span>
                  <strong>{returnPhotos[item.id] ?? "Photo required"}</strong>
                  <small>{item.helper}</small>
                  <StorageDestination>vehicle file and receiving record</StorageDestination>
                  <input accept="image/*" capture="environment" onChange={(event) => captureEvidence(setReturnPhotos, item.id, event.currentTarget.files?.[0])} type="file" />
                </label>
              ))}
            </div>
            <div className={styles.retailNextActionBar} aria-label="Test drive receiving next actions">
              <div>
                <span>Receiving readiness</span>
                <strong>{returnReceived ? "Test drive received with evidence" : returnPhotosReady ? "Ready to receive vehicle" : `${returnPhotoCount}/${TEST_DRIVE_RETURN_REQUIREMENTS.length} return photos ready`}</strong>
              </div>
              <button disabled={!returnPhotosReady || returnReceived} onClick={() => setReturnReceived(true)} type="button">{returnReceived ? "Return received" : "Complete receiving"}</button>
            </div>
          </section>
        </div>
      </section>

      <section className={styles.retailSection} id="test-drive-checkout">
        <header>
          <span>Checkout controls</span>
          <strong>Release only after driver, document, and photo gates are ready</strong>
        </header>
        <div className={styles.rentalReadinessGrid}>
          {[
            ["Customer", customerName !== "Customer not selected" ? "Selected" : "Needs customer"],
            ["Vehicle", vehicle.trim() ? "Assigned" : "Needs vehicle"],
            ["Driver", driverReady ? "Verified" : "Needs license / insurance"],
            ["Signed form", documentsReady ? "Recorded" : "Needs documents"],
            ["Release photos", releasePhotosReady ? "Captured" : "Needs photos"],
            ["Return plan", facts.returnTime ? "Scheduled" : "Needs return time"]
          ].map(([label, value]) => (
            <div key={label}>
              <span>{label}</span>
              <strong>{value}</strong>
            </div>
          ))}
        </div>
        <div className={styles.retailNextActionBar} aria-label="Test drive next actions">
          <div>
            <span>Test-drive readiness</span>
            <strong>{releaseReady ? "Ready to start test drive" : "Complete driver, signed form, and release photos"}</strong>
            <CompletionGateList missing={testDriveMissingGates} />
          </div>
          <button type="button" onClick={onSaveDraft}>Save test-drive draft</button>
          <button disabled={!releaseReady || statusKind === "saving"} onClick={onComplete} type="button">{statusKind === "saving" ? "Completing..." : "Start test drive"}</button>
        </div>
      </section>
    </div>
  );
}

function WholesaleExecutionDesk({
  amount,
  customerName,
  onAmountChange,
  onComplete,
  onSaveDraft,
  onVehicleChange,
  statusKind,
  vehicle
}: {
  amount: string;
  customerName: string;
  onAmountChange: (value: string) => void;
  onComplete: () => void;
  onSaveDraft: () => void;
  onVehicleChange: (value: string) => void;
  statusKind: "idle" | "saving" | "success" | "error";
  vehicle: string;
}) {
  const [packet, setPacket] = useState<Record<string, string>>({});
  const [evidence, setEvidence] = useState<Record<string, string>>({});
  const [handoff, setHandoff] = useState<Record<string, boolean>>({});
  const [buyer, setBuyer] = useState({
    buyerName: customerName === "Customer not selected" ? "" : customerName,
    contactName: "",
    dealerLicense: "",
    paymentMethod: "Certified funds",
    resaleTaxId: "",
    transportMethod: "Buyer pickup"
  });
  const [terms, setTerms] = useState({
    balanceDue: "",
    deposit: "$0.00",
    releaseDate: todayInputValue(),
    salePrice: amount,
    titleStatus: "Ready",
    wholesaleChannel: "Dealer-to-dealer"
  });
  const [approval, setApproval] = useState({
    belowReserve: false,
    fundingException: false,
    titleException: false,
    transportException: false
  });

  const salePriceCents = dollarsToCents(terms.salePrice);
  const depositCents = dollarsToCents(terms.deposit);
  const balanceDueCents = Math.max(0, (Number.isFinite(salePriceCents) && salePriceCents !== null ? salePriceCents : 0) - (Number.isFinite(depositCents) && depositCents !== null ? depositCents : 0));
  const packetRequirements = WHOLESALE_PACKET_REQUIREMENTS.filter((item) => item.id !== "power-of-attorney" || terms.titleStatus !== "Ready");
  const packetCount = packetRequirements.filter((item) => packet[item.id]).length;
  const evidenceCount = WHOLESALE_EVIDENCE_REQUIREMENTS.filter((item) => evidence[item.id]).length;
  const handoffCount = WHOLESALE_HANDOFF_REQUIREMENTS.filter((item) => handoff[item]).length;
  const approvalTriggers = Object.values(approval).filter(Boolean).length;
  const packetReady = packetCount === packetRequirements.length;
  const evidenceReady = evidenceCount === WHOLESALE_EVIDENCE_REQUIREMENTS.length;
  const handoffReady = handoffCount === WHOLESALE_HANDOFF_REQUIREMENTS.length;
  const buyerReady = Boolean((buyer.buyerName || customerName).trim() && buyer.contactName.trim() && buyer.dealerLicense.trim());
  const termsReady = Boolean(terms.salePrice.trim() && terms.balanceDue.trim() && terms.releaseDate.trim());
  const wholesaleReady = Boolean(buyerReady && vehicle.trim() && termsReady && packetReady && evidenceReady && handoffReady && approvalTriggers === 0);
  const wholesaleMissingGates = [
    { label: "Buyer authority verified", ready: buyerReady },
    { label: "Vehicle assigned", ready: Boolean(vehicle.trim()) },
    { label: "Wholesale terms complete", ready: termsReady },
    { label: "Wholesale packet stored", ready: packetReady },
    { label: "Release evidence stored", ready: evidenceReady },
    { label: "Manager reviews clear", ready: approvalTriggers === 0 },
    { label: "Release handoff complete", ready: handoffReady }
  ].filter((gate) => !gate.ready).map((gate) => gate.label);

  function updateTerms(key: keyof typeof terms, value: string) {
    const next = { ...terms, [key]: value };
    setTerms(next);
    if (key === "salePrice" || key === "deposit") {
      const nextSalePrice = dollarsToCents(next.salePrice);
      const nextDeposit = dollarsToCents(next.deposit);
      const nextBalance = Math.max(0, (Number.isFinite(nextSalePrice) && nextSalePrice !== null ? nextSalePrice : 0) - (Number.isFinite(nextDeposit) && nextDeposit !== null ? nextDeposit : 0));
      setTerms({ ...next, balanceDue: formatCurrency(nextBalance) });
      onAmountChange(formatCurrency(Number.isFinite(nextSalePrice) && nextSalePrice !== null ? nextSalePrice : 0));
      return;
    }
    if (key === "titleStatus") {
      setApproval((current) => ({ ...current, titleException: value !== "Ready" }));
    }
  }

  function captureEvidence(
    setter: (value: SetStateAction<Record<string, string>>) => void,
    id: string,
    file?: File
  ) {
    if (!file) return;
    setter((current) => ({ ...current, [id]: file.name }));
  }

  return (
    <div className={styles.retailExecutionDesk}>
      <section className={styles.retailSection} id="wholesale-buyer">
        <header>
          <span>Wholesale buyer</span>
          <strong>Confirm buyer authority before packet release</strong>
        </header>
        <div className={styles.retailFieldGrid}>
          <label><span>Buyer / dealer</span><input value={buyer.buyerName} onChange={(event) => setBuyer((current) => ({ ...current, buyerName: event.target.value }))} placeholder="Dealer, wholesaler, or buyer name" /></label>
          <label><span>Contact name</span><input value={buyer.contactName} onChange={(event) => setBuyer((current) => ({ ...current, contactName: event.target.value }))} /></label>
          <label><span>Dealer license / buyer ID</span><input value={buyer.dealerLicense} onChange={(event) => setBuyer((current) => ({ ...current, dealerLicense: event.target.value }))} /></label>
          <label><span>Resale tax ID</span><input value={buyer.resaleTaxId} onChange={(event) => setBuyer((current) => ({ ...current, resaleTaxId: event.target.value }))} /></label>
          <label><span>Payment method</span><select value={buyer.paymentMethod} onChange={(event) => setBuyer((current) => ({ ...current, paymentMethod: event.target.value }))}><option>Certified funds</option><option>Wire transfer</option><option>Floorplan / dealer draft</option><option>ACH</option><option>Manager-approved terms</option></select></label>
          <label><span>Transport method</span><select value={buyer.transportMethod} onChange={(event) => setBuyer((current) => ({ ...current, transportMethod: event.target.value }))}><option>Buyer pickup</option><option>Carrier pickup</option><option>Dealer delivery</option><option>Auction / lane transfer</option><option>Manager exception</option></select></label>
        </div>
      </section>

      <section className={styles.retailSection} id="wholesale-vehicle">
        <header>
          <span>Vehicle and title</span>
          <strong>Bind wholesale paperwork to the exact unit and release status</strong>
        </header>
        <div className={styles.retailFieldGrid}>
          <VehicleIdentityDetails vehicle={vehicle} onVehicleChange={onVehicleChange} />
          <label><span>Wholesale channel</span><select value={terms.wholesaleChannel} onChange={(event) => updateTerms("wholesaleChannel", event.target.value)}><option>Dealer-to-dealer</option><option>Auction / lane sale</option><option>Outside wholesaler</option><option>Export / broker</option><option>Manager-approved disposition</option></select></label>
          <label><span>Title status</span><select value={terms.titleStatus} onChange={(event) => updateTerms("titleStatus", event.target.value)}><option>Ready</option><option>Title pending</option><option>Lien release pending</option><option>Duplicate title needed</option><option>Manager exception</option></select></label>
          <label><span>Release date</span><input type="date" value={terms.releaseDate} onChange={(event) => updateTerms("releaseDate", event.target.value)} /></label>
        </div>
      </section>

      <section className={styles.retailSection} id="wholesale-terms">
        <header>
          <span>Wholesale terms</span>
          <strong>Capture price, deposit, balance, and funding readiness</strong>
        </header>
        <div className={styles.retailFieldGrid}>
          <label><span>Wholesale price</span><input value={terms.salePrice} onChange={(event) => updateTerms("salePrice", event.target.value)} placeholder="$0.00" /></label>
          <label><span>Deposit / partial payment</span><input value={terms.deposit} onChange={(event) => updateTerms("deposit", event.target.value)} /></label>
          <label><span>Balance due</span><input value={terms.balanceDue || formatCurrency(balanceDueCents)} onChange={(event) => updateTerms("balanceDue", event.target.value)} /></label>
          <label><span>Funding status</span><select onChange={(event) => setApproval((current) => ({ ...current, fundingException: event.target.value !== "Verified" }))}><option>Verified</option><option>Pending wire</option><option>Pending floorplan</option><option>Manager-approved release before funds</option></select></label>
        </div>
        <div className={styles.rentalSummaryStrip}>
          <div><span>Wholesale price</span><strong>{terms.salePrice || "$0.00"}</strong></div>
          <div><span>Deposit</span><strong>{terms.deposit}</strong></div>
          <div><span>Balance</span><strong>{terms.balanceDue || formatCurrency(balanceDueCents)}</strong></div>
          <div><span>Release</span><strong>{terms.releaseDate || "Not set"}</strong></div>
          <button type="button" onClick={() => onAmountChange(formatCurrency(Number.isFinite(salePriceCents) && salePriceCents !== null ? salePriceCents : 0))}>Use wholesale price</button>
        </div>
      </section>

      <section className={styles.retailSection} id="wholesale-packet">
        <header>
          <span>Wholesale packet</span>
          <strong>Signed packet and release evidence</strong>
        </header>
        <div className={styles.rentalEvidenceSummary}>
          <div><span>Packet docs</span><strong>{packetCount}/{packetRequirements.length}</strong><small>{packetReady ? "Ready" : "Required before release"}</small></div>
          <div><span>Evidence</span><strong>{evidenceCount}/{WHOLESALE_EVIDENCE_REQUIREMENTS.length}</strong><small>{evidenceReady ? "Recorded" : "Required before release"}</small></div>
          <div><span>Handoff</span><strong>{handoffCount}/{WHOLESALE_HANDOFF_REQUIREMENTS.length}</strong><small>{handoffReady ? "Ready" : "Required before completion"}</small></div>
        </div>
        <div className={styles.rentalEvidenceBoard}>
          <section>
            <h3>Required wholesale documents</h3>
            <p>Record the official wholesale packet once, then show it here as the deal-jacket view from the future document library.</p>
            <div className={styles.rentalEvidenceGrid}>
              {packetRequirements.map((item) => (
                <label className={packet[item.id] ? styles.rentalEvidenceCaptured : undefined} key={item.id}>
                  <span>{item.label}</span>
                  <strong>{packet[item.id] ?? "Document required"}</strong>
                  <small>{item.helper}</small>
                  <StorageDestination>wholesale packet, deal jacket, and customer library</StorageDestination>
                  <input accept="application/pdf,image/*" onChange={(event) => captureEvidence(setPacket, item.id, event.currentTarget.files?.[0])} type="file" />
                </label>
              ))}
            </div>
          </section>
          <section>
            <h3>Release evidence</h3>
            <p>Buyer authority, funding, title, condition, and transport proof must be attached before the unit leaves custody.</p>
            <div className={styles.rentalEvidenceGrid}>
              {WHOLESALE_EVIDENCE_REQUIREMENTS.map((item) => (
                <label className={evidence[item.id] ? styles.rentalEvidenceCaptured : undefined} key={item.id}>
                  <span>{item.label}</span>
                  <strong>{evidence[item.id] ?? "Evidence required"}</strong>
                  <small>{item.helper}</small>
                  <StorageDestination>vehicle file, release record, and wholesale deal jacket</StorageDestination>
                  <input accept="application/pdf,image/*" capture="environment" onChange={(event) => captureEvidence(setEvidence, item.id, event.currentTarget.files?.[0])} type="file" />
                </label>
              ))}
            </div>
          </section>
        </div>
      </section>

      <section className={styles.retailSection} id="wholesale-approval">
        <header>
          <span>Release approval</span>
          <strong>Wholesale exceptions must clear before release</strong>
        </header>
        <div className={styles.rentalReadinessGrid}>
          {[
            ["Below reserve", approval.belowReserve],
            ["Funding", approval.fundingException],
            ["Title", approval.titleException],
            ["Transport", approval.transportException]
          ].map(([label, flagged]) => (
            <div key={String(label)}>
              <span>{label}</span>
              <strong>{flagged ? "Manager review" : "Clear"}</strong>
            </div>
          ))}
          <div>
            <span>Approval status</span>
            <strong>{approvalTriggers === 0 ? "Clear" : `${approvalTriggers} review trigger(s)`}</strong>
          </div>
          <div>
            <span>Buyer authority</span>
            <strong>{buyerReady ? "Verified" : "Needs buyer proof"}</strong>
          </div>
        </div>
        <div className={styles.retailActionRow}>
          <button aria-pressed={approval.belowReserve} type="button" onClick={() => setApproval((current) => ({ ...current, belowReserve: !current.belowReserve }))}>{approval.belowReserve ? "Below-reserve review active" : "Mark below-reserve review"}</button>
          <button aria-pressed={approval.transportException} type="button" onClick={() => setApproval((current) => ({ ...current, transportException: !current.transportException }))}>{approval.transportException ? "Transport review active" : "Mark transport review"}</button>
        </div>
      </section>

      <section className={styles.retailSection} id="wholesale-handoff">
        <header>
          <span>Wholesale release</span>
          <strong>Confirm funds, title, keys, transport, and archive</strong>
        </header>
        <div className={styles.rentalEvidenceGrid}>
          {WHOLESALE_HANDOFF_REQUIREMENTS.map((item) => (
            <label className={handoff[item] ? styles.rentalEvidenceCaptured : undefined} key={item}>
              <span>Release gate</span>
              <strong>{item}</strong>
              <small>{handoff[item] ? "Ready" : "Required before completion"}</small>
              <input checked={Boolean(handoff[item])} onChange={(event) => setHandoff((current) => ({ ...current, [item]: event.target.checked }))} type="checkbox" />
            </label>
          ))}
        </div>
        <div className={styles.retailNextActionBar} aria-label="Wholesale packet next actions">
          <div>
            <span>Wholesale readiness</span>
            <strong>{wholesaleReady ? "Ready to complete wholesale packet" : "Complete buyer, terms, packet, evidence, approval, and release gates"}</strong>
            <CompletionGateList missing={wholesaleMissingGates} />
          </div>
          <button type="button" onClick={onSaveDraft}>Save wholesale draft</button>
          <button disabled={!wholesaleReady || statusKind === "saving"} onClick={onComplete} type="button">{statusKind === "saving" ? "Completing..." : "Complete wholesale packet"}</button>
        </div>
      </section>
    </div>
  );
}

function OutsideFinanceExecutionDesk({
  amount,
  customerName,
  onAmountChange,
  onComplete,
  onSaveDraft,
  onVehicleChange,
  statusKind,
  vehicle
}: {
  amount: string;
  customerName: string;
  onAmountChange: (value: string) => void;
  onComplete: () => void;
  onSaveDraft: () => void;
  onVehicleChange: (value: string) => void;
  statusKind: "idle" | "saving" | "success" | "error";
  vehicle: string;
}) {
  const [packet, setPacket] = useState<Record<string, string>>({});
  const [evidence, setEvidence] = useState<Record<string, string>>({});
  const [handoff, setHandoff] = useState<Record<string, boolean>>({});
  const [funding, setFunding] = useState({
    approvalNumber: "",
    fundingPath: "Outside finance",
    lenderName: "",
    lienholderAddress: "",
    onePayReference: "",
    stipulations: ""
  });
  const [terms, setTerms] = useState({
    amountDueAtDelivery: "$0.00",
    downPayment: "$0.00",
    expectedFundingDate: todayInputValue(),
    salePrice: amount,
    tradePayoff: "$0.00"
  });
  const [approval, setApproval] = useState({
    deliveryBeforeFunding: false,
    insuranceException: false,
    lienholderException: false,
    stipulationOpen: false,
    titleException: false
  });
  const [titleAuthorityNeeded, setTitleAuthorityNeeded] = useState(false);

  const packetRequirements = OUTSIDE_FINANCE_PACKET_REQUIREMENTS.filter((item) => (
    (item.id !== "personal-references" || !["Cashier's check", "One pay"].includes(funding.fundingPath))
    && (item.id !== "power-of-attorney" || titleAuthorityNeeded || approval.titleException)
  ));
  const salePriceCents = dollarsToCents(terms.salePrice);
  const downPaymentCents = dollarsToCents(terms.downPayment);
  const tradePayoffCents = dollarsToCents(terms.tradePayoff);
  const fundedAmountCents = Math.max(0, (Number.isFinite(salePriceCents) && salePriceCents !== null ? salePriceCents : 0) - (Number.isFinite(downPaymentCents) && downPaymentCents !== null ? downPaymentCents : 0) + (Number.isFinite(tradePayoffCents) && tradePayoffCents !== null ? tradePayoffCents : 0));
  const packetCount = packetRequirements.filter((item) => packet[item.id]).length;
  const evidenceCount = OUTSIDE_FINANCE_EVIDENCE_REQUIREMENTS.filter((item) => evidence[item.id]).length;
  const handoffCount = OUTSIDE_FINANCE_HANDOFF_REQUIREMENTS.filter((item) => handoff[item]).length;
  const approvalTriggers = Object.values(approval).filter(Boolean).length;
  const packetReady = packetCount === packetRequirements.length;
  const evidenceReady = evidenceCount === OUTSIDE_FINANCE_EVIDENCE_REQUIREMENTS.length;
  const handoffReady = handoffCount === OUTSIDE_FINANCE_HANDOFF_REQUIREMENTS.length;
  const fundingReady = funding.fundingPath === "One pay"
    ? Boolean(funding.onePayReference.trim())
    : Boolean(funding.lenderName.trim() && funding.approvalNumber.trim());
  const termsReady = Boolean(terms.salePrice.trim() && terms.expectedFundingDate.trim());
  const outsideFinanceReady = Boolean(customerName !== "Customer not selected" && vehicle.trim() && fundingReady && termsReady && packetReady && evidenceReady && handoffReady && approvalTriggers === 0);
  const outsideFinanceMissingGates = [
    { label: "Customer selected", ready: customerName !== "Customer not selected" },
    { label: "Vehicle assigned", ready: Boolean(vehicle.trim()) },
    { label: "Funding path verified", ready: fundingReady },
    { label: "Funding terms complete", ready: termsReady },
    { label: "Outside finance packet stored", ready: packetReady },
    { label: "Funding evidence stored", ready: evidenceReady },
    { label: "Manager reviews clear", ready: approvalTriggers === 0 },
    { label: "Funding handoff complete", ready: handoffReady }
  ].filter((gate) => !gate.ready).map((gate) => gate.label);

  function updateTerms(key: keyof typeof terms, value: string) {
    const next = { ...terms, [key]: value };
    setTerms(next);
    if (key === "salePrice" || key === "downPayment" || key === "tradePayoff") {
      const nextSalePrice = dollarsToCents(next.salePrice);
      const nextDownPayment = dollarsToCents(next.downPayment);
      const nextTradePayoff = dollarsToCents(next.tradePayoff);
      const nextFundedAmount = Math.max(0, (Number.isFinite(nextSalePrice) && nextSalePrice !== null ? nextSalePrice : 0) - (Number.isFinite(nextDownPayment) && nextDownPayment !== null ? nextDownPayment : 0) + (Number.isFinite(nextTradePayoff) && nextTradePayoff !== null ? nextTradePayoff : 0));
      onAmountChange(formatCurrency(nextFundedAmount));
    }
  }

  function captureEvidence(
    setter: (value: SetStateAction<Record<string, string>>) => void,
    id: string,
    file?: File
  ) {
    if (!file) return;
    setter((current) => ({ ...current, [id]: file.name }));
  }

  return (
    <div className={styles.retailExecutionDesk}>
      <section className={styles.retailSection} id="outside-funding">
        <header>
          <span>Funding path</span>
          <strong>Confirm lender, one-pay, and stipulation authority</strong>
        </header>
        <div className={styles.retailFieldGrid}>
          <label><span>Customer</span><input readOnly value={customerName} /></label>
          <CustomerIdentityDetails includeCreditFields />
          <label><span>Funding path</span><select value={funding.fundingPath} onChange={(event) => setFunding((current) => ({ ...current, fundingPath: event.target.value }))}><option>Outside finance</option><option>One pay</option><option>Credit union</option><option>Bank draft</option><option>Cashier&apos;s check</option></select></label>
          <label><span>Lender / bank</span><input value={funding.lenderName} onChange={(event) => setFunding((current) => ({ ...current, lenderName: event.target.value }))} /></label>
          <label><span>Approval / draft #</span><input value={funding.approvalNumber} onChange={(event) => setFunding((current) => ({ ...current, approvalNumber: event.target.value }))} /></label>
          <label><span>One-pay reference</span><input value={funding.onePayReference} onChange={(event) => setFunding((current) => ({ ...current, onePayReference: event.target.value }))} placeholder="Wire, receipt, cashier check, or full-pay proof" /></label>
          <label><span>Lienholder address</span><input value={funding.lienholderAddress} onChange={(event) => setFunding((current) => ({ ...current, lienholderAddress: event.target.value }))} /></label>
          <label className={styles.retailWide}><span>Stipulations</span><textarea value={funding.stipulations} onChange={(event) => setFunding((current) => ({ ...current, stipulations: event.target.value }))} placeholder="Open lender stipulations, one-pay conditions, callback notes, or funding holds" rows={3} /></label>
        </div>
      </section>

      <section className={styles.retailSection} id="outside-vehicle">
        <header>
          <span>Vehicle and title</span>
          <strong>Bind funding proof to the exact vehicle and lienholder path</strong>
        </header>
        <div className={styles.retailFieldGrid}>
          <VehicleIdentityDetails vehicle={vehicle} onVehicleChange={onVehicleChange} />
          <label><span>Title status</span><select onChange={(event) => setApproval((current) => ({ ...current, titleException: event.target.value !== "Ready" }))}><option>Ready</option><option>Title work pending</option><option>Lien release pending</option><option>Manager exception</option></select></label>
          <label><span>Insurance status</span><select onChange={(event) => setApproval((current) => ({ ...current, insuranceException: event.target.value !== "Verified" }))}><option>Verified</option><option>Binder pending</option><option>Needs lienholder correction</option><option>Manager exception</option></select></label>
          <label><span>Lienholder status</span><select onChange={(event) => setApproval((current) => ({ ...current, lienholderException: event.target.value !== "Recorded" }))}><option>Recorded</option><option>Needs address</option><option>Needs lender confirmation</option><option>Not applicable - one pay</option></select></label>
          <label><span>Title authority</span><select value={titleAuthorityNeeded ? "Needed" : "Not needed"} onChange={(event) => setTitleAuthorityNeeded(event.target.value === "Needed")}><option>Not needed</option><option>Needed</option></select></label>
        </div>
      </section>

      <section className={styles.retailSection} id="outside-trade">
        <header>
          <span>Trade-in info</span>
          <strong>Capture payoff and title context before outside funding release</strong>
        </header>
        <TradeInDetails />
      </section>

      <section className={styles.retailSection} id="outside-terms">
        <header>
          <span>Funding terms</span>
          <strong>Track funded amount and amount due at delivery</strong>
        </header>
        <div className={styles.retailFieldGrid}>
          <label><span>Sale price</span><input value={terms.salePrice} onChange={(event) => updateTerms("salePrice", event.target.value)} placeholder="$0.00" /></label>
          <label><span>Down payment</span><input value={terms.downPayment} onChange={(event) => updateTerms("downPayment", event.target.value)} /></label>
          <label><span>Trade payoff</span><input value={terms.tradePayoff} onChange={(event) => updateTerms("tradePayoff", event.target.value)} /></label>
          <label><span>Funded amount</span><input readOnly value={formatCurrency(fundedAmountCents)} /></label>
          <label><span>Amount due at delivery</span><input value={terms.amountDueAtDelivery} onChange={(event) => updateTerms("amountDueAtDelivery", event.target.value)} /></label>
          <label><span>Expected funding date</span><input type="date" value={terms.expectedFundingDate} onChange={(event) => updateTerms("expectedFundingDate", event.target.value)} /></label>
        </div>
        <div className={styles.rentalSummaryStrip}>
          <div><span>Funded amount</span><strong>{formatCurrency(fundedAmountCents)}</strong></div>
          <div><span>Due at delivery</span><strong>{terms.amountDueAtDelivery}</strong></div>
          <div><span>Funding path</span><strong>{funding.fundingPath}</strong></div>
          <div><span>Funding date</span><strong>{terms.expectedFundingDate || "Not set"}</strong></div>
          <button type="button" onClick={() => onAmountChange(formatCurrency(fundedAmountCents))}>Use funded amount</button>
        </div>
      </section>

      <section className={styles.retailSection} id="outside-packet">
        <header>
          <span>Outside finance packet</span>
          <strong>Funding documents, stipulations, and delivery evidence</strong>
        </header>
        <div className={styles.rentalEvidenceSummary}>
          <div><span>Packet docs</span><strong>{packetCount}/{packetRequirements.length}</strong><small>{packetReady ? "Ready" : "Required before delivery"}</small></div>
          <div><span>Evidence</span><strong>{evidenceCount}/{OUTSIDE_FINANCE_EVIDENCE_REQUIREMENTS.length}</strong><small>{evidenceReady ? "Recorded" : "Required before funding release"}</small></div>
          <div><span>Handoff</span><strong>{handoffCount}/{OUTSIDE_FINANCE_HANDOFF_REQUIREMENTS.length}</strong><small>{handoffReady ? "Ready" : "Required before completion"}</small></div>
        </div>
        <div className={styles.rentalEvidenceBoard}>
          <section>
            <h3>Required packet documents</h3>
            <p>Record the outside finance or one-pay packet once. These records should later store in the central document library and show here as the deal-jacket view.</p>
            <div className={styles.rentalEvidenceGrid}>
              {packetRequirements.map((item) => (
                <label className={packet[item.id] ? styles.rentalEvidenceCaptured : undefined} key={item.id}>
                  <span>{item.label}</span>
                  <strong>{packet[item.id] ?? "Document required"}</strong>
                  <small>{item.helper}</small>
                  <StorageDestination>outside finance packet, deal jacket, and customer library</StorageDestination>
                  <input accept="application/pdf,image/*" onChange={(event) => captureEvidence(setPacket, item.id, event.currentTarget.files?.[0])} type="file" />
                </label>
              ))}
            </div>
          </section>
          <section>
            <h3>Funding evidence</h3>
            <p>Approval, stipulations, funding proof, identity, and delivery condition must be recorded before completion.</p>
            <div className={styles.rentalEvidenceGrid}>
              {OUTSIDE_FINANCE_EVIDENCE_REQUIREMENTS.map((item) => (
                <label className={evidence[item.id] ? styles.rentalEvidenceCaptured : undefined} key={item.id}>
                  <span>{item.label}</span>
                  <strong>{evidence[item.id] ?? "Evidence required"}</strong>
                  <small>{item.helper}</small>
                  <StorageDestination>funding packet, vehicle file, and deal jacket</StorageDestination>
                  <input accept="application/pdf,image/*" capture="environment" onChange={(event) => captureEvidence(setEvidence, item.id, event.currentTarget.files?.[0])} type="file" />
                </label>
              ))}
            </div>
          </section>
        </div>
      </section>

      <section className={styles.retailSection} id="outside-approval">
        <header>
          <span>Approval and funding exceptions</span>
          <strong>Clear holds before delivery or funded completion</strong>
        </header>
        <div className={styles.rentalReadinessGrid}>
          {[
            ["Delivery before funding", approval.deliveryBeforeFunding],
            ["Insurance", approval.insuranceException],
            ["Lienholder", approval.lienholderException],
            ["Stipulations", approval.stipulationOpen],
            ["Title", approval.titleException]
          ].map(([label, flagged]) => (
            <div key={String(label)}>
              <span>{label}</span>
              <strong>{flagged ? "Manager review" : "Clear"}</strong>
            </div>
          ))}
          <div>
            <span>Approval status</span>
            <strong>{approvalTriggers === 0 ? "Clear" : `${approvalTriggers} review trigger(s)`}</strong>
          </div>
          <div>
            <span>POA / title authority</span>
            <strong>{titleAuthorityNeeded || approval.titleException ? "Required in packet" : "Not required"}</strong>
          </div>
        </div>
        <div className={styles.retailActionRow}>
          <button aria-pressed={approval.deliveryBeforeFunding} type="button" onClick={() => setApproval((current) => ({ ...current, deliveryBeforeFunding: !current.deliveryBeforeFunding }))}>{approval.deliveryBeforeFunding ? "Delivery review active" : "Mark delivery-before-funding review"}</button>
          <button aria-pressed={approval.stipulationOpen} type="button" onClick={() => setApproval((current) => ({ ...current, stipulationOpen: !current.stipulationOpen }))}>{approval.stipulationOpen ? "Stipulation review active" : "Mark stipulation review"}</button>
        </div>
      </section>

      <section className={styles.retailSection} id="outside-handoff">
        <header>
          <span>Funding handoff</span>
          <strong>Confirm funding, lienholder, title, insurance, and archive</strong>
        </header>
        <div className={styles.rentalEvidenceGrid}>
          {OUTSIDE_FINANCE_HANDOFF_REQUIREMENTS.map((item) => (
            <label className={handoff[item] ? styles.rentalEvidenceCaptured : undefined} key={item}>
              <span>Handoff gate</span>
              <strong>{item}</strong>
              <small>{handoff[item] ? "Ready" : "Required before completion"}</small>
              <input checked={Boolean(handoff[item])} onChange={(event) => setHandoff((current) => ({ ...current, [item]: event.target.checked }))} type="checkbox" />
            </label>
          ))}
        </div>
        <div className={styles.retailNextActionBar} aria-label="Outside finance next actions">
          <div>
            <span>Outside finance readiness</span>
            <strong>{outsideFinanceReady ? "Ready to complete outside finance packet" : "Complete funding, packet, evidence, approval, and handoff gates"}</strong>
            <CompletionGateList missing={outsideFinanceMissingGates} />
          </div>
          <button type="button" onClick={onSaveDraft}>Save outside finance draft</button>
          <button disabled={!outsideFinanceReady || statusKind === "saving"} onClick={onComplete} type="button">{statusKind === "saving" ? "Completing..." : "Complete outside finance packet"}</button>
        </div>
      </section>
    </div>
  );
}

function readDealDraft(customerId: string): CrmNextDealDraft | null {
  if (!customerId || typeof window === "undefined") return null;
  try {
    const stored = window.localStorage.getItem(crmNextDealDraftStorageKey(customerId));
    if (!stored) return null;
    const parsed = JSON.parse(stored) as Partial<CrmNextDealDraft>;
    return {
      amount: parsed.amount ?? "",
      customerId,
      note: parsed.note ?? "",
      ownerUserId: parsed.ownerUserId ?? "",
      vehicle: parsed.vehicle ?? "",
      workflowId: parsed.workflowId ?? "retail-sale"
    };
  } catch {
    return null;
  }
}

export function CrmNextDealStartTool({
  initialCustomerId,
  model
}: {
  initialCustomerId?: string;
  model: CrmNextCommandCenter;
}) {
  const preferredCustomer = model.customers.find((customer) => customer.id === initialCustomerId) ?? model.customers[0] ?? null;
  const initialDraft = preferredCustomer ? readDealDraft(preferredCustomer.id) : null;
  const [workflowId, setWorkflowId] = useState<DealWorkflowId>((initialDraft?.workflowId as DealWorkflowId) || "retail-sale");
  const [selectedPresetId, setSelectedPresetId] = useState("retail-cash-one-pay");
  const [executionOpen, setExecutionOpen] = useState(false);
  const [summaryOpen, setSummaryOpen] = useState(false);
  const [form, setForm] = useState({
    amount: initialDraft?.amount ?? "",
    customerId: preferredCustomer?.id ?? "",
    note: initialDraft?.note ?? "",
    ownerUserId: initialDraft?.ownerUserId || model.userId,
    vehicle: initialDraft?.vehicle ?? ""
  });
  const [status, setStatus] = useState<{ kind: "idle" | "saving" | "success" | "error"; message: string; href?: string }>({ kind: "idle", message: "" });
  const workflow = DEAL_WORKFLOWS.find((item) => item.id === workflowId) ?? DEAL_WORKFLOWS[0];
  const financeWorkflow = workflow.id === "finance";
  const bhphWorkflow = workflow.id === "bhph";
  const rentalLikeWorkflow = workflow.id === "daily-rental" || workflow.id === "vehicle-loaner";
  const testDriveWorkflow = workflow.id === "test-drive";
  const wholesaleWorkflow = workflow.id === "wholesale";
  const outsideFinanceWorkflow = workflow.id === "outside-finance-one-pay";
  const nonRevenueWorkflow = workflow.id === "vehicle-loaner" || testDriveWorkflow;
  const selectedCustomer = model.customers.find((customer) => customer.id === form.customerId) ?? model.customers[0] ?? null;
  const estimatedValueCents = useMemo(() => dollarsToCents(form.amount), [form.amount]);
  const effectiveAmount = testDriveWorkflow && !form.amount.trim() ? "$0.00" : form.amount;
  const effectiveEstimatedValueCents = testDriveWorkflow && !form.amount.trim() ? 0 : estimatedValueCents;
  const completedCount = useMemo(() => [form.customerId, form.vehicle, effectiveAmount].filter((value) => value.trim()).length, [effectiveAmount, form.customerId, form.vehicle]);
  const ready = completedCount === 3 && Boolean(form.ownerUserId) && Number.isFinite(effectiveEstimatedValueCents);
  const readinessLabel = ready ? "Ready to execute" : `${completedCount}/3 ready`;
  const selectedPreset = DEAL_START_PRESETS.find((preset) => preset.id === selectedPresetId) ?? DEAL_START_PRESETS[0];

  function update(key: keyof typeof form, value: string) {
    setForm((current) => ({ ...current, [key]: value }));
  }

  function updateCustomer(customerId: string) {
    const draft = readDealDraft(customerId);
    setForm((current) => ({
      ...current,
      amount: draft?.amount ?? "",
      customerId,
      note: draft?.note ?? "",
      ownerUserId: draft?.ownerUserId || current.ownerUserId || model.userId,
      vehicle: draft?.vehicle ?? ""
    }));
    if (draft?.workflowId) setWorkflowId(draft.workflowId as DealWorkflowId);
  }

  function applyPreset(preset: DealStartPreset) {
    setSelectedPresetId(preset.id);
    setWorkflowId(preset.workflowId);
    setExecutionOpen(false);
    setStatus({ kind: "idle", message: "" });
  }

  function saveDraft() {
    setStatus({ kind: "success", message: "Draft saved. Complete intake when the required facts are ready." });
  }

  useEffect(() => {
    if (!form.customerId || typeof window === "undefined") return;
    if (![form.amount, form.note, form.vehicle].some((value) => value.trim())) return;
    const draft: CrmNextDealDraft = {
      ...form,
      workflowId
    };
    window.localStorage.setItem(crmNextDealDraftStorageKey(form.customerId), JSON.stringify(draft));
  }, [form, workflowId]);

  async function startDeal() {
    if (!ready || !selectedCustomer || typeof effectiveEstimatedValueCents !== "number") return;
    setStatus({ kind: "saving", message: "Starting deal..." });
    const response = await fetch("/api/crm/v1/opportunities", {
      body: JSON.stringify({
        customerId: selectedCustomer.id,
        estimatedValueCents: effectiveEstimatedValueCents,
        idempotencyKey: crypto.randomUUID(),
        nextActionDueAt: tomorrowIso(),
        nextActionLabel: `Execute ${workflow.label} workflow for ${selectedCustomer.name}`,
        ownerUserId: form.ownerUserId,
        summary: [
          `${nonRevenueWorkflow ? "Workflow" : "Revenue channel"}: ${workflow.label}`,
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

      {!executionOpen ? (
        <>
          <section className={styles.dealPresetRail} aria-label="Start Deal presets">
            <header>
              <span className={styles.eyebrow}>Start Deal presets</span>
              <strong>Choose the common path first</strong>
            </header>
            <div>
              {DEAL_START_PRESETS.map((preset) => (
                <button
                  aria-pressed={selectedPresetId === preset.id}
                  key={preset.id}
                  onClick={() => applyPreset(preset)}
                  type="button"
                >
                  <span>{preset.label}</span>
                  <small>{preset.helper}</small>
                </button>
              ))}
            </div>
          </section>

          <section className={styles.executionCommandStrip} aria-label="Revenue execution command">
            <div>
              <span>{workflow.label}</span>
              <strong>{readinessLabel}</strong>
              <small>{workflow.nextWorkspace}</small>
            </div>
            <div className={styles.executionStatusChips} aria-label="Retail execution checks">
              {(financeWorkflow ? ["Applicant", "Lender", "Stips", "Funding"] : outsideFinanceWorkflow ? ["Funding", "Stips", "Title", "Handoff"] : wholesaleWorkflow ? ["Buyer", "Funding", "Title", "Release"] : bhphWorkflow ? ["Proof", "Terms", "Paperwork", "Handoff"] : testDriveWorkflow ? ["License", "Signed form", "Vehicle", "Return plan"] : rentalLikeWorkflow ? ["License", workflow.id === "vehicle-loaner" ? "Courtesy waiver" : "Payment hold", workflow.id === "vehicle-loaner" ? "Loaner unit" : "Vehicle", "Return plan"] : ["Identity", "Vehicle", "Funding", "Delivery"]).map((item) => <span key={item}>{item}</span>)}
            </div>
            <button type="button" onClick={() => setSummaryOpen(true)}>Execution Summary</button>
            <button onClick={() => setExecutionOpen(true)} type="button">
              Open execution path
            </button>
          </section>
        </>
      ) : (
        <section className={styles.dealExecutionHeader} aria-label="Open execution desk">
          <div>
            <span className={styles.eyebrow}>Execution desk</span>
            <h2>{workflow.label}</h2>
            <p>{workflow.nextWorkspace} · {DEAL_PACKET_RULES[workflow.id].packetName}</p>
            <div className={styles.dealExecutionMeta}>
              <span>{ready ? "Open facts ready" : `${completedCount}/3 open facts ready`}</span>
              <span>Complete gates inside desk</span>
            </div>
          </div>
          <div className={styles.executionStatusChips} aria-label="Open execution checks">
            {(financeWorkflow ? ["Applicant", "Lender", "Stips", "Funding"] : outsideFinanceWorkflow ? ["Funding", "Stips", "Title", "Handoff"] : wholesaleWorkflow ? ["Buyer", "Funding", "Title", "Release"] : bhphWorkflow ? ["Proof", "Terms", "Paperwork", "Handoff"] : testDriveWorkflow ? ["License", "Signed form", "Vehicle", "Return plan"] : rentalLikeWorkflow ? ["License", workflow.id === "vehicle-loaner" ? "Courtesy waiver" : "Payment hold", workflow.id === "vehicle-loaner" ? "Loaner unit" : "Vehicle", "Return plan"] : ["Identity", "Vehicle", "Funding", "Delivery"]).map((item) => <span key={item}>{item}</span>)}
          </div>
          <button type="button" onClick={() => setSummaryOpen(true)}>Checks</button>
          <button type="button" onClick={() => setExecutionOpen(false)}>Change path</button>
        </section>
      )}

      {executionOpen ? (
        <nav className={styles.retailSectionJumps} aria-label="Retail sale section jumps">
          {workflow.id === "lease-to-own" ? (
            <>
              <a href="#lease-applicant">Applicant</a>
              <a href="#lease-vehicle">Vehicle</a>
              <a href="#lease-calculator">Calculator</a>
              <a href="#lease-contracts">Forms</a>
            </>
          ) : financeWorkflow ? (
            <>
              <a href="#finance-applicant">Applicant</a>
              <a href="#finance-vehicle">Vehicle</a>
              <a href="#finance-trade">Trade-In</a>
              <a href="#finance-structure">Structure</a>
              <a href="#finance-lender">Lender</a>
              <a href="#finance-packet">Packet</a>
              <a href="#finance-funding">Funding</a>
            </>
          ) : bhphWorkflow ? (
            <>
              <a href="#bhph-buyer">Buyer</a>
              <a href="#bhph-vehicle">Vehicle</a>
              <a href="#bhph-terms">Terms</a>
              <a href="#bhph-paperwork">Paperwork</a>
              <a href="#bhph-approval">Approval</a>
              <a href="#bhph-handoff">Handoff</a>
            </>
          ) : testDriveWorkflow ? (
            <>
              <a href="#test-drive-driver">Driver</a>
              <a href="#test-drive-vehicle">Vehicle</a>
              <a href="#test-drive-evidence">Evidence</a>
              <a href="#test-drive-checkout">Checkout</a>
            </>
          ) : wholesaleWorkflow ? (
            <>
              <a href="#wholesale-buyer">Buyer</a>
              <a href="#wholesale-vehicle">Vehicle</a>
              <a href="#wholesale-terms">Terms</a>
              <a href="#wholesale-packet">Packet</a>
              <a href="#wholesale-approval">Approval</a>
              <a href="#wholesale-handoff">Release</a>
            </>
          ) : outsideFinanceWorkflow ? (
            <>
              <a href="#outside-funding">Funding</a>
              <a href="#outside-vehicle">Vehicle</a>
              <a href="#outside-trade">Trade-In</a>
              <a href="#outside-terms">Terms</a>
              <a href="#outside-packet">Packet</a>
              <a href="#outside-approval">Approval</a>
              <a href="#outside-handoff">Handoff</a>
            </>
          ) : rentalLikeWorkflow ? (
            <>
              <a href="#rental-renter">Renter</a>
              <a href="#rental-window">Dates</a>
              <a href="#rental-unit">Unit</a>
              <a href="#rental-protection">Payment</a>
              <a href="#rental-evidence">Evidence</a>
              <a href="#rental-checkout">Checkout</a>
              <a href="#rental-forms">Forms</a>
            </>
          ) : (
            <>
              <a href="#retail-applicant">Applicant</a>
              <a href="#retail-vehicle">Vehicle</a>
              <a href="#retail-trade">Trade-In</a>
              <a href="#retail-deal">Deal</a>
              <a href="#retail-contracts">Forms</a>
            </>
          )}
          <button type="button" onClick={() => setSummaryOpen(true)}>Checks</button>
          <button type="button" onClick={() => setExecutionOpen(false)}>Change path</button>
        </nav>
      ) : null}

      {!executionOpen ? (
        <EnterpriseDealControlPanel
          amount={effectiveAmount}
          customerName={selectedCustomer?.name ?? "Customer not selected"}
          ownerName={model.userName}
          ready={ready}
          vehicle={form.vehicle}
          workflow={workflow}
        />
      ) : null}

      {!executionOpen ? (
        <section className={styles.dealLaunchDecision} aria-label="Selected execution path">
          <div>
            <span className={styles.eyebrow}>Selected path</span>
            <h2>{selectedPreset?.label ?? workflow.label}</h2>
            <p>{selectedPreset?.helper ?? workflow.intent}</p>
          </div>
          <dl>
            <div><dt>Execution desk</dt><dd>{workflow.nextWorkspace}</dd></div>
            <div><dt>Packet</dt><dd>{DEAL_PACKET_RULES[workflow.id].packetName}</dd></div>
            <div><dt>First required facts</dt><dd>{workflow.required.join(", ")}</dd></div>
          </dl>
          <button type="button" onClick={() => setExecutionOpen(true)}>Open selected desk</button>
        </section>
      ) : (
      <main className={styles.dealExecutionBody}>
          {financeWorkflow ? (
            <>
              <div className={styles.dealStartForm}>
                <label><span>{FIELD_LABELS.customer}</span><select value={form.customerId} onChange={(event) => updateCustomer(event.target.value)}><option value="">Select customer</option>{model.customers.map((customer) => <option key={customer.id} value={customer.id}>{customer.name}</option>)}</select></label>
                <label><span>{FIELD_LABELS.owner}</span><input disabled value={model.userName} /></label>
              </div>
              <DealerFinanceExecutionDesk
                amount={form.amount}
                customerName={selectedCustomer?.name ?? "Customer not selected"}
                onAmountChange={(value) => update("amount", value)}
                onComplete={() => void startDeal()}
                onSaveDraft={saveDraft}
                onVehicleChange={(value) => update("vehicle", value)}
                statusKind={status.kind}
                vehicle={form.vehicle}
              />
              <label className={`${styles.dealStartWide} ${styles.retailNote}`}><span>{FIELD_LABELS.note}</span><textarea value={form.note} onChange={(event) => update("note", event.target.value)} placeholder="Optional context staff needs before working this dealer finance deal" rows={3} /></label>
            </>
          ) : workflow.id === "retail-sale" ? (
            <>
              <div className={styles.dealStartForm}>
                <label><span>{FIELD_LABELS.customer}</span><select value={form.customerId} onChange={(event) => updateCustomer(event.target.value)}><option value="">Select customer</option>{model.customers.map((customer) => <option key={customer.id} value={customer.id}>{customer.name}</option>)}</select></label>
                <label><span>{FIELD_LABELS.owner}</span><input disabled value={model.userName} /></label>
              </div>
              <RetailSaleExecutionDesk
                amount={form.amount}
                customerName={selectedCustomer?.name ?? "Customer not selected"}
                onAmountChange={(value) => update("amount", value)}
                onVehicleChange={(value) => update("vehicle", value)}
                vehicle={form.vehicle}
              />
              <label className={`${styles.dealStartWide} ${styles.retailNote}`}><span>{FIELD_LABELS.note}</span><textarea value={form.note} onChange={(event) => update("note", event.target.value)} placeholder="Optional context staff needs before working this retail sale" rows={3} /></label>
              <div className={styles.retailNextActionBar} aria-label="Retail sale next actions">
                <div>
                  <span>Next action</span>
                  <strong>{ready ? "Ready to complete intake" : "Save now, complete when required facts are ready"}</strong>
                </div>
                <button type="button" onClick={saveDraft}>Save draft</button>
                <button disabled={!ready || status.kind === "saving"} onClick={() => void startDeal()} type="button">
                  {status.kind === "saving" ? "Completing..." : "Complete intake"}
                </button>
              </div>
            </>
          ) : bhphWorkflow ? (
            <>
              <div className={styles.dealStartForm}>
                <label><span>{FIELD_LABELS.customer}</span><select value={form.customerId} onChange={(event) => updateCustomer(event.target.value)}><option value="">Select customer</option>{model.customers.map((customer) => <option key={customer.id} value={customer.id}>{customer.name}</option>)}</select></label>
                <label><span>{FIELD_LABELS.owner}</span><input disabled value={model.userName} /></label>
              </div>
              <BhphExecutionDesk
                amount={form.amount}
                customerName={selectedCustomer?.name ?? "Customer not selected"}
                onAmountChange={(value) => update("amount", value)}
                onComplete={() => void startDeal()}
                onSaveDraft={saveDraft}
                onVehicleChange={(value) => update("vehicle", value)}
                statusKind={status.kind}
                vehicle={form.vehicle}
              />
              <label className={`${styles.dealStartWide} ${styles.retailNote}`}><span>{FIELD_LABELS.note}</span><textarea value={form.note} onChange={(event) => update("note", event.target.value)} placeholder="Optional context staff needs before working this BHPH deal" rows={3} /></label>
            </>
          ) : workflow.id === "lease-to-own" ? (
            <>
              <div className={styles.dealStartForm}>
                <label><span>{FIELD_LABELS.customer}</span><select value={form.customerId} onChange={(event) => updateCustomer(event.target.value)}><option value="">Select customer</option>{model.customers.map((customer) => <option key={customer.id} value={customer.id}>{customer.name}</option>)}</select></label>
                <label><span>{FIELD_LABELS.owner}</span><input disabled value={model.userName} /></label>
              </div>
              <LeaseToOwnExecutionDesk
                customerName={selectedCustomer?.name ?? "Customer not selected"}
                onAmountChange={(value) => update("amount", value)}
                onVehicleChange={(value) => update("vehicle", value)}
                vehicle={form.vehicle}
              />
              <label className={`${styles.dealStartWide} ${styles.retailNote}`}><span>{FIELD_LABELS.note}</span><textarea value={form.note} onChange={(event) => update("note", event.target.value)} placeholder="Optional context staff needs before working this lease-to-own deal" rows={3} /></label>
              <div className={styles.retailNextActionBar} aria-label="Lease-to-own next actions">
                <div>
                  <span>Next action</span>
                  <strong>{ready ? "Ready to complete intake" : "Save now, complete when required facts are ready"}</strong>
                </div>
                <button type="button" onClick={saveDraft}>Save draft</button>
                <button disabled={!ready || status.kind === "saving"} onClick={() => void startDeal()} type="button">
                  {status.kind === "saving" ? "Completing..." : "Complete intake"}
                </button>
              </div>
            </>
          ) : testDriveWorkflow ? (
            <>
              <div className={styles.dealStartForm}>
                <label><span>{FIELD_LABELS.customer}</span><select value={form.customerId} onChange={(event) => updateCustomer(event.target.value)}><option value="">Select customer</option>{model.customers.map((customer) => <option key={customer.id} value={customer.id}>{customer.name}</option>)}</select></label>
                <label><span>{FIELD_LABELS.owner}</span><input disabled value={model.userName} /></label>
              </div>
              <TestDriveExecutionDesk
                customerName={selectedCustomer?.name ?? "Customer not selected"}
                onAmountChange={(value) => update("amount", value)}
                onComplete={() => void startDeal()}
                onSaveDraft={saveDraft}
                onVehicleChange={(value) => update("vehicle", value)}
                statusKind={status.kind}
                vehicle={form.vehicle}
              />
              <label className={`${styles.dealStartWide} ${styles.retailNote}`}><span>{FIELD_LABELS.note}</span><textarea value={form.note} onChange={(event) => update("note", event.target.value)} placeholder="Optional context staff needs before working this test drive" rows={3} /></label>
            </>
          ) : wholesaleWorkflow ? (
            <>
              <div className={styles.dealStartForm}>
                <label><span>Wholesale buyer</span><select value={form.customerId} onChange={(event) => updateCustomer(event.target.value)}><option value="">Select buyer</option>{model.customers.map((customer) => <option key={customer.id} value={customer.id}>{customer.name}</option>)}</select></label>
                <label><span>{FIELD_LABELS.owner}</span><input disabled value={model.userName} /></label>
              </div>
              <WholesaleExecutionDesk
                amount={form.amount}
                customerName={selectedCustomer?.name ?? "Customer not selected"}
                onAmountChange={(value) => update("amount", value)}
                onComplete={() => void startDeal()}
                onSaveDraft={saveDraft}
                onVehicleChange={(value) => update("vehicle", value)}
                statusKind={status.kind}
                vehicle={form.vehicle}
              />
              <label className={`${styles.dealStartWide} ${styles.retailNote}`}><span>{FIELD_LABELS.note}</span><textarea value={form.note} onChange={(event) => update("note", event.target.value)} placeholder="Optional context staff needs before working this wholesale packet" rows={3} /></label>
            </>
          ) : outsideFinanceWorkflow ? (
            <>
              <div className={styles.dealStartForm}>
                <label><span>Customer / buyer</span><select value={form.customerId} onChange={(event) => updateCustomer(event.target.value)}><option value="">Select customer</option>{model.customers.map((customer) => <option key={customer.id} value={customer.id}>{customer.name}</option>)}</select></label>
                <label><span>{FIELD_LABELS.owner}</span><input disabled value={model.userName} /></label>
              </div>
              <OutsideFinanceExecutionDesk
                amount={form.amount}
                customerName={selectedCustomer?.name ?? "Customer not selected"}
                onAmountChange={(value) => update("amount", value)}
                onComplete={() => void startDeal()}
                onSaveDraft={saveDraft}
                onVehicleChange={(value) => update("vehicle", value)}
                statusKind={status.kind}
                vehicle={form.vehicle}
              />
              <label className={`${styles.dealStartWide} ${styles.retailNote}`}><span>{FIELD_LABELS.note}</span><textarea value={form.note} onChange={(event) => update("note", event.target.value)} placeholder="Optional context staff needs before working this outside finance or one-pay deal" rows={3} /></label>
            </>
          ) : rentalLikeWorkflow ? (
            <>
              <div className={styles.dealStartForm}>
                <label><span>{FIELD_LABELS.customer}</span><select value={form.customerId} onChange={(event) => updateCustomer(event.target.value)}><option value="">Select customer</option>{model.customers.map((customer) => <option key={customer.id} value={customer.id}>{customer.name}</option>)}</select></label>
                <label><span>{FIELD_LABELS.owner}</span><input disabled value={model.userName} /></label>
              </div>
              <DailyRentalExecutionDesk
                amount={form.amount}
                customerName={selectedCustomer?.name ?? "Customer not selected"}
                key={workflow.id}
                mode={workflow.id === "vehicle-loaner" ? "vehicle-loaner" : "daily-rental"}
                onAmountChange={(value) => update("amount", value)}
                onComplete={() => void startDeal()}
                onSaveDraft={saveDraft}
                onVehicleChange={(value) => update("vehicle", value)}
                statusKind={status.kind}
                vehicle={form.vehicle}
              />
              <label className={`${styles.dealStartWide} ${styles.retailNote}`}><span>{FIELD_LABELS.note}</span><textarea value={form.note} onChange={(event) => update("note", event.target.value)} placeholder={`Optional context staff needs before working this ${workflow.label.toLowerCase()}`} rows={3} /></label>
            </>
          ) : (
            <div className={styles.dealStartForm}>
              <label><span>{FIELD_LABELS.customer}</span><select value={form.customerId} onChange={(event) => updateCustomer(event.target.value)}><option value="">Select customer</option>{model.customers.map((customer) => <option key={customer.id} value={customer.id}>{customer.name}</option>)}</select></label>
              <label><span>{FIELD_LABELS.vehicle}</span><input value={form.vehicle} onChange={(event) => update("vehicle", event.target.value)} placeholder="Stock, VIN, or vehicle" /></label>
              <label><span>{FIELD_LABELS.amount}</span><input value={form.amount} onChange={(event) => update("amount", event.target.value)} placeholder="$0.00" /></label>
              <label><span>{FIELD_LABELS.owner}</span><input disabled value={model.userName} /></label>
              <label className={styles.dealStartWide}><span>{FIELD_LABELS.note}</span><textarea value={form.note} onChange={(event) => update("note", event.target.value)} placeholder="Optional context staff needs before working this channel" rows={3} /></label>
            </div>
          )}
      </main>
      )}
      {status.kind !== "idle" ? <p className={status.kind === "error" ? styles.dealStartError : styles.dealStartStatus}>{status.message}{status.href ? <> <Link href={status.href}>Open opportunity</Link></> : null}</p> : null}
      {summaryOpen ? (
        <div className={styles.executionDrawerBackdrop} role="presentation">
          <aside className={styles.executionDrawer} aria-label="Execution summary drawer">
            <header>
              <div>
                <span className={styles.eyebrow}>Execution Summary</span>
                <h2>{workflow.label}</h2>
              </div>
              <button type="button" onClick={() => setSummaryOpen(false)}>Close</button>
            </header>
            <ExecutionSummary completedCount={completedCount} onStart={() => void startDeal()} ready={ready} statusKind={status.kind} workflow={workflow} />
            <small>Opens a Unified CRM opportunity through the governed backend command with idempotency, audit, and source checks.</small>
          </aside>
        </div>
      ) : null}
    </section>
  );
}

