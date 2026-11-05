import { createRoot } from "react-dom/client";
import { GuidedTestDrive } from "../../../features/crm-next/guided-test-drive";
import { driveAgreementContent, driveLocalTime } from "../../../lib/test-drive-workflow";
import { fixtureState } from "./draft-store";

const vehicle = { id: "vehicle", label: "2005 Toyota Corolla · DEMO-123", vin: "1NXBR32E85Z123456", stockNumber: "DEMO-123", year: "2005", make: "Toyota", model: "Corolla", color: "Silver", licensePlate: "DEMO", inventoryUnitId: "unit", locationId: "lot", availability: "Ready", eligibleForUse: true };
const local = driveLocalTime(new Date(Date.now() - 60000));
fixtureState.snapshot["test-drive:facts"] ??= { driverLicense: "DEMO-D123456", driverPhone: "6125550100", licenseState: "MN", licenseExpiration: "2030-01-01", driveMode: "UNACCOMPANIED", salesperson: "", accompanyingEmployee: "", licenseVerified: false, insuranceBasis: "DEALER_REVIEW", insuranceVerified: false, testDriveDate: local.slice(0, 10), startTime: local.slice(11), durationMinutes: "30", mileageAllowance: "20", departureMileage: "45000", departureCondition: "No new damage", fuelOut: "Full", approvedRoute: "Local route" };
type Doc = { id: string; type: string; fileName: string; reviewed: boolean; signed: boolean };
const model = { bookings: [] as Array<Record<string, unknown>>, currentContent: "", signedCurrent: false, suggestedOdometer: 45000, agreementCurrent: false, agreement: null as null | Record<string, unknown>, jacket: null as null | { id: string; revision: number; documents: Doc[] }, events: [] as Array<Record<string, unknown>> };
const calls: Record<string, number> = {};
const originalFetch = window.fetch.bind(window);
Object.assign(window, { __driveFixture: { model, calls, state: fixtureState } });
window.fetch = async (input, init) => {
  const url = String(input), method = init?.method ?? "GET";
  if (url.includes("/api/crm-next/customers/")) return Response.json({ contacts: [{ type: "PHONE", value: "+16125550100" }] });
  if (url.includes("/api/crm/v1/contract-packets/")) return Response.json(model.agreement?.packet ?? {});
  if (url.includes("/api/crm/v1/test-drives/")) {
    if (method === "GET") return fixtureState.failStatus ? Response.json({ error: "Fixture metadata temporarily unavailable" }, { status: 503 }) : Response.json(model);
    const body = JSON.parse(String(init?.body)); calls[body.action] = (calls[body.action] ?? 0) + 1;
    if (body.action === "GENERATE") {
      model.currentContent = driveAgreementContent(fixtureState.snapshot["test-drive:facts"], "customer", vehicle.vin);
      model.agreementCurrent = true;
      model.jacket ??= { id: "jacket", revision: 1, documents: [] };
      model.agreement = { jacketId: "jacket", packetId: "packet", packet: { packetId: "packet", jacketId: "jacket", documents: [{ html: "<h1>Fixture test-drive agreement</h1>", contentType: "application/pdf", contentBase64: btoa("%PDF-1.4\nFixture only"), downloadFileName: "fixture.pdf" }] } };
      return Response.json({ result: { jacketId: "jacket", packetId: "packet" } });
    }
    if (body.action === "RELEASE") model.bookings = [{ id: "booking", status: "CHECKED_OUT", version: 1, checkedOutAt: new Date(Date.now() - 60000).toISOString(), expectedReturnAt: new Date(Date.now() + 10 * 60000).toISOString(), departureSnapshot: { odometer: 45000 }, returnSnapshot: {} }];
    if (body.action === "RETURN") Object.assign(model.bookings[0], { status: body.facts.returnException ? "RETURNED_REVIEW" : "RETURNED", version: 2, returnedAt: new Date().toISOString(), returnSnapshot: { note: body.facts.exceptionNote } });
    if (body.action === "RESOLVE_EXCEPTION") Object.assign(model.bookings[0], { status: "RETURNED", version: 3, returnSnapshot: { resolution: { note: body.note } } });
    model.events.push({ id: crypto.randomUUID(), action: `TD_${body.action}`, occurredAt: new Date().toISOString(), actorUserId: "demo-staff" });
    return Response.json({ result: model.bookings[0] });
  }
  if (url.includes("/api/sales-documents/")) {
    if (method === "POST") {
      const form = init!.body as FormData;
      model.jacket!.documents.unshift({ id: crypto.randomUUID(), type: String(form.get("documentType")), fileName: (form.get("file") as File).name, reviewed: false, signed: false });
      model.jacket!.revision++;
    }
    if (method === "PATCH") {
      const body = JSON.parse(String(init?.body));
      const doc = model.jacket!.documents.find(doc => doc.id === body.documentId)!;
      doc.reviewed = true; doc.signed = body.signed; model.jacket!.revision++;
      if (body.signed) model.signedCurrent = true;
    }
    return Response.json(model.jacket);
  }
  return originalFetch(input, init);
};

createRoot(document.getElementById("root")!).render(<main style={{ maxWidth: 1100, margin: "24px auto", padding: 12, fontFamily: "Arial, sans-serif" }}>
  <p style={{ marginBottom: 16 }}>Isolated review fixture · fictional customer · no database or production writes</p>
  <GuidedTestDrive customerId="customer" customerName="Alex Demo Driver" employeeName="Pat Demo Employee" vehicle={vehicle} customerPrefill={{ phoneNumber: "6125550100", email: "demo@example.test", idState: "MN" }} onChooseIdentity={() => alert("Use the shared customer and vehicle selectors in the CRM.")} />
</main>);
