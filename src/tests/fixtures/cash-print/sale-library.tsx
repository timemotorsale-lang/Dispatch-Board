import { createRoot } from "react-dom/client";
import { PDFDocument } from "pdf-lib";
import { VehicleSaleFormLibrary } from "../../../features/crm-next/vehicle-sale-form-library";
import { SharedDealVehicleContext } from "./support";
import { fixture } from "./draft-store";
import { EMPTY_CASH_SALE } from "../../../lib/cash-retail-sale";
import { CASH_PRINT_CATALOG, type SaleLibraryPathway, saleLibraryCatalog } from "../../../lib/cash-sale-print-library";
const pathway = (new URLSearchParams(location.search).get("pathway") || "finance") as SaleLibraryPathway;
fixture.snapshot.saleLibraryFacts = { ...EMPTY_CASH_SALE, buyerAddress: "100 Sample Street", saleDate: "2026-11-05", mileage: "54000", odometerStatus: "Actual", titleBrand: "None", damageDisclosure: "None known", authorizedAgent: "Demo Staff", warrantyType: "Dealer limited warranty", warrantyCoverage: "Powertrain", warrantyDuration: "30 days or 1000 miles", taxOverride: pathway === "wholesale" ? "0" : "", taxReason: pathway === "wholesale" ? "Fictional verified resale basis" : "" };
fixture.snapshot.jackets = { [pathway]: "fictional-jacket" };
const vehicle = { id: "fixture-vehicle", label: "2005 Toyota Corolla", vin: "1NXBR32E85Z123456", stockNumber: "DEMO", year: "2005", make: "Toyota", model: "Corolla", color: "Silver", licensePlate: "", locationId: null, inventoryUnitId: null, availability: "AVAILABLE", eligibleForUse: true };
const doc = await PDFDocument.create(); doc.addPage(); const base64 = await doc.saveAsBase64();
const controls = { requests: [] as Record<string,unknown>[], originalReads: 0, fixture };
Object.assign(window, { __saleLibraryFixture: controls });
const originalFetch = window.fetch.bind(window);
window.fetch = async (url, init) => {
  const path = String(url);
  if (path.includes("/api/crm-next/cash-print-packs")) return Response.json({ packs: [], policy: { staffCanEdit: true, canEdit: true, canManage: false, updatedAt: null } });
  if (path === "/api/crm/v1/contract-packets" && init?.method === "POST") {
    const body = JSON.parse(String(init.body)); controls.requests.push(body);
    return Response.json({ packetId: "fictional-generated", jacketId: "fictional-jacket", packetNumber: "SHARED-DEMO", documents: body.preparedFormIds.map((formId: string) => ({ formId, label: saleLibraryCatalog(pathway).find(form => form.id === formId)?.label || formId, contentBase64: base64, contentType: "application/pdf", signatureStatus: "UNSIGNED" })) });
  }
  if (path.includes("/api/crm/v1/contract-packets/")) return Response.json({ packetId: "legacy-packet", packetNumber: "LEGACY-DEMO", salesDocumentsHref: "/sales-documents?jacketId=fictional-jacket", documents: [{ formId: "old-agreement", label: "Original previous pathway agreement" }] });
  if (path.includes("/api/sales-documents/fictional-jacket/documents/")) { controls.originalReads++; return new Response(new Uint8Array(await doc.save()), { headers: { "Content-Type": "application/pdf" } }); }
  if (path === "/api/sales-documents/fictional-jacket") return Response.json({ pathway, customerId: "fictional-customer", vin: vehicle.vin, documents: [{ id: "original-bill", type: "wholesale-bill-of-sale", source: "MANUAL_UPLOAD", signed: true, reviewed: true, fileName: "signed-wholesale-original.pdf", contentType: "application/pdf" }] });
  return originalFetch(url, init);
};
const legacyPacket = { packetId: "legacy-packet", packetNumber: "OLD-DEMO", documents: [{ formId: "old-agreement", label: "Previous agreement" }] };
createRoot(document.getElementById("root")!).render(<SharedDealVehicleContext.Provider value={vehicle}><main style={{fontFamily:"Arial",padding:20}}><p>Fictional sale library fixture; no database or production connection.</p><VehicleSaleFormLibrary pathway={pathway} customerName="Demo Buyer" customerPrefill={{ address: "100 Sample Street", phoneNumber: "6125550100", email: "buyer@example.test" }} salePrice="10000" getDocumentContext={() => ({ workflowContextId: "fictional-draft", customerId: "fictional-customer", pathway, vehicleId: vehicle.id })} loan={{ downPayment: "2000", amountFinanced: "9000" }} legacyPacket={legacyPacket} legacyForms={pathway === "wholesale" ? [{ id: "wholesale-bill-of-sale", label: "Wholesale bill of sale" }] : CASH_PRINT_CATALOG} /></main></SharedDealVehicleContext.Provider>);
