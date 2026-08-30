import { Prisma, type BoardDay } from "@prisma/client";
import { describe, expect, it, vi } from "vitest";

import { createWorkdayWorkbookRepository } from "@/server/repositories/workday-workbook-repository";

const boardDay: BoardDay = {
  id: "board-day-1",
  date: new Date("2026-08-30T00:00:00.000Z"),
  generationStatus: "GENERATED",
  generatedAt: null,
  generatedByUserId: null,
  createdAt: new Date("2026-08-30T12:00:00.000Z"),
  updatedAt: new Date("2026-08-30T12:00:00.000Z")
};

describe("createWorkdayWorkbookRepository", () => {
  it("reuses an existing board day when concurrent creation collides", async () => {
    const duplicateDateError = new Prisma.PrismaClientKnownRequestError(
      "Unique constraint failed on the fields: (`date`)",
      { clientVersion: "test", code: "P2002", meta: { target: ["date"] } }
    );
    const database = {
      boardDay: {
        findUnique: vi.fn().mockResolvedValue(boardDay),
        upsert: vi.fn().mockRejectedValue(duplicateDateError)
      }
    };
    const repository = createWorkdayWorkbookRepository(database as never);

    await expect(repository.getOrCreateBoardDay("2026-08-30")).resolves.toEqual(boardDay);
    expect(database.boardDay.findUnique).toHaveBeenCalledWith({
      where: { date: new Date("2026-08-30T00:00:00.000Z") }
    });
  });
});
