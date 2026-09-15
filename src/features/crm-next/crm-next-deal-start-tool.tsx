"use client";

import { useMemo, useState } from "react";
import Link from "next/link";

import { CRM_NEXT_DEALS_HREF } from "@/features/crm/crm-route-authority";
import { MN_SALE_FORM_PACKET } from "@/lib/mn-vehicle-sale-form-packet";
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
    downloadFileName: string;
    formId: string;
    html: string;
    label: string;
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

function normalizeVin(value: string) {
  return value.toUpperCase().replace(/[^A-HJ-NPR-Z0-9]/g, "").slice(0, 17);
}

function getStockNumberFromVin(vin: string) {
  return vin.length >= 6 ? vin.slice(-6) : "";
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
      <button disabled={!ready || statusKind === "saving"} onClick={onStart} type="button">{statusKind === "saving" ? "Opening..." : ready ? "Open execution path" : "Complete required facts"}</button>
    </>
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
  const [preparedForms, setPreparedForms] = useState<string[]>([]);
  const [contractPacket, setContractPacket] = useState<GeneratedContractPacket | null>(null);
  const [packetStatus, setPacketStatus] = useState<{ kind: "idle" | "generating" | "ready" | "error"; message: string }>({ kind: "idle", message: "" });
  const [packetPreviewOpen, setPacketPreviewOpen] = useState(false);
  const [previewFormId, setPreviewFormId] = useState<string | null>(null);
  const feeTotalCents = useMemo(() => feeLines.reduce((total, line) => total + line.amountCents, 0), [feeLines]);
  const feeFormula = feeLines.length > 0 ? `${feeLines.map((line) => formatCurrency(line.amountCents)).join(" + ")} = ${formatCurrency(feeTotalCents)}` : "$0.00 = $0.00";
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
        paymentFunding: "To be confirmed",
        preparedFormIds: preparedForms,
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

  function updateVehicleFact(key: keyof typeof vehicleFacts, value: string) {
    setVehicleFacts((current) => ({ ...current, [key]: value }));
  }

  function runVinDecode() {
    const decoded = decodeVin(vehicleFacts.vin);
    setVehicleFacts((current) => ({
      ...current,
      bodyType: decoded.bodyType || current.bodyType,
      make: decoded.make || current.make,
      stockNumber: decoded.stockNumber,
      year: decoded.year || current.year
    }));
    setDecodeStatus(decoded.valid ? "VIN decoded. Confirm make, model, trim, and book values before delivery." : "VIN must be 17 characters before decoding is complete.");
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
          <label><span>Search inventory</span><input value={vehicle} onChange={(event) => onVehicleChange(event.target.value)} placeholder="Stock, VIN, or vehicle" /></label>
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
        <div className={styles.retailFormsCommand}>
          <div>
            <span>Required forms ready</span>
            <strong>{preparedRequiredCount}/{requiredFormCount}</strong>
            <small>Prepare the baseline packet first, then add conditional forms based on finance, trade, products, and delivery.</small>
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
      </section>

    </div>
  );
}

export function CrmNextDealStartTool({ model }: { model: CrmNextCommandCenter }) {
  const [workflowId, setWorkflowId] = useState<DealWorkflowId>("retail-sale");
  const [summaryOpen, setSummaryOpen] = useState(false);
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
  const readinessLabel = ready ? "Ready to execute" : `${completedCount}/3 ready`;

  function update(key: keyof typeof form, value: string) {
    setForm((current) => ({ ...current, [key]: value }));
  }

  function saveDraft() {
    setStatus({ kind: "success", message: "Draft saved. Complete intake when the required facts are ready." });
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

      <section className={styles.executionCommandStrip} aria-label="Revenue execution command">
        <div>
          <span>{workflow.label}</span>
          <strong>{readinessLabel}</strong>
          <small>{workflow.nextWorkspace}</small>
        </div>
        <div className={styles.executionStatusChips} aria-label="Retail execution checks">
          {["Identity", "Vehicle", "Funding", "Delivery"].map((item) => <span key={item}>{item}</span>)}
        </div>
        <button type="button" onClick={() => setSummaryOpen(true)}>Execution Summary</button>
        <button disabled={!ready || status.kind === "saving"} onClick={() => void startDeal()} type="button">
          {status.kind === "saving" ? "Opening..." : "Open execution path"}
        </button>
      </section>

      <nav className={styles.retailSectionJumps} aria-label="Retail sale section jumps">
        <a href="#retail-applicant">Applicant</a>
        <a href="#retail-vehicle">Vehicle</a>
        <a href="#retail-trade">Trade-In</a>
        <a href="#retail-deal">Deal</a>
        <a href="#retail-contracts">Forms</a>
        <button type="button" onClick={() => setSummaryOpen(true)}>Checks</button>
      </nav>

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

      </main>
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
