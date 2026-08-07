import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";

import { AdvisorWorkspaceTabs } from "@/components/layout/advisor-workspace-tabs";

describe("AdvisorWorkspaceTabs", () => {
  it("keeps advisor-safe destinations available throughout the workflow", () => {
    const html = renderToStaticMarkup(<AdvisorWorkspaceTabs pathname="/vehicles/repair-workbench" searchParams={new URLSearchParams("repairOrderId=ro-1")} />);

    for (const label of ["My Workspace", "Inbox", "Check In", "Appointments", "Repair Orders", "Approvals", "Customers"]) expect(html).toContain(label);
    expect(html).toContain('aria-label="Service Advisor workspace navigation"');
    expect(html).toContain('aria-current="page"');
    expect(html).not.toContain("Vehicle Workbench");
  });
});
