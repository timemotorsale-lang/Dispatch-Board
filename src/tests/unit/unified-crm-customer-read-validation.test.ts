import { describe, expect, it } from "vitest";

import { UnifiedCrmCustomerReadError } from "@/server/unified-crm/customer-read-contract";
import {
  decodeUnifiedCrmCustomerCursor,
  encodeUnifiedCrmCustomerCursor,
  normalizeUnifiedCrmCustomerListQuery
} from "@/server/validation/unified-crm-customer-read";

describe("Unified CRM customer read validation", () => {
  it("applies the lowercase active/all defaults", () => {
    expect(normalizeUnifiedCrmCustomerListQuery()).toEqual({
      cursor: null,
      limit: 25,
      owner: "all",
      q: "",
      status: "active"
    });
  });

  it("normalizes supported filters and a bounded page size", () => {
    expect(normalizeUnifiedCrmCustomerListQuery({
      limit: "50",
      owner: " MINE ",
      q: "  Santos  ",
      status: "ALL"
    })).toMatchObject({ limit: 50, owner: "mine", q: "Santos", status: "all" });
  });

  it.each([
    [{ limit: 0 }, "page size"],
    [{ limit: 101 }, "page size"],
    [{ owner: "team" }, "owner"],
    [{ status: "merged" }, "status"],
    [{ q: "q".repeat(101) }, "100 characters"],
    [{ organizationId: "org-b" } as never, "not supported"]
  ])("rejects invalid or authority-bearing input", (input, message) => {
    expect(() => normalizeUnifiedCrmCustomerListQuery(input)).toThrow(message);
  });

  it("rejects repeated URL parameters", () => {
    const parameters = new URLSearchParams("status=active&status=all");
    expect(() => normalizeUnifiedCrmCustomerListQuery(parameters)).toThrow("supplied once");
  });

  it("round-trips only a valid versioned cursor", () => {
    const cursor = { id: "customer-1", updatedAt: new Date("2026-08-14T12:00:00.000Z") };
    expect(decodeUnifiedCrmCustomerCursor(encodeUnifiedCrmCustomerCursor(cursor))).toEqual(cursor);
    expect(() => decodeUnifiedCrmCustomerCursor("not-a-cursor")).toThrow(UnifiedCrmCustomerReadError);
  });
});
