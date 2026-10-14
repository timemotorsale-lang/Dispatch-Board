import { randomUUID } from "node:crypto";
import { NextResponse } from "next/server";
import { getCurrentUser } from "@/server/auth/current-user";
import { prisma } from "@/server/db/client";
import { INITIAL_ORGANIZATION } from "@/server/appointments/location-foundation";
import { evaluateUnifiedCrmCapability } from "@/server/policies/unified-crm-access";
import { normalizeServiceIntakePhoneNumber } from "@/server/service-intake/customer-service";

function text(value: unknown, label: string, max: number, required = false) {
  const result = typeof value === "string" ? value.trim() : "";
  if (required && !result) throw new Error(`${label} is required.`);
  if (result.length > max) throw new Error(`${label} must be ${max} characters or fewer.`);
  return result || null;
}
export async function POST(request: Request) {
  const user = await getCurrentUser();
  const access = evaluateUnifiedCrmCapability(user, "crm.mutate");
  if (!user) return NextResponse.json({ error: "Authentication required." }, { status: 401 });
  if (!access.allowed) return NextResponse.json({ error: "CRM access is required to import this contact." }, { status: 403 });
  try {
    const input = await request.json().catch(() => ({}));
    const displayName = text(input.displayName, "Customer name", 200, true)!;
    const rawPhone = text(input.phoneNumber, "Phone number", 50);
    const phoneNumber = normalizeServiceIntakePhoneNumber(rawPhone);
    const email = text(input.email, "Email", 200)?.toLowerCase() ?? null;
    const company = text(input.company, "Company", 200);
    const sourceId = text(input.sourceId, "Source reference", 200, true)!;
    const sourceKind = text(input.sourceKind, "Source type", 80, true)!;
    const sourceText = text(input.sourceText, "Source context", 1600, true)!;
    const followUpDate = text(input.followUpDate, "Follow-up date", 10);
    if (!phoneNumber && !email) throw new Error("A phone number or email is required before importing to CRM.");
    if (followUpDate && (!/^\d{4}-\d{2}-\d{2}$/.test(followUpDate) || Number.isNaN(Date.parse(followUpDate)))) throw new Error("Follow-up date is invalid.");
    const candidateWhere = { organizationId: INITIAL_ORGANIZATION.id, status: "ACTIVE" as const, mergedIntoCustomerId: null, OR: [{ displayName: { equals: displayName, mode: "insensitive" as const } }, ...(email ? [{ email: { equals: email, mode: "insensitive" as const } }] : []), ...(phoneNumber ? [{ contactPoints: { some: { type: "PHONE", normalizedValue: phoneNumber } } }] : [])] };
    const candidates = await prisma.customer.findMany({ where: candidateWhere, take: 5, orderBy: { updatedAt: "desc" }, select: { id: true, customerNumber: true, displayName: true, phoneNumber: true, email: true } });
    const resolution = input.duplicateResolution === "CREATE_NEW" ? "CREATE_NEW" : input.duplicateResolution === "USE_EXISTING" ? "USE_EXISTING" : null;
    if (candidates.length && !resolution) return NextResponse.json({ code: "POSSIBLE_DUPLICATE", message: "Possible CRM matches require staff review.", candidates }, { status: 409 });
    const existingCustomerId = text(input.existingCustomerId, "Existing customer", 200);
    const duplicate = resolution === "USE_EXISTING" ? candidates.find(item => item.id === existingCustomerId) ?? null : null;
    if (resolution === "USE_EXISTING" && !duplicate) throw new Error("Select one of the possible CRM matches before continuing.");
    const customer = duplicate ?? await prisma.$transaction(async tx => {
      const id = randomUUID();
      const created = await tx.customer.create({ data: { id, organizationId: INITIAL_ORGANIZATION.id, customerNumber: `CUS-${id.slice(0,8).toUpperCase()}`, displayName, phoneNumber, email, ownerUserId: user.id, preferredContactMethod: phoneNumber ? "PHONE" : "EMAIL", sourceCode: "WORKBOOK_IMPORT", ...(followUpDate ? { nextActionAt: new Date(`${followUpDate}T17:00:00.000Z`) } : {}) }, select: { id: true, customerNumber: true, displayName: true, phoneNumber: true, email: true } });
      if (rawPhone && phoneNumber) await tx.customerContactPoint.create({ data: { customerId: id, type: "PHONE", value: rawPhone, normalizedValue: phoneNumber, isPrimary: true, consentStatus: "UNKNOWN" } });
      if (email) await tx.customerContactPoint.create({ data: { customerId: id, type: "EMAIL", value: email, normalizedValue: email, isPrimary: !phoneNumber, consentStatus: "UNKNOWN" } });
      return created;
    });
    const noteBody = [`Imported from ${sourceKind}.`, company ? `Company: ${company}.` : "", sourceText, followUpDate ? `Follow-up requested: ${followUpDate}.` : ""].filter(Boolean).join(" ");
    const priorImport = await prisma.enterpriseAuditEvent.findFirst({ where: { organizationId: INITIAL_ORGANIZATION.id, subjectType: "CUSTOMER", subjectId: customer.id, eventType: "WORKBOOK_CONTACT_IMPORTED", correlationId: `workbook:${sourceKind}:${sourceId}` }, select: { id: true } });
    if (!priorImport) await prisma.$transaction([
      prisma.customerNote.create({ data: { customerId: customer.id, authorUserId: user.id, body: noteBody, visibility: "INTERNAL" } }),
      prisma.enterpriseAuditEvent.create({ data: { organizationId: INITIAL_ORGANIZATION.id, actorUserId: user.id, domain: "UNIFIED_CRM", subjectType: "CUSTOMER", subjectId: customer.id, eventType: "WORKBOOK_CONTACT_IMPORTED", reason: "Import a reviewed workbook contact into CRM.", correlationId: `workbook:${sourceKind}:${sourceId}`, metadata: { sourceId, sourceKind, duplicateCustomer: Boolean(duplicate) } } })
    ]);
    return NextResponse.json({ customer, duplicate: Boolean(duplicate), sourceAlreadyImported: Boolean(priorImport), href: `/crm/customers/${encodeURIComponent(customer.id)}` }, { status: duplicate ? 200 : 201 });
  } catch (error) { return NextResponse.json({ error: error instanceof Error ? error.message : "Unable to import this contact." }, { status: 400 }); }
}
