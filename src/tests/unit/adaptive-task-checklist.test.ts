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

  it("anchors office and front-desk support work to canonical records and handoffs", () => {
    const checklist = buildAdaptiveTaskChecklist({
      title: "Review office/admin support tasks",
      description: "Review office, admin, and front-desk support work that needs attention today.",
      workflowArea: "OPERATIONS_COORDINATOR"
    });

    expect(checklist).toHaveLength(6);
    expect(checklist.map((item) => item.label)).toEqual([
      "Identify the exact work lane: customer, vehicle, appointment, repair, parts, sales, payment, or document",
      "Search and link the canonical record before creating or updating anything",
      "Verify the missing document, signature, proof, payment, photo, or handoff requirement",
      "Complete the safe coordinator step or prepare the workflow for the authorized owner",
      "Attach the evidence or note to the canonical record, not a duplicate task trail",
      "Record the blocker, responsible owner, due time, and next handoff"
    ]);
    expect(checklist.every((item) => item.key.startsWith("front_desk_"))).toBe(true);
  });

  it("builds sales paperwork steps around deal packet evidence and approvals", () => {
    const checklist = buildAdaptiveTaskChecklist({
      title: "Sales Paperwork",
      description: "Finish selling paperwork, finance packet, insurance proof, and delivery documents.",
      workflowArea: "SALES"
    });

    expect(checklist.map((item) => item.label)).toContain("Link the customer, vehicle, and sales packet before changing paperwork");
    expect(checklist.map((item) => item.label)).toContain("Route financing, accounting, or manager-only decisions to the proper authority");
  });
});
