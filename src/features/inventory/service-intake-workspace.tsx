"use client";

import {
  AlertTriangle,
  CalendarClock,
  CalendarDays,
  CarFront,
  Check,
  CheckCircle2,
  ChevronRight,
  ClipboardCheck,
  Clock3,
  KeyRound,
  MessageSquareText,
  Plus,
  Search,
  RefreshCw,
  ShieldAlert,
  ShieldCheck,
  Sparkles,
  UserRound,
  X,
} from "lucide-react";
import Link from "next/link";
import { FormEvent, useCallback, useEffect, useMemo, useRef, useState } from "react";

import { BackToServiceAdvisorWorkspace } from "@/features/advisor/advisor-return-link";
import { isSameRepairOrderConcern } from "@/server/repair-order/domain";
import type { VehicleDecode } from "@/server/vehicle-identification/nhtsa";
import type { NhtsaSafetyIntelligence } from "@/server/vehicle-identification/nhtsa-safety";

export type ServiceIntakeOptions = {
  appointments: Array<{ appointmentNumber: string; id: string; locationId: string; startsAt: string | null; title: string; participants: Array<{ customer: null | { customerNumber?: string; displayName: string; email?: string | null; id: string; phoneNumber?: string | null } }>; vehicles: Array<{ vehicle: { color?: string | null; id: string; licensePlate?: string | null; make: string | null; model: string | null; vehicleNumber: string; vin?: string | null; year: number | null } }> }>;
  customers: Array<{ customerNumber?: string; displayName: string; email?: string | null; id: string; phoneNumber?: string | null }>;
  inventoryUnits: Array<{ id: string; inventoryNumber: string; locationId: string; vehicle: ServiceIntakeOptions["vehicles"][number] }>;
  locations: Array<{ code?: string; id: string; name: string }>;
  repairOrders: Array<{ closedAt: string | null; customer: null | { displayName: string }; id: string; openedAt: string; operatingState: string; repairOrderNumber: string; serviceVisit: { concernSummary: string }; stage: string; vehicle: ServiceIntakeOptions["vehicles"][number] }>;
  users: Array<{ email?: string; id: string; name: string; roles?: string[] }>;
  vehicles: Array<{ color?: string | null; id: string; licensePlate?: string | null; make: string | null; model: string | null; registryRelationships?: Array<{ relationshipType: string }>; specificationSnapshot?: unknown; stockNumber?: string | null; vehicleNumber: string; version?: number; vin?: string | null; year: number | null }>;
};

type VehicleRelationshipIntent = "CUSTOMER_VEHICLE" | "DEALERSHIP_INVENTORY" | "TRADE_ACQUISITION" | "OWNERSHIP_UNCONFIRMED";

type IntakeState = {
  arrivedAt: string;
  concernSummary: string;
  consentReference: string;
  consentStatus: "DOCUMENTED" | "NOT_REQUIRED" | "PENDING";
  consentedAt: string;
  customerId: string;
  frequency: string;
  intakeNotes: string;
  inventoryUnitId: string;
  keyTag: string;
  keysReceivedCount: number;
  locationId: string;
  nextAction: string;
  onset: string;
  ownerUserId: string;
  promisedAt: string;
  promiseNotes: string;
  targetAt: string;
  transportMode: string;
  urgency: string;
  vehicleRelationship: VehicleRelationshipIntent;
  vehicleId: string;
  warningIndicators: string;
};

type ServiceReadiness = {
  appointment: null | { appointmentNumber: string; attendanceStatus: string; endsAt: string | null; expectedVersion: number; id: string; owner: string | null; startsAt: string | null; timing: string; title: string };
  alternatives: string[];
  canAcceptCustody: true;
  checks: Array<{ code: string; label: string; message: string; status: "PASS" | "REVIEW" | "WARNING" }>;
  confidence: "HIGH" | "LOW" | "MEDIUM";
  diagnosisOutlook: "CAPACITY_REVIEW" | "LIKELY_TODAY" | "SCHEDULED_WINDOW";
  expiresAt: string;
  facts: { activeBayCapacity: number; activeStaffCapacity: number; availableBayCapacity: number; availableStaffCapacity: number; matchedAppointmentCount: number; openRepairOrders: number; overdueRepairOrders: number; reservedBayCapacity: number; reservedStaffCapacity: number };
  generatedAt: string;
  policyVersion: string;
  promiseConfidence: "CONDITIONAL" | "DO_NOT_PROMISE" | "HIGH";
  recommendation: string;
  snapshotId: string;
  status: "ACCEPT_WITH_CONSTRAINTS" | "MANAGER_REVIEW" | "READY";
};

type VehicleIdentityPreview = {
  decode?: { decoded: VehicleDecode; provider: string; retrievedAt: string; warnings: string[] };
  identity: null | { validationSource: string; vin: string | null; vinState: string };
  potentialDuplicate: null | (ServiceIntakeOptions["vehicles"][number] & { stockNumber?: string | null });
};

type SelectedVehicleDetails = { decoded: VehicleDecode; provider: string; retrievedAt: string | null; source: "LIVE_DECODE" | "STORED_SNAPSHOT"; warnings: string[] };

function record(value: unknown): Record<string, unknown> {
  return value != null && typeof value === "object" && !Array.isArray(value) ? value as Record<string, unknown> : {};
}

function detailsFromSnapshot(value: unknown): SelectedVehicleDetails | null {
  const snapshot = record(value);
  const specifications = record(snapshot.specifications);
  if (!Object.values(specifications).some((item) => item != null && item !== "")) return null;
  return {
    decoded: specifications as VehicleDecode,
    provider: typeof snapshot.provider === "string" ? snapshot.provider : "CANONICAL_SPECIFICATION_SNAPSHOT",
    retrievedAt: typeof snapshot.decodedAt === "string" ? snapshot.decodedAt : null,
    source: "STORED_SNAPSHOT",
    warnings: Array.isArray(snapshot.warnings) ? snapshot.warnings.filter((item): item is string => typeof item === "string") : [],
  };
}

const local = (date: Date) => new Date(date.getTime() - date.getTimezoneOffset() * 60_000).toISOString().slice(0, 16);
const vehicleLabel = (vehicle: ServiceIntakeOptions["vehicles"][number]) =>
  `${[vehicle.year, vehicle.make, vehicle.model].filter(Boolean).join(" ") || "Vehicle"} · ${vehicle.vehicleNumber}`;

const serviceIntakeDraftKey = "service-intake-active-draft-v1";
const directTechnicianRoleNames = new Set(["Mechanic", "Technician"]);
const repairCapableRoleNames = new Set(["Mechanic", "Technician", "Vehicle Operations Lead"]);

function technicianOptions(users: ServiceIntakeOptions["users"]) {
  const assignmentRank = (user: ServiceIntakeOptions["users"][number]) => {
    if (user.roles?.some((role) => directTechnicianRoleNames.has(role))) return 0;
    if (user.roles?.some((role) => repairCapableRoleNames.has(role))) return 1;
    return 2;
  };
  return [...users].sort((left, right) => assignmentRank(left) - assignmentRank(right) || left.name.localeCompare(right.name));
}

function isRepairCapable(user: ServiceIntakeOptions["users"][number]) {
  return Boolean(user.roles?.some((role) => repairCapableRoleNames.has(role)));
}

function staffAssignmentLabel(user: ServiceIntakeOptions["users"][number]) {
  if (isRepairCapable(user)) return `${user.name} — Repair-capable`;
  return `${user.name} — ${user.roles?.[0] ?? "Staff"}`;
}

function buildInitial(options: ServiceIntakeOptions, initialTimestamp: string, initialConcernSummary = "", initialVehicleId = "", initialVehicleRelationship: VehicleRelationshipIntent = "CUSTOMER_VEHICLE"): IntakeState {
  const now = new Date(initialTimestamp);
  const initialTechnician = technicianOptions(options.users)[0];
  return {
    arrivedAt: local(now),
    concernSummary: initialConcernSummary,
    consentReference: "",
    consentStatus: "PENDING",
    consentedAt: "",
    customerId: "",
    frequency: "",
    intakeNotes: "",
    inventoryUnitId: initialVehicleRelationship === "DEALERSHIP_INVENTORY" ? options.inventoryUnits.find((unit) => unit.vehicle.id === initialVehicleId)?.id ?? "" : "",
    keyTag: "",
    keysReceivedCount: 1,
    locationId: options.locations[0]?.id ?? "",
    nextAction: "Complete intake review and prepare for digital vehicle inspection",
    onset: "",
    ownerUserId: initialTechnician?.id ?? "",
    promisedAt: "",
    promiseNotes: "",
    targetAt: local(new Date(now.getTime() + 2 * 60 * 60_000)),
    transportMode: "DROP_OFF",
    urgency: "STANDARD",
    vehicleRelationship: initialVehicleRelationship,
    vehicleId: options.vehicles.some((vehicle) => vehicle.id === initialVehicleId) ? initialVehicleId : "",
    warningIndicators: "",
  };
}

export function buildServiceIntakeVehicleCommand(input: { acquisitionSource?: "AUCTION" | "CONSIGNMENT" | "DEALER_TRANSFER" | "DIRECT_PURCHASE" | "OTHER" | "TRADE"; decoded?: VehicleDecode; description?: string; idempotencyKey: string; locationId: string; make: string; model: string; odometer: string; odometerUnit: "KILOMETERS" | "MILES"; relationship?: "CUSTOMER_VEHICLE" | "DEALERSHIP_INVENTORY"; vin: string; year: string }) {
  const dealershipInventory = input.relationship === "DEALERSHIP_INVENTORY";
  return {
    acquisitionSource: dealershipInventory ? input.acquisitionSource ?? "OTHER" : undefined,
    addMode: "QUICK",
    bodyClass: input.decoded?.bodyClass ?? "",
    cabType: input.decoded?.cabType ?? "",
    description: input.description?.trim().length && input.description.trim().length >= 10 ? input.description.trim().slice(0, 240) : "Vehicle presented for customer service intake.",
    displacementLiters: input.decoded?.displacementLiters ?? "",
    doors: input.decoded?.doors ?? "",
    driveType: input.decoded?.driveType ?? "",
    engineConfiguration: input.decoded?.engineConfiguration ?? "",
    engineCylinders: input.decoded?.engineCylinders ?? "",
    fuelTypePrimary: input.decoded?.fuelTypePrimary ?? "",
    gvwr: input.decoded?.gvwr ?? "",
    idempotencyKey: input.idempotencyKey,
    locationId: input.locationId,
    make: input.make,
    model: input.model,
    nonVinAttested: false,
    odometer: input.odometer,
    odometerUnit: input.odometerUnit,
    reasonCode: dealershipInventory ? "INVENTORY_RECON" : "SERVICE_REPAIR",
    relationship: dealershipInventory ? "DEALERSHIP_INVENTORY" : "CUSTOMER_VEHICLE",
    series: input.decoded?.series ?? "",
    transmissionStyle: input.decoded?.transmissionStyle ?? "",
    trim: input.decoded?.trim ?? "",
    vin: input.vin,
    whereabouts: "AT_DEALERSHIP",
    year: input.year,
  } as const;
}

function appendRepairOrderContext(href: string, repairOrderId: string) {
  const separator = href.includes("?") ? "&" : "?";
  return `${href}${separator}repairOrderId=${encodeURIComponent(repairOrderId)}`;
}

function mergeById<T extends { id: string }>(current: T[], saved: T[] = []) {
  return [...current, ...saved.filter((item) => !current.some((record) => record.id === item.id))];
}

export function ServiceIntakeWorkspace({ initialArrivalQuery = "", initialConcernSummary = "", initialTimestamp, initialVehicleId = "", initialVehicleRelationship = "CUSTOMER_VEHICLE", options, returnTo, showAdvisorReturn = false }: { initialArrivalQuery?: string; initialConcernSummary?: string; initialTimestamp: string; initialVehicleId?: string; initialVehicleRelationship?: VehicleRelationshipIntent; options: ServiceIntakeOptions; returnTo?: string; showAdvisorReturn?: boolean }) {
  const concernRef = useRef<HTMLTextAreaElement>(null);
  const repairOrderDecisionRef = useRef<HTMLElement>(null);
  const arrivalSearchRef = useRef<HTMLInputElement>(null);
  const inventoryUnitSectionRef = useRef<HTMLElement>(null);
  const [form, setForm] = useState<IntakeState>(() => buildInitial(options, initialTimestamp, initialConcernSummary, initialVehicleId, initialVehicleRelationship));
  const [arrivalQuery, setArrivalQuery] = useState(initialArrivalQuery);
  const [arrivalMode, setArrivalMode] = useState<"recent" | "search" | "today">("search");
  const [customerRecords, setCustomerRecords] = useState(options.customers);
  const [vehicleRecords, setVehicleRecords] = useState(options.vehicles);
  const [drawer, setDrawer] = useState<"customer" | null>(null);
  const [newCustomer, setNewCustomer] = useState({ address: "", displayName: "", email: "", phoneNumber: "", preferredContactMethod: "PHONE" });
  const [busy, setBusy] = useState(false);
  const [notice, setNotice] = useState("");
  const [created, setCreated] = useState<{ id: string; repairOrderNumber: string; reused?: boolean } | null>(null);
  const [newRepairOrderConfirmed, setNewRepairOrderConfirmed] = useState(false);
  const [readiness, setReadiness] = useState<ServiceReadiness | null>(null);
  const [readinessError, setReadinessError] = useState("");
  const [readinessLoading, setReadinessLoading] = useState(false);
  const [vehicleAddOpen, setVehicleAddOpen] = useState(false);
  const [vehicleIdentityPreview, setVehicleIdentityPreview] = useState<VehicleIdentityPreview | null>(null);
  const [vehicleIdentityConfirmed, setVehicleIdentityConfirmed] = useState(false);
  const [vehicleOdometer, setVehicleOdometer] = useState("");
  const [vehicleOdometerUnit, setVehicleOdometerUnit] = useState<"KILOMETERS" | "MILES">("MILES");
  const [vehicleQuickDetails, setVehicleQuickDetails] = useState({ make: "", model: "", year: "" });
  const [vehicleIdentityBusy, setVehicleIdentityBusy] = useState(false);
  const [selectedVehicleDetails, setSelectedVehicleDetails] = useState<SelectedVehicleDetails | null>(null);
  const [selectedVehicleDetailsError, setSelectedVehicleDetailsError] = useState("");
  const [selectedVehicleDetailsLoading, setSelectedVehicleDetailsLoading] = useState(false);
  const [safetyIntelligence, setSafetyIntelligence] = useState<NhtsaSafetyIntelligence | null>(null);
  const [safetyIntelligenceError, setSafetyIntelligenceError] = useState("");
  const [safetyIntelligenceLoading, setSafetyIntelligenceLoading] = useState(false);
  const [inventoryUnitRecords, setInventoryUnitRecords] = useState(options.inventoryUnits);
  const [inventoryUnitBusy, setInventoryUnitBusy] = useState(false);
  const [inventoryUnitDraft, setInventoryUnitDraft] = useState(() => {
    const initialDate = new Date(initialTimestamp);
    return { acquisitionSource: "OTHER" as "AUCTION" | "CONSIGNMENT" | "DEALER_TRANSFER" | "DIRECT_PURCHASE" | "OTHER" | "TRADE", financialAcquiredAt: local(initialDate), inventoryNumber: "", nextAction: "Complete inventory receipt and begin recon inspection", ownerUserId: options.users[0]?.id ?? "", targetAt: local(new Date(initialDate.getTime() + 24 * 60 * 60_000)) };
  });

  const normalizedArrivalVin = arrivalQuery.toUpperCase().replace(/[^A-Z0-9]/g, "");
  const arrivalQueryIsVin = /^[A-HJ-NPR-Z0-9]{17}$/.test(normalizedArrivalVin);
  const localVinMatch = arrivalQueryIsVin ? vehicleRecords.find((vehicle) => vehicle.vin?.toUpperCase().replace(/[^A-Z0-9]/g, "") === normalizedArrivalVin) : undefined;

  const arrivalMatches = useMemo(() => {
    const query = arrivalQuery.trim().toLocaleLowerCase();
    const contains = (value: unknown) => String(value ?? "").toLocaleLowerCase().includes(query);
    if (!query && arrivalMode === "today") {
      const today = new Date().toDateString();
      return { appointments: options.appointments.filter((appointment) => appointment.startsAt && new Date(appointment.startsAt).toDateString() === today).slice(0, 8), customers: [], inventoryUnits: [], repairOrders: [], vehicles: [] };
    }
    if (!query && arrivalMode === "recent") return { appointments: [], customers: customerRecords.slice(0, 8), inventoryUnits: [], repairOrders: [], vehicles: [] };
    if (!query) return { appointments: [], customers: [], inventoryUnits: [], repairOrders: [], vehicles: [] };
    return {
      appointments: options.appointments.filter((appointment) => contains(appointment.appointmentNumber) || contains(appointment.title) || contains(appointment.participants[0]?.customer?.displayName) || contains(appointment.vehicles[0]?.vehicle.vin) || contains(appointment.vehicles[0]?.vehicle.licensePlate)).slice(0, 4),
      customers: customerRecords.filter((customer) => contains(customer.displayName) || contains(customer.customerNumber) || contains(customer.phoneNumber) || contains(customer.email)).slice(0, 4),
      inventoryUnits: inventoryUnitRecords.filter((unit) => contains(unit.inventoryNumber) || contains(vehicleLabel(unit.vehicle)) || contains(unit.vehicle.vin) || contains(unit.vehicle.stockNumber)).slice(0, 4),
      repairOrders: options.repairOrders.filter((order) => contains(order.repairOrderNumber) || contains(order.customer?.displayName) || contains(vehicleLabel(order.vehicle)) || contains(order.vehicle.vin) || contains(order.vehicle.licensePlate)).slice(0, 4),
      vehicles: vehicleRecords.filter((vehicle) => contains(vehicleLabel(vehicle)) || contains(vehicle.vin) || contains(vehicle.licensePlate)).slice(0, 4),
    };
  }, [arrivalMode, arrivalQuery, customerRecords, inventoryUnitRecords, options.appointments, options.repairOrders, vehicleRecords]);
  const selectedVehicle = vehicleRecords.find((vehicle) => vehicle.id === form.vehicleId);
  const selectedVehicleOrders = options.repairOrders.filter((order) => order.vehicle.id === form.vehicleId).slice().sort((left, right) => new Date(left.openedAt).getTime() - new Date(right.openedAt).getTime());
  const openVehicleOrders = selectedVehicleOrders.filter((order) => !order.closedAt);
  const sameConcernOrder = form.concernSummary.trim().length >= 10 ? openVehicleOrders.find((order) => isSameRepairOrderConcern(order.serviceVisit.concernSummary, form.concernSummary)) : undefined;
  const requiresRepairOrderDecision = form.concernSummary.trim().length >= 10 && openVehicleOrders.length > 0 && !sameConcernOrder;
  const selectedCustomer = customerRecords.find((customer) => customer.id === form.customerId);
  const selectedInventoryUnit = inventoryUnitRecords.find((unit) => unit.id === form.inventoryUnitId);
  const assignableTechnicians = technicianOptions(options.users);
  const repairCapableTechnicians = assignableTechnicians.filter(isRepairCapable);
  const otherActiveStaff = assignableTechnicians.filter((user) => !isRepairCapable(user));
  const isCustomerVehicle = form.vehicleRelationship === "CUSTOMER_VEHICLE";
  const isDealershipInventory = form.vehicleRelationship === "DEALERSHIP_INVENTORY";
  const canCompleteRelationshipIntake = isCustomerVehicle || isDealershipInventory;
  const selectedLocation = options.locations.find((location) => location.id === form.locationId);
  const selectedOwner = assignableTechnicians.find((user) => user.id === form.ownerUserId);
  const checklist = [
    { label: isDealershipInventory ? "Inventory unit linked" : "Customer selected", ready: isDealershipInventory ? Boolean(form.inventoryUnitId) : isCustomerVehicle && Boolean(form.customerId) },
    { label: "Vehicle selected", ready: Boolean(form.vehicleId) },
    { label: "Concern captured", ready: form.concernSummary.trim().length >= 10 },
    { label: "Repair-order decision", ready: !requiresRepairOrderDecision || newRepairOrderConfirmed },
    { label: "Keys & transportation", ready: form.keysReceivedCount >= 0 && Boolean(form.transportMode) },
    { label: isDealershipInventory ? "Internal recon readiness" : "Live service readiness", ready: isDealershipInventory || Boolean(readiness) },
    { label: "Technician & target", ready: Boolean(form.ownerUserId && form.targetAt) },
    { label: "Consent disposition", ready: form.consentStatus !== "DOCUMENTED" || Boolean(form.consentReference && form.consentedAt) },
  ];
  const ready = checklist.every((item) => item.ready);
  const nextActionLabel = !canCompleteRelationshipIntake
    ? form.vehicleRelationship === "TRADE_ACQUISITION" ? "Continue to Acquisition Review" : "Document Ownership / Custody"
    : isCustomerVehicle && !form.customerId
    ? "Add / Select Customer"
    : !form.vehicleId
      ? "Add / Select Vehicle"
      : isDealershipInventory && !form.inventoryUnitId
        ? "Create / Link Inventory Unit"
      : form.concernSummary.trim().length < 10
        ? isDealershipInventory ? "Capture Inventory Concern" : "Capture Customer Concern"
        : sameConcernOrder
          ? "Use Existing Repair Order"
          : requiresRepairOrderDecision && !newRepairOrderConfirmed
            ? "Choose Existing or New RO"
        : isCustomerVehicle && !readiness
          ? "Refresh Live Readiness"
          : !form.ownerUserId || !form.targetAt
            ? "Assign Technician & Target"
            : form.consentStatus === "DOCUMENTED" && (!form.consentReference || !form.consentedAt)
              ? "Complete Authorization"
              : "Complete Check-In & Create Repair Order";
  const noticeIsError = /could not|invalid|required|cannot|failed|unavailable|complete the required/i.test(notice);
  const arrivalMatchCount = arrivalMatches.appointments.length + arrivalMatches.customers.length + arrivalMatches.inventoryUnits.length + arrivalMatches.repairOrders.length + arrivalMatches.vehicles.length;
  const identityIntelligenceRows = [
    {
      key: "search",
      label: "Search / decode",
      ready: Boolean(selectedVehicle) || arrivalQueryIsVin || arrivalMatchCount > 0,
      value: selectedVehicle ? "Canonical vehicle selected" : arrivalQueryIsVin ? "VIN ready for decode if no local match exists" : arrivalMatchCount ? `${arrivalMatchCount} possible local match${arrivalMatchCount === 1 ? "" : "es"}` : "Search by VIN, stock, plate, customer, appointment, or RO",
    },
    {
      key: "canonical",
      label: "Canonical record",
      ready: Boolean(selectedVehicle),
      value: selectedVehicle ? vehicleLabel(selectedVehicle) : "No vehicle selected yet",
    },
    {
      key: "decode",
      label: "Decoded identity",
      ready: Boolean(selectedVehicleDetails || vehicleIdentityPreview),
      value: selectedVehicleDetails ? `${selectedVehicleDetails.provider} specification snapshot available` : vehicleIdentityPreview ? `Decoded ${[vehicleQuickDetails.year, vehicleQuickDetails.make, vehicleQuickDetails.model].filter(Boolean).join(" ")}` : selectedVehicleDetailsLoading || vehicleIdentityBusy ? "Retrieving decoded vehicle information" : "Decode appears after selection or complete VIN entry",
    },
    {
      key: "source",
      label: isDealershipInventory ? "Inventory source" : "Customer source",
      ready: isDealershipInventory ? Boolean(selectedInventoryUnit) : Boolean(selectedCustomer || readiness?.appointment),
      value: isDealershipInventory ? selectedInventoryUnit ? `${selectedInventoryUnit.inventoryNumber} linked` : "Inventory unit required for internal recon" : selectedCustomer ? selectedCustomer.displayName : readiness?.appointment ? readiness.appointment.appointmentNumber : "Customer or appointment not selected",
    },
  ];

  const evaluateReadiness = useCallback(async () => {
    if (form.vehicleRelationship === "DEALERSHIP_INVENTORY") {
      setReadiness(null);
      setReadinessError("");
      return null;
    }
    if (!form.customerId || !form.vehicleId || !form.locationId || !form.arrivedAt) {
      setReadiness(null);
      setReadinessError("");
      return null;
    }
    setReadinessLoading(true);
    setReadinessError("");
    try {
      const response = await fetch("/api/service-intake/readiness", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ arrivedAt: new Date(form.arrivedAt).toISOString(), customerId: form.customerId, locationId: form.locationId, vehicleId: form.vehicleId }) });
      const body = await response.json().catch(() => ({}));
      if (!response.ok || !body.readiness) throw new Error(body.error ?? "Live service readiness is unavailable.");
      setReadiness(body.readiness as ServiceReadiness);
      return body.readiness as ServiceReadiness;
    } catch (error) {
      setReadiness(null);
      setReadinessError(error instanceof Error ? error.message : "Live service readiness is unavailable.");
      return null;
    } finally {
      setReadinessLoading(false);
    }
  }, [form.arrivedAt, form.customerId, form.locationId, form.vehicleId, form.vehicleRelationship]);

  useEffect(() => {
    const timer = window.setTimeout(() => void evaluateReadiness(), 0);
    return () => window.clearTimeout(timer);
  }, [evaluateReadiness]);

  useEffect(() => {
    const timer = window.setTimeout(() => {
      const saved = window.localStorage.getItem(serviceIntakeDraftKey);
      if (!saved) return;
      try {
        const draft = JSON.parse(saved) as Partial<{
          customerRecords: ServiceIntakeOptions["customers"];
          form: IntakeState;
          inventoryUnitRecords: ServiceIntakeOptions["inventoryUnits"];
          vehicleRecords: ServiceIntakeOptions["vehicles"];
        }>;
        const draftForm = draft.form;
        if (draft.customerRecords) setCustomerRecords((records) => mergeById(records, draft.customerRecords));
        if (draft.vehicleRecords) setVehicleRecords((records) => mergeById(records, draft.vehicleRecords));
        if (draft.inventoryUnitRecords) setInventoryUnitRecords((records) => mergeById(records, draft.inventoryUnitRecords));
        if (draftForm) {
          setForm((current) => {
            const vehicleId = initialVehicleId && options.vehicles.some((vehicle) => vehicle.id === initialVehicleId) ? initialVehicleId : draftForm.vehicleId || current.vehicleId;
            const vehicleRelationship = initialVehicleRelationship === "DEALERSHIP_INVENTORY" ? "DEALERSHIP_INVENTORY" : draftForm.vehicleRelationship || current.vehicleRelationship;
            const availableInventoryUnits = mergeById(options.inventoryUnits, draft.inventoryUnitRecords);
            const inventoryUnitId = vehicleRelationship === "DEALERSHIP_INVENTORY"
              ? availableInventoryUnits.find((unit) => unit.vehicle.id === vehicleId)?.id ?? ""
              : draftForm.inventoryUnitId || current.inventoryUnitId;
            return {
              ...current,
              ...draftForm,
              concernSummary: initialConcernSummary || draftForm.concernSummary || current.concernSummary,
              inventoryUnitId,
              locationId: options.locations.some((location) => location.id === draftForm.locationId) ? draftForm.locationId : current.locationId,
              ownerUserId: technicianOptions(options.users).some((user) => user.id === draftForm.ownerUserId) ? draftForm.ownerUserId : current.ownerUserId,
              vehicleId,
              vehicleRelationship,
            };
          });
        }
        setNotice("Saved service-intake draft restored. Continue from the next required step.");
      } catch {
        window.localStorage.removeItem(serviceIntakeDraftKey);
      }
    }, 0);
    return () => window.clearTimeout(timer);
  }, [initialConcernSummary, initialVehicleId, initialVehicleRelationship, options.inventoryUnits, options.locations, options.users, options.vehicles]);

  useEffect(() => {
    if (form.vehicleRelationship !== "DEALERSHIP_INVENTORY" || !form.vehicleId || form.inventoryUnitId) return;
    const existingUnit = inventoryUnitRecords.find((unit) => unit.vehicle.id === form.vehicleId);
    if (!existingUnit) return;
    const timer = window.setTimeout(() => setForm((current) => ({ ...current, inventoryUnitId: existingUnit.id, locationId: existingUnit.locationId })), 0);
    return () => window.clearTimeout(timer);
  }, [form.inventoryUnitId, form.vehicleId, form.vehicleRelationship, inventoryUnitRecords]);

  useEffect(() => {
    const timer = window.setTimeout(() => {
      window.localStorage.setItem(serviceIntakeDraftKey, JSON.stringify({ customerRecords, form, inventoryUnitRecords, returnTo, savedAt: new Date().toISOString(), vehicleRecords }));
    }, 250);
    return () => window.clearTimeout(timer);
  }, [customerRecords, form, inventoryUnitRecords, returnTo, vehicleRecords]);

  function update<K extends keyof IntakeState>(key: K, value: IntakeState[K]) {
    if (key === "concernSummary" || key === "vehicleId") setNewRepairOrderConfirmed(false);
    setForm((current) => ({ ...current, [key]: value }));
  }

  function addPrompt(prompt: string) {
    setForm((current) => ({ ...current, concernSummary: current.concernSummary ? `${current.concernSummary.trim()} ${prompt}` : prompt }));
  }

  function flagSafetyReview() {
    const concernMatches = safetyIntelligence?.recalls.filter((recall) => recall.relevance === "CONCERN_MATCH").length ?? 0;
    const parkGuidance = safetyIntelligence?.recalls.filter((recall) => recall.parkIt || recall.parkOutside).length ?? 0;
    const advisory = `[NHTSA advisory] ${concernMatches} possible concern match${concernMatches === 1 ? "" : "es"}; ${parkGuidance} model campaign${parkGuidance === 1 ? "" : "s"} with park guidance. VIN-specific recall status must be verified before repair decisions.`;
    setForm((current) => ({ ...current, intakeNotes: current.intakeNotes.includes("[NHTSA advisory]") ? current.intakeNotes : [current.intakeNotes.trim(), advisory].filter(Boolean).join("\n"), urgency: "SAFETY_CONCERN" }));
    setNotice("Safety review flagged for technician handoff. The advisory does not confirm an open recall; verify the VIN with NHTSA or the manufacturer.");
  }

  function chooseCustomer(customerId: string) {
    update("customerId", customerId);
    setArrivalQuery("");
    setNotice(form.vehicleId ? "Customer selected. Capture the concern, then refresh live readiness." : "Customer selected. Add or select the vehicle next.");
  }

  function chooseVehicle(vehicleId: string) {
    const inventoryUnitId = form.vehicleRelationship === "DEALERSHIP_INVENTORY" ? inventoryUnitRecords.find((unit) => unit.vehicle.id === vehicleId)?.id ?? "" : "";
    setNewRepairOrderConfirmed(false);
    setForm((current) => ({ ...current, inventoryUnitId, vehicleId }));
    setArrivalQuery("");
    setNotice(form.vehicleRelationship === "DEALERSHIP_INVENTORY" ? inventoryUnitId ? "Dealership vehicle and its active inventory unit were selected." : "Dealership vehicle selected. Create its governed inventory unit to continue internal recon." : form.customerId ? "Vehicle selected. Capture the concern, then refresh live readiness." : "Vehicle selected. Add or select the customer next.");
  }

  function chooseVehicleRelationship(vehicleRelationship: VehicleRelationshipIntent) {
    const inventoryUnitId = vehicleRelationship === "DEALERSHIP_INVENTORY" && form.vehicleId ? inventoryUnitRecords.find((unit) => unit.vehicle.id === form.vehicleId)?.id ?? "" : "";
    setForm((current) => ({
      ...current,
      consentStatus: vehicleRelationship === "DEALERSHIP_INVENTORY" ? "NOT_REQUIRED" : current.consentStatus === "NOT_REQUIRED" ? "PENDING" : current.consentStatus,
      customerId: vehicleRelationship === "CUSTOMER_VEHICLE" ? current.customerId : "",
      inventoryUnitId,
      nextAction: vehicleRelationship === "DEALERSHIP_INVENTORY" ? "Complete inventory receipt and begin recon inspection" : "Complete intake review and prepare for digital vehicle inspection",
      transportMode: vehicleRelationship === "DEALERSHIP_INVENTORY" ? "INTERNAL_TRANSPORT" : current.transportMode === "INTERNAL_TRANSPORT" ? "DROP_OFF" : current.transportMode,
      vehicleRelationship,
    }));
    setDrawer(null);
    setNotice(vehicleRelationship === "DEALERSHIP_INVENTORY" ? inventoryUnitId ? "Dealership inventory selected. No customer is required; the existing inventory unit is linked." : "Dealership inventory selected. No customer is required; select a vehicle and create or link its inventory unit." : vehicleRelationship === "CUSTOMER_VEHICLE" ? "Customer vehicle selected. Add or select the canonical customer and vehicle." : vehicleRelationship === "TRADE_ACQUISITION" ? "Trade/acquisition candidates continue through governed appraisal before an inventory unit is created." : "Ownership is unconfirmed. Document custody and establish the relationship before creating customer or inventory work.");
  }

  function chooseAppointment(appointment: ServiceIntakeOptions["appointments"][number]) {
    const customer = appointment.participants[0]?.customer;
    const vehicle = appointment.vehicles[0]?.vehicle;
    if (customer && !customerRecords.some((record) => record.id === customer.id)) setCustomerRecords((records) => [...records, customer]);
    if (vehicle && !vehicleRecords.some((record) => record.id === vehicle.id)) setVehicleRecords((records) => [...records, vehicle]);
    setNewRepairOrderConfirmed(false);
    setForm((current) => ({ ...current, customerId: customer?.id ?? current.customerId, vehicleId: vehicle?.id ?? current.vehicleId, locationId: appointment.locationId || current.locationId }));
    setArrivalQuery("");
    setNotice("Appointment context selected. Confirm the concern and live readiness before creating the repair order.");
  }

  const loadSelectedVehicleDetails = useCallback(async (vehicleId: string) => {
    const vehicle = vehicleRecords.find((record) => record.id === vehicleId) ?? options.vehicles.find((record) => record.id === vehicleId);
    setSelectedVehicleDetailsError("");
    if (!vehicle) {
      setSelectedVehicleDetails(null);
      return;
    }
    const stored = detailsFromSnapshot(vehicle.specificationSnapshot);
    if (stored) {
      setSelectedVehicleDetails(stored);
      return;
    }
    if (!vehicle.vin) {
      setSelectedVehicleDetails(null);
      setSelectedVehicleDetailsError("This canonical vehicle does not have a VIN or a decoded specification snapshot.");
      return;
    }
    setSelectedVehicleDetailsLoading(true);
    try {
      const response = await fetch("/api/inventory-console/workflows/add-vehicle/preview", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ lookupType: "VIN", vin: vehicle.vin }) });
      const body = await response.json().catch(() => ({}));
      if (!response.ok || !body.decode?.decoded) throw new Error(body.error ?? "Decoded vehicle information is unavailable.");
      setSelectedVehicleDetails({ decoded: body.decode.decoded as VehicleDecode, provider: String(body.decode.provider ?? "NHTSA_VPIC"), retrievedAt: typeof body.decode.retrievedAt === "string" ? body.decode.retrievedAt : null, source: "LIVE_DECODE", warnings: Array.isArray(body.decode.warnings) ? body.decode.warnings.filter((item: unknown): item is string => typeof item === "string") : [] });
    } catch (error) {
      setSelectedVehicleDetails(null);
      setSelectedVehicleDetailsError(error instanceof Error ? error.message : "Decoded vehicle information is unavailable.");
    } finally {
      setSelectedVehicleDetailsLoading(false);
    }
  }, [options.vehicles, vehicleRecords]);

  useEffect(() => {
    const timer = window.setTimeout(() => {
      if (form.vehicleId) void loadSelectedVehicleDetails(form.vehicleId);
      else {
        setSelectedVehicleDetails(null);
        setSelectedVehicleDetailsError("");
      }
    }, 0);
    return () => window.clearTimeout(timer);
  }, [form.vehicleId, loadSelectedVehicleDetails]);

  const loadSafetyIntelligence = useCallback(async () => {
    if (!selectedVehicle || !selectedVehicleDetails) {
      setSafetyIntelligence(null);
      setSafetyIntelligenceError("");
      return;
    }
    const year = selectedVehicleDetails.decoded.modelYear ?? selectedVehicle.year;
    const make = selectedVehicleDetails.decoded.make ?? selectedVehicle.make;
    const model = selectedVehicleDetails.decoded.model ?? selectedVehicle.model;
    if (!year || !make || !model) {
      setSafetyIntelligence(null);
      setSafetyIntelligenceError("Year, make, and model are required before safety intelligence can be checked.");
      return;
    }
    setSafetyIntelligenceLoading(true);
    setSafetyIntelligenceError("");
    try {
      const response = await fetch("/api/service-intake/safety-intelligence", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ concern: form.concernSummary, make, model, year }) });
      const body = await response.json().catch(() => ({}));
      if (!response.ok || !body.safetyIntelligence) throw new Error(body.error ?? "Vehicle safety intelligence is unavailable.");
      setSafetyIntelligence(body.safetyIntelligence as NhtsaSafetyIntelligence);
    } catch (error) {
      setSafetyIntelligence(null);
      setSafetyIntelligenceError(error instanceof Error ? error.message : "Vehicle safety intelligence is unavailable.");
    } finally {
      setSafetyIntelligenceLoading(false);
    }
  }, [form.concernSummary, selectedVehicle, selectedVehicleDetails]);

  useEffect(() => {
    const timer = window.setTimeout(() => void loadSafetyIntelligence(), form.concernSummary.trim() ? 650 : 0);
    return () => window.clearTimeout(timer);
  }, [form.concernSummary, loadSafetyIntelligence]);

  function runArrivalSearch() {
    setArrivalMode("search");
    const query = arrivalQuery.trim();
    if (query.length < 2) {
      arrivalSearchRef.current?.focus();
      setNotice("Enter at least two characters, or scan or enter the complete VIN, before searching local records.");
      return;
    }
    if (arrivalQueryIsVin && !localVinMatch) {
      setVehicleAddOpen(true);
      resetVehicleIdentityPreview();
      setNotice("No local vehicle matches this VIN. Decode it below to add and select the canonical vehicle without leaving intake.");
      return;
    }
    setVehicleAddOpen(false);
    resetVehicleIdentityPreview();
    const matchCount = arrivalMatches.appointments.length + arrivalMatches.customers.length + arrivalMatches.inventoryUnits.length + arrivalMatches.repairOrders.length + arrivalMatches.vehicles.length;
    setNotice(matchCount ? `${matchCount} local match${matchCount === 1 ? "" : "es"} found. Select the correct ${isDealershipInventory ? "inventory unit or vehicle" : "customer, vehicle, appointment, or repair order"} below.` : isDealershipInventory ? "No matching local inventory record was found. Enter the complete VIN to decode and add the dealership vehicle." : "No matching local record was found. Add a customer, or enter the complete VIN to decode and add a vehicle.");
  }

  function runNextRequiredAction() {
    if (!canCompleteRelationshipIntake) {
      setNotice(form.vehicleRelationship === "TRADE_ACQUISITION" ? "Continue to Acquisition Review to establish an eligible inventory relationship." : "Document custody and establish ownership before creating customer or inventory work.");
      return;
    }
    if (isCustomerVehicle && !form.customerId) {
      setDrawer("customer");
      setNotice("Add or select the canonical customer before the repair order can be created.");
      return;
    }
    if (!form.vehicleId) {
      setVehicleAddOpen(true);
      arrivalSearchRef.current?.focus();
      setNotice(arrivalQueryIsVin ? "This VIN is not in local records. Decode it to add and select the canonical vehicle." : "Search the local database by VIN first. If no vehicle is found, enter the 17-character VIN to decode and add it here.");
      return;
    }
    if (isDealershipInventory && !form.inventoryUnitId) {
      setInventoryUnitDraft((current) => current.inventoryNumber.trim() || !selectedVehicle?.stockNumber
        ? current
        : { ...current, inventoryNumber: selectedVehicle.stockNumber.toUpperCase() });
      setNotice("Complete the highlighted inventory-unit details below, then create and link the governed unit for this vehicle.");
      window.requestAnimationFrame(() => {
        inventoryUnitSectionRef.current?.scrollIntoView({ behavior: "smooth", block: "center" });
        window.requestAnimationFrame(() => {
          const inventoryNumberInput = inventoryUnitSectionRef.current?.querySelector<HTMLInputElement>('input[placeholder="Unique inventory number"]');
          inventoryNumberInput?.focus();
          inventoryNumberInput?.select();
        });
      });
      return;
    }
    if (form.concernSummary.trim().length < 10) {
      concernRef.current?.focus();
      setNotice("Capture the customer concern before creating the repair order.");
      return;
    }
    if (requiresRepairOrderDecision && !newRepairOrderConfirmed) {
      repairOrderDecisionRef.current?.scrollIntoView({ behavior: "smooth", block: "center" });
      setNotice("This VIN already has open repair work. Choose an existing RO or confirm a separate RO for the different concern.");
      return;
    }
    if (isCustomerVehicle && !readiness) {
      void evaluateReadiness();
      setNotice("Refreshing live readiness. The repair order can be created after appointment and capacity facts are available.");
      return;
    }
    setNotice("Complete the remaining owner, target, or authorization fields before creating the repair order.");
  }

  function resetVehicleIdentityPreview() {
    setVehicleIdentityPreview(null);
    setVehicleIdentityConfirmed(false);
    setVehicleOdometer("");
    setVehicleQuickDetails({ make: "", model: "", year: "" });
  }

  async function decodeVehicleForIntake() {
    if (!arrivalQueryIsVin) {
      setVehicleAddOpen(true);
      arrivalSearchRef.current?.focus();
      setNotice("Enter the complete 17-character VIN. Letters I, O, and Q are not valid VIN characters.");
      return;
    }
    if (localVinMatch) {
      chooseVehicle(localVinMatch.id);
      setVehicleAddOpen(false);
      setNotice("The VIN already exists in local records and was selected for this intake.");
      return;
    }
    setVehicleIdentityBusy(true);
    setNotice("");
    try {
      const response = await fetch("/api/inventory-console/workflows/add-vehicle/preview", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ lookupType: "VIN", vin: normalizedArrivalVin }) });
      const body = await response.json().catch(() => ({}));
      if (!response.ok || !body.identity) throw new Error(body.error ?? "VIN could not be decoded and validated.");
      const preview = body as VehicleIdentityPreview;
      if (preview.potentialDuplicate) {
        const existing = preview.potentialDuplicate;
        setVehicleRecords((records) => records.some((record) => record.id === existing.id) ? records : [...records, existing]);
        chooseVehicle(existing.id);
        setVehicleAddOpen(false);
        resetVehicleIdentityPreview();
        setNotice("The VIN already belongs to an existing canonical vehicle. That vehicle was selected; no duplicate was created.");
        return;
      }
      if (!preview.decode) throw new Error("NHTSA did not return enough information to identify this vehicle.");
      setVehicleIdentityPreview(preview);
      setVehicleQuickDetails({ make: preview.decode.decoded.make, model: preview.decode.decoded.model, year: String(preview.decode.decoded.modelYear) });
      setVehicleIdentityConfirmed(false);
      setVehicleAddOpen(true);
      setNotice("VIN decoded. Confirm the vehicle and odometer to add it to the canonical registry and continue this intake.");
    } catch (error) {
      resetVehicleIdentityPreview();
      setNotice(error instanceof Error ? error.message : "VIN could not be decoded and validated.");
    } finally {
      setVehicleIdentityBusy(false);
    }
  }

  async function createAndSelectDecodedVehicle() {
    if (!vehicleIdentityPreview?.identity?.vin || !vehicleIdentityConfirmed || !vehicleOdometer || !vehicleQuickDetails.year || !vehicleQuickDetails.make.trim() || !vehicleQuickDetails.model.trim()) {
      setNotice("Confirm the decoded vehicle and enter its current odometer before adding it.");
      return;
    }
    setVehicleIdentityBusy(true);
    setNotice("");
    try {
      const decoded = vehicleIdentityPreview.decode?.decoded;
      const response = await fetch("/api/inventory-console/workflows/add-vehicle", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify(buildServiceIntakeVehicleCommand({ acquisitionSource: inventoryUnitDraft.acquisitionSource, decoded, description: form.concernSummary, idempotencyKey: crypto.randomUUID(), locationId: form.locationId, make: vehicleQuickDetails.make, model: vehicleQuickDetails.model, odometer: vehicleOdometer, odometerUnit: vehicleOdometerUnit, relationship: isDealershipInventory ? "DEALERSHIP_INVENTORY" : "CUSTOMER_VEHICLE", vin: vehicleIdentityPreview.identity.vin, year: vehicleQuickDetails.year })),
      });
      const body = await response.json().catch(() => ({}));
      if (!response.ok || !body.result?.id) throw new Error(body.error ?? "Vehicle could not be added.");
      if (body.result.duplicateReviewId) {
        setNotice("A possible identity match was found while creating the vehicle. It was routed to duplicate review and was not selected for intake.");
        return;
      }
      const vehicle = {
        id: String(body.result.id),
        make: vehicleQuickDetails.make,
        model: vehicleQuickDetails.model,
        specificationSnapshot: decoded ? { decodedAt: vehicleIdentityPreview.decode?.retrievedAt ?? new Date().toISOString(), provider: vehicleIdentityPreview.decode?.provider ?? "NHTSA_VPIC", specifications: decoded, warnings: vehicleIdentityPreview.decode?.warnings ?? [] } : null,
        vehicleNumber: String(body.result.vehicleNumber),
        version: Number(body.version ?? body.result.version ?? 1),
        vin: vehicleIdentityPreview.identity.vin,
        year: Number(vehicleQuickDetails.year),
      } satisfies ServiceIntakeOptions["vehicles"][number];
      setVehicleRecords((records) => records.some((record) => record.id === vehicle.id) ? records : [...records, vehicle]);
      update("vehicleId", vehicle.id);
      let relationshipLinked = true;
      if (form.customerId) {
        const relationshipResponse = await fetch(`/api/vehicles/${encodeURIComponent(vehicle.id)}/commands`, { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ action: "ADD_RELATIONSHIP", customerId: form.customerId, effectiveFrom: new Date().toISOString(), expectedVersion: Number(body.version ?? body.result.version ?? 1), idempotencyKey: crypto.randomUUID(), locationId: form.locationId, reason: "Link the newly created service vehicle to the intake customer.", relationshipType: "SERVICE_ONLY", sourceCode: "SERVICE_INTAKE" }) });
        relationshipLinked = relationshipResponse.ok;
      }
      setArrivalQuery("");
      setVehicleAddOpen(false);
      resetVehicleIdentityPreview();
      setNotice(relationshipLinked ? "Vehicle decoded, added to the canonical registry, and selected. Continue the intake below." : "Vehicle decoded, added, and selected. Its customer relationship still requires review.");
    } catch (error) {
      setNotice(error instanceof Error ? error.message : "Vehicle could not be added.");
    } finally {
      setVehicleIdentityBusy(false);
    }
  }

  async function createInventoryUnitForSelectedVehicle() {
    const existingUnit = selectedVehicle ? inventoryUnitRecords.find((unit) => unit.vehicle.id === selectedVehicle.id) : undefined;
    if (existingUnit) {
      setForm((current) => ({ ...current, inventoryUnitId: existingUnit.id, locationId: existingUnit.locationId }));
      setNotice(`Existing inventory unit ${existingUnit.inventoryNumber} linked. No duplicate unit was created.`);
      return;
    }
    if (!selectedVehicle || !inventoryUnitDraft.inventoryNumber.trim() || !inventoryUnitDraft.financialAcquiredAt || !inventoryUnitDraft.targetAt) {
      setNotice("Select the dealership vehicle and complete the inventory number, acquisition time, and stage target.");
      return;
    }
    setInventoryUnitBusy(true);
    setNotice("");
    try {
      const hasControlledRelationship = selectedVehicle.registryRelationships?.some((relationship) => ["DEALERSHIP_OWNED", "TRADE_IN", "CONSIGNMENT"].includes(relationship.relationshipType));
      let vehicleVersion = Number(selectedVehicle.version ?? 0);
      if (!hasControlledRelationship) {
        const relationshipResponse = await fetch(`/api/vehicles/${encodeURIComponent(selectedVehicle.id)}/commands`, { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ action: "ADD_RELATIONSHIP", effectiveFrom: new Date(inventoryUnitDraft.financialAcquiredAt).toISOString(), expectedVersion: vehicleVersion, idempotencyKey: crypto.randomUUID(), locationId: form.locationId, notes: `Inventory intake acquisition source: ${inventoryUnitDraft.acquisitionSource}.`, reason: "Establish dealership-controlled ownership before creating the governed inventory unit.", relationshipType: inventoryUnitDraft.acquisitionSource === "TRADE" ? "TRADE_IN" : inventoryUnitDraft.acquisitionSource === "CONSIGNMENT" ? "CONSIGNMENT" : "DEALERSHIP_OWNED", sourceCode: "INVENTORY_INTAKE", sourceReference: inventoryUnitDraft.acquisitionSource }) });
        const relationshipBody = await relationshipResponse.json().catch(() => ({}));
        if (!relationshipResponse.ok) throw new Error(relationshipBody.error ?? "The dealership-controlled vehicle relationship could not be established.");
        vehicleVersion = Number(relationshipBody.version ?? relationshipBody.result?.version ?? vehicleVersion + 1);
        setVehicleRecords((records) => records.map((vehicle) => vehicle.id === selectedVehicle.id ? { ...vehicle, registryRelationships: [...(vehicle.registryRelationships ?? []), { relationshipType: inventoryUnitDraft.acquisitionSource === "TRADE" ? "TRADE_IN" : inventoryUnitDraft.acquisitionSource === "CONSIGNMENT" ? "CONSIGNMENT" : "DEALERSHIP_OWNED" }], version: vehicleVersion } : vehicle));
      }
      const response = await fetch("/api/inventory-units", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ financialAcquiredAt: new Date(inventoryUnitDraft.financialAcquiredAt).toISOString(), idempotencyKey: crypto.randomUUID(), inventoryNumber: inventoryUnitDraft.inventoryNumber, locationId: form.locationId, nextAction: inventoryUnitDraft.nextAction, operatingState: "ACTIVE", ownerUserId: inventoryUnitDraft.ownerUserId, reason: "Create dealership inventory unit from governed vehicle intake.", stateReason: null, targetAt: new Date(inventoryUnitDraft.targetAt).toISOString(), vehicleId: selectedVehicle.id }) });
      const body = await response.json().catch(() => ({}));
      if (!response.ok || !body.result?.id) throw new Error(body.error ?? "The inventory unit could not be created.");
      const unit = { id: String(body.result.id), inventoryNumber: String(body.result.inventoryNumber ?? inventoryUnitDraft.inventoryNumber.toUpperCase()), locationId: form.locationId, vehicle: { ...selectedVehicle, version: vehicleVersion } } satisfies ServiceIntakeOptions["inventoryUnits"][number];
      setInventoryUnitRecords((records) => records.some((record) => record.id === unit.id) ? records : [...records, unit]);
      setForm((current) => ({ ...current, inventoryUnitId: unit.id }));
      setNotice(`Inventory unit ${unit.inventoryNumber} created and linked. No customer record is required; continue the internal recon intake.`);
    } catch (error) {
      setNotice(error instanceof Error ? error.message : "The inventory unit could not be created.");
    } finally {
      setInventoryUnitBusy(false);
    }
  }

  async function createCustomer() {
    setBusy(true);
    setNotice("");
    try {
      const response = await fetch("/api/service-intake/customers", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ ...newCustomer, locationId: form.locationId }) });
      const body = await response.json().catch(() => ({}));
      if (!response.ok || !body.customer) throw new Error(body.error ?? "Customer could not be created.");
      const customer = body.customer as ServiceIntakeOptions["customers"][number];
      setCustomerRecords((records) => records.some((record) => record.id === customer.id) ? records : [...records, customer]);
      update("customerId", customer.id);
      setDrawer(null);
      setNewCustomer({ address: "", displayName: "", email: "", phoneNumber: "", preferredContactMethod: "PHONE" });
      setNotice(body.duplicate ? "An existing matching customer was selected; no duplicate was created." : "Customer created and selected for this intake.");
    } catch (error) {
      setNotice(error instanceof Error ? error.message : "Customer could not be created.");
    } finally {
      setBusy(false);
    }
  }

  async function saveTechnicianToRepairOrder(repairOrderId: string) {
    const assignmentResponse = await fetch(`/api/repair-orders/${encodeURIComponent(repairOrderId)}/technician-assignment`, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({
        idempotencyKey: crypto.randomUUID(),
        reason: "Carry the explicitly selected intake technician onto the matched Repair Order.",
        technicianUserId: form.ownerUserId,
      }),
    });
    const assignmentBody = await assignmentResponse.json().catch(() => ({}));
    if (!assignmentResponse.ok) throw new Error(assignmentBody.error ?? "The Repair Order was found, but its technician assignment could not be saved.");
  }

  async function openExistingRepairOrder(repairOrderId: string) {
    setBusy(true);
    setNotice("");
    try {
      await saveTechnicianToRepairOrder(repairOrderId);
      window.location.assign(`/vehicles/repair-workbench?repairOrderId=${encodeURIComponent(repairOrderId)}`);
    } catch (error) {
      setNotice(error instanceof Error ? error.message : "The technician assignment could not be saved.");
    } finally {
      setBusy(false);
    }
  }

  async function submit(event: FormEvent) {
    event.preventDefault();
    if (!ready) {
      setNotice("Complete the required check-in items before creating the repair order.");
      return;
    }
    setBusy(true);
    setNotice("");
    const structuredNotes = [
      form.onset && `Onset: ${form.onset}`,
      form.frequency && `Frequency: ${form.frequency}`,
      form.warningIndicators && `Warning indicators: ${form.warningIndicators}`,
      form.urgency && `Advisor urgency: ${form.urgency}`,
      form.intakeNotes.trim(),
    ].filter(Boolean).join("\n");
    try {
      const freshReadiness = isDealershipInventory ? null : await evaluateReadiness();
      if (isCustomerVehicle && !freshReadiness) throw new Error("A current service-readiness evaluation is required before check-in.");
      const appointment = freshReadiness?.appointment ?? null;
      if (appointment && appointment.attendanceStatus === "EXPECTED") {
        const commandKey = `service-intake-check-in-${appointment.id}-${crypto.randomUUID()}`;
        const appointmentResponse = await fetch("/api/appointments/commands", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ appointmentId: appointment.id, commandType: "CHECK_IN", correlationId: commandKey, expectedAppointmentVersion: appointment.expectedVersion, idempotencyKey: commandKey, payload: {} }) });
        const appointmentBody = await appointmentResponse.json().catch(() => ({}));
        if (!appointmentResponse.ok || !appointmentBody.accepted) throw new Error(appointmentBody.error ?? appointmentBody.execution?.rejectionReasons?.join(" ") ?? "The matched appointment could not be checked in.");
      }
      const response = await fetch("/api/service-intake/repair-orders", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          appointmentId: appointment?.id ?? null,
          arrivedAt: new Date(form.arrivedAt).toISOString(),
          concernSummary: form.concernSummary,
          consentReference: form.consentReference || null,
          consentStatus: form.consentStatus,
          consentedAt: form.consentedAt ? new Date(form.consentedAt).toISOString() : null,
          customerId: isDealershipInventory || appointment ? null : form.customerId,
          idempotencyKey: crypto.randomUUID(),
          intakeNotes: structuredNotes || null,
          intakeSource: isDealershipInventory ? "INVENTORY_RECON" : appointment ? "APPOINTMENT" : "WALK_IN",
          inventoryUnitId: isDealershipInventory ? form.inventoryUnitId : null,
          keyTag: form.keyTag || null,
          keysReceivedCount: form.keysReceivedCount,
          locationId: form.locationId,
          nextAction: form.nextAction,
          operatingState: "ACTIVE",
          ownerUserId: form.ownerUserId,
          promisedAt: form.promisedAt ? new Date(form.promisedAt).toISOString() : null,
          promiseNotes: form.promiseNotes || null,
          readinessSnapshotId: freshReadiness?.snapshotId ?? null,
          reason: isDealershipInventory
            ? "Create governed internal inventory-recon intake with an attributable inventory unit, concern, custody, owner, and target."
            : appointment
            ? "Create governed appointment service intake with attributable customer, vehicle, concern, custody, and readiness facts."
            : "Create governed walk-in service intake with attributable customer, vehicle, concern, custody, and readiness facts.",
          stateReason: null,
          targetAt: new Date(form.targetAt).toISOString(),
          transportMode: form.transportMode,
          vehicleId: isDealershipInventory || appointment ? null : form.vehicleId,
        }),
      });
      const body = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(body.error ?? "Vehicle check-in failed.");
      const result = body.result as { duplicateReason?: string; id: string; repairOrderNumber: string };
      const reused = body.duplicate === true;
      if (reused) await saveTechnicianToRepairOrder(result.id);
      setCreated({ ...result, reused });
      window.localStorage.removeItem(serviceIntakeDraftKey);
      setNotice(reused ? `${result.repairOrderNumber} already covers this vehicle and concern. The existing RO was opened; no duplicate was created.` : `${result.repairOrderNumber} was created for this vehicle and new concern.`);
      if (returnTo) window.location.assign(appendRepairOrderContext(returnTo, result.id));
    } catch (error) {
      setNotice(error instanceof Error ? error.message : "Vehicle check-in failed.");
    } finally {
      setBusy(false);
    }
  }

  if (created) {
    const returnHref = returnTo ? appendRepairOrderContext(returnTo, created.id) : "/vehicles/shop-recon";
    return <section className="service-intake-shell service-intake-complete">
      <div className="sic-success-icon"><CheckCircle2 /></div>
      <p>{created.reused ? "Existing repair order found" : "Check-in complete"}</p>
      <h1>{created.repairOrderNumber}</h1>
      <span>{isDealershipInventory ? selectedInventoryUnit?.inventoryNumber ?? "Dealership inventory" : selectedCustomer?.displayName} · {selectedVehicle ? vehicleLabel(selectedVehicle) : "Vehicle"}</span>
      <div className="sic-success-summary"><strong>{created.reused ? "No duplicate created" : "Ready for intake review"}</strong><span>{created.reused ? "The VIN and concern matched this open repair order, so the existing governed record was used." : "The governed repair order, customer concern, custody details, owner, target, and audit evidence are now available to Shop & Recon."}</span></div>
      <div className="sic-success-actions"><Link className="primary" href={returnTo ? returnHref : `/vehicles/repair-workbench?repairOrderId=${created.id}`}>{returnTo ? "Return to Labor Guide" : "Open repair workbench"} <ChevronRight /></Link><Link href={`/vehicles/shop-dispatch?repairOrderId=${created.id}`}>Open Shop Dispatch</Link><Link href={`/vehicles/repair-workbench?repairOrderId=${created.id}`}>Open repair workbench</Link><Link href="/vehicles/shop-recon">Return to Shop &amp; Recon</Link></div>
    </section>;
  }

  return <form className="service-intake-shell sic-reference-v2" onSubmit={submit}>
    <header className="sic-header">
      <div>{showAdvisorReturn ? <BackToServiceAdvisorWorkspace className="advisor-return-link sic-advisor-return" /> : <Link className="sic-back-to-shop" href={returnTo ?? "/vehicles/shop-recon"}>{returnTo ? "← Back to Labor Guide" : "← Back to Shop & Recon"}</Link>}<span className="sic-advisor-label">Advisor Workspace</span><i /><h1>Check In Vehicle</h1><span className="sic-governed"><ShieldCheck />Governed intake</span></div>
      <div className="sic-header-state"><ShieldCheck /><span><strong>Governed intake</strong>Canonical records, policy gates, and audit history are enforced.</span></div>
    </header>

    <nav aria-label="Check-in progress" className="sic-progress">
      <span className="active"><b>1</b><i>Find Arrival</i></span><em /><span><b>2</b><i>{isDealershipInventory ? "Inventory Unit & Custody" : "Appointment & Capacity"}</i></span><em /><span><b>3</b><i>{isDealershipInventory ? "Inventory Scope" : "Customer Concern"}</i></span><em /><span><b>4</b><i>Authorization &amp; Handoff</i></span>
    </nav>

    {notice ? <div className={noticeIsError ? "sic-notice error" : "sic-notice"} role="status"><ClipboardCheck />{notice}</div> : null}

    <div className="sic-layout">
      <main className="sic-main">
        <section className="sic-card sic-identity sic-find-arrival">
          <header><span>1</span><div><h2>{isDealershipInventory ? "Find Dealership Vehicle or Inventory Unit" : "Find Customer, Vehicle, or Appointment"}</h2><p>{isDealershipInventory ? "Search canonical vehicle and inventory records before creating internal recon work. No customer is required." : "Search canonical records before creating work. No match? Create the missing record without leaving intake."}</p></div></header>
          <section className="sic-relationship-intent" aria-label="Vehicle relationship to dealership"><div><small>First, identify the relationship</small><strong>Who is this vehicle being handled for?</strong></div><div><button className={isCustomerVehicle ? "active" : ""} onClick={() => chooseVehicleRelationship("CUSTOMER_VEHICLE")} type="button"><UserRound /><span><b>Customer vehicle</b><small>Customer required</small></span></button><button className={isDealershipInventory ? "active inventory" : ""} onClick={() => chooseVehicleRelationship("DEALERSHIP_INVENTORY")} type="button"><CarFront /><span><b>Dealership inventory</b><small>No customer required</small></span></button><button className={form.vehicleRelationship === "TRADE_ACQUISITION" ? "active" : ""} onClick={() => chooseVehicleRelationship("TRADE_ACQUISITION")} type="button"><ClipboardCheck /><span><b>Trade / acquisition</b><small>Appraisal required</small></span></button><button className={form.vehicleRelationship === "OWNERSHIP_UNCONFIRMED" ? "active" : ""} onClick={() => chooseVehicleRelationship("OWNERSHIP_UNCONFIRMED")} type="button"><ShieldAlert /><span><b>Ownership unconfirmed</b><small>Document custody</small></span></button></div></section>
          {!canCompleteRelationshipIntake ? <div className="sic-relationship-route"><ShieldAlert /><div><strong>{form.vehicleRelationship === "TRADE_ACQUISITION" ? "Inventory cannot begin before governed acquisition" : "Ownership must be established before work is created"}</strong><span>{form.vehicleRelationship === "TRADE_ACQUISITION" ? "Continue through appraisal and financial acquisition; that workflow creates the eligible inventory unit once authority is confirmed." : "Record custody and ownership evidence. Do not create a customer or dealership inventory record merely to bypass this decision."}</span></div><Link href={form.vehicleRelationship === "TRADE_ACQUISITION" ? "/vehicles/acquisition-appraisal" : selectedVehicle ? `/vehicles/360/${selectedVehicle.id}` : "/vehicles"}>{form.vehicleRelationship === "TRADE_ACQUISITION" ? "Continue to Acquisition Review" : "Open Vehicle Records"}</Link></div> : null}
          <div className="sic-arrival-search"><Search /><input aria-label={isDealershipInventory ? "Find dealership vehicle or inventory unit" : "Find customer, vehicle, or appointment"} onChange={(event) => { setArrivalMode("search"); setArrivalQuery(event.target.value); setVehicleAddOpen(false); resetVehicleIdentityPreview(); }} onKeyDown={(event) => { if (event.key === "Enter") { event.preventDefault(); runArrivalSearch(); } }} placeholder={isDealershipInventory ? "Search VIN, stock number, inventory number, plate, make, or model..." : "Search name, phone, email, VIN, plate, appointment, or RO..."} ref={arrivalSearchRef} type="search" value={arrivalQuery} /><button onClick={runArrivalSearch} type="button"><Search />Search</button></div>
          <section className="sic-vehicle-identity-intelligence" aria-label="Vehicle identity intelligence"><header><Search /><div><small>Vehicle Identity Intelligence</small><strong>Search, decode, and duplicate guard are always available at intake.</strong><span>{isDealershipInventory ? "Use this before opening internal recon so the shop receives the correct inventory unit." : "Use this before creating customer work so the shop receives the correct customer and vehicle."}</span></div></header><div>{identityIntelligenceRows.map((row) => <article className={row.ready ? "ready" : ""} key={row.key}>{row.ready ? <CheckCircle2 /> : <AlertTriangle />}<span><b>{row.label}</b>{row.value}</span></article>)}</div></section>
          <div className="sic-arrival-actions"><div>{isCustomerVehicle ? <><button onClick={() => { setArrivalQuery(""); setArrivalMode("today"); setVehicleAddOpen(false); resetVehicleIdentityPreview(); }} type="button"><CalendarDays />Today&apos;s Arrivals</button><button onClick={() => { setArrivalQuery(""); setArrivalMode("recent"); setVehicleAddOpen(false); resetVehicleIdentityPreview(); }} type="button"><UserRound />Recent Customers</button><button onClick={() => { setArrivalMode("search"); setArrivalQuery(""); setVehicleAddOpen(false); resetVehicleIdentityPreview(); setNotice("Walk-in intake selected. Find or add the customer and vehicle to continue."); }} type="button">Walk-In</button></> : <span className="sic-internal-intake-label"><CarFront />Internal dealership inventory intake</span>}<button onClick={() => { update("transportMode", "TOW"); setNotice("Tow-in selected. Capture the vehicle, keys, and custody facts before check-in."); }} type="button"><CarFront />Tow-In</button></div><div>{isCustomerVehicle ? <button className="create" onClick={() => setDrawer("customer")} type="button"><Plus />Add New Customer</button> : null}<button className="create" onClick={() => { setVehicleAddOpen(true); if (arrivalQueryIsVin) void decodeVehicleForIntake(); else { arrivalSearchRef.current?.focus(); setNotice("Search the local database first, then enter the complete VIN if the vehicle is not found."); } }} type="button"><Plus />Add New Vehicle</button></div></div>
          {arrivalQuery || arrivalMode !== "search" ? <div className="sic-arrival-results" role="listbox" aria-label="Arrival search results">
            {isCustomerVehicle ? arrivalMatches.appointments.map((appointment) => <button key={appointment.id} onClick={() => chooseAppointment(appointment)} type="button"><CalendarClock /><span><strong>{appointment.appointmentNumber} · {appointment.title}</strong><small>{appointment.participants[0]?.customer?.displayName ?? "Customer"} · {appointment.vehicles[0] ? vehicleLabel(appointment.vehicles[0].vehicle) : "Vehicle not linked"}</small></span><b>Appointment</b></button>) : null}
            {isCustomerVehicle ? arrivalMatches.customers.map((customer) => <button key={customer.id} onClick={() => chooseCustomer(customer.id)} type="button"><UserRound /><span><strong>{customer.displayName}</strong><small>{customer.phoneNumber ?? customer.email ?? customer.customerNumber ?? "Canonical customer"}</small></span><b>Customer</b></button>) : null}
            {isDealershipInventory ? arrivalMatches.inventoryUnits.map((unit) => <button className="exact-vin-match" key={unit.id} onClick={() => { setForm((current) => ({ ...current, inventoryUnitId: unit.id, locationId: unit.locationId, vehicleId: unit.vehicle.id })); setArrivalQuery(""); setNotice(`Inventory unit ${unit.inventoryNumber} and its canonical vehicle were selected for internal recon.`); }} type="button"><ClipboardCheck /><span><strong>{unit.inventoryNumber} · {vehicleLabel(unit.vehicle)}</strong><small>{unit.vehicle.vin ?? unit.vehicle.stockNumber ?? "Active inventory unit"}</small></span><b>Inventory Unit</b></button>) : null}
            {arrivalMatches.repairOrders.map((order) => <Link href={`/vehicles/repair-workbench?repairOrderId=${order.id}`} key={order.id}><ClipboardCheck /><span><strong>{order.repairOrderNumber} · {vehicleLabel(order.vehicle)}</strong><small>{order.customer?.displayName ?? "Internal vehicle"} · {order.closedAt ? `Previous service · ${new Date(order.openedAt).toLocaleDateString()}` : order.stage.replaceAll("_", " ")}</small></span><b>{order.closedAt ? "View History" : "Open Workbench"}</b></Link>)}
            {arrivalMatches.vehicles.map((vehicle) => { const exactVinMatch = arrivalQueryIsVin && vehicle.vin?.toUpperCase().replace(/[^A-Z0-9]/g, "") === normalizedArrivalVin; return <button className={exactVinMatch ? "exact-vin-match" : ""} key={vehicle.id} onClick={() => chooseVehicle(vehicle.id)} type="button"><CarFront /><span><strong>{vehicleLabel(vehicle)}</strong><small>{vehicle.vin ?? vehicle.licensePlate ?? "Canonical vehicle"}</small></span><b>{exactVinMatch ? "Exact VIN Match" : "Vehicle"}</b></button>; })}
            {!arrivalMatches.appointments.length && !arrivalMatches.customers.length && !arrivalMatches.inventoryUnits.length && !arrivalMatches.repairOrders.length && !arrivalMatches.vehicles.length ? <div className="sic-arrival-empty"><strong>No matching local record found</strong><span>{arrivalQueryIsVin ? "This VIN can be decoded and added below without leaving intake." : isCustomerVehicle ? "Add a customer now, or enter the complete VIN to identify and add a vehicle." : "Enter the complete VIN to identify and add the dealership vehicle."}</span>{!arrivalQueryIsVin ? <div>{isCustomerVehicle ? <button onClick={() => { setNewCustomer((value) => ({ ...value, displayName: arrivalQuery.trim() })); setDrawer("customer"); }} type="button"><UserRound />Add New Customer</button> : null}<button onClick={() => { setArrivalQuery(""); setVehicleAddOpen(true); resetVehicleIdentityPreview(); window.requestAnimationFrame(() => { arrivalSearchRef.current?.focus(); arrivalSearchRef.current?.select(); }); setNotice("Enter the complete 17-character VIN, then click Search to check local records and decode the vehicle if needed."); }} type="button"><CarFront />Enter VIN to Add Vehicle</button></div> : null}</div> : null}
          </div> : null}
          {(vehicleAddOpen || arrivalQueryIsVin && !localVinMatch) ? <section className="sic-inline-vehicle-add" aria-label="Add vehicle from VIN">
            {!arrivalQueryIsVin ? <div className="sic-inline-vin-prompt"><CarFront /><div><strong>Enter the vehicle&apos;s VIN above</strong><span>The dealership database is searched first. A new vehicle can be decoded only after a complete 17-character VIN is entered.</span></div></div> : !vehicleIdentityPreview ? <div className="sic-inline-vin-prompt"><CarFront /><div><strong>VIN not found in local records</strong><span>{normalizedArrivalVin} can be checked with NHTSA and added without leaving this intake.</span></div><button disabled={vehicleIdentityBusy} onClick={() => void decodeVehicleForIntake()} type="button">{vehicleIdentityBusy ? "Decoding…" : "Decode VIN"}</button></div> : <div className="sic-decoded-vehicle">
              <header><CheckCircle2 /><div><small>Decoded by {vehicleIdentityPreview.decode?.provider ?? "NHTSA"}</small><strong>{[vehicleQuickDetails.year, vehicleQuickDetails.make, vehicleQuickDetails.model, vehicleIdentityPreview.decode?.decoded.trim].filter(Boolean).join(" ")}</strong><span>VIN {vehicleIdentityPreview.identity?.vin}</span></div><button aria-label="Cancel vehicle addition" onClick={() => { setVehicleAddOpen(false); resetVehicleIdentityPreview(); }} type="button"><X /></button></header>
              <div className="sic-decoded-facts"><span><b>Body</b>{vehicleIdentityPreview.decode?.decoded.bodyClass || "Not reported"}</span><span><b>Engine</b>{[vehicleIdentityPreview.decode?.decoded.engineCylinders && `${vehicleIdentityPreview.decode.decoded.engineCylinders} cyl`, vehicleIdentityPreview.decode?.decoded.displacementLiters && `${vehicleIdentityPreview.decode.decoded.displacementLiters} L`].filter(Boolean).join(" · ") || "Not reported"}</span><span><b>Drive</b>{vehicleIdentityPreview.decode?.decoded.driveType || "Not reported"}</span><span><b>Fuel</b>{vehicleIdentityPreview.decode?.decoded.fuelTypePrimary || "Not reported"}</span></div>
              <div className="sic-quick-identity-fields"><label><span>Year</span><input inputMode="numeric" onChange={(event) => setVehicleQuickDetails((value) => ({ ...value, year: event.target.value.replace(/\D/g, "") }))} value={vehicleQuickDetails.year} /></label><label><span>Make</span><input onChange={(event) => setVehicleQuickDetails((value) => ({ ...value, make: event.target.value }))} value={vehicleQuickDetails.make} /></label><label><span>Model</span><input onChange={(event) => setVehicleQuickDetails((value) => ({ ...value, model: event.target.value }))} value={vehicleQuickDetails.model} /></label><label><span>Current odometer <b>Required</b></span><input inputMode="numeric" onChange={(event) => setVehicleOdometer(event.target.value.replace(/\D/g, ""))} placeholder="Reading" value={vehicleOdometer} /></label><label><span>Unit</span><select onChange={(event) => setVehicleOdometerUnit(event.target.value as "KILOMETERS" | "MILES")} value={vehicleOdometerUnit}><option value="MILES">Miles</option><option value="KILOMETERS">Kilometers</option></select></label></div>
              <footer><label><input checked={vehicleIdentityConfirmed} onChange={(event) => setVehicleIdentityConfirmed(event.target.checked)} type="checkbox" /><span>I confirm this is the vehicle being checked in.</span></label><button disabled={vehicleIdentityBusy || !vehicleIdentityConfirmed || !vehicleOdometer} onClick={() => void createAndSelectDecodedVehicle()} type="button">{vehicleIdentityBusy ? "Adding vehicle…" : "Confirm, Add & Select Vehicle"}</button></footer>
            </div>}
          </section> : null}
          <div className="sic-selected-arrival">
            {isCustomerVehicle ? <article className={selectedCustomer ? "selected" : ""}><UserRound /><div><small>Customer</small><strong>{selectedCustomer?.displayName ?? "Select customer"}</strong><span>{selectedCustomer?.phoneNumber ?? selectedCustomer?.email ?? "Search or add a canonical customer"}</span></div>{selectedCustomer ? <button onClick={() => update("customerId", "")} type="button">Change</button> : null}</article> : <article className="selected inventory"><CarFront /><div><small>Relationship</small><strong>Dealership inventory</strong><span>Internal work · customer not required</span></div></article>}
            <article className={selectedVehicle ? "selected" : ""}><CarFront /><div><small>Vehicle</small><strong>{selectedVehicle ? vehicleLabel(selectedVehicle) : "Select vehicle"}</strong><span>{selectedVehicle?.vin ?? selectedVehicle?.licensePlate ?? "Search or add a canonical vehicle"}</span></div>{selectedVehicle ? <button onClick={() => update("vehicleId", "")} type="button">Change</button> : null}</article>
            {isDealershipInventory ? <article className={selectedInventoryUnit ? "selected inventory" : ""}><ClipboardCheck /><div><small>Inventory unit</small><strong>{selectedInventoryUnit?.inventoryNumber ?? "Create or link unit"}</strong><span>{selectedInventoryUnit ? "Active dealership inventory" : "Required before internal recon"}</span></div></article> : <article className={readiness?.appointment ? "selected appointment" : ""}><CalendarClock /><div><small>Appointment</small><strong>{readiness?.appointment?.appointmentNumber ?? "No appointment matched"}</strong><span>{readiness?.appointment?.startsAt ? new Date(readiness.appointment.startsAt).toLocaleString() : "Walk-in readiness will apply"}</span></div></article>}
          </div>
          {selectedVehicle ? <section className="sic-selected-vehicle-profile" aria-label="Decoded vehicle information">
            <header><div><small>Decoded vehicle information</small><strong>{[selectedVehicle.year, selectedVehicle.make, selectedVehicle.model, selectedVehicleDetails?.decoded.trim].filter(Boolean).join(" ") || selectedVehicle.vehicleNumber}</strong><span>{selectedVehicleDetails ? `${selectedVehicleDetails.provider} · ${selectedVehicleDetails.source === "STORED_SNAPSHOT" ? "saved canonical snapshot" : "refreshed for this intake"}${selectedVehicleDetails.retrievedAt ? ` · ${new Date(selectedVehicleDetails.retrievedAt).toLocaleDateString()}` : ""}` : "Checking available canonical specifications…"}</span></div><Link href={`/vehicles/360/${selectedVehicle.id}`}>Vehicle 360</Link></header>
            {selectedVehicleDetails ? <div className="sic-selected-vehicle-facts"><span><b>Series / trim</b>{[selectedVehicleDetails.decoded.series, selectedVehicleDetails.decoded.trim].filter(Boolean).join(" · ") || "Not reported"}</span><span><b>Body</b>{[selectedVehicleDetails.decoded.bodyClass, selectedVehicleDetails.decoded.cabType].filter(Boolean).join(" · ") || "Not reported"}</span><span><b>Engine</b>{[selectedVehicleDetails.decoded.engineCylinders && `${selectedVehicleDetails.decoded.engineCylinders} cylinder`, selectedVehicleDetails.decoded.displacementLiters && `${selectedVehicleDetails.decoded.displacementLiters} L`, selectedVehicleDetails.decoded.engineConfiguration].filter(Boolean).join(" · ") || "Not reported"}</span><span><b>Transmission</b>{selectedVehicleDetails.decoded.transmissionStyle || "Not reported"}</span><span><b>Drivetrain</b>{selectedVehicleDetails.decoded.driveType || "Not reported"}</span><span><b>Fuel</b>{selectedVehicleDetails.decoded.fuelTypePrimary || "Not reported"}</span></div> : <div className={selectedVehicleDetailsError ? "sic-vehicle-profile-status error" : "sic-vehicle-profile-status"}>{selectedVehicleDetailsLoading ? "Retrieving decoded vehicle information…" : selectedVehicleDetailsError || "No decoded specification snapshot is available for this vehicle."}</div>}
          </section> : null}
          {isDealershipInventory && selectedVehicle ? <section className="sic-inventory-link" aria-label="Dealership inventory unit" ref={inventoryUnitSectionRef}>
            <header><ClipboardCheck /><div><small>Dealership inventory control</small><strong>{selectedInventoryUnit ? `Inventory unit ${selectedInventoryUnit.inventoryNumber} linked` : "Create or link the inventory unit"}</strong><span>Inventory ownership, lifecycle, and recon remain separate from the canonical vehicle identity.</span></div>{selectedInventoryUnit ? <Link href={`/vehicles/control-tower?inventoryUnitId=${selectedInventoryUnit.id}`}>Open inventory unit</Link> : null}</header>
            {selectedInventoryUnit ? <div className="sic-inventory-linked"><CheckCircle2 /><div><strong>Ready for internal recon intake</strong><span>No customer record is required. Work will be attributed to {selectedInventoryUnit.inventoryNumber} and this canonical vehicle.</span></div><button onClick={() => update("inventoryUnitId", "")} type="button">Change link</button></div> : <div className="sic-inventory-create"><label><span>Acquisition source <b>Required</b></span><select onChange={(event) => setInventoryUnitDraft((current) => ({ ...current, acquisitionSource: event.target.value as typeof current.acquisitionSource }))} value={inventoryUnitDraft.acquisitionSource}><option value="AUCTION">Auction</option><option value="TRADE">Trade</option><option value="DIRECT_PURCHASE">Direct purchase</option><option value="DEALER_TRANSFER">Dealer transfer</option><option value="CONSIGNMENT">Consignment</option><option value="OTHER">Other</option></select></label><label><span>Inventory number <b>Required</b></span><input onChange={(event) => setInventoryUnitDraft((current) => ({ ...current, inventoryNumber: event.target.value.toUpperCase() }))} placeholder="Unique inventory number" value={inventoryUnitDraft.inventoryNumber} /></label><label><span>Financial acquisition <b>Required</b></span><input onChange={(event) => setInventoryUnitDraft((current) => ({ ...current, financialAcquiredAt: event.target.value }))} type="datetime-local" value={inventoryUnitDraft.financialAcquiredAt} /></label><label><span>Stage target <b>Required</b></span><input onChange={(event) => setInventoryUnitDraft((current) => ({ ...current, targetAt: event.target.value }))} type="datetime-local" value={inventoryUnitDraft.targetAt} /></label><label className="wide"><span>Next inventory action</span><input onChange={(event) => setInventoryUnitDraft((current) => ({ ...current, nextAction: event.target.value }))} value={inventoryUnitDraft.nextAction} /></label><footer><span>Authorized inventory staff only. The server rechecks ownership, location, authority, and duplicates.</span><button disabled={inventoryUnitBusy || !inventoryUnitDraft.inventoryNumber.trim()} onClick={() => void createInventoryUnitForSelectedVehicle()} type="button">{inventoryUnitBusy ? "Creating inventory unit…" : "Create & Link Inventory Unit"}</button></footer></div>}
          </section> : null}
          {selectedVehicle && selectedVehicleDetails ? <section className="sic-safety-intelligence" aria-label="NHTSA safety and service intelligence">
            <header><ShieldAlert /><div><small>NHTSA safety &amp; service intelligence</small><strong>Advisory review for this intake</strong><span>{safetyIntelligence ? `${safetyIntelligence.model.year} ${safetyIntelligence.model.make} ${safetyIntelligence.model.model} · checked ${new Date(safetyIntelligence.retrievedAt).toLocaleString()}` : "Checking official model-level safety sources…"}</span></div><button disabled={safetyIntelligenceLoading} onClick={() => void loadSafetyIntelligence()} type="button"><RefreshCw />{safetyIntelligenceLoading ? "Checking…" : "Refresh"}</button></header>
            {safetyIntelligence ? <>
              <div className="sic-safety-boundary"><ShieldCheck /><div><strong>VIN verification required</strong><span>Campaigns below are model-level results, not confirmation of an open recall for this VIN.</span></div><button onClick={flagSafetyReview} type="button">Flag safety review</button><a href={safetyIntelligence.sourcePolicy.vinVerificationUrl} rel="noreferrer" target="_blank">Verify VIN with NHTSA</a></div>
              {safetyIntelligence.warnings.map((warning) => <p className="sic-safety-warning" key={warning}><AlertTriangle />{warning}</p>)}
              <div className="sic-safety-columns">
                <div className="sic-recall-list"><h3>Potential recall campaigns <b>{safetyIntelligence.recalls.length}</b></h3>{safetyIntelligence.recalls.length ? safetyIntelligence.recalls.slice(0, 6).map((recall) => <article className={recall.relevance === "CONCERN_MATCH" ? "concern-match" : ""} key={recall.campaignNumber}><div><span>{recall.relevance === "CONCERN_MATCH" ? "Possible concern match" : recall.parkIt || recall.parkOutside ? "Immediate safety review" : "Model-level campaign"}</span><b>{recall.verificationLabel}</b></div><strong>{recall.component}</strong><small>Campaign {recall.campaignNumber}{recall.manufacturer ? ` · ${recall.manufacturer}` : ""}</small>{recall.relevanceReasons.length ? <em>Matched intake topic: {recall.relevanceReasons.join(", ")}</em> : null}<p>{recall.summary}</p>{recall.consequence ? <details><summary>Consequence &amp; remedy</summary><p>{recall.consequence}</p>{recall.remedy ? <p>{recall.remedy}</p> : null}</details> : null}{recall.parkIt || recall.parkOutside ? <mark>{recall.parkIt ? "Park-it guidance reported" : "Park-outside guidance reported"} · confirm current VIN status and instructions</mark> : null}</article>) : <div className="sic-safety-empty">No model-level campaigns were returned. This does not prove that the VIN has no unrepaired recalls.</div>}</div>
                <div className="sic-safety-supporting"><section><h3>Complaint background <b>{safetyIntelligence.complaints.reduce((total, item) => total + item.count, 0)}</b></h3><p>{safetyIntelligence.sourcePolicy.complaints}</p>{safetyIntelligence.complaints.slice(0, 6).map((item) => <article className={item.relevance === "CONCERN_MATCH" ? "concern-match" : ""} key={item.component}><strong>{item.component}</strong><span>{item.count} public report{item.count === 1 ? "" : "s"}</span>{item.relevanceReasons.length ? <em>Possible topic match: {item.relevanceReasons.join(", ")}</em> : null}</article>)}</section><section><h3>Manufacturer communications / TSBs</h3><b>{safetyIntelligence.manufacturerCommunications.label}</b><p>{safetyIntelligence.manufacturerCommunications.message}</p><a href={safetyIntelligence.manufacturerCommunications.sourceUrl} rel="noreferrer" target="_blank">Open official NHTSA datasets &amp; search</a></section></div>
              </div>
            </> : <div className={safetyIntelligenceError ? "sic-safety-status error" : "sic-safety-status"}>{safetyIntelligenceLoading ? "Retrieving model-level campaigns and complaint background from NHTSA…" : safetyIntelligenceError || "Safety intelligence will appear after vehicle specifications are available."}</div>}
          </section> : null}
        </section>

        {isDealershipInventory ? <section className="sic-card sic-live-readiness ready"><header><span><ClipboardCheck /></span><div><h2>Internal recon readiness</h2><p>Dealership inventory uses the governed inventory unit instead of a customer and appointment readiness snapshot.</p></div></header><div className="sic-readiness-unavailable inventory"><CarFront /><div><strong>{selectedInventoryUnit ? `${selectedInventoryUnit.inventoryNumber} is linked for internal work` : "Create or link the inventory unit"}</strong><span>{selectedInventoryUnit ? "Capture the inventory concern, keys, condition, owner, and target to open recon." : "An active inventory unit is required before internal recon can begin."}</span></div></div></section> : <section className={`sic-card sic-live-readiness ${readiness?.status.toLocaleLowerCase().replaceAll("_", "-") ?? "loading"}`}>
          <header><span><CalendarClock /></span><div><h2>Live service readiness</h2><p>Appointment match, current shop load, staff, bay capacity, resource reservations, and promise risk.</p></div><button disabled={readinessLoading || !form.customerId || !form.vehicleId} onClick={() => void evaluateReadiness()} type="button">{readinessLoading ? "Checking…" : "Refresh live facts"}</button></header>
          {readiness ? <><div className="sic-capacity-grid">
            <article className="appointment"><small>Matched appointment</small><strong>{readiness.appointment?.startsAt ? new Date(readiness.appointment.startsAt).toLocaleTimeString([], { hour: "numeric", minute: "2-digit" }) : "Walk-in"}</strong><span>{readiness.appointment?.appointmentNumber ?? "Current capacity"}</span></article>
            <article><small>Arrival status</small><b className="status">{readiness.appointment?.timing ?? "ARRIVED"}</b><span>{new Date(form.arrivedAt).toLocaleTimeString([], { hour: "numeric", minute: "2-digit" })}</span></article>
            <article><small>Staff</small><strong>{readiness.facts.availableStaffCapacity} / {readiness.facts.activeStaffCapacity}</strong><i><em style={{ width: `${Math.min(100, readiness.facts.availableStaffCapacity / Math.max(1, readiness.facts.activeStaffCapacity) * 100)}%` }} /></i></article>
            <article><small>Bays</small><strong>{readiness.facts.availableBayCapacity} / {readiness.facts.activeBayCapacity}</strong><i><em style={{ width: `${Math.min(100, readiness.facts.availableBayCapacity / Math.max(1, readiness.facts.activeBayCapacity) * 100)}%` }} /></i></article>
            <article><small>Shop load</small><strong>{readiness.facts.openRepairOrders}</strong><span>{readiness.facts.overdueRepairOrders} overdue</span></article>
            <article><small>Promise confidence</small><strong>{readiness.promiseConfidence.replaceAll("_", " ")}</strong><span>{readiness.diagnosisOutlook.replaceAll("_", " ")}</span></article>
            <article className="decision"><small>Intake decision</small><b>{readiness.status === "READY" ? "Accept" : readiness.status === "ACCEPT_WITH_CONSTRAINTS" ? "Accept with constraints" : "Manager review"}</b><span>{readiness.recommendation}</span></article>
          </div><footer><span>Custody: Accept</span><span>Diagnosis: {readiness.diagnosisOutlook.replaceAll("_", " ").toLocaleLowerCase()}</span><span>Promise: {readiness.promiseConfidence.replaceAll("_", " ").toLocaleLowerCase()}</span><span>Live snapshot {new Date(readiness.generatedAt).toLocaleTimeString()}</span></footer></> : <div className={readinessError ? "sic-readiness-unavailable error" : "sic-readiness-unavailable"}><CalendarClock /><div><strong>{readinessError ? "Readiness unavailable" : "Select a customer and vehicle"}</strong><span>{readinessError || "Live appointment and capacity facts will appear here."}</span></div></div>}
        </section>}

        <section className="sic-card sic-concern">
          <header><span>3</span><div><h2>{isDealershipInventory ? "Inventory concern & recon request" : "Customer concern"}</h2><p>{isDealershipInventory ? "Record why the dealership vehicle entered recon and what inspection or condition requires attention." : "Record what the customer reports in their own words. This becomes the technician's starting context."}</p></div><em>{form.concernSummary.length} / 2,000</em></header>
          <label className="sic-concern-field"><span>{isDealershipInventory ? "What does inventory need inspected or repaired?" : "What is the customer experiencing?"} <b>Required</b></span><textarea maxLength={2000} onChange={(event) => update("concernSummary", event.target.value)} placeholder={isDealershipInventory ? "Example: Newly acquired inventory requires a complete safety inspection, front brake evaluation, warning-light diagnosis, and recon estimate." : "Example: Customer reports a grinding noise from the front passenger side when braking below 25 mph. It started three days ago and is getting louder. ABS warning light came on this morning…"} ref={concernRef} rows={5} value={form.concernSummary} /><small><MessageSquareText />Be specific about the symptom, location, conditions, timing, and what changed.</small></label>
          {selectedVehicle && selectedVehicleOrders.length ? <section className={`sic-ro-match ${sameConcernOrder ? "same-concern" : "vehicle-history"}`} ref={repairOrderDecisionRef}>
            <header><CarFront /><div><small>VIN / canonical vehicle match</small><strong>{selectedVehicle.vin ?? selectedVehicle.vehicleNumber} already exists</strong><span>This is the same canonical vehicle. The system will not create a second vehicle record.</span></div><b>{selectedVehicleOrders.length} RO{selectedVehicleOrders.length === 1 ? "" : "s"} found</b></header>
            {sameConcernOrder ? <div className="sic-ro-decision"><div><small>Same open concern detected</small><strong>{sameConcernOrder.repairOrderNumber} · {sameConcernOrder.stage.replaceAll("_", " ")}</strong><span>{sameConcernOrder.serviceVisit.concernSummary}</span></div><nav><button disabled={busy || !form.ownerUserId} onClick={() => void openExistingRepairOrder(sameConcernOrder.id)} type="button">Save technician &amp; open RO</button><em>Duplicate RO blocked</em></nav></div> : openVehicleOrders.length ? <><div className="sic-ro-list">{openVehicleOrders.map((order) => <article key={order.id}><div><strong>{order.repairOrderNumber}</strong><span>{order.serviceVisit.concernSummary}</span></div><button disabled={busy || !form.ownerUserId} onClick={() => void openExistingRepairOrder(order.id)} type="button">Save technician &amp; open</button></article>)}</div><div className="sic-ro-new-choice"><div><strong>The concern appears different</strong><span>Review the open work above. Create another RO only when this is a separate problem or visit.</span></div><button className={newRepairOrderConfirmed ? "confirmed" : ""} onClick={() => setNewRepairOrderConfirmed(true)} type="button">{newRepairOrderConfirmed ? <><Check /> Separate RO confirmed</> : <><Plus /> Create separate RO for this concern</>}</button></div></> : <div className="sic-ro-decision"><div><small>Service history found</small><strong>No open repair order</strong><span>A new RO may be created for this visit while preserving the same canonical VIN record.</span></div><em>New visit allowed</em></div>}
          </section> : null}
          <div className="sic-prompts"><span><Sparkles />Helpful prompts</span>{["Customer states…", "Occurs when…", "Started approximately…", "Warning light/message…", "Previous repair related to…"].map((prompt) => <button key={prompt} onClick={() => addPrompt(prompt)} type="button">+ {prompt}</button>)}</div>
          <details className="sic-more-context"><summary>Additional concern context &amp; advisor notes</summary><div className="sic-three-column"><label><span>When did it start?</span><input onChange={(event) => update("onset", event.target.value)} placeholder="Today, last week, after repair…" value={form.onset} /></label><label><span>Frequency / conditions</span><input onChange={(event) => update("frequency", event.target.value)} placeholder="Constant, cold start, highway…" value={form.frequency} /></label><label><span>Warning indicators</span><input onChange={(event) => update("warningIndicators", event.target.value)} placeholder="ABS, check engine, message…" value={form.warningIndicators} /></label></div><label className="sic-notes"><span>Advisor-only intake notes</span><textarea maxLength={2000} onChange={(event) => update("intakeNotes", event.target.value)} placeholder="Observations, prior conversations, access instructions, or context not stated by the customer." rows={3} value={form.intakeNotes} /></label></details>
        </section>

        <section className="sic-card sic-technician-assignment" id="technician-assignment">
          <header><span>4</span><div><h2>Assign technician</h2><p>Choose any active staff member at intake. Repair-capable staff are listed first; Shop Dispatch still verifies qualification and capacity.</p></div><em>Simple handoff</em></header>
          <div className="sic-technician-assignment-row"><label><span>Technician / accountable staff</span><select aria-label="Assign technician" onChange={(event) => update("ownerUserId", event.target.value)} value={form.ownerUserId}>{repairCapableTechnicians.length ? <optgroup label="Repair-capable staff">{repairCapableTechnicians.map((user) => <option key={user.id} value={user.id}>{staffAssignmentLabel(user)}</option>)}</optgroup> : null}{otherActiveStaff.length ? <optgroup label="Other active staff">{otherActiveStaff.map((user) => <option key={user.id} value={user.id}>{staffAssignmentLabel(user)}</option>)}</optgroup> : null}</select></label><div><UserRound /><span><strong>{selectedOwner?.name ?? "Select a technician"}</strong><small>{selectedOwner && isRepairCapable(selectedOwner) ? "Repair-capable · preassigned from check-in" : "Accountable at intake · repair eligibility verified in dispatch"}</small></span></div><Link className="sic-open-dispatch" href="/vehicles/shop-dispatch">Open Shop Dispatch <ChevronRight /></Link></div>
          <footer><ShieldCheck /><span>This assignment does not authorize repairs or bypass technician qualification, capacity, parts, or QC controls.</span></footer>
        </section>

        <section className="sic-card sic-custody-card">
          <header><div><h2>{isDealershipInventory ? "Inventory receipt & custody" : "Visit & Custody"}</h2><p>{isDealershipInventory ? "Establish arrival, keys, location, and accountable internal custody." : "Establish arrival, keys, and customer transportation."}</p></div></header>
          <div className="sic-custody-row">
            <label><span><Clock3 />Arrival</span><input onChange={(event) => update("arrivedAt", event.target.value)} required type="datetime-local" value={form.arrivedAt} /></label>
            <label><span><KeyRound />Keys received</span><input max={20} min={0} onChange={(event) => update("keysReceivedCount", Number(event.target.value))} type="number" value={form.keysReceivedCount} /></label>
            <label><span>Key tag</span><input onChange={(event) => update("keyTag", event.target.value)} placeholder="Tag reference" value={form.keyTag} /></label>
            <label><span>Transportation</span><select onChange={(event) => update("transportMode", event.target.value)} value={form.transportMode}>{isDealershipInventory ? <option value="INTERNAL_TRANSPORT">Internal transport</option> : <><option value="CUSTOMER_WAITING">Customer waiting</option><option value="DROP_OFF">Customer drive / drop-off</option><option value="LOANER">Loaner</option><option value="SHUTTLE">Shuttle</option></>}<option value="TOW">Tow</option><option value="OTHER">Other</option></select></label>
          </div>
          <details className="sic-more-context"><summary>Authorization, ownership, promise &amp; advanced custody</summary><div className="sic-three-column"><label><span><CalendarClock />Intake target</span><input onChange={(event) => update("targetAt", event.target.value)} required type="datetime-local" value={form.targetAt} /></label><label><span>Customer promise</span><input onChange={(event) => update("promisedAt", event.target.value)} type="datetime-local" value={form.promisedAt} /></label><label><span>Location</span><select onChange={(event) => update("locationId", event.target.value)} value={form.locationId}>{options.locations.map((location) => <option key={location.id} value={location.id}>{location.name}</option>)}</select></label><label><span>Priority</span><select onChange={(event) => update("urgency", event.target.value)} value={form.urgency}><option value="STANDARD">Standard</option><option value="WAITING_CUSTOMER">Customer waiting</option><option value="SAFETY_CONCERN">Potential safety concern</option><option value="COMEBACK_REVIEW">Possible comeback</option></select></label></div><div className="sic-two-column sic-consent">
            <label><span>Consent status</span><select onChange={(event) => update("consentStatus", event.target.value as IntakeState["consentStatus"])} value={form.consentStatus}><option value="PENDING">Pending</option><option value="DOCUMENTED">Documented</option><option value="NOT_REQUIRED">Not required</option></select></label>
            {form.consentStatus === "DOCUMENTED" ? <><label><span>Consent reference</span><input onChange={(event) => update("consentReference", event.target.value)} placeholder="Signature, call, or document reference" value={form.consentReference} /></label><label><span>Consent recorded at</span><input onChange={(event) => update("consentedAt", event.target.value)} type="datetime-local" value={form.consentedAt} /></label></> : null}
            <label><span>Promise notes</span><input onChange={(event) => update("promiseNotes", event.target.value)} placeholder="What did we commit to communicate or complete?" value={form.promiseNotes} /></label>
          </div></details>
        </section>
      </main>

      <aside className="sic-sidebar">
        <section className="sic-intake-summary"><h2>Live Intake Summary</h2>{isDealershipInventory ? <article><CarFront /><div><small>Relationship</small><strong>Dealership inventory</strong><span>Customer not required</span></div></article> : <article><UserRound /><div><small>Customer</small><strong>{selectedCustomer?.displayName ?? "Select customer"}</strong><span>{selectedCustomer?.phoneNumber ?? selectedCustomer?.email ?? "Canonical customer required"}</span></div></article>}<article><CarFront /><div><small>Vehicle</small><strong>{selectedVehicle ? vehicleLabel(selectedVehicle) : "Select vehicle"}</strong><span>{selectedVehicle?.vin ?? selectedVehicle?.licensePlate ?? "Canonical vehicle required"}</span></div></article>{isDealershipInventory ? <article><ClipboardCheck /><div><small>Inventory unit</small><strong>{selectedInventoryUnit?.inventoryNumber ?? "Create or link unit"}</strong><span>{selectedInventoryUnit ? "Internal recon eligible" : "Required for internal work"}</span></div></article> : <article><CalendarClock /><div><small>Appointment</small><strong>{readiness?.appointment?.appointmentNumber ?? "No appointment matched"}</strong><span>{readiness?.appointment?.startsAt ? new Date(readiness.appointment.startsAt).toLocaleString() : "Walk-in readiness applies"}</span></div></article>}<div className="sic-summary-progress"><span>Readiness overview</span><b>{checklist.filter((item) => item.ready).length}/{checklist.length} complete</b><i><em style={{ width: `${checklist.filter((item) => item.ready).length / checklist.length * 100}%` }} /></i></div><dl><div><dt>Custody status</dt><dd>{form.keysReceivedCount > 0 ? "Accept" : "Review"}</dd></div><div><dt>Assigned technician</dt><dd>{selectedOwner?.name ?? "Required"}</dd></div><div><dt>Location</dt><dd>{selectedLocation?.name ?? "Required"}</dd></div><div><dt>Target update</dt><dd>{form.targetAt ? new Date(form.targetAt).toLocaleString() : "Required"}</dd></div></dl><div className="sic-readiness"><h2>Check-in requirements</h2>{checklist.map((item) => <p className={item.ready ? "ready" : ""} key={item.label}><i>{item.ready ? <Check /> : null}</i><span>{item.label}</span></p>)}<strong>{checklist.filter((item) => item.ready).length} / {checklist.length}</strong></div></section>
      </aside>
    </div>

    {drawer ? <div className="sic-drawer-backdrop" role="presentation"><section aria-label="Add new customer" aria-modal="true" className="sic-create-drawer" role="dialog">
      <header><div><small>Find Arrival</small><h2>Add New Customer</h2><p>The server checks canonical records and duplicate signals before this record is selected.</p></div><button aria-label="Close" onClick={() => setDrawer(null)} type="button"><X /></button></header>
      <div className="sic-drawer-fields">
        <label><span>Customer name <b>Required</b></span><input autoFocus onChange={(event) => setNewCustomer((value) => ({ ...value, displayName: event.target.value }))} value={newCustomer.displayName} /></label>
        <label><span>Mobile phone</span><input onChange={(event) => setNewCustomer((value) => ({ ...value, phoneNumber: event.target.value }))} type="tel" value={newCustomer.phoneNumber} /></label>
        <label><span>Email</span><input onChange={(event) => setNewCustomer((value) => ({ ...value, email: event.target.value }))} type="email" value={newCustomer.email} /></label>
        <label><span>Preferred contact</span><select onChange={(event) => setNewCustomer((value) => ({ ...value, preferredContactMethod: event.target.value }))} value={newCustomer.preferredContactMethod}><option value="PHONE">Phone</option><option value="SMS">Text message</option><option value="EMAIL">Email</option></select></label>
        <label className="wide"><span>Address</span><input onChange={(event) => setNewCustomer((value) => ({ ...value, address: event.target.value }))} value={newCustomer.address} /></label>
      </div>
      <footer><button onClick={() => setDrawer(null)} type="button">Cancel</button><button className="primary" disabled={busy || !newCustomer.displayName || !newCustomer.phoneNumber && !newCustomer.email} onClick={() => void createCustomer()} type="button">{busy ? "Saving…" : "Create & Select Customer"}</button></footer>
    </section></div> : null}

    <footer className="sic-footer"><div><Link href={returnTo ?? "/vehicles/shop-recon"}>Cancel</Link><span><ShieldCheck />No repair authorization or estimate approval is implied by check-in.</span><span>Next: {nextActionLabel}</span></div><button disabled={busy || (!ready && readinessLoading)} onClick={ready ? undefined : runNextRequiredAction} type={ready ? "submit" : "button"}>{busy ? "Creating repair order…" : nextActionLabel}<ChevronRight /></button></footer>
  </form>;
}
