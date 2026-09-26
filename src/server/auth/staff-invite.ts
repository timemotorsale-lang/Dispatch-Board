import { createHash, randomBytes } from "node:crypto";

import { Prisma } from "@prisma/client";

import { INITIAL_ORGANIZATION } from "@/server/appointments/location-foundation";
import { prisma } from "@/server/db/client";
import { canManageUsers } from "@/server/policies/access";

import { hashPassword } from "./password";
import { validateStaffPassword } from "./password-policy";
import { normalizeEmail } from "./service";
import type { AuthenticatedUser } from "./store";

const INVITE_TOKEN_BYTES = 32;
const INVITE_EXPIRY_HOURS = 72;

export type StaffInviteStatus = "PENDING" | "ACCEPTED" | "EXPIRED" | "REVOKED";

type StaffInviteRow = {
  id: string;
  email: string;
  name: string;
  roleNames: unknown;
  workspaceKey: string | null;
  status: string;
  expiresAt: Date;
  invitedByUserId: string | null;
  acceptedByUserId: string | null;
  usedAt: Date | null;
  revokedAt: Date | null;
  createdAt: Date;
  updatedAt: Date;
};

export type StaffInvitePreview = {
  acceptedByUserId: string | null;
  createdAt: string;
  email: string;
  expiresAt: string;
  id: string;
  invitedByUserId: string | null;
  name: string;
  roleNames: string[];
  status: StaffInviteStatus;
  updatedAt: string;
  workspaceKey: string | null;
};

function hashInviteToken(token: string) {
  return createHash("sha256").update(token).digest("hex");
}

function createInviteToken() {
  return randomBytes(INVITE_TOKEN_BYTES).toString("hex");
}

function roleNamesFrom(value: unknown) {
  return Array.isArray(value)
    ? value.filter((item): item is string => typeof item === "string" && item.trim().length > 0).map((item) => item.trim())
    : [];
}

function statusFor(row: StaffInviteRow, now = new Date()): StaffInviteStatus {
  if (row.status === "ACCEPTED" || row.usedAt) return "ACCEPTED";
  if (row.status === "REVOKED" || row.revokedAt) return "REVOKED";
  if (row.expiresAt <= now) return "EXPIRED";
  return "PENDING";
}

function preview(row: StaffInviteRow, now = new Date()): StaffInvitePreview {
  return {
    acceptedByUserId: row.acceptedByUserId,
    createdAt: row.createdAt.toISOString(),
    email: row.email,
    expiresAt: row.expiresAt.toISOString(),
    id: row.id,
    invitedByUserId: row.invitedByUserId,
    name: row.name,
    roleNames: roleNamesFrom(row.roleNames),
    status: statusFor(row, now),
    updatedAt: row.updatedAt.toISOString(),
    workspaceKey: row.workspaceKey
  };
}

function requireInviteToken(token: unknown) {
  if (typeof token !== "string" || token.trim().length < 32 || token.includes("\\")) {
    throw new Error("Invite link is invalid.");
  }
  return token.trim();
}

function requireText(value: unknown, label: string, maxLength: number) {
  if (typeof value !== "string") throw new Error(`${label} is required.`);
  const normalized = value.trim();
  if (!normalized) throw new Error(`${label} is required.`);
  return normalized.slice(0, maxLength);
}

function requireInviteId(value: unknown) {
  if (typeof value !== "string" || !value.trim() || value.includes("\\") || value.includes("/")) {
    throw new Error("Invite id is required.");
  }
  return value.trim();
}

function assertInviteManager(actor: AuthenticatedUser | null) {
  if (!canManageUsers(actor)) {
    throw new Error("Only an authorized manager can manage staff invites.");
  }
  if (!actor) {
    throw new Error("Only an authorized manager can manage staff invites.");
  }
  return actor;
}

function staffInviteSelectSql() {
  return Prisma.sql`
    SELECT
      "id",
      "email",
      "name",
      "roleNames",
      "workspaceKey",
      "status",
      "expiresAt",
      "invitedByUserId",
      "acceptedByUserId",
      "usedAt",
      "revokedAt",
      "createdAt",
      "updatedAt"
    FROM "StaffInvite"
  `;
}

async function findInviteByToken(token: string) {
  const rows = await prisma.$queryRaw<StaffInviteRow[]>(Prisma.sql`
    ${staffInviteSelectSql()}
    WHERE "tokenHash" = ${hashInviteToken(token)}
    LIMIT 1
  `);
  return rows[0] ?? null;
}

async function findInviteById(inviteIdInput: unknown) {
  const inviteId = requireInviteId(inviteIdInput);
  const rows = await prisma.$queryRaw<StaffInviteRow[]>(Prisma.sql`
    ${staffInviteSelectSql()}
    WHERE "id" = ${inviteId}
    LIMIT 1
  `);
  return rows[0] ?? null;
}

export async function getStaffInvitePreview(tokenInput: unknown, now = new Date()) {
  const token = requireInviteToken(tokenInput);
  const row = await findInviteByToken(token);
  return row ? preview(row, now) : null;
}

export async function listStaffInvites(actor: AuthenticatedUser | null, now = new Date()) {
  assertInviteManager(actor);
  const rows = await prisma.$queryRaw<StaffInviteRow[]>(Prisma.sql`
    ${staffInviteSelectSql()}
    ORDER BY "createdAt" DESC
    LIMIT 50
  `);

  return rows.map((row) => preview(row, now));
}

export async function createStaffInvite(
  actor: AuthenticatedUser | null,
  input: unknown,
  now = new Date()
) {
  const manager = assertInviteManager(actor);
  if (!input || typeof input !== "object" || Array.isArray(input)) {
    throw new Error("Invite details are required.");
  }
  const candidate = input as Record<string, unknown>;
  const email = normalizeEmail(requireText(candidate.email, "Email", 180));
  const name = requireText(candidate.name, "Name", 120);
  const roleNames = roleNamesFrom(candidate.roleNames);
  if (roleNames.length === 0) throw new Error("At least one role is required.");
  const workspaceKey = typeof candidate.workspaceKey === "string" && candidate.workspaceKey.trim()
    ? candidate.workspaceKey.trim().slice(0, 80)
    : null;
  const token = createInviteToken();
  const expiresAt = new Date(now.getTime() + INVITE_EXPIRY_HOURS * 60 * 60 * 1000);
  const rows = await prisma.$queryRaw<StaffInviteRow[]>(Prisma.sql`
    INSERT INTO "StaffInvite" (
      "id",
      "email",
      "name",
      "roleNames",
      "workspaceKey",
      "tokenHash",
      "status",
      "expiresAt",
      "invitedByUserId",
      "updatedAt"
    )
    VALUES (
      ${`staff-invite-${randomBytes(12).toString("hex")}`},
      ${email},
      ${name},
      ${JSON.stringify(roleNames)}::jsonb,
      ${workspaceKey},
      ${hashInviteToken(token)},
      'PENDING',
      ${expiresAt},
      ${manager.id},
      ${now}
    )
    RETURNING
      "id",
      "email",
      "name",
      "roleNames",
      "workspaceKey",
      "status",
      "expiresAt",
      "invitedByUserId",
      "acceptedByUserId",
      "usedAt",
      "revokedAt",
      "createdAt",
      "updatedAt"
  `);
  const row = rows[0];

  await prisma.enterpriseAuditEvent.create({
    data: {
      organizationId: INITIAL_ORGANIZATION.id,
      actorUserId: manager.id,
      domain: "TEAM_SECURITY",
      subjectType: "STAFF_INVITE",
      subjectId: row.id,
      eventType: "STAFF_INVITE_CREATED",
      reason: `Staff invite created for ${email}.`,
      metadata: { email, roleNames, workspaceKey },
      correlationId: `team-security:staff_invite_created:${row.id}:${Date.now()}`
    }
  });

  return {
    invite: preview(row, now),
    inviteUrl: `/login/invite?token=${encodeURIComponent(token)}`,
    token
  };
}

export async function revokeStaffInvite(
  actor: AuthenticatedUser | null,
  inviteIdInput: unknown,
  now = new Date()
) {
  const manager = assertInviteManager(actor);
  const invite = await findInviteById(inviteIdInput);
  if (!invite) throw new Error("Staff invite not found.");

  const currentStatus = statusFor(invite, now);
  if (currentStatus === "ACCEPTED") throw new Error("Accepted invites cannot be revoked.");

  const rows = await prisma.$queryRaw<StaffInviteRow[]>(Prisma.sql`
    UPDATE "StaffInvite"
    SET "status" = 'REVOKED',
        "revokedAt" = ${now},
        "updatedAt" = ${now}
    WHERE "id" = ${invite.id}
    RETURNING
      "id",
      "email",
      "name",
      "roleNames",
      "workspaceKey",
      "status",
      "expiresAt",
      "invitedByUserId",
      "acceptedByUserId",
      "usedAt",
      "revokedAt",
      "createdAt",
      "updatedAt"
  `);
  const row = rows[0];

  await prisma.enterpriseAuditEvent.create({
    data: {
      organizationId: INITIAL_ORGANIZATION.id,
      actorUserId: manager.id,
      domain: "TEAM_SECURITY",
      subjectType: "STAFF_INVITE",
      subjectId: row.id,
      eventType: "STAFF_INVITE_REVOKED",
      reason: `Staff invite revoked for ${row.email}.`,
      metadata: { email: row.email, previousStatus: currentStatus },
      correlationId: `team-security:staff_invite_revoked:${row.id}:${Date.now()}`
    }
  });

  return { invite: preview(row, now) };
}

export async function resendStaffInvite(
  actor: AuthenticatedUser | null,
  inviteIdInput: unknown,
  now = new Date()
) {
  const manager = assertInviteManager(actor);
  const invite = await findInviteById(inviteIdInput);
  if (!invite) throw new Error("Staff invite not found.");

  const currentStatus = statusFor(invite, now);
  if (currentStatus === "ACCEPTED") throw new Error("Accepted invites cannot be resent.");

  const token = createInviteToken();
  const expiresAt = new Date(now.getTime() + INVITE_EXPIRY_HOURS * 60 * 60 * 1000);
  const rows = await prisma.$queryRaw<StaffInviteRow[]>(Prisma.sql`
    UPDATE "StaffInvite"
    SET "tokenHash" = ${hashInviteToken(token)},
        "status" = 'PENDING',
        "expiresAt" = ${expiresAt},
        "acceptedByUserId" = NULL,
        "usedAt" = NULL,
        "revokedAt" = NULL,
        "updatedAt" = ${now}
    WHERE "id" = ${invite.id}
    RETURNING
      "id",
      "email",
      "name",
      "roleNames",
      "workspaceKey",
      "status",
      "expiresAt",
      "invitedByUserId",
      "acceptedByUserId",
      "usedAt",
      "revokedAt",
      "createdAt",
      "updatedAt"
  `);
  const row = rows[0];

  await prisma.enterpriseAuditEvent.create({
    data: {
      organizationId: INITIAL_ORGANIZATION.id,
      actorUserId: manager.id,
      domain: "TEAM_SECURITY",
      subjectType: "STAFF_INVITE",
      subjectId: row.id,
      eventType: "STAFF_INVITE_RESENT",
      reason: `Staff invite resent for ${row.email}.`,
      metadata: { email: row.email, previousStatus: currentStatus },
      correlationId: `team-security:staff_invite_resent:${row.id}:${Date.now()}`
    }
  });

  return {
    invite: preview(row, now),
    inviteUrl: `/login/invite?token=${encodeURIComponent(token)}`,
    token
  };
}

export async function acceptStaffInvite(input: unknown, now = new Date()) {
  if (!input || typeof input !== "object" || Array.isArray(input)) {
    throw new Error("Invite token and password are required.");
  }
  const candidate = input as Record<string, unknown>;
  const token = requireInviteToken(candidate.token);
  const password = requireText(candidate.password, "Password", 500);
  validateStaffPassword(password);

  const invite = await findInviteByToken(token);
  if (!invite) throw new Error("Invite link is invalid.");

  const currentStatus = statusFor(invite, now);
  if (currentStatus === "ACCEPTED") throw new Error("This invite has already been used.");
  if (currentStatus === "REVOKED") throw new Error("This invite was revoked.");
  if (currentStatus === "EXPIRED") throw new Error("This invite has expired. Ask a manager to resend it.");

  const existingUser = await prisma.user.findUnique({ where: { email: invite.email } });
  if (existingUser) {
    throw new Error("A staff account already exists for this email. Use sign in or ask a manager for help.");
  }

  const roleNames = roleNamesFrom(invite.roleNames);
  if (roleNames.length === 0) throw new Error("This invite has no role assignment. Ask a manager to resend it.");

  const roles = await prisma.role.findMany({ where: { name: { in: roleNames } } });
  if (roles.length === 0) throw new Error("This invite has no active role assignment. Ask a manager to resend it.");

  const passwordHash = await hashPassword(password);
  const user = await prisma.$transaction(async (tx) => {
    const created = await tx.user.create({
      data: {
        email: invite.email,
        isActive: true,
        mustChangePassword: false,
        name: invite.name,
        passwordChangedAt: now,
        passwordHash
      }
    });
    await tx.userRole.createMany({
      data: roles.map((role) => ({ roleId: role.id, userId: created.id })),
      skipDuplicates: true
    });
    await tx.$executeRaw`
      UPDATE "StaffInvite"
      SET "status" = 'ACCEPTED',
          "acceptedByUserId" = ${created.id},
          "usedAt" = ${now},
          "updatedAt" = ${now}
      WHERE "id" = ${invite.id}
    `;
    await tx.enterpriseAuditEvent.create({
      data: {
        organizationId: INITIAL_ORGANIZATION.id,
        actorUserId: created.id,
        domain: "TEAM_SECURITY",
        subjectType: "USER",
        subjectId: created.id,
        eventType: "STAFF_INVITE_ACCEPTED",
        reason: "Staff invite accepted and password created.",
        metadata: { inviteId: invite.id, roleNames },
        correlationId: `team-security:staff_invite_accepted:${created.id}:${Date.now()}`
      }
    });
    return created;
  });

  return {
    ok: true,
    user: {
      email: user.email,
      id: user.id,
      name: user.name
    }
  };
}
