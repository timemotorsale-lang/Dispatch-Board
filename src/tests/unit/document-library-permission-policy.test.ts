import { describe, expect, it } from "vitest";

import type { AuthenticatedUser } from "@/server/auth/store";
import { isRoutePermittedForUser } from "@/server/auth/navigation";
import {
  canOpenDocumentLibrary,
  resolveDocumentLibraryPermission,
  type DocumentLibraryPermissionContext
} from "@/server/document-library/permission-policy";

function user(roles: string[], duties: string[] = []): AuthenticatedUser {
  return {
    id: "user-1",
    name: "Document User",
    email: "document-user@example.test",
    isActive: true,
    roles,
    duties: { direct: duties, roleDefaults: [], all: duties }
  };
}

function decision(input: Partial<DocumentLibraryPermissionContext>) {
  return resolveDocumentLibraryPermission({
    action: "view",
    actor: user(["Office Manager"]),
    linkedRecordAccess: true,
    ...input
  });
}

describe("document library permission policy", () => {
  it("denies by default without authentication or document-library role/duty fit", () => {
    expect(canOpenDocumentLibrary(null)).toBe(false);
    expect(decision({ actor: null })).toMatchObject({
      allowed: false,
      reason: "AUTHENTICATION_REQUIRED"
    });

    const technician = user(["Mechanic"]);
    expect(canOpenDocumentLibrary(technician)).toBe(false);
    expect(isRoutePermittedForUser(technician, "/documents")).toBe(false);
    expect(decision({ actor: technician })).toMatchObject({
      allowed: false,
      reason: "ELEVATED_PERMISSION_REQUIRED"
    });
  });

  it("allows document staff to open normal documents only with linked record access", () => {
    const office = user(["Office Staff"], ["documentation"]);

    expect(canOpenDocumentLibrary(office)).toBe(true);
    expect(isRoutePermittedForUser(office, "/documents")).toBe(true);
    expect(decision({ actor: office, action: "view", sensitivity: "INTERNAL" })).toMatchObject({
      allowed: true,
      auditRequired: false,
      idempotencyRequired: false,
      reason: "ALLOWED"
    });
    expect(decision({ actor: office, linkedRecordAccess: false })).toMatchObject({
      allowed: false,
      reason: "LINKED_RECORD_ACCESS_REQUIRED"
    });
  });

  it("requires elevated permission and audit for restricted or sensitive actions", () => {
    const salesperson = user(["Salesperson"]);

    expect(decision({ actor: salesperson, action: "viewRestricted", sensitivity: "RESTRICTED" })).toMatchObject({
      allowed: false,
      auditRequired: true,
      reason: "ELEVATED_PERMISSION_REQUIRED"
    });
    expect(decision({ action: "reject" })).toMatchObject({
      allowed: true,
      auditRequired: true,
      idempotencyRequired: true,
      reason: "ALLOWED"
    });
  });

  it("blocks destructive legal-hold changes and disables deletion entirely", () => {
    expect(decision({ action: "archive", retentionState: "LEGAL_HOLD" })).toMatchObject({
      allowed: false,
      auditRequired: true,
      idempotencyRequired: true,
      reason: "LEGAL_HOLD_BLOCKED"
    });
    expect(decision({ action: "delete", retentionState: "ACTIVE" })).toMatchObject({
      allowed: false,
      reason: "DESTRUCTIVE_DELETE_DISABLED"
    });
  });

  it("keeps export and provider actions held until exact policy is approved", () => {
    expect(decision({ action: "export", exportPolicyApproved: false })).toMatchObject({
      allowed: false,
      auditRequired: true,
      idempotencyRequired: true,
      reason: "EXPORT_POLICY_HELD"
    });
    expect(decision({ action: "connectProvider", providerPolicyApproved: false })).toMatchObject({
      allowed: false,
      auditRequired: true,
      idempotencyRequired: true,
      reason: "PROVIDER_POLICY_HELD"
    });
    expect(decision({ action: "connectProvider", providerPolicyApproved: true })).toMatchObject({
      allowed: true,
      auditRequired: true,
      idempotencyRequired: true
    });
  });
});
