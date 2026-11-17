import { describe, expect, it } from "vitest";
import { vendorLinkedWorkLabel, vendorWorkTicketLabel } from "@/lib/vendor-readable-references";
const id="ven_8accb041-1b8c-4856-8f23-056be782fabc";
const batches=[{id,batchNumber:"VB-00004",title:"October invoices"}];
describe("human-readable vendor references",()=>{
 it("resolves existing stored database IDs to the actual batch number",()=>{
  const display=vendorLinkedWorkLabel({labelSnapshot:`Invoice 2077 · batch ${id}`,recordType:"OTHER",relationshipType:`INVOICE_BATCH:${id}`},batches);
  expect(display).toEqual({title:"Invoice 2077 · VB-00004",detail:"Vendor invoice linked to batch"});expect(JSON.stringify(display)).not.toContain(id);
 });
 it("handles newly saved readable snapshots without repeating the batch reference",()=>{expect(vendorLinkedWorkLabel({labelSnapshot:"Invoice INV-A/42 · batch VB-00004",recordType:"OTHER",relationshipType:`INVOICE_BATCH:${id}`},batches).title).toBe("Invoice INV-A/42 · VB-00004");});
 it("does not invent a batch number or expose an ID when the batch is unavailable",()=>{const display=vendorLinkedWorkLabel({labelSnapshot:`Invoice 2077 · batch ${id}`,recordType:"OTHER",relationshipType:`INVOICE_BATCH:${id}`},[]);expect(display.title).toBe("Invoice 2077 · Batch unavailable");expect(JSON.stringify(display)).not.toContain(id);});
 it("uses an intake title rather than exposing a legacy batch hash",()=>{expect(vendorLinkedWorkLabel({labelSnapshot:`Invoice 2077 · batch ${id}`,recordType:"OTHER",relationshipType:`INVOICE_BATCH:${id}`},[{id,batchNumber:"VI-ABCDEF01234567",title:"October invoice intake"}]).title).toBe("Invoice 2077 · October invoice intake");});
 it("keeps other linked-work titles and humanizes their relationship labels",()=>{expect(vendorLinkedWorkLabel({labelSnapshot:"Call vendor",recordType:"TASK",relationshipType:"CREATED_FROM_VENDOR"},batches)).toEqual({title:"Call vendor",detail:"Task · Created from vendor"});});
 it("preserves assigned ticket numbers and shows real source invoice numbers for legacy imported tickets",()=>{
  expect(vendorWorkTicketLabel("VJ-00012","Anything")).toBe("VJ-00012");
  expect(vendorWorkTicketLabel("VJ-I-A83C70A87D92EC","Prepared from reviewed invoice 2077; original internal-source. Unverified.")).toBe("Invoice 2077");
  expect(vendorWorkTicketLabel("VJ-I-A83C70A87D92EC")).toBe("Imported work ticket");
 });
});
