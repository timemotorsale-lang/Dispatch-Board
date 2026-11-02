import { getCurrentUser } from "@/server/auth/current-user";
import { pipelineCommand, PipelineError, readPipeline, findPipelineMatches } from "@/server/crm-next/pipeline-service";
import { runPipelineRecovery } from "@/server/crm-next/pipeline-worker";
import { processPipelineImport, readPipelineImport } from "@/server/crm-next/pipeline-import";

function failure(error: unknown) {
  const reference = crypto.randomUUID().slice(0, 8);
  if (error instanceof PipelineError) return Response.json({ error: error.message, code: error.code, field: error.field, retryable: error.status >= 500, reference }, { status: error.status });
  const code = error && typeof error === "object" && "code" in error ? String(error.code) : "PIPELINE_UNAVAILABLE";
  console.error(`Pipeline request failed reference=${reference} code=${code} type=${error instanceof Error ? error.name : "Unknown"}`);
  const migration = ["P2021", "P2022"].includes(code), conflict = ["P2002", "P2034"].includes(code);
  return Response.json({ error: migration ? "The pipeline database update has not been applied. Ask an administrator to apply the pipeline migration; your entries remain on screen." : conflict ? "A concurrent request changed this work. Refresh and review it, then retry the same operation." : "The pipeline could not complete this request. Your entries remain on screen. Retry this same request or give the support reference to an administrator.", code, reference, retryable: !migration }, { status: conflict ? 409 : 503 });
}
export async function GET(request: Request) {
  const importId = new URL(request.url).searchParams.get("importId");
  if (importId) { try { return Response.json(await readPipelineImport(await getCurrentUser(), importId), { headers: { "Cache-Control": "private, no-store" } }); } catch (error) { return failure(error); } }
  try { const params = new URL(request.url).searchParams, q = params.get("match"); return Response.json(q === null ? await readPipeline(await getCurrentUser(), { cursor: params.get("cursor") ?? undefined, leadPage: Number(params.get("leadPage") ?? 0), skipOpportunities: params.get("skipOpportunities") === "1" }) : await findPipelineMatches(await getCurrentUser(), q), { headers: { "Cache-Control": "private, no-store" } }); }
  catch (error) { return failure(error); }
}
export async function POST(request: Request) {
  const origin = request.headers.get("origin");
  if (origin) {
    let sameOrigin = false;
    try { const source = new URL(origin); sameOrigin = ["http:", "https:"].includes(source.protocol) && (source.origin === new URL(request.url).origin || source.host === request.headers.get("host")); } catch { /* An opaque or invalid origin is not trusted. */ }
    if (!sameOrigin) return Response.json({ error: "Use this application's pipeline workspace." }, { status: 403 });
  }
  try {
    const raw = await request.text();
    if (new TextEncoder().encode(raw).length > 128 * 1024) throw new PipelineError("REQUEST_TOO_LARGE", "Import at most 25 compact inquiry rows per request.", 413);
    const body = JSON.parse(raw), actor = await getCurrentUser();
    if (!body || typeof body !== "object" || Array.isArray(body)) throw new PipelineError("INVALID_INPUT", "Choose a pipeline action.");
    if (body.action === "RECONCILE") return Response.json(await runPipelineRecovery(actor, { cursor: body.cursor, retryFailed: body.retryFailed === true }));
    if (body.action === "BULK") {
      if (!Array.isArray(body.rows) || !body.rows.length || body.rows.length > 25 || !["FOLLOW_UP", "REQUEST_HANDOFF"].includes(body.operation) || typeof body.idempotencyKey !== "string") throw new PipelineError("INVALID_BULK", "Choose up to 25 records and a supported task or handoff operation.");
      const results = [];
      for (let index = 0; index < body.rows.length; index++) {
        const r = body.rows[index];
        try { results.push({ index, id: r.id, ok: true, result: await pipelineCommand(actor, { ...body.fields, action: body.operation, id: r.id, expectedVersion: r.expectedVersion, idempotencyKey: `${body.idempotencyKey}:${r.id}` }) }); }
        catch (error) { results.push({ index, id: r?.id, ok: false, error: error instanceof PipelineError ? error.message : "This record was not saved. Retry after reviewing its current state." }); }
      }
      return Response.json({ results });
    }
    if (body.action === "IMPORT") {
      return Response.json(await processPipelineImport(actor, body));
    }
    return Response.json(await pipelineCommand(actor, body));
  } catch (error) { if (error instanceof SyntaxError) return Response.json({ error: "The request could not be read. Your entries remain on screen.", code: "INVALID_JSON" }, { status: 400 }); return failure(error); }
}
