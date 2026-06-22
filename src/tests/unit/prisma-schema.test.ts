import { readdir, readFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

import { describe, expect, it } from "vitest";

const testsDir = path.dirname(fileURLToPath(import.meta.url));
const workspaceRoot = path.resolve(testsDir, "../../..");
const schemaPath = path.join(workspaceRoot, "prisma", "schema.prisma");
const migrationsPath = path.join(workspaceRoot, "prisma", "migrations");

function getModelBlock(schema: string, modelName: string) {
  const modelMatch = schema.match(new RegExp(`model ${modelName} \\{([\\s\\S]*?)\\n\\}`, "m"));

  expect(modelMatch, `Expected to find model ${modelName} in schema.prisma.`).not.toBeNull();

  return modelMatch?.[1] ?? "";
}

describe("prisma schema constraints", () => {
  it("declares the DB-021 unique constraints and indexes in Prisma-native schema", async () => {
    const schema = await readFile(schemaPath, "utf8");
    const boardDayModel = getModelBlock(schema, "BoardDay");
    const taskModel = getModelBlock(schema, "Task");
    const taskCommentModel = getModelBlock(schema, "TaskComment");
    const generationRunModel = getModelBlock(schema, "GenerationRun");

    expect(boardDayModel).toMatch(/date\s+DateTime\s+@unique\s+@db\.Date/);

    expect(taskModel).toMatch(/assignedUserId\s+String\b/);
    expect(taskModel).toMatch(/dueAt\s+DateTime\b/);
    expect(taskModel).toMatch(/recommendationReasonCode\s+String\?/);
    expect(taskModel).toMatch(/recommendationReasonText\s+String\?/);
    expect(taskModel).toMatch(/recommendationReviewNeeded\s+Boolean\s+@default\(false\)/);
    expect(taskModel).toMatch(/@@unique\(\[boardDayId,\s*sourceTemplateId,\s*assignedUserId\]\)/);
    expect(taskModel).toMatch(/@@index\(\[boardDayId,\s*status\]\)/);
    expect(taskModel).toMatch(/@@index\(\[boardDayId,\s*assignedUserId\]\)/);
    expect(taskModel).toMatch(/@@index\(\[boardDayId,\s*workflowArea\]\)/);

    expect(taskCommentModel).toMatch(/taskId\s+String\b/);
    expect(taskCommentModel).toMatch(/authorUserId\s+String\b/);
    expect(taskCommentModel).toMatch(/body\s+String\b/);
    expect(taskCommentModel).toMatch(/@@index\(\[taskId\]\)/);
    expect(taskCommentModel).toMatch(/@@index\(\[taskId,\s*createdAt\]\)/);

    expect(generationRunModel).toMatch(/@@index\(\[boardDate,\s*startedAt\]\)/);
  });

  it("keeps the blocked-task blocker reason rule in a SQL migration", async () => {
    const migrationEntries = await readdir(migrationsPath, { withFileTypes: true });
    const migrationSqlContents = await Promise.all(
      migrationEntries
        .filter((entry) => entry.isDirectory())
        .map((entry) => readFile(path.join(migrationsPath, entry.name, "migration.sql"), "utf8"))
    );
    const combinedSql = migrationSqlContents.join("\n");

    expect(combinedSql).toMatch(/ADD CONSTRAINT "Task_blocked_requires_blocker_reason_check"/);
    expect(combinedSql).toMatch(/NULLIF\(BTRIM\("blockerReason"\), ''\) IS NOT NULL/);
  });
});
