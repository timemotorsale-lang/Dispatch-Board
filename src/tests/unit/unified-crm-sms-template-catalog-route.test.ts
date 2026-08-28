import { describe, expect, it, vi } from "vitest";

const actor = { id: "manager-1", name: "Manager One", email: "manager@example.test", isActive: true, roles: ["General Manager"], duties: { all: [], direct: [], roleDefaults: [] } };
const mocks = vi.hoisted(() => ({ getUnifiedCrmSmsTemplateCatalog: vi.fn() }));

vi.mock("@/server/auth/current-user", () => ({ getCurrentUser: vi.fn(async () => actor) }));
vi.mock("@/server/services/unified-crm-sms-template-catalog-service", () => mocks);

import { GET } from "@/app/api/crm/v1/communications/sms-templates/route";

describe("Unified CRM SMS template catalog route", () => {
  it("returns the template catalog model", async () => {
    mocks.getUnifiedCrmSmsTemplateCatalog.mockResolvedValueOnce({ contractVersion: "ucrm.sms-template-catalog/v1", state: "IMPLEMENTED_UNVERIFIED" });
    const response = await GET();
    expect(response.status).toBe(200);
    expect(await response.json()).toEqual({ contractVersion: "ucrm.sms-template-catalog/v1", state: "IMPLEMENTED_UNVERIFIED" });
    expect(mocks.getUnifiedCrmSmsTemplateCatalog).toHaveBeenCalledWith(actor);
  });

  it("maps typed authorization errors safely", async () => {
    mocks.getUnifiedCrmSmsTemplateCatalog.mockRejectedValueOnce(Object.assign(new Error("CRM SMS template catalog is available to the manager workspace."), { code: "SMS_TEMPLATE_CATALOG_NOT_AUTHORIZED" }));
    const response = await GET();
    expect(response.status).toBe(403);
    expect(await response.json()).toMatchObject({ code: "SMS_TEMPLATE_CATALOG_NOT_AUTHORIZED", contractVersion: "ucrm.sms-template-catalog-error/v1" });
  });
});
