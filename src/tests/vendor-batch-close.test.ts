import { describe, expect, it } from "vitest";
import { vendorBatchCloseFields, reviewedBatchTotals } from "@/lib/vendor-batch-close";
const batch={id:"batch-4",jobCount:6,jobTotal:6001.19};
describe("batch closing total prefill",()=>{
 it("populates the selected batch's actual work total without requiring the invoice-copy button",()=>{expect(vendorBatchCloseFields(batch,undefined,"2026-11-07")).toEqual({invoiceDate:"2026-11-07",invoiceNumber:"",notes:"",totalAmount:"6001.19"});});
 it("updates an untouched amount after more work is imported while preserving edits to unrelated fields",()=>{expect(vendorBatchCloseFields({...batch,jobTotal:6101.19},{notes:"Check vehicle",invoiceNumber:"Vendor reference"},"2026-11-07")).toMatchObject({totalAmount:"6101.19",notes:"Check vehicle",invoiceNumber:"Vendor reference"});});
 it("preserves a manual amount, an intentionally cleared amount, or an explicitly chosen tax-inclusive invoice total",()=>{for(const amount of ["5900.00","","6057.33"])expect(vendorBatchCloseFields(batch,{totalAmount:amount},"2026-11-07").totalAmount).toBe(amount);});
 it("does not carry one batch's total into another batch or unbatched work",()=>{const drafts={"batch-4":{totalAmount:"5900.00"}};const other={id:"batch-5",jobCount:2,jobTotal:250};expect(vendorBatchCloseFields(other,drafts[other.id as keyof typeof drafts],"2026-11-07").totalAmount).toBe("250.00");expect(vendorBatchCloseFields(null,undefined,"2026-11-07").totalAmount).toBe("");});
 it("does not fabricate a zero total for an empty batch or use an invalid amount",()=>{expect(vendorBatchCloseFields({...batch,jobCount:0,jobTotal:0},undefined,"2026-11-07").totalAmount).toBe("");expect(vendorBatchCloseFields({...batch,jobTotal:NaN},undefined,"2026-11-07").totalAmount).toBe("");});
 it("separates the actual batch subtotal from invoice tax and total",()=>{
  const totals=reviewedBatchTotals([{status:"DRAFT",amountCents:154447,taxCents:647,lines:[{workJobId:"job-1"}]},{status:"POSTED",amountCents:451286,taxCents:4967,lines:[{workJobId:"job-2"}]}],["job-1","job-2"]);
  expect(totals).toEqual({subtotalCents:600119,taxCents:5614,totalCents:605733,complete:true});
  expect(vendorBatchCloseFields({...batch,reviewedSubtotalCents:totals.subtotalCents},undefined,"2026-11-07").totalAmount).toBe("6001.19");
 });
 it("refreshes untouched totals after an invoice correction but retains a manual override",()=>{expect(vendorBatchCloseFields({...batch,reviewedSubtotalCents:610119},undefined,"2026-11-07").totalAmount).toBe("6101.19");expect(vendorBatchCloseFields({...batch,reviewedSubtotalCents:610119},{totalAmount:"5900.00"},"2026-11-07").totalAmount).toBe("5900.00");});
 it("does not replace a full batch amount with a partial or disputed invoice subset",()=>{
  const rows=[{status:"DRAFT",amountCents:10800,taxCents:800,lines:[{workJobId:"one"}]},{status:"DISPUTED",amountCents:50000,taxCents:0,lines:[{workJobId:"two"}]}];expect(reviewedBatchTotals(rows,["one","two"])).toMatchObject({subtotalCents:10000,complete:false});
 });
});
