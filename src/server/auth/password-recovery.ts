import { createHash, randomBytes } from "node:crypto";

import { Prisma } from "@prisma/client";

import { INITIAL_ORGANIZATION } from "@/server/appointments/location-foundation";
import { prisma } from "@/server/db/client";
import { canManageUsers } from "@/server/policies/access";

import { hashPassword } from "./password";
import { validateStaffPassword } from "./password-policy";
import { normalizeEmail } from "./service";
import type { AuthenticatedUser } from "./store";

const RESET_TOKEN_BYTES = 32;
const RESET_EXPIRY_HOURS = 2;
const NEUTRAL_RECOVERY_MESSAGE =
  "If that email belongs to an active staff account, a manager can issue a secure reset link.";

export type PasswordResetStatus = "REQUESTED" | "APPROVED" | "COMPLETED" | "EXPIRED" | "REVOKED";

type PasswordResetRow = {
  id: string;
  email: string;
  userId: string | null;
  tokenHash: string | null;
  status: string;
  requestedAt: Date;
  approvedByUserId: string | null;
  approvedAt: Date | null;
  expiresAt: Date | null;
  usedAt: Date | null;
  revokedAt: Date | null;
  createdAt: Date;
  updatedAt: Date;
  userName: string | null;
  userIsActive: boolean | null;
};

export type PasswordResetPreview = {
  approvedAt: string | null;
  approvedByUserId: string | null;
  createdAt: string;
  email: string;
  expiresAt: string | null;
  id: string;
  requestedAt: string;
  status: PasswordResetStatus;
  updatedAt: string;
  usedAt: string | null;
  userId: string | null;
  userIsActive: boolean | null;
  userName: string | null;
};

function hashResetToken(token: string) {
  return createHash("sha256").update(token).digest("hex");
}

function createResetToken() {
  return randomBytes(RESET_TOKEN_BYTES).toString("hex");
}

function statusFor(row: PasswordResetRow, now = new Date()): PasswordResetStatus {
  if (row.status === "COMPLETED" || row.usedAt) return "COMPLETED";
  if (row.status === "REVOKED" || row.revokedAt) return "REVOKED";
  if (row.expiresAt && row.expiresAt <= now) return "EXPIRED";
  if (row.status === "APPROVED") return "APPROVED";
  return "REQUESTED";
}

function preview(row: PasswordResetRow, now = new Date()): PasswordResetPreview {
  return {
    approvedAt: row.approvedAt?.toISOString() ?? null,
    approvedByUserId: row.approvedByUserId,
    createdAt: row.createdAt.toISOString(),
    email: row.email,
    expiresAt: row.expiresAt?.toISOString() ?? null,
    id: row.id,
    requestedAt: row.requestedAt.toISOString(),
    status: statusFor(row, now),
    updatedAt: row.updatedAt.toISOString(),
    usedAt: row.usedAt?.toISOString() ?? null,
    userId: row.userId,
    userIsActive: row.userIsActive,
    userName: row.userName
  };
}

function selectResetSql() {
  return Prisma.sql`
    SELECT
      r."id",
      r."email",
      r."userId",
      r."tokenHash",
      r."status",
      r."requestedAt",
      r."approvedByUserId",
      r."approvedAt",
      r."expiresAt",
      r."usedAt",
      r."revokedAt",
      r."createdAt",
      r."updatedAt",
      u."name" AS "userName",
      u."isActive" AS "userIsActive"
    FROM "PasswordResetRequest" r
    LEFT JOIN "User" u ON u."id" = r."userId"
  `;
}

function assertRecoveryManager(actor: AuthenticatedUser | null) {
  if (!canManageUsers(actor)) {
    throw new Error("Only an authorized manager can manage password recovery.");
  }
  if (!actor) {
    throw new Error("Only an authorized manager can manage password recovery.");
  }
  return actor;
}

function requireResetId(value: unknown) {
  if (typeof value !== "string" || !value.trim() || value.includes("\\") || value.includes("/")) {
    throw new Error("Password recovery request id is required.");
  }
  return value.trim();
}

function requireResetToken(value: unknown) {
  if (typeof value !== "string" || value.trim().length < 32 || value.includes("\\")) {
    throw new Error("Password reset link is invalid.");
  }
  return value.trim();
}

function requirePassword(value: unknown) {
  if (typeof value !== "string" || !value.trim()) {
    throw new Error("New password is required.");
  }
  const password = value.trim();
  validateStaffPassword(password);
  return password;
}

async function findResetById(idInput: unknown) {
  const id = requireResetId(idInput);
  const rows = await prisma.$queryRaw<PasswordResetRow[]>(Prisma.sql`
    ${selectResetSql()}
    WHERE r."id" = ${id}
    LIMIT 1
  `);
  return rows[0] ?? null;
}

async function findResetByToken(tokenInput: unknown) {
  const token = requireResetToken(tokenInput);
  const rows = await prisma.$queryRaw<PasswordResetRow[]>(Prisma.sql`
    ${selectResetSql()}
    WHERE r."tokenHash" = ${hashResetToken(token)}
    LIMIT 1
  `);
  return rows[0] ?? null;
}

export async function requestPasswordRecovery(input: unknown, now = new Date()) {
  const email = input && typeof input === "object" && !Array.isArray(input) && typeof (input as { email?: unknown }).email === "string"
    ? normalizeEmail((input as { email: string }).email)
    : "";

  if (email) {
    const user = await prisma.user.findUnique({ where: { email }, select: { id: true, isActive: true } });
    await prisma.$executeRaw`
      INSERT INTO "PasswordResetRequest" (
        "id",
        "email",
        "userId",
        "status",
        "requestedAt",
        "updatedAt"
      )
      VALUES (
        ${`password-reset-${randomBytes(12).toString("hex")}`},
        ${email},
        ${user?.id ?? null},
        'REQUESTED',
        ${now},
        ${now}
      )
    `;
  }

  return { ok: true, message: NEUTRAL_RECOVERY_MESSAGE };
}

export async function listPasswordRecoveryRequests(actor: AuthenticatedUser | null, now = new Date()) {
  assertRecoveryManager(actor);
  const rows = await prisma.$queryRaw<PasswordResetRow[]>(Prisma.sql`
    ${selectResetSql()}
    ORDER BY r."createdAt" DESC
    LIMIT 50
  `);
  return rows.map((row) => preview(row, now));
}

export async function issuePasswordResetLink(
  actor: AuthenticatedUser | null,
  requestIdInput: unknown,
  now = new Date()
) {
  const manager = assertRecoveryManager(actor);
  const request = await findResetById(requestIdInput);
  if (!request) throw new Error("Password recovery request not found.");
  if (!request.userId) throw new Error("No staff account matches this recovery request.");
  if (!request.userIsActive) throw new Error("Inactive accounts cannot receive password reset links.");
  if (statusFor(request, now) === "COMPLETED") throw new Error("Completed requests cannot be reissued.");

  const token = createResetToken();
  const expiresAt = new Date(now.getTime() + RESET_EXPIRY_HOURS * 60 * 60 * 1000);
  const rows = await prisma.$queryRaw<PasswordResetRow[]>(Prisma.sql`
    UPDATE "PasswordResetRequest"
    SET "tokenHash" = ${hashResetToken(token)},
        "status" = 'APPROVED',
        "approvedByUserId" = ${manager.id},
        "approvedAt" = ${now},
        "expiresAt" = ${expiresAt},
        "usedAt" = NULL,
        "revokedAt" = NULL,
        "updatedAt" = ${now}
    WHERE "id" = ${request.id}
    RETURNING
      "id",
      "email",
      "userId",
      "tokenHash",
      "status",
      "requestedAt",
      "approvedByUserId",
      "approvedAt",
      "expiresAt",
      "usedAt",
      "revokedAt",
      "createdAt",
      "updatedAt",
      NULL::TEXT AS "userName",
      NULL::BOOLEAN AS "userIsActive"
  `);
  const row = { ...rows[0], userName: request.userName, userIsActive: request.userIsActive };

  await prisma.enterpriseAuditEvent.create({
    data: {
      organizationId: INITIAL_ORGANIZATION.id,
      actorUserId: manager.id,
      domain: "TEAM_SECURITY",
      subjectType: "PASSWORD_RESET_REQUEST",
      subjectId: row.id,
      eventType: "PASSWORD_RESET_APPROVED",
      reason: `Manager issued a password reset link for ${row.email}.`,
      metadata: { email: row.email, userId: row.userId },
      correlationId: `team-security:password_reset_approved:${row.id}:${Date.now()}`
    }
  });

  return {
    reset: preview(row, now),
    resetUrl: `/login/reset-password?token=${encodeURIComponent(token)}`,
    token
  };
}

export async function revokePasswordRecovery(
  actor: AuthenticatedUser | null,
  requestIdInput: unknown,
  now = new Date()
) {
  const manager = assertRecoveryManager(actor);
  const request = await findResetById(requestIdInput);
  if (!request) throw new Error("Password recovery request not found.");
  if (statusFor(request, now) === "COMPLETED") throw new Error("Completed requests cannot be revoked.");

  const rows = await prisma.$queryRaw<PasswordResetRow[]>(Prisma.sql`
    UPDATE "PasswordResetRequest"
    SET "status" = 'REVOKED',
        "tokenHash" = NULL,
        "revokedAt" = ${now},
        "updatedAt" = ${now}
    WHERE "id" = ${request.id}
    RETURNING
      "id",
      "email",
      "userId",
      "tokenHash",
      "status",
      "requestedAt",
      "approvedByUserId",
      "approvedAt",
      "expiresAt",
      "usedAt",
      "revokedAt",
      "createdAt",
      "updatedAt",
      NULL::TEXT AS "userName",
      NULL::BOOLEAN AS "userIsActive"
  `);
  const row = { ...rows[0], userName: request.userName, userIsActive: request.userIsActive };

  await prisma.enterpriseAuditEvent.create({
    data: {
      organizationId: INITIAL_ORGANIZATION.id,
      actorUserId: manager.id,
      domain: "TEAM_SECURITY",
      subjectType: "PASSWORD_RESET_REQUEST",
      subjectId: row.id,
      eventType: "PASSWORD_RESET_REVOKED",
      reason: `Manager revoked a password recovery request for ${row.email}.`,
      metadata: { email: row.email, userId: row.userId },
      correlationId: `team-security:password_reset_revoked:${row.id}:${Date.now()}`
    }
  });

  return { reset: preview(row, now) };
}

export async function getPasswordResetPreview(tokenInput: unknown, now = new Date()) {
  const row = await findResetByToken(tokenInput);
  return row ? preview(row, now) : null;
}

export async function completePasswordReset(input: unknown, now = new Date()) {
  if (!input || typeof input !== "object" || Array.isArray(input)) {
    throw new Error("Password reset token and new password are required.");
  }

  const candidate = input as Record<string, unknown>;
  const token = requireResetToken(candidate.token);
  const newPassword = requirePassword(candidate.password);
  const request = await findResetByToken(token);

  if (!request) throw new Error("Password reset link is invalid.");
  const currentStatus = statusFor(request, now);
  if (currentStatus === "COMPLETED") throw new Error("This password reset link has already been used.");
  if (currentStatus === "REVOKED") throw new Error("This password reset link was revoked.");
  if (currentStatus === "EXPIRED") throw new Error("This password reset link has expired.");
  if (!request.userId) throw new Error("Password reset link is not tied to a staff account.");

  const userId = request.userId;
  const passwordHash = await hashPassword(newPassword);
  await prisma.$transaction(async (tx) => {
    await tx.user.update({
      where: { id: userId },
      data: {
        failedLoginCount: 0,
        lockedUntil: null,
        mustChangePassword: false,
        passwordChangedAt: now,
        passwordHash
      }
    });
    await tx.session.deleteMany({ where: { userId } });
    await tx.$executeRaw`
      UPDATE "PasswordResetRequest"
      SET "status" = 'COMPLETED',
          "tokenHash" = NULL,
          "usedAt" = ${now},
          "updatedAt" = ${now}
      WHERE "id" = ${request.id}
    `;
    await tx.enterpriseAuditEvent.create({
      data: {
        organizationId: INITIAL_ORGANIZATION.id,
        actorUserId: userId,
        domain: "TEAM_SECURITY",
        subjectType: "USER",
        subjectId: userId,
        eventType: "PASSWORD_RESET_COMPLETED",
        reason: "Staff password was reset using a manager-issued one-use link.",
        metadata: { resetRequestId: request.id, email: request.email },
        correlationId: `team-security:password_reset_completed:${userId}:${Date.now()}`
      }
    });
  });

  return { ok: true, email: request.email };
}
