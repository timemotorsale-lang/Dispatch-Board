import { createRoot } from "react-dom/client";
import { PDFDocument, StandardFonts } from "pdf-lib";
import { CashRetailSaleDesk } from "../../../features/crm-next/cash-retail-sale-desk";
import { EMPTY_CASH_SALE, CASH_SALE_LABELS } from "../../../lib/cash-retail-sale";
import { fixture } from "./draft-store";
fixture.snapshot.cashSaleFacts = { ...EMPTY_CASH_SALE, buyerAddress: "100 Sample Street, Minneapolis MN", saleDate: "2026-11-04", mileage: "45000", odometerStatus: "Actual", titleBrand: "None", damageDisclosure: "None known", authorizedAgent: "Demo Clerk", warrantyType: "Dealer limited warranty", warrantyCoverage: "Engine and transmission", warrantyDuration: "30 days or 1000 miles" };
fixture.snapshot.vehicleFacts = { vin: "1NXBR32E85Z123456", stockNumber: "DEMO-123", year: "2005", make: "Toyota", model: "Corolla", color: "Silver", trim: "", licensePlate: "" };
if (new URLSearchParams(location.search).has("masked-contact")) Object.assign(fixture.snapshot.cashSaleFacts as object, { buyerPhone: "••••0100", buyerEmail: "d•••@•••", saleDate: "11/05/2026" });
const controls = { generations: 0, failGeneration: false, delay: 0, bodies: [] as Record<string, unknown>[] };
Object.assign(window, { __cashPrintFixture: { fixture, controls } });
const pdf = await PDFDocument.create();
const font = await pdf.embedFont(StandardFonts.Helvetica);
pdf.addPage().drawText("Fictional cash sale document - browser verification only", { x: 30, y: 700, font, size: 12 });
const contentBase64 = await pdf.saveAsBase64();
const originalFetch = window.fetch.bind(window);
window.fetch = async (input, init) => {
  if (String(input).includes("/api/crm/v1/contract-packets")) {
    controls.generations++;
    if (controls.delay) await new Promise(resolve => setTimeout(resolve, controls.delay));
    if (controls.failGeneration) return Response.json({ error: "Fixture document service unavailable. Retry this selection." }, { status: 503 });
    const body = JSON.parse(String(init?.body)); controls.bodies.push(body);
    return Response.json({ packetId: `packet-${controls.generations}`, jacketId: "fixture-jacket", packetNumber: "CASH-FIXTURE", documents: body.preparedFormIds.map((formId: keyof typeof CASH_SALE_LABELS) => ({ formId, label: CASH_SALE_LABELS[formId], contentBase64, contentType: "application/pdf", signatureStatus: "UNSIGNED" })) }, { status: 201 });
  }
  return originalFetch(input, init);
};
createRoot(document.getElementById("root")!).render(<main style={{ maxWidth: 1150, margin: "20px auto", padding: 16, fontFamily: "Arial,sans-serif" }}><p>Isolated cash-sale review fixture · fictional information · no database connection</p><CashRetailSaleDesk amount="10000" customerName="Alex Demo Buyer" customerPrefill={{ address: "100 Sample Street, Minneapolis MN", phoneNumber: "6125550100", email: "demo@example.test" }} vehicle="2005 Toyota Corolla · DEMO-123" onAmountChange={() => {}} onVehicleChange={() => {}} getDocumentContext={() => ({ workflowContextId: "fictional-draft", customerId: "fictional-customer", vehicleId: "fictional-vehicle", pathway: "retail-sale" })} /></main>);
