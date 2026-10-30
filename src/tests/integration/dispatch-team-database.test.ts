import { describe, it } from "vitest";
import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";
import { prisma } from "@/server/db/client";
import { executeDispatchCommand } from "@/server/dispatch/command";
import { workbookReportHistory } from "@/server/reporting/workbook-history";
import type { AuthenticatedUser } from "@/server/auth/store";
import type { PrismaClient } from "@prisma/client";

const now = new Date("2026-10-29T14:00:00Z"), date = "2026-10-29";
const marker = randomUUID(), rollback = new Error("ROLLBACK_VERIFICATION");
async function verify() {
  const url = new URL(process.env.DATABASE_URL!);
  assert(["localhost", "127.0.0.1"].includes(url.hostname), "Local verification only");
  const before = await prisma.workdayReportDraft.count();
  try {
    await prisma.$transaction(async tx => {
      const database = new Proxy(tx, { get(target, key) { return key === "$transaction" ? async (fn: (value: typeof tx) => Promise<unknown>) => fn(tx) : Reflect.get(target, key); } }) as unknown as PrismaClient;
      const board = await tx.boardDay.upsert({ where: { date: new Date(date + "T00:00:00Z") }, update: {}, create: { date: new Date(date + "T00:00:00Z") } });
      const people = await Promise.all([1, 2].map(n => tx.user.create({ data: { name: "Dispatch verification " + n, email: marker + n + "@verification.invalid", passwordHash: "not-a-login", isActive: true } })));
      const actor = (n: number): AuthenticatedUser => ({ ...people[n], roles: [], duties: { direct: [], roleDefaults: [], all: [] } });
      const dependencies = { database, now: () => now, loadSettings: async () => ({ timezone: "America/Chicago" }) };
      const command = (n: number, action: string, extra: Record<string, unknown> = {}) => {
        const input = { action, date, expectedVersion: 0, idempotencyKey: randomUUID(), ...extra };
        return { input, execute: () => executeDispatchCommand(actor(n), input, dependencies) };
      };
      const workbook = await tx.workdayWorkbook.create({ data: { boardDayId: board.id, userId: people[0].id, scope: "STAFF" } });
      await tx.workdayDailyFocusItem.createMany({ data: ["Call customers", "Photograph vehicles"].map(outcome => ({ workbookId: workbook.id, outcome })) });
      await assert.rejects(command(0, "SUBMIT_FOCUS").execute, /Invalid dispatch action/);
      assert.equal(await tx.workdayDailyFocusItem.count({ where: { workbookId: workbook.id } }), 2, "A board command changed the workbook");
      const task = await tx.task.create({ data: { boardDayId: board.id, assignedUserId: people[0].id, ownerUserId: people[0].id, title: "Verify ownership transfer", dueAt: now, sourceType: "STAFF", workflowArea: "ADMIN", status: "IN_PROGRESS" } });
      const request = command(0, "REQUEST_HANDOFF", { taskId: task.id, expectedTaskUpdatedAt: task.updatedAt.toISOString(), receiverUserId: people[1].id, nextAction: "Confirm the scheduled delivery." });
      const result = await request.execute() as { handoffId: string };
      assert.equal((await tx.task.findUniqueOrThrow({ where: { id: task.id } })).ownerUserId, people[0].id, "Pending handoff transferred ownership");
      await assert.rejects(command(0, "ACCEPT_HANDOFF", { handoffId: result.handoffId }).execute, /receiving person/);
      const accept = command(1, "ACCEPT_HANDOFF", { handoffId: result.handoffId });
      await accept.execute(); await accept.execute();
      assert.equal((await tx.task.findUniqueOrThrow({ where: { id: task.id } })).ownerUserId, people[1].id);
      assert.equal((await tx.dispatchPresence.findUniqueOrThrow({ where: { userId: people[1].id } })).state, "UNKNOWN", "Acceptance incorrectly started work");
      assert.equal(await tx.activityEvent.count({ where: { taskId: task.id, eventType: "dispatch.accept_handoff" } }), 1);
      for (const decision of ["DECLINE_HANDOFF", "CANCEL_HANDOFF"]) {
        const latest = await tx.task.findUniqueOrThrow({ where: { id: task.id } });
        const pending = await command(1, "REQUEST_HANDOFF", { taskId: task.id, expectedTaskUpdatedAt: latest.updatedAt.toISOString(), receiverUserId: people[0].id, nextAction: "Review delivery." }).execute() as { handoffId: string };
        await command(decision === "DECLINE_HANDOFF" ? 0 : 1, decision, { handoffId: pending.handoffId, reason: "Current owner will finish." }).execute();
        assert.equal((await tx.task.findUniqueOrThrow({ where: { id: task.id } })).ownerUserId, people[1].id);
      }
      for (let version = 1; version <= 3; version++) await tx.workdayReportDraft.create({ data: { workbookId: workbook.id, version, cadence: "DAILY", periodStart: new Date(date + "T00:00:00Z"), periodEnd: new Date("2026-10-30T00:00:00Z"), title: "Verification daily report", summary: "Saved history", sections: [], sourceSeedIds: [], generatedByUserId: people[0].id } });
      const history = await workbookReportHistory({ subjectUserId: people[0].id, from: date, to: date, query: "Verification" }, tx);
      assert.equal(history.length, 1); assert.equal(history[0].version, 3); assert.equal(history[0].businessStart, date);
      assert.equal((await workbookReportHistory({ subjectUserId: people[1].id, from: date, to: date }, tx)).length, 0);
      assert.equal((await workbookReportHistory({ subjectUserId: people[0].id, cursor: history[0].id }, tx)).length, 0, "Earlier versions leaked into another history page");
      assert.equal((await workbookReportHistory({ subjectUserId: people[0].id, submittedOnly: true }, tx)).length, 0, "Draft mislabeled as submission");
      throw rollback;
    }, { timeout: 30000, isolationLevel: "Serializable" });
  } catch (error) { if (error !== rollback) throw error; }
  assert.equal(await prisma.user.count({ where: { email: { contains: marker } } }), 0, "Test data persisted");
  assert.equal(await prisma.workdayReportDraft.count(), before);
  console.log("PASS: workbook source preserved; receiver-only acceptance; ownership retained while pending/declined/cancelled; acceptance does not start work; exact-date latest-version archive and pagination; staff scope; draft/submission distinction. All synthetic records rolled back.");
}

describe.skipIf(process.env.RUN_DISPATCH_DB_VERIFICATION !== "true")("dispatch database workflow", () => {
  it("preserves workbook sources, ownership and history with all fixture data rolled back", verify, 40000);
});
