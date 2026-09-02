import { WorkflowArea } from "@prisma/client";
import { describe, expect, it } from "vitest";

import { classifyConvertedTask } from "@/server/services/task-conversion-classifier";

describe("task conversion classifier", () => {
  it("classifies customer-facing repair updates as Service Advisor with linked Shop work", () => {
    const contract = classifyConvertedTask({
      channel: "COO Workbook",
      conversionContext: {
        category: "CUSTOMER",
        originText: "Customer wants us to check brakes and everything else that is not okay and advise."
      },
      description: "Converted from COO Workbook Quick Update.",
      expectedOutcome: "The converted workbook item has a clear owner, next update, and completion result.",
      intakeType: "Quick Task",
      requestedWorkflowArea: WorkflowArea.GENERAL_MANAGER,
      title: "Abdirisaak Mahdi - 2018 Ford Fusion - Shop ticket - repairs"
    });

    expect(contract).toMatchObject({
      executionIntent: "CUSTOMER_ADVISOR_FOLLOW_UP",
      selectedWorkflowArea: WorkflowArea.SERVICE_ADVISOR,
      suggestedWorkflowArea: WorkflowArea.SERVICE_ADVISOR
    });
    expect(contract?.linkedWorkflowAreas).toContain(WorkflowArea.SHOP);
  });

  it("preserves an explicit non-management workflow override", () => {
    const contract = classifyConvertedTask({
      channel: "COO Workbook",
      conversionContext: {
        originText: "Customer wants a delivery update."
      },
      description: "Converted from COO Workbook Quick Update.",
      intakeType: "Quick Task",
      requestedWorkflowArea: WorkflowArea.SALES,
      title: "Delivery follow up"
    });

    expect(contract?.suggestedWorkflowArea).toBe(WorkflowArea.SERVICE_ADVISOR);
    expect(contract?.selectedWorkflowArea).toBe(WorkflowArea.SALES);
    expect(contract?.classificationReason).toContain("override");
  });
});
