import { NextResponse } from "next/server";
import { getCurrentUser } from "@/server/auth/current-user";
import { moneyReceipt } from "@/server/money-resources/receipts";
import { prisma } from "@/server/db/client";
import { moneyError } from "@/server/money-resources/http";

export async function GET(_request: Request, context: { params: Promise<{ entryId: string }> }) {
  try {
    const { access, entry } = await moneyReceipt(await getCurrentUser(), (await context.params).entryId);
    const history = await prisma.moneyAudit.findMany({ where: { organizationId: access.organizationId, subjectId: entry.id }, select: { action: true, details: true, createdAt: true, actor: { select: { name: true } } }, orderBy: { createdAt: "asc" }, take: 200 });
    return NextResponse.json({ history }, { headers: { "cache-control": "private, no-store" } });
  } catch (error) { return moneyError(error); }
}
