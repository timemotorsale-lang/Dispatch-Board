import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it, vi } from "vitest";

vi.mock("next/navigation", () => ({ useRouter: () => ({ push: vi.fn() }) }));
vi.mock("@/components/layout/appearance", () => ({
  useAppearance: () => ({ appearance: "light", setAppearance: vi.fn() })
}));

import CustomerAppointmentsPage from "@/app/(app)/customers/appointments/page";
import CustomerCasesPage from "@/app/(app)/customers/cases/page";
import CustomerCommunicationsPage from "@/app/(app)/customers/communications/page";
import CustomerDealsPage from "@/app/(app)/customers/deals/page";
import CustomerDocumentsPage from "@/app/(app)/customers/documents/page";
import CustomerTasksPage from "@/app/(app)/customers/tasks/page";
import CustomerVehiclesPage from "@/app/(app)/customers/vehicles/page";

describe("customer shortcut pages", () => {
  it.each([
    ["communications", CustomerCommunicationsPage],
    ["documents", CustomerDocumentsPage],
    ["appointments", CustomerAppointmentsPage],
    ["cases", CustomerCasesPage],
    ["tasks", CustomerTasksPage],
    ["deals", CustomerDealsPage],
    ["vehicles", CustomerVehiclesPage]
  ])("renders the %s shortcut inside Customer 360 instead of a missing route", (_name, Page) => {
    const markup = renderToStaticMarkup(<Page />);

    expect(markup).toContain("Customer 360 Console");
    expect(markup).toContain("Quick Actions");
  });
});
