import { DiagnosticAdvisorReviewConsole } from "@/features/diagnostics/advisor-review-console";
import { requireCurrentUser } from "@/server/auth/current-user";
import { LABOR_GUIDE_DIAGNOSTIC_NAVIGATION } from "@/server/diagnostics/labor-guide-navigation";
import { getRepairOrderDetail } from "@/server/repair-order/service";

type PageProps = { searchParams?: Promise<{ operation?: string | string[]; repairOrderId?: string | string[] }> };

export default async function DiagnosticsAdvisorReviewPage({ searchParams }: PageProps) {
  const user = await requireCurrentUser();
  const params = searchParams ? await searchParams : {};
  const operationId = Array.isArray(params.operation) ? params.operation[0] : params.operation;
  const repairOrderId = Array.isArray(params.repairOrderId) ? params.repairOrderId[0] : params.repairOrderId;
  const operation = LABOR_GUIDE_DIAGNOSTIC_NAVIGATION.flatMap((category) => category.operations).find((item) => item.id === operationId) ?? null;
  const order = repairOrderId ? await getRepairOrderDetail(user, repairOrderId).catch(() => null) : null;
  const context = operation || order ? {
    operation: operation ? { complexity: operation.complexity, id: operation.id, likelyHours: operation.likelyHours, title: operation.title, verification: operation.verification } : null,
    repairOrder: order ? { concern: order.serviceVisit.concernSummary, id: order.id, repairOrderNumber: order.repairOrderNumber, vehicle: [order.vehicle.year, order.vehicle.make, order.vehicle.model].filter(Boolean).join(" ") || order.vehicle.vehicleNumber } : null,
  } : null;

  return <DiagnosticAdvisorReviewConsole context={context} />;
}
