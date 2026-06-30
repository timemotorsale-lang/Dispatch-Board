import { readFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

import { describe, expect, it } from "vitest";

const testsDir = path.dirname(fileURLToPath(import.meta.url));
const workspaceRoot = path.resolve(testsDir, "../../..");
const roleDutyReferencePath = path.join(workspaceRoot, "docs", "ROLE_DUTY_REFERENCE.md");

describe("role duty reference document", () => {
  it("exists as a clean planning-facing markdown reference with stable anchor sections", async () => {
    const document = await readFile(roleDutyReferencePath, "utf8");

    expect(document).toContain("# Role Duty Reference");
    expect(document).toContain("## Purpose");
    expect(document).toContain("## How To Use This Document");
    expect(document).toContain("## Core Rules");
    expect(document).toContain("## MVP Boundaries");
    expect(document).toContain("## Day-One Staff Mapping");
    expect(document).toContain("## Role Reference");
    expect(document).toContain("## Quick Operations Log");
    expect(document).toContain("## Implementation Notes For Future Plans");
  });

  it("captures the key day-one role anchors and MVP planning constraints", async () => {
    const document = await readFile(roleDutyReferencePath, "utf8");

    expect(document).toContain("### General Manager");
    expect(document).toContain("### Inventory Manager");
    expect(document).toContain("### Service Department Manager");
    expect(document).toContain("### Mechanic");
    expect(document).toContain("### Salesperson");
    expect(document).toContain("### Marketing / Advertisement Manager");
    expect(document).toContain("### Office / Front Desk Manager");
    expect(document).toContain("### Collections Manager");
    expect(document).toContain("### System");

    expect(document).toContain("Custom user duties should take priority over broad role defaults.");
    expect(document).toContain("Generated tasks must stay idempotent and avoid duplicates");
    expect(document).toContain("Collections as a basic daily log only");
    expect(document).toContain("Keep `Baraka` primary for sales and marketing, not default lot/detail.");
    expect(document).toContain("Keep `Brock` on one combined inventory/service production log");
  });
});
