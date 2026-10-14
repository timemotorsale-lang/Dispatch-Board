import { describe, expect, it, vi } from "vitest";

vi.mock("@/server/db/client", () => ({ prisma: {} }));

import type { AuthenticatedUser } from "@/server/auth/store";
import type { UnifiedCrmCommercialApprovalRepository } from "@/server/repositories/unified-crm-commercial-approval-repository";
import {
  decideUnifiedCrmCommercialApproval,
  requestUnifiedCrmCommercialApproval
} from "@/server/services/unified-crm-commercial-approval-service";

const seller: AuthenticatedUser = {
  id: "seller-1",
  name: "Seller One",
  email: "seller@example.test",
  isActive: true,
  roles: ["Salesperson"],
  duties: { direct: [], roleDefaults: [], all: [] }
};

const manager: AuthenticatedUser = {
  id: "manager-1",
  name: "Manager One",
  email: "manager@example.test",
  isActive: true,
  roles: ["General Manager"],
  duties: { direct: [], roleDefaults: [], all: [] }
};

function scopeRepository() {
  return { async listActiveOrganizationIds() { return ["org-1"]; } };
}

function repository(): UnifiedCrmCommercialApprovalRepository {
  return {
    async request(input) {
      return {
        amountCents: input.command.amountCents,
        decision: null,
        discountCents: input.command.discountCents,
        duplicate: false,
        purpose: input.command.purpose,
        quoteId: input.command.quoteId,
        quoteNumber: "Q-1",
        quoteVersionNumber: input.command.expectedVersion,
        requestId: "approval-1",
        requestedByUserId: input.command.actorUserId,
        status: "PENDING",
        version: 1
      };
    },
    async decide(input) {
      if (!input.decisionActorMayManage) throw new Error("Commercial approval decision requires sales management authority.");
      return {
        amountCents: 52500,
        decision: input.command.decision,
        discountCents: 2500,
        duplicate: false,
        purpose: "Manager approval before customer presentation",
        quoteId: "quote-1",
        quoteNumber: "Q-1",
        quoteVersionNumber: 1,
        requestId: input.command.requestId,
        requestedByUserId: "seller-1",
        status: input.command.decision,
        version: input.command.expectedVersion + 1
      };
    }
  };
}

describe("Unified CRM commercial approval service", () => {
  it("requests an internal commercial approval without presenting the quote", async () => {
    await expect(requestUnifiedCrmCommercialApproval(seller, "quote-1", {
      amountCents: 52500,
      discountCents: 2500,
      expectedQuoteVersion: 1,
      idempotencyKey: "approval-request-1",
      purpose: "Manager approval before customer presentation",
      reason: "Request review for the exact current quote version."
    }, {
      mode: "REVIEW",
      repository: repository(),
      scopeRepository: scopeRepository()
    })).resolves.toMatchObject({
      amountCents: 52500,
      contractVersion: "ucrm.commercial-approval/v1",
      decision: null,
      quoteId: "quote-1",
      status: "PENDING",
      version: 1
    });
  });

  it("requires valid money, version, purpose, and reason fields", async () => {
    await expect(requestUnifiedCrmCommercialApproval(seller, "quote-1", {
      amountCents: -1,
      expectedQuoteVersion: 0,
      idempotencyKey: "approval-request-2",
      purpose: "",
      reason: "short"
    }, {
      mode: "REVIEW",
      repository: repository(),
      scopeRepository: scopeRepository()
    })).rejects.toMatchObject({ code: "INVALID_COMMERCIAL_APPROVAL_COMMAND" });
  });

  it("allows sales management decisions and blocks non-manager decisions", async () => {
    await expect(decideUnifiedCrmCommercialApproval(manager, "approval-1", {
      decision: "APPROVED",
      expectedVersion: 1,
      idempotencyKey: "approval-decision-1",
      reason: "Manager independently approved the exact current request."
    }, {
      mode: "REVIEW",
      repository: repository(),
      scopeRepository: scopeRepository()
    })).resolves.toMatchObject({
      decision: "APPROVED",
      status: "APPROVED",
      version: 2
    });

    await expect(decideUnifiedCrmCommercialApproval(seller, "approval-1", {
      decision: "DENIED",
      expectedVersion: 1,
      idempotencyKey: "approval-decision-2",
      reason: "Salesperson should not decide commercial approvals."
    }, {
      mode: "REVIEW",
      repository: repository(),
      scopeRepository: scopeRepository()
    })).rejects.toMatchObject({ code: "UNAUTHORIZED_COMMERCIAL_APPROVAL" });
  });
});
