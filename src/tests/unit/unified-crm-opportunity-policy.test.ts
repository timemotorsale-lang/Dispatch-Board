import { describe, expect, it } from "vitest";

import type { AuthenticatedUser } from "@/server/auth/store";
import { evaluateUnifiedCrmOpportunityPolicy } from "@/server/policies/unified-crm-opportunity";

function actor(roles: string[], id = "user-1"): AuthenticatedUser {
  return {
    id,
    name: "CRM User",
    email: "crm@example.test",
    isActive: true,
    roles,
    duties: { direct: [], roleDefaults: [], all: [] }
  };
}

describe("Unified CRM opportunity policy", () => {
  it("allows review create, stage transition, task linkage, and appointment linkage for management while later bridges stay held", () => {
    const read = evaluateUnifiedCrmOpportunityPolicy(actor(["General Manager"]), { action: "read", mode: "REVIEW" });
    expect(read).toMatchObject({
      allowed: true,
      reason: "ALLOWED",
      recordScope: { kind: "ORGANIZATION" },
      capabilities: { read: true, create: true, transition: true, linkTask: true, linkAppointment: true, linkDispatch: false }
    });

    const create = evaluateUnifiedCrmOpportunityPolicy(actor(["General Manager"]), { action: "create", mode: "REVIEW" });
    expect(create).toMatchObject({
      allowed: true,
      reason: "ALLOWED",
      capabilities: { create: true }
    });

    const transition = evaluateUnifiedCrmOpportunityPolicy(actor(["General Manager"]), { action: "transition", mode: "REVIEW" });
    expect(transition).toMatchObject({
      allowed: true,
      reason: "ALLOWED",
      capabilities: { transition: true }
    });

    const taskBridge = evaluateUnifiedCrmOpportunityPolicy(actor(["General Manager"]), { action: "link-task", mode: "REVIEW" });
    expect(taskBridge).toMatchObject({
      allowed: true,
      reason: "ALLOWED",
      capabilities: { linkTask: true }
    });

    const appointmentBridge = evaluateUnifiedCrmOpportunityPolicy(actor(["General Manager"]), { action: "link-appointment", mode: "REVIEW" });
    expect(appointmentBridge).toMatchObject({
      allowed: true,
      reason: "ALLOWED",
      capabilities: { linkAppointment: true }
    });

    const dispatchBridge = evaluateUnifiedCrmOpportunityPolicy(actor(["General Manager"]), { action: "link-dispatch", mode: "REVIEW" });
    expect(dispatchBridge).toMatchObject({
      allowed: false,
      reason: "OPPORTUNITY_MUTATION_HELD"
    });
  });

  it("limits sales to owner scope and fails closed for ineligible users", () => {
    const sales = evaluateUnifiedCrmOpportunityPolicy(actor(["Salesperson"], "seller-1"), { action: "read", mode: "REVIEW" });
    expect(sales).toMatchObject({
      allowed: true,
      recordScope: { kind: "OWNER", ownerUserId: "seller-1" },
      workspace: "SALES"
    });

    const denied = evaluateUnifiedCrmOpportunityPolicy(actor(["Mechanic"]), { action: "read", mode: "REVIEW" });
    expect(denied).toMatchObject({
      allowed: false,
      reason: "OPPORTUNITY_NOT_AUTHORIZED"
    });
  });

  it("requires authentication and respects feature-off mode", () => {
    expect(evaluateUnifiedCrmOpportunityPolicy(null, { action: "read", mode: "REVIEW" })).toMatchObject({
      allowed: false,
      reason: "AUTHENTICATION_REQUIRED"
    });
    expect(evaluateUnifiedCrmOpportunityPolicy(actor(["General Manager"]), { action: "read", mode: "OFF" })).toMatchObject({
      allowed: false,
      reason: "OPPORTUNITY_OFF"
    });
  });
});
