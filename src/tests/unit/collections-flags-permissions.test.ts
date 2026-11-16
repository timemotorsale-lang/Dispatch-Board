import { describe, expect, it } from "vitest";

import {
  effectiveAiLevel,
  resolveAiLevel,
  resolveCollectionsMode,
  resolveIntegrationMode,
  resolveSendingMode,
  resolveSystemOfRecord
} from "@/features/collections/config/flags";
import { canOpenCollections, hasCollectionsPermission, resolveCollectionsRole } from "@/features/collections/config/permissions";
import type { AuthenticatedUser } from "@/server/auth/store";

function user(overrides: Partial<AuthenticatedUser> = {}): AuthenticatedUser {
  return { id: "user-1", name: "Test User", email: "test@example.test", isActive: true, roles: [], duties: { direct: [], roleDefaults: [], all: [] }, ...overrides };
}
const owner = user({ id: "owner", roles: ["General Manager"] });
const collector = user({ id: "collector", roles: ["Collections"] });
const salesperson = user({ id: "sales", roles: ["Sales Consultant"] });

describe("collections flags", () => {
  it("defaults every switch to OFF", () => {
    expect(resolveCollectionsMode({})).toBe("OFF");
    expect(resolveSendingMode("SMS", {})).toBe("OFF");
    expect(resolveSendingMode("EMAIL", {})).toBe("OFF");
    expect(resolveAiLevel({})).toBe("OFF");
    expect(resolveIntegrationMode("COLLECTIONS_INTEGRATION_PAYMENTS", {})).toBe("OFF");
  });

  it("treats unknown values as OFF", () => {
    expect(resolveCollectionsMode({ COLLECTIONS_MODULE: "yes please" })).toBe("OFF");
    expect(resolveCollectionsMode({ COLLECTIONS_MODULE: " review " })).toBe("REVIEW");
  });

  it("forces DRY_RUN in REVIEW mode even if LIVE is requested", () => {
    expect(resolveSendingMode("SMS", { COLLECTIONS_MODULE: "REVIEW", COLLECTIONS_SMS_SENDING: "LIVE" })).toBe("DRY_RUN");
    expect(resolveSendingMode("EMAIL", { COLLECTIONS_MODULE: "REVIEW", COLLECTIONS_EMAIL_SENDING: "OFF" })).toBe("OFF");
  });

  it("keeps sending OFF while the module is OFF", () => {
    expect(resolveSendingMode("SMS", { COLLECTIONS_MODULE: "OFF", COLLECTIONS_SMS_SENDING: "LIVE" })).toBe("OFF");
  });

  it("locks the system of record to DealerCenter in Release 1", () => {
    expect(resolveSystemOfRecord({ SYSTEM_OF_RECORD: "DISPATCH_BOARD" })).toBe("DEALERCENTER");
  });

  it("caps integrations at TEST in Release 1", () => {
    expect(resolveIntegrationMode("X", { COLLECTIONS_MODULE: "LIVE", X: "LIVE" })).toBe("TEST");
  });

  it("uses the lower AI level", () => {
    expect(effectiveAiLevel("SUGGEST", "AUTO")).toBe("SUGGEST");
    expect(effectiveAiLevel("AUTO", "OFF")).toBe("OFF");
  });
});

describe("collections permissions", () => {
  it("derives roles from existing roles and duties", () => {
    expect(resolveCollectionsRole(owner)).toBe("ADMIN");
    expect(resolveCollectionsRole(collector)).toBe("COLLECTOR");
    expect(resolveCollectionsRole(user({ duties: { direct: ["Collections admin"], roleDefaults: [], all: ["Collections admin"] } }))).toBe("ADMIN");
    expect(resolveCollectionsRole(salesperson)).toBeNull();
    expect(resolveCollectionsRole(user({ roles: ["General Manager"], isActive: false }))).toBeNull();
  });

  it("hides the module from everyone when OFF", () => {
    expect(canOpenCollections(owner, "OFF", [])).toBe(false);
  });

  it("shows REVIEW mode to admins only", () => {
    expect(canOpenCollections(owner, "REVIEW", [])).toBe(true);
    expect(canOpenCollections(collector, "REVIEW", [])).toBe(false);
  });

  it("shows PILOT mode to admins and listed users", () => {
    expect(canOpenCollections(collector, "PILOT", [])).toBe(false);
    expect(canOpenCollections(collector, "PILOT", ["collector"])).toBe(true);
  });

  it("limits collectors to the section 2 permissions", () => {
    expect(hasCollectionsPermission(collector, "LOG_ACTIVITY", "LIVE", [])).toBe(true);
    expect(hasCollectionsPermission(collector, "SET_FLAG", "LIVE", [])).toBe(true);
    expect(hasCollectionsPermission(collector, "CLEAR_FLAG", "LIVE", [])).toBe(false);
    expect(hasCollectionsPermission(collector, "IMPORT", "LIVE", [])).toBe(false);
    expect(hasCollectionsPermission(collector, "APPROVE_DISABLE_OR_REPO", "LIVE", [])).toBe(false);
    expect(hasCollectionsPermission(collector, "CHANGE_ACCOUNT_TYPE", "LIVE", [])).toBe(false);
    expect(hasCollectionsPermission(owner, "APPROVE_DISABLE_OR_REPO", "LIVE", [])).toBe(true);
    expect(hasCollectionsPermission(salesperson, "VIEW", "LIVE", [])).toBe(false);
  });
});
