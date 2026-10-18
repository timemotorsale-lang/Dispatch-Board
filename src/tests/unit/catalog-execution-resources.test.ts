import { describe, expect, it, vi } from "vitest";
import type { Prisma } from "@prisma/client";
import { LIGHT_DUTY_OPERATIONS } from "@/lib/light-duty-baseline";
import { catalogLaborLineKey } from "@/lib/catalog-job-readiness";
import { missingCatalogResourceCapabilities } from "@/lib/catalog-resource-readiness";
import { assertCatalogExecutionResources } from "@/server/diagnostics/catalog-execution-readiness";

describe("catalog procedure and equipment execution guards", () => {
  it("requires explicit capabilities, not a misleading resource-name substring", () => {
    expect(missingCatalogResourceCapabilities(["HV_CONTROLLED_AREA"], [{ code: "HV", attributes: { name: "HV_CONTROLLED_AREA" } }])).toEqual(["HV_CONTROLLED_AREA"]);
    expect(missingCatalogResourceCapabilities(["HV_CONTROLLED_AREA", "SERVICE_INFORMATION"], [{ code: "BAY_1", attributes: { catalogCapabilities: ["HV_CONTROLLED_AREA"] } }, { code: "SERVICE_INFORMATION" }])).toEqual([]);
  });
  it("rechecks current procedure, bay identity and equipment before clock start or resume", async () => {
    const operation = LIGHT_DUTY_OPERATIONS.find(item => item.label === "Replace high-voltage battery assembly")!;
    const job = { authorizedLineKey: catalogLaborLineKey(operation.id), procedureVersionId: "procedure", bayRequirements: [], toolRequirements: [] };
    const assignment = { locationId: "location", resourceIds: ["bay", "tools"], bayResourceId: "bay" };
    const procedure = vi.fn().mockResolvedValue({ id: "procedure" });
    const resources = vi.fn().mockResolvedValue([{ id: "bay", code: "BAY_1", attributes: { catalogCapabilities: ["HV_CONTROLLED_AREA"] }, resourceType: { kind: "SERVICE_BAY" } }, { id: "tools", code: "TOOLS", attributes: { catalogCapabilities: ["SERVICE_INFORMATION", "HV_ISOLATION_EQUIPMENT"] }, resourceType: { kind: "TOOL" } }]);
    const database = { workProcedureVersion: { findFirst: procedure }, schedulableResource: { findMany: resources } } as unknown as Pick<Prisma.TransactionClient, "workProcedureVersion" | "schedulableResource">;
    await expect(assertCatalogExecutionResources(database, "org", job, assignment)).resolves.toBeUndefined();
    await expect(assertCatalogExecutionResources(database, "org", { ...job, procedureVersionId: null }, assignment)).rejects.toThrow("assigned procedure");
    procedure.mockResolvedValueOnce(null);
    await expect(assertCatalogExecutionResources(database, "org", job, assignment)).rejects.toThrow("no longer current");
    await expect(assertCatalogExecutionResources(database, "org", job, { ...assignment, bayResourceId: null })).rejects.toThrow("bay and tool");
    resources.mockResolvedValue([]);
    await expect(assertCatalogExecutionResources(database, "org", job, assignment)).rejects.toThrow("bay and tool");
  });
});
