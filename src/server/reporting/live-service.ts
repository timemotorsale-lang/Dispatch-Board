import { reportDefinitions, type ReportDefinitionId, type ReportResult, type ReportRow } from "@/lib/reporting/contracts";
import { reportBusinessDate, resolveReportPeriod, type ReportCadence } from "@/lib/reporting/calendar";
import type { AuthenticatedUser } from "@/server/auth/store";
import { prisma } from "@/server/db/client";
import { INITIAL_ORGANIZATION } from "@/server/appointments/location-foundation";
import { assertAuthenticatedUser, isGeneralManager } from "@/server/policies/access";
import { assertVehicleCapability, type VehicleCapability } from "@/server/enterprise-command/vehicle-capabilities";
import { requireTimeAttendanceCapability } from "@/server/time-attendance/capabilities";
import { reportMeasures } from "@/lib/reporting/measures";

const organizationId = INITIAL_ORGANIZATION.id;
const take = 501;
const capability: Partial<Record<ReportDefinitionId, VehicleCapability>> = { inventory: "INVENTORY_UNIT_VIEW", recon: "REPAIR_ORDER_VIEW", parts: "PARTS_VIEW", quality: "DIAGNOSTIC_CASE_VIEW", acquisition: "INVENTORY_UNIT_VIEW" };

export async function reportingLocations(actor: AuthenticatedUser | null) {
  const user = assertAuthenticatedUser(actor);
  return isGeneralManager(user) ? prisma.location.findMany({ where: { organizationId }, select: { id: true, name: true }, orderBy: { name: "asc" } }) : [];
}

export async function readLiveReport(actor: AuthenticatedUser | null, definitionId: ReportDefinitionId, input: { locationId?: string; date?: string; cadence?: ReportCadence } = {}, now = new Date()): Promise<ReportResult> {
  const user = assertAuthenticatedUser(actor);
  if (!user.isActive) throw new Error("Reporting access is unavailable.");
  if (!reportDefinitions.some(definition => definition.id === definitionId)) throw new Error("Report definition is invalid.");
  if (!isGeneralManager(user) && !["operations", "reviews"].includes(definitionId)) throw new Error("You do not have permission to view this report.");
  if (input.locationId && !await prisma.location.findFirst({ where: { id: input.locationId, organizationId }, select: { id: true } })) throw new Error("Report location is invalid.");
  const requiredCapability = capability[definitionId];
  if (requiredCapability) {
    const grants = await prisma.vehicleCapabilityGrant.findMany({ where: { userId: user.id, organizationId } });
    assertVehicleCapability({ actor: user, capability: requiredCapability, grants, locationId: input.locationId ?? null, now });
  }
  if (definitionId === "attendance") await requireTimeAttendanceCapability({ actor: user, capability: "TIME_ATTENDANCE_MANAGER", organizationId, locationId: input.locationId ?? null });
  const scoped = { organizationId, ...(input.locationId ? { locationId: input.locationId } : {}) };
  const date = input.date ?? reportBusinessDate(now), period = resolveReportPeriod(date, input.cadence ?? "DAILY");
  if (input.locationId && ["operations", "reviews", "sales", "customers", "claims", "growth"].includes(definitionId)) return { definitionId, definitionVersion: `${definitionId}/v1`, generatedAt: now.toISOString(), quality: "UNAVAILABLE", limitation: "This source has no location identity. Choose all locations; location-filtered measures are unavailable.", rows: [], metrics: [] };
  if (!["appointments", "attendance"].includes(definitionId) && date !== reportBusinessDate(now)) return { definitionId, definitionVersion: `${definitionId}/v1`, generatedAt: now.toISOString(), quality: "UNAVAILABLE", limitation: "This report supports current state only. Use a saved period report for historical evidence.", rows: [], metrics: [] };
  let rows: ReportRow[] = [], limitation: string | null = null;
  const owner = (value: { name: string } | null) => value?.name ?? "Unassigned";
  const days = (value: Date) => Math.max(0, Math.floor((Date.parse(reportBusinessDate(now)) - Date.parse(reportBusinessDate(value))) / 86_400_000));
  switch (definitionId) {
    case "operations": case "reviews": {
      if (input.locationId) { limitation = "Task board has no location identity; location-filtered task reporting is unavailable."; break; }
      const tasks = await prisma.task.findMany({ where: { ...(isGeneralManager(user) ? {} : { assignedUserId: user.id }), ...(definitionId === "reviews" ? { status: { in: ["READY_FOR_REVIEW", "WAITING_ON_APPROVAL"] } } : { status: { not: "COMPLETED" } }) }, include: { assignedUser: { select: { name: true } } }, orderBy: [{ dueAt: "asc" }, { id: "asc" }], take });
      rows = tasks.map(task => ({ id: task.id, title: task.title, state: task.status, owner: task.assignedUser.name, href: `/tasks/${task.id}`, occurredAt: task.dueAt.toISOString(), detail: task.blockerReason ?? undefined }));
      limitation = "Current task-board scope. Financial and cross-domain approvals are not included."; break;
    }
    case "inventory": {
      const units = await prisma.inventoryUnit.findMany({ where: { ...scoped, closedAt: null }, include: { ownerUser: { select: { name: true } }, receipts: { where: { arrivedAt: { not: null } }, orderBy: { arrivedAt: "desc" }, take: 1 } }, orderBy: [{ financialAcquiredAt: "asc" }, { id: "asc" }], take });
      rows = units.map(unit => ({ id: unit.id, title: unit.inventoryNumber, state: unit.lifecycleStage, owner: unit.ownerUser.name, href: `/vehicles/360/${unit.vehicleId}`, ...(unit.receipts[0]?.arrivedAt ? { ageDays: days(unit.receipts[0].arrivedAt), occurredAt: unit.receipts[0].arrivedAt.toISOString() } : {}), detail: unit.nextAction }));
      limitation = "Receipt age uses the latest recorded arrival. Units without an arrival remain in the list with unavailable age. Frontline age and cost exposure are not included."; break;
    }
    case "recon": {
      const orders = await prisma.repairOrder.findMany({ where: { ...scoped, closedAt: null }, include: { ownerUser: { select: { name: true } } }, orderBy: [{ openedAt: "asc" }, { id: "asc" }], take });
      rows = orders.map(order => ({ id: order.id, title: order.repairOrderNumber, state: `${order.stage} / ${order.operatingState}`, owner: order.ownerUser.name, href: `/vehicles/shop-recon/${order.id}`, ageDays: days(order.openedAt), occurredAt: order.openedAt.toISOString(), detail: order.stateReason ?? order.nextAction }));
      limitation = "Open-order calendar age, not completed cycle time or active technician labor."; break;
    }
    case "sales": {
      if (input.locationId) { limitation = "Opportunity records do not carry a location identity. Choose all locations."; break; }
      const opportunities = await prisma.unifiedCrmOpportunityRecord.findMany({ where: { organizationId, archivedAt: null }, include: { ownerUser: { select: { name: true } } }, orderBy: [{ createdAt: "asc" }, { id: "asc" }], take });
      rows = opportunities.map(item => ({ id: item.id, title: item.title, state: item.stage, owner: owner(item.ownerUser), href: `/crm/opportunities/${item.id}`, detail: item.nextActionLabel ?? undefined }));
      limitation = "Current opportunity stages, including recorded outcomes. Delivered-unit and cohort conversion metrics require reconciled delivery linkage."; break;
    }
    case "customers": {
      if (input.locationId) { limitation = "Promise records do not carry a location identity. Choose all locations."; break; }
      const promises = await prisma.customerPromise.findMany({ where: { status: "OPEN", concernCase: { organizationId } }, include: { ownerUser: { select: { name: true } }, concernCase: { select: { customerId: true } } }, orderBy: [{ dueAt: "asc" }, { id: "asc" }], take });
      rows = promises.map(item => ({ id: item.id, title: item.promiseType, state: item.dueAt < now ? "OVERDUE" : item.status, owner: item.ownerUser.name, href: item.concernCase.customerId ? `/customers/${item.concernCase.customerId}` : "/customers/cases", occurredAt: item.dueAt.toISOString() })); break;
    }
    case "appointments": {
      const appointments = await prisma.appointment.findMany({ where: { ...scoped, startsAt: { gte: period.startsAt, lt: period.endsAt } }, include: { ownerUser: { select: { name: true } } }, orderBy: [{ startsAt: "asc" }, { id: "asc" }], take });
      rows = appointments.map(item => ({ id: item.id, title: item.title, state: item.cancelledAt ? "CANCELLED" : item.attendanceStatus, owner: owner(item.ownerUser), href: `/appointments?appointmentId=${item.id}`, occurredAt: item.startsAt?.toISOString() }));
      limitation = "Scheduled-period cohort with current recorded attendance. Original cutoff and reschedule lineage are not reconstructed."; break;
    }
    case "parts": {
      const orders = await prisma.partPurchaseOrder.findMany({ where: { ...scoped, closedAt: null }, include: { createdByUser: { select: { name: true } }, vendor: { select: { name: true } } }, orderBy: [{ createdAt: "asc" }, { id: "asc" }], take });
      rows = orders.map(item => ({ id: item.id, title: item.purchaseOrderNumber, state: item.status, owner: item.createdByUser.name, href: `/vehicles/parts-operations?view=purchase-orders&purchaseOrderId=${item.id}`, ageDays: days(item.createdAt), detail: item.vendor.name }));
      limitation = "Open purchase orders only. Line quantities and promised-date timeliness need a validated line contract."; break;
    }
    case "claims": {
      if (input.locationId) { limitation = "Claim records do not carry a location identity. Choose all locations."; break; }
      const claims = await prisma.insuranceClaim.findMany({ where: { organizationId }, orderBy: [{ createdAt: "asc" }, { id: "asc" }], take, select: { id: true, claimNumber: true, status: true, stage: true, ownerUserId: true, createdAt: true } });
      rows = claims.map(item => ({ id: item.id, title: item.claimNumber ?? "Claim awaiting number", state: `${item.status} / ${item.stage}`, owner: item.ownerUserId, href: `/vehicles/claims-workspace?claimId=${item.id}`, ageDays: days(item.createdAt) }));
      limitation = "Recorded insurance claims; age is since creation, not submission. Warranty claims and recovery amounts are not included."; break;
    }
    case "documents": {
      const packets = await prisma.documentLibraryPacket.findMany({ where: scoped, orderBy: [{ createdAt: "asc" }, { id: "asc" }], take, select: { id: true, title: true, status: true, ownerLabel: true } });
      rows = packets.map(item => ({ id: item.id, title: item.title, state: item.status, owner: item.ownerLabel, href: `/document-library?packetId=${item.id}` }));
      limitation = "Recorded packet status. Required-slot reconciliation remains owned by document readiness policy."; break;
    }
    case "attendance": {
      const sessions = await prisma.timeAttendanceSession.findMany({ where: { ...scoped, workDate: { gte: new Date(`${period.startDate}T00:00:00Z`), lt: new Date(`${period.endDate}T00:00:00Z`) } }, include: { staffUser: { select: { name: true } } }, orderBy: [{ workDate: "asc" }, { id: "asc" }], take });
      rows = sessions.map(item => ({ id: item.id, title: item.workDate.toISOString().slice(0, 10), state: item.state, owner: item.staffUser.name, href: `/time-attendance?staffUserId=${item.staffUserId}`, occurredAt: item.openedAt.toISOString() }));
      limitation = "Recorded session states only, not payroll-certified hours or a complete exception calculation."; break;
    }
    case "growth": {
      if (input.locationId) { limitation = "Campaign records do not carry a location identity. Choose all locations."; break; }
      const campaigns = await prisma.growthCampaignPlan.findMany({ where: { organizationId }, orderBy: [{ createdAt: "asc" }, { id: "asc" }], take, select: { id: true, opportunityTitle: true, status: true, ownerRole: true, channel: true } });
      rows = campaigns.map(item => ({ id: item.id, title: item.opportunityTitle, state: item.status, owner: item.ownerRole, href: `/growth/campaigns/${item.id}`, detail: item.channel }));
      limitation = "Campaign states only. Attribution, complete spend, cost per outcome, and ROI are unavailable in this projection."; break;
    }
    case "quality": {
      const cases = await prisma.diagnosticCase.findMany({ where: { ...scoped, closedAt: null }, include: { assignedUser: { select: { name: true } } }, orderBy: [{ openedAt: "asc" }, { id: "asc" }], take });
      rows = cases.map(item => ({ id: item.id, title: item.concernKey, state: item.status, owner: owner(item.assignedUser), href: `/diagnostics/cases/${encodeURIComponent(item.id)}`, ageDays: days(item.openedAt), detail: item.riskTier }));
      limitation = "Open diagnostic cases, not first-pass QC or comeback rate."; break;
    }
    case "acquisition": {
      const cases = await prisma.inventoryAcquisitionCase.findMany({ where: scoped, include: { ownerUser: { select: { name: true } }, vehicle: { select: { vehicleNumber: true } } }, orderBy: [{ createdAt: "asc" }, { id: "asc" }], take });
      rows = cases.map(item => ({ id: item.id, title: item.vehicle.vehicleNumber, state: item.status, owner: item.ownerUser.name, href: `/vehicles/acquisition-appraisal?caseId=${item.id}`, ageDays: days(item.createdAt) }));
      limitation = "Acquisition case status only. Disposition outcomes and appraisal variance are not included."; break;
    }
  }
  if (rows.length > 500) limitation = `${limitation ?? ""} Limited to the first 500 records; measures describe this displayed subset.`.trim();
  rows = rows.slice(0, 500);
  const metrics = reportMeasures(definitionId, rows, now);
  return { definitionId, definitionVersion: `${definitionId}/v1`, generatedAt: now.toISOString(), quality: limitation ? "PARTIAL" : "COMPLETE", limitation, rows, metrics };
}
