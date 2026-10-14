import { describe, expect, it } from "vitest";
import { normalizePricing, comparePricing } from "@/server/inventory-unit/pricing-domain";
import { evaluateVehicleCapability } from "@/server/enterprise-command/vehicle-capabilities";

const input = { priceCents: 1000000, packEnabled: false, packCents: 0, includeEstimates: false, marginMode: "PERCENT", threshold: 2000, expectedVersion: 1, idempotencyKey: "price-1", reason: "Review the current proposed selling price" };
const costs = [{ id: "purchase", category: "ACQUISITION", status: "INCURRED", currency: "USD", amountCents: 750000 }, { id: "transport", category: "TRANSPORT", status: "INCURRED", currency: "USD", amountCents: 50000 }, { id: "estimate", category: "RECONDITIONING", status: "ESTIMATED", currency: "USD", amountCents: 50000 }];
describe("vehicle pricing policy", () => {
  it("uses selling-price percentage, counts all recorded readiness categories and compares exactly at the boundary", () => {
    expect(comparePricing(costs, input)).toMatchObject({ basisCents: 800000, marginCents: 200000, marginPercent: 20, meetsThreshold: true });
    expect(comparePricing(costs, { ...input, priceCents: 999999 }).meetsThreshold).toBe(false);
  });
  it("uses optional pack and explicitly selected estimates without inventing a default pack", () => {
    expect(comparePricing(costs, { ...input, packCents: 10000 })).toMatchObject({ basisCents: 810000, meetsThreshold: false });
    expect(comparePricing(costs, { ...input, includeEstimates: true })).toMatchObject({ basisCents: 850000, meetsThreshold: false });
    expect(comparePricing(costs, { ...input, marginMode: "AMOUNT", threshold: 200000 }).meetsThreshold).toBe(true);
    expect(comparePricing(costs, { ...input, marginMode: "OFF", threshold: null }).meetsThreshold).toBeNull();
  });
  it("does not infer a zero cost basis when acquisition or supported classification is missing", () => {
    expect(comparePricing([], input)).toMatchObject({ known: false, marginCents: null, meetsThreshold: false });
    expect(comparePricing([...costs, { id: "other", category: "TITLE", currency: "CAD", status: "INCURRED", amountCents: 100 }], input).known).toBe(false);
  });
  it.each([{ priceCents: 0 }, { packEnabled: false, packCents: 1 }, { threshold: 10001 }, { threshold: null }, { includeEstimates: "false" }, { expectedVersion: 0 }, { reason: "short" }])("rejects invalid settings %j", invalid => {
    expect(() => normalizePricing({ ...input, ...invalid })).toThrow();
  });
  it("allows managers and explicit grants to change price settings but not cost records", () => {
    const base = { id: "actor", name: "Actor", email: "actor@example.test", isActive: true, duties: { all: [], direct: [], roleDefaults: [] } };
    expect(evaluateVehicleCapability({ actor: { ...base, roles: ["General Manager"] }, capability: "INVENTORY_PRICING_MANAGE", grants: [], locationId: "loc" }).allowed).toBe(true);
    expect(evaluateVehicleCapability({ actor: { ...base, roles: ["Salesperson"] }, capability: "INVENTORY_UNIT_MANAGE", grants: [] }).allowed).toBe(false);
    expect(evaluateVehicleCapability({ actor: { ...base, roles: ["Salesperson"] }, capability: "INVENTORY_PRICING_MANAGE", grants: [{ capability: "INVENTORY_PRICING_MANAGE", effect: "ALLOW", locationId: "loc", validFrom: new Date("2000-01-01"), validTo: null }], locationId: "loc" }).allowed).toBe(true);
    expect(evaluateVehicleCapability({ actor: { ...base, roles: ["Mechanic"] }, capability: "INVENTORY_PRICING_MANAGE", grants: [] }).allowed).toBe(false);
    expect(evaluateVehicleCapability({ actor: { ...base, roles: ["Salesperson"] }, capability: "INVENTORY_PRICING_MANAGE", locationId: "loc", grants: [{ capability: "INVENTORY_PRICING_MANAGE", effect: "DENY", locationId: "loc", validFrom: new Date("2000-01-01"), validTo: null }] }).allowed).toBe(false);
  });
});
