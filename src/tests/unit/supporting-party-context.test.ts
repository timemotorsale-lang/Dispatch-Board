import { describe, expect, it } from "vitest";
import {
  buildSupportingPartyContext,
  normalizeSupportingPartyType,
  supportingPartyTypeForVendorType,
  supportingPartyTypeLabel,
} from "@/lib/supporting-party-context";

describe("supporting party context", () => {
  it("keeps business entities attached to customer and vehicle work without making them customers", () => {
    const context = buildSupportingPartyContext({
      associations: [
        { href: "/vehicles/360/vehicle-1", partyId: "agency-1", relationship: "Title correction", subjectId: "vehicle-1", subjectTitle: "2021 Toyota Corolla", subjectType: "VEHICLE" },
        { href: "/tasks/task-1", partyId: "agency-1", relationship: "Documentation follow-up", subjectId: "task-1", subjectTitle: "Submit DMV title packet", subjectType: "TASK" },
        { partyId: "other-party", relationship: "Ignored", subjectId: "customer-1", subjectType: "CUSTOMER" },
      ],
      interactions: [
        { channel: "PHONE", direction: "OUTBOUND", followUpAt: "2026-09-10T15:00:00.000Z", id: "call-1", occurredAt: "2026-09-09T15:00:00.000Z", partyId: "agency-1", reportWorthy: true, sourceHref: "/tasks/task-1", summary: "DMV requested the corrected odometer statement." },
        { channel: "EMAIL", direction: "INBOUND", id: "email-1", occurredAt: "2026-09-08T15:00:00.000Z", partyId: "agency-1", summary: "Agency confirmed packet review started." },
      ],
      party: { id: "agency-1", name: "Minnesota DMV", type: "government_agency" },
    });

    expect(context.party.typeLabel).toBe("Government agency");
    expect(context.associations.map((association) => association.label)).toEqual([
      "Title correction - 2021 Toyota Corolla",
      "Documentation follow-up - Submit DMV title packet",
    ]);
    expect(context.openFollowUps).toHaveLength(1);
    expect(context.workbookCandidates[0]).toMatchObject({
      dueAt: "2026-09-10T15:00:00.000Z",
      title: "Follow up with Minnesota DMV: DMV requested the corrected odometer statement.",
    });
    expect(context.reportSeeds[0].text).toContain("Minnesota DMV");
    expect(context.timeline[0]).toMatchObject({ detail: "Government agency - phone", href: "/tasks/task-1" });
  });

  it("normalizes enterprise supporting party categories and vendor specializations", () => {
    expect(normalizeSupportingPartyType("Government Agency")).toBe("government_agency");
    expect(normalizeSupportingPartyType("warranty-company")).toBe("warranty_company");
    expect(normalizeSupportingPartyType("unknown")).toBe("other");
    expect(supportingPartyTypeForVendorType("TRANSPORT")).toBe("towing_company");
    expect(supportingPartyTypeForVendorType("PARTS_SUPPLIER")).toBe("parts_supplier");
    expect(supportingPartyTypeLabel("warranty_company")).toBe("Warranty company");
  });
});
