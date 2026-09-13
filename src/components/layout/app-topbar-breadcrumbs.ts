export type AppBreadcrumbItem = {
  href?: string;
  label: string;
};

type DispatchView = "overview" | "live";
type CrmView = "home" | "work" | "customers" | "pipeline" | "conversations" | "insights" | "more";

export function getAppBreadcrumb(
  pathname: string,
  dispatchView: DispatchView,
  technicianOnly: boolean,
  crmView: CrmView
): AppBreadcrumbItem[] {
  if (technicianOnly) {
    if (pathname.startsWith("/my-tasks/available")) return [{ label: "Technician Workspace" }, { label: "Available Work" }];
    if (pathname.startsWith("/vehicles/repair-jobs/")) return [{ label: "Technician Workspace" }, { label: "My Work" }, { label: "Repair Workbench" }];
    if (pathname.startsWith("/diagnostics/")) return [{ label: "Technician Workspace" }, { label: "Diagnostics & Tools" }, { label: "Case" }];
    if (pathname === "/diagnostics") return [{ label: "Technician Workspace" }, { label: "Diagnostics & Tools" }];
    return [{ label: "Technician Workspace" }, { label: "My Work" }];
  }

  if (pathname === "/command-center") return [{ label: "Command Control Center" }];
  if (pathname === "/manager-workspace") return [{ label: "Manager Workspace" }];
  if (pathname === "/board") return [{ label: "Command Control Center", href: "/command-center" }, { label: "Dispatch" }, { label: dispatchView === "live" ? "Live Board" : "Overview" }];
  if (pathname === "/activity") return [{ label: "Command Control Center", href: "/command-center" }, { label: "Dispatch" }, { label: "Activity" }];
  if (pathname === "/staff") return [{ label: "Command Control Center", href: "/command-center" }, { label: "Dispatch" }, { label: "Team" }];
  if (pathname === "/my-tasks") return [{ label: "Command Control Center", href: "/command-center" }, { label: "Dispatch" }, { label: "My Tasks" }];
  if (pathname.startsWith("/tasks")) return [{ label: "Command Control Center", href: "/command-center" }, { label: "Dispatch" }, { label: "Tasks" }];
  if (pathname.startsWith("/projects")) return [{ label: "Command Control Center", href: "/command-center" }, { label: "Dispatch" }, { label: "Projects" }];
  if (pathname.startsWith("/appointments")) return [{ label: "Command Control Center", href: "/command-center" }, { label: "Dispatch" }, { label: "Appointments" }];
  if (pathname === "/crm") {
    const current = crmView === "pipeline"
      ? "Pipeline Review"
      : crmView === "work"
        ? "Work"
        : crmView === "customers"
          ? "Customers"
          : crmView === "conversations"
            ? "Conversations"
            : crmView === "insights"
              ? "Insights"
              : crmView === "more"
                ? "More"
                : "Home";
    const middle = crmView === "pipeline" ? { label: "Opportunities", href: "/crm?view=pipeline" } : undefined;
    return middle
      ? [{ label: "Customer Console", href: "/crm" }, middle, { label: current }]
      : [{ label: "Customer Console", href: "/crm" }, { label: current }];
  }
  if (pathname === "/crm/opportunities") return [{ label: "Customer Console", href: "/crm" }, { label: "Opportunities", href: "/crm?view=pipeline" }, { label: "Review Hub" }];
  if (pathname === "/crm/opportunities/guided") return [{ label: "Customer Console", href: "/crm" }, { label: "Opportunities", href: "/crm?view=pipeline" }, { label: "Guided Journey" }];
  if (pathname === "/crm/opportunities/queue") return [{ label: "Customer Console", href: "/crm" }, { label: "Opportunities", href: "/crm?view=pipeline" }, { label: "Queue Review" }];
  if (pathname === "/crm/opportunities/new") return [{ label: "Customer Console", href: "/crm" }, { label: "Opportunities", href: "/crm?view=pipeline" }, { label: "Create Review" }];
  if (/^\/crm\/opportunities\/[^/]+\/transition$/.test(pathname)) return [{ label: "Customer Console", href: "/crm" }, { label: "Opportunities", href: "/crm?view=pipeline" }, { label: "Transition Review" }];
  if (/^\/crm\/opportunities\/[^/]+$/.test(pathname)) return [{ label: "Customer Console", href: "/crm" }, { label: "Opportunities", href: "/crm?view=pipeline" }, { label: "Detail Review" }];
  if (/^\/crm\/customers\/[^/]+$/.test(pathname)) return [{ label: "Customer Console", href: "/crm" }, { label: "Customers", href: "/crm?view=customers" }, { label: "Customer 360" }];
  if (pathname === "/vehicles") return [{ label: "Command Control Center", href: "/command-center" }, { label: "Inventory Console" }, { label: "Home" }];
  if (pathname.startsWith("/vehicles/control-tower")) return [{ label: "Command Control Center", href: "/command-center" }, { label: "Inventory Console" }, { label: "Inventory Lifecycle" }, { label: "Control Tower" }];
  if (pathname.startsWith("/vehicles/disposition-wholesale")) return [{ label: "Command Control Center", href: "/command-center" }, { label: "Inventory Console" }, { label: "Inventory Lifecycle" }, { label: "Disposition & Wholesale" }];
  if (pathname.startsWith("/vehicles/workflow-operations")) return [{ label: "Command Control Center", href: "/command-center" }, { label: "Inventory Console" }, { label: "Workflow Operations" }];
  if (pathname.startsWith("/vehicles/workflows")) return [{ label: "Command Control Center", href: "/command-center" }, { label: "Inventory Console" }, { label: "Start Workflow" }];
  if (pathname.startsWith("/vehicles")) return [{ label: "Command Control Center", href: "/command-center" }, { label: "Inventory Console" }, { label: pathname.startsWith("/vehicles/parts-operations") ? "Parts Operations" : "Vehicles" }];
  if (pathname.startsWith("/customers")) return [{ label: "Command Control Center", href: "/command-center" }, { label: "Dispatch" }, { label: "Customers" }];
  if (pathname.startsWith("/manager-review")) return [{ label: "Command Control Center", href: "/command-center" }, { label: "Dispatch" }, { label: "Manager Review" }];
  if (pathname.startsWith("/administration")) return [{ label: "Command Control Center", href: "/command-center" }, { label: "Administration" }];
  if (pathname.startsWith("/settings")) return [{ label: "Command Control Center", href: "/command-center" }, { label: "Settings" }];
  return [{ label: "Command Control Center", href: "/command-center" }, { label: "Dispatch" }, { label: "Workspace" }];
}
