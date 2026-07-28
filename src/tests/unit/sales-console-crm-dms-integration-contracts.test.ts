import { describe, expect, it } from "vitest";

import {
  enterpriseSourceContractsBlockWritesWhenMissing,
  enterpriseSourceContractsCoverRequiredRecords,
  enterpriseSourceContractsHaveHonestLabels,
  enterpriseSourcesRemainSystemsOfRecord,
  salesConsoleEnterpriseIntegrationReadModel
} from "@/features/sales/sales-console-m9-crm-dms-integration-contracts";

describe("Sales Console CRM/DMS enterprise integration contracts", () => {
  it("keeps enterprise source contracts read-only", () => {
    expect(salesConsoleEnterpriseIntegrationReadModel.readOnly).toBe(true);
    expect(enterpriseSourcesRemainSystemsOfRecord()).toBe(true);
    expect(salesConsoleEnterpriseIntegrationReadModel.contracts.every((contract) => contract.mode === "read-only")).toBe(true);
  });

  it("covers the required CRM, DMS, finance, inventory, lead, appointment, task, and audit records", () => {
    expect(enterpriseSourceContractsCoverRequiredRecords()).toBe(true);
    expect(salesConsoleEnterpriseIntegrationReadModel.contracts.map((contract) => contract.recordType).sort()).toEqual([
      "appointment",
      "audit",
      "customer",
      "deal",
      "finance",
      "inventory",
      "lead",
      "task"
    ]);
  });

  it("requires honest freshness, fallback, unavailable, and source-link labels", () => {
    expect(enterpriseSourceContractsHaveHonestLabels()).toBe(true);
    for (const contract of salesConsoleEnterpriseIntegrationReadModel.contracts) {
      expect(contract.fallbackLabel).toMatch(/unavailable|Verify|verify|cannot/i);
      expect(contract.freshnessRule.length).toBeGreaterThan(0);
      expect(contract.sourceLinkPattern).toContain("/");
      expect(contract.requiredIds.length).toBeGreaterThan(0);
    }
  });

  it("blocks enterprise writes when source or audit coverage is missing", () => {
    expect(enterpriseSourceContractsBlockWritesWhenMissing()).toBe(true);
  });

  it("states that source systems remain systems of record", () => {
    expect(salesConsoleEnterpriseIntegrationReadModel.guardrails.join(" ")).toContain("systems of record");
    expect(salesConsoleEnterpriseIntegrationReadModel.contracts.every((contract) => contract.systemOfRecord)).toBe(true);
  });
});
