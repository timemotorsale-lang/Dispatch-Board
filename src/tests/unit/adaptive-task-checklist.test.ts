import { describe, expect, it } from "vitest";

import { buildAdaptiveTaskChecklist, buildAdaptiveTaskSubtasks } from "@/lib/adaptive-task-checklist";

describe("adaptive task checklist", () => {
  it("builds a repair and safety checklist for a brake vibration concern", () => {
    const checklist = buildAdaptiveTaskChecklist({
      title: "2015 Toyota Camry brake vibration",
      description: "Customer reports shaking when pressing the brakes.",
      workflowArea: "SHOP"
    });

    expect(checklist).toHaveLength(6);
    expect(checklist.map((item) => item.label)).toEqual(expect.arrayContaining([
      "Confirm the repair concern, vehicle condition, and current recon stage",
      "Select the right repair path: internal repair, outside vendor, bodywork, detail/prep, or inspection only",
      "Confirm required parts, labor, vendor, owner, and ETA",
      "Verify final QC, readiness, and release or delivery handoff"
    ]));
    expect(checklist.every((item) => item.key.startsWith("shop_recon_"))).toBe(true);
  });

  it("keeps admin work on the deterministic documentation path", () => {
    const checklist = buildAdaptiveTaskChecklist({
      title: "Customer title delay",
      description: "DMV paperwork remains pending.",
      workflowArea: "ADMIN"
    });

    expect(checklist.map((item) => item.label)).toContain("Verify the missing requirement, proof, signature, or handoff need");
    expect(checklist.map((item) => item.label)).toContain("Set the next owner, due time, and follow-up action before closing");
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

    expect(checklist.map((item) => item.label)).toContain("Verify the customer, vehicle interest, and sales stage");
    expect(checklist.map((item) => item.label)).toContain("Confirm ownership of the next step");
  });

  it("builds service advisor steps around customer promises and repair-order handoffs", () => {
    const checklist = buildAdaptiveTaskChecklist({
      title: "Customer needs repair authorization update",
      description: "Advisor needs to call the customer, confirm approval, and set the next promise.",
      workflowArea: "SERVICE_ADVISOR"
    });
    const subtasks = buildAdaptiveTaskSubtasks({ workflowArea: "SERVICE_ADVISOR" });

    expect(checklist).toHaveLength(6);
    expect(checklist.map((item) => item.label)).toEqual([
      "Verify the customer, vehicle, repair order, and current service promise",
      "Confirm the customer concern, authorization need, or requested update",
      "Check shop, parts, appointment, and customer communication context",
      "Complete the advisor action: contact customer, collect decision, set promise, or route support",
      "Record the customer-facing outcome and internal handoff notes",
      "Confirm the next advisor follow-up, owner, and due time before closing"
    ]);
    expect(checklist.every((item) => item.key.startsWith("service_advisor_"))).toBe(true);
    expect(subtasks.map((item) => item.label)).toContain("Coordinate shop, parts, appointment, or manager support");
  });
});
