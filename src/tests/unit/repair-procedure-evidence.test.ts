import { describe, expect, it, vi } from "vitest";
import { normalizeRepairProcedureEvidence, validateRepairProcedureEvidence } from "@/lib/repair-procedure-evidence";

describe("saved procedure evidence", () => {
  it("keeps jobs with no saved requirements compatible", async () => {
    const validPhoto = vi.fn();
    expect(await validateRepairProcedureEvidence(undefined, {}, validPhoto)).toEqual([]);
    expect(validPhoto).not.toHaveBeenCalled();
  });

  it("requires a reference for every exact saved step", async () => {
    await expect(validateRepairProcedureEvidence(["Torque measurement", "After photo"],
      { "Torque measurement": "47 Nm" }, vi.fn())).rejects.toThrow("After photo");
  });

  it("checks a saved photo against the current scoped evidence before completing", async () => {
    const validPhoto = vi.fn(async (reference: string) => reference === "linked-current-photo");
    await expect(validateRepairProcedureEvidence(["After photo"], { "After photo": "Photo attached" }, validPhoto))
      .rejects.toThrow("Attach a current photo for this repair job");
    const proof = normalizeRepairProcedureEvidence({ "After photo": " linked-current-photo " });
    expect(await validateRepairProcedureEvidence(["After photo"], proof, validPhoto)).toEqual(["After photo: linked-current-photo"]);
    expect(validPhoto).toHaveBeenLastCalledWith("linked-current-photo", "After photo");
  });
});
