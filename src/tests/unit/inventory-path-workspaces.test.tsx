import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it, vi } from "vitest";
import { mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import type { VehicleJourneyModel } from "@/server/inventory-unit/journey-service";
import { InventoryUnitFoundationWorkspace } from "@/features/inventory/inventory-unit-foundation-workspace";
import { FrontlinePreparationWorkspace } from "@/features/inventory/frontline-preparation-workspace";
import unitStyles from "@/features/inventory/inventory-unit-foundation-workspace.module.css";
import frontlineStyles from "@/features/inventory/frontline-preparation-workspace.module.css";
import { VehicleWorkflowChoice } from "@/features/inventory/vehicle-workflow-choice";
import choiceStyles from "@/features/inventory/vehicle-workflow-choice.module.css";

vi.mock("next/navigation", () => ({ useRouter: () => ({ push: vi.fn(), refresh: vi.fn() }) }));

const item = { id: "unit-1", inventoryNumber: "333586", lifecycleStage: "PURCHASED_OR_TRADE_IN", operatingState: "ACTIVE", financialAcquiredAt: "2026-10-01T12:00:00Z", stageStartedAt: "2026-10-01T12:00:00Z", targetAt: "2026-10-15T12:00:00Z", nextAction: "Review received condition", stateReason: null, version: 3, age: { overdue: false, stageAgeHours: 24, totalAgeHours: 48, targetVarianceHours: -24 }, vehicle: { id: "vehicle-1", vehicleNumber: "V001", stockNumber: "333586", year: 2024, make: "Toyota", model: "RAV4", vin: "JTMBFREV0ED123456" }, ownerUser: { id: "owner", name: "Brock Harris" }, location: { id: "lot", code: "TMS-001", name: "Time Motor Sales" }, _count: { stateEvents: 1 } };
const detail = { ...item, stateEvents: [] };
const initial = { items: [item], page: 1, pageSize: 25, total: 1, totalPages: 1 };
const options = { vehicles: [], users: [ { ...item.ownerUser, email: "test@example.test" } ], locations: [item.location] };
const journey = { vehicle: item.vehicle, unit: { ...item, ownerUser: item.ownerUser, locationId: item.location.id }, access: { inventory: true, costs: true, pricing: true, repair: true, evidence: true }, proposal: { priceCents: 2899500, stale: false }, costs: { incurredCents: 2400000, estimatedCents: 25000 }, blocked: false, frontline: null, steps: [{ id: "intake", label: "Acquisition & Intake", status: "Confirmed", href: "/vehicles/vehicle-1/intake" }, { id: "frontline", label: "Frontline release", status: "Not started", href: "/vehicles/inventory-to-frontline?vehicleId=vehicle-1" }], intake: { status: "CONFIRMED", pendingItems: [], handoff: { condition: "Runs and drives. Cosmetic inspection complete.", keys: 2, odometer: 42227, odometerUnit: "MILES", pendingNotes: "Photos and final readiness review remain.", documents: "Purchase receipt recorded." } } } as unknown as VehicleJourneyModel;

function review(name: string, html: string, cssFile: string, styles: Record<string, string>) {
  const output = process.env.INVENTORY_REVIEW_OUTPUT;
  if (!output) return;
  let css = readFileSync(cssFile, "utf8");
  const globals = new Set([...css.matchAll(/:global\(\.([a-zA-Z][a-zA-Z0-9_-]*)/g)].map(match => match[1]));
  const keys = new Set([...css.matchAll(/\.([a-zA-Z][a-zA-Z0-9_-]*)/g)].map(match => match[1]));
  for (const key of keys) if (!globals.has(key)) css = css.replaceAll(new RegExp(`\\.${key}(?![a-zA-Z0-9_-])`, "g"), `.${styles[key]}`);
  css = css.replaceAll(/:global\(([^)]+)\)/g, "$1");
  mkdirSync(output, { recursive: true });
  writeFileSync(join(output, `${name}.html`), `<!doctype html><html><head><meta name="viewport" content="width=device-width,initial-scale=1"><style>body{margin:0;padding:24px;background:#f5f7f9;font-family:Arial,sans-serif}*{box-sizing:border-box}a{color:#22578c}button,input,select{font:inherit}.panel-card{background:white;border:1px solid #d6dce4}.page-stack{display:grid;gap:16px}.ict-module-nav{display:flex;gap:20px;padding:12px;border-bottom:1px solid #d6dce4}.form-field{display:grid;gap:6px}.etw-facts{display:flex;flex-wrap:wrap;gap:20px}.etw-facts dd{margin:0}.form-actions{display:flex;gap:10px}button{cursor:pointer}.button{padding:10px}.notice{padding:10px}h2{font-size:18px}.eyebrow{font-size:12px}${css}</style></head><body>${html}</body></html>`);
}

describe("inventory path workspaces", () => {
  it("offers sale and recon after confirmed intake without converting inventory to customer service", () => {
    const html = renderToStaticMarkup(<VehicleWorkflowChoice journey={journey}/>);
    expect(html).toContain("Choose Vehicle Workflow");
    expect(html).toContain("/vehicles/vehicle-1/frontline");
    expect(html).toContain("/vehicles/vehicle-1/inventory-planning");
    expect(html).toContain("Not applicable to this inventory cycle");
    expect(html).not.toContain("repair-orders?vehicleId=vehicle-1");
    review("vehicle-workflow-choice", html, "src/features/inventory/vehicle-workflow-choice.module.css", choiceStyles);
  });
  it("does not offer inventory path links before confirmed intake", () => {
    const html = renderToStaticMarkup(<VehicleWorkflowChoice journey={{ ...journey, intake: null }}/>);
    expect(html).not.toContain("/vehicles/vehicle-1/frontline");
    expect(html).not.toContain("/vehicles/vehicle-1/inventory-planning");
    expect(html).toContain("Open intake");
  });
  it("keeps holds visible when selecting a preparation path", () => {
    const html = renderToStaticMarkup(<VehicleWorkflowChoice journey={{ ...journey, blocked: true }}/>);
    expect(html).toContain("On hold:");
    expect(html).not.toContain("Frontline verified");
  });
  it("renders a horizontal worklist and selected-vehicle path choices", () => {
    const html = renderToStaticMarkup(<InventoryUnitFoundationWorkspace initial={initial} options={options} initialSelected={detail}/>);
    expect(html).toContain("<table>");
    expect(html).toContain("Owner</th>");
    expect(html).toContain("/vehicles/vehicle-1/frontline");
    expect(html).toContain("/vehicles/vehicle-1/inventory-planning");
    expect(html).not.toContain("intentionally unavailable in 3A");
    expect(html).toContain("<summary>Create inventory unit</summary>");
    review("inventory-worklist", html, "src/features/inventory/inventory-unit-foundation-workspace.module.css", unitStyles);
  });
  it("requires a vehicle before offering either path", () => {
    const html = renderToStaticMarkup(<InventoryUnitFoundationWorkspace initial={initial} options={options}/>);
    expect(html).toContain("Choose a vehicle");
    expect(html).not.toContain("/vehicles/vehicle-1/frontline");
    expect(html).toMatch(/<button disabled="" type="button">/);
  });
  it("presents real preparation data without declaring the vehicle released", () => {
    const html = renderToStaticMarkup(<FrontlinePreparationWorkspace journey={journey} costs={null} pricing={null} documents={[]}/>);
    expect(html).toContain("2024 Toyota RAV4");
    expect(html).toContain("Preparation required");
    expect(html).toContain("$28,995.00");
    expect(html).toContain("Release Review");
    expect(html).toContain("Runs and drives");
    expect(html).not.toContain("Mark as Sold");
    review("frontline-preparation", html, "src/features/inventory/frontline-preparation-workspace.module.css", frontlineStyles);
  });
});
