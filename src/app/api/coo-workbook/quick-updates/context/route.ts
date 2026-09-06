import { NextResponse } from "next/server";

import { quickUpdateMatchesContext } from "@/lib/quick-update-context-match";
import { quickUpdateIdentityKey } from "@/lib/quick-update-identity";
import { getCurrentUser } from "@/server/auth/current-user";
import { prisma } from "@/server/db/client";
import { INITIAL_ORGANIZATION } from "@/server/appointments/location-foundation";
import { isManager } from "@/server/policies/access";
import { evaluateUnifiedCrmCapability } from "@/server/policies/unified-crm-access";
import { normalizeServiceIntakePhoneNumber } from "@/server/service-intake/customer-service";

function value(input: string | null, max = 200) {
  return (input ?? "").trim().slice(0, max);
}

function canReadWorkbook(user: NonNullable<Awaited<ReturnType<typeof getCurrentUser>>>, ownerUserId: string) {
  return ownerUserId === user.id || isManager(user);
}

export async function GET(request: Request) {
  try {
    const user = await getCurrentUser();
    if (!user) return NextResponse.json({ error: "Authentication required." }, { status: 401 });

  const url = new URL(request.url);
  const updateId = value(url.searchParams.get("updateId"), 120);
  const savedUpdate = updateId ? await prisma.workdayQuickUpdate.findUnique({
    where: { id: updateId },
    include: { workbook: { select: { userId: true } } }
  }) : null;
  if (updateId && !savedUpdate) return NextResponse.json({ error: "Quick Update not found." }, { status: 404 });
  if (savedUpdate && !canReadWorkbook(user, savedUpdate.workbook.userId)) return NextResponse.json({ error: "You cannot review this Quick Update." }, { status: 403 });

  const person = value(url.searchParams.get("person")) || savedUpdate?.person || "";
  const details = value(url.searchParams.get("text"), 1600) || savedUpdate?.text || "";
  const phoneFromDetails = details.match(/(?:\+?1[\s.-]?)?\(?\d{3}\)?[\s.-]\d{3}[\s.-]\d{4}/)?.[0] ?? "";
  const phoneNumber = value(url.searchParams.get("phoneNumber"), 50) || savedUpdate?.phoneNumber || phoneFromDetails;
  const company = value(url.searchParams.get("company")) || savedUpdate?.company || "";
  const identityKey = quickUpdateIdentityKey(person, phoneNumber, company) || savedUpdate?.identityKey || "";
  const crmAccess = evaluateUnifiedCrmCapability(user, "crm.customer.view").allowed;
  let normalizedPhone: string | null = null;
  try { normalizedPhone = normalizeServiceIntakePhoneNumber(phoneNumber); } catch { normalizedPhone = null; }
  const candidateTerms = [person, company].filter((item) => item.length >= 2);
  const candidates = crmAccess && (normalizedPhone || candidateTerms.length || savedUpdate?.relatedCustomerId)
    ? await prisma.customer.findMany({
      where: {
        organizationId: INITIAL_ORGANIZATION.id,
        status: "ACTIVE",
        mergedIntoCustomerId: null,
        OR: [
          ...(savedUpdate?.relatedCustomerId ? [{ id: savedUpdate.relatedCustomerId }] : []),
          ...(normalizedPhone ? [{ contactPoints: { some: { type: "PHONE", normalizedValue: normalizedPhone } } }] : []),
          ...candidateTerms.map((term) => ({ displayName: { contains: term, mode: "insensitive" as const } }))
        ]
      },
      take: 6,
      orderBy: { updatedAt: "desc" },
      select: {
        id: true,
        customerNumber: true,
        displayName: true,
        phoneNumber: true,
        email: true,
        lastInteractionAt: true,
        nextActionAt: true,
        _count: { select: { notes: true, repairOrders: true, tasks: true } }
      }
    })
    : [];
  const candidateIds = candidates.map((candidate) => candidate.id);
  const historyPool = identityKey || candidateIds.length || details
    ? await prisma.workdayQuickUpdate.findMany({
      where: isManager(user) ? {} : { workbook: { userId: user.id } },
      take: 250,
      orderBy: { createdAt: "desc" },
      include: { workbook: { select: { scope: true, user: { select: { id: true, name: true } }, boardDay: { select: { date: true } } } } }
    })
    : [];
  const targetIdentity = { company, identityKey, person, phoneNumber, relatedCustomerId: savedUpdate?.relatedCustomerId ?? null, text: details };
  const history = historyPool.filter((item) => item.id !== updateId && quickUpdateMatchesContext(targetIdentity, item, candidateIds));
  const uniqueHistory = history.filter((item, index, items) => items.findIndex((candidate) => candidate.id === item.id) === index);
  const openFollowUps = uniqueHistory.filter((item) => item.followUpNeeded && !item.convertedTaskId).length;
  const categoryCounts = uniqueHistory.reduce<Record<string, number>>((counts, item) => {
    counts[item.category] = (counts[item.category] ?? 0) + 1;
    return counts;
  }, {});
  const topCategories = Object.entries(categoryCounts).sort((left, right) => right[1] - left[1]).slice(0, 3).map(([category, count]) => ({ category, count }));
  const dayCount = new Set(uniqueHistory.map((item) => item.workbook.boardDay.date.toISOString().slice(0, 10))).size;

  return NextResponse.json({
    candidates: candidates.map(({ _count, ...candidate }) => ({ ...candidate, counts: { ..._count, workdayQuickUpdates: history.filter((item) => item.relatedCustomerId === candidate.id).length }, confirmed: candidate.id === savedUpdate?.relatedCustomerId })),
    identityKeyPresent: Boolean(identityKey),
    history: uniqueHistory.slice(0, 12).map((item) => ({
      id: item.id,
      boardDate: item.workbook.boardDay.date.toISOString().slice(0, 10),
      category: item.category,
      company: item.company,
      convertedTaskId: item.convertedTaskId,
      dueWindow: item.dueWindow,
      followUpNeeded: item.followUpNeeded,
      ownerName: item.workbook.user.name,
      person: item.person,
      text: item.text
    })),
    summary: uniqueHistory.length
      ? `${uniqueHistory.length} related update${uniqueHistory.length === 1 ? "" : "s"} across ${dayCount} workday${dayCount === 1 ? "" : "s"}; ${openFollowUps} open follow-up${openFollowUps === 1 ? "" : "s"}.`
      : "No related Quick Update history was found.",
    trend: { dayCount, openFollowUps, topCategories, totalUpdates: uniqueHistory.length }
  });
  } catch (error) {
    console.error("Quick Update related-context lookup failed", error);
    return NextResponse.json({ error: "Related history could not be checked right now. Your Quick Update was not changed." }, { status: 500 });
  }
}

export async function POST(request: Request) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "Authentication required." }, { status: 401 });
  const input = await request.json().catch(() => ({})) as { customerId?: unknown; updateId?: unknown };
  const updateId = typeof input.updateId === "string" ? input.updateId.trim() : "";
  const customerId = input.customerId === null ? null : typeof input.customerId === "string" ? input.customerId.trim() : "";
  if (!updateId) return NextResponse.json({ error: "Quick Update is required." }, { status: 400 });
  const update = await prisma.workdayQuickUpdate.findUnique({ where: { id: updateId }, include: { workbook: { select: { userId: true } } } });
  if (!update) return NextResponse.json({ error: "Quick Update not found." }, { status: 404 });
  if (!canReadWorkbook(user, update.workbook.userId)) return NextResponse.json({ error: "You cannot update this Quick Update." }, { status: 403 });
  if (customerId) {
    const access = evaluateUnifiedCrmCapability(user, "crm.customer.view");
    if (!access.allowed) return NextResponse.json({ error: "CRM access is required to link this customer." }, { status: 403 });
    const customer = await prisma.customer.findFirst({ where: { id: customerId, organizationId: INITIAL_ORGANIZATION.id, status: "ACTIVE", mergedIntoCustomerId: null }, select: { id: true, displayName: true } });
    if (!customer) return NextResponse.json({ error: "The selected CRM customer is unavailable." }, { status: 404 });
    await prisma.$transaction([
      prisma.workdayQuickUpdate.update({ where: { id: update.id }, data: { relatedCustomerId: customer.id } }),
      prisma.enterpriseAuditEvent.create({ data: { organizationId: INITIAL_ORGANIZATION.id, actorUserId: user.id, domain: "UNIFIED_CRM", subjectType: "CUSTOMER", subjectId: customer.id, eventType: "WORKBOOK_CONTEXT_LINK_CONFIRMED", reason: "Staff confirmed Quick Update identity context.", correlationId: `quick-update:${update.id}`, metadata: { quickUpdateId: update.id } } })
    ]);
    return NextResponse.json({ customer: { id: customer.id, displayName: customer.displayName }, ok: true });
  }
  await prisma.workdayQuickUpdate.update({ where: { id: update.id }, data: { relatedCustomerId: null } });
  return NextResponse.json({ customer: null, ok: true });
}
