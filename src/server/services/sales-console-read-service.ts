import type { AuthenticatedUser } from "@/server/auth/store";
import type { BoardReadLookupResult, BoardReadTask } from "@/server/services/board-read";
import { getBoardReadModelForToday } from "@/server/services/board-read";
import { listRecentCustomerLeads } from "@/server/services/customer-lead-service";
import { listVehicleRegistry } from "@/server/vehicle-registry/service";
import {
  adaptSalesConsoleReadModel,
  salesConsoleMockSourceBundle,
  type SalesConsoleReadAdapterViewModel,
  type SalesConsoleSourceBundle,
  type SalesConsoleSourceDealRecord,
  type SalesConsoleSourceLeadRecord,
  type SalesConsoleSourceTaskRecord,
  type SalesConsoleSourceVehicleRecord
} from "@/features/sales/sales-console-mvp-read-adapters";

type CustomerLeadRead = Awaited<ReturnType<typeof listRecentCustomerLeads>>[number];
type VehicleRegistrySearch = Awaited<ReturnType<typeof listVehicleRegistry>>;
type VehicleRegistryItem = VehicleRegistrySearch["items"][number];

export type SalesConsoleRealDataSourceStatus = "fallback" | "mapped" | "unavailable";

export type SalesConsoleRealDataSourceEvidence = {
  fallbackReason: string | null;
  source: string;
  status: SalesConsoleRealDataSourceStatus;
  usedRecords: number;
};

export type SalesConsoleReadServiceResult = {
  dataSources: SalesConsoleRealDataSourceEvidence[];
  generatedAt: string;
  readModel: SalesConsoleReadAdapterViewModel;
  sourceBundle: SalesConsoleSourceBundle;
};

type SalesConsoleReadServiceDependencies = {
  boardReader?: (actor: AuthenticatedUser | null) => Promise<BoardReadLookupResult>;
  leadReader?: (actor: AuthenticatedUser | null, limit: number) => Promise<CustomerLeadRead[]>;
  now?: () => Date;
  vehicleReader?: (actor: AuthenticatedUser | null) => Promise<VehicleRegistrySearch>;
};

function minutesSince(value: string | Date | null | undefined, now: Date) {
  if (!value) return null;
  const date = value instanceof Date ? value : new Date(value);
  if (Number.isNaN(date.getTime())) return null;
  return Math.max(0, Math.round((now.getTime() - date.getTime()) / 60000));
}

function dueLabel(dueAt: string, now: Date) {
  const due = new Date(dueAt);
  if (Number.isNaN(due.getTime())) return "Due unavailable";
  const minutes = Math.round((due.getTime() - now.getTime()) / 60000);
  if (minutes < 0) return "Overdue";
  if (minutes < 60) return `Due: ${minutes}m`;
  if (minutes < 24 * 60) return `Due: ${Math.round(minutes / 60)}h`;
  return "Due: future";
}

function realTaskToSourceTask(task: BoardReadTask, now: Date): SalesConsoleSourceTaskRecord {
  return {
    activityAgeMinutes: minutesSince(task.updatedAt, now),
    blocker: task.blockerReason ?? (task.requiresManagerApproval ? "Manager review" : undefined),
    customerId: task.customerReference ?? `task-customer-${task.id}`,
    customerName: task.customerReference ?? task.title,
    dueLabel: dueLabel(task.dueAt, now),
    nextAction: task.recommendation?.explanation ?? task.requiredUpdateFields[0]?.label ?? "Review source task",
    phone: "Source phone unavailable",
    reason: task.blockerReason ?? task.recommendation?.reasonCode ?? task.status,
    stage: task.status.replaceAll("_", " ").toLowerCase().replace(/(^|\s)\S/g, (value) => value.toUpperCase()),
    stockNumber: task.vehicleReference ?? undefined,
    taskId: task.id,
    vehicleId: task.vehicleReference ?? undefined,
    vehicleName: task.vehicleReference ?? "Vehicle match pending"
  };
}

function leadToSourceLead(lead: CustomerLeadRead, now: Date): SalesConsoleSourceLeadRecord {
  return {
    appointmentCount: lead.stage === "APPOINTMENT_SET" || lead.stage === "ON_SITE" ? 1 : 0,
    assignmentState: lead.owner?.id ? "assigned" : "unassigned",
    duplicateReview: false,
    lastActivityMinutes: minutesSince(lead.updatedAt ?? lead.createdAt, now),
    leadId: lead.id,
    owner: lead.owner?.name
  };
}

function leadToSourceDeal(lead: CustomerLeadRead): SalesConsoleSourceDealRecord | null {
  if (!["NEGOTIATION", "WON"].includes(lead.stage)) return null;
  return {
    approvalState: lead.stage === "WON" ? "Won visibility" : "Pending Manager",
    blockerState: lead.stage === "NEGOTIATION" ? "Terms review" : undefined,
    customerId: lead.customer.id,
    customerName: lead.customer.displayName,
    dealId: `lead-${lead.leadNumber}`,
    paymentLabel: undefined,
    scenarioLabel: undefined,
    vehicleName: lead.vehicleInterest ?? "Vehicle pending"
  };
}

function vehicleToSourceVehicle(vehicle: VehicleRegistryItem): SalesConsoleSourceVehicleRecord {
  const vehicleName = [vehicle.year, vehicle.make, vehicle.model].filter(Boolean).join(" ") || vehicle.vehicleNumber;
  const duplicateCount = vehicle._count.duplicateCasesAsCandidate + vehicle._count.duplicateCasesAsPrimary;
  return {
    availability: vehicle.status === "ACTIVE" && duplicateCount === 0 ? "available" : "unknown",
    blockerDetail: duplicateCount > 0 ? "Duplicate review open" : undefined,
    priceLabel: "Price unavailable",
    readiness: vehicle.status === "ACTIVE" && duplicateCount === 0 ? "ready" : "unknown",
    stockNumber: vehicle.stockNumber ?? vehicle.vehicleNumber,
    vehicleId: vehicle.id,
    vehicleName
  };
}

function mergeSourceBundles(real: Partial<SalesConsoleSourceBundle>): SalesConsoleSourceBundle {
  return {
    appointments: real.appointments?.length ? real.appointments : salesConsoleMockSourceBundle.appointments,
    deals: real.deals?.length ? real.deals : salesConsoleMockSourceBundle.deals,
    leads: real.leads?.length ? real.leads : salesConsoleMockSourceBundle.leads,
    tasks: real.tasks?.length ? real.tasks : salesConsoleMockSourceBundle.tasks,
    vehicles: real.vehicles?.length ? real.vehicles : salesConsoleMockSourceBundle.vehicles
  };
}

function evidence(source: string, records: number, fallbackReason: string | null): SalesConsoleRealDataSourceEvidence {
  return {
    fallbackReason,
    source,
    status: records > 0 ? "mapped" : fallbackReason ? "fallback" : "unavailable",
    usedRecords: records
  };
}

export async function getSalesConsoleReadModel(
  actor: AuthenticatedUser | null,
  dependencies: SalesConsoleReadServiceDependencies = {}
): Promise<SalesConsoleReadServiceResult> {
  const now = dependencies.now?.() ?? new Date();
  const boardReader = dependencies.boardReader ?? getBoardReadModelForToday;
  const leadReader = dependencies.leadReader ?? listRecentCustomerLeads;
  const vehicleReader = dependencies.vehicleReader ?? ((user) => listVehicleRegistry(user, { page: 1, pageSize: 25, query: "" }));

  const [boardResult, leads, vehicles] = await Promise.allSettled([
    boardReader(actor),
    leadReader(actor, 10),
    vehicleReader(actor)
  ]);

  const boardTasks = boardResult.status === "fulfilled"
    ? boardResult.value.board?.tasks.filter((task) => task.workflowArea === "SALES" || task.sourceType === "CUSTOMER_LEAD").map((task) => realTaskToSourceTask(task, now)) ?? []
    : [];
  const leadSignals = leads.status === "fulfilled" ? leads.value.map((lead) => leadToSourceLead(lead, now)) : [];
  const leadDeals = leads.status === "fulfilled" ? leads.value.flatMap((lead) => leadToSourceDeal(lead) ?? []) : [];
  const vehicleSignals = vehicles.status === "fulfilled" ? vehicles.value.items.map(vehicleToSourceVehicle) : [];

  const sourceBundle = mergeSourceBundles({
    deals: leadDeals,
    leads: leadSignals,
    tasks: boardTasks,
    vehicles: vehicleSignals
  });

  return {
    dataSources: [
      evidence("Board/task read model", boardTasks.length, boardTasks.length ? null : "No sales task records mapped; using source-shaped fallback tasks."),
      evidence("Customer lead read model", leadSignals.length, leadSignals.length ? null : "No recent customer leads mapped; using fallback lead signals."),
      evidence("Vehicle registry read model", vehicleSignals.length, vehicleSignals.length ? null : "No vehicle registry rows mapped; using fallback vehicle matches."),
      evidence("Deal visibility", leadDeals.length, leadDeals.length ? null : "No negotiation/won lead-derived deals mapped; using visibility-only fallback deals."),
      evidence("Appointment context", 0, "No safe appointment board reader is wired in Milestone 5; using fallback appointment context.")
    ],
    generatedAt: now.toISOString(),
    readModel: adaptSalesConsoleReadModel(sourceBundle),
    sourceBundle
  };
}
