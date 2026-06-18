import { describe, expect, it } from "vitest";

import {
  dayOneDutyDefinitions,
  dayOneRoleDefinitions,
  dayOneTaskTemplateDefinitions
} from "@/server/auth/dev-seed-data";

const dueTimePattern = /^([01]\d|2[0-3]):([0-5]\d)$/;

describe("task template seed definitions", () => {
  it("provides realistic local task templates for later generation work", () => {
    expect(dayOneTaskTemplateDefinitions.length).toBeGreaterThanOrEqual(6);
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
    expect(dayOneTaskTemplateDefinitions.some((templateDefinition) => Boolean(templateDefinition.roleName))).toBe(true);
    expect(dayOneTaskTemplateDefinitions.some((templateDefinition) => Boolean(templateDefinition.dutyName))).toBe(true);
  });
});
