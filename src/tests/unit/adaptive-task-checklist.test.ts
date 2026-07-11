import { describe, expect, it } from "vitest";

import { buildAdaptiveTaskChecklist } from "@/lib/adaptive-task-checklist";

describe("adaptive task checklist", () => {
  it("builds a repair and safety checklist for a brake vibration concern", () => {
    const checklist = buildAdaptiveTaskChecklist({
      title: "2015 Toyota Camry brake vibration",
      description: "Customer reports shaking when pressing the brakes.",
      workflowArea: "SHOP"
    });

    expect(checklist).toHaveLength(6);
    expect(checklist.map((item) => item.label)).toEqual(expect.arrayContaining([
      "Confirm the reported symptom and operating conditions",
      "Inspect the affected safety or mechanical system",
      "Document diagnostic findings and root cause",
      "Verify the completed repair and final outcome"
    ]));
    expect(checklist.every((item) => item.key.startsWith("repair_"))).toBe(true);
  });

  it("keeps title-delay work on the deterministic documentation path", () => {
    const checklist = buildAdaptiveTaskChecklist({
      title: "Customer title delay",
      description: "DMV paperwork remains pending.",
      workflowArea: "ADMIN"
    });

    expect(checklist.map((item) => item.label)).toContain("Confirm submission or rejection status");
    expect(checklist.map((item) => item.label)).toContain("Contact the processor, DMV, or responsible vendor");
  });
});
