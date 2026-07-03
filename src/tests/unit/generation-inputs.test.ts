import { WorkflowArea } from "@prisma/client";
import { describe, expect, it } from "vitest";

import { loadGenerationInputsForDate } from "@/server/services/generation-inputs";
import type { GenerationInputsRepository } from "@/server/services/generation-inputs";

function createDuty(
  overrides: Partial<{
    id: string;
    name: string;
    workflowArea: string;
    description: string | null;
    createdAt: Date;
    updatedAt: Date;
  }> = {}
) {
  return {
    id: "duty-sales",
    name: "Follow up with assigned leads",
    workflowArea: "Sales",
    description: null,
    createdAt: new Date("2026-06-17T09:00:00.000Z"),
    updatedAt: new Date("2026-06-17T09:00:00.000Z"),
    ...overrides
  };
}

function createRoleDuty(roleId: string, duty = createDuty(), assignedAt = new Date("2026-06-17T09:05:00.000Z")) {
  return {
    roleId,
    dutyId: duty.id,
    assignedAt,
    duty
  };
}

function createRole(
  overrides: Partial<{
    id: string;
    name: string;
    description: string | null;
    createdAt: Date;
    updatedAt: Date;
    roleDuties: ReturnType<typeof createRoleDuty>[];
  }> = {}
) {
  return {
    id: "role-sales",
    name: "Salesperson",
    description: null,
    createdAt: new Date("2026-06-17T09:00:00.000Z"),
    updatedAt: new Date("2026-06-17T09:00:00.000Z"),
    roleDuties: [createRoleDuty("role-sales")],
    ...overrides
  };
}

function createUserRole(role = createRole(), overrides: Partial<{ userId: string; assignedAt: Date }> = {}) {
  return {
    userId: overrides.userId ?? "user-sales",
    roleId: role.id,
    assignedAt: overrides.assignedAt ?? new Date("2026-06-17T09:10:00.000Z"),
    role
  };
}

function createUserDuty(duty = createDuty(), overrides: Partial<{ userId: string; assignedAt: Date }> = {}) {
  return {
    userId: overrides.userId ?? "user-sales",
    dutyId: duty.id,
    assignedAt: overrides.assignedAt ?? new Date("2026-06-17T09:15:00.000Z"),
    duty
  };
}

function createUser(
  overrides: Partial<{
    id: string;
    name: string;
    email: string;
    passwordHash: string;
    isActive: boolean;
    createdAt: Date;
    updatedAt: Date;
    userRoles: ReturnType<typeof createUserRole>[];
    userDuties: ReturnType<typeof createUserDuty>[];
  }> = {}
) {
  const userId = overrides.id ?? "user-sales";

  return {
    id: userId,
    name: "Baraka Sales",
    email: "jordan.sales@local.test",
    passwordHash: "hashed-password",
    isActive: true,
    createdAt: new Date("2026-06-17T09:00:00.000Z"),
    updatedAt: new Date("2026-06-17T09:00:00.000Z"),
    userRoles: [createUserRole(undefined, { userId })],
    userDuties: [createUserDuty(undefined, { userId })],
    ...overrides
  };
}

function createTemplate(
  overrides: Partial<{
    id: string;
    title: string;
    description: string | null;
    workflowArea: WorkflowArea;
    defaultDueTime: string;
    requiresManagerApproval: boolean;
    isActive: boolean;
    roleId: string | null;
    dutyId: string | null;
    role: { id: string; name: string } | null;
    duty: { id: string; name: string } | null;
    createdAt: Date;
    updatedAt: Date;
  }> = {}
) {
  return {
    id: "template-sales",
    title: "Review sales follow-up tasks",
    description: "Review open leads and next steps.",
    workflowArea: WorkflowArea.SALES,
    defaultDueTime: "15:00",
    requiresManagerApproval: false,
    isActive: true,
    roleId: "role-sales",
    dutyId: "duty-sales",
    role: {
      id: "role-sales",
      name: "Salesperson"
    },
    duty: {
      id: "duty-sales",
      name: "Follow up with assigned leads"
    },
    createdAt: new Date("2026-06-17T10:00:00.000Z"),
    updatedAt: new Date("2026-06-17T10:00:00.000Z"),
    ...overrides
  };
}

function createGenerationInputsRepository({
  users,
  templates
}: {
  users: ReturnType<typeof createUser>[];
  templates: ReturnType<typeof createTemplate>[];
}): GenerationInputsRepository {
  return {
    async listUsersForGeneration() {
      return users;
    },
    async listTemplatesForGeneration({
      roleIds,
      dutyIds
    }: {
      roleIds: string[];
      dutyIds: string[];
    }) {
      const roleIdSet = new Set(roleIds);
      const dutyIdSet = new Set(dutyIds);

      return templates.filter(
        (template) =>
          (template.roleId ? roleIdSet.has(template.roleId) : false) ||
          (template.dutyId ? dutyIdSet.has(template.dutyId) : false)
      );
    }
  };
}

describe("generation inputs service", () => {
  it("loads active users and ignores inactive users", async () => {
    const repository = createGenerationInputsRepository({
      users: [
        createUser({
          id: "user-b",
          name: "Bri Active",
          email: "bri.active@local.test"
        }),
        createUser({
          id: "user-a",
          name: "Alex Inactive",
          email: "alex.inactive@local.test",
          isActive: false
        })
      ],
      templates: [createTemplate()]
    });

    const result = await loadGenerationInputsForDate("2026-06-17", repository);

    expect(result.boardDate).toBe("2026-06-17");
    expect(result.users).toHaveLength(1);
    expect(result.users[0]).toMatchObject({
      userId: "user-b",
      userName: "Bri Active"
    });
  });

  it("uses a user's custom duties without falling back to role-default templates", async () => {
    const directDuty = createDuty({
      id: "duty-custom",
      name: "Handle VIP follow-ups",
      workflowArea: "Sales"
    });
    const roleDefaultDuty = createDuty({
      id: "duty-role-default",
      name: "Follow up with assigned leads",
      workflowArea: "Sales"
    });
    const repository = createGenerationInputsRepository({
      users: [
        createUser({
          id: "user-custom",
          name: "Casey Custom",
          email: "casey.custom@local.test",
          userRoles: [
            createUserRole(
              createRole({
                id: "role-sales",
                name: "Salesperson",
                roleDuties: [createRoleDuty("role-sales", roleDefaultDuty)]
              }),
              { userId: "user-custom" }
            )
          ],
          userDuties: [createUserDuty(directDuty, { userId: "user-custom" })]
        })
      ],
      templates: [
        createTemplate({
          id: "template-custom-duty",
          title: "Handle VIP follow-up tasks",
          dutyId: "duty-custom",
          duty: { id: "duty-custom", name: "Handle VIP follow-ups" }
        }),
        createTemplate({
          id: "template-role",
          title: "Review sales follow-up tasks",
          dutyId: null,
          duty: null
        })
      ]
    });

    const result = await loadGenerationInputsForDate("2026-06-17", repository);

    expect(result.users[0].dutySource).toBe("custom");
    expect(result.users[0].directDuties.map((duty) => duty.dutyId)).toEqual(["duty-custom"]);
    expect(result.users[0].resolvedDuties.map((duty) => duty.dutyId)).toEqual(["duty-custom"]);
    expect(result.users[0].resolvedDuties.map((duty) => duty.title)).not.toContain(
      "Follow up with assigned leads"
    );
    expect(result.users[0].templates.map((template) => template.templateId)).toEqual([
      "template-custom-duty"
    ]);
  });

  it("deduplicates repeated direct duty assignments for the same user", async () => {
    const directDuty = createDuty({
      id: "duty-custom",
      name: "Handle VIP follow-ups",
      workflowArea: "Sales"
    });
    const repository = createGenerationInputsRepository({
      users: [
        createUser({
          id: "user-custom",
          name: "Casey Custom",
          email: "casey.custom@local.test",
          userDuties: [
            createUserDuty(directDuty, { userId: "user-custom" }),
            createUserDuty(directDuty, {
              userId: "user-custom",
              assignedAt: new Date("2026-06-17T09:16:00.000Z")
            })
          ]
        })
      ],
      templates: [
        createTemplate({
          id: "template-custom-duty",
          title: "Handle VIP follow-up tasks",
          roleId: null,
          role: null,
          dutyId: "duty-custom",
          duty: { id: "duty-custom", name: "Handle VIP follow-ups" }
        })
      ]
    });

    const result = await loadGenerationInputsForDate("2026-06-17", repository);

    expect(result.users[0].directDuties).toEqual([
      {
        dutyId: "duty-custom",
        title: "Handle VIP follow-ups",
        workflowArea: "Sales",
        source: "custom",
        roleIds: [],
        roleNames: []
      }
    ]);
    expect(result.users[0].resolvedDuties).toHaveLength(1);
    expect(result.users[0].templates.map((template) => template.templateId)).toEqual([
      "template-custom-duty"
    ]);
  });

  it("falls back to role default duties when a user has no custom duties", async () => {
    const roleDefaultDuty = createDuty({
      id: "duty-marketing",
      name: "Publish marketing posts",
      workflowArea: "Marketing"
    });
    const repository = createGenerationInputsRepository({
      users: [
        createUser({
          id: "user-role-default",
          name: "Ancilla Ops",
          email: "avery.ops@local.test",
          userRoles: [
            createUserRole(
              createRole({
                id: "role-marketing",
                name: "Marketing/Advertisement Manager",
                roleDuties: [createRoleDuty("role-marketing", roleDefaultDuty)]
              }),
              { userId: "user-role-default" }
            )
          ],
          userDuties: []
        })
      ],
      templates: [
        createTemplate({
          id: "template-marketing-duty",
          title: "Publish marketing posts",
          workflowArea: WorkflowArea.MARKETING,
          roleId: null,
          role: null,
          dutyId: "duty-marketing",
          duty: { id: "duty-marketing", name: "Publish marketing posts" }
        })
      ]
    });

    const result = await loadGenerationInputsForDate("2026-06-17", repository);

    expect(result.users[0]).toMatchObject({
      dutySource: "role_default"
    });
    expect(result.users[0].directDuties).toEqual([]);
    expect(result.users[0].resolvedDuties).toMatchObject([
      {
        dutyId: "duty-marketing",
        source: "role_default",
        roleIds: ["role-marketing"],
        roleNames: ["Marketing/Advertisement Manager"]
      }
    ]);
  });

  it("returns active templates for resolved duties and ignores inactive templates", async () => {
    const repository = createGenerationInputsRepository({
      users: [createUser()],
      templates: [
        createTemplate({
          id: "template-active-duty",
          title: "Active sales follow-up task"
        }),
        createTemplate({
          id: "template-inactive-duty",
          title: "Inactive sales follow-up task",
          isActive: false
        })
      ]
    });

    const result = await loadGenerationInputsForDate("2026-06-17", repository);

    expect(result.users[0].templates.map((template) => template.templateId)).toEqual([
      "template-active-duty"
    ]);
  });

  it("deduplicates multi-role duties and template candidates", async () => {
    const sharedDuty = createDuty({
      id: "duty-shared",
      name: "Check vehicles ready for photos",
      workflowArea: "Advertising"
    });
    const repository = createGenerationInputsRepository({
      users: [
        createUser({
          id: "user-multi",
          name: "Avery Multi",
          email: "avery.multi@local.test",
          userRoles: [
            createUserRole(
              createRole({
                id: "role-inventory",
                name: "Inventory Manager",
                roleDuties: [createRoleDuty("role-inventory", sharedDuty)]
              }),
              { userId: "user-multi" }
            ),
            createUserRole(
              createRole({
                id: "role-marketing",
                name: "Marketing/Advertisement Manager",
                roleDuties: [createRoleDuty("role-marketing", sharedDuty)]
              }),
              { userId: "user-multi" }
            )
          ],
          userDuties: []
        })
      ],
      templates: [
        createTemplate({
          id: "template-shared",
          title: "Check photo-ready inventory",
          workflowArea: WorkflowArea.ADVERTISING,
          roleId: "role-marketing",
          role: {
            id: "role-marketing",
            name: "Marketing/Advertisement Manager"
          },
          dutyId: "duty-shared",
          duty: {
            id: "duty-shared",
            name: "Check vehicles ready for photos"
          }
        })
      ]
    });

    const result = await loadGenerationInputsForDate("2026-06-17", repository);

    expect(result.users[0].resolvedDuties).toHaveLength(1);
    expect(result.users[0].resolvedDuties[0]).toMatchObject({
      dutyId: "duty-shared",
      roleIds: ["role-inventory", "role-marketing"],
      roleNames: ["Inventory Manager", "Marketing/Advertisement Manager"]
    });
    expect(result.users[0].templates).toHaveLength(1);
    expect(result.users[0].templates[0]).toMatchObject({
      templateId: "template-shared",
      matchedByRole: true,
      matchedByDuty: true
    });
  });

  it("returns warnings and empty arrays when a user has no eligible duties or templates", async () => {
    const repository = createGenerationInputsRepository({
      users: [
        createUser({
          id: "user-empty",
          name: "No Match",
          email: "no.match@local.test",
          userRoles: [],
          userDuties: []
        })
      ],
      templates: []
    });

    const result = await loadGenerationInputsForDate("2026-06-17", repository);

    expect(result.users[0]).toMatchObject({
      dutySource: "none",
      directDuties: [],
      resolvedDuties: [],
      templates: []
    });
    expect(result.warnings).toEqual([
      {
        userId: "user-empty",
        code: "USER_HAS_NO_ELIGIBLE_DUTIES",
        message: "No Match has no custom duties or role default duties available for generation."
      },
      {
        userId: "user-empty",
        code: "USER_HAS_NO_ELIGIBLE_TEMPLATES",
        message: "No Match has no active task templates connected to the resolved duties or active roles."
      }
    ]);
  });

  it("falls back to role-default templates when a user has custom duties but no active custom-duty templates", async () => {
    const repository = createGenerationInputsRepository({
      users: [
        createUser({
          id: "user-fallback",
          name: "Riley Fallback",
          email: "riley.fallback@local.test",
          userRoles: [
            createUserRole(
              createRole({
                id: "role-admin",
                name: "Office Manager",
                roleDuties: [
                  createRoleDuty(
                    "role-admin",
                    createDuty({
                      id: "duty-admin",
                      name: "Review office/admin support tasks",
                      workflowArea: "OfficeFrontDesk"
                    })
                  )
                ]
              }),
              { userId: "user-fallback" }
            )
          ],
          userDuties: [
            createUserDuty(
              createDuty({
                id: "duty-custom",
                name: "Handle VIP follow-ups",
                workflowArea: "Sales"
              }),
              { userId: "user-fallback" }
            )
          ]
        })
      ],
      templates: [
        createTemplate({
          id: "template-admin-duty",
          title: "Review office/admin support tasks",
          workflowArea: WorkflowArea.ADMIN,
          roleId: null,
          role: null,
          dutyId: "duty-admin",
          duty: {
            id: "duty-admin",
            name: "Review office/admin support tasks"
          }
        })
      ]
    });

    const result = await loadGenerationInputsForDate("2026-06-17", repository);

    expect(result.users[0]).toMatchObject({
      dutySource: "role_default"
    });
    expect(result.users[0].templates.map((template) => template.templateId)).toEqual([
      "template-admin-duty"
    ]);
    expect(result.users[0].resolvedDuties).toMatchObject([
      {
        dutyId: "duty-admin",
        source: "role_default"
      }
    ]);
    expect(result.warnings).toEqual([]);
  });

  it("returns a deterministic ordering for users, duties, and templates", async () => {
    const repo = createGenerationInputsRepository({
      users: [
        createUser({
          id: "user-z",
          name: "Zoey",
          email: "zoey@local.test",
          userRoles: [
            createUserRole(
              createRole({
                id: "role-z",
                name: "Z Role",
                roleDuties: [
                  createRoleDuty(
                    "role-z",
                    createDuty({
                      id: "duty-z",
                      name: "Z duty",
                      workflowArea: "Admin"
                    })
                  ),
                  createRoleDuty(
                    "role-z",
                    createDuty({
                      id: "duty-a",
                      name: "A duty",
                      workflowArea: "Admin"
                    }),
                    new Date("2026-06-17T09:06:00.000Z")
                  )
                ]
              }),
              { userId: "user-z" }
            )
          ],
          userDuties: []
        }),
        createUser({
          id: "user-a",
          name: "Alex",
          email: "alex@local.test",
          userRoles: [],
          userDuties: [
            createUserDuty(
              createDuty({
                id: "duty-b",
                name: "B duty",
                workflowArea: "Admin"
              }),
              { userId: "user-a" }
            )
          ]
        })
      ],
      templates: [
        createTemplate({
          id: "template-z",
          title: "Z template",
          workflowArea: WorkflowArea.ADMIN,
          roleId: null,
          role: null,
          dutyId: "duty-z",
          duty: { id: "duty-z", name: "Z duty" }
        }),
        createTemplate({
          id: "template-a",
          title: "A template",
          workflowArea: WorkflowArea.ADMIN,
          roleId: null,
          role: null,
          dutyId: "duty-a",
          duty: { id: "duty-a", name: "A duty" }
        }),
        createTemplate({
          id: "template-b",
          title: "B template",
          workflowArea: WorkflowArea.ADMIN,
          roleId: null,
          role: null,
          dutyId: "duty-b",
          duty: { id: "duty-b", name: "B duty" }
        })
      ]
    });

    const result = await loadGenerationInputsForDate("2026-06-17", repo);

    expect(result.users.map((user) => user.userName)).toEqual(["Alex", "Zoey"]);
    expect(result.users[1].resolvedDuties.map((duty) => duty.title)).toEqual(["A duty", "Z duty"]);
    expect(result.users[1].templates.map((template) => template.title)).toEqual([
      "A template",
      "Z template"
    ]);
  });

  it("rejects invalid board dates", async () => {
    const repository = createGenerationInputsRepository({
      users: [createUser()],
      templates: [createTemplate()]
    });

    await expect(loadGenerationInputsForDate("06/17/2026", repository)).rejects.toThrow(
      /YYYY-MM-DD/
    );
    await expect(loadGenerationInputsForDate("2026-02-30", repository)).rejects.toThrow(
      /valid calendar date/
    );
  });
});
