import { describe, expect, it, vi } from "vitest";
import type { PrismaClient } from "@prisma/client";
import { createBoardReadRepository } from "@/server/repositories/board-read-repository";
describe("canonical open operations records", () => {
  it("retains older waiting work but suppresses a source replaced by a later completed carry-forward record", async () => {
    const findMany = vi.fn().mockResolvedValueOnce([{ id: "waiting" }, { id: "superseded" }]).mockResolvedValueOnce([{ carryoverSourceTaskId: "superseded" }]);
    const source = { task: { findMany }, boardDay: {} } as unknown as Pick<PrismaClient, "task" | "boardDay">;
    const records = await createBoardReadRepository(source).listTasksForOperationsConsole!("today", "2026-10-29");
    expect(records.map(item => item.id)).toEqual(["waiting"]);
    expect(findMany.mock.calls[0][0].where).toMatchObject({ boardDay: { date: { lte: new Date("2026-10-29T00:00Z") } } });
    expect(findMany.mock.calls[1][0].where).toMatchObject({ carryoverSourceTaskId: { in: ["waiting", "superseded"] } });
  });
});
