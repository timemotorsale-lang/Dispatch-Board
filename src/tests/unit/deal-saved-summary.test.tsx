import { describe, expect, it } from "vitest";
import { renderToStaticMarkup } from "react-dom/server";
import { savedDealSummary, type SavedDealReviewRecord } from "@/lib/deal-saved-summary";
import { DealSavedSummary } from "@/features/crm-next/deal-saved-summary";
import { calculateLeaseToOwn, leaseCalculatorInputFromFields } from "@/lib/lease-to-own-form-packet";
import { cashMoney } from "@/lib/cash-retail-sale";

const base: SavedDealReviewRecord = {id:"deal-a",dealNumber:1234,revision:3,updatedAt:"2026-11-03T17:00:00Z",customerName:"Customer A",vehicleReference:"2024 Toyota RAV4",pathway:"retail-sale",status:"SOLD",snapshot:{"desk:form":{amount:"20000",ownerUserId:"staff-a"}}};
const lease = {agreedPrice:"20000",calculationMode:"PAYMENT_AMOUNT",targetPayment:"500",additionalItems:"0",capitalizedCostReduction:"5000",contractLength:"36",documentPreparationFee:"300",downPayment:"0",gpsCost:"0",multiplier:"2",originationFee:"0",otherRoadWorthyCost:"0",paymentFrequency:"Monthly",registrationFee:"516",salesTaxRate:"6.875",signingPaymentMode:"CAPITALIZED_REDUCTION",titleFee:"102.80",warrantyCost:"0",wholesaleCost:"0"};

describe("saved deal summary",()=>{
 it("uses the cash-sale calculation with trade, payoff, tax and entered payments",()=>{
  const summary=savedDealSummary({...base,snapshot:{...base.snapshot,"retail-sale:cashSaleFacts":{accessories:"500",rebate:"100",tradeAllowance:"2000",tradePayoff:"700",titleFee:"102.80",registrationFee:"516",paymentReceived:"5000"}}});
  expect(summary.structure.find(line=>line.label==="Taxes")?.value).toBe("$1,265.00");
  expect(summary.highlights).toContainEqual({label:"Cash sale total",value:"$21,283.80",emphasis:true});
  expect(summary.highlights).toContainEqual({label:"Worksheet balance",value:"$16,283.80",emphasis:true});
  expect(summary.highlights.find(line=>line.label==="Payment entered on worksheet")?.value).toBe("$5,000.00");
 });
 it("shares the lease calculator, preserves exact payment and includes residual and final payment",()=>{
  const input=leaseCalculatorInputFromFields(lease), result=calculateLeaseToOwn(input);
  const summary=savedDealSummary({...base,pathway:"lease-to-own",snapshot:{"lease-to-own:leaseInputs":lease}});
  expect(summary.error).toBe("");
  expect(summary.highlights.find(line=>line.label==="Base payment")?.value).toBe("$500.00");
  expect(summary.structure.find(line=>line.label==="Residual / purchase option")?.value).toBe(cashMoney(result.residualValueCents));
  expect(summary.highlights.find(line=>line.label==="Final payment")?.value).toBe(cashMoney(result.finalPeriodicPaymentCents));
 });
 it("reports invalid saved amounts without publishing zero or NaN totals",()=>{
  const summary=savedDealSummary({...base,snapshot:{"desk:form":{amount:"not a price"}}});
  expect(summary.error).toContain("Enter");expect(summary.highlights).toEqual([]);expect(summary.structure).toEqual([]);
 });
 it("does not invent financing totals when only entered BHPH terms exist",()=>{
  const summary=savedDealSummary({...base,pathway:"bhph",snapshot:{"bhph:terms":{salePrice:"25000",downPayment:"5000",paymentAmount:"500",termMonths:"40",paymentFrequency:"Monthly",apr:"0.00%"}}});
  expect(summary.highlights.find(line=>line.label==="Payment entered")?.value).toBe("$500.00");
  expect(JSON.stringify(summary)).not.toMatch(/Net Profit|Funded|Payment confirmed/);
 });
 it("keeps rental dates separate from a vehicle sale",()=>{
  const summary=savedDealSummary({...base,pathway:"daily-rental",snapshot:{"desk:form":{amount:"147"},"daily-rental:rentalFacts":{pickupDate:"2026-11-03",pickupTime:"10:00",dropoffDate:"2026-11-06",dropoffTime:"10:00"}}});
  expect(summary.highlights[0].label).toBe("Saved checkout amount");
  expect(summary.structure[0].value).toBe("2026-11-03 · 10:00");
 });
 it("uses the pathway-specific jacket and excludes sensitive identity fields",()=>{
  const summary=savedDealSummary({...base,snapshot:{jackets:{"retail-sale":"cash-jacket","lease-to-own":"other-jacket"},"retail-sale:leaseFacts":{idNumber:"sensitive-id",dateOfBirth:"2000-01-01"}}});
  expect(summary.jacketId).toBe("cash-jacket");expect(JSON.stringify(summary)).not.toContain("sensitive-id");
 });
 it("labels worksheet figures and blocks packet preparation while changes remain unsaved",()=>{
  const html=renderToStaticMarkup(<DealSavedSummary record={base} dirty busy={false} viewer="Staff A" viewerId="staff-a" onNavigate={()=>{}} onPreparePacket={()=>{}} onComplete={()=>{}} onSaveAndClose={()=>{}}/>);
  expect(html).toContain("last saved version");expect(html).toContain("Saved worksheet figures");expect(html).toContain("Deal #1234");expect(html).not.toContain("deal-a");
  expect(html).toMatch(/disabled=""[^>]*><svg[^]*?Prepare \/ print signing packet/);
  expect(html).not.toContain("Sold · finalized");
 });
});
