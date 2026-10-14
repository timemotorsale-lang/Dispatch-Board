import { describe, expect, it } from "vitest";
import { evaluateDollarLimit } from "@/server/policies/administration";

const manager = (id = "u1") => ({ id, name: "Manager", email: "m@example.com", isActive: true, roles: ["General Manager"], duties: { direct: [], roleDefaults: [], all: [] } });

describe("administration policies", () => {
  it("allows amounts within a configured limit", () => {
    expect(evaluateDollarLimit({ actor: manager(), amountCents: 5000, rule: { action: "APPROVE", limitCents: 10000 } }).allowed).toBe(true);
  });
  it("requires escalation when amount exceeds limit", () => {
    const decision = evaluateDollarLimit({ actor: manager(), amountCents: 10001, rule: { action: "APPROVE", limitCents: 10000 } });
    expect(decision).toMatchObject({ allowed: false, requiresApproval: true });
  });
  it("blocks self approval when separation of duties is enabled", () => {
    const decision = evaluateDollarLimit({ actor: manager(), amountCents: 100, priorActorUserId: "u1", rule: { action: "APPROVE", limitCents: 1000, separationOfDuties: true } });
    expect(decision.reason).toContain("different approver");
  });
});
