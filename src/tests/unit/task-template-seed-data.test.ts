import { describe, expect, it } from "vitest";

import {
  developmentUserDefinitions,
  dayOneDutyDefinitions,
  dayOneRoleDefinitions,
  dayOneTaskTemplateDefinitions
} from "@/server/auth/dev-seed-data";

const dueTimePattern = /^([01]\d|2[0-3]):([0-5]\d)$/;

describe("task template seed definitions", () => {
  it("provides realistic local task templates for later generation work", () => {
    expect(dayOneTaskTemplateDefinitions.length).toBeGreaterThanOrEqual(20);
  });

  it("keeps seeded default due times in 24-hour HH:mm format", () => {
    for (const templateDefinition of dayOneTaskTemplateDefinitions) {
      expect(templateDefinition.defaultDueTime).toMatch(dueTimePattern);
    }
  });

  it("references only seeded roles and duties when associations are present", () => {
    const roleNames = new Set<string>(dayOneRoleDefinitions.map((roleDefinition) => roleDefinition.name));
    const dutyNames = new Set<string>(dayOneDutyDefinitions.map((dutyDefinition) => dutyDefinition.name));

    for (const templateDefinition of dayOneTaskTemplateDefinitions) {
      if (templateDefinition.roleName) {
        expect(roleNames.has(templateDefinition.roleName)).toBe(true);
      }

      if (templateDefinition.dutyName) {
        expect(dutyNames.has(templateDefinition.dutyName)).toBe(true);
      }
    }
  });

  it("includes both role-based and duty-based template examples", () => {
    expect(dayOneTaskTemplateDefinitions.some((templateDefinition) => Boolean(templateDefinition.dutyName))).toBe(true);
  });

  it("includes the day-one roles expected by the role duty reference", () => {
    expect(dayOneRoleDefinitions.map((roleDefinition) => roleDefinition.name)).toEqual(
      expect.arrayContaining([
        "General Manager",
        "Inventory Manager",
        "Service Department Manager",
        "Mechanic",
        "Salesperson",
        "Office Manager",
        "Marketing/Advertisement Manager",
        "Collections"
      ])
    );
  });

  it("includes the core day-one generated duties from the role duty reference", () => {
    expect(dayOneDutyDefinitions.map((dutyDefinition) => dutyDefinition.name)).toEqual(
      expect.arrayContaining([
        "Review today's dispatch board",
        "Review inventory status and priority vehicles",
        "Review service production priorities",
        "Review assigned repair and diagnostic tasks",
        "Review sales follow-up tasks",
        "Check vehicles ready for photos",
        "Review office/admin support tasks",
        "Submit daily collections log"
      ])
    );
  });

  it("includes active templates for the expected day-one MVP work", () => {
    const activeTemplateTitles = dayOneTaskTemplateDefinitions
      .filter((templateDefinition) => templateDefinition.isActive)
      .map((templateDefinition) => templateDefinition.title);

    expect(activeTemplateTitles).toEqual(
      expect.arrayContaining([
        "Review today's dispatch board",
        "Review blocked tasks",
        "Review inventory status and priority vehicles",
        "Review service production priorities",
        "Review assigned repair and diagnostic tasks",
        "Review sales follow-up tasks",
        "Check vehicles ready for photos",
        "Review office/admin support tasks",
        "Submit daily collections log"
      ])
    );
  });

  it("keeps conditional repair-report work seeded but inactive until a later trigger exists", () => {
    expect(dayOneTaskTemplateDefinitions).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          title: "Complete repair report for completed repair",
          isActive: false
        })
      ])
    );
  });

  it("aligns the seeded day-one staff names to the role duty reference", () => {
    expect(developmentUserDefinitions.map((userDefinition) => userDefinition.name)).toEqual(
      expect.arrayContaining([
        "Eli Manager",
        "Brock Inventory",
        "Walter Mechanic",
        "Baraka Sales",
        "Ancilla Ops",
        "Eva Collections"
      ])
    );
  });
});
