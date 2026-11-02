import { createHash, randomUUID } from "node:crypto";
import { Prisma } from "@prisma/client";
import { prisma } from "@/server/db/client";
import type { AuthenticatedUser } from "@/server/auth/store";
import { pipelineAccess, pipelineCommand, PipelineError } from "./pipeline-service";

const fields = ["title", "sourceCode", "sourceKey", "phone", "email", "vehicle", "pathway", "customerId", "ownerUserId", "note", "idempotencyKey"];
function clean(value: unknown) {
  const source = value && typeof value === "object" ? value as Record<string, unknown> : {};
  return Object.fromEntries(fields.filter(k => typeof source[k] === "string").map(k => [k, String(source[k]).slice(0, 1000)]));
}
type ImportRow = { index: number; payload: Record<string, string>; ok: boolean; error?: string; result?: unknown };
type Snapshot = { receivedAt: string; originalRows: Record<string, string>[]; rows: ImportRow[]; lease?: { owner: string; until: string } };
const json = (v: unknown): Prisma.InputJsonValue => JSON.parse(JSON.stringify(v));
/** The journal is durable before any row is attempted. Individual effects keep their own ledger. */
export async function processPipelineImport(actor: AuthenticatedUser | null, body: Record<string, unknown>) {
  const a = await pipelineAccess(actor, true);
  if (Array.isArray(body.corrections) && body.corrections.length && (typeof body.reason !== "string" || body.reason.trim().length < 8)) throw new PipelineError("IMPORT_REASON", "Enter a short reason for correcting the retained rows.");
  let batch;
  if (body.batchId) {
    batch = await prisma.enterpriseCommandLedger.findFirst({ where: { id: String(body.batchId), organizationId: a.organizationId, domain: "CRM_PIPELINE_IMPORT", commandType: "IMPORT_BATCH", ...(a.canManage ? {} : { actorUserId: a.actor.id }) } });
    if (!batch) throw new PipelineError("IMPORT_NOT_AVAILABLE", "This import is unavailable in your authorized scope.", 404);
  } else {
    if (!Array.isArray(body.rows) || !body.rows.length || body.rows.length > 25 || typeof body.idempotencyKey !== "string" || body.idempotencyKey.length > 120) throw new PipelineError("INVALID_IMPORT", "Import 1–25 compact rows with a stable batch reference.");
    const payloads = body.rows.map(clean), hash = createHash("sha256").update(JSON.stringify(payloads)).digest("hex"), key = body.idempotencyKey;
    batch = await prisma.$transaction(async db => {
      await db.$executeRaw`SELECT pg_advisory_xact_lock(hashtextextended(${`pipeline-import:${a.organizationId}:${key}`}, 0))`;
      const old = await db.enterpriseCommandLedger.findUnique({ where: { organizationId_domain_commandType_idempotencyKey: { organizationId: a.organizationId, domain: "CRM_PIPELINE_IMPORT", commandType: "IMPORT_BATCH", idempotencyKey: key } } });
      if (old) { if (old.requestHash !== hash || old.actorUserId !== a.actor.id) throw new PipelineError("IMPORT_KEY_CONFLICT", "This batch reference belongs to different input. Review the retained import before submitting a correction.", 409); return old; }
      const id = randomUUID(), snapshot: Snapshot = { receivedAt: new Date().toISOString(), originalRows: payloads, rows: payloads.map((payload, index) => ({ index, payload, ok: false, error: "Waiting for processing" })) };
      return db.enterpriseCommandLedger.create({ data: { id, organizationId: a.organizationId, actorUserId: a.actor.id, domain: "CRM_PIPELINE_IMPORT", subjectType: "IMPORT_BATCH", subjectId: id, commandType: "IMPORT_BATCH", status: "FAILED", errorCode: "IMPORT_PENDING", errorMessage: "Import retained; rows are awaiting processing", idempotencyKey: key, requestHash: hash, correlationId: key, expectedVersion: 0, resultSnapshot: json(snapshot) } });
    });
  }
  // Serialize journal updates, but never hold a database transaction across row commands.
  // Each row's independent idempotency protects effects if two operators retry simultaneously.
  let snapshot = batch.resultSnapshot as unknown as Snapshot;
  if (!snapshot || !Array.isArray(snapshot.rows)) throw new PipelineError("IMPORT_JOURNAL", "The retained import needs administrator review.", 409);
  const lease = randomUUID();
  snapshot = await prisma.$transaction(async db => {
    await db.$executeRaw`SELECT pg_advisory_xact_lock(hashtextextended(${`pipeline-import-journal:${batch.id}`}, 0))`;
    const current = await db.enterpriseCommandLedger.findUniqueOrThrow({ where: { id: batch.id } });
    const value = current.resultSnapshot as unknown as Snapshot;
    if (value.lease && Date.parse(value.lease.until) > Date.now()) throw new PipelineError("IMPORT_BUSY", "This retained import is already processing. Wait for it to finish before retrying or correcting rows.", 409);
    value.lease = { owner: lease, until: new Date(Date.now() + 120000).toISOString() };
    await db.enterpriseCommandLedger.update({ where: { id: batch.id }, data: { resultSnapshot: json(value) } });
    return value;
  });
  // Recover effects committed immediately before a prior process lost its connection.
  for (const row of snapshot.rows.filter(r => !r.ok)) {
    const key = row.payload.idempotencyKey || `${batch.id}:row:${row.index}`;
    const prior = await prisma.enterpriseCommandLedger.findUnique({ where: { organizationId_domain_commandType_idempotencyKey: { organizationId: a.organizationId, domain: "CRM_PIPELINE", commandType: "CAPTURE", idempotencyKey: key } } });
    if (prior?.status === "SUCCEEDED") {
      const result = prior.resultSnapshot as { id?: string };
      const visible = result.id ? await prisma.unifiedCrmOpportunityRecord.findFirst({ where: { id: result.id, organizationId: a.organizationId, ...(a.canManage ? {} : { ownerUserId: a.actor.id, OR: [{ customerId: null }, { customer: { ownerUserId: a.actor.id } }] }) }, select: { id: true } }) : null;
      if (visible) { row.ok = true; row.result = prior.resultSnapshot; delete row.error; }
    }
  }
  if (Array.isArray(body.corrections) && body.corrections.length) {
    const prior = structuredClone(snapshot.rows);
    for (const correction of body.corrections as Array<{ index: number; payload: unknown }>) {
      const row = snapshot.rows.find(r => r.index === correction.index);
      if (row && !row.ok) row.payload = { ...row.payload, ...clean(correction.payload) };
    }
    await prisma.$transaction(async db => {
      await db.enterpriseAuditEvent.create({ data: { organizationId: a.organizationId, actorUserId: a.actor.id, domain: "CRM_PIPELINE_IMPORT", subjectType: "IMPORT_BATCH", subjectId: batch.id, eventType: "IMPORT_CORRECTED", reason: body.reason as string, priorValue: json(prior), newValue: json(snapshot.rows), metadata: {}, correlationId: randomUUID() } });
      await db.enterpriseCommandLedger.update({ where: { id: batch.id }, data: { resultSnapshot: json(snapshot), completedAt: null } });
    });
  }
  for (const row of snapshot.rows) {
    if (row.ok) continue;
    try {
      const result = await pipelineCommand(actor, { ...row.payload, action: "CAPTURE", idempotencyKey: row.payload.idempotencyKey || `${batch.id}:row:${row.index}` });
      row.ok = true; row.result = result; delete row.error;
    } catch (error) { row.error = error instanceof PipelineError ? error.message : "This row could not be saved. Its input is retained for correction or retry."; }
    // Merge successes from another retry so a slower journal writer cannot undo their result.
    snapshot = await prisma.$transaction(async db => {
      await db.$executeRaw`SELECT pg_advisory_xact_lock(hashtextextended(${`pipeline-import-journal:${batch.id}`}, 0))`;
      const current = await db.enterpriseCommandLedger.findUniqueOrThrow({ where: { id: batch.id } });
      const stored = current.resultSnapshot as unknown as Snapshot;
      stored.rows = stored.rows.map(r => r.index === row.index ? r.ok ? r : row : r);
      if (stored.lease?.owner !== lease) throw new PipelineError("IMPORT_BUSY", "Another recovery attempt owns this import. Review its latest row results.", 409);
      stored.lease = { owner: lease, until: new Date(Date.now() + 120000).toISOString() };
      const remaining = stored.rows.filter(r => !r.ok).length;
      await db.enterpriseCommandLedger.update({ where: { id: batch.id }, data: { resultSnapshot: json(stored), status: remaining ? "FAILED" : "SUCCEEDED", errorCode: remaining ? "IMPORT_ROWS_FAILED" : null, errorMessage: remaining ? `${remaining} rows need review` : null, completedAt: remaining ? null : new Date() } });
      return stored;
    });
  }
  await prisma.$transaction(async db => {
    await db.$executeRaw`SELECT pg_advisory_xact_lock(hashtextextended(${`pipeline-import-journal:${batch.id}`}, 0))`;
    const current = await db.enterpriseCommandLedger.findUniqueOrThrow({ where: { id: batch.id } });
    const value = current.resultSnapshot as unknown as Snapshot;
    if (value.lease?.owner !== lease) throw new PipelineError("IMPORT_BUSY", "Another attempt is finishing this import. Refresh its results.", 409);
    value.rows = value.rows.map(row => snapshot.rows.find(r => r.index === row.index && r.ok) ?? row);
    delete value.lease; snapshot = value;
    const remaining = value.rows.filter(r => !r.ok).length;
    await db.enterpriseCommandLedger.update({ where: { id: batch.id }, data: { resultSnapshot: json(value), status: remaining ? "FAILED" : "SUCCEEDED", errorCode: remaining ? "IMPORT_ROWS_FAILED" : null, errorMessage: remaining ? `${remaining} rows need review` : null, completedAt: remaining ? null : new Date() } });
  });
  return { batchId: batch.id, results: snapshot.rows.map(({ index, ok, error, result }) => ({ index, ok, error, result })) };
}

export async function readPipelineImport(actor: AuthenticatedUser | null, id: string) {
  const a = await pipelineAccess(actor);
  const batch = await prisma.enterpriseCommandLedger.findFirst({ where: { id, organizationId: a.organizationId, domain: "CRM_PIPELINE_IMPORT", ...(a.canManage ? {} : { actorUserId: a.actor.id }) }, select: { id: true, createdAt: true, resultSnapshot: true } });
  if (!batch) throw new PipelineError("IMPORT_NOT_AVAILABLE", "This retained import is unavailable.", 404);
  const value = batch.resultSnapshot as unknown as Snapshot;
  return { id: batch.id, receivedAt: batch.createdAt.toISOString(), rows: value.rows.filter(r => !r.ok).map(({ index, payload, error }) => ({ index, payload, error })) };
}
