import { describe, expect, it } from "vitest";

import {
  salesFederatedSearchCoversRequiredCategories,
  salesFederatedSearchIsReadOnly,
  searchFederatedSalesRecords,
  type SalesFederatedSearchRecord
} from "@/features/sales/sales-console-m57-federated-search";

const records: SalesFederatedSearchRecord[] = [
  { id: "CUST-1", category: "customer", title: "John Smith", detail: "Customer 360", sourceOwner: "CRM", sourceLink: "/customers/CUST-1", tokens: ["John Smith"], visibleToRoles: ["Salesperson", "Sales Manager", "Admin / Owner"] },
  { id: "PHONE-1", category: "phone-email", title: "john@email.com", detail: "Allowed contact field", sourceOwner: "CRM", sourceLink: "/customers/CUST-1", tokens: ["john@email.com"], visibleToRoles: ["Sales Manager", "Admin / Owner"] },
  { id: "STOCK-1", category: "stock-vin", title: "TMS22145", detail: "2022 Toyota RAV4", sourceOwner: "Inventory", sourceLink: "/inventory/VEH-1", tokens: ["TMS22145", "2T3P1RFV1NW123456"], visibleToRoles: ["Salesperson", "Sales Manager", "Admin / Owner"] },
  { id: "APT-1", category: "appointment", title: "John appointment", detail: "Confirmed", sourceOwner: "Appointments", sourceLink: "/appointments/APT-1", tokens: ["appointment", "John"], visibleToRoles: ["Salesperson", "BDC / Lead Coordinator", "Sales Manager", "Admin / Owner"] },
  { id: "TASK-1", category: "task-promise", title: "Collect pay stub", detail: "Promise due", sourceOwner: "Tasks", sourceLink: "/tasks/TASK-1", tokens: ["pay stub", "promise"], visibleToRoles: ["Salesperson", "Sales Manager", "Admin / Owner"] },
  { id: "REV-1", category: "revenue-opportunity", title: "Cash deal", detail: "Proposal", sourceOwner: "Sales Console", sourceLink: "/sales?record=REV-1", tokens: ["cash", "proposal"], visibleToRoles: ["Salesperson", "Sales Manager", "Admin / Owner"] },
  { id: "MGR-1", category: "manager-review", title: "Review trade", detail: "Open", sourceOwner: "Sales Console", sourceLink: "/sales?review=MGR-1", tokens: ["review", "trade"], visibleToRoles: ["Sales Manager", "Admin / Owner"] },
  { id: "EVD-1", category: "evidence", title: "Pay stub", detail: "Received", sourceOwner: "Sales Console", sourceLink: "/sales?evidence=EVD-1", tokens: ["pay stub", "income"], visibleToRoles: ["Sales Manager", "Admin / Owner"] }
];

describe("Sales Console M57 federated search", () => {
  it("covers required categories", () => {
    expect(salesFederatedSearchCoversRequiredCategories(records)).toBe(true);
  });

  it("returns role-aware read-only results", () => {
    const search = searchFederatedSalesRecords("pay", records, "Salesperson");

    expect(search.state).toBe("ready");
    expect(search.results.map((result) => result.id)).toEqual(["TASK-1"]);
    expect(salesFederatedSearchIsReadOnly(search.results)).toBe(true);
  });

  it("supports empty state without writes", () => {
    const search = searchFederatedSalesRecords("no-match", records, "Admin / Owner");

    expect(search.state).toBe("empty");
    expect(search.results).toEqual([]);
  });
});
