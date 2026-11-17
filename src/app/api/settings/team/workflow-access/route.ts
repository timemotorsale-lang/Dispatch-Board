import { randomUUID } from "node:crypto";
import { NextResponse } from "next/server";
import { isTrustedAppMutation } from "@/lib/app-request-origin";
import { INITIAL_ORGANIZATION } from "@/server/appointments/location-foundation";
import { getCurrentUser } from "@/server/auth/current-user";
import { prisma } from "@/server/db/client";
import { isGeneralManager } from "@/server/policies/access";

export async function PATCH(request: Request) {
  const actor = await getCurrentUser();
  if (!isTrustedAppMutation(request) || !actor?.isActive || !isGeneralManager(actor)) {
    return NextResponse.json({ error: "Only the General Manager can change staff workflow access." }, { status: 403 });
  }
  const input = await request.json().catch(() => null);
  const reason = typeof input?.reason === "string" ? input.reason.trim() : "";
  if (typeof input?.userId !== "string" || !input.userId || input.userId === actor.id ||
      typeof input.dealsRestricted !== "boolean" || typeof input.calendarRestricted !== "boolean" ||
      reason.length < 10 || reason.length > 500) {
    return NextResponse.json({ error: "Choose another staff account, set both permissions, and enter a reason (10–500 characters)." }, { status: 400 });
  }
  const { userId, dealsRestricted, calendarRestricted } = input;
  const updated = await prisma.$transaction(async database => {
    const result = await database.user.updateMany({
      where: { id: userId, isActive: true, userRoles: { none: { role: { name: "General Manager" } } } },
      data: { dealsRestricted, calendarRestricted }
    });
    if (!result.count) return false;
    await database.enterpriseAuditEvent.create({ data: {
      organizationId: INITIAL_ORGANIZATION.id, actorUserId: actor.id, domain: "TEAM_SECURITY",
      subjectType: "USER", subjectId: userId, eventType: "STAFF_WORKFLOW_ACCESS_UPDATED",
      reason, correlationId: randomUUID(), metadata: { dealsRestricted, calendarRestricted }
    } });
    return true;
  });
  return updated ? NextResponse.json({ dealsRestricted, calendarRestricted })
    : NextResponse.json({ error: "No eligible active staff account was found." }, { status: 404 });
}
