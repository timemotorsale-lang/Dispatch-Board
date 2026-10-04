import { randomUUID } from "node:crypto";

import type { AuthenticatedUser } from "@/server/auth/store";
import { INITIAL_ORGANIZATION } from "@/server/appointments/location-foundation";
import { prisma } from "@/server/db/client";
import { createEnterpriseCommandRepository } from "@/server/enterprise-command/repository";
import { assertVehicleCapability } from "@/server/enterprise-command/vehicle-capabilities";
import { assertAuthenticatedUser } from "@/server/policies/access";

type CustomerInput = {
  address?: unknown;
  dateOfBirth?: unknown;
  displayName?: unknown;
  email?: unknown;
  gender?: unknown;
  idNumber?: unknown;
  idState?: unknown;
  idType?: unknown;
  locationId?: unknown;
  phoneNumber?: unknown;
  preferredContactMethod?: unknown;
  ssn?: unknown;
};

function text(value: unknown, label: string, max: number, required = false) {
  const result = typeof value === "string" ? value.trim() : "";
  if (required && !result) throw new Error(`${label} is required.`);
  if (result.length > max) throw new Error(`${label} must be ${max} characters or fewer.`);
  return result || null;
}

function last4(value: string | null) {
  const digits = value?.replace(/\D/g, "") ?? "";
  return digits ? digits.slice(-4) : null;
}

function dateOnly(value: unknown, label: string) {
  const result = text(value, label, 20);
  if (!result) return null;
  const parsed = new Date(`${result}T00:00:00.000Z`);
  if (Number.isNaN(parsed.getTime())) throw new Error(`${label} must be a valid date.`);
  return parsed;
}

export function normalizeServiceIntakePhoneNumber(value: string | null) {
  const normalized = value?.trim() ?? "";
  if (!normalized) return null;

  const digits = normalized.replace(/\D/g, "");
  const phoneNumber =
    digits.length === 10
      ? `+1${digits}`
      : digits.length === 11 && digits.startsWith("1")
        ? `+${digits}`
        : normalized.startsWith("+")
          ? `+${digits}`
          : "";

  if (!/^\+[1-9]\d{7,14}$/.test(phoneNumber)) {
    throw new Error("Phone number must be a valid mobile number, such as 612 342 5656 or +16123425656.");
  }

  return phoneNumber;
}

export async function createServiceIntakeCustomer(actor: AuthenticatedUser | null, value: CustomerInput) {
  const user = assertAuthenticatedUser(actor);
  const organizationId = INITIAL_ORGANIZATION.id;
  const locationId = text(value?.locationId, "Location", 100, true)!;
  const displayName = text(value?.displayName, "Customer name", 200, true)!;
  const phoneNumber = text(value?.phoneNumber, "Phone number", 50);
  const email = text(value?.email, "Email", 200)?.toLocaleLowerCase() ?? null;
  const address = text(value?.address, "Address", 500);
  const dateOfBirth = dateOnly(value?.dateOfBirth, "Date of birth");
  const identityGender = text(value?.gender, "Gender", 40);
  const idNumber = text(value?.idNumber, "ID number", 80);
  const idState = text(value?.idState, "ID state", 20)?.toUpperCase() ?? null;
  const idType = text(value?.idType, "ID type", 80);
  const preferredContactMethod = text(value?.preferredContactMethod, "Preferred contact method", 30) ?? "PHONE";
  const ssn = text(value?.ssn, "SSN / ITIN", 20);
  if (!phoneNumber && !email) throw new Error("A phone number or email is required.");

  const grants = await createEnterpriseCommandRepository().listCapabilityGrants(user.id, organizationId);
  assertVehicleCapability({ actor: user, capability: "CUSTOMER_INTAKE_CREATE", grants, locationId, now: new Date() });

  const normalizedPhone = normalizeServiceIntakePhoneNumber(phoneNumber);
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
        phoneNumber: normalizedPhone,
        email,
        address,
        dateOfBirth,
        identityGender,
        ssnLast4: last4(ssn),
        idType,
        idState,
        idLast4: last4(idNumber),
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
