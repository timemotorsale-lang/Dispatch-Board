import { randomUUID } from "node:crypto";
import { describe, expect, it } from "vitest";

describe.skipIf(process.env.RUN_DATABASE_INTEGRATION !== "1")("deal document organization compatibility", () => {
  it.each([
    ["default-org", "org-time-motor-sales", false, true],
    ["org-time-motor-sales", "org-time-motor-sales", false, true],
    ["other-company", "other-company", false, true],
    ["default-org", "other-company", false, false],
    ["org-time-motor-sales", "other-company", false, false],
    ["default-org", "org-time-motor-sales", true, false],
  ])("guards document organization %s and company %s (different customer: %s)", async (documentOrganization, companyOrganization, wrongCustomer, allowed) => {
    const { prisma } = await import("@/server/db/client");
    const prefix = `deal-scope-${randomUUID()}`, rollback = new Error("ROLLBACK_SCOPE_TEST");
    const operation = prisma.$transaction(async tx => {
      await tx.organization.upsert({ where: { id: companyOrganization }, create: { id: companyOrganization, code: `${prefix}-company`, name: "Synthetic scope test company" }, update: {} });
      const customer = await tx.customer.create({ data: { organizationId: companyOrganization, customerNumber: `${prefix}-buyer`, displayName: "Synthetic scope test customer" } });
      const other = wrongCustomer ? await tx.customer.create({ data: { organizationId: companyOrganization, customerNumber: `${prefix}-other`, displayName: "Different synthetic customer" } }) : customer;
      const draftData = { organizationId: documentOrganization, ownerUserId: "synthetic-owner", customerId: customer.id, customerName: customer.displayName, pathway: "lease-to-own", vehicleReference: "Synthetic vehicle", snapshot: {} };
      await tx.dealDeskDraft.create({ data: { ...draftData, id: `${prefix}-source` } });
      await tx.dealDeskDraft.create({ data: { ...draftData, id: prefix } });
      await tx.dealWorkflowContext.create({ data: { id: prefix, organizationId: companyOrganization, draftId: prefix, customerId: other.id, sourceDraftId: `${prefix}-source`, createdByUserId: "synthetic-owner" } });
      throw rollback;
    });
    if (allowed) await expect(operation).rejects.toBe(rollback);
    else await expect(operation).rejects.toThrow("Deal context customer and organization mismatch");
    expect(await prisma.dealDeskDraft.findUnique({ where: { id: prefix } })).toBeNull();
  });
});
