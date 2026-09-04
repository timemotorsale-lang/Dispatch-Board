import { describe, expect, it } from "vitest";
import { diagnosticDraftPayload } from "@/lib/diagnostic-draft";

const draft = () => ({ ro: null, manual: { customer: "Sample", vehicle: "2017 Acura TLX", vin: "", concern: "Brakes" }, labor: [], parts: [], evidence: [], attempt: null });
describe("diagnostic draft validation", () => {
  it("preserves standalone vehicle and customer details without creating an RO", () => {
    expect(diagnosticDraftPayload(draft())).toEqual(draft());
  });
  it("rejects corrupted lines before they can crash draft restoration", () => {
    expect(() => diagnosticDraftPayload({ ...draft(), labor: [null] })).toThrow("labor line");
    expect(() => diagnosticDraftPayload({ ...draft(), parts: [{ name: "Part" }] })).toThrow("part line");
    expect(() => diagnosticDraftPayload({ ...draft(), manual: [] })).toThrow("Vehicle details");
    expect(() => diagnosticDraftPayload({ ...draft(), ro: { id: "ro-1" } })).toThrow("repair order");
  });
  it("bounds payloads and retains retry identity", () => {
    expect(() => diagnosticDraftPayload({ ...draft(), labor: Array(301).fill({}) })).toThrow();
    const attempt = { fingerprint: "stable", body: { expectedVersion: 4, idempotencyKey: "same-request" } };
    expect(diagnosticDraftPayload({ ...draft(), attempt }).attempt).toEqual(attempt);
  });
});
