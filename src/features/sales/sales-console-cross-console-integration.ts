import type { SalesConsoleRevenueLaneName, SalesConsoleStaffRole } from "./sales-console-operational-domain";

export const salesConsoleDispatchBoardDestinations = [
  "Customer 360",
  "Appointments",
  "Tasks",
  "Inventory / Vehicle 360",
  "Inventory Control Tower",
  "Finance Handoff",
  "Service / Repair Orders",
  "Rental Operations",
  "Warranty Operations",
  "Sales Console"
] as const;

export type SalesConsoleDispatchBoardDestination = (typeof salesConsoleDispatchBoardDestinations)[number];

export type SalesConsoleCrossConsoleLink = {
  destination: SalesConsoleDispatchBoardDestination;
  label: string;
  href: string;
  behavior: "open-source-record" | "open-source-console" | "open-sales-context" | "source-controlled";
  writeAuthority: "Sales Console" | "Source System";
  visibleToRoles: SalesConsoleStaffRole[];
};

export const salesConsoleCrossConsoleNavigationTargets: SalesConsoleCrossConsoleLink[] = [
  {
    destination: "Customer 360",
    label: "Open Customer 360",
    href: "/customers/customer-360",
    behavior: "open-source-console",
    writeAuthority: "Source System",
    visibleToRoles: ["Salesperson", "BDC / Lead Coordinator", "Sales Manager", "Admin / Owner"]
  },
  {
    destination: "Appointments",
    label: "Open Appointment Board",
    href: "/appointments",
    behavior: "open-source-console",
    writeAuthority: "Source System",
    visibleToRoles: ["Salesperson", "BDC / Lead Coordinator", "Sales Manager", "Admin / Owner"]
  },
  {
    destination: "Tasks",
    label: "Open Task Console",
    href: "/tasks",
    behavior: "open-source-console",
    writeAuthority: "Source System",
    visibleToRoles: ["Salesperson", "BDC / Lead Coordinator", "Sales Manager", "Admin / Owner"]
  },
  {
    destination: "Inventory / Vehicle 360",
    label: "Open Vehicle 360",
    href: "/vehicles/360",
    behavior: "open-source-console",
    writeAuthority: "Source System",
    visibleToRoles: ["Salesperson", "Sales Manager", "Admin / Owner"]
  },
  {
    destination: "Inventory Control Tower",
    label: "Open Inventory Control Tower",
    href: "/vehicles/control-tower",
    behavior: "open-source-console",
    writeAuthority: "Source System",
    visibleToRoles: ["Sales Manager", "Admin / Owner"]
  },
  {
    destination: "Finance Handoff",
    label: "Open Finance Handoff Context",
    href: "/sales?workspace=finance-handoff",
    behavior: "source-controlled",
    writeAuthority: "Source System",
    visibleToRoles: ["Sales Manager", "Admin / Owner"]
  },
  {
    destination: "Service / Repair Orders",
    label: "Open Repair Orders",
    href: "/vehicles/repair-orders",
    behavior: "open-source-console",
    writeAuthority: "Source System",
    visibleToRoles: ["Salesperson", "BDC / Lead Coordinator", "Sales Manager", "Admin / Owner"]
  },
  {
    destination: "Rental Operations",
    label: "Open Rental Context",
    href: "/sales?workspace=rental",
    behavior: "source-controlled",
    writeAuthority: "Source System",
    visibleToRoles: ["Salesperson", "Sales Manager", "Admin / Owner"]
  },
  {
    destination: "Warranty Operations",
    label: "Open Warranty Context",
    href: "/sales?workspace=warranty",
    behavior: "source-controlled",
    writeAuthority: "Source System",
    visibleToRoles: ["Salesperson", "Sales Manager", "Admin / Owner"]
  },
  {
    destination: "Sales Console",
    label: "Open Sales Context",
    href: "/sales",
    behavior: "open-sales-context",
    writeAuthority: "Sales Console",
    visibleToRoles: ["Salesperson", "BDC / Lead Coordinator", "Sales Manager", "Admin / Owner"]
  }
];

const laneDestinationMap: Record<SalesConsoleRevenueLaneName, SalesConsoleDispatchBoardDestination[]> = {
  "Inventory Cash Sale": ["Customer 360", "Inventory / Vehicle 360", "Appointments", "Tasks"],
  "Inventory BHPH Sale": ["Customer 360", "Inventory / Vehicle 360", "Finance Handoff", "Tasks"],
  "Inventory Lease-to-Own": ["Customer 360", "Inventory / Vehicle 360", "Finance Handoff", "Tasks"],
  "Public Auto Repair": ["Customer 360", "Service / Repair Orders", "Appointments", "Tasks"],
  "Daily Rental": ["Customer 360", "Rental Operations", "Appointments", "Tasks"],
  "Warranty Product": ["Customer 360", "Warranty Operations", "Finance Handoff", "Tasks"],
  "Financing Product": ["Customer 360", "Finance Handoff", "Tasks"]
};

function roleCanSeeLink(link: SalesConsoleCrossConsoleLink, role: SalesConsoleStaffRole) {
  return link.visibleToRoles.includes(role);
}

export function getSalesConsoleCrossConsoleLinksForLane(lane: SalesConsoleRevenueLaneName, role: SalesConsoleStaffRole) {
  const destinations = new Set(laneDestinationMap[lane]);

  return salesConsoleCrossConsoleNavigationTargets.filter((link) => destinations.has(link.destination) && roleCanSeeLink(link, role));
}

export function getSalesConsoleVehicle360Href(stockNumber: string) {
  return `/vehicles/360/${encodeURIComponent(stockNumber)}`;
}

export function getSalesConsoleTaskHref(taskId: string) {
  return `/tasks/${encodeURIComponent(taskId)}`;
}

export function getSalesConsoleAppointmentHref(appointmentId: string) {
  return `/appointments?appointmentId=${encodeURIComponent(appointmentId)}`;
}

export function getSalesConsoleCustomer360Href(customerNameOrId: string) {
  return `/customers/customer-360?customer=${encodeURIComponent(customerNameOrId)}`;
}

export function salesConsoleCrossConsoleWiringCoversCoreDestinations() {
  const destinations = new Set(salesConsoleCrossConsoleNavigationTargets.map((target) => target.destination));

  return salesConsoleDispatchBoardDestinations.every((destination) => destinations.has(destination));
}

export function salesConsoleCrossConsoleTargetsRemainSafe() {
  return salesConsoleCrossConsoleNavigationTargets.every(
    (target) =>
      target.href.startsWith("/") &&
      !target.href.includes("/commands") &&
      !target.href.includes("/hold") &&
      !target.href.includes("/override") &&
      !target.href.includes("/resolve") &&
      (target.writeAuthority === "Source System" || target.destination === "Sales Console")
  );
}
