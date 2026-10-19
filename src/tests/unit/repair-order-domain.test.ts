import { describe, expect, it } from "vitest";
import { normalizeRepairOrderControlUpdate, normalizeRepairOrderCreate, repairOrderAge } from "@/server/repair-order/domain";
const now=new Date("2026-07-14T12:00:00Z");
const base={arrivedAt:"2026-07-14T11:00:00Z",consentStatus:"PENDING",concernSummary:"Customer reports vibration above highway speed.",idempotencyKey:"ro-1",intakeSource:"WALK_IN",customerId:"customer-1",vehicleId:"vehicle-1",locationId:"loc-1",nextAction:"Complete intake review",ownerUserId:"owner-1",reason:"Open customer repair order intake.",targetAt:"2026-07-14T14:00:00Z",transportMode:"DROP_OFF"};
describe("repair-order core domain",()=>{
  it("allows internal repairs with vehicle identity and no acquisition unit", () => {
    expect(normalizeRepairOrderCreate({ ...base, intakeSource: "INVENTORY_RECON", inventoryUnitId: null }, now)).toMatchObject({ vehicleId: "vehicle-1", customerId: null, inventoryUnitId: null });
    expect(() => normalizeRepairOrderCreate({ ...base, intakeSource: "INVENTORY_RECON", inventoryUnitId: null, vehicleId: "" }, now)).toThrow("Vehicle ID");
    expect(normalizeRepairOrderCreate({ ...base, intakeSource: "INVENTORY_RECON", inventoryUnitId: "unit-1", vehicleId: null }, now).inventoryUnitId).toBe("unit-1");
  });
  it("normalizes controlled walk-in intake",()=>expect(normalizeRepairOrderCreate(base,now)).toMatchObject({intakeSource:"WALK_IN",operatingState:"ACTIVE",stateReason:null,keysReceivedCount:0}));
  it("requires documented consent evidence",()=>expect(()=>normalizeRepairOrderCreate({...base,consentStatus:"DOCUMENTED"},now)).toThrow("reference and time"));
  it("rejects future arrivals and sources without their authoritative identifier",()=>{expect(()=>normalizeRepairOrderCreate({...base,arrivedAt:"2026-07-14T13:00:00Z"},now)).toThrow("future");expect(()=>normalizeRepairOrderCreate({...base,intakeSource:"APPOINTMENT",appointmentId:""},now)).toThrow("Appointment ID")});
  it("does not allow later workflow states through the core control",()=>expect(()=>normalizeRepairOrderControlUpdate({expectedVersion:1,idempotencyKey:"one",locationId:"loc",nextAction:"Start repairs",operatingState:"CLOSED",ownerUserId:"owner",reason:"Attempt a premature close.",stateReason:"Work is done",targetAt:"2026-07-14T14:00:00Z"})).toThrow("invalid"));
  it("measures intake age and overdue target",()=>expect(repairOrderAge({now,openedAt:new Date("2026-07-14T08:00:00Z"),stageStartedAt:new Date("2026-07-14T09:00:00Z"),targetAt:new Date("2026-07-14T10:00:00Z")})).toMatchObject({openAgeHours:4,stageAgeHours:3,overdue:true,targetVarianceHours:2}));
});
