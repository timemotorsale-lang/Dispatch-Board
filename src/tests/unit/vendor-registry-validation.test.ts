import { describe, expect, it } from "vitest";

import {
  normalizeVendorInput,
  normalizeVendorInvoiceBatchCloseInput,
  normalizeVendorInvoiceBatchInput,
  normalizeVendorListQuery,
  normalizeVendorName,
  normalizeVendorNoteInput,
  normalizeVendorTaskInput,
  normalizeVendorWorkJobInput
} from "@/server/vendors/vendor-validation";

describe("vendor registry validation", () => {
  it("normalizes a vendor master record", () => {
    expect(normalizeVendorInput({
      category: "PARTS_SUPPLIER",
      name: "  ACME   Parts  ",
      primaryEmail: " parts@example.com ",
      status: "PREFERRED"
    })).toMatchObject({
      category: "PARTS_SUPPLIER",
      name: "ACME   Parts",
      primaryEmail: "parts@example.com",
      status: "PREFERRED"
    });
  });

  it("normalizes search and controlled filters", () => {
    const query = new URLSearchParams({
      category: "RECON_REPAIR_VENDOR",
      q: " paint ",
      status: "PENDING_REVIEW"
    });

    expect(normalizeVendorListQuery(query)).toEqual({
      category: "RECON_REPAIR_VENDOR",
      q: "paint",
      status: "PENDING_REVIEW"
    });
  });

  it("requires useful note and task inputs", () => {
    expect(() => normalizeVendorNoteInput({ body: "" })).toThrow("Update/comment is required.");
    expect(() => normalizeVendorTaskInput({ boardDate: "2026-09-14", dueAt: "bad", title: "Call bank" })).toThrow("Task due time is invalid.");
  });

  it("creates a stable normalized name key", () => {
    expect(normalizeVendorName("  North   Star Bank ")).toBe("north star bank");
  });

  it("normalizes vendor job and batch inputs", () => {
    expect(normalizeVendorWorkJobInput({
      additionalVehicleReferences: "2017 Ford Fusion Black\n2020 Honda Accord Blue",
      amount: "$325.50",
      serviceDate: "2026-09-14",
      vehicleReference: "2021 Ford Escape Blue",
      workType: "Windshield replacement"
    })).toMatchObject({
      additionalVehicleReferences: ["2017 Ford Fusion Black", "2020 Honda Accord Blue"],
      amount: "325.50",
      serviceDate: "2026-09-14",
      vehicleReference: "2021 Ford Escape Blue"
    });
    expect(normalizeVendorInvoiceBatchInput({ title: "Glass batch", notes: "10 installs" })).toEqual({
      notes: "10 installs",
      title: "Glass batch"
    });
    expect(normalizeVendorInvoiceBatchCloseInput({ invoiceDate: "2026-09-14", invoiceNumber: "INV-88", totalAmount: "1500" })).toMatchObject({
      invoiceNumber: "INV-88",
      totalAmount: "1500.00"
    });
  });

  it("rejects incomplete vendor job inputs", () => {
    expect(() => normalizeVendorWorkJobInput({ serviceDate: "2026-09-14", workType: "Chip repair" })).toThrow("Vehicle / stock / RO is required.");
    expect(() => normalizeVendorWorkJobInput({ amount: "12.999", serviceDate: "2026-09-14", vehicleReference: "RO-1", workType: "Chip repair" })).toThrow("Job amount must be a valid amount.");
  });
});
