import { WorkflowArea } from "@prisma/client";
import { describe, expect, it } from "vitest";

import {
  createTaskTemplate,
  listTaskTemplatesForManager,
  updateTaskTemplate,
  type TaskTemplateRepository
} from "@/server/services/task-template-service";
import { createTestAuthStore } from "@/tests/support/auth-test-store";

function createStoredTaskTemplate(
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
    id: "template-1",
    title: "Review inventory status",
    description: "Review the inventory pipeline for stale units.",
    workflowArea: WorkflowArea.INVENTORY,
    defaultDueTime: "09:00",
    requiresManagerApproval: false,
    isActive: true,
    roleId: "role-inventory",
    dutyId: "duty-inventory",
    role: {
      id: "role-inventory",
      name: "Inventory Manager"
    },
    duty: {
      id: "duty-inventory",
      name: "Review inventory status"
    },
    createdAt: new Date("2026-06-17T13:00:00.000Z"),
    updatedAt: new Date("2026-06-17T13:00:00.000Z"),
    ...overrides
  };
}

function sortTemplates<T extends { workflowArea: string; title: string; createdAt: Date }>(templates: T[]) {
  return [...templates].sort(
    (left, right) =>
      left.workflowArea.localeCompare(right.workflowArea) ||
      left.title.localeCompare(right.title) ||
      left.createdAt.getTime() - right.createdAt.getTime()
  );
}

function createTaskTemplateRepository(
  initialTemplates = [
    createStoredTaskTemplate(),
    createStoredTaskTemplate({
      id: "template-2",
      title: "Review blocked tasks",
      workflowArea: WorkflowArea.GENERAL_MANAGER,
      defaultDueTime: "16:00",
      requiresManagerApproval: true,
      roleId: "role-manager",
      dutyId: null,
      role: {
        id: "role-manager",
        name: "General Manager"
      },
      duty: null
    }),
    createStoredTaskTemplate({
      id: "template-3",
      title: "Inactive sales follow-up template",
      workflowArea: WorkflowArea.SALES,
      defaultDueTime: "15:00",
      isActive: false,
      roleId: "role-sales",
      dutyId: "duty-sales",
      role: {
        id: "role-sales",
        name: "Salesperson"
      },
      duty: {
        id: "duty-sales",
        name: "Follow up with assigned leads"
      }
    })
  ]
) {
  let nextTemplateNumber = initialTemplates.length + 1;
  let templates = sortTemplates(initialTemplates.map((template) => ({ ...template })));

  const roles = new Map([
    ["role-inventory", { id: "role-inventory", name: "Inventory Manager" }],
    ["role-manager", { id: "role-manager", name: "General Manager" }],
    ["role-sales", { id: "role-sales", name: "Salesperson" }],
    ["role-marketing", { id: "role-marketing", name: "Marketing/Advertisement Manager" }]
  ]);

  const duties = new Map([
    ["duty-inventory", { id: "duty-inventory", name: "Review inventory status" }],
    ["duty-sales", { id: "duty-sales", name: "Follow up with assigned leads" }],
    ["duty-photos", { id: "duty-photos", name: "Check vehicles ready for photos" }]
  ]);

  const repository: TaskTemplateRepository = {
    async listTaskTemplates(options = {}) {
      return sortTemplates(
        templates.filter((template) => options.includeInactive || template.isActive)
      );
    },
    async findRoleById(roleId) {
      return roles.get(roleId) ?? null;
    },
    async findDutyById(dutyId) {
      return duties.get(dutyId) ?? null;
    },
    async createTaskTemplate(input) {
      const role = input.roleId ? (roles.get(input.roleId) ?? null) : null;
      const duty = input.dutyId ? (duties.get(input.dutyId) ?? null) : null;
      const template = createStoredTaskTemplate({
        id: `template-${nextTemplateNumber++}`,
        title: input.title,
        description: input.description,
        workflowArea: input.workflowArea,
        defaultDueTime: input.defaultDueTime,
        requiresManagerApproval: input.requiresManagerApproval,
        isActive: input.isActive,
        roleId: input.roleId,
        dutyId: input.dutyId,
        role,
        duty,
        createdAt: new Date("2026-06-17T14:00:00.000Z"),
        updatedAt: new Date("2026-06-17T14:00:00.000Z")
      });

      templates = sortTemplates([...templates, template]);

      return template;
    },
    async updateTaskTemplate(id, input) {
      const templateIndex = templates.findIndex((template) => template.id === id);

      if (templateIndex === -1) {
        return null;
      }

      const currentTemplate = templates[templateIndex];
      const roleId =
        "roleId" in input ? (input.roleId ?? null) : currentTemplate.roleId;
      const dutyId =
        "dutyId" in input ? (input.dutyId ?? null) : currentTemplate.dutyId;

      const updatedTemplate = {
        ...currentTemplate,
        ...input,
        roleId,
        dutyId,
        role: roleId ? (roles.get(roleId) ?? null) : null,
        duty: dutyId ? (duties.get(dutyId) ?? null) : null,
        updatedAt: new Date("2026-06-17T15:00:00.000Z")
      };

      templates = sortTemplates(
        templates.map((template, index) => (index === templateIndex ? updatedTemplate : template))
      );

      return updatedTemplate;
    }
  };

  return {
    repository,
    readTemplates() {
      return templates;
    }
  };
}

describe("task template service", () => {
  it("lets a manager list active task templates by default", async () => {
    const { usersByEmail } = await createTestAuthStore();
    const manager = usersByEmail.get("morgan.manager@local.test") ?? null;
    const { repository } = createTaskTemplateRepository();

    const templates = await listTaskTemplatesForManager(manager, undefined, repository);

    expect(templates).toHaveLength(2);
    expect(templates.every((template) => template.isActive)).toBe(true);
    expect(templates.map((template) => template.title)).toEqual([
      "Review blocked tasks",
      "Review inventory status"
    ]);
    expect(templates[1]).toMatchObject({
      roleName: "Inventory Manager",
      dutyName: "Review inventory status"
    });
  });

  it("includes inactive templates when requested", async () => {
    const { usersByEmail } = await createTestAuthStore();
    const manager = usersByEmail.get("morgan.manager@local.test") ?? null;
    const { repository } = createTaskTemplateRepository();

    const templates = await listTaskTemplatesForManager(
      manager,
      { includeInactive: true },
      repository
    );

    expect(templates).toHaveLength(3);
    expect(templates.some((template) => template.isActive === false)).toBe(true);
  });

  it("rejects staff users who try to list task templates", async () => {
    const { usersByEmail } = await createTestAuthStore();
    const staffUser = usersByEmail.get("jordan.sales@local.test") ?? null;
    const { repository } = createTaskTemplateRepository();

    await expect(listTaskTemplatesForManager(staffUser, undefined, repository)).rejects.toThrow(
      /Manager access required/
    );
  });

  it("allows a manager to create a valid task template", async () => {
    const { usersByEmail } = await createTestAuthStore();
    const manager = usersByEmail.get("morgan.manager@local.test") ?? null;
    const { repository, readTemplates } = createTaskTemplateRepository();

    const template = await createTaskTemplate(
      manager,
      {
        title: "  Check photo-ready vehicles  ",
        description: "  Confirm photo-ready units are ready for merchandising.  ",
        workflowArea: "ADVERTISING",
        defaultDueTime: "10:15",
        requiresManagerApproval: false,
        roleId: "role-marketing",
        dutyId: "duty-photos"
      },
      repository
    );

    expect(template).toMatchObject({
      title: "Check photo-ready vehicles",
      description: "Confirm photo-ready units are ready for merchandising.",
      workflowArea: WorkflowArea.ADVERTISING,
      defaultDueTime: "10:15",
      requiresManagerApproval: false,
      isActive: true,
      roleName: "Marketing/Advertisement Manager",
      dutyName: "Check vehicles ready for photos"
    });
    expect(readTemplates()).toHaveLength(4);
  });

  it("allows a manager to update an existing task template without changing its id", async () => {
    const { usersByEmail } = await createTestAuthStore();
    const manager = usersByEmail.get("morgan.manager@local.test") ?? null;
    const { repository } = createTaskTemplateRepository();

    const template = await updateTaskTemplate(
      manager,
      "template-1",
      {
        title: "Review inventory exceptions",
        description: "",
        defaultDueTime: "09:30",
        requiresManagerApproval: true,
        roleId: "role-manager",
        dutyId: null
      },
      repository
    );

    expect(template).toMatchObject({
      id: "template-1",
      title: "Review inventory exceptions",
      description: null,
      defaultDueTime: "09:30",
      requiresManagerApproval: true,
      roleId: "role-manager",
      dutyId: null,
      roleName: "General Manager",
      dutyName: null
    });
  });

  it("allows a manager to deactivate a task template through the update flow", async () => {
    const { usersByEmail } = await createTestAuthStore();
    const manager = usersByEmail.get("morgan.manager@local.test") ?? null;
    const { repository } = createTaskTemplateRepository();

    const template = await updateTaskTemplate(
      manager,
      "template-1",
      {
        isActive: false
      },
      repository
    );

    expect(template.isActive).toBe(false);
  });

  it("rejects staff users who try to create, update, or deactivate task templates", async () => {
    const { usersByEmail } = await createTestAuthStore();
    const staffUser = usersByEmail.get("jordan.sales@local.test") ?? null;
    const { repository } = createTaskTemplateRepository();

    await expect(
      createTaskTemplate(
        staffUser,
        {
          title: "Review sales queue",
          workflowArea: "SALES",
          defaultDueTime: "15:00",
          requiresManagerApproval: false
        },
        repository
      )
    ).rejects.toThrow(/Manager access required/);

    await expect(
      updateTaskTemplate(
        staffUser,
        "template-1",
        {
          title: "Review sales queue"
        },
        repository
      )
    ).rejects.toThrow(/Manager access required/);

    await expect(
      updateTaskTemplate(
        staffUser,
        "template-1",
        {
          isActive: false
        },
        repository
      )
    ).rejects.toThrow(/Manager access required/);
  });

  it("rejects invalid create and update payloads", async () => {
    const { usersByEmail } = await createTestAuthStore();
    const manager = usersByEmail.get("morgan.manager@local.test") ?? null;
    const { repository } = createTaskTemplateRepository();

    await expect(
      createTaskTemplate(
        manager,
        {
          title: "   ",
          workflowArea: "SALES",
          defaultDueTime: "15:00",
          requiresManagerApproval: false
        },
        repository
      )
    ).rejects.toThrow(/require a title/);

    await expect(
      createTaskTemplate(
        manager,
        {
          title: "Review leads",
          workflowArea: "SERVICE",
          defaultDueTime: "15:00",
          requiresManagerApproval: false
        },
        repository
      )
    ).rejects.toThrow(/valid workflow area/);

    await expect(
      createTaskTemplate(
        manager,
        {
          title: "Review leads",
          workflowArea: "SALES",
          defaultDueTime: "3:00 PM",
          requiresManagerApproval: false
        },
        repository
      )
    ).rejects.toThrow(/HH:mm/);

    await expect(
      createTaskTemplate(
        manager,
        {
          title: "Review leads",
          workflowArea: "SALES",
          defaultDueTime: "15:00",
          requiresManagerApproval: "yes"
        },
        repository
      )
    ).rejects.toThrow(/requiresManagerApproval/);

    await expect(
      updateTaskTemplate(
        manager,
        "template-1",
        {
          unsupportedField: true
        },
        repository
      )
    ).rejects.toThrow(/unsupported field/);

    await expect(
      updateTaskTemplate(
        manager,
        "template-1",
        {
          isActive: "no"
        },
        repository
      )
    ).rejects.toThrow(/isActive/);

    await expect(updateTaskTemplate(manager, "template-1", {}, repository)).rejects.toThrow(
      /at least one field/
    );
  });

  it("rejects invalid roleId and dutyId references", async () => {
    const { usersByEmail } = await createTestAuthStore();
    const manager = usersByEmail.get("morgan.manager@local.test") ?? null;
    const { repository } = createTaskTemplateRepository();

    await expect(
      createTaskTemplate(
        manager,
        {
          title: "Review leads",
          workflowArea: "SALES",
          defaultDueTime: "15:00",
          requiresManagerApproval: false,
          roleId: "missing-role"
        },
        repository
      )
    ).rejects.toThrow(/existing role/);

    await expect(
      updateTaskTemplate(
        manager,
        "template-1",
        {
          dutyId: "missing-duty"
        },
        repository
      )
    ).rejects.toThrow(/existing duty/);
  });

  it("rejects missing task templates during updates", async () => {
    const { usersByEmail } = await createTestAuthStore();
    const manager = usersByEmail.get("morgan.manager@local.test") ?? null;
    const { repository } = createTaskTemplateRepository();

    await expect(
      updateTaskTemplate(
        manager,
        "missing-template",
        {
          title: "Review leads"
        },
        repository
      )
    ).rejects.toThrow(/Task template not found/);
  });
});
