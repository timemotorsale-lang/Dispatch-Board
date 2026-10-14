import { describe, expect, it } from "vitest";

import {
  assertDiagnosticTransition,
  diagnosticCaseId,
  diagnosticConcernFingerprint,
  nextDiagnosticCaseState,
  normalizeCreateDiagnosticCase,
  normalizeDiagnosticAssignment,
  normalizeDiagnosticTransition
} from "@/server/diagnostics/domain";

describe("diagnostic case domain", () => {
  it("normalizes a repair-order-linked primary concern", () => {
    expect(normalizeCreateDiagnosticCase({
      assignedUserId: "tech-1",
      concernKey: "PRIMARY",
      concernStatement: null,
      idempotencyKey: "case-1",
      operatingConditions: { temperature: "cold" },
      reason: "Open a governed case from the intake concern.",
      reasonCode: "case_new_concern",
      repairOrderId: "ro-1",
      riskTier: "r2"
    })).toEqual({
      assignedUserId: "tech-1",
      concernKey: "PRIMARY",
      concernStatement: null,
      idempotencyKey: "case-1",
      operatingConditions: { temperature: "cold" },
      reason: "Open a governed case from the intake concern.",
      reasonCode: "CASE_NEW_CONCERN",
      repairOrderId: "ro-1",
      riskTier: "R2"
    });
  });

  it("uses deterministic case identity and normalized concern fingerprints", () => {
    expect(diagnosticCaseId("org-1", "same-key")).toBe(diagnosticCaseId("org-1", "same-key"));
    expect(diagnosticConcernFingerprint(" No   crank when hot ")).toBe(diagnosticConcernFingerprint("no crank when HOT"));
  });

  it("validates assignment and transition reason codes", () => {
    expect(normalizeDiagnosticAssignment({ assignedUserId: "tech-2", expectedVersion: 2, idempotencyKey: "assign-1", reason: "Reassign for starting-system capability.", reasonCode: "CASE_REASSIGNED_CAPABILITY" })).toMatchObject({ expectedVersion: 2 });
    expect(normalizeDiagnosticTransition({ expectedVersion: 2, idempotencyKey: "triage-1", reason: "Begin structured diagnostic triage.", reasonCode: "CASE_TRIAGE_STARTED", targetStatus: "TRIAGE" })).toMatchObject({ targetStatus: "TRIAGE" });
    expect(() => normalizeDiagnosticTransition({ expectedVersion: 2, idempotencyKey: "bad", reason: "Use a mismatched lifecycle reason.", reasonCode: "CASE_TRIAGE_STARTED", targetStatus: "CONFIRMED" })).toThrow("not valid");
  });

  it("enforces sequential lifecycle, waiting resume, terminal reopen, and no shortcuts", () => {
    expect(() => assertDiagnosticTransition("DRAFT", "CONFIRMED", null)).toThrow("not allowed");
    const waiting = nextDiagnosticCaseState({ status: "TRIAGE", resumeStatus: null }, "WAITING_FOR_TOOL", new Date("2026-07-20T12:00:00Z"));
    expect(waiting).toMatchObject({ status: "WAITING_FOR_TOOL", resumeStatus: "TRIAGE", closedAt: null });
    expect(() => assertDiagnosticTransition("WAITING_FOR_TOOL", "TESTING", "TRIAGE")).toThrow("resume at TRIAGE");
    expect(nextDiagnosticCaseState({ status: "WAITING_FOR_TOOL", resumeStatus: "TRIAGE" }, "TRIAGE", new Date())).toMatchObject({ status: "TRIAGE", resumeStatus: null });
    expect(nextDiagnosticCaseState({ status: "INCONCLUSIVE", resumeStatus: null }, "REOPENED", new Date())).toMatchObject({ status: "REOPENED", resumeStatus: "TRIAGE", closedAt: null });
  });
});
