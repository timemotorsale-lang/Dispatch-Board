import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it, vi } from "vitest";
import { CompactPartsEntry, currentPartsEntryDate, canStartAnotherPartsEntry, readCompactPartsEntry, runCompactPartsSubmission } from "@/features/inventory/compact-parts-entry";

const order = { id: "po-2", selectionKey: "po-2:part-2", label: "PO-002", part: "Brake pads", partId: "part-2", quantity: 2, supplierId: "supplier-1", unitPriceCents: 8299 };
const fields = (entries: Record<string, string>) => {
  const data = new FormData();
  for (const [key, value] of Object.entries(entries)) data.set(key, value);
  return data;
};

describe("compact parts entry", () => {
  it("offers existing-order mode and one save button without requiring purchase fields for a needed part", () => {
    const html = renderToStaticMarkup(<CompactPartsEntry repairOrderId="ro-1" onSave={vi.fn()} purchaseOrders={[{ ...order, id: "po-1", selectionKey: "po-1:part-2", label: "PO-001" }, order]} />);
    expect(html).toContain("Receive existing order");
    expect(html.match(/type="submit"/g)).toHaveLength(1);
    expect(html).toContain("Save parts entry");
    expect(html).toContain('name="part"');
    expect(html).toMatch(/<input[^>]*disabled=""[^>]*name="purchasedOn"/);
    expect(html).toContain('max="' + currentPartsEntryDate() + '"');
    expect(html).not.toContain("Install");
  });

  it("does not submit hidden purchase or receipt details for needed parts", () => {
    expect(readCompactPartsEntry(fields({ part: " Pads ", quantity: "2", vendor: "Old vendor", unitPrice: "9.00", received: "yes" }), "ro-1"))
      .toEqual({ repairOrderId: "ro-1", part: "Pads", quantity: 2, purchased: false, received: false });
  });

  it("receives the exact existing part and PO with its saved price and no second purchase fields required", () => {
    expect(readCompactPartsEntry(fields({ received: "yes", receivedOn: "2026-11-14", packingSource: "Slip-9", stockLocationId: "bin-4", unitPrice: "1.00" }), "ro-1", order))
      .toMatchObject({ repairOrderId: "ro-1", purchaseOrderId: "po-2", partId: "part-2", part: "Brake pads", quantity: 2, unitPriceCents: 8299, received: true, receivedOn: "2026-11-14", stockLocationId: "bin-4", packingSource: "Slip-9" });
  });

  it("requires purchase details and rejects receipts before purchase", () => {
    expect(() => readCompactPartsEntry(fields({ part: "Pads", quantity: "1", purchased: "on" }), "ro-1")).toThrow("supplier or vendor");
    expect(() => readCompactPartsEntry(fields({ part: "Pads", quantity: "1", purchased: "on", vendor: "Vendor", purchasedOn: "2026-11-14", unitPrice: "12.40", received: "yes", receivedOn: "2026-11-13", packingSource: "Slip-9", stockLocationId: "bin-4" }), "ro-1")).toThrow("before the purchase date");
  });
});

it("ignores a second submission while the first is pending and releases the latch after failure", async () => {
  const latch = { current: false };
  let reject!: (error: Error) => void;
  const save = vi.fn(() => new Promise<void>((_resolve, fail) => { reject = fail; }));
  const first = runCompactPartsSubmission(latch, save);
  const failed = expect(first).rejects.toThrow("Uncertain response");
  await runCompactPartsSubmission(latch, save);
  expect(save).toHaveBeenCalledTimes(1);
  reject(new Error("Uncertain response"));
  await failed;
  await runCompactPartsSubmission(latch, vi.fn().mockResolvedValue(undefined));
  expect(latch.current).toBe(false);
});

it("submits a purchase against the original needed demand and part", () => {
  const neededPart = { id: "demand-9", partId: "part-2", part: "Brake pads", quantity: 2, requisitionId: "req-9" };
  const data = fields({ vendor: "Supplier", purchasedOn: "2026-11-14", unitPrice: "12.50" });
  expect(readCompactPartsEntry(data, "ro-1", undefined, neededPart)).toMatchObject({
    demandId: "demand-9", partId: "part-2", requisitionId: "req-9", part: "Brake pads", quantity: 2, purchased: true, unitPriceCents: 1250,
  });
  data.set("quantity", "3");
  expect(() => readCompactPartsEntry(data, "ro-1", undefined, neededPart)).toThrow("exceeds what remains");
});

it("blocks future purchase and receipt dates", () => {
  const future = fields({ part: "Pads", quantity: "1", purchased: "on", vendor: "Vendor", purchasedOn: "2999-01-01", unitPrice: "12.40" });
  expect(() => readCompactPartsEntry(future, "ro-1")).toThrow("cannot be in the future");
  const receipt = fields({ received: "yes", receivedOn: "2999-01-01", stockLocationId: "bin-1", packingSource: "slip" });
  expect(() => readCompactPartsEntry(receipt, "ro-1", order)).toThrow("cannot be in the future");
});

it("allows a new entry only after a safely recoverable final result", () => {
  expect(canStartAnotherPartsEntry({ status: "partial", message: "Saved demand." })).toBe(false);
  expect(canStartAnotherPartsEntry({ status: "partial", message: "Saved demand.", retryable: true, canStartNew: true })).toBe(false);
  expect(canStartAnotherPartsEntry({ status: "partial", message: "Saved demand.", canStartNew: true })).toBe(true);
  expect(canStartAnotherPartsEntry({ status: "approval-required", message: "Approval requested." })).toBe(true);
});

it("does not record a receipt when Not received is selected", () => {
  const data = fields({ received: "no", receivedOn: "2026-11-14", stockLocationId: "bin-1", packingSource: "VENDOR-1" });
  expect(() => readCompactPartsEntry(data, "ro-1", order)).toThrow("Select Received");
  for (const [key, value] of Object.entries({ part: "Pads", quantity: "1", purchased: "on", vendor: "Vendor", purchasedOn: "2026-11-14", unitPrice: "15" })) data.set(key, value);
  expect(readCompactPartsEntry(data, "ro-1")).toMatchObject({ purchased: true, received: false });
  expect(readCompactPartsEntry(data, "ro-1")).not.toHaveProperty("packingSource");
});

it("uses the entered catalog number and real physical location name when explicitly supplied", () => {
  const receipt = fields({
    part: "Pads", quantity: "1", purchased: "on", vendor: "Vendor", purchasedOn: "2026-11-14",
    unitPrice: "15", received: "yes", receivedOn: "2026-11-14", stockLocationId: "__new__",
    stockLocationName: "  Shelf B  ", packingSource: "Slip-1", numberMode: "manual", partNumber: "ST-42",
  });
  expect(readCompactPartsEntry(receipt, "ro-1")).toMatchObject({ partNumber: "ST-42", stockLocationName: "Shelf B" });
  expect(readCompactPartsEntry(receipt, "ro-1")).not.toHaveProperty("stockLocationId");
  receipt.set("numberMode", "automatic");
  expect(readCompactPartsEntry(receipt, "ro-1")).not.toHaveProperty("partNumber");
  receipt.set("stockLocationName", "");
  expect(() => readCompactPartsEntry(receipt, "ro-1")).toThrow("receiving bin");
});

it("records usage against the exact receipt line without sending new purchase details", () => {
  const receipt = { receiptId: "receipt-7", lineIndex: 1, partId: "part-2", part: "Brake pads", label: "Receipt 7", quantity: 2 };
  const used = fields({ usage: "USED", usageOccurredAt: currentPartsEntryDate(), repairJobId: "job-1", installationEvidence: "Technician checked fitment", quantity: "1" });
  const outcome = readCompactPartsEntry(used, "ro-1", undefined, undefined, receipt);
  expect(outcome).toMatchObject({ receiptId: "receipt-7", lineIndex: 1, partId: "part-2", usage: "USED", usageQuantity: 1, repairJobId: "job-1", evidence: ["Technician checked fitment"] });
  expect(outcome).not.toHaveProperty("purchasedOn");
  expect(() => readCompactPartsEntry(fields({ usage: "NOT_YET" }), "ro-1", undefined, undefined, receipt)).toThrow("No change to save");
});

it("requires a dated decision and a follow-up date for returns", () => {
  const receipt = { receiptId: "receipt-7", lineIndex: 0, partId: "part-2", part: "Brake pads", label: "Receipt 7", quantity: 2 };
  const data = fields({ usage: "RETURN", returnReason: "Wrong size for vehicle" });
  expect(() => readCompactPartsEntry(data, "ro-1", undefined, undefined, receipt)).toThrow("return decision date");
  data.set("usageOccurredAt", currentPartsEntryDate());
  data.set("deadlineAt", "2999-01-01");
  expect(readCompactPartsEntry(data, "ro-1", undefined, undefined, receipt)).toMatchObject({ lineIndex: 0, usage: "RETURN", deadlineAt: "2999-01-01" });
});

it("rejects installation earlier than the exact receipt time on the same day", () => {
  const receipt = { receiptId: "r", lineIndex: 0, partId: "part-2", part: "Pads", label: "R", quantity: 1, receivedAt: "2026-11-14T14:15:00" };
  const input = fields({ usage: "USED", usageOccurredAt: "2026-11-14T14:00:00", repairJobId: "job-1", installationEvidence: "Checked installation" });
  expect(() => readCompactPartsEntry(input, "ro-1", undefined, undefined, receipt)).toThrow("between receipt and today");
  input.set("usageOccurredAt", "2026-11-14T14:16:00");
  expect(readCompactPartsEntry(input, "ro-1", undefined, undefined, receipt)).toMatchObject({ usageOccurredAt: "2026-11-14T14:16:00" });
});
