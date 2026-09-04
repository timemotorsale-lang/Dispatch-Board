import { createHash } from "node:crypto";
import type { Prisma } from "@prisma/client";
import { NextResponse } from "next/server";
import { getCurrentUser } from "@/server/auth/current-user";
import { prisma } from "@/server/db/client";
import { diagnosticDraftPayload } from "@/lib/diagnostic-draft";
import { getRepairOrderDetail } from "@/server/repair-order/service";
import { workdayDate } from "@/lib/workday-activity";

export async function GET() {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "Authentication required." }, { status: 401 });
  const drafts = await prisma.diagnosticWorkspaceDraft.findMany({ where: { userId: user.id }, orderBy: { updatedAt: "desc" }, take: 30 });
  return NextResponse.json({ drafts }, { headers: { "Cache-Control": "private, no-store" } });
}

export async function PUT(request: Request) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "Authentication required." }, { status: 401 });
  try {
    const text = await request.text();
    if (text.length > 210000) throw new Error("Draft is too large.");
    const body = JSON.parse(text);
    if (typeof body.id !== "string" || !/^[a-zA-Z0-9-]{1,80}$/.test(body.id) || !Number.isInteger(body.version) || body.version < 0) throw new Error("Invalid draft identity or version.");
    const content = diagnosticDraftPayload(body.content) as Prisma.InputJsonObject;
    const ro = content.ro as { id?: unknown } | null;
    if (ro) {
      if (typeof ro.id !== "string") throw new Error("Invalid repair order.");
      await getRepairOrderDetail(user, ro.id);
    }
    const contentHash = createHash("sha256").update(JSON.stringify(content)).digest("hex");
    const title = typeof body.title === "string" ? body.title.slice(0, 200) : "Untitled quote";
    return await prisma.$transaction(async tx => {
    const recordSave = async (version: number) => {
      const date = new Date(`${workdayDate(new Date())}T00:00:00Z`);
      const board = await tx.boardDay.upsert({ where: { date }, create: { date }, update: {} });
      await tx.activityEvent.create({ data: {
        actorUserId: user.id, boardDayId: board.id, eventType: "diagnostic.quote_saved",
        message: `Saved preliminary quote: ${title} (version ${version}). Not an authorization or completed repair.`,
        metadata: { sourceType: "DIAGNOSTIC_DRAFT", reportSourceId: `draft:${body.id}`, sourceModule: "DIAGNOSTICS", sourceHref: ro ? `/diagnostics/labor-guide?repairOrderId=${encodeURIComponent(String(ro.id))}` : "/diagnostics/labor-guide", draftId: body.id, version }
      } });
    };
    const current = await tx.diagnosticWorkspaceDraft.findFirst({ where: { id: body.id, userId: user.id } });
    if (current?.contentHash === contentHash) return NextResponse.json({ version: current.version });
    if (!current && body.version === 0) {
      const created = await tx.diagnosticWorkspaceDraft.create({ data: { id: body.id, userId: user.id, title, content, contentHash } });
      await recordSave(created.version);
      return NextResponse.json({ version: created.version });
    }
    const updated = await tx.diagnosticWorkspaceDraft.updateMany({ where: { id: body.id, userId: user.id, version: body.version }, data: { title, content, contentHash, version: { increment: 1 } } });
    if (!updated.count) return NextResponse.json({ error: "Draft changed in another session. Resume the latest saved draft before editing." }, { status: 409 });
    await recordSave(body.version + 1);
    return NextResponse.json({ version: body.version + 1 });
    });
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : "Unable to save draft." }, { status: 400 });
  }
}
