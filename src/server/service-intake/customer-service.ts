import { randomUUID } from "node:crypto";

import type { AuthenticatedUser } from "@/server/auth/store";
import { INITIAL_ORGANIZATION } from "@/server/appointments/location-foundation";
import { prisma } from "@/server/db/client";
import { createEnterpriseCommandRepository } from "@/server/enterprise-command/repository";
import { assertVehicleCapability } from "@/server/enterprise-command/vehicle-capabilities";
import { assertAuthenticatedUser } from "@/server/policies/access";

type CustomerInput = {
  address?: unknown;
  displayName?: unknown;
  email?: unknown;
  locationId?: unknown;
  phoneNumber?: unknown;
  preferredContactMethod?: unknown;
};

function text(value: unknown, label: string, max: number, required = false) {
  const result = typeof value === "string" ? value.trim() : "";
  if (required && !result) throw new Error(`${label} is required.`);
  if (result.length > max) throw new Error(`${label} must be ${max} characters or fewer.`);
  return result || null;
}

function normalizePhone(value: string | null) {
  return value?.replace(/[^\d+]/g, "") ?? null;
}

export async function createServiceIntakeCustomer(actor: AuthenticatedUser | null, value: CustomerInput) {
  const user = assertAuthenticatedUser(actor);
  const organizationId = INITIAL_ORGANIZATION.id;
  const locationId = text(value?.locationId, "Location", 100, true)!;
  const displayName = text(value?.displayName, "Customer name", 200, true)!;
  const phoneNumber = text(value?.phoneNumber, "Phone number", 50);
  const email = text(value?.email, "Email", 200)?.toLocaleLowerCase() ?? null;
  const address = text(value?.address, "Address", 500);
  const preferredContactMethod = text(value?.preferredContactMethod, "Preferred contact method", 30) ?? "PHONE";
  if (!phoneNumber && !email) throw new Error("A phone number or email is required.");

  const grants = await createEnterpriseCommandRepository().listCapabilityGrants(user.id, organizationId);
  assertVehicleCapability({ actor: user, capability: "REPAIR_ORDER_MANAGE", grants, locationId, now: new Date() });

  const normalizedPhone = normalizePhone(phoneNumber);
  const duplicate = await prisma.customer.findFirst({
    where: {
      organizationId,
      status: "ACTIVE",
      mergedIntoCustomerId: null,
      OR: [
        ...(email ? [{ email: { equals: email, mode: "insensitive" as const } }] : []),
        ...(normalizedPhone ? [{ contactPoints: { some: { type: "PHONE", normalizedValue: normalizedPhone } } }] : []),
      ],
    },
    select: { id: true, customerNumber: true, displayName: true, phoneNumber: true, email: true },
  });
  if (duplicate) return { customer: duplicate, duplicate: true };

  const id = randomUUID();
  const correlationId = randomUUID();
  const customer = await prisma.$transaction(async (tx) => {
    const created = await tx.customer.create({
      data: {
        id,
        organizationId,
        customerNumber: `CUS-${id.slice(0, 8).toUpperCase()}`,
        displayName,
        phoneNumber,
        email,
        address,
        preferredContactMethod,
        sourceCode: "SERVICE_INTAKE",
      },
      select: { id: true, customerNumber: true, displayName: true, phoneNumber: true, email: true },
    });
    if (phoneNumber && normalizedPhone) await tx.customerContactPoint.create({ data: { customerId: id, type: "PHONE", value: phoneNumber, normalizedValue: normalizedPhone, isPrimary: preferredContactMethod === "PHONE", consentStatus: "UNKNOWN" } });
    if (email) await tx.customerContactPoint.create({ data: { customerId: id, type: "EMAIL", value: email, normalizedValue: email, isPrimary: preferredContactMethod === "EMAIL", consentStatus: "UNKNOWN" } });
    await tx.enterpriseAuditEvent.create({ data: { organizationId, locationId, actorUserId: user.id, domain: "SHOP_OPERATIONS", subjectType: "CUSTOMER", subjectId: id, eventType: "SERVICE_INTAKE_CUSTOMER_CREATED", reason: "Create a canonical customer during governed vehicle intake.", newValue: created, metadata: { source: "SERVICE_INTAKE" }, correlationId } });
    return created;
  });
  return { customer, duplicate: false };
}
