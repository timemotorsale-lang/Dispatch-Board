import { describe, expect, it } from "vitest";

import { getAppBreadcrumb } from "@/components/layout/app-topbar-breadcrumbs";

describe("App topbar breadcrumbs for Unified CRM opportunities", () => {
  it("links Dispatch breadcrumbs back to the dispatch home", () => {
    expect(getAppBreadcrumb("/tasks", "overview", false, "home")).toEqual([
      { label: "Command Control Center", href: "/command-center" },
      { label: "Dispatch", href: "/board" },
      { label: "Tasks" }
    ]);
  });

  it("builds a pipeline review breadcrumb for the CRM shell", () => {
    expect(getAppBreadcrumb("/crm", "overview", false, "pipeline")).toEqual([
      { label: "Customer Console", href: "/crm" },
      { label: "Opportunities", href: "/crm?view=pipeline" },
      { label: "Pipeline Review" }
    ]);
  });

  it("builds opportunity review breadcrumbs for deeper routes", () => {
    expect(getAppBreadcrumb("/crm/opportunities", "overview", false, "home")).toEqual([
      { label: "Customer Console", href: "/crm" },
      { label: "Opportunities", href: "/crm?view=pipeline" },
      { label: "Review Hub" }
    ]);

    expect(getAppBreadcrumb("/crm/opportunities/guided", "overview", false, "home")).toEqual([
      { label: "Customer Console", href: "/crm" },
      { label: "Opportunities", href: "/crm?view=pipeline" },
      { label: "Guided Journey" }
    ]);
  });
});
