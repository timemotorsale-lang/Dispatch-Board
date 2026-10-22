import { describe, expect, it } from "vitest";
import { compareIdSides, emptyIdFields, frontIdFieldsFromText } from "@/features/mobile-capture/id-capture-fields";

describe("front-of-ID field suggestions", () => {
  it("reads labeled fields and preserves four-digit years", () => {
    const fields = frontIdFieldsFromText("SYNTHETIC ID\nName: JAMIE EXAMPLE\nID number: TEST1234\nIssuing state: IL\nDOB: 04/21/1990\nEXP: 04/21/2030\nAddress: 100 SAMPLE STREET");
    expect(fields).toEqual({ fullName: "JAMIE EXAMPLE", licenseNumber: "TEST1234", issuingState: "IL", dateOfBirth: "04/21/1990", expirationDate: "04/21/2030", address: "100 SAMPLE STREET" });
  });
  it("leaves unread fields blank instead of inventing values", () => {
    expect(frontIdFieldsFromText("")).toEqual(emptyIdFields());
    expect(frontIdFieldsFromText("DRIVER LICENSE\nILLINOIS DEPARTMENT").licenseNumber).toBe("");
  });
  it("distinguishes agreement, mismatch, and fields not read on both sides", () => {
    const front = { ...emptyIdFields(), fullName: "EXAMPLE JAMIE", licenseNumber: "TEST-1234" };
    expect(compareIdSides(front, { name: "JAMIE EXAMPLE", number: "TEST1234", state: "IL" }).map((item) => item.status)).toEqual(["MATCH", "MATCH", "NOT_READ"]);
    expect(compareIdSides(front, { name: "DIFFERENT PERSON", number: "OTHER", state: "IL" }).map((item) => item.status)).toEqual(["MISMATCH", "MISMATCH", "NOT_READ"]);
  });
});
