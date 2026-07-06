import { createHash } from "node:crypto";

import {
  previewAppointmentRescheduleImpact,
  type AppointmentRescheduleCurrentState,
  type AppointmentRescheduleImpactPreview
} from "@/server/appointments/appointment-reschedule-impact-service";
import type { AppointmentHardConflictEvaluationInput } from "@/server/appointments/appointment-hard-conflict-service";
import type { AppointmentWarningSignal } from "@/server/appointments/appointment-warning-service";

export const APPOINTMENT_BULK_RESCHEDULE_ATOMICITY_POLICIES = [
  "ALL_OR_NOTHING",
  "PARTIAL_ALLOWED"
] as const;

export const APPOINTMENT_BULK_RESCHEDULE_ITEM_STATUSES = [
  "READY",
  "WARNING",
  "BLOCKED",
  "UNAUTHORIZED",
  "SKIPPED",
  "SUCCEEDED",
  "FAILED"
] as const;

export type AppointmentBulkRescheduleAtomicityPolicy =
  (typeof APPOINTMENT_BULK_RESCHEDULE_ATOMICITY_POLICIES)[number];
export type AppointmentBulkRescheduleItemStatus =
  (typeof APPOINTMENT_BULK_RESCHEDULE_ITEM_STATUSES)[number];

export type AppointmentBulkReschedulePermission = {
  canReschedule: boolean;
  reason?: string | null;
};

export type AppointmentBulkRescheduleTarget = {
  itemId: string;
  current: AppointmentRescheduleCurrentState;
  proposedStartsAt: Date;
  candidate: Omit<AppointmentHardConflictEvaluationInput, "startsAt">;
  warningSignals?: AppointmentWarningSignal[];
  permission: AppointmentBulkReschedulePermission;
};

export type AppointmentBulkRescheduleDryRunItem = {
  itemId: string;
  appointmentId: string;
  status: Extract<
    AppointmentBulkRescheduleItemStatus,
    "READY" | "WARNING" | "BLOCKED" | "UNAUTHORIZED" | "SKIPPED"
  >;
  reasons: string[];
  preview: AppointmentRescheduleImpactPreview;
};

export type AppointmentBulkRescheduleSummary = {
  total: number;
  ready: number;
  warning: number;
  blocked: number;
  unauthorized: number;
  skipped: number;
  succeeded?: number;
  failed?: number;
};

export type AppointmentBulkRescheduleDryRun = {
  operationId: string;
  atomicityPolicy: AppointmentBulkRescheduleAtomicityPolicy;
  previewToken: string;
  canExecute: boolean;
  reasonRequired: boolean;
  items: AppointmentBulkRescheduleDryRunItem[];
  summary: AppointmentBulkRescheduleSummary;
};

export type AppointmentBulkRescheduleExecutionItem = {
  itemId: string;
  appointmentId: string;
  status: Extract<
    AppointmentBulkRescheduleItemStatus,
    "SUCCEEDED" | "FAILED" | "SKIPPED"
  >;
  message: string;
};

export type AppointmentBulkRescheduleExecutionResult = {
  operationId: string;
  previewToken: string;
  duplicate: boolean;
  atomicityPolicy: AppointmentBulkRescheduleAtomicityPolicy;
  reasonCode: string;
  reasonNotes: string;
  canRetryFailedItems: boolean;
  items: AppointmentBulkRescheduleExecutionItem[];
  summary: AppointmentBulkRescheduleSummary;
};

export type AppointmentBulkRescheduleStoredOperation = {
  operationId: string;
  previewToken: string;
  result: AppointmentBulkRescheduleExecutionResult;
};

export type AppointmentBulkRescheduleExecutionRepository = {
  findBulkRescheduleOperation(
    operationId: string
  ): Promise<AppointmentBulkRescheduleStoredOperation | null>;
  saveBulkRescheduleOperation(
    operation: AppointmentBulkRescheduleStoredOperation
  ): Promise<void>;
};

export type AppointmentBulkRescheduleExecutor = (
  item: AppointmentBulkRescheduleDryRunItem
) => Promise<{ message?: string } | void>;

function requiredText(value: string | null | undefined, label: string) {
  const normalized = value?.trim();

  if (!normalized) {
    throw new Error(`${label} is required.`);
  }

  return normalized;
}

function stableSerialize(value: unknown): string {
  if (value instanceof Date) {
    return JSON.stringify(value.toISOString());
  }

  if (Array.isArray(value)) {
    return `[${value.map((entry) => stableSerialize(entry)).join(",")}]`;
  }

  if (value && typeof value === "object") {
    return `{${Object.entries(value)
      .sort(([leftKey], [rightKey]) => leftKey.localeCompare(rightKey))
      .map(([key, entry]) => `${JSON.stringify(key)}:${stableSerialize(entry)}`)
      .join(",")}}`;
  }

  return JSON.stringify(value);
}

function buildPreviewToken(input: {
  operationId: string;
  atomicityPolicy: AppointmentBulkRescheduleAtomicityPolicy;
  items: AppointmentBulkRescheduleDryRunItem[];
}) {
  return `sha256:${createHash("sha256")
    .update(
      stableSerialize({
        operationId: input.operationId,
        atomicityPolicy: input.atomicityPolicy,
        items: input.items.map((item) => ({
          itemId: item.itemId,
          appointmentId: item.appointmentId,
          status: item.status,
          priorStartsAt: item.preview.prior.startsAt,
          priorEndsAt: item.preview.prior.endsAt,
          proposedStartsAt: item.preview.proposed.startsAt,
          proposedEndsAt: item.preview.proposed.endsAt,
          hardConflictCount: item.preview.hardConflictResult.hardConflicts.length,
          unresolvedWarningCount: item.preview.warningResult.unresolvedWarnings.length,
          reservationImpacts: item.preview.reservationImpacts.map((impact) => ({
            id: impact.id,
            action: impact.action
          }))
        }))
      })
    )
    .digest("hex")}`;
}

function getDryRunItemStatus(input: {
  permission: AppointmentBulkReschedulePermission;
  preview: AppointmentRescheduleImpactPreview;
}) {
  if (!input.permission.canReschedule) {
    return "UNAUTHORIZED" as const;
  }

  if (!input.preview.hardConflictResult.canCommit) {
    return "BLOCKED" as const;
  }

  if (input.preview.warningResult.unresolvedWarnings.length > 0) {
    return "WARNING" as const;
  }

  return "READY" as const;
}

function getDryRunReasons(input: {
  permission: AppointmentBulkReschedulePermission;
  preview: AppointmentRescheduleImpactPreview;
}) {
  if (!input.permission.canReschedule) {
    return [input.permission.reason?.trim() || "Actor is not authorized to reschedule this appointment."];
  }

  if (!input.preview.hardConflictResult.canCommit) {
    return input.preview.hardConflictResult.hardConflicts.map(
      (conflict) => conflict.message
    );
  }

  if (input.preview.warningResult.unresolvedWarnings.length > 0) {
    return input.preview.warningResult.unresolvedWarnings.map((warning) => warning.message);
  }

  return [];
}

function countDryRunItems(items: AppointmentBulkRescheduleDryRunItem[]) {
  return {
    total: items.length,
    ready: items.filter((item) => item.status === "READY").length,
    warning: items.filter((item) => item.status === "WARNING").length,
    blocked: items.filter((item) => item.status === "BLOCKED").length,
    unauthorized: items.filter((item) => item.status === "UNAUTHORIZED").length,
    skipped: items.filter((item) => item.status === "SKIPPED").length
  };
}

function getCanExecute(input: {
  atomicityPolicy: AppointmentBulkRescheduleAtomicityPolicy;
  summary: AppointmentBulkRescheduleSummary;
}) {
  if (input.atomicityPolicy === "ALL_OR_NOTHING") {
    return input.summary.total > 0 && input.summary.ready === input.summary.total;
  }

  return input.summary.ready > 0;
}

function countExecutionItems(items: AppointmentBulkRescheduleExecutionItem[]) {
  return {
    total: items.length,
    ready: 0,
    warning: 0,
    blocked: 0,
    unauthorized: 0,
    skipped: items.filter((item) => item.status === "SKIPPED").length,
    succeeded: items.filter((item) => item.status === "SUCCEEDED").length,
    failed: items.filter((item) => item.status === "FAILED").length
  };
}

export function dryRunBulkReschedule(input: {
  operationId: string;
  atomicityPolicy: AppointmentBulkRescheduleAtomicityPolicy;
  targets: AppointmentBulkRescheduleTarget[];
}): AppointmentBulkRescheduleDryRun {
  const operationId = requiredText(input.operationId, "Bulk reschedule operation ID");

  if (!APPOINTMENT_BULK_RESCHEDULE_ATOMICITY_POLICIES.includes(input.atomicityPolicy)) {
    throw new Error(`Bulk reschedule atomicity policy is invalid: "${input.atomicityPolicy}".`);
  }

  if (input.targets.length === 0) {
    throw new Error("Bulk reschedule dry run must include at least one target.");
  }

  const items = input.targets.map((target) => {
    const preview = previewAppointmentRescheduleImpact({
      current: target.current,
      proposedStartsAt: target.proposedStartsAt,
      candidate: target.candidate,
      warningSignals: target.warningSignals
    });
    const status = getDryRunItemStatus({
      permission: target.permission,
      preview
    });

    return {
      itemId: requiredText(target.itemId, "Bulk reschedule item ID"),
      appointmentId: target.current.appointmentId,
      status,
      reasons: getDryRunReasons({
        permission: target.permission,
        preview
      }),
      preview
    };
  });
  const summary = countDryRunItems(items);
  const previewToken = buildPreviewToken({
    operationId,
    atomicityPolicy: input.atomicityPolicy,
    items
  });

  return {
    operationId,
    atomicityPolicy: input.atomicityPolicy,
    previewToken,
    canExecute: getCanExecute({
      atomicityPolicy: input.atomicityPolicy,
      summary
    }),
    reasonRequired: true,
    items,
    summary
  };
}

export async function executeBulkReschedule(input: {
  dryRun: AppointmentBulkRescheduleDryRun;
  reasonCode: string;
  reasonNotes: string;
  repository: AppointmentBulkRescheduleExecutionRepository;
  executor: AppointmentBulkRescheduleExecutor;
}): Promise<AppointmentBulkRescheduleExecutionResult> {
  const reasonCode = requiredText(input.reasonCode, "Bulk reschedule reason code");
  const reasonNotes = requiredText(input.reasonNotes, "Bulk reschedule reason notes");
  const existing = await input.repository.findBulkRescheduleOperation(
    input.dryRun.operationId
  );

  if (existing) {
    if (existing.previewToken !== input.dryRun.previewToken) {
      throw new Error("Bulk reschedule operation ID was reused for a different dry run.");
    }

    return {
      ...existing.result,
      duplicate: true
    };
  }

  if (!input.dryRun.canExecute) {
    throw new Error("Bulk reschedule dry run is not executable.");
  }

  const executionItems: AppointmentBulkRescheduleExecutionItem[] = [];

  for (const item of input.dryRun.items) {
    if (item.status !== "READY") {
      executionItems.push({
        itemId: item.itemId,
        appointmentId: item.appointmentId,
        status: "SKIPPED",
        message: item.reasons.join(" ") || `Skipped ${item.status.toLowerCase()} item.`
      });
      continue;
    }

    try {
      const result = await input.executor(item);

      executionItems.push({
        itemId: item.itemId,
        appointmentId: item.appointmentId,
        status: "SUCCEEDED",
        message: result?.message ?? "Bulk reschedule item applied."
      });
    } catch (error) {
      executionItems.push({
        itemId: item.itemId,
        appointmentId: item.appointmentId,
        status: "FAILED",
        message: error instanceof Error ? error.message : "Bulk reschedule item failed."
      });

      if (input.dryRun.atomicityPolicy === "ALL_OR_NOTHING") {
        break;
      }
    }
  }

  const summary = countExecutionItems(executionItems);
  const result: AppointmentBulkRescheduleExecutionResult = {
    operationId: input.dryRun.operationId,
    previewToken: input.dryRun.previewToken,
    duplicate: false,
    atomicityPolicy: input.dryRun.atomicityPolicy,
    reasonCode,
    reasonNotes,
    canRetryFailedItems: Boolean(summary.failed && summary.failed > 0),
    items: executionItems,
    summary
  };

  await input.repository.saveBulkRescheduleOperation({
    operationId: input.dryRun.operationId,
    previewToken: input.dryRun.previewToken,
    result
  });

  return result;
}
