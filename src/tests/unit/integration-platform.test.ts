import { buildSourceMatrix, createFakeAdapter, runAdapterContractHarness, validateAuthority, validateExternalSystem } from "@/server/integrations";

describe("integration platform", () => {
  it("validates inventory records and active credentials", () => {
    expect(validateExternalSystem({ id: "x", organizationId: "o", name: "DMS", kind: "DMS", status: "ACTIVE", owner: "ops", contractVersion: "v1", capabilities: [], failureExpectations: [] })).toContain("active-credential-required");
  });
  it("builds an authoritative source matrix", () => {
    const entry = { id: "a", organizationId: "o", fieldPath: "vehicle.vin", workflow: "inventory", sourceSystemId: "dms", direction: "INBOUND" as const, frequency: "daily", conflictRule: "MANUAL_REVIEW" as const, owner: "ops", mappingVersion: "v1" };
    expect(validateAuthority(entry)).toEqual([]);
    expect(buildSourceMatrix([entry])["inventory:vehicle.vin"]).toHaveLength(1);
  });
  it("passes the fake adapter contract harness", async () => {
    await expect(runAdapterContractHarness(createFakeAdapter("dms"))).resolves.toMatchObject({ passed: true, adapter: "dms" });
  });
});
