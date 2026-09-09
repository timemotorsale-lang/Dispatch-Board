import { type Prisma } from "@prisma/client";

import { INITIAL_ORGANIZATION } from "@/server/appointments/location-foundation";
import type { AuthenticatedUser } from "@/server/auth/store";
import { prisma } from "@/server/db/client";

import { buildGrowthAdvertisingReviewModel } from "./advertising-activation";
import { buildGrowthAutomationActivationReviewModel } from "./automation-activation";
import { canOpenGrowthAdmin, growthRoleForUser } from "./operational-service";
import { buildGrowthPolicyReviewModel } from "./policy";
import { buildGrowthProviderPilotReviewModel } from "./provider-pilot";

const GROWTH_CORE_POLICY_CODE = "GROWTH_CORE";

type GrowthPolicyVersionRecord = {
  activatedAt: Date | null;
  id: string;
  settings: Prisma.JsonValue;
  status: string;
  version: number;
};

type GrowthPolicyAuditEventRecord = {
  actorRole: string;
  eventType: string;
  occurredAt: Date;
  reason: string;
};

type GrowthPolicyDatabase = {
  $transaction<T>(callback: (tx: GrowthPolicyDatabase) => Promise<T>): Promise<T>;
  growthPolicyAuditEvent: {
    create(args: unknown): Promise<GrowthPolicyAuditEventRecord>;
    findMany(args: unknown): Promise<GrowthPolicyAuditEventRecord[]>;
  };
  growthPolicyVersion: {
    create(args: unknown): Promise<GrowthPolicyVersionRecord>;
    findFirst(args: unknown): Promise<GrowthPolicyVersionRecord | null>;
  };
};

export type GrowthPolicyControlState = "Locked" | "Review needed" | "Ready";

export type GrowthPolicyControl = {
  area: string;
  evidence: string;
  nextAction: string;
  owner: string;
  state: GrowthPolicyControlState;
};

export type GrowthBudgetPolicy = {
  approvalRequired: string;
  channel: string;
  currentLimit: string;
  state: GrowthPolicyControlState;
};

export type GrowthPolicyControlCenterModel = {
  auditEvents: GrowthPolicyAuditEventModel[];
  budgetPolicies: GrowthBudgetPolicy[];
  controls: GrowthPolicyControl[];
  generatedAt: string;
  launchPosture: "Locked by default";
  policyVersion: {
    activatedAt: string | null;
    id: string | null;
    source: "Default review model" | "Durable policy settings";
    status: string;
    version: number;
  };
  summary: {
    locked: number;
    ready: number;
    reviewNeeded: number;
    total: number;
  };
};

export type GrowthPolicyAuditEventModel = {
  actorRole: string;
  eventType: string;
  occurredAt: string;
  reason: string;
};

type GrowthPolicySettingsSnapshot = {
  budgetPolicies: GrowthBudgetPolicy[];
  controls: GrowthPolicyControl[];
  launchPosture: "Locked by default";
};

function jsonObject(value: Record<string, unknown>): Prisma.InputJsonValue {
  return value as Prisma.InputJsonObject;
}

function assertPolicyUser(user: AuthenticatedUser | null | undefined): AuthenticatedUser {
  if (!user) throw new Error("Authentication required.");
  if (!user.isActive) throw new Error("Active user is required.");
  return user;
}

function assertCanOpenGrowthPolicy(user: AuthenticatedUser) {
  const role = growthRoleForUser(user);
  if (!canOpenGrowthAdmin(role)) {
    throw new Error("Growth policy review requires manager access.");
  }
  return role;
}

function buildDefaultPolicySettings(): GrowthPolicySettingsSnapshot {
  const launchPolicy = buildGrowthPolicyReviewModel();
  const advertising = buildGrowthAdvertisingReviewModel();
  const automation = buildGrowthAutomationActivationReviewModel();
  const provider = buildGrowthProviderPilotReviewModel();
  const controls: GrowthPolicyControl[] = [
    {
      area: "Live customer sends",
      evidence: "Customer messaging remains unavailable until consent, quiet-window, message approval, and provider gates pass.",
      nextAction: "Keep live send locked",
      owner: "GM/Admin",
      state: "Locked"
    },
    {
      area: "Paid advertising spend",
      evidence: advertising.summary,
      nextAction: advertising.nextAction,
      owner: "GM/Admin",
      state: advertising.canActivatePaidSpend ? "Ready" : "Locked"
    },
    {
      area: "CRM and source record mutation",
      evidence: "Growth may prepare campaign work and writeback previews, but CRM, inventory, sales, service, appointment, and task source records stay protected.",
      nextAction: "Review writeback previews only",
      owner: "GM/Admin",
      state: "Locked"
    },
    {
      area: "Provider activation",
      evidence: provider.health.summary,
      nextAction: "Use internal task pilot before external provider activation",
      owner: "Marketing Manager",
      state: provider.health.state === "Ready" ? "Review needed" : "Locked"
    },
    {
      area: "Offer and claim verification",
      evidence: launchPolicy.checks.find((check) => check.label === "Offer and claims verified")?.action ?? "Manager source review is required.",
      nextAction: "Send offer language to source-owner review",
      owner: "Business owner",
      state: "Review needed"
    },
    {
      area: "Consent and opt-out",
      evidence: launchPolicy.checks.find((check) => check.label === "Consent and opt-out clear")?.action ?? "Consent must be readable from CRM.",
      nextAction: "Open CRM consent review",
      owner: "Sales Manager",
      state: "Ready"
    },
    {
      area: "Quiet hours and frequency caps",
      evidence: "Growth must respect approved contact windows and prevent over-contacting the same customer.",
      nextAction: "Keep caps visible before any launch",
      owner: "Marketing Manager",
      state: "Review needed"
    },
    {
      area: "Automation",
      evidence: automation.summary,
      nextAction: automation.nextAction,
      owner: "Marketing Manager",
      state: automation.canActivateAutomation ? "Review needed" : "Locked"
    }
  ];
  return {
    budgetPolicies: [
      { approvalRequired: "GM/Admin approval", channel: "Paid ads", currentLimit: "$0 live spend", state: "Locked" },
      { approvalRequired: "Manager review", channel: "Social", currentLimit: "$0 live spend", state: "Locked" },
      { approvalRequired: "Message approval", channel: "Email", currentLimit: "Internal review only", state: "Review needed" },
      { approvalRequired: "Message approval", channel: "SMS", currentLimit: "Internal review only", state: "Review needed" },
      { approvalRequired: "Business owner review", channel: "Internal task", currentLimit: "$0 spend", state: "Ready" }
    ],
    controls,
    launchPosture: "Locked by default"
  };
}

function summarizeControls(controls: GrowthPolicyControl[]) {
  return {
    locked: controls.filter((control) => control.state === "Locked").length,
    ready: controls.filter((control) => control.state === "Ready").length,
    reviewNeeded: controls.filter((control) => control.state === "Review needed").length,
    total: controls.length
  };
}

function coerceState(value: unknown): GrowthPolicyControlState | null {
  return value === "Locked" || value === "Review needed" || value === "Ready" ? value : null;
}

function readString(value: unknown, fallback: string) {
  return typeof value === "string" && value.trim() ? value : fallback;
}

function readPolicySettings(value: Prisma.JsonValue | null | undefined, fallback: GrowthPolicySettingsSnapshot) {
  if (!value || typeof value !== "object" || Array.isArray(value)) return fallback;
  const raw = value as Record<string, unknown>;
  const controls = Array.isArray(raw.controls)
    ? raw.controls.map((control, index): GrowthPolicyControl => {
        const record = control && typeof control === "object" && !Array.isArray(control) ? (control as Record<string, unknown>) : {};
        return {
          area: readString(record.area, fallback.controls[index]?.area ?? "Policy control"),
          evidence: readString(record.evidence, fallback.controls[index]?.evidence ?? "Manager review is required."),
          nextAction: readString(record.nextAction, fallback.controls[index]?.nextAction ?? "Review before activation"),
          owner: readString(record.owner, fallback.controls[index]?.owner ?? "GM/Admin"),
          state: coerceState(record.state) ?? fallback.controls[index]?.state ?? "Locked"
        };
      })
    : fallback.controls;
  const budgetPolicies = Array.isArray(raw.budgetPolicies)
    ? raw.budgetPolicies.map((policy, index): GrowthBudgetPolicy => {
        const record = policy && typeof policy === "object" && !Array.isArray(policy) ? (policy as Record<string, unknown>) : {};
        return {
          approvalRequired: readString(record.approvalRequired, fallback.budgetPolicies[index]?.approvalRequired ?? "Manager review"),
          channel: readString(record.channel, fallback.budgetPolicies[index]?.channel ?? "Growth channel"),
          currentLimit: readString(record.currentLimit, fallback.budgetPolicies[index]?.currentLimit ?? "Locked"),
          state: coerceState(record.state) ?? fallback.budgetPolicies[index]?.state ?? "Locked"
        };
      })
    : fallback.budgetPolicies;

  return {
    budgetPolicies,
    controls,
    launchPosture: "Locked by default" as const
  };
}

export function buildGrowthPolicyControlCenterModel(now = new Date()): GrowthPolicyControlCenterModel {
  const settings = buildDefaultPolicySettings();

  return {
    auditEvents: [],
    budgetPolicies: settings.budgetPolicies,
    controls: settings.controls,
    generatedAt: now.toISOString(),
    launchPosture: settings.launchPosture,
    policyVersion: {
      activatedAt: null,
      id: null,
      source: "Default review model",
      status: "MODEL_ONLY",
      version: 0
    },
    summary: summarizeControls(settings.controls)
  };
}

async function createInitialPolicyVersion(input: {
  actorRole: string;
  database: GrowthPolicyDatabase;
  now: Date;
  organizationId: string;
  user: AuthenticatedUser;
}) {
  const fallback = buildDefaultPolicySettings();
  const settings = jsonObject(fallback);
  const idempotencyKey = `${GROWTH_CORE_POLICY_CODE}:bootstrap:v1`;

  return input.database.$transaction(async (tx) => {
    const existing = await tx.growthPolicyVersion.findFirst({
      where: { organizationId: input.organizationId, policyCode: GROWTH_CORE_POLICY_CODE, status: "ACTIVE" },
      orderBy: { version: "desc" }
    });
    if (existing) return existing;

    const policyVersion = await tx.growthPolicyVersion.create({
      data: {
        activatedAt: input.now,
        activatedByUserId: input.user.id,
        createdByUserId: input.user.id,
        createdReason: "Initial Growth policy controls adopted as locked-by-default operating settings.",
        launchPosture: fallback.launchPosture,
        organizationId: input.organizationId,
        policyCode: GROWTH_CORE_POLICY_CODE,
        settings,
        status: "ACTIVE",
        version: 1
      }
    });

    await tx.growthPolicyAuditEvent.create({
      data: {
        actorRole: input.actorRole,
        actorUserId: input.user.id,
        eventType: "POLICY_BOOTSTRAPPED",
        idempotencyKey,
        organizationId: input.organizationId,
        policyVersionId: policyVersion.id,
        reason: "Created durable Growth policy baseline from the approved locked-by-default control center.",
        snapshot: settings
      }
    });

    return policyVersion;
  });
}

export async function getGrowthPolicyControlCenter(
  user: AuthenticatedUser | null,
  input: { database?: GrowthPolicyDatabase; now?: Date; organizationId?: string } = {}
): Promise<GrowthPolicyControlCenterModel> {
  const actor = assertPolicyUser(user);
  const actorRole = assertCanOpenGrowthPolicy(actor);
  const database = input.database ?? (prisma as unknown as GrowthPolicyDatabase);
  const now = input.now ?? new Date();
  const organizationId = input.organizationId ?? INITIAL_ORGANIZATION.id;

  const policyVersion =
    (await database.growthPolicyVersion.findFirst({
      where: { organizationId, policyCode: GROWTH_CORE_POLICY_CODE, status: "ACTIVE" },
      orderBy: { version: "desc" }
    })) ??
    (await createInitialPolicyVersion({
      actorRole,
      database,
      now,
      organizationId,
      user: actor
    }));

  const fallback = buildDefaultPolicySettings();
  const settings = readPolicySettings(policyVersion.settings, fallback);
  const auditEvents = await database.growthPolicyAuditEvent.findMany({
    orderBy: { occurredAt: "desc" },
    take: 8,
    where: { organizationId, policyVersionId: policyVersion.id }
  });

  return {
    auditEvents: auditEvents.map((event) => ({
      actorRole: event.actorRole,
      eventType: event.eventType,
      occurredAt: event.occurredAt.toISOString(),
      reason: event.reason
    })),
    budgetPolicies: settings.budgetPolicies,
    controls: settings.controls,
    generatedAt: now.toISOString(),
    launchPosture: settings.launchPosture,
    policyVersion: {
      activatedAt: policyVersion.activatedAt?.toISOString() ?? null,
      id: policyVersion.id,
      source: "Durable policy settings",
      status: policyVersion.status,
      version: policyVersion.version
    },
    summary: summarizeControls(settings.controls)
  };
}
