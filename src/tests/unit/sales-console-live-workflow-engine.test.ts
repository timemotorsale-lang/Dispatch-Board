import { describe, expect, it } from "vitest";

import {
  buildSalesConsoleGuidedPath,
  evaluateSalesWorkbenchManagerEscalation,
  salesConsoleLiveActivityDecision,
  salesConsoleLiveEvidenceRecord,
  salesConsoleLiveEvidenceValidation,
  salesConsoleLiveInventoryMatches,
  salesConsoleLiveLeadRecords,
  salesConsoleLiveManagerQueues,
  salesConsoleLiveOutcomeDecision,
  salesConsoleLiveRevenueLanes,
  salesConsoleLiveWorkItems,
  salesConsoleUnifiedQueueCoversOperatingBrain,
  salesConsoleUnifiedRevenueCommandQueueHealth,
  searchSalesConsoleLiveExperience
} from "@/features/sales/sales-console-live-workflow-engine";

describe("Sales Console live workflow engine", () => {
  it("drives the work queue from deterministic ranking output", () => {
    expect(salesConsoleLiveWorkItems[0].algorithmScore).toBeGreaterThanOrEqual(salesConsoleLiveWorkItems[1].algorithmScore);
    expect(salesConsoleLiveWorkItems[0].algorithmReasons.length).toBeGreaterThan(0);
    expect(salesConsoleLiveWorkItems[0].componentScores.revenueOpportunity).toBeGreaterThan(0);
    expect(new Set(salesConsoleLiveWorkItems.map((item) => item.group))).toEqual(
      expect.any(Set)
    );
  });

  it("keeps the revenue work queue source-backed and lane-aware", () => {
    const lanes = new Set(salesConsoleLiveWorkItems.map((item) => item.contractLane));

    expect(salesConsoleLiveWorkItems.length).toBeGreaterThan(0);
    expect([...lanes]).toEqual(
      expect.arrayContaining([
        "Inventory Cash Sale",
        "Inventory BHPH Sale",
        "Inventory Lease-to-Own",
        "Public Auto Repair",
        "Financing Product"
      ])
    );
    expect(salesConsoleLiveWorkItems.every((item) => item.customerId && item.source && item.reason && item.nextAction)).toBe(true);
    expect(salesConsoleLiveWorkItems.every((item) => item.algorithmReasons.length > 0)).toBe(true);
    expect(salesConsoleLiveWorkItems.some((item) => item.blockers.length > 0)).toBe(true);
  });

  it("builds a progressive guided sales path from the selected source-backed work item", () => {
    const guidedPath = buildSalesConsoleGuidedPath(salesConsoleLiveWorkItems[0]);

    expect(guidedPath.customer).toBe(salesConsoleLiveWorkItems[0].customer);
    expect(guidedPath.revenueLane).toBe(salesConsoleLiveWorkItems[0].contractLane);
    expect(guidedPath.lifecycleStage).toBe("Qualified Opportunity / Deal");
    expect(guidedPath.lifecycleSteps.filter((step) => step.status === "Current")).toHaveLength(1);
    expect(guidedPath.lifecycleSteps).toHaveLength(5);
    expect(guidedPath.lifecycleSteps.every((step) => step.meaning && step.unlocks)).toBe(true);
    expect(guidedPath.requiredFacts.length).toBeGreaterThanOrEqual(8);
    expect(guidedPath.requiredFacts.every((fact) => fact.source && fact.value)).toBe(true);
    expect(guidedPath.emphasizedAction).toBe(salesConsoleLiveWorkItems[0].nextAction);
    expect(guidedPath.workbenchTitle).toContain(salesConsoleLiveWorkItems[0].customer);
    expect(guidedPath.relationshipContract.truthWorkspace).toContain("Customer 360 is the customer record");
    expect(guidedPath.relationshipContract.executionWorkspace).toContain("Sales Workbench is the selling action space");
    expect(guidedPath.relationshipContract.integrationPattern).toContain("reads Customer 360 truth");
    expect(guidedPath.relationshipContract.writeBackRule).toContain("Do not create Customer 360 activity");
    expect(guidedPath.primaryTool.label).toBe("Open Revenue Desk");
    expect(guidedPath.primaryTool.href).toContain("/sales?workspace=revenue-desk");
    expect(guidedPath.executionTools.map((tool) => tool.label)).toEqual(
      expect.arrayContaining(["Call", "SMS", "Email", "Note", "Appointment", "Customer 360", "Vehicle", "Task", "Docs", "Manager Review"])
    );
    expect(guidedPath.executionTools.filter((tool) => tool.category === "Action").map((tool) => tool.label)).toEqual(
      expect.arrayContaining(["Call", "SMS", "Email", "Note", "Task", "Docs"])
    );
    expect(guidedPath.executionTools.filter((tool) => tool.category === "Source").map((tool) => tool.label)).toEqual(
      expect.arrayContaining(["Appointment", "Customer 360", "Vehicle", "Manager Review"])
    );
    expect(guidedPath.executionTools.every((tool) => tool.href.length > 0)).toBe(true);
    expect(guidedPath.executionTools.filter((tool) => tool.enabled).every((tool) => !tool.disabledReason)).toBe(true);
    expect(guidedPath.executionTools.find((tool) => tool.label === "Call")?.href).toContain("/crm-next/actions/log-call");
    expect(guidedPath.executionTools.find((tool) => tool.label === "Note")?.href).toContain("/crm-next/actions/add-note");
    expect(guidedPath.executionTools.find((tool) => tool.label === "Task")?.href).toContain("/crm-next/actions/new-task");
    expect(guidedPath.executionTools.find((tool) => tool.label === "Docs")?.href).toContain("/crm-next/actions/upload-document");
    expect(guidedPath.executionTools.find((tool) => tool.label === "Customer 360")?.href).toContain("/customers/customer-360");
    expect(guidedPath.managerEscalation.status).toBe("Rule triggered");
    expect(guidedPath.managerEscalation.rules.map((rule) => rule.label)).toEqual(
      expect.arrayContaining(["Active blocker", "Manager priority signal"])
    );
    expect(guidedPath.managerEscalation.href).toContain("/manager-review");
    expect(guidedPath.outcomeWriteBackTarget).toContain("/api/crm/v1/customers/");
    expect(guidedPath.outcomeOptions.map((option) => option.label)).toContain("Appointment confirmed");
    expect(guidedPath.outcomeOptions.every((option) => option.result.includes("Customer 360"))).toBe(true);
    expect(guidedPath.outcomeOptions.every((option) => option.outcome && option.reasonCode)).toBe(true);
    expect(guidedPath.outcomeOptions.some((option) => option.nextStepRequired)).toBe(true);
    expect(guidedPath.returnLinks.map((link) => link.label)).toEqual(
      expect.arrayContaining(["Back to Customer 360", "Back to CRM Workspace", "Back to Sales Home"])
    );
    expect(guidedPath.truthStatus.map((item) => item.label)).toEqual(
      expect.arrayContaining(["Customer 360", "Task write-back", "Outcome write-back", "Manager review"])
    );
    expect(guidedPath.writeBackBehavior).toContain("only after an approved outcome command succeeds");
  });

  it("keeps manager review rule gated instead of making every workbench tool look live", () => {
    const paths = salesConsoleLiveWorkItems.map((item) => buildSalesConsoleGuidedPath(item));
    const managerTools = paths.map((path) => path.executionTools.find((tool) => tool.label === "Manager Review"));

    expect(managerTools.some((tool) => tool?.enabled)).toBe(true);
    expect(managerTools.some((tool) => tool && !tool.enabled && tool.disabledReason)).toBe(true);
  });

  it("explains manager escalation only when source-backed rules require it", () => {
    const needsEscalation = salesConsoleLiveWorkItems.find((item) => item.blockers.length > 0 || item.algorithmReasons.some((reason) => /manager/i.test(reason)));
    const clearItem = salesConsoleLiveWorkItems.find((item) => item.blockers.length === 0 && !item.algorithmReasons.some((reason) => /manager/i.test(reason)) && item.actionState !== "Controlled Action");

    expect(needsEscalation).toBeDefined();
    expect(clearItem).toBeDefined();

    const required = evaluateSalesWorkbenchManagerEscalation(needsEscalation!);
    const clear = evaluateSalesWorkbenchManagerEscalation(clearItem!);

    expect(required.required).toBe(true);
    expect(required.rules.length).toBeGreaterThan(0);
    expect(required.decision).toContain("source-backed rule");
    expect(clear.required).toBe(false);
    expect(clear.rules).toHaveLength(0);
    expect(clear.decision).toContain("continue without manager escalation");
  });

  it("blocks canned activity in the guided path contract", () => {
    const guidedPaths = salesConsoleLiveWorkItems.map((item) => buildSalesConsoleGuidedPath(item));
    const serialized = JSON.stringify(guidedPaths);

    expect(guidedPaths.every((path) => path.activityPolicy.includes("Do not show canned activity"))).toBe(true);
    expect(serialized).not.toContain("Lead captured");
    expect(serialized).not.toContain("Vehicle matched");
    expect(serialized).not.toContain("Revenue Desk opened");
    expect(serialized).not.toContain("Manager guidance available");
  });

  it("unifies source domains into the revenue command queue while preserving guardrails", () => {
    expect(salesConsoleUnifiedQueueCoversOperatingBrain()).toBe(true);
    expect(salesConsoleUnifiedRevenueCommandQueueHealth.sourceDomains).toEqual(
      expect.arrayContaining(["Customer 360", "Inventory", "Appointments", "Tasks / My Tasks", "Rental", "Service", "Finance", "Warranty"])
    );
    expect(salesConsoleUnifiedRevenueCommandQueueHealth.guardedActions).toContain("vehicle holds/reservations");
    expect(salesConsoleUnifiedRevenueCommandQueueHealth.managerReviewOnlySubmitWorkflow).toBe(true);
  });

  it("adds live workflow decisions to leads and revenue lanes", () => {
    expect(salesConsoleLiveLeadRecords[0].workflowDecision.routingRecommendation).toBe("manager-review");
    expect(salesConsoleLiveLeadRecords[0].workflowDecision.assignmentWriteEnabled).toBe(false);
    expect(salesConsoleLiveRevenueLanes).toHaveLength(7);
    expect(salesConsoleLiveRevenueLanes.some((lane) => lane.workflowDecision.governedActions.length > 0)).toBe(true);
  });

  it("scores inventory matches and keeps vehicle actions governed", () => {
    expect(salesConsoleLiveInventoryMatches[0].matchScore).toBeGreaterThan(0);
    expect(salesConsoleLiveInventoryMatches.map((match) => match.sellability)).toEqual(
      expect.arrayContaining(["primary", "verify-first"])
    );
  });

  it("builds manager queues from command center algorithms", () => {
    expect(salesConsoleLiveManagerQueues).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ title: "Review Queue", algorithmSource: "manager review queue" }),
        expect.objectContaining({ title: "Forecast Confidence", algorithmSource: "weighted forecast confidence" })
      ])
    );
  });

  it("uses federated role-aware search across the live console", () => {
    const salespersonSearch = searchSalesConsoleLiveExperience("pay stub", "Salesperson");
    const managerSearch = searchSalesConsoleLiveExperience("pay stub", "Sales Manager");

    expect(salespersonSearch.state).toBe("ready");
    expect(managerSearch.results.length).toBeGreaterThanOrEqual(salespersonSearch.results.length);
    expect(managerSearch.results.every((result) => result.writeEnabled === false)).toBe(true);
  });

  it("exposes guarded recordable workflows without risky source writes", () => {
    expect(salesConsoleLiveEvidenceValidation.allowed).toBe(true);
    expect(salesConsoleLiveEvidenceRecord?.status).toBe("pending");
    expect(salesConsoleLiveActivityDecision.allowed).toBe(true);
    expect(salesConsoleLiveOutcomeDecision.allowed).toBe(true);
    expect(salesConsoleLiveOutcomeDecision.sourceSystemCloseWriteEnabled).toBe(false);
  });
});
