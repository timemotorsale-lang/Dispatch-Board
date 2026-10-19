"use client";

import { type ReactNode, type SetStateAction, createContext, useContext, useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { DealDraftWorkspace, DealDraftScope, useDealDraft, useDealDraftState, useArchivedDealPacket } from "./deal-draft-workspace";
import { PacketFeedback, goToDealBlocker } from "./deal-packet-feedback";
import { packetCorrection, requestContractPacket } from "@/lib/deal-packet-feedback";
import { CrmNextVinDecoder, type VinDecoderHandle } from "./crm-next-vin-decoder";
import { SharedDealCustomerPicker, SharedDealVehiclePicker, SharedDealVehicleContext, useCanonicalDealVehicle } from "./shared-deal-identities";
import { VehicleUseTool } from "./vehicle-use-tool";
import { emptyDealIdentity, type DealIdentity, type DealCustomerChoice, type DealVehicleChoice } from "@/lib/deal-continuity";
import identityStyles from "./shared-deal-identities.module.css";
import { TestDriveVehiclePicker } from "./test-drive-vehicle-picker";
import { customerContactValue, type CustomerContactRead } from "@/lib/customer-contact-prefill";
import { fillEmptyDecodeFields } from "@/lib/crm-vehicle-decode";
import { FilePlus2, Eye, Download, Printer, X, CheckCircle2, Circle, ChevronRight, ArrowLeft, Play, Save, Camera, Upload } from "lucide-react";

import { CRM_NEXT_DEALS_HREF } from "@/features/crm/crm-route-authority";
import { BHPH_FORM_PACKET, requiredBhphFormIds } from "@/lib/bhph-form-packet";
import { testDriveFacts, testDriveAgreementError, testDriveDeadline, testDriveDateTime } from "@/lib/test-drive-form-packet";
import { BHPH_WARRANTY_FORM_ID, LEASE_WARRANTY_FORM_ID, dealerWarrantyPosture, dealerWarrantyDetails } from "@/lib/dealer-warranty-policy";
import { COURTESY_LOANER_FORM_PACKET, DAILY_RENTAL_FORM_PACKET, requiredCourtesyLoanerFormIds, requiredDailyRentalFormIds } from "@/lib/daily-rental-form-packet";
import { allLeaseToOwnFormIds, calculateLeaseToOwn, leaseAgreementCalculationError, LEASE_TO_OWN_FORM_PACKET, type LeasePaymentFrequency, type LeaseToOwnCalculatorInput } from "@/lib/lease-to-own-form-packet";
import { MN_SALE_FORM_PACKET } from "@/lib/mn-vehicle-sale-form-packet";
import type { CrmNextCommandCenter } from "@/server/crm-next/read-model";

import styles from "./crm-next-shell.module.css";

const DealDocumentContext = createContext<() => Record<string, string>>(() => ({}));

export type CrmNextDealDraft = {
  amount: string;
  customerId: string;
  note: string;
  ownerUserId: string;
  vehicle: string;
  workflowId: string;
};

type CustomerDealPrefill = {
  address: string;
  dateOfBirth: string;
  email: string;
  idLast4: string;
  idState: string;
  idType: string;
  phoneNumber: string;
  ssnLast4: string;
};

type CustomerIdentityFieldKey = "dateOfBirth" | "streetAddress" | "city" | "state" | "zip" | "idType" | "idState" | "idNumber" | "cellPhone" | "email";

const EMPTY_CUSTOMER_DEAL_PREFILL: CustomerDealPrefill = {
  address: "",
  dateOfBirth: "",
  email: "",
  idLast4: "",
  idState: "",
  idType: "",
  phoneNumber: "",
  ssnLast4: ""
};

function normalizeCustomerDealPrefill(prefill?: Partial<CustomerDealPrefill> | null): CustomerDealPrefill {
  return { ...EMPTY_CUSTOMER_DEAL_PREFILL, ...(prefill ?? {}) };
}

export function applyCustomerPrefillToTestDriveFacts<T extends { driverEmail: string; driverLicense: string; driverPhone: string; licenseState: string }>(current: T, prefill?: Partial<CustomerDealPrefill> | null): T {
  const normalized = normalizeCustomerDealPrefill(prefill);
  return {
    ...current,
    driverEmail: current.driverEmail || normalized.email,
    driverLicense: current.driverLicense || (normalized.idLast4 ? `ID on file ending ${normalized.idLast4}` : ""),
    driverPhone: current.driverPhone || normalized.phoneNumber,
    licenseState: normalized.idState && current.licenseState === "MN" ? normalized.idState : current.licenseState,
  };
}

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

const MANUAL_CUSTOMER_ID = "__manual_customer__";

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
  jacketId?: string;
  salesDocumentsHref?: string;
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

const PRINTABLE_PACKET_URL_REVOKE_DELAY_MS = 60_000;

function withAutoPrintScript(html: string) {
  const script = `<script>window.addEventListener("load",()=>setTimeout(()=>{window.focus();window.print();},150));</script>`;
  return html.includes("</body>") ? html.replace("</body>", `${script}</body>`) : `${html}${script}`;
}

function openPrintableHtmlDocument(html: string) {
  const url = URL.createObjectURL(new Blob([withAutoPrintScript(html)], { type: "text/html" }));
  const printWindow = window.open(url, "_blank");
  if (!printWindow) {
    URL.revokeObjectURL(url);
    return false;
  }
  try {
    printWindow.opener = null;
  } catch {
    // The packet is already open; keep printing even if the browser blocks opener cleanup.
  }
  window.setTimeout(() => URL.revokeObjectURL(url), PRINTABLE_PACKET_URL_REVOKE_DELAY_MS);
  return true;
}

function openPrintablePdfDocument(document: GeneratedContractPacket["documents"][number]) {
  const url = documentDataUrl(document);
  if (!url) return false;
  const printWindow = window.open(url, "_blank");
  if (!printWindow) return false;
  try {
    printWindow.opener = null;
  } catch {
    // The packet is already open; keep printing even if the browser blocks opener cleanup.
  }
  return true;
}

function normalizeVin(value: string) {
  return value.toUpperCase().replace(/\s/g, "");
}

function getStockNumberFromVin(vin: string) {
  return /^[A-HJ-NPR-Z0-9]{17}$/.test(vin) ? vin.slice(-6) : "";
}

function getVinFromVehicleInput(value: string) {
  const normalized = normalizeVin(value);
  return /^[A-HJ-NPR-Z0-9]{17}$/.test(normalized) ? normalized : "";
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

function SavedPacketLink({ packet }: { packet: GeneratedContractPacket | null }) {
  return packet?.salesDocumentsHref ? <Link href={packet.salesDocumentsHref}>Open saved deal jacket</Link> : null;
}

function CompletionGateList({ missing }: { missing: string[] }) {
  if (missing.length === 0) {
    return <small className={styles.completionGateList}>All completion gates are clear.</small>;
  }
  return (
    <small className={styles.completionGateList}>
      Missing: {missing.map((item, index) => <span key={item}>{index > 0 ? ", " : ""}{packetCorrection(item) ? <button type="button" onClick={(event) => goToDealBlocker(item, event.currentTarget)}>{item}</button> : item}</span>)}
    </small>
  );
}

function CustomerIdentityDetails({
  includeCreditFields = false,
  includePhoneEmail = true,
  prefill = EMPTY_CUSTOMER_DEAL_PREFILL,
  values,
  onValueChange
}: {
  includeCreditFields?: boolean;
  includePhoneEmail?: boolean;
  prefill?: CustomerDealPrefill;
  values?: Partial<Record<CustomerIdentityFieldKey, string>>;
  onValueChange?: (key: CustomerIdentityFieldKey, value: string) => void;
}) {
  const [localValues, setLocalValues] = useState({
    cellPhone: prefill.phoneNumber,
    city: "",
    dateOfBirth: prefill.dateOfBirth,
    email: prefill.email,
    idNumber: "",
    idState: prefill.idState,
    idType: prefill.idType,
    state: "",
    streetAddress: prefill.address,
    zip: ""
  });
  const currentValues = values ?? localValues;
  function change(key: keyof typeof localValues, value: string) {
    if (onValueChange) onValueChange(key, value);
    else setLocalValues((current) => ({ ...current, [key]: value }));
  }
  const ssnPlaceholder = prefill.ssnLast4 ? `Last 4 on file: ${prefill.ssnLast4}` : "Full SSN/ITIN if required";
  const idPlaceholder = prefill.idLast4 ? `Last 4 on file: ${prefill.idLast4}` : "Complete ID number";
  return (
    <>
      <label><span>Date of birth</span><input value={currentValues.dateOfBirth ?? ""} onChange={(event) => change("dateOfBirth", event.target.value)} placeholder="MM/DD/YYYY" /></label>
      {includeCreditFields ? <label><span>SSN / ITIN</span><input autoComplete="off" placeholder={ssnPlaceholder} /></label> : null}
      <label><span>ID type</span><select value={currentValues.idType ?? ""} onChange={(event) => change("idType", event.target.value)}><option value="">Select</option><option>Driver license</option><option>State ID</option><option>Passport</option><option>Military ID</option></select></label>
      <label><span>ID state</span><select value={currentValues.idState ?? ""} onChange={(event) => change("idState", event.target.value)}><option value="">Select</option><option>MN</option><option>WI</option><option>IA</option><option>ND</option><option>SD</option><option>Other</option></select></label>
      <label><span>ID number</span><input autoComplete="off" value={currentValues.idNumber ?? ""} onChange={(event) => change("idNumber", event.target.value)} placeholder={idPlaceholder} /></label>
      <label className={styles.retailWide}><span>Street address</span><input value={currentValues.streetAddress ?? ""} onChange={(event) => change("streetAddress", event.target.value)} /></label>
      <label><span>City</span><input value={currentValues.city ?? ""} onChange={(event) => change("city", event.target.value)} /></label>
      <label><span>State</span><select value={currentValues.state ?? ""} onChange={(event) => change("state", event.target.value)}><option value="">Select</option><option>MN</option><option>WI</option><option>IA</option><option>ND</option><option>SD</option><option>Other</option></select></label>
      <label><span>Zip</span><input value={currentValues.zip ?? ""} onChange={(event) => change("zip", event.target.value)} /></label>
      {includePhoneEmail ? <label><span>Cell phone</span><input value={currentValues.cellPhone ?? ""} onChange={(event) => change("cellPhone", event.target.value)} /></label> : null}
      {includePhoneEmail ? <label><span>Email</span><input value={currentValues.email ?? ""} onChange={(event) => change("email", event.target.value)} /></label> : null}
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
  customerPrefill: CustomerDealPrefill;
  customerName: string;
  onAmountChange: (value: string) => void;
  onVehicleChange: (value: string) => void;
  vehicle: string;
}) {
  const vinDecoderRef = useRef<VinDecoderHandle>(null);
  const [selectedFeeCode, setSelectedFeeCode] = useDealDraftState("selectedFeeCode", MN_DMV_FEE_ITEMS[0]?.code ?? "");
  const selectedFee = MN_DMV_FEE_ITEMS.find((item) => item.code === selectedFeeCode) ?? MN_DMV_FEE_ITEMS[0];
  const [feeAmount, setFeeAmount] = useDealDraftState("feeAmount", selectedFee ? formatCurrency(selectedFee.amountCents) : "$0.00");
  const [feeLines, setFeeLines] = useDealDraftState<RetailFeeLine[]>("feeLines", []);
  const [manualSalesTax, setManualSalesTax] = useDealDraftState("manualSalesTax", false);
  const [manualSalesTaxAmount, setManualSalesTaxAmount] = useDealDraftState("manualSalesTaxAmount", "");
  const [downPayment, setDownPayment] = useDealDraftState("downPayment", "$0.00");
  const [termMonths, setTermMonths] = useDealDraftState("termMonths", "36");
  const [interestRate, setInterestRate] = useDealDraftState("interestRate", "0.00%");
  const [paymentFunding, setPaymentFunding] = useDealDraftState("paymentFunding", "To be confirmed");
  const [manualMonthlyPayment, setManualMonthlyPayment] = useDealDraftState("manualMonthlyPayment", false);
  const [manualMonthlyPaymentAmount, setManualMonthlyPaymentAmount] = useDealDraftState("manualMonthlyPaymentAmount", "");
  const [preparedForms, setPreparedForms] = useDealDraftState<string[]>("preparedForms", []);
  const [contractPacket, setContractPacket] = useArchivedDealPacket<GeneratedContractPacket>();
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
  const [vehicleFacts, setVehicleFacts] = useDealDraftState("vehicleFacts", {
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

  useCanonicalDealVehicle(setVehicleFacts);
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

  const getDocumentContext = useContext(DealDocumentContext);
  const identityDraft = useDealDraft();
  async function generateContractPacket() {
    if (identityDraft && !await identityDraft.save()) return;
    setPacketStatus({ kind: "generating", message: "Generating and archiving contract packet..." });
    const response = await requestContractPacket({
      body: JSON.stringify({
        ...getDocumentContext(),
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
      if (!openPrintablePdfDocument(selectedDocument)) {
        setPacketStatus({ kind: "error", message: "Print window was blocked. Download the packet instead." });
      }
      return;
    }
    if (!openPrintableHtmlDocument(packetHtml())) {
      setPacketStatus({ kind: "error", message: "Print window was blocked. Download the packet instead." });
    }
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
    if (!vin) { setVehicleFacts((current) => ({ ...current, vin: "", stockNumber: "" })); return; }
    setVehicleFacts((current) => ({ ...current, stockNumber: getStockNumberFromVin(vin), vin }));
  }

  function updateVehicleFact(key: keyof typeof vehicleFacts, value: string) {
    setVehicleFacts((current) => ({ ...current, [key]: value }));
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
          <label><span>VIN</span><input onDoubleClick={() => vinDecoderRef.current?.decodeAndFill()} title="Double-click to decode and fill vehicle details" value={vehicleFacts.vin} onChange={(event) => updateVin(event.target.value)} placeholder="17-character VIN" /></label>
          <label><span>Stock no.</span><input readOnly value={vehicleFacts.stockNumber} placeholder="Last 6 of VIN" /></label>
          <label><span>Year</span><input value={vehicleFacts.year} onChange={(event) => updateVehicleFact("year", event.target.value)} /></label>
          <CrmNextVinDecoder ref={vinDecoderRef} vin={vehicleFacts.vin} query={vehicle} fields={vehicleFacts} onApply={(values, onlyEmpty) => {
            setVehicleFacts((current) => onlyEmpty ? fillEmptyDecodeFields(current, values) : ({ ...current, ...values }));
            setContractPacket(null);
            onVehicleChange(values.stockNumber || values.vin || vehicle);
          }} />
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
              <PacketFeedback status={packetStatus} closeDrawer={() => setPacketDrawerOpen(false)}><SavedPacketLink packet={contractPacket} /></PacketFeedback>
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
  { id: "arbitration-addenda", label: "Arbitration / addenda", helper: "Signed arbitration and dealership addenda when applicable." },
  { id: "dealer-warranty", label: "Dealer warranty / return addendum", helper: "Signed engine/transmission warranty, return policy, consistent Buyers Guide, and any required Minnesota warranty disclosures." }
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
  customerPrefill,
  customerName,
  customerNameEditable = false,
  originalVehicleReference = "",
  mode = "daily-rental",
  onComplete,
  onAmountChange,
  onCustomerNameChange,
  onSaveDraft,
  onVehicleChange,
  statusKind,
  vehicle
}: {
  amount: string;
  customerPrefill: CustomerDealPrefill;
  customerName: string;
  customerNameEditable?: boolean;
  originalVehicleReference?: string;
  mode?: "daily-rental" | "vehicle-loaner";
  onComplete: () => void;
  onAmountChange: (value: string) => void;
  onCustomerNameChange?: (value: string) => void;
  onSaveDraft: () => void;
  onVehicleChange: (value: string) => void;
  statusKind: "idle" | "saving" | "success" | "error";
  vehicle: string;
}) {
  const isLoaner = mode === "vehicle-loaner";
  const workflowNoun = isLoaner ? "loaner" : "rental";
  const workflowTitle = isLoaner ? "Vehicle loaner" : "Daily rental";
  const checkoutDeskRef = useRef<HTMLDivElement>(null);
  const vinDecoderRef = useRef<VinDecoderHandle>(null);
  const workflowUnitLabel = isLoaner ? "Loaner unit" : "Rental unit";
  const feeStatusLabel = isLoaner ? "Deferred - waived if purchase completes" : "Due at checkout";
  const [preparedForms, setPreparedForms] = useDealDraftState<string[]>("preparedForms", []);
  const [contractPacket, setContractPacket] = useArchivedDealPacket<GeneratedContractPacket>();
  const [packetStatus, setPacketStatus] = useState<{ kind: "idle" | "generating" | "ready" | "error"; message: string }>({ kind: "idle", message: "" });
  const [packetDrawerOpen, setPacketDrawerOpen] = useState(false);
  const [packetPreviewOpen, setPacketPreviewOpen] = useState(false);
  const [previewFormId, setPreviewFormId] = useState<string | null>(null);
  const [releasePhotos, setReleasePhotos] = useDealDraftState<Record<string, string>>("releasePhotos", {});
  const [returnPhotos, setReturnPhotos] = useDealDraftState<Record<string, string>>("returnPhotos", {});
  const [signedDocuments, setSignedDocuments] = useDealDraftState<Record<string, string>>("signedDocuments", {});
  const [returnReceived, setReturnReceived] = useDealDraftState("returnReceived", false);
  const [localActionMessage, setLocalActionMessage] = useState("");
  const [appliedCheckoutTotal, setAppliedCheckoutTotal] = useDealDraftState<string | null>("appliedCheckoutTotal", null);
  const [vehicleFacts, setVehicleFacts] = useDealDraftState("vehicleFacts", {
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
  useCanonicalDealVehicle(setVehicleFacts);
  const [rentalFacts, setRentalFacts] = useDealDraftState("rentalFacts", {
    additionalDriverName: "",
    additionalDriverStatus: "None",
    cardLast4: "",
    cellPhone: "",
    city: "",
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
    state: "MN",
    streetAddress: "",
    useRestriction: "Minnesota local use",
    email: "",
    zip: ""
  });
  useEffect(() => {
    setRentalFacts((current) => ({
      ...current,
      interestedVehicle: isLoaner && originalVehicleReference ? originalVehicleReference : current.interestedVehicle,
      cellPhone: current.cellPhone || customerPrefill.phoneNumber,
      dob: current.dob || customerPrefill.dateOfBirth,
      email: current.email || customerPrefill.email,
      licenseState: customerPrefill.idState && current.licenseState === "MN" ? customerPrefill.idState : current.licenseState,
      state: customerPrefill.idState && current.state === "MN" ? customerPrefill.idState : current.state,
      streetAddress: current.streetAddress || customerPrefill.address
    }));
  }, [customerPrefill, setRentalFacts, isLoaner, originalVehicleReference]);

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
  const rentalFormPacket = isLoaner ? COURTESY_LOANER_FORM_PACKET : DAILY_RENTAL_FORM_PACKET;
  const requiredRentalForms = isLoaner ? requiredCourtesyLoanerFormIds() : requiredDailyRentalFormIds();
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
  const receivingMissingGates = RENTAL_RETURN_PHOTO_REQUIREMENTS
    .filter((item) => !returnPhotos[item.id])
    .map((item) => item.label);
  const checkoutBlockerText = rentalMissingGates.length > 0
    ? `Complete checkout is locked until ${rentalMissingGates.join(", ")}.`
    : "Complete checkout is ready.";
  const receivingBlockerText = receivingMissingGates.length > 0
    ? `Complete receiving is locked until ${receivingMissingGates.join(", ")}.`
    : returnReceived
      ? "Receiving is already complete."
      : "Complete receiving is ready.";

  function updateRentalFact(key: keyof typeof rentalFacts, value: string) {
    setLocalActionMessage("");
    setAppliedCheckoutTotal(null);
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
    setLocalActionMessage("");
    setVehicleFacts((current) => ({ ...current, [key]: value }));
  }

  function updateVin(value: string) {
    setLocalActionMessage("");
    const vin = normalizeVin(value);
    const stockNumber = getStockNumberFromVin(vin);
    setVehicleFacts((current) => ({ ...current, stockNumber, vin }));
    onVehicleChange(stockNumber || vin || vehicle);
  }

  function updateVehicleSearch(value: string) {
    setLocalActionMessage("");
    onVehicleChange(value);
    const vin = getVinFromVehicleInput(value);
    if (!vin) { setVehicleFacts((current) => ({ ...current, vin: "", stockNumber: "" })); return; }
    setVehicleFacts((current) => ({ ...current, stockNumber: getStockNumberFromVin(vin), vin }));
  }


  function useAuthorizationTotal() {
    const total = formatCurrency(isLoaner ? estimatedRentalCents : authorizationCents);
    onAmountChange(total);
    setAppliedCheckoutTotal(total);
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
    setLocalActionMessage("");
    setter((current) => ({ ...current, [id]: file.name }));
  }

  function saveRentalDraft() {
    onSaveDraft();
    setLocalActionMessage(`${workflowTitle} draft saved. Completion stays locked until the listed gates are clear.`);
  }

  function completeReceiving() {
    setReturnReceived(true);
    setLocalActionMessage(`${workflowTitle} receiving marked complete with return evidence.`);
  }

  function completeCheckout() {
    if (statusKind === "saving") return;
    if (rentalMissingGates.length === 0) {
      onComplete();
      return;
    }

    setLocalActionMessage(`Checkout needs: ${rentalMissingGates.join(", ")}.`);
    const missingFieldSelectors = [
      ["Customer selected", "#rental-renter input"],
      [`${workflowUnitLabel} assigned`, "#rental-unit input"],
      ["Driver license captured", '[data-checkout-field="license"]'],
      [isLoaner ? "Interested vehicle recorded" : "Payment hold recorded", isLoaner ? "#rental-window input" : "#rental-protection input"],
      ["Protection or insurance recorded", '[data-checkout-field="insurance"]'],
      ["Release photos captured", '[data-checkout-field="release-photo"]'],
      ["Signed documents recorded", '[data-checkout-field="signed-document"]'],
      ["Amount confirmed", '[data-checkout-field="amount"]']
    ];
    const selector = missingFieldSelectors.find(([label]) => label === rentalMissingGates[0])?.[1];
    const field = selector ? checkoutDeskRef.current?.querySelector<HTMLElement>(selector) : null;
    field?.scrollIntoView({ behavior: "smooth", block: "center" });
    field?.focus({ preventScroll: true });
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
    if (!openPrintableHtmlDocument(packetHtml())) {
      setPacketStatus({ kind: "error", message: "Print window was blocked. Download the rental packet instead." });
    }
  }

  function queuePacketDelivery(channel: "email" | "text") {
    if (!contractPacket) return;
    setPacketStatus({ kind: "ready", message: `${channel === "email" ? "Email" : "Text"} delivery link queued for ${contractPacket.packetNumber}; signed provider delivery remains governed by CRM communications controls.` });
  }

  const getDocumentContext = useContext(DealDocumentContext);
  const identityDraft = useDealDraft();
  async function generateRentalPacket() {
    if (identityDraft && !await identityDraft.save()) return;
    setPacketStatus({ kind: "generating", message: `Generating and archiving ${workflowNoun} packet...` });
    const response = await requestContractPacket({
      body: JSON.stringify({
        ...getDocumentContext(),
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
        packetType: isLoaner ? "VEHICLE_LOANER" : "DAILY_RENTAL",
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
    <div className={styles.retailExecutionDesk} ref={checkoutDeskRef}>
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
          <label><span>{isLoaner ? "Primary loaner driver" : "Primary renter"}</span><input readOnly={!customerNameEditable} value={customerNameEditable && customerName === "Customer not selected" ? "" : customerName} onChange={(event) => onCustomerNameChange?.(event.target.value)} placeholder="Enter customer name" /></label>
          <label><span>Date of birth</span><input value={rentalFacts.dob} onChange={(event) => updateRentalFact("dob", event.target.value)} placeholder="MM/DD/YYYY" /></label>
          <label><span>SSN / ITIN</span><input placeholder="Only if manager-required" /></label>
          <label><span>License status</span><select value={rentalFacts.licenseStatus} onChange={(event) => updateRentalFact("licenseStatus", event.target.value)}><option>Valid</option><option>Needs review</option><option>Expired</option><option>Suspended / not eligible</option></select></label>
          <label><span>License number</span><input data-checkout-field="license" value={rentalFacts.licenseNumber} onChange={(event) => updateRentalFact("licenseNumber", event.target.value)} /></label>
          <label><span>License state</span><select value={rentalFacts.licenseState} onChange={(event) => updateRentalFact("licenseState", event.target.value)}><option>MN</option><option>WI</option><option>IA</option><option>ND</option><option>SD</option><option>Other</option></select></label>
          <label><span>Secondary ID</span><select value={rentalFacts.secondaryId} onChange={(event) => updateRentalFact("secondaryId", event.target.value)}><option>Not needed</option><option>Passport</option><option>Utility / bank statement</option><option>Military ID</option><option>Travel itinerary</option><option>Manager review</option></select></label>
          <label><span>Additional driver</span><select value={rentalFacts.additionalDriverStatus} onChange={(event) => updateRentalFact("additionalDriverStatus", event.target.value)}><option>None</option><option>Spouse / domestic partner</option><option>Paid additional driver</option><option>Business authorized driver</option><option>Needs approval</option></select></label>
          <label><span>Additional driver name</span><input value={rentalFacts.additionalDriverName} onChange={(event) => updateRentalFact("additionalDriverName", event.target.value)} /></label>
          <label className={styles.retailWide}><span>Street address</span><input value={rentalFacts.streetAddress} onChange={(event) => updateRentalFact("streetAddress", event.target.value)} /></label>
          <label><span>City</span><input value={rentalFacts.city} onChange={(event) => updateRentalFact("city", event.target.value)} /></label>
          <label><span>State</span><select value={rentalFacts.state} onChange={(event) => updateRentalFact("state", event.target.value)}><option>MN</option><option>WI</option><option>IA</option><option>ND</option><option>SD</option><option>Other</option></select></label>
          <label><span>Zip</span><input value={rentalFacts.zip} onChange={(event) => updateRentalFact("zip", event.target.value)} /></label>
          <label><span>Cell phone</span><input value={rentalFacts.cellPhone} onChange={(event) => updateRentalFact("cellPhone", event.target.value)} /></label>
          <label><span>Email</span><input value={rentalFacts.email} onChange={(event) => updateRentalFact("email", event.target.value)} /></label>
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
          <label><span>VIN</span><input onDoubleClick={() => vinDecoderRef.current?.decodeAndFill()} title="Double-click to decode and fill vehicle details" value={vehicleFacts.vin} onChange={(event) => updateVin(event.target.value)} placeholder="17-character VIN" /></label>
          <label><span>Stock no.</span><input readOnly value={vehicleFacts.stockNumber} placeholder="Last 6 of VIN" /></label>
          <CrmNextVinDecoder ref={vinDecoderRef} vin={vehicleFacts.vin} query={vehicle} fields={vehicleFacts} onApply={(values, onlyEmpty) => {
            setVehicleFacts((current) => onlyEmpty ? fillEmptyDecodeFields(current, values) : ({ ...current, ...values }));
            setContractPacket(null);
            onVehicleChange(values.stockNumber || values.vin || vehicle);
          }} />
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
          <label><span>Insurance carrier</span><input data-checkout-field="insurance" value={rentalFacts.insuranceCarrier} onChange={(event) => updateRentalFact("insuranceCarrier", event.target.value)} /></label>
          <label><span>Policy number</span><input value={rentalFacts.insurancePolicy} onChange={(event) => updateRentalFact("insurancePolicy", event.target.value)} /></label>
          <label><span>Estimated authorization</span><input readOnly value={formatCurrency(authorizationCents)} /></label>
        </div>
        <div className={styles.rentalSummaryStrip}>
          <div><span>Rental days</span><strong>{rentalDays}</strong></div>
          <div><span>{isLoaner ? "Loaner fee exposure" : "Rental charges"}</span><strong>{formatCurrency(estimatedRentalCents)}</strong></div>
          <div><span>Deposit / hold</span><strong>{formatCurrency(Number.isFinite(depositHoldCents) && depositHoldCents !== null ? depositHoldCents : 0)}</strong></div>
          <div><span>{isLoaner ? "Customer fee status" : "Authorization"}</span><strong>{isLoaner ? feeStatusLabel : formatCurrency(authorizationCents)}</strong></div>
          <button data-checkout-field="amount" type="button" onClick={useAuthorizationTotal}>{isLoaner ? "Use fee exposure total" : "Use authorization total"}</button>
        </div>
        <p className={styles.retailDeliveryNote} role="status" aria-live="polite" aria-atomic="true">
          {appliedCheckoutTotal !== null && appliedCheckoutTotal === amount
            ? `Applied ${appliedCheckoutTotal} to the checkout amount.${isLoaner ? " Loaner fees remain deferred; the deposit / hold is separate." : " Includes rental charges and the deposit / hold."}`
            : `Checkout amount: ${amount.trim() || "Not set"}`}
        </p>
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
                  <input data-document-type="release-condition" data-checkout-field={!releasePhotos[item.id] ? "release-photo" : undefined} accept="image/*" capture="environment" onChange={(event) => captureEvidence(setReleasePhotos, item.id, event.currentTarget.files?.[0])} type="file" />
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
                  <input data-document-type={item.id} data-checkout-field={!signedDocuments[item.id] ? "signed-document" : undefined} accept="application/pdf,image/*" capture={item.id === "signed-agreement" ? undefined : "environment"} onChange={(event) => captureEvidence(setSignedDocuments, item.id, event.currentTarget.files?.[0])} type="file" />
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
                  <input data-document-type="return-condition" accept="image/*" capture="environment" onChange={(event) => captureEvidence(setReturnPhotos, item.id, event.currentTarget.files?.[0])} type="file" />
                </label>
              ))}
            </div>
            <div className={styles.retailNextActionBar} aria-label={`${workflowTitle} receiving next actions`}>
              <div>
                <span>Receiving readiness</span>
                <strong>{returnReceived ? "Return received with evidence" : returnPhotosReady ? "Ready to receive vehicle" : `${returnPhotoCount}/${RENTAL_RETURN_PHOTO_REQUIREMENTS.length} return photos ready`}</strong>
                <small className={styles.actionGateMessage} id={`${workflowNoun}-receiving-gate`}>{receivingBlockerText}</small>
              </div>
              <button
                aria-describedby={`${workflowNoun}-receiving-gate`}
                disabled={!returnPhotosReady || returnReceived}
                onClick={completeReceiving}
                title={receivingBlockerText}
                type="button"
              >
                {returnReceived ? "Return received" : "Complete receiving"}
              </button>
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
            <small className={styles.actionGateMessage} id={`${workflowNoun}-checkout-gate`}>{checkoutBlockerText}</small>
            {localActionMessage ? <small className={styles.actionFeedbackMessage} role="status">{localActionMessage}</small> : null}
          </div>
          <button type="button" onClick={saveRentalDraft}>Save {workflowNoun} draft</button>
          <button
            aria-describedby={`${workflowNoun}-checkout-gate`}
            disabled={statusKind === "saving"}
            onClick={completeCheckout}
            title={checkoutBlockerText}
            type="button"
          >
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
            <small>{isLoaner ? "Open the drawer to prepare the official courtesy loaner agreement, condition/return record, and Minnesota insurance notice." : "Open the drawer to prepare the agreement, terms, damage responsibility, protection election, payment authorization, condition report, and incident instructions."}</small>
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
                  <small>{isLoaner ? "Prepare the official courtesy loaner packet before release." : "Prepare the baseline packet first, then add the additional driver addendum only when it applies."}</small>
                </div>
                <button type="button" onClick={prepareRequiredForms}>Prepare required forms</button>
                <button disabled={packetStatus.kind === "generating"} type="button" onClick={() => void generateRentalPacket()}>
                  {packetStatus.kind === "generating" ? "Generating..." : `Generate ${workflowNoun} packet`}
                </button>
                <button disabled={!contractPacket} type="button" onClick={openPacketPreview}>Preview generated packet</button>
              </div>
              <PacketFeedback status={packetStatus} closeDrawer={() => setPacketDrawerOpen(false)}><SavedPacketLink packet={contractPacket} /></PacketFeedback>
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
                {rentalFormPacket.map((form) => {
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
  customerPrefill,
  customerName,
  onAmountChange,
  onVehicleChange,
  vehicle
}: {
  customerPrefill: CustomerDealPrefill;
  customerName: string;
  onAmountChange: (value: string) => void;
  onVehicleChange: (value: string) => void;
  vehicle: string;
}) {
  const vinDecoderRef = useRef<VinDecoderHandle>(null);
  const [dealerWarrantyOffered, setDealerWarrantyOffered] = useDealDraftState("dealerWarrantyOffered", true);
  const leaseForms = LEASE_TO_OWN_FORM_PACKET.filter((form) => dealerWarrantyOffered || form.id !== LEASE_WARRANTY_FORM_ID);
  const [preparedForms, setPreparedForms] = useDealDraftState<string[]>("preparedForms", []);
  const [contractPacket, setContractPacket] = useArchivedDealPacket<GeneratedContractPacket>();
  const [packetStatus, setPacketStatus] = useState<{ kind: "idle" | "generating" | "ready" | "error"; message: string }>({ kind: "idle", message: "" });
  const [packetDrawerOpen, setPacketDrawerOpen] = useState(false);
  const [packetPreviewOpen, setPacketPreviewOpen] = useState(false);
  const [previewFormId, setPreviewFormId] = useState<string | null>(null);
  const [vehicleFacts, setVehicleFacts] = useDealDraftState("vehicleFacts", {
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
  useCanonicalDealVehicle(setVehicleFacts);
  const [leaseInputs, setLeaseInputs] = useDealDraftState("leaseInputs", {
    calculationMode: "TERM" as "TERM" | "PAYMENT_AMOUNT",
    targetPayment: "$250.00",
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
    signingPaymentMode: "CAPITALIZED_REDUCTION" as "DOWN_PAYMENT" | "CAPITALIZED_REDUCTION",
    titleFee: "$102.80",
    warrantyCost: "$0.00",
    wholesaleCost: "$0.00"
  });
  const [leaseFacts, setLeaseFacts] = useDealDraftState("leaseFacts", {
    deliveryAt: "",
    agreementDate: "",
    dateOfBirth: "",
    firstPaymentDate: "",
    streetAddress: "",
    city: "",
    zip: "",
    idType: "",
    idState: "MN",
    idNumber: "",
    lesseeCounty: "",
    state: "MN",
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
  useEffect(() => {
    setLeaseFacts((current) => ({
      ...current,
      dateOfBirth: current.dateOfBirth || customerPrefill.dateOfBirth,
      streetAddress: current.streetAddress || customerPrefill.address,
      idType: current.idType || customerPrefill.idType,
      idState: customerPrefill.idState && current.idState === "MN" ? customerPrefill.idState : current.idState,
      lesseeEmail: current.lesseeEmail || customerPrefill.email,
      lesseePhone: current.lesseePhone || customerPrefill.phoneNumber
    }));
  }, [customerPrefill, setLeaseFacts]);

  const calculatorInput = useMemo<LeaseToOwnCalculatorInput>(() => ({
    calculationMode: leaseInputs.calculationMode,
    targetPaymentCents: dollarsToCents(leaseInputs.targetPayment) ?? 0,
    additionalItemsCents: dollarsToCents(leaseInputs.additionalItems) ?? 0,
    capitalizedCostReductionCents: dollarsToCents(leaseInputs.capitalizedCostReduction) ?? 0,
    contractLength: Number(leaseInputs.contractLength) || 0,
    documentPreparationFeeCents: dollarsToCents(leaseInputs.documentPreparationFee) ?? 0,
    downPaymentCents: dollarsToCents(leaseInputs.downPayment) ?? 0,
    gpsCostCents: dollarsToCents(leaseInputs.gpsCost) ?? 0,
    multiplierBasisPoints: basisPointsFromMultiplier(leaseInputs.multiplier),
    originationFeeCents: dollarsToCents(leaseInputs.originationFee) ?? 0,
    otherRoadWorthyCostCents: dollarsToCents(leaseInputs.otherRoadWorthyCost) ?? 0,
    paymentFrequency: leaseInputs.paymentFrequency,
    registrationFeeCents: dollarsToCents(leaseInputs.registrationFee) ?? 0,
    salesTaxRateBasisPoints: Number(leaseInputs.salesTaxRate.replace("%", "")) * 100,
    signingPaymentMode: leaseInputs.signingPaymentMode,
    titleFeeCents: dollarsToCents(leaseInputs.titleFee) ?? 0,
    warrantyCostCents: dollarsToCents(leaseInputs.warrantyCost) ?? 0,
    wholesaleCostCents: dollarsToCents(leaseInputs.wholesaleCost) ?? 0
  }), [leaseInputs]);
  const calculator = useMemo(() => calculateLeaseToOwn(calculatorInput), [calculatorInput]);
  const leaseDeliveryDate = new Date(leaseFacts.deliveryAt);
  const leaseDeliveryIso = Number.isFinite(leaseDeliveryDate.getTime()) ? leaseDeliveryDate.toISOString() : "";
  const leaseWarranty = dealerWarrantyOffered ? dealerWarrantyDetails({ deliveryAt: leaseDeliveryIso, deliveryMileage: vehicleFacts.mileage }) : null;
  const calculationError = leaseAgreementCalculationError(calculatorInput, calculator);
  const packetFormCount = leaseForms.length;
  const preparedPacketCount = leaseForms.filter((form) => form.id === "lease-summary" || form.id === LEASE_WARRANTY_FORM_ID || preparedForms.includes(form.id)).length;
  const previewDocument = contractPacket?.documents.find((document) => document.formId === previewFormId) ?? contractPacket?.documents[0] ?? null;

  function updateLeaseInput(key: keyof typeof leaseInputs, value: string) {
    setContractPacket(null);
    setLeaseInputs((current) => ({
      ...current,
      ...(key === "calculationMode" && value === "TERM" && calculator.contractLength > 0
        ? { contractLength: String(calculator.contractLength) } : {}),
      [key]: key === "paymentFrequency" ? value as LeasePaymentFrequency : value
    }));
  }

  function updateVehicleFact(key: keyof typeof vehicleFacts, value: string) {
    setContractPacket(null);
    setVehicleFacts((current) => ({ ...current, [key]: value }));
  }

  function updateLeaseFact(key: keyof typeof leaseFacts, value: string) {
    setContractPacket(null);
    setLeaseFacts((current) => ({ ...current, [key]: value }));
  }

  function updateLeaseIdentityFact(key: CustomerIdentityFieldKey, value: string) {
    if (key === "cellPhone") updateLeaseFact("lesseePhone", value);
    else if (key === "email") updateLeaseFact("lesseeEmail", value);
    else if (key in leaseFacts) updateLeaseFact(key as keyof typeof leaseFacts, value);
  }

  function updateVin(value: string) {
    setContractPacket(null);
    const vin = normalizeVin(value);
    const stockNumber = getStockNumberFromVin(vin);
    setVehicleFacts((current) => ({ ...current, stockNumber, vin }));
    onVehicleChange(stockNumber || vin || vehicle);
  }

  function updateVehicleSearch(value: string) {
    setContractPacket(null);
    onVehicleChange(value);
    const vin = getVinFromVehicleInput(value);
    if (!vin) { setVehicleFacts((current) => ({ ...current, vin: "", stockNumber: "" })); return; }
    setVehicleFacts((current) => ({ ...current, stockNumber: getStockNumberFromVin(vin), vin }));
  }


  function togglePreparedForm(id: string) {
    setPreparedForms((current) => current.includes(id) ? current.filter((item) => item !== id) : [...current, id]);
  }

  function prepareRequiredForms() {
    setContractPacket(null);
    setPreparedForms((current) => Array.from(new Set([...current, ...leaseForms.map((form) => form.id)])));
  }

  const getDocumentContext = useContext(DealDocumentContext);
  const identityDraft = useDealDraft();
  async function generateLeasePacket() {
    if (identityDraft && !await identityDraft.save()) return;
    if (calculationError) {
      setPacketStatus({ kind: "error", message: calculationError });
      return;
    }
    setPacketStatus({ kind: "generating", message: "Generating and archiving lease-to-own packet..." });
    const response = await requestContractPacket({
      body: JSON.stringify({
        customerName,
        dealNumber: vehicleFacts.stockNumber || vehicle || undefined,
        dealType: "Lease-to-Own",
        dealerWarrantyOffered,
        ...getDocumentContext(),
        feeTotal: formatCurrency(calculator.estimatedFeesAndTaxesOverTermCents),
        idempotencyKey: crypto.randomUUID(),
        leaseCalculator: calculatorInput,
        leaseFacts: { ...leaseFacts, deliveryAt: leaseDeliveryIso, lesseeAddress: [leaseFacts.streetAddress, leaseFacts.city, leaseFacts.state, leaseFacts.zip].filter(Boolean).join(", "), lesseeState: leaseFacts.state },
        packetType: "LEASE_TO_OWN",
        paymentFunding: `${leaseInputs.paymentFrequency} payments`,
        preparedFormIds: preparedForms.length > 0 ? preparedForms : allLeaseToOwnFormIds(),
        salePrice: formatCurrency(calculator.grossCapitalizedCostCents),
        vehicle: {
          bodyStyle: vehicleFacts.bodyStyle,
          license: vehicleFacts.license,
          mileage: vehicleFacts.mileage,
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
      if (!openPrintablePdfDocument(selectedDocument)) {
        setPacketStatus({ kind: "error", message: "Print window was blocked. Download the packet instead." });
      }
      return;
    }
    if (!openPrintableHtmlDocument(packetHtml())) {
      setPacketStatus({ kind: "error", message: "Print window was blocked. Download the packet instead." });
    }
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
          <CustomerIdentityDetails includeCreditFields includePhoneEmail={false} prefill={customerPrefill} values={leaseFacts} onValueChange={updateLeaseIdentityFact} />
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
          <label><span>VIN</span><input onDoubleClick={() => vinDecoderRef.current?.decodeAndFill()} title="Double-click to decode and fill vehicle details" value={vehicleFacts.vin} onChange={(event) => updateVin(event.target.value)} placeholder="17-character VIN" /></label>
          <label><span>Stock no.</span><input readOnly value={vehicleFacts.stockNumber} placeholder="Last 6 of VIN" /></label>
          <CrmNextVinDecoder ref={vinDecoderRef} vin={vehicleFacts.vin} query={vehicle} fields={vehicleFacts} onApply={(values, onlyEmpty) => {
            setVehicleFacts((current) => onlyEmpty ? fillEmptyDecodeFields(current, values) : ({ ...current, ...values }));
            setContractPacket(null);
            onVehicleChange(values.stockNumber || values.vin || vehicle);
          }} />
          <label><span>Year</span><input value={vehicleFacts.year} onChange={(event) => updateVehicleFact("year", event.target.value)} /></label>
          <label><span>Make</span><input value={vehicleFacts.make} onChange={(event) => updateVehicleFact("make", event.target.value)} /></label>
          <label><span>Model</span><input value={vehicleFacts.model} onChange={(event) => updateVehicleFact("model", event.target.value)} /></label>
          <label><span>Trim</span><input value={vehicleFacts.trim} onChange={(event) => updateVehicleFact("trim", event.target.value)} /></label>
          <label><span>Body style</span><input value={vehicleFacts.bodyStyle} onChange={(event) => updateVehicleFact("bodyStyle", event.target.value)} /></label>
          <label><span>Color</span><input value={vehicleFacts.color} onChange={(event) => updateVehicleFact("color", event.target.value)} /></label>
          <label><span>Odometer</span><input value={vehicleFacts.mileage} onChange={(event) => updateVehicleFact("mileage", event.target.value)} /></label>
          <label><span>Plate / license</span><input value={vehicleFacts.license} onChange={(event) => updateVehicleFact("license", event.target.value)} /></label>
          <label><span>Delivery date / time (local)</span><input type="datetime-local" value={leaseFacts.deliveryAt} onChange={(event) => updateLeaseFact("deliveryAt", event.target.value)} /></label>
          <label><span>Dealer warranty</span><select value={dealerWarrantyOffered ? "OFFERED" : "NOT_OFFERED"} onChange={(event) => { setDealerWarrantyOffered(event.target.value === "OFFERED"); setContractPacket(null); }}><option value="OFFERED">Offer engine / transmission: 30 days or 1,000 miles</option><option value="NOT_OFFERED">Not offered - required coverage unaffected</option></select></label>
          <label><span>Dealer warranty expiration</span><input readOnly value={!dealerWarrantyOffered ? "Not offered" : leaseWarranty ? `${leaseWarranty.expires} or ${leaseWarranty.endingMileage.toLocaleString("en-US")} miles` : ""} /></label>
          <label><span>Optional return deadline</span><input readOnly value={leaseWarranty?.returnDeadline ?? ""} /></label>
        </div>
      </section>

      <section className={styles.retailSection} id="lease-calculator">
        <header>
          <span>Lease calculator</span>
          <strong>Lease terms and signing amounts</strong>
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
          <label><span>Signing amount entry</span><select value={leaseInputs.signingPaymentMode} onChange={(event) => updateLeaseInput("signingPaymentMode", event.target.value)}><option value="CAPITALIZED_REDUCTION">Capitalized cost reduction</option><option value="DOWN_PAYMENT">Total cash at signing</option></select></label>
          <label><span>Total cash at signing</span><input disabled={leaseInputs.signingPaymentMode !== "DOWN_PAYMENT"} value={leaseInputs.downPayment} onChange={(event) => updateLeaseInput("downPayment", event.target.value)} /></label>
          <label><span>Frequency</span><select value={leaseInputs.paymentFrequency} onChange={(event) => updateLeaseInput("paymentFrequency", event.target.value)}><option>Weekly</option><option>BiWeekly</option><option>Monthly</option></select></label>
          <fieldset className={styles.leaseCalculationMode}><legend>Calculate by</legend><label><input type="radio" name="lease-calculation-mode" checked={leaseInputs.calculationMode === "TERM"} onChange={() => updateLeaseInput("calculationMode", "TERM")} />By lease term</label><label><input type="radio" name="lease-calculation-mode" checked={leaseInputs.calculationMode === "PAYMENT_AMOUNT"} onChange={() => updateLeaseInput("calculationMode", "PAYMENT_AMOUNT")} />By payment amount</label></fieldset>
          {leaseInputs.calculationMode === "PAYMENT_AMOUNT" ? <label><span>Target payment amount</span><input inputMode="decimal" value={leaseInputs.targetPayment} onChange={(event) => updateLeaseInput("targetPayment", event.target.value)} /></label> : null}
          <label><span>Number of payments</span><input type="number" min="1" step="1" readOnly={leaseInputs.calculationMode === "PAYMENT_AMOUNT"} value={leaseInputs.calculationMode === "PAYMENT_AMOUNT" ? calculator.contractLength || "" : leaseInputs.contractLength} onChange={(event) => updateLeaseInput("contractLength", event.target.value)} /></label>
          <label><span>Capitalized cost reduction</span><input readOnly={leaseInputs.signingPaymentMode === "DOWN_PAYMENT"} value={leaseInputs.signingPaymentMode === "DOWN_PAYMENT" ? formatCurrency(calculator.capitalizedCostReductionCents) : leaseInputs.capitalizedCostReduction} onChange={(event) => updateLeaseInput("capitalizedCostReduction", event.target.value)} /></label>
          <label><span>Lease date</span><input type="date" value={leaseFacts.agreementDate} onChange={(event) => updateLeaseFact("agreementDate", event.target.value)} /></label>
          <label><span>Next payment date</span><input type="date" value={leaseFacts.firstPaymentDate} onChange={(event) => updateLeaseFact("firstPaymentDate", event.target.value)} /></label>
          <label><span>County</span><input value={leaseFacts.lesseeCounty} onChange={(event) => updateLeaseFact("lesseeCounty", event.target.value)} /></label>
          <label><span>Origination fee</span><input value={leaseInputs.originationFee} onChange={(event) => updateLeaseInput("originationFee", event.target.value)} /></label>
          <label><span>Service facility</span><input value={leaseFacts.serviceFacility} onChange={(event) => updateLeaseFact("serviceFacility", event.target.value)} /></label>
          <label><span>Facility phone</span><input value={leaseFacts.serviceFacilityPhone} onChange={(event) => updateLeaseFact("serviceFacilityPhone", event.target.value)} /></label>
        </div>
        <div className={styles.leaseCalculatorSummary}>
          <div><span>Gross cap cost</span><strong>{formatCurrency(calculator.grossCapitalizedCostCents)}</strong></div>
          <div><span>Base payment</span><strong>{formatCurrency(calculator.basePeriodicPaymentCents)}</strong></div>
          <div><span>Final payment</span><strong>{formatCurrency(calculator.finalPeriodicPaymentCents)}</strong></div>
          <div><span>Residual / purchase option</span><strong>{formatCurrency(calculator.residualValueCents)}</strong></div>
          <div><span>Up-front tax</span><strong>{formatCurrency(calculator.applicableTaxesCents)}</strong></div>
          <div><span>Due at signing</span><strong>{formatCurrency(calculator.amountDueAtSigningCents)}</strong></div>
          <div><span>Costs / taxes / fees</span><strong>{formatCurrency(calculator.costsTaxesFeesCents)}</strong></div>
          <div><span>Total payments</span><strong>{formatCurrency(calculator.totalOfPaymentsCents)}</strong></div>
          <div><span>Dealer gross</span><strong>{formatCurrency(calculator.dealerGrossProfitCents)}</strong></div>
          <button type="button" onClick={() => onAmountChange(formatCurrency(calculator.grossCapitalizedCostCents))}>Use calculated amount</button>
        </div>
        {calculationError ? <p role="alert" className={styles.retailPacketError}>{calculationError}</p> : null}
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
              <PacketFeedback status={packetStatus} closeDrawer={() => setPacketDrawerOpen(false)}><SavedPacketLink packet={contractPacket} /></PacketFeedback>
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
                {leaseForms.map((form) => {
                  const prepared = form.id === "lease-summary" || form.id === LEASE_WARRANTY_FORM_ID || preparedForms.includes(form.id);
                  return (
                    <label className={prepared ? styles.retailFormReady : undefined} key={form.id}>
                      <input checked={prepared} disabled={form.id === "lease-summary" || form.id === LEASE_WARRANTY_FORM_ID} onChange={() => togglePreparedForm(form.id)} type="checkbox" />
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
  customerPrefill,
  customerName,
  onAmountChange,
  onComplete,
  onSaveDraft,
  onVehicleChange,
  statusKind,
  vehicle
}: {
  amount: string;
  customerPrefill: CustomerDealPrefill;
  customerName: string;
  onAmountChange: (value: string) => void;
  onComplete: () => void;
  onSaveDraft: () => void;
  onVehicleChange: (value: string) => void;
  statusKind: "idle" | "saving" | "success" | "error";
  vehicle: string;
}) {
  const [dealerWarrantyOffered, setDealerWarrantyOffered] = useDealDraftState("dealerWarrantyOffered", true);
  const bhphForms = BHPH_FORM_PACKET.filter((form) => dealerWarrantyOffered || form.id !== BHPH_WARRANTY_FORM_ID);
  const bhphPaperwork = BHPH_PAPERWORK_REQUIREMENTS.filter((item) => dealerWarrantyOffered || item.id !== "dealer-warranty");
  const [paperwork, setPaperwork] = useDealDraftState<Record<string, string>>("paperwork", {});
  const [evidence, setEvidence] = useDealDraftState<Record<string, string>>("evidence", {});
  const [handoff, setHandoff] = useDealDraftState<Record<string, boolean>>("handoff", {});
  const [terms, setTerms] = useDealDraftState("terms", {
    deliveryAt: "",
    deliveryMileage: "",
    apr: "24.00%",
    downPayment: "$0.00",
    firstPaymentDate: "",
    lateFee: "$10.00",
    paymentAmount: "",
    paymentFrequency: "Weekly",
    salePrice: amount,
    termMonths: "24"
  });
  const [proof, setProof] = useDealDraftState("proof", {
    coBuyer: "",
    employer: "",
    income: "",
    references: "",
    residence: "",
    stipulations: ""
  });
  const [approval, setApproval] = useDealDraftState("approval", {
    downPaymentException: false,
    insuranceException: false,
    stipulationOpen: false,
    titleException: false,
    termsException: false
  });
  const [preparedForms, setPreparedForms] = useDealDraftState<string[]>("preparedForms", []);
  const [contractPacket, setContractPacket] = useArchivedDealPacket<GeneratedContractPacket>();
  const [packetStatus, setPacketStatus] = useState<{ kind: "idle" | "generating" | "ready" | "error"; message: string }>({ kind: "idle", message: "" });
  const [packetDrawerOpen, setPacketDrawerOpen] = useState(false);
  const [packetPreviewOpen, setPacketPreviewOpen] = useState(false);
  const [previewFormId, setPreviewFormId] = useState<string | null>(null);

  const salePriceCents = dollarsToCents(terms.salePrice);
  const downPaymentCents = dollarsToCents(terms.downPayment);
  const amountFinancedCents = Math.max(0, (Number.isFinite(salePriceCents) && salePriceCents !== null ? salePriceCents : 0) - (Number.isFinite(downPaymentCents) && downPaymentCents !== null ? downPaymentCents : 0));
  const requiredBhphForms = useMemo(() => requiredBhphFormIds().filter((id) => dealerWarrantyOffered || id !== BHPH_WARRANTY_FORM_ID), [dealerWarrantyOffered]);
  const preparedRequiredCount = bhphForms.filter((form) => form.category === "Required" && (form.id === BHPH_WARRANTY_FORM_ID || preparedForms.includes(form.id))).length;
  const deliveryDate = new Date(terms.deliveryAt);
  const deliveryIso = Number.isFinite(deliveryDate.getTime()) ? deliveryDate.toISOString() : "";
  const warrantyDetails = dealerWarrantyOffered ? dealerWarrantyDetails({ deliveryAt: deliveryIso, deliveryMileage: terms.deliveryMileage }) : null;
  const previewDocument = contractPacket?.documents.find((document) => document.formId === previewFormId) ?? contractPacket?.documents[0] ?? null;
  const paperworkCount = bhphPaperwork.filter((item) => paperwork[item.id]).length;
  const evidenceCount = BHPH_EVIDENCE_REQUIREMENTS.filter((item) => evidence[item.id]).length;
  const handoffCount = BHPH_HANDOFF_REQUIREMENTS.filter((item) => handoff[item]).length;
  const approvalTriggers = Object.values(approval).filter(Boolean).length;
  const paperworkReady = paperworkCount === bhphPaperwork.length;
  const evidenceReady = evidenceCount === BHPH_EVIDENCE_REQUIREMENTS.length;
  const handoffReady = handoffCount === BHPH_HANDOFF_REQUIREMENTS.length;
  const proofReady = Boolean(proof.income.trim() && proof.residence.trim() && proof.references.trim());
  const termsReady = Boolean(terms.salePrice.trim() && terms.downPayment.trim() && terms.paymentAmount.trim() && terms.firstPaymentDate.trim());
  const bhphReady = Boolean(customerName !== "Customer not selected" && vehicle.trim() && termsReady && (!dealerWarrantyOffered || warrantyDetails) && proofReady && paperworkReady && evidenceReady && handoffReady && approvalTriggers === 0);
  const bhphMissingGates = [
    { label: "Customer selected", ready: customerName !== "Customer not selected" },
    { label: "Vehicle assigned", ready: Boolean(vehicle.trim()) },
    { label: "Terms complete", ready: termsReady },
    { label: "Warranty delivery time and odometer complete", ready: !dealerWarrantyOffered || Boolean(warrantyDetails) },
    { label: "Proof and references complete", ready: proofReady },
    { label: "Signed paperwork stored", ready: paperworkReady },
    { label: "Evidence stored", ready: evidenceReady },
    { label: "Manager reviews clear", ready: approvalTriggers === 0 },
    { label: "Servicing handoff complete", ready: handoffReady }
  ].filter((gate) => !gate.ready).map((gate) => gate.label);

  function updateTerms(key: keyof typeof terms, value: string) {
    setContractPacket(null);
    const next = { ...terms, [key]: value };
    setTerms(next);
    const nextSalePrice = dollarsToCents(next.salePrice);
    const nextDownPayment = dollarsToCents(next.downPayment);
    const nextAmountFinanced = Math.max(0, (Number.isFinite(nextSalePrice) && nextSalePrice !== null ? nextSalePrice : 0) - (Number.isFinite(nextDownPayment) && nextDownPayment !== null ? nextDownPayment : 0));
    onAmountChange(formatCurrency(nextAmountFinanced));
  }

  function togglePreparedForm(id: string) {
    setPreparedForms((current) => current.includes(id) ? current.filter((item) => item !== id) : [...current, id]);
  }

  function prepareRequiredForms() {
    setPreparedForms((current) => Array.from(new Set([...current, ...requiredBhphForms])));
  }

  function packetHtml() {
    if (!contractPacket) return "";
    return `<!doctype html><html><head><meta charset="utf-8"><title>${contractPacket.packetNumber}</title></head><body>${contractPacket.documents.map((document) => document.html).join("<hr />")}</body></html>`;
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
    if (!openPrintableHtmlDocument(packetHtml())) {
      setPacketStatus({ kind: "error", message: "Print window was blocked. Download the BHPH packet instead." });
    }
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

  function downloadBhphSelectedForm() {
    if (!previewDocument?.contentBase64 || previewDocument.contentType !== "application/pdf") return;
    const link = document.createElement("a");
    link.href = documentDataUrl(previewDocument);
    link.download = previewDocument.downloadFileName;
    link.click();
  }

  function printBhphSelectedForm() {
    if (!previewDocument) return;
    const opened = previewDocument.contentType === "application/pdf"
      ? openPrintablePdfDocument(previewDocument)
      : openPrintableHtmlDocument(previewDocument.html);
    if (!opened) setPacketStatus({ kind: "error", message: "Print window was blocked. Download the selected form instead." });
  }

  const getDocumentContext = useContext(DealDocumentContext);
  const identityDraft = useDealDraft();
  async function generateBhphPacket() {
    if (identityDraft && !await identityDraft.save()) return;
    setPacketStatus({ kind: "generating", message: "Generating and archiving BHPH packet..." });
    const vin = getVinFromVehicleInput(vehicle);
    const response = await requestContractPacket({
      body: JSON.stringify({
        bhph: {
          ...terms,
          ...proof,
          amountFinanced: formatCurrency(amountFinancedCents),
          approvalTriggers: String(approvalTriggers),
          evidenceCount: `${evidenceCount}/${BHPH_EVIDENCE_REQUIREMENTS.length}`,
          handoffCount: `${handoffCount}/${BHPH_HANDOFF_REQUIREMENTS.length}`,
          insuranceStatus: approval.insuranceException ? "Needs manager review" : "Verified",
          paperworkCount: `${paperworkCount}/${bhphPaperwork.length}`,
          titleStatus: approval.titleException ? "Needs manager review" : "Ready",
          deliveryAt: deliveryIso,
          warrantyPosture: dealerWarrantyPosture(dealerWarrantyOffered)
        },
        ...getDocumentContext(),
        customerName,
        dealNumber: getStockNumberFromVin(vin) || vehicle || undefined,
        dealType: "BHPH",
        dealerWarrantyOffered,
        feeTotal: "$0.00",
        idempotencyKey: crypto.randomUUID(),
        packetType: "BHPH",
        paymentFunding: `BHPH amount financed ${formatCurrency(amountFinancedCents)}; ${terms.paymentAmount || "$0.00"} ${terms.paymentFrequency}; APR ${terms.apr}; first payment ${terms.firstPaymentDate || "Not captured"}.`,
        preparedFormIds: preparedForms.length > 0 ? preparedForms : requiredBhphForms,
        salePrice: terms.salePrice || "$0.00",
        vehicle: {
          stockNumber: getStockNumberFromVin(vin) || vehicle,
          mileage: terms.deliveryMileage,
          vin
        }
      }),
      headers: { "content-type": "application/json" },
      method: "POST"
    });
    const payload = await response.json().catch(() => ({}));
    if (!response.ok) {
      setPacketStatus({ kind: "error", message: typeof payload.error === "string" ? payload.error : "BHPH packet could not be generated." });
      return;
    }
    const generatedPacket = payload as GeneratedContractPacket;
    setContractPacket(generatedPacket);
    setPreviewFormId(generatedPacket.documents[0]?.formId ?? null);
    setPacketStatus({ kind: "ready", message: `Archived BHPH packet ${generatedPacket.packetNumber}.` });
    onAmountChange(formatCurrency(amountFinancedCents));
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
          <CustomerIdentityDetails key={JSON.stringify(customerPrefill)} includeCreditFields prefill={customerPrefill} />
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
          <label><span>Dealer warranty</span><select value={dealerWarrantyOffered ? "OFFERED" : "NOT_OFFERED"} onChange={(event) => { setDealerWarrantyOffered(event.target.value === "OFFERED"); setContractPacket(null); }}><option value="OFFERED">Offer engine / transmission: 30 days or 1,000 miles</option><option value="NOT_OFFERED">Not offered - required coverage unaffected</option></select></label>
          <label><span>Delivery date / time (local)</span><input type="datetime-local" value={terms.deliveryAt} onChange={(event) => updateTerms("deliveryAt", event.target.value)} /></label>
          <label><span>Delivery odometer</span><input type="number" min="0" step="1" value={terms.deliveryMileage} onChange={(event) => updateTerms("deliveryMileage", event.target.value)} /></label>
          <label><span>Warranty expiration</span><input readOnly value={!dealerWarrantyOffered ? "Not offered" : warrantyDetails ? `${warrantyDetails.expires} or ${warrantyDetails.endingMileage.toLocaleString("en-US")} miles` : ""} /></label>
          <label><span>Optional return deadline</span><input readOnly value={warrantyDetails?.returnDeadline ?? ""} /></label>
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
          <div><span>Paperwork</span><strong>{paperworkCount}/{bhphPaperwork.length}</strong><small>{paperworkReady ? "Ready" : "Required before delivery"}</small></div>
          <div><span>Proof evidence</span><strong>{evidenceCount}/{BHPH_EVIDENCE_REQUIREMENTS.length}</strong><small>{evidenceReady ? "Recorded" : "Required before approval"}</small></div>
          <div><span>Handoff</span><strong>{handoffCount}/{BHPH_HANDOFF_REQUIREMENTS.length}</strong><small>{handoffReady ? "Ready" : "Required after signing"}</small></div>
        </div>
        <div className={styles.retailPacketLauncher}>
          <div>
            <span>BHPH packet readiness</span>
            <strong>{contractPacket ? `${contractPacket.packetNumber} archived` : `${preparedRequiredCount}/${requiredBhphForms.length} required forms ready`}</strong>
            <small>Open the drawer to prepare the installment support packet, payment schedule, insurance, default, GPS, references, delivery, privacy, and deal-jacket controls.</small>
          </div>
          <button type="button" onClick={() => setPacketDrawerOpen(true)}>Open BHPH packet</button>
        </div>

        {packetDrawerOpen ? (
          <div className={styles.retailPacketDrawerBackdrop} role="presentation">
            <aside className={styles.retailPacketDrawer} aria-label="BHPH packet drawer">
              <header>
                <div>
                  <span>BHPH packet</span>
                  <strong>Prepare, generate, and review BHPH account documents</strong>
                  <small>BHPH documents stay available for signing, print, text, email, and archive review without crowding the main desk.</small>
                </div>
                <button type="button" onClick={() => setPacketDrawerOpen(false)}>Close</button>
              </header>
              <div className={styles.retailFormsCommand}>
                <div>
                  <span>Required forms ready</span>
                  <strong>{preparedRequiredCount}/{requiredBhphForms.length}</strong>
                  <small>Prepare the full BHPH packet, then remove any control that does not apply before generation.</small>
                </div>
                <button type="button" onClick={prepareRequiredForms}>Prepare required forms</button>
                <button disabled={packetStatus.kind === "generating"} type="button" onClick={() => void generateBhphPacket()}>
                  {packetStatus.kind === "generating" ? "Generating..." : "Generate BHPH packet"}
                </button>
                <button disabled={!contractPacket} type="button" onClick={openPacketPreview}>Preview generated packet</button>
              </div>
              <PacketFeedback status={packetStatus} closeDrawer={() => setPacketDrawerOpen(false)}><SavedPacketLink packet={contractPacket} /></PacketFeedback>
              {contractPacket ? (
                <div className={styles.retailPacketArchive} aria-label="Generated BHPH packet archive">
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
                {bhphForms.map((form) => {
                  const prepared = form.id === BHPH_WARRANTY_FORM_ID || preparedForms.includes(form.id);
                  return (
                    <label className={prepared ? styles.retailFormReady : undefined} key={form.id}>
                      <input checked={prepared} disabled={form.id === BHPH_WARRANTY_FORM_ID} onChange={() => togglePreparedForm(form.id)} type="checkbox" />
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
                  <aside className={styles.retailPacketPreviewDrawer} aria-label="BHPH packet preview">
                    <header>
                      <div>
                        <span>Packet preview</span>
                        <strong>{contractPacket.packetNumber}</strong>
                        <small>Review generated BHPH forms before download, print, text, or email.</small>
                      </div>
                      <button type="button" onClick={() => setPacketPreviewOpen(false)}>Close</button>
                    </header>
                    <div className={styles.retailPacketPreviewBody}>
                      <nav aria-label="Generated BHPH forms">
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
                          <strong>{previewDocument?.label ?? "Generated BHPH form"}</strong>
                          {previewDocument?.contentType === "application/pdf" ? <button type="button" onClick={downloadBhphSelectedForm}>Download selected form</button> : null}
                          <button type="button" onClick={printBhphSelectedForm}>Print selected form</button>
                        </div>
                        <iframe srcDoc={previewDocument?.html ?? ""} title={previewDocument?.label ?? "Generated BHPH form preview"} />
                      </section>
                    </div>
                  </aside>
                </div>
              ) : null}
            </aside>
          </div>
        ) : null}
        <div className={styles.rentalEvidenceBoard}>
          <section>
            <h3>Required paperwork</h3>
            <p>Record every signed BHPH document once. These should later store in the central document library and show here as the deal-jacket view.</p>
            <div className={styles.rentalEvidenceGrid}>
              {bhphPaperwork.map((item) => (
                <label className={paperwork[item.id] ? styles.rentalEvidenceCaptured : undefined} key={item.id}>
                  <span>{item.label}</span>
                  <strong>{paperwork[item.id] ?? "Document required"}</strong>
                  <small>{item.helper}</small>
                  <StorageDestination>BHPH deal jacket and customer library</StorageDestination>
                  <input data-document-type={item.id} accept="application/pdf,image/*" onChange={(event) => captureEvidence(setPaperwork, item.id, event.currentTarget.files?.[0])} type="file" />
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
                  <input data-document-type={item.id} accept="application/pdf,image/*" capture="environment" onChange={(event) => captureEvidence(setEvidence, item.id, event.currentTarget.files?.[0])} type="file" />
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
  customerPrefill,
  customerName,
  onAmountChange,
  onComplete,
  onSaveDraft,
  onVehicleChange,
  statusKind,
  vehicle
}: {
  amount: string;
  customerPrefill: CustomerDealPrefill;
  customerName: string;
  onAmountChange: (value: string) => void;
  onComplete: () => void;
  onSaveDraft: () => void;
  onVehicleChange: (value: string) => void;
  statusKind: "idle" | "saving" | "success" | "error";
  vehicle: string;
}) {
  const [packet, setPacket] = useDealDraftState<Record<string, string>>("packet", {});
  const [evidence, setEvidence] = useDealDraftState<Record<string, string>>("evidence", {});
  const [handoff, setHandoff] = useDealDraftState<Record<string, boolean>>("handoff", {});
  const [applicant, setApplicant] = useDealDraftState("applicant", {
    coBuyer: "",
    creditTier: "Application pending",
    income: "",
    residence: "",
    stipulations: ""
  });
  const [lender, setLender] = useDealDraftState("lender", {
    approvalNumber: "",
    buyRate: "",
    contractRate: "0.00%",
    decision: "Application pending",
    lenderName: "",
    lienholderAddress: ""
  });
  const [terms, setTerms] = useDealDraftState("terms", {
    amountFinanced: amount,
    cashDue: "$0.00",
    downPayment: "$0.00",
    firstPaymentDate: "",
    salePrice: amount,
    termMonths: "60",
    tradeAllowance: "$0.00",
    tradePayoff: "$0.00"
  });
  const [approval, setApproval] = useDealDraftState("approval", {
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
          <CustomerIdentityDetails key={JSON.stringify(customerPrefill)} includeCreditFields prefill={customerPrefill} />
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
                  <input data-document-type={item.id} accept="application/pdf,image/*" onChange={(event) => captureEvidence(setPacket, item.id, event.currentTarget.files?.[0])} type="file" />
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
                  <input data-document-type={item.id} accept="application/pdf,image/*" capture="environment" onChange={(event) => captureEvidence(setEvidence, item.id, event.currentTarget.files?.[0])} type="file" />
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

export function TestDriveExecutionDesk({
  review = false,
  employeeName = "",
  uploadBusy = false,
  uploadError = "",
  onActiveChange,
  customerPrefill,
  customerName,
  onAmountChange,
  onComplete,
  onSaveDraft,
  onVehicleChange,
  statusKind,
  vehicle
}: {
  review?: boolean;
  employeeName?: string;
  uploadBusy?: boolean;
  uploadError?: string;
  onActiveChange?: (active: boolean) => void;
  customerPrefill: CustomerDealPrefill;
  customerName: string;
  onAmountChange: (value: string) => void;
  onComplete: () => void | Promise<boolean>;
  onSaveDraft: () => void;
  onVehicleChange: (value: string) => void;
  statusKind: "idle" | "saving" | "success" | "error";
  vehicle: string;
}) {
  const vinDecoderRef = useRef<VinDecoderHandle>(null);
  const draftStore = useDealDraft();
  const [reviewPanel, setReviewPanel] = useState<"driver" | "vehicle" | "agreement" | "photos" | "return" | null>(null);
  const [started, setStarted] = useDealDraftState("testDriveStarted", false);
  const [reviewBusy, setReviewBusy] = useState(false);
  const [reviewError, setReviewError] = useState("");
  const [reviewNotice, setReviewNotice] = useState("");
  const [savingPhotoPlan, setSavingPhotoPlan] = useState(false);
  const [departurePhotosDeferred, setDeparturePhotosDeferred] = useDealDraftState("departurePhotosDeferred", false);
  const reviewEditorHeading = useRef<HTMLDivElement>(null);
  useEffect(() => {
    if (reviewPanel) reviewEditorHeading.current?.scrollIntoView({ block: "start", behavior: "smooth" });
  }, [reviewPanel]);
  useEffect(() => { if (review) onActiveChange?.(started); }, [review, started, onActiveChange]);
  const [facts, setFacts] = useDealDraftState("facts", {
    approvedRoute: "Local test drive route",
    driveMode: "SUPERVISED",
    accompanyingEmployee: review ? employeeName : "",
    licenseState: "MN",
    licenseExpiration: "",
    licenseVerified: false,
    insuranceBasis: "DRIVER_POLICY",
    insuranceVerified: false,
    driverEmail: "",
    durationMinutes: "30",
    mileageAllowance: "20",
    departureMileage: "",
    departureCondition: "",
    fuelOut: "",
    vin: "",
    stockNumber: "",
    year: "",
    make: "",
    model: "",
    trim: "",
    returnAt: "",
    returnMileage: "",
    returnCondition: "",
    fuelIn: "",
    keysReturned: false,
    receivedBy: "",
    driverLicense: "",
    driverPhone: "",
    insuranceCarrier: "",
    insurancePolicy: "",
    notes: "",
    salesperson: review ? employeeName : "",
    startTime: review ? new Date().toTimeString().slice(0, 5) : "",
    testDriveDate: todayInputValue()
  });
  const [releasePhotos, setReleasePhotos] = useDealDraftState<Record<string, string>>("releasePhotos", {});
  const [returnPhotos, setReturnPhotos] = useDealDraftState<Record<string, string>>("returnPhotos", {});
  const [documents, setDocuments] = useDealDraftState<Record<string, string>>("documents", {});
  const [returnReceived, setReturnReceived] = useDealDraftState("returnReceived", false);
  useCanonicalDealVehicle(setFacts);
  const [agreementPacket, setAgreementPacket] = useArchivedDealPacket<GeneratedContractPacket>();
  const agreementRevision = useRef(0);
  const [agreementPreviewOpen, setAgreementPreviewOpen] = useState(false);
  const [agreementStatus, setAgreementStatus] = useState({ kind: "idle", message: "" });
  const normalizedCustomerPrefill = useMemo(() => normalizeCustomerDealPrefill(customerPrefill), [customerPrefill]);
  const customerDetailRows = [
    ["Phone", normalizedCustomerPrefill.phoneNumber],
    ["Email", normalizedCustomerPrefill.email],
    ["Address", normalizedCustomerPrefill.address],
    ["Date of birth", normalizedCustomerPrefill.dateOfBirth],
    ["ID type", normalizedCustomerPrefill.idType],
    ["ID state", normalizedCustomerPrefill.idState],
    ["ID last 4", normalizedCustomerPrefill.idLast4],
  ].filter(([, value]) => Boolean(value));

  useEffect(() => {
    setFacts((current) => applyCustomerPrefillToTestDriveFacts(current, normalizedCustomerPrefill));
  }, [normalizedCustomerPrefill, setFacts]);

  function localInstant(value: string) {
    const date = new Date(value);
    return Number.isFinite(date.getTime()) ? date.toISOString() : "";
  }
  const agreementFacts = testDriveFacts({
    ...facts, departureAt: facts.startTime ? localInstant(`${facts.testDriveDate}T${facts.startTime}`) : "",
    returnAt: facts.returnAt ? localInstant(facts.returnAt) : ""
  });
  const agreementError = testDriveAgreementError(agreementFacts);
  const returnDeadline = testDriveDateTime(testDriveDeadline(agreementFacts));
  const driveVin = facts.vin || getVinFromVehicleInput(vehicle);
  const validVehicle = /^[A-HJ-NPR-Z0-9]{17}$/.test(driveVin);
  const agreementDocument = agreementPacket?.documents[0];

  const releasePhotoCount = TEST_DRIVE_RELEASE_REQUIREMENTS.filter((item) => releasePhotos[item.id]).length;
  const returnPhotoCount = TEST_DRIVE_RETURN_REQUIREMENTS.filter((item) => returnPhotos[item.id]).length;
  const documentCount = TEST_DRIVE_DOCUMENT_REQUIREMENTS.filter((item) => documents[item.id]).length;
  const releasePhotosReady = releasePhotoCount === TEST_DRIVE_RELEASE_REQUIREMENTS.length;
  const returnPhotosReady = returnPhotoCount === TEST_DRIVE_RETURN_REQUIREMENTS.length;
  const documentsReady = documentCount === TEST_DRIVE_DOCUMENT_REQUIREMENTS.length;
  const driverReady = Boolean(facts.driverLicense.trim() && facts.licenseVerified && facts.insuranceVerified);
  const releaseReady = Boolean(customerName !== "Customer not selected" && validVehicle && !agreementError && driverReady && releasePhotosReady && documentsReady);
  const driverCheckReady = driverReady && Boolean(facts.licenseState && facts.driverPhone && facts.salesperson &&
    (facts.driveMode !== "SUPERVISED" || facts.accompanyingEmployee) &&
    facts.licenseExpiration >= facts.testDriveDate &&
    (facts.insuranceBasis !== "DRIVER_POLICY" || (facts.insuranceCarrier && facts.insurancePolicy)));
  const vehicleCheckReady = validVehicle && Boolean(returnDeadline && facts.approvedRoute && facts.departureCondition && facts.fuelOut && facts.departureMileage.trim());
  const testDriveMissingGates = [
    { label: "Customer selected", ready: customerName !== "Customer not selected" },
    { label: "Vehicle VIN captured", ready: validVehicle },
    { label: "Driver license and insurance captured", ready: driverReady },
    { label: "Signed form and proof stored", ready: documentsReady },
    { label: "Release photos captured", ready: releasePhotosReady },
    { label: "Test-drive authorization complete", ready: !agreementError },
    { label: "Expected return time set", ready: Boolean(returnDeadline) }
  ].filter((gate) => !gate.ready).map((gate) => gate.label);
  const reviewChecks = [
    ["driver", "Driver and coverage", driverCheckReady],
    ["vehicle", "Vehicle and return plan", vehicleCheckReady],
    ["agreement", "Agreement and proof", documentsReady],
    ["photos", "Departure photos", releasePhotosReady]
  ] as const;
  const pendingReviewChecks = reviewChecks.filter(([, , ready]) => !ready).length;

  function update(key: keyof typeof facts, value: string | boolean) {
    setReviewNotice("");
    if (review && ["returnAt", "returnMileage", "returnCondition", "fuelIn", "keysReturned", "receivedBy"].includes(key)) {
      setReturnReceived(false);
      setFacts((current) => ({ ...current, [key]: value }));
      return;
    }
    agreementRevision.current += 1;
    setAgreementStatus({ kind: "idle", message: "" });
    setAgreementPacket(null);
    setReturnReceived(false);
    if (!["returnAt", "returnMileage", "returnCondition", "fuelIn", "keysReturned", "receivedBy"].includes(key)) {
      setDocuments((current) => {
        const next = { ...current };
        delete next["td-signed-release"];
        if (["driverLicense", "licenseState", "licenseExpiration"].includes(key)) delete next["td-driver-license"];
        if (["insuranceCarrier", "insurancePolicy", "insuranceBasis"].includes(key)) delete next["td-insurance-proof"];
        return next;
      });
    }
    if (key === "vin") { setReleasePhotos({}); setReturnPhotos({}); }
    setFacts((current) => ({ ...current,
      ...(["driverLicense", "licenseState", "licenseExpiration"].includes(key) ? { licenseVerified: false } : {}),
      ...(["insuranceCarrier", "insurancePolicy", "insuranceBasis", "vin"].includes(key) ? { insuranceVerified: false } : {}),
      [key]: value }));
    onAmountChange("$0.00");
  }

  function changeVehicle(value: string) {
    setReviewNotice("");
    setDeparturePhotosDeferred(false);
    agreementRevision.current += 1;
    setAgreementStatus({ kind: "idle", message: "" });
    setFacts((current) => ({ ...current, vin: getVinFromVehicleInput(value), stockNumber: "", year: "", make: "", model: "", trim: "",
      departureMileage: "", departureCondition: "", fuelOut: "", insuranceVerified: false,
      returnAt: "", returnMileage: "", returnCondition: "", fuelIn: "", keysReturned: false, receivedBy: "" }));
    setAgreementPacket(null);
    setDocuments((current) => { const next = { ...current }; delete next["td-signed-release"]; return next; });
    setReturnReceived(false);
    setReleasePhotos({});
    setReturnPhotos({});
    onVehicleChange(value);
  }

  function applyReviewVehicle(values: Partial<{ vin: string; stockNumber: string; year: string; make: string; model: string; trim: string }>) {
    const identity = { vin: driveVin, stockNumber: facts.stockNumber, year: facts.year, make: facts.make, model: facts.model, trim: facts.trim };
    for (const key of Object.keys(identity) as Array<keyof typeof identity>) {
      if (typeof values[key] === "string") identity[key] = values[key]!;
    }
    const reference = [identity.year, identity.make, identity.model, identity.vin, identity.stockNumber].filter(Boolean).join(" / ");
    if (identity.vin !== driveVin) changeVehicle(reference);
    else {
      agreementRevision.current += 1;
      setAgreementStatus({ kind: "idle", message: "" });
      setAgreementPacket(null);
      setDocuments((current) => { const next = { ...current }; delete next["td-signed-release"]; return next; });
      onVehicleChange(reference);
    }
    setFacts((current) => ({ ...current, ...identity }));
  }

  const getDocumentContext = useContext(DealDocumentContext);
  const identityDraft = useDealDraft();
  async function generateAgreement() {
    if (identityDraft && !await identityDraft.save()) return;
    if (agreementError || !validVehicle || customerName === "Customer not selected") {
      setAgreementStatus({ kind: "error", message: agreementError || "Select the driver and capture the vehicle VIN." });
      return;
    }
    setAgreementStatus({ kind: "generating", message: "Generating test-drive agreement..." });
    const revision = agreementRevision.current;
    try {
      const response = await requestContractPacket({
        method: "POST", headers: { "content-type": "application/json" },
        body: JSON.stringify({
          ...getDocumentContext(),
          packetType: "TEST_DRIVE", customerName, dealNumber: facts.stockNumber || getStockNumberFromVin(driveVin),
          testDrive: agreementFacts,
          vehicle: { vin: driveVin, stockNumber: facts.stockNumber || getStockNumberFromVin(driveVin),
            year: facts.year, make: facts.make, model: facts.model, trim: facts.trim, mileage: facts.departureMileage }
        })
      });
      const payload = await response.json();
      if (revision !== agreementRevision.current) return;
      if (!response.ok) throw new Error(payload.error || "Test-drive agreement could not be generated.");
      setAgreementPacket(payload as GeneratedContractPacket);
      setAgreementStatus({ kind: "ready", message: "Test-drive agreement generated and archived." });
    } catch (error) {
      if (revision !== agreementRevision.current) return;
      setAgreementStatus({ kind: "error", message: error instanceof Error ? error.message : "Test-drive agreement could not be generated." });
    }
  }

  function downloadAgreement() {
    if (!agreementDocument) return;
    const link = document.createElement("a");
    link.href = documentDataUrl(agreementDocument);
    link.download = agreementDocument.downloadFileName;
    link.click();
  }

  function printAgreement() {
    if (agreementDocument && !openPrintablePdfDocument(agreementDocument)) {
      setAgreementStatus({ kind: "error", message: "Print window was blocked. Download the agreement instead." });
    }
  }

  function captureEvidence(
    setter: (value: SetStateAction<Record<string, string>>) => void,
    id: string,
    file?: File
  ) {
    if (!file) return;
    setReviewNotice("");
    setReturnReceived(false);
    setter((current) => ({ ...current, [id]: file.name }));
  }

  async function saveIntakeWithPhotosPending() {
    setReviewBusy(true);
    setSavingPhotoPlan(true);
    setReviewError("");
    setReviewNotice("");
    setDeparturePhotosDeferred(true);
    try {
      if (!draftStore || !await draftStore.save()) throw new Error("Save failed");
      setReviewNotice("Intake saved with photos pending. Vehicle not released.");
      setReviewPanel(null);
    } catch {
      setDeparturePhotosDeferred(departurePhotosDeferred);
      setReviewError("Intake could not be saved. Your entries remain here; retry saving before leaving.");
    } finally {
      setReviewBusy(false);
      setSavingPhotoPlan(false);
    }
  }

  async function startReviewedDrive() {
    setReviewBusy(true);
    setReviewError("");
    try {
      if (await onComplete()) {
        setStarted(true);
        setReviewPanel(null);
        if (draftStore && !await draftStore.save()) setReviewError("Drive started. Save the draft again to retain its active state.");
      }
    } catch {
      setReviewError("The drive could not be started. Try again.");
    } finally {
      setReviewBusy(false);
    }
  }

  async function receiveReviewedDrive() {
    setReturnReceived(true);
    if (!review) return;
    setReviewBusy(true);
    setReviewError("");
    try {
      if (draftStore && await draftStore.save()) setReviewPanel(null);
      else { setReturnReceived(false); setReviewError("Return could not be saved. Try again."); }
    } catch {
      setReturnReceived(false);
      setReviewError("Return could not be saved. Try again.");
    } finally {
      setReviewBusy(false);
    }
  }

  function renderVehicleDetails() {
    return <>
      <label><span>Stock number</span><input value={facts.stockNumber} onChange={(event) => update("stockNumber", event.target.value)} /></label>
      {!review && <CrmNextVinDecoder ref={vinDecoderRef} vin={driveVin} query={vehicle} fields={{ vin: driveVin, stockNumber: facts.stockNumber, year: facts.year, make: facts.make, model: facts.model, trim: facts.trim }} onApply={(values, onlyEmpty) => {
        setFacts((current) => ({ ...current, ...(onlyEmpty ? fillEmptyDecodeFields({ vin: current.vin, stockNumber: current.stockNumber, year: current.year, make: current.make, model: current.model, trim: current.trim }, values) : values) }));
      }} />}
      <label><span>Year</span><input value={facts.year} onChange={(event) => update("year", event.target.value)} /></label>
      <label><span>Make</span><input value={facts.make} onChange={(event) => update("make", event.target.value)} /></label>
      <label><span>Model</span><input value={facts.model} onChange={(event) => update("model", event.target.value)} /></label>
      <label><span>Trim</span><input value={facts.trim} onChange={(event) => update("trim", event.target.value)} /></label>
    </>;
  }

  return (
    <div className={`${styles.retailExecutionDesk} ${review ? styles.testDriveReview : ""}`}>
      {review && <section className={styles.testDriveCheckout} aria-label="Test-drive checkout review">
        <header><div><span>{returnReceived ? "Returned" : started ? "Test drive active" : "Departure checks"}</span><h3>{vehicle || "Select a vehicle"}</h3><p>{customerName} · {employeeName}</p></div><button type="button" disabled={reviewBusy} onClick={onSaveDraft}><Save size={16} />Save draft</button></header>
        {started ? <div className={styles.testDriveActive}><dl><div><dt>Departure</dt><dd>{facts.testDriveDate} {facts.startTime}</dd></div><div><dt>Expected return</dt><dd>{returnDeadline}</dd></div></dl><button type="button" onClick={() => setReviewPanel("return")}>{returnReceived ? "Review return" : "Record return"}<ChevronRight size={16} /></button></div> : <>
          <div className={styles.testDriveCheckList}>
            {reviewChecks.map(([panel, label, ready]) => <button type="button" key={panel} aria-expanded={reviewPanel === panel} onClick={() => setReviewPanel(reviewPanel === panel ? null : panel)}>{ready ? <CheckCircle2 size={18} /> : <Circle size={18} />}<span>{label}</span><small>{ready ? "Ready" : panel === "photos" && departurePhotosDeferred ? "Pending · before departure" : "Needs review"}</small><ChevronRight size={16} /></button>)}
          </div>
          {agreementError && <p className={styles.testDriveReviewError} role="status">{agreementError}</p>}
          <footer><span>{uploadBusy ? "Saving documents..." : releaseReady ? "Ready for departure" : pendingReviewChecks ? `${pendingReviewChecks} ${pendingReviewChecks === 1 ? "check" : "checks"} remaining` : "Review authorization details"}</span>{!releasePhotosReady && <button className={styles.testDriveDeferPhotos} type="button" disabled={reviewBusy || uploadBusy || statusKind === "saving"} onClick={saveIntakeWithPhotosPending}><Save size={16} />{reviewBusy ? "Saving..." : "Save intake · photos later"}</button>}<button type="button" disabled={reviewBusy || uploadBusy || statusKind === "saving"} onClick={() => {
            if (releaseReady && !uploadError) void startReviewedDrive();
            else setReviewPanel(uploadError ? "agreement" : reviewChecks.find(([, , ready]) => !ready)?.[0] ?? "vehicle");
          }}>{releaseReady ? <Play size={16} /> : <ChevronRight size={16} />}{savingPhotoPlan ? "Saving intake..." : reviewBusy || statusKind === "saving" ? "Starting..." : releaseReady && !uploadError ? "Start test drive" : "Complete next check"}</button></footer>
        </>}
        {reviewError && <p role="alert">{reviewError}</p>}
        {reviewNotice && <p role="status">{reviewNotice}</p>}
        {uploadError && <p role="alert">{uploadError}</p>}
      </section>}
      {review && reviewPanel && <div ref={reviewEditorHeading} className={styles.testDrivePanelHeading}><button type="button" onClick={() => setReviewPanel(null)}><ArrowLeft size={16} />{started ? "Back to active drive" : "Back to checks"}</button></div>}
      <section hidden={review && reviewPanel !== "driver"} className={styles.retailSection} id="test-drive-driver">
        <header>
          <span>Driver eligibility</span>
          <strong>Confirm the customer can take the vehicle on a test drive</strong>
        </header>
        <div className={styles.retailFieldGrid}>
          {!review && <label><span>Customer</span><input readOnly value={customerName} /></label>}
          <label><span>Driver license</span><input value={facts.driverLicense} onChange={(event) => update("driverLicense", event.target.value)} placeholder="License number or verified reference" /></label>
          <label><span>Driver phone</span><input value={facts.driverPhone} onChange={(event) => update("driverPhone", event.target.value)} /></label>
          <label><span>License state</span><input value={facts.licenseState} onChange={(event) => update("licenseState", event.target.value)} /></label>
          <label><span>License expiration</span><input type="date" value={facts.licenseExpiration} onChange={(event) => update("licenseExpiration", event.target.value)} /></label>
          {!review && <label><span>Driver email</span><input type="email" value={facts.driverEmail} onChange={(event) => update("driverEmail", event.target.value)} /></label>}
          <label><span>Coverage basis</span><select value={facts.insuranceBasis} onChange={(event) => update("insuranceBasis", event.target.value)}><option value="DRIVER_POLICY">Driver policy reviewed</option><option value="DEALER_REVIEW">Dealership coverage reviewed</option></select></label>
          {(!review || facts.insuranceBasis === "DRIVER_POLICY") && <><label><span>Insurance carrier</span><input value={facts.insuranceCarrier} onChange={(event) => update("insuranceCarrier", event.target.value)} /></label>
          <label><span>Insurance policy</span><input value={facts.insurancePolicy} onChange={(event) => update("insurancePolicy", event.target.value)} /></label></>}
          {review ? <details className={styles.retailWide}><summary>Drive type and staff · {facts.driveMode === "SUPERVISED" ? "Supervised" : "Unaccompanied"}</summary><div className={styles.retailFieldGrid}>
            <label><span>Authorizing employee</span><input value={facts.salesperson} onChange={(event) => update("salesperson", event.target.value)} /></label>
            <label><span>Drive type</span><select value={facts.driveMode} onChange={(event) => update("driveMode", event.target.value)}><option value="SUPERVISED">Supervised</option><option value="UNACCOMPANIED">Unaccompanied</option></select></label>
            {facts.driveMode === "SUPERVISED" && <label><span>Accompanying employee</span><input value={facts.accompanyingEmployee} onChange={(event) => update("accompanyingEmployee", event.target.value)} /></label>}
            <label><span>Driver email</span><input type="email" value={facts.driverEmail} onChange={(event) => update("driverEmail", event.target.value)} /></label>
          </div></details> : <>
            <label><span>Authorizing employee</span><input value={facts.salesperson} onChange={(event) => update("salesperson", event.target.value)} /></label>
            <label><span>Drive type</span><select value={facts.driveMode} onChange={(event) => update("driveMode", event.target.value)}><option value="SUPERVISED">Supervised</option><option value="UNACCOMPANIED">Unaccompanied</option></select></label>
            {facts.driveMode === "SUPERVISED" && <label><span>Accompanying employee</span><input value={facts.accompanyingEmployee} onChange={(event) => update("accompanyingEmployee", event.target.value)} /></label>}
          </>}
          {!review && customerDetailRows.length ? <div className={`${styles.retailWide} ${styles.customerPrefillSummary}`}><span>Selected customer details</span><dl>{customerDetailRows.map(([label, value]) => <div key={label}><dt>{label}</dt><dd>{value}</dd></div>)}</dl></div> : null}
          <fieldset className={styles.leaseCalculationMode}><legend>Staff verification</legend><label><input type="checkbox" checked={facts.licenseVerified} onChange={(event) => update("licenseVerified", event.target.checked)} />Valid license verified</label><label><input type="checkbox" checked={facts.insuranceVerified} onChange={(event) => update("insuranceVerified", event.target.checked)} />Coverage reviewed for this drive</label></fieldset>
        </div>
      </section>

      <section hidden={review && reviewPanel !== "vehicle"} className={styles.retailSection} id="test-drive-vehicle">
        <header>
          <span>Vehicle and route</span>
          <strong>Assign the unit and set the test-drive window</strong>
        </header>
        <div className={styles.retailFieldGrid}>
          {review ? <TestDriveVehiclePicker vehicle={vehicle} fields={{ vin: driveVin, stockNumber: facts.stockNumber, year: facts.year, make: facts.make, model: facts.model, trim: facts.trim }} onApply={applyReviewVehicle} onVinChange={changeVehicle} /> : <>
            <label><span>Vehicle / stock #</span><input value={vehicle} onChange={(event) => changeVehicle(event.target.value)} /></label>
            <label><span>VIN</span><input maxLength={17} onDoubleClick={() => vinDecoderRef.current?.decodeAndFill()} title="Double-click to decode and fill vehicle details" value={driveVin} onChange={(event) => update("vin", normalizeVin(event.target.value))} /></label>
          </>}
          {review ? <details className={styles.retailWide}><summary>Vehicle details</summary><div className={styles.retailFieldGrid}>{renderVehicleDetails()}</div></details> : renderVehicleDetails()}
          <label><span>Checkout odometer</span><input type="number" min="0" step="1" value={facts.departureMileage} onChange={(event) => update("departureMileage", event.target.value)} /></label>
          <label><span>Fuel out</span><input value={facts.fuelOut} onChange={(event) => update("fuelOut", event.target.value)} /></label>
          <label><span>Checkout condition</span><input value={facts.departureCondition} onChange={(event) => update("departureCondition", event.target.value)} /></label>
          <label><span>Date</span><input type="date" value={facts.testDriveDate} onChange={(event) => update("testDriveDate", event.target.value)} /></label>
          <label><span>Start time</span><input type="time" value={facts.startTime} onChange={(event) => update("startTime", event.target.value)} /></label>
          <label><span>Time allowance (minutes)</span><input type="number" min="1" step="1" value={facts.durationMinutes} onChange={(event) => update("durationMinutes", event.target.value)} /></label>
          <label><span>Mileage allowance</span><input type="number" min="1" step="1" value={facts.mileageAllowance} onChange={(event) => update("mileageAllowance", event.target.value)} /></label>
          <label><span>Return deadline (Central)</span><input readOnly value={returnDeadline} /></label>
          <label><span>Approved route</span><input value={facts.approvedRoute} onChange={(event) => update("approvedRoute", event.target.value)} /></label>
          <label className={styles.retailWide}><span>Notes</span><textarea value={facts.notes} onChange={(event) => update("notes", event.target.value)} placeholder="Trade-in interest, requested vehicle, route exception, or manager note" rows={3} /></label>
        </div>
      </section>

      <section hidden={review && reviewPanel !== "agreement"} className={styles.retailSection}>
        <header><span>Test-drive agreement</span><strong>Authorization and vehicle release</strong></header>
        <div className={`${styles.retailNextActionBar} ${styles.testDriveAgreementActions}`}>
          <div><strong>{agreementError || (agreementStatus.kind === "idle" ? "Ready to generate" : "")}</strong><PacketFeedback status={agreementStatus}><SavedPacketLink packet={agreementPacket} /></PacketFeedback></div>
          <button type="button" disabled={agreementStatus.kind === "generating"} onClick={generateAgreement}><FilePlus2 size={16} aria-hidden="true" />Generate agreement</button>
          <button type="button" disabled={!agreementDocument} onClick={() => setAgreementPreviewOpen(true)}><Eye size={16} aria-hidden="true" />Preview</button>
          <button type="button" disabled={!agreementDocument} onClick={downloadAgreement}><Download size={16} aria-hidden="true" />Download PDF</button>
          <button type="button" disabled={!agreementDocument} onClick={printAgreement}><Printer size={16} aria-hidden="true" />Print agreement</button>
        </div>
      </section>
      {agreementPreviewOpen && agreementDocument && <div className={styles.retailPacketPreviewBackdrop}><section role="dialog" aria-modal="true" aria-label="Test-drive agreement preview" className={`${styles.retailPacketPreviewDrawer} ${styles.testDriveAgreementPreview}`}><header><strong>Test-drive agreement</strong><button type="button" title="Close preview" aria-label="Close preview" onClick={() => setAgreementPreviewOpen(false)}><X size={18} aria-hidden="true" /></button></header><iframe title="Test-drive agreement preview" srcDoc={agreementDocument.html} /></section></div>}

      <section hidden={review && !["agreement", "photos", "return"].includes(reviewPanel ?? "")} className={styles.retailSection} id="test-drive-evidence">
        <header>
          <span>Test-drive evidence</span>
          <strong>{reviewPanel === "return" ? "Vehicle receiving" : "Signed form and photos are required before release"}</strong>
        </header>
        <div hidden={review} className={styles.rentalEvidenceSummary}>
          <div><span>Release photos</span><strong>{releasePhotoCount}/{TEST_DRIVE_RELEASE_REQUIREMENTS.length}</strong><small>{releasePhotosReady ? "Ready" : "Required before departure"}</small></div>
          <div><span>Documents</span><strong>{documentCount}/{TEST_DRIVE_DOCUMENT_REQUIREMENTS.length}</strong><small>{documentsReady ? "Recorded" : "Required before departure"}</small></div>
          <div><span>Return photos</span><strong>{returnPhotoCount}/{TEST_DRIVE_RETURN_REQUIREMENTS.length}</strong><small>{returnPhotosReady ? "Ready to receive" : "Required at return"}</small></div>
        </div>
        <div className={styles.rentalEvidenceBoard}>
          <section hidden={review && reviewPanel !== "agreement"}>
            <h3>Signed form and proof</h3>
            <p>Attach the signed test-drive form, license proof, and insurance proof. These records should later live in the central document library and link back to customer, vehicle, and opportunity.</p>
            <div className={styles.rentalEvidenceGrid}>
              {TEST_DRIVE_DOCUMENT_REQUIREMENTS.map((item) => (
                <label className={documents[item.id] ? styles.rentalEvidenceCaptured : undefined} key={item.id}>
                  <span>{item.label}</span>
                  <strong>{documents[item.id] ?? "Document required"}</strong>
                  <small>{item.helper}</small>
                  <StorageDestination>customer library, vehicle file, and test-drive record</StorageDestination>
                  <input data-document-type={item.id} accept="application/pdf,image/*" capture={item.id === "td-signed-release" ? undefined : "environment"} onChange={(event) => captureEvidence(setDocuments, item.id, event.currentTarget.files?.[0])} type="file" />
                </label>
              ))}
            </div>
          </section>
          <section hidden={review && reviewPanel !== "photos"}>
            <h3>Release photos</h3>
            {review && !started && <div className={styles.testDrivePhotoPlan}><span>{departurePhotosDeferred ? "Photos pending before departure" : "Departure photos"}</span><button type="button" disabled={reviewBusy || uploadBusy} onClick={saveIntakeWithPhotosPending}><Save size={16} />Take photos later</button></div>}
            <p>Capture the vehicle condition before the test drive begins.</p>
            <div className={styles.rentalEvidenceGrid}>
              {TEST_DRIVE_RELEASE_REQUIREMENTS.map((item) => review ? <div key={item.id} className={`${styles.testDrivePhotoTile} ${releasePhotos[item.id] ? styles.rentalEvidenceCaptured : ""}`}>
                <span>{item.label}</span><strong>{releasePhotos[item.id] ?? "Photo pending"}</strong>
                <label><Camera size={16} />Take photo<input aria-label={`Take ${item.label} photo`} data-document-type="release-condition" accept="image/*" capture="environment" onChange={(event) => captureEvidence(setReleasePhotos, item.id, event.currentTarget.files?.[0])} type="file" /></label>
                <label><Upload size={16} />Upload existing photo<input aria-label={`Upload existing ${item.label} photo`} data-document-type="release-condition" accept="image/*" onChange={(event) => captureEvidence(setReleasePhotos, item.id, event.currentTarget.files?.[0])} type="file" /></label>
              </div> : (
                <label className={releasePhotos[item.id] ? styles.rentalEvidenceCaptured : undefined} key={item.id}>
                  <span>{item.label}</span>
                  <strong>{releasePhotos[item.id] ?? "Photo required"}</strong>
                  <small>{item.helper}</small>
                  <StorageDestination>vehicle file and test-drive record</StorageDestination>
                  <input data-document-type="release-condition" accept="image/*" capture="environment" onChange={(event) => captureEvidence(setReleasePhotos, item.id, event.currentTarget.files?.[0])} type="file" />
                </label>
              ))}
            </div>
          </section>
          <section hidden={review && reviewPanel !== "return"}>
            <h3>Return / receiving photos</h3>
            <div className={styles.retailFieldGrid}>
              <label><span>Actual return time</span><input type="datetime-local" value={facts.returnAt} onChange={(event) => update("returnAt", event.target.value)} /></label>
              <label><span>Return odometer</span><input type="number" min={facts.departureMileage || "0"} step="1" value={facts.returnMileage} onChange={(event) => update("returnMileage", event.target.value)} /></label>
              <label><span>Fuel in</span><input value={facts.fuelIn} onChange={(event) => update("fuelIn", event.target.value)} /></label>
              <label><span>Return condition</span><input value={facts.returnCondition} onChange={(event) => update("returnCondition", event.target.value)} /></label>
              <label><span>Receiving employee</span><input value={facts.receivedBy} onChange={(event) => update("receivedBy", event.target.value)} /></label>
              <fieldset className={styles.leaseCalculationMode}><legend>Return check</legend><label><input type="checkbox" checked={facts.keysReturned} onChange={(event) => update("keysReturned", event.target.checked)} />All keys returned</label></fieldset>
            </div>
            <p>Complete receiving after the customer returns with mileage, fuel, interior, and damage review recorded.</p>
            <div className={styles.rentalEvidenceGrid}>
              {TEST_DRIVE_RETURN_REQUIREMENTS.map((item) => (
                <label className={returnPhotos[item.id] ? styles.rentalEvidenceCaptured : undefined} key={item.id}>
                  <span>{item.label}</span>
                  <strong>{returnPhotos[item.id] ?? "Photo required"}</strong>
                  <small>{item.helper}</small>
                  <StorageDestination>vehicle file and receiving record</StorageDestination>
                  <input data-document-type="return-condition" accept="image/*" capture="environment" onChange={(event) => captureEvidence(setReturnPhotos, item.id, event.currentTarget.files?.[0])} type="file" />
                </label>
              ))}
            </div>
            <div className={styles.retailNextActionBar} aria-label="Test drive receiving next actions">
              <div>
                <span>Receiving readiness</span>
                <strong>{returnReceived ? "Test drive received with evidence" : returnPhotosReady ? "Ready to receive vehicle" : `${returnPhotoCount}/${TEST_DRIVE_RETURN_REQUIREMENTS.length} return photos ready`}</strong>
              </div>
              <button disabled={!returnPhotosReady || !agreementFacts.returnAt || Boolean(agreementError) || returnReceived || reviewBusy || (review && (uploadBusy || Boolean(uploadError)))} onClick={receiveReviewedDrive} type="button">{returnReceived ? "Return received" : "Complete receiving"}</button>
            </div>
          </section>
        </div>
      </section>

      <section hidden={review} className={styles.retailSection} id="test-drive-checkout">
        <header>
          <span>Checkout controls</span>
          <strong>Release only after driver, document, and photo gates are ready</strong>
        </header>
        <div className={styles.rentalReadinessGrid}>
          {[
            ["Customer", customerName !== "Customer not selected" ? "Selected" : "Needs customer"],
            ["Vehicle", validVehicle ? "Assigned" : "Needs valid VIN"],
            ["Driver", driverReady ? "Verified" : "Needs license / insurance"],
            ["Signed form", documentsReady ? "Recorded" : "Needs documents"],
            ["Release photos", releasePhotosReady ? "Captured" : "Needs photos"],
            ["Return plan", returnDeadline ? "Scheduled" : "Needs return time"]
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
  customerPrefill: CustomerDealPrefill;
  customerName: string;
  onAmountChange: (value: string) => void;
  onComplete: () => void;
  onSaveDraft: () => void;
  onVehicleChange: (value: string) => void;
  statusKind: "idle" | "saving" | "success" | "error";
  vehicle: string;
}) {
  const [packet, setPacket] = useDealDraftState<Record<string, string>>("packet", {});
  const [evidence, setEvidence] = useDealDraftState<Record<string, string>>("evidence", {});
  const [handoff, setHandoff] = useDealDraftState<Record<string, boolean>>("handoff", {});
  const [buyer, setBuyer] = useDealDraftState("buyer", {
    buyerName: customerName === "Customer not selected" ? "" : customerName,
    contactName: "",
    dealerLicense: "",
    paymentMethod: "Certified funds",
    resaleTaxId: "",
    transportMethod: "Buyer pickup"
  });
  const [terms, setTerms] = useDealDraftState("terms", {
    balanceDue: "",
    deposit: "$0.00",
    releaseDate: todayInputValue(),
    salePrice: amount,
    titleStatus: "Ready",
    wholesaleChannel: "Dealer-to-dealer"
  });
  const [approval, setApproval] = useDealDraftState("approval", {
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
                  <input data-document-type={item.id} accept="application/pdf,image/*" onChange={(event) => captureEvidence(setPacket, item.id, event.currentTarget.files?.[0])} type="file" />
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
                  <input data-document-type={item.id} accept="application/pdf,image/*" capture="environment" onChange={(event) => captureEvidence(setEvidence, item.id, event.currentTarget.files?.[0])} type="file" />
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
  customerPrefill,
  customerName,
  onAmountChange,
  onComplete,
  onSaveDraft,
  onVehicleChange,
  statusKind,
  vehicle
}: {
  amount: string;
  customerPrefill: CustomerDealPrefill;
  customerName: string;
  onAmountChange: (value: string) => void;
  onComplete: () => void;
  onSaveDraft: () => void;
  onVehicleChange: (value: string) => void;
  statusKind: "idle" | "saving" | "success" | "error";
  vehicle: string;
}) {
  const [packet, setPacket] = useDealDraftState<Record<string, string>>("packet", {});
  const [evidence, setEvidence] = useDealDraftState<Record<string, string>>("evidence", {});
  const [handoff, setHandoff] = useDealDraftState<Record<string, boolean>>("handoff", {});
  const [funding, setFunding] = useDealDraftState("funding", {
    approvalNumber: "",
    fundingPath: "Outside finance",
    lenderName: "",
    lienholderAddress: "",
    onePayReference: "",
    stipulations: ""
  });
  const [terms, setTerms] = useDealDraftState("terms", {
    amountDueAtDelivery: "$0.00",
    downPayment: "$0.00",
    expectedFundingDate: todayInputValue(),
    salePrice: amount,
    tradePayoff: "$0.00"
  });
  const [approval, setApproval] = useDealDraftState("approval", {
    deliveryBeforeFunding: false,
    insuranceException: false,
    lienholderException: false,
    stipulationOpen: false,
    titleException: false
  });
  const [titleAuthorityNeeded, setTitleAuthorityNeeded] = useDealDraftState("titleAuthorityNeeded", false);

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
          <CustomerIdentityDetails key={JSON.stringify(customerPrefill)} includeCreditFields prefill={customerPrefill} />
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
                  <input data-document-type={item.id} accept="application/pdf,image/*" onChange={(event) => captureEvidence(setPacket, item.id, event.currentTarget.files?.[0])} type="file" />
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
                  <input data-document-type={item.id} accept="application/pdf,image/*" capture="environment" onChange={(event) => captureEvidence(setEvidence, item.id, event.currentTarget.files?.[0])} type="file" />
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

export function CrmNextDealStartTool(props: { reviewTestDrive?: boolean; initialCustomerId?: string; initialWorkflowId?: string; initialVehicleReference?: string; initialVehicleFacts?: Record<string, string>; model: CrmNextCommandCenter }) {
  const params = useSearchParams();
  return <DealDraftWorkspace key={params?.toString() ?? ""} initialCustomerId={props.initialCustomerId} initialVehicleFacts={props.initialVehicleFacts} customers={props.model.customers}><DealStartDesk {...props} /></DealDraftWorkspace>;
}

function DealStartDesk({
  reviewTestDrive: initialReviewTestDrive = false,
  initialCustomerId,
  initialWorkflowId,
  initialVehicleReference,
  model
}: {
  reviewTestDrive?: boolean;
  initialCustomerId?: string;
  initialWorkflowId?: string;
  initialVehicleReference?: string;
  model: CrmNextCommandCenter;
}) {
  const savedDeal = useDealDraft();
  const router = useRouter();
  const preferredCustomer = model.customers.find((customer) => customer.id === initialCustomerId) ?? null;
  const [customerChoices, setCustomerChoices] = useState<DealCustomerChoice[]>(model.customers.map(customer => ({ ...customer, customerNumber: customer.id })));
  const [identity, setIdentity] = useDealDraftState<DealIdentity>("identity", { ...emptyDealIdentity });
  const [relatedSource, setRelatedSource] = useState<{ customerName: string; sourceVehicleReference: string; sourceVehicleId: string } | null>(null);
  const [sourceError, setSourceError] = useState("");
  const [reviewTestDrive, setReviewTestDrive] = useState(initialReviewTestDrive);
  const documentUploadQueue = useRef(Promise.resolve());
  const pendingDocumentUploads = useRef(0);
  const [documentUploadBusy, setDocumentUploadBusy] = useState(false);
  const failedDocumentUploads = useRef(new Set<HTMLInputElement>());
  const [documentArchiveMessage, setDocumentArchiveMessage] = useState("");
  const [documentArchiveError, setDocumentArchiveError] = useDealDraftState("documentArchiveError", "");
  const [documentJacketHref, setDocumentJacketHref] = useDealDraftState("documentJacketHref", "/sales-documents");
  const [workflowId, setWorkflowId] = useDealDraftState<DealWorkflowId>("workflowId", "retail-sale");
  const [selectedPresetId, setSelectedPresetId] = useDealDraftState("selectedPresetId", "retail-cash-one-pay");
  const [executionOpen, setExecutionOpen] = useDealDraftState("executionOpen", false);
  const [summaryOpen, setSummaryOpen] = useState(false);
  const [testDriveInProgress, setTestDriveInProgress] = useState(false);
  const [manualCustomerName, setManualCustomerName] = useDealDraftState("manualCustomerName", "");
  const [form, setForm] = useDealDraftState("form", {
    amount: "",
    customerId: preferredCustomer?.id ?? initialCustomerId ?? "",
    note: "",
    ownerUserId: model.userId,
    vehicle: initialVehicleReference ?? ""
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
  const selectedCustomer = form.customerId && form.customerId !== MANUAL_CUSTOMER_ID ? customerChoices.find((customer) => customer.id === form.customerId) ?? null : null;
  const selectedCustomerId = selectedCustomer?.id ?? "";
  useEffect(() => {
    const params = new URLSearchParams(window.location.search), vehicleId = params.get("vehicleId");
    if (!vehicleId || identity.vehicleId || params.has("draftId")) return;
    const controller = new AbortController();
    void fetch(`/api/crm/v1/deal-identities?type=vehicle&id=${encodeURIComponent(vehicleId)}`, { signal: controller.signal }).then(async response => {
      const vehicle = await response.json(); if (!response.ok) throw new Error(vehicle.error);
      if (controller.signal.aborted) return;
      setIdentity(current => ({ ...current, vehicleId: vehicle.id, inventoryUnitId: vehicle.inventoryUnitId, vehicle }));
      setForm(current => ({ ...current, vehicle: [vehicle.label, vehicle.vin, vehicle.stockNumber].filter(Boolean).join(" / ") }));
    }).catch(error => { if (!controller.signal.aborted) setSourceError(error.message); });
    return () => controller.abort();
  }, [identity.vehicleId, setIdentity, setForm]);
  useEffect(() => {
    if (!form.customerId || form.customerId === MANUAL_CUSTOMER_ID) return;
    const controller = new AbortController();
    void fetch(`/api/crm/v1/deal-identities?type=customer&id=${encodeURIComponent(form.customerId)}`, { signal: controller.signal }).then(async response => {
      const customer = await response.json();
      if (!response.ok) throw new Error(customer.error);
      if (controller.signal.aborted) return;
      setCustomerChoices(current => [customer, ...current.filter(item => item.id !== customer.id)]);
      setIdentity(current => ({ ...current, customerId: customer.id }));
    }).catch(error => { if (!controller.signal.aborted) setSourceError(error.message); });
    return () => controller.abort();
  }, [form.customerId, setIdentity]);
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const sourceDraftId = params.get("sourceDraftId") || identity.sourceDraftId;
    const sourceJacketId = params.get("sourceJacketId") || identity.sourceJacketId;
    if (!sourceDraftId && !sourceJacketId) return;
    const controller = new AbortController();
    const query = new URLSearchParams({ type: "source", ...(sourceDraftId ? { sourceDraftId } : {}), ...(sourceJacketId ? { sourceJacketId } : {}) });
    void fetch(`/api/crm/v1/deal-identities?${query}`, { signal: controller.signal }).then(async response => {
      const source = await response.json(); if (!response.ok) throw new Error(source.error);
      if (controller.signal.aborted) return;
      setRelatedSource(source);
      setIdentity(current => ({ ...current, sourceDraftId: source.sourceDraftId, sourceJacketId: source.sourceJacketId, sourceVehicleId: source.sourceVehicleId, customerId: source.customerId || current.customerId }));
      if (source.customerId) setForm(current => ({ ...current, customerId: source.customerId }));
    }).catch(error => { if (!controller.signal.aborted) setSourceError(error.message); });
    return () => controller.abort();
  }, [identity.sourceDraftId, identity.sourceJacketId, setIdentity, setForm]);
  async function chooseSharedCustomer(customer: DealCustomerChoice) {
    if (form.customerId && form.customerId !== customer.id && form.customerId !== MANUAL_CUSTOMER_ID) {
      if (!window.confirm("Save this deal and start a separate deal for the selected customer? Existing terms and evidence will not be copied.")) return;
      if (!await savedDeal?.save()) return;
      router.push(`/crm-next/deals/start?${new URLSearchParams({ new: "1", customerId: customer.id, pathway: workflowId })}`);
      return;
    }
    setCustomerChoices(current => [customer, ...current.filter(item => item.id !== customer.id)]);
    setManualCustomerName(""); setForm(current => ({ ...current, customerId: customer.id }));
    setIdentity(current => ({ ...current, customerId: customer.id }));
  }
  async function chooseSharedVehicle(vehicle: DealVehicleChoice) {
    if (identity.vehicleId === vehicle.id) {
      setIdentity(current => ({ ...current, inventoryUnitId: vehicle.inventoryUnitId, vehicle }));
      return;
    }
    if (identity.vehicleId && savedDeal?.draftId()) {
      try {
        const response = await fetch(`/api/crm/v1/deal-continuity/${encodeURIComponent(savedDeal.draftId())}`, { cache: "no-store" });
        const result = await response.json();
        if (!response.ok && response.status !== 404) throw new Error(result.error || "Recheck the current assignment before changing vehicle.");
        if (result.bookings?.some((booking: { status: string }) => ["RESERVED", "CHECKED_OUT"].includes(booking.status))) {
          setSourceError("Return or cancel the current vehicle assignment before changing its vehicle. Your existing selection is unchanged.");
          return;
        }
      } catch (error) { setSourceError(error instanceof Error ? error.message : "The current assignment could not be checked."); return; }
    }
    setSourceError("");
    if (identity.vehicleId && identity.vehicleId !== vehicle.id && !window.confirm("Changing the vehicle requires fresh agreement and handoff evidence. Existing issued packets remain saved. Continue?")) return;
    for (const key of ["releasePhotos", "returnPhotos", "documents", "signedDocuments", "paperwork", "packet", "evidence", "handoff"]) savedDeal?.write(`${workflowId}:${key}`, {});
    savedDeal?.write(`${workflowId}:preparedForms`, []);
    savedDeal?.write(`${workflowId}:generatedPacketId`, "");
    savedDeal?.write(`${workflowId}:returnReceived`, false);
    const facts = savedDeal?.read(`${workflowId}:facts`);
    if (facts && typeof facts === "object") savedDeal?.write(`${workflowId}:facts`, { ...facts, licenseVerified: false, insuranceVerified: false, keysReturned: false });
    const fields = savedDeal?.read("fields") as Record<string, unknown> | undefined;
    if (fields) savedDeal?.write("fields", Object.fromEntries(Object.entries(fields).filter(([key]) => !key.startsWith(workflowId + ":"))));
    setIdentity(current => ({ ...current, vehicleId: vehicle.id, inventoryUnitId: vehicle.inventoryUnitId, vehicle }));
    setForm(current => ({ ...current, vehicle: [vehicle.label, vehicle.vin, vehicle.stockNumber].filter(Boolean).join(" / ") }));
  }
  const [authorizedContact, setAuthorizedContact] = useState<{ customerId: string; phoneNumber: string; email: string } | null>(null);
  useEffect(() => {
    if (!selectedCustomerId) return;
    const controller = new AbortController();
    void fetch(`/api/customers/customer-360?customerId=${encodeURIComponent(selectedCustomerId)}&tab=communications`, { signal: controller.signal })
      .then(async (response) => response.ok ? response.json() as Promise<CustomerContactRead> : null)
      .then((result) => {
        if (!controller.signal.aborted && result?.customer) setAuthorizedContact({
          customerId: selectedCustomerId,
          phoneNumber: customerContactValue(result, "PHONE"),
          email: customerContactValue(result, "EMAIL")
        });
      }).catch(() => {});
    return () => controller.abort();
  }, [selectedCustomerId]);
  const customerPrefill = useMemo(() => selectedCustomer ? {
    ...normalizeCustomerDealPrefill(selectedCustomer.dealPrefill),
    phoneNumber: authorizedContact?.customerId === selectedCustomerId ? authorizedContact.phoneNumber : selectedCustomer.phone,
    email: authorizedContact?.customerId === selectedCustomerId ? authorizedContact.email : selectedCustomer.email
  } : EMPTY_CUSTOMER_DEAL_PREFILL, [selectedCustomer, selectedCustomerId, authorizedContact]);
  const manualCustomer = manualCustomerName.trim();
  const effectiveCustomerName = form.customerId === MANUAL_CUSTOMER_ID ? manualCustomerName || "Customer not selected" : selectedCustomer?.name ?? "Customer not selected";
  const customerReady = form.customerId === MANUAL_CUSTOMER_ID ? Boolean(manualCustomer) : effectiveCustomerName !== "Customer not selected";
  const estimatedValueCents = useMemo(() => dollarsToCents(form.amount), [form.amount]);
  const effectiveAmount = nonRevenueWorkflow && !form.amount.trim() ? "$0.00" : form.amount;
  const effectiveEstimatedValueCents = nonRevenueWorkflow && !form.amount.trim() ? 0 : estimatedValueCents;
  const completedCount = useMemo(() => [customerReady ? effectiveCustomerName : "", form.vehicle, effectiveAmount].filter((value) => value.trim()).length, [customerReady, effectiveAmount, effectiveCustomerName, form.vehicle]);
  const ready = completedCount === 3 && Boolean(form.ownerUserId) && Number.isFinite(effectiveEstimatedValueCents);
  const readinessLabel = ready ? "Ready to execute" : `${completedCount}/3 ready`;
  const selectedPreset = DEAL_START_PRESETS.find((preset) => preset.id === selectedPresetId) ?? DEAL_START_PRESETS[0];

  function update(key: keyof typeof form, value: string) {
    if (key === "vehicle" && identity.vehicle?.vin && !value.toUpperCase().includes(identity.vehicle.vin)) setIdentity(current => ({ ...current, vehicleId: "", inventoryUnitId: null, vehicle: null }));
    setForm((current) => ({ ...current, [key]: value }));
  }

  async function applyPreset(preset: DealStartPreset) {
    if (workflowId !== preset.workflowId && form.customerId && form.vehicle) {
      if (!window.confirm("Start this as a separate related path? The existing deal and its paperwork will remain saved.")) return;
      if (!await savedDeal?.save()) return;
      const params = new URLSearchParams({ new: "1", pathway: preset.workflowId, customerId: form.customerId });
      if (preset.workflowId === "vehicle-loaner") params.set("sourceDraftId", savedDeal!.draftId());
      else if (identity.vehicleId) params.set("vehicleId", identity.vehicleId);
      router.push(`/crm-next/deals/start?${params}`); return;
    }
    setSelectedPresetId(preset.id);
    setWorkflowId(preset.workflowId);
    setExecutionOpen(false);
    setStatus({ kind: "idle", message: "" });
  }

  useEffect(() => {
    const workflowPreset = DEAL_START_PRESETS.find((preset) => preset.workflowId === initialWorkflowId);
    if (!workflowPreset || new URLSearchParams(window.location.search).has("draftId")) return;
    const openNewDeal = new URLSearchParams(window.location.search).get("new") === "1";
    const timer = window.setTimeout(() => {
      setSelectedPresetId(workflowPreset.id);
      setWorkflowId(workflowPreset.workflowId);
      if (openNewDeal) setExecutionOpen(true);
      setStatus({ kind: "idle", message: "" });
    }, 0);
    return () => window.clearTimeout(timer);
  }, [initialWorkflowId, setExecutionOpen, setSelectedPresetId, setWorkflowId]);

  function saveDraft() {
    void savedDeal?.save();
  }

  async function startDeal(): Promise<boolean> {
    if (pendingDocumentUploads.current || documentArchiveError) {
      setStatus({ kind: "error", message: pendingDocumentUploads.current ? "Wait for the documents to finish saving." : "Resolve the document save error before completing this workflow." });
      return false;
    }
    if (form.customerId === MANUAL_CUSTOMER_ID || !identity.customerId || !identity.vehicleId) {
      setStatus({ kind: "error", message: "Select or add the shared CRM customer and canonical vehicle above before continuing. Legacy manual entries remain saved for review." });
      return false;
    }
    if (nonRevenueWorkflow) {
      const saved = await savedDeal?.save();
      setStatus({ kind: saved ? "success" : "error", message: saved ? "Operational path saved. Use assignment and handoff; no sales opportunity or original deal was replaced." : "Resolve the draft save before continuing." });
      return false;
    }
    if (!ready || !selectedCustomer || typeof effectiveEstimatedValueCents !== "number") return false;
    setStatus({ kind: "saving", message: "Starting deal..." });
    try {
    const response = await fetch("/api/crm/v1/opportunities", {
      body: JSON.stringify({
        customerId: selectedCustomer.id,
        estimatedValueCents: effectiveEstimatedValueCents,
        idempotencyKey: reviewTestDrive && testDriveWorkflow ? savedDeal?.reference("test-drive:release") ?? crypto.randomUUID() : crypto.randomUUID(),
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
      return false;
    }
    setStatus({ kind: "success", href: payload.opportunity?.href, message: payload.duplicate ? "Execution path replayed safely." : `Execution path opened: ${payload.opportunity?.opportunityNumber ?? "new opportunity"}` });
    return true;
    } catch {
      setStatus({ kind: "error", message: "The execution path could not be opened. Try again." });
      return false;
    }
  }

  function renderCustomerSelector(label = FIELD_LABELS.customer) {
    return (
      <p><strong>{label}:</strong> {effectiveCustomerName}. Use the shared selector above to add or select a customer once.</p>
    );
  }

  function getDocumentContext() {
    const key = `crm-next:document-jacket:${form.customerId}:${workflowId}:${form.vehicle.trim()}`;
    const reference = savedDeal?.reference(key) ?? crypto.randomUUID();
    return { workflowContextId: savedDeal?.draftId() ?? "", jacketReference: reference, dealReference: reference, pathway: workflowId, customerName: effectiveCustomerName, customerId: identity.customerId, vehicleId: identity.vehicleId, vehicleReference: form.vehicle.trim() || "Vehicle not assigned" };
  }

  function archiveSelectedFile(input: HTMLInputElement) {
    const file = input.files?.[0], documentType = input.dataset.documentType;
    if (!file || !documentType) return;
    const context = getDocumentContext();
    pendingDocumentUploads.current += 1;
    setDocumentUploadBusy(true);
    setDocumentArchiveMessage("Saving document to the deal jacket...");
    documentUploadQueue.current = documentUploadQueue.current.then(async () => {
      try {
        const created = await fetch("/api/sales-documents", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(context) });
        const jacket = await created.json();
        if (!created.ok) throw new Error(jacket.error || "The deal jacket could not be created.");
        const upload = new FormData(); upload.set("file", file); upload.set("documentType", documentType);
        const saved = await fetch(`/api/sales-documents/${encodeURIComponent(jacket.id)}/documents`, { method: "POST", body: upload });
        const payload = await saved.json();
        if (!saved.ok) throw new Error(payload.error || "The document could not be saved.");
        savedDeal?.recordJacket(context.pathway, jacket.id);
        failedDocumentUploads.current.delete(input);
        if (!failedDocumentUploads.current.size) setDocumentArchiveError("");
        setDocumentJacketHref(`/sales-documents?jacketId=${encodeURIComponent(jacket.id)}`);
        setDocumentArchiveMessage(`${file.name} saved. Pending staff review.`);
      } catch (error) {
        failedDocumentUploads.current.add(input);
        setDocumentArchiveError(error instanceof Error ? error.message : "The document could not be saved.");
        input.value = "";
      } finally {
        pendingDocumentUploads.current -= 1;
        if (!pendingDocumentUploads.current) setDocumentUploadBusy(false);
      }
    });
  }

  return (
    <SharedDealVehicleContext.Provider value={identity.vehicle ?? null}>
    <DealDocumentContext.Provider value={getDocumentContext}>
    <section className={styles.dealStartTool} data-test-drive-review={reviewTestDrive && testDriveWorkflow ? "true" : undefined} aria-label="Revenue execution desk" onChangeCapture={(event) => { if (event.target instanceof HTMLInputElement) archiveSelectedFile(event.target); }}>
      <div className={identityStyles.identityGrid}>
        <SharedDealCustomerPicker selected={selectedCustomer} initialItems={customerChoices} onSelect={customer => void chooseSharedCustomer(customer)} />
        <SharedDealVehiclePicker selected={identity.vehicle} onSelect={chooseSharedVehicle} label={rentalLikeWorkflow ? "Temporary vehicle" : "Vehicle"} />
      </div>
      {sourceError && <p role="alert">{sourceError}</p>}
      {relatedSource && <section className={identityStyles.useTool}><strong>Related original deal · {relatedSource.customerName}</strong><p>Original vehicle: {relatedSource.sourceVehicleReference}. Its agreement and delivery remain unchanged.</p>{!identity.sourceVehicleId && <SharedDealVehiclePicker label="Original vehicle" onSelect={vehicle => setIdentity(current => ({ ...current, sourceVehicleId: vehicle.id }))} />}</section>}
      {(rentalLikeWorkflow || testDriveWorkflow) && <VehicleUseTool pathway={workflowId} />}
      <header hidden={reviewTestDrive && testDriveWorkflow && executionOpen} className={styles.dealStartHeader}>
        <div>
          <span className={styles.eyebrow}>Revenue execution desk</span>
          <h1>Work the revenue path</h1>
          <p>Choose the channel unfolding in front of staff. The desk asks for only the facts needed to open the right execution path.</p>
        </div>
        <Link className={styles.secondaryButton} href={CRM_NEXT_DEALS_HREF}>Back to deals</Link>
        <Link className={styles.secondaryButton} href={documentJacketHref}>Sales Documents</Link>
        <button className={styles.secondaryButton} type="button" disabled={documentUploadBusy} onClick={async () => {
          if (!window.confirm("Start a new document jacket for this customer and vehicle? The previous jacket will remain saved.")) return;
          const key = `crm-next:document-jacket:${form.customerId}:${workflowId}:${form.vehicle.trim()}`;
          savedDeal?.reference(key, true);
          if (await savedDeal?.save()) window.location.reload();
        }}><FilePlus2 size={16} />New document jacket</button>
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
            <p>{reviewTestDrive && testDriveWorkflow ? "Checkout review" : `${workflow.nextWorkspace} · ${DEAL_PACKET_RULES[workflow.id].packetName}`}</p>
            <div hidden={reviewTestDrive && testDriveWorkflow} className={styles.dealExecutionMeta}>
              <span>{ready ? "Open facts ready" : `${completedCount}/3 open facts ready`}</span>
              <span>Complete gates inside desk</span>
            </div>
          </div>
          <div hidden={reviewTestDrive && testDriveWorkflow} className={styles.executionStatusChips} aria-label="Open execution checks">
            {(financeWorkflow ? ["Applicant", "Lender", "Stips", "Funding"] : outsideFinanceWorkflow ? ["Funding", "Stips", "Title", "Handoff"] : wholesaleWorkflow ? ["Buyer", "Funding", "Title", "Release"] : bhphWorkflow ? ["Proof", "Terms", "Paperwork", "Handoff"] : testDriveWorkflow ? ["License", "Signed form", "Vehicle", "Return plan"] : rentalLikeWorkflow ? ["License", workflow.id === "vehicle-loaner" ? "Courtesy waiver" : "Payment hold", workflow.id === "vehicle-loaner" ? "Loaner unit" : "Vehicle", "Return plan"] : ["Identity", "Vehicle", "Funding", "Delivery"]).map((item) => <span key={item}>{item}</span>)}
          </div>
          {!(reviewTestDrive && testDriveWorkflow) && <button type="button" onClick={() => setSummaryOpen(true)}>Checks</button>}
          <button type="button" onClick={() => setExecutionOpen(false)}>Change path</button>
        </section>
      )}

      {executionOpen && testDriveWorkflow && <nav className={styles.testDriveComparison} aria-label="Test-drive form comparison">
        <strong>Prototype review</strong>
        <div className={styles.testDriveVehicleModes}>
          <button type="button" disabled={testDriveInProgress} aria-pressed={!reviewTestDrive} onClick={() => setReviewTestDrive(false)}>Current form</button>
          <button type="button" aria-pressed={reviewTestDrive} onClick={() => setReviewTestDrive(true)}>Simplified prototype</button>
        </div>
      </nav>}

      {executionOpen && !(reviewTestDrive && testDriveWorkflow) ? (
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
          customerName={effectiveCustomerName}
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
      <DealDraftScope key={identity.vehicleId || "unlinked"} name={workflowId}><main className={styles.dealExecutionBody}>
          {financeWorkflow ? (
            <>
              <div className={styles.dealStartForm}>
                {renderCustomerSelector()}
                <label><span>{FIELD_LABELS.owner}</span><input disabled value={model.userName} /></label>
              </div>
              <DealerFinanceExecutionDesk
                amount={form.amount}
                customerPrefill={customerPrefill}
                customerName={effectiveCustomerName}
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
                {renderCustomerSelector()}
                <label><span>{FIELD_LABELS.owner}</span><input disabled value={model.userName} /></label>
              </div>
              <RetailSaleExecutionDesk
                amount={form.amount}
                customerPrefill={customerPrefill}
                customerName={effectiveCustomerName}
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
                {renderCustomerSelector()}
                <label><span>{FIELD_LABELS.owner}</span><input disabled value={model.userName} /></label>
              </div>
              <BhphExecutionDesk
                amount={form.amount}
                customerPrefill={customerPrefill}
                customerName={effectiveCustomerName}
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
                {renderCustomerSelector()}
                <label><span>{FIELD_LABELS.owner}</span><input disabled value={model.userName} /></label>
              </div>
              <LeaseToOwnExecutionDesk
                customerPrefill={customerPrefill}
                key={effectiveCustomerName}
                customerName={effectiveCustomerName}
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
                {renderCustomerSelector()}
                <label><span>{FIELD_LABELS.owner}</span><input disabled value={model.userName} /></label>
              </div>
              <TestDriveExecutionDesk
                review={reviewTestDrive}
                employeeName={model.userName}
                uploadBusy={documentUploadBusy}
                uploadError={documentArchiveError}
                onActiveChange={setTestDriveInProgress}
                customerPrefill={customerPrefill}
                key={effectiveCustomerName}
                customerName={effectiveCustomerName}
                onAmountChange={(value) => update("amount", value)}
                onComplete={startDeal}
                onSaveDraft={saveDraft}
                onVehicleChange={(value) => update("vehicle", value)}
                statusKind={status.kind}
                vehicle={form.vehicle}
              />
              {!reviewTestDrive && <label className={`${styles.dealStartWide} ${styles.retailNote}`}><span>{FIELD_LABELS.note}</span><textarea value={form.note} onChange={(event) => update("note", event.target.value)} placeholder="Optional context staff needs before working this test drive" rows={3} /></label>}
            </>
          ) : wholesaleWorkflow ? (
            <>
              <div className={styles.dealStartForm}>
                {renderCustomerSelector("Wholesale buyer")}
                <label><span>{FIELD_LABELS.owner}</span><input disabled value={model.userName} /></label>
              </div>
              <WholesaleExecutionDesk
                amount={form.amount}
                customerPrefill={customerPrefill}
                customerName={effectiveCustomerName}
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
                {renderCustomerSelector("Customer / buyer")}
                <label><span>{FIELD_LABELS.owner}</span><input disabled value={model.userName} /></label>
              </div>
              <OutsideFinanceExecutionDesk
                amount={form.amount}
                customerPrefill={customerPrefill}
                customerName={effectiveCustomerName}
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
                {renderCustomerSelector()}
                <label><span>{FIELD_LABELS.owner}</span><input disabled value={model.userName} /></label>
              </div>
              <DailyRentalExecutionDesk
                amount={form.amount}
                customerPrefill={customerPrefill}
                customerName={effectiveCustomerName}
                originalVehicleReference={relatedSource?.sourceVehicleReference ?? ""}
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
              {renderCustomerSelector()}
              <label><span>{FIELD_LABELS.vehicle}</span><input value={form.vehicle} onChange={(event) => update("vehicle", event.target.value)} placeholder="Stock, VIN, or vehicle" /></label>
              <label><span>{FIELD_LABELS.amount}</span><input value={form.amount} onChange={(event) => update("amount", event.target.value)} placeholder="$0.00" /></label>
              <label><span>{FIELD_LABELS.owner}</span><input disabled value={model.userName} /></label>
              <label className={styles.dealStartWide}><span>{FIELD_LABELS.note}</span><textarea value={form.note} onChange={(event) => update("note", event.target.value)} placeholder="Optional context staff needs before working this channel" rows={3} /></label>
            </div>
          )}
      </main></DealDraftScope>
      )}
      {documentArchiveError ? <p role="alert" className={styles.dealStartError}>{documentArchiveError}</p> : documentArchiveMessage ? <p role="status" className={styles.dealStartStatus}>{documentArchiveMessage} <Link href={documentJacketHref}>Open deal jacket</Link></p> : null}
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
    </DealDocumentContext.Provider>
    </SharedDealVehicleContext.Provider>
  );
}

