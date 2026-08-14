import { describe, expect, it, vi } from "vitest";

vi.mock("@/server/db/client", () => ({ prisma: {} }));

import type { AuthenticatedUser } from "@/server/auth/store";
import type { UnifiedCrmCustomerNoteRepository } from "@/server/repositories/unified-crm-customer-note-repository";
import { logUnifiedCrmCustomerNote } from "@/server/services/unified-crm-customer-note-service";

const manager: AuthenticatedUser = {
  id: "manager-1",
  name: "CRM Manager",
  email: "manager@example.test",
  isActive: true,
  roles: ["General Manager"],
  duties: { direct: [], roleDefaults: [], all: [] }
};

function repository(result = { customerId: "customer-1", duplicate: false, noteId: "note-1", version: 1, visibility: "INTERNAL" }) {
  const received: unknown[] = [];
  const repo: UnifiedCrmCustomerNoteRepository = {
    async createNote(input) {
      received.push(input);
      return result;
    }
  };
  return { received, repo };
}

describe("Unified CRM customer note command", () => {
  it("records an internal note with organization scope and normalized result", async () => {
    const source = repository();
    const result = await logUnifiedCrmCustomerNote(manager, "customer-1", {
      body: "Customer prefers afternoon pickup.",
      idempotencyKey: "note-1",
      visibility: "internal"
    }, {
      readMode: "REVIEW",
      repository: source.repo,
      scopeRepository: { async listActiveOrganizationIds() { return ["org-a"]; } }
    });

    expect(source.received[0]).toMatchObject({
      recordScope: { kind: "ORGANIZATION" },
      command: {
        body: "Customer prefers afternoon pickup.",
        customerId: "customer-1",
        organizationId: "org-a",
        visibility: "INTERNAL"
      }
    });
    expect(result).toMatchObject({
      contractVersion: "ucrm.customer-note/v1",
      customerId: "customer-1",
      duplicate: false,
      noteId: "note-1",
      visibility: "INTERNAL"
    });
  });

  it("rejects restricted notes without explicit sensitive access", async () => {
    await expect(logUnifiedCrmCustomerNote(manager, "customer-1", {
      body: "Restricted callback detail.",
      idempotencyKey: "note-2",
      visibility: "restricted"
    }, {
      readMode: "REVIEW",
      repository: repository().repo,
      scopeRepository: { async listActiveOrganizationIds() { return ["org-a"]; } }
    })).rejects.toMatchObject({ code: "RESTRICTED_NOTE_NOT_AUTHORIZED" });
  });
});
