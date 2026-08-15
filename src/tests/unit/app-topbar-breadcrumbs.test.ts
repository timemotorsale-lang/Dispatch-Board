import { describe, expect, it } from "vitest";

import { getAppBreadcrumb } from "@/components/layout/app-topbar-breadcrumbs";

describe("App topbar breadcrumbs for Unified CRM opportunities", () => {
  it("builds a pipeline review breadcrumb for the CRM shell", () => {
    expect(getAppBreadcrumb("/crm", "overview", false, "pipeline")).toEqual([
      { label: "Unified CRM", href: "/crm" },
      { label: "Opportunities", href: "/crm?view=pipeline" },
      { label: "Pipeline Review" }
    ]);
  });

  it("builds opportunity review breadcrumbs for deeper routes", () => {
    expect(getAppBreadcrumb("/crm/opportunities", "overview", false, "home")).toEqual([
      { label: "Unified CRM", href: "/crm" },
      { label: "Opportunities", href: "/crm?view=pipeline" },
      { label: "Review Hub" }
    ]);

    expect(getAppBreadcrumb("/crm/opportunities/guided", "overview", false, "home")).toEqual([
      { label: "Unified CRM", href: "/crm" },
      { label: "Opportunities", href: "/crm?view=pipeline" },
      { label: "Guided Journey" }
    ]);
  });
});
