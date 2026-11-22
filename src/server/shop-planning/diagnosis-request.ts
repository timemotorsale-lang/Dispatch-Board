import type { Prisma } from "@prisma/client";
import type { DiagnosisRequest } from "@/lib/repair-diagnosis-request";

export const SAVE_DIAGNOSIS_REQUEST = "SAVE_DIAGNOSIS_REQUEST";
export const RECORD_DIAGNOSIS_FINDINGS = "RECORD_DIAGNOSIS_FINDINGS";

export async function latestDiagnosisRequest(db: Pick<Prisma.TransactionClient, "enterpriseDomainEvent">, organizationId: string, repairOrderId: string) {
  const event = await db.enterpriseDomainEvent.findFirst({
    where: { organizationId, domain: "SHOP_OPERATIONS", aggregateType: "REPAIR_ORDER", aggregateId: repairOrderId, eventType: `${SAVE_DIAGNOSIS_REQUEST}_COMPLETED` },
    orderBy: { aggregateVersion: "desc" },
    select: { payload: true },
  });
  const payload = object(event?.payload);
  const result = object(payload.result);
  const { route, instructions, assigneeId, assigneeName, evidenceId } = result;
  if ((route !== "IN_HOUSE" && route !== "OUTSIDE_VENDOR") || typeof instructions !== "string" || typeof assigneeId !== "string" || typeof assigneeName !== "string") return null;
  return { route, instructions, assigneeId, assigneeName, evidenceId: typeof evidenceId === "string" ? evidenceId : undefined } satisfies DiagnosisRequest;
}

function object(value: unknown) {
  return value && typeof value === "object" && !Array.isArray(value) ? value as Record<string, unknown> : {};
}

function text(value: unknown, label: string, max: number, optional = false) {
  const answer = typeof value === "string" ? value.trim() : "";
  if (!answer && !optional) throw new Error(`${label} is required.`);
  if (answer.length > max) throw new Error(`${label} must be ${max} characters or fewer.`);
  return answer;
}

export function normalizeDiagnosisWork(action: "request" | "findings", value: unknown) {
  const raw = object(value);
  if (typeof raw.expectedVersion !== "number" || !Number.isInteger(raw.expectedVersion) || raw.expectedVersion < 0) throw new Error("Reload the repair order before saving.");
  const base = {
    expectedVersion: raw.expectedVersion,
    idempotencyKey: text(raw.idempotencyKey, "Save reference", 200),
    evidenceId: text(raw.evidenceId, "Attachment", 100, true) || undefined,
  };
  if (action === "request") {
    const route = raw.route;
    if (route !== "IN_HOUSE" && route !== "OUTSIDE_VENDOR") throw new Error("Choose in-house or outside vendor diagnosis.");
    const diagnosisRoute: DiagnosisRequest["route"] = route;
    return { kind: "request" as const, ...base, route: diagnosisRoute, instructions: text(raw.instructions, "What should be checked?", 1000), assigneeId: text(raw.assigneeId, route === "IN_HOUSE" ? "Technician" : "Vendor", 100) };
  }
  const testName = text(raw.testName, "Test performed", 200, true);
  const testResult = text(raw.testResult, "Test result", 500, true);
  if (Boolean(testName) !== Boolean(testResult)) throw new Error("Enter both the test performed and its result.");
  return {
    kind: "findings" as const, ...base, findings: text(raw.findings, "What was found?", 1000),
    recommendation: text(raw.recommendation, "What work is recommended?", 500),
    cause: text(raw.cause, "Confirmed cause", 500, true), testName, testResult,
  };
}
