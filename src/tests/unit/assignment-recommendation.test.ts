import { WorkflowArea } from "@prisma/client";
import { describe, expect, it } from "vitest";

import { recommendAssignment } from "@/server/services/assignment-recommendation";
import type { GenerationInputTemplate, GenerationInputUser } from "@/server/services/generation-inputs";

function createUser(overrides: Partial<GenerationInputUser> = {}): GenerationInputUser {
  return {
    userId: "user-sales",
    userName: "Jordan Sales",
    userEmail: "jordan.sales@local.test",
    roles: [],
    directDuties: [],
    dutySource: "none",
    resolvedDuties: [],
    templates: [],
    ...overrides
  };
}

function createTemplate(overrides: Partial<GenerationInputTemplate> = {}): GenerationInputTemplate {
  return {
    templateId: "template-sales",
    title: "Follow up with assigned leads",
    description: null,
    workflowArea: WorkflowArea.SALES,
    defaultDueTime: "15:30",
    requiresManagerApproval: false,
    roleId: "role-sales",
    roleName: "Salesperson",
    dutyId: "duty-sales",
    dutyName: "Follow up with assigned leads",
    matchedByRole: true,
    matchedByDuty: true,
    ...overrides
  };
}

describe("assignment recommendation service", () => {
  it("prefers a direct user duty match before role, owner, and workflow-area matches", () => {
    const template = createTemplate();
    const result = recommendAssignment({
      template,
      templateOwnerUserId: "user-owner",
      users: [
        createUser({
          userId: "user-owner",
          userName: "Taylor Owner",
          userEmail: "taylor.owner@local.test"
        }),
        createUser({
          userId: "user-role",
          userName: "Avery Role",
          userEmail: "avery.role@local.test",
          roles: [{ roleId: "role-sales", roleName: "Salesperson" }]
        }),
        createUser({
          userId: "user-duty",
          userName: "Casey Duty",
          userEmail: "casey.duty@local.test",
          directDuties: [
            {
              dutyId: "duty-sales",
              title: "Follow up with assigned leads",
              workflowArea: "Sales",
              source: "custom",
              roleIds: [],
              roleNames: []
            }
          ],
          dutySource: "custom",
          resolvedDuties: [
            {
              dutyId: "duty-sales",
              title: "Follow up with assigned leads",
              workflowArea: "Sales",
              source: "custom",
              roleIds: [],
              roleNames: []
            }
          ]
        })
      ]
    });

    expect(result).toEqual({
      recommendedUserId: "user-duty",
      reasonCode: "DIRECT_DUTY_MATCH",
      reasonPath: ["Checked direct duty Follow up with assigned leads.", "Selected Casey Duty."],
      explanation: "Casey Duty is recommended because they have the direct duty for this template.",
      managerReviewNeeded: false
    });
  });

  it("uses role match before template owner when no direct duty match exists", () => {
    const result = recommendAssignment({
      template: createTemplate(),
      templateOwnerUserId: "user-owner",
      users: [
        createUser({
          userId: "user-owner",
          userName: "Taylor Owner",
          userEmail: "taylor.owner@local.test"
        }),
        createUser({
          userId: "user-role",
          userName: "Avery Role",
          userEmail: "avery.role@local.test",
          roles: [{ roleId: "role-sales", roleName: "Salesperson" }]
        })
      ]
    });

    expect(result).toMatchObject({
      recommendedUserId: "user-role",
      reasonCode: "ROLE_MATCH",
      managerReviewNeeded: false
    });
    expect(result.reasonPath).toEqual([
      "No direct user duty match was found.",
      "Checked role Salesperson.",
      "Selected Avery Role."
    ]);
  });

  it("uses the template owner before workflow-area matching", () => {
    const result = recommendAssignment({
      template: createTemplate({ roleId: null, roleName: null }),
      templateOwnerUserId: "user-owner",
      users: [
        createUser({
          userId: "user-workflow",
          userName: "Avery Workflow",
          userEmail: "avery.workflow@local.test",
          dutySource: "role_default",
          resolvedDuties: [
            {
              dutyId: "duty-other-sales",
              title: "Confirm appointments",
              workflowArea: WorkflowArea.SALES,
              source: "role_default",
              roleIds: ["role-sales"],
              roleNames: ["Salesperson"]
            }
          ]
        }),
        createUser({
          userId: "user-owner",
          userName: "Taylor Owner",
          userEmail: "taylor.owner@local.test"
        })
      ]
    });

    expect(result).toMatchObject({
      recommendedUserId: "user-owner",
      reasonCode: "TEMPLATE_OWNER_MATCH",
      managerReviewNeeded: false
    });
  });

  it("uses workflow-area matching when duty, role, and owner do not match", () => {
    const result = recommendAssignment({
      template: createTemplate({ roleId: null, roleName: null, dutyId: null, dutyName: null }),
      templateOwnerUserId: "missing-owner",
      users: [
        createUser({
          userId: "user-workflow",
          userName: "Avery Workflow",
          userEmail: "avery.workflow@local.test",
          dutySource: "role_default",
          resolvedDuties: [
            {
              dutyId: "duty-other-sales",
              title: "Confirm appointments",
              workflowArea: WorkflowArea.SALES,
              source: "role_default",
              roleIds: ["role-sales"],
              roleNames: ["Salesperson"]
            }
          ]
        })
      ]
    });

    expect(result).toMatchObject({
      recommendedUserId: "user-workflow",
      reasonCode: "WORKFLOW_AREA_MATCH",
      managerReviewNeeded: false
    });
  });

  it("returns manager review when no clear match exists", () => {
    const result = recommendAssignment({
      template: createTemplate({ roleId: null, roleName: null, dutyId: null, dutyName: null }),
      users: [
        createUser({
          userId: "user-admin",
          userName: "Morgan Admin",
          userEmail: "morgan.admin@local.test",
          dutySource: "role_default",
          resolvedDuties: [
            {
              dutyId: "duty-admin",
              title: "Review admin support",
              workflowArea: WorkflowArea.ADMIN,
              source: "role_default",
              roleIds: ["role-admin"],
              roleNames: ["Office Manager"]
            }
          ]
        })
      ]
    });

    expect(result).toEqual({
      recommendedUserId: null,
      reasonCode: "MANAGER_REVIEW_NEEDED",
      reasonPath: [
        "No direct user duty match was found.",
        "No role match was found.",
        "No template owner match was found.",
        "No workflow-area match was found."
      ],
      explanation: "No clear staff match was found, so a manager should review this assignment.",
      managerReviewNeeded: true
    });
  });

  it("breaks same-rule ties deterministically by user name, email, and id", () => {
    const result = recommendAssignment({
      template: createTemplate(),
      users: [
        createUser({
          userId: "user-z",
          userName: "Jordan Sales",
          userEmail: "z.jordan@local.test",
          roles: [{ roleId: "role-sales", roleName: "Salesperson" }]
        }),
        createUser({
          userId: "user-a",
          userName: "Jordan Sales",
          userEmail: "a.jordan@local.test",
          roles: [{ roleId: "role-sales", roleName: "Salesperson" }]
        }),
        createUser({
          userId: "user-b",
          userName: "Avery Sales",
          userEmail: "avery@local.test",
          roles: [{ roleId: "role-sales", roleName: "Salesperson" }]
        })
      ]
    });

    expect(result).toMatchObject({
      recommendedUserId: "user-b",
      reasonCode: "ROLE_MATCH"
    });
  });
});
