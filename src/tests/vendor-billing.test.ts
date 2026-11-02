import { describe, expect, it } from "vitest";
import { billingCents, billingDate, billingPeriod, chicagoDate, monthlyDate, repaymentSchedule, dueBalances, normalizeBillingLines } from "@/lib/vendor-billing";

describe("vendor billing amounts and schedules",()=>{
 it("preserves exact cents and rejects invalid or unsupported amounts",()=>{
  expect(billingCents("$1,234.56")).toBe(123456);expect(billingCents("300")).toBe(30000);
  expect(billingCents("0",true)).toBe(0);
  for(const value of ["-1","0","12.345","NaN","10000000.01",300])expect(()=>billingCents(value)).toThrow();
 });
 it("keeps the original monthly anniversary across short months",()=>{
  expect(monthlyDate("2026-01-31",1)).toBe("2026-02-28");expect(monthlyDate("2026-01-31",2)).toBe("2026-03-31");
  expect(monthlyDate("2028-01-31",1)).toBe("2028-02-29");
  expect(()=>billingDate("2026-02-30")).toThrow();
 });
 it("records principal once and reduces only the final installment",()=>{
  const rows=repaymentSchedule("2026-01-31",100000,30000);
  expect(rows.map(r=>r.amountCents)).toEqual([30000,30000,30000,10000]);
  expect(rows.reduce((s,r)=>s+r.amountCents,0)).toBe(100000);
  expect(dueBalances(rows,45000).map(r=>r.outstandingCents)).toEqual([0,15000,30000,10000]);
  expect(()=>repaymentSchedule("2026-01-01",601,1)).toThrow();
 });
 it("uses Chicago dates and Monday week boundaries",()=>{
  expect(chicagoDate(new Date("2026-11-01T02:00:00Z"))).toBe("2026-10-31");
  expect(billingPeriod("THIS_WEEK","2026-11-01")).toEqual(["2026-10-26","2026-11-02"]);
  expect(billingPeriod("TWO_WEEKS_AGO","2026-11-01")).toEqual(["2026-10-12","2026-10-19"]);
  expect(billingPeriod("LAST_MONTH","2026-01-03")).toEqual(["2025-12-01","2026-01-01"]);
 });
 it("requires a bounded, priced line list",()=>{
  expect(normalizeBillingLines([{description:"Tire work",amount:"123.45"}])[0].amountCents).toBe(12345);
  expect(()=>normalizeBillingLines([])).toThrow();expect(()=>normalizeBillingLines([{description:"",amount:"3"}])).toThrow();
 });
});
