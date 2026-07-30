import { describe, expect, it } from "vitest";

import {
  salesConsoleCustomer360PreservesCrmSource,
  salesConsoleCustomer360Views,
  salesConsolePipelineHasSelectableCustomerContext,
  salesConsolePipelineRecords
} from "@/features/sales/sales-console-pipeline-customer360";

describe("Sales Console M43 pipeline and customer 360", () => {
  it("defines pipeline records with stage aging, owner, freshness, blocker, forecast, and source", () => {
    for (const record of salesConsolePipelineRecords) {
      expect(record.owner).toBeTruthy();
      expect(record.stage).toBeTruthy();
      expect(record.age).toBeTruthy();
      expect(record.freshness).toBeTruthy();
      expect(record.blocker).toBeTruthy();
      expect(record.forecastBand).toBeTruthy();
      expect(record.source).toBeTruthy();
    }
  });

  it("connects pipeline records to Customer 360 while preserving CRM source truth", () => {
    expect(salesConsolePipelineHasSelectableCustomerContext()).toBe(true);
    expect(salesConsoleCustomer360PreservesCrmSource()).toBe(true);
    expect(salesConsoleCustomer360Views[0]?.documents).toContain("Buyer order");
  });
});
