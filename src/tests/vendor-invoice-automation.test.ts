import { describe, expect, it } from "vitest";
import { visualOcrLines } from "@/lib/ocr-reading-order";
import { parseVendorInvoice } from "@/lib/vendor-invoice-scan";
const text=`Sample Collision Inc
10/09/2026 100 Example Street
Example, MN 55400 Invoice #2123
Sample Motor Sales 2016 HONDA CRV
Labor Amount
REPLACE ENGINE $1,452.00
PARTS ROW 5.00 $12.50 $62.50
PARTS ROW 1.00 $16.50 $1 6.50
HAZARDOUS WASTE FEE $7.00
Subtotal $1,538.00
Tax $6.47
Total $1,544.47`;
describe("review-first invoice automation",()=>{
 it("restores right-hand values to their visual label rows",()=>{const words=[{text:"Subtotal",bbox:{x0:0,y0:10,x1:80,y1:30}},{text:"Tax",bbox:{x0:0,y0:40,x1:40,y1:60}},{text:"Total",bbox:{x0:0,y0:70,x1:40,y1:90}},{text:"$100.00",bbox:{x0:300,y0:11,x1:380,y1:31}},{text:"$8.00",bbox:{x0:300,y0:41,x1:380,y1:61}},{text:"$108.00",bbox:{x0:300,y0:71,x1:380,y1:91}}];expect(visualOcrLines(words)).toBe("Subtotal $100.00\nTax $8.00\nTotal $108.00");});
 it("reads inline invoice IDs and header dates and prepares a reconciled subtotal allocation",()=>{const scan=parseVendorInvoice(text,"Sample Collision & Glass");expect(scan).toMatchObject({number:"2123",issueDate:"2026-10-09",total:"1544.47",tax:"6.47",vehicleReference:"2016 HONDA CRV",lineItemsMode:"SUBTOTAL",vendorDetected:true});expect(scan.lines).toHaveLength(1);expect(scan.lines[0].amount).toBe("1538.00");expect(scan.workTicketProposal).toMatchObject({vehicleReference:"2016 HONDA CRV",serviceDate:"2026-10-09",amount:"1538.00"});expect(scan.dueDate).toBe("");});
 it("does not accept a calculated tax candidate without review or accept mismatched subtotal totals",()=>{const scan=parseVendorInvoice(text.replace("Tax $6.47","Tax 2.7"),"Sample Collision");expect(scan.tax).toBe("");expect(scan.taxProposal).toEqual({amount:"6.47",basis:"TOTAL_MINUS_SUBTOTAL"});expect(scan.lines).toEqual([]);expect(scan.workTicketProposal).toBeUndefined();const mismatch=parseVendorInvoice(text.replace("Total $1,544.47","Total $1,600.00"),"Sample Collision");expect(mismatch.lines).toEqual([]);});
 it("does not suggest a tax difference when other adjustments could explain the difference",()=>{const scan=parseVendorInvoice(text.replace("Tax $6.47","Shipping $3.00\nTax unreadable"),"Sample Collision");expect(scan.taxProposal).toBeUndefined();expect(scan.tax).toBe("");});
 it("does not prepare another ticket when this batch already contains the printed vehicle reference",()=>{const scan=parseVendorInvoice(text,"Sample Collision",[{id:"known",vehicle:"2016 HONDA CRV",number:"JOB-999",batchId:"batch",batch:"Batch",description:"Repair",status:"OPEN"}]);expect(scan.workTicketProposal).toBeUndefined();expect(scan.warnings.join(" ")).toContain("existing ticket");});
 it("keeps issue dates separate from due dates and refuses multiple printed vehicle identities",()=>{const scan=parseVendorInvoice(text+"\nDue Date: 2026-11-09\n2020 TOYOTA CAMRY","Sample Collision");expect(scan.issueDate).toBe("2026-10-09");expect(scan.dueDate).toBe("2026-11-09");expect(scan.vehicleReference).toBe("");expect(scan.workTicketProposal).toBeUndefined();});
});
