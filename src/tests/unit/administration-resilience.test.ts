import { describe, expect, it } from "vitest";
import { getBackgroundOperationsConsole, getRetentionPrivacyOperations } from "@/server/administration-resilience";

describe("administration and resilience authorization", () => {
  it("requires an authenticated manager for retention operations", async () => {
    await expect(getRetentionPrivacyOperations(null)).rejects.toThrow("Authentication required");
  });

  it("requires an authenticated manager for the background operations console", async () => {
    await expect(getBackgroundOperationsConsole(null)).rejects.toThrow("Authentication required");
  });
});
