import { beforeEach, describe, expect, it, vi } from "vitest";
const mocks=vi.hoisted(()=>({transaction:vi.fn(),db:{
 $queryRaw:vi.fn(),vendor:{findFirst:vi.fn()},vendorBillingEvent:{findUnique:vi.fn(),create:vi.fn()},
 vendorDocument:{findFirst:vi.fn(),findMany:vi.fn(),create:vi.fn()},vendorBillingDocument:{create:vi.fn()},vendorBillingDueItem:{create:vi.fn()},vendorInvoiceBatch:{findFirst:vi.fn()},vendorWorkJob:{findFirst:vi.fn()},vendorRecordLink:{create:vi.fn()}
}}));
vi.mock("@/server/db/client",()=>({prisma:{$transaction:mocks.transaction}}));
import { commandVendorBilling } from "@/server/vendors/vendor-billing-service";
import type { AuthenticatedUser } from "@/server/auth/store";
const user={id:"staff-1",isActive:true} as AuthenticatedUser;
const source={bytes:new TextEncoder().encode("%PDF-1.4 test invoice"),fileName:"invoice.pdf",contentType:"application/pdf"};
const fields={action:"CREATE_DOCUMENT",direction:"PAYABLE",commandKey:"stable-invoice-key",number:"INV-100",title:"Parts",issueDate:"2026-11-06",dueDate:"2026-12-06",tax:"10.25",scannedTotal:"160.25",unmatchedReason:"Supplies",lines:[{description:"Parts",amount:"150.00",workJobId:""}]};
beforeEach(()=>{vi.resetAllMocks();mocks.db.vendor.findFirst.mockResolvedValue({id:"vendor-1",status:"ACTIVE"});mocks.db.vendorDocument.create.mockResolvedValue({id:"original-1",title:"INV-100"});mocks.db.vendorBillingDocument.create.mockResolvedValue({id:"bill-1"});
 // Stop after observing the transactional write set; no database or real records are used.
 mocks.transaction.mockImplementation(async(callback: (db:typeof mocks.db)=>Promise<void>)=>{await callback(mocks.db);throw new Error("TRANSACTION_OBSERVED");});
 mocks.db.vendorInvoiceBatch.findFirst.mockResolvedValue({id:"batch-1"});mocks.db.vendorDocument.findMany.mockResolvedValue([]);mocks.db.vendorWorkJob.findFirst.mockResolvedValue({id:"job-1"});
});
describe("scanned invoice transaction",()=>{
 it("writes the original and received draft together and audits the source reference",async()=>{
  await expect(commandVendorBilling(user,"vendor-1",fields,source)).rejects.toThrow("TRANSACTION_OBSERVED");
  expect(mocks.db.vendorDocument.create).toHaveBeenCalledWith({data:expect.objectContaining({vendorId:"vendor-1",uploadedByUserId:"staff-1",documentType:"BILL_STATEMENT",fileData:Buffer.from(source.bytes)})});
  expect(mocks.db.vendorBillingDocument.create).toHaveBeenCalledWith({data:expect.objectContaining({direction:"PAYABLE",sourceReference:"Vendor document original-1: INV-100",amountCents:16025,taxCents:1025})});
  expect(mocks.transaction).toHaveBeenCalledWith(expect.any(Function),expect.objectContaining({isolationLevel:"Serializable"}));expect(mocks.db.vendorBillingEvent.create).toHaveBeenCalledTimes(1);
 });
 it("rejects an identical imported source before any writes",async()=>{mocks.db.vendorDocument.findFirst.mockResolvedValue({id:"existing"});await expect(commandVendorBilling(user,"vendor-1",fields,source)).rejects.toMatchObject({status:409});expect(mocks.db.vendorDocument.create).not.toHaveBeenCalled();expect(mocks.db.vendorBillingDocument.create).not.toHaveBeenCalled();});
 it("rejects unbalanced totals before writing the original",async()=>{await expect(commandVendorBilling(user,"vendor-1",{...fields,scannedTotal:"200.00"},source)).rejects.toThrow("must match");expect(mocks.db.vendorDocument.create).not.toHaveBeenCalled();});
 it("binds retries to both reviewed fields and original file bytes",async()=>{
  await expect(commandVendorBilling(user,"vendor-1",fields,source)).rejects.toThrow("TRANSACTION_OBSERVED");
  const event=mocks.db.vendorBillingEvent.create.mock.calls[0][0].data;mocks.db.vendorBillingEvent.findUnique.mockResolvedValue(event);mocks.db.vendorDocument.create.mockClear();
  await expect(commandVendorBilling(user,"vendor-1",fields,source)).rejects.toThrow("TRANSACTION_OBSERVED");expect(mocks.db.vendorDocument.create).not.toHaveBeenCalled();
  await expect(commandVendorBilling(user,"vendor-1",fields,{...source,bytes:new TextEncoder().encode("different file")})).rejects.toMatchObject({status:409});
 });
 it("cannot use the scan entry point to post invoices or create outgoing bills",async()=>{await expect(commandVendorBilling(user,"vendor-1",{...fields,direction:"RECEIVABLE"},source)).rejects.toThrow("drafts only");expect(mocks.transaction).not.toHaveBeenCalled();});
 it("creates a persistent invoice-to-batch link in the same transaction",async()=>{await expect(commandVendorBilling(user,"vendor-1",fields,{...source,batchId:"batch-1",sourceDocumentId:"packet-1",pages:[1,2]})).rejects.toThrow("TRANSACTION_OBSERVED");expect(mocks.db.vendorRecordLink.create).toHaveBeenCalledWith({data:expect.objectContaining({recordId:"bill-1",relationshipType:"INVOICE_BATCH:batch-1",vendorId:"vendor-1"})});expect(mocks.db.vendorDocument.create.mock.calls[0][0].data.notes).toContain('"pages":[1,2]');});
 it("rejects overlapping previously imported pages before writing",async()=>{mocks.db.vendorDocument.findMany.mockResolvedValue([{notes:'Invoice scan SHA256: old\n{"sourceDocumentId":"packet-1","pages":[1,2],"batchId":"batch-1"}'}]);await expect(commandVendorBilling(user,"vendor-1",fields,{...source,batchId:"batch-1",sourceDocumentId:"packet-1",pages:[2,3]})).rejects.toMatchObject({status:409});expect(mocks.db.vendorDocument.create).not.toHaveBeenCalled();});
 it("rejects closed batches and work tickets outside the target batch",async()=>{mocks.db.vendorInvoiceBatch.findFirst.mockResolvedValue(null);await expect(commandVendorBilling(user,"vendor-1",fields,{...source,batchId:"closed",sourceDocumentId:"packet-1",pages:[1]})).rejects.toMatchObject({status:409});mocks.db.vendorInvoiceBatch.findFirst.mockResolvedValue({id:"batch-1"});mocks.db.vendorWorkJob.findFirst.mockResolvedValue(null);await expect(commandVendorBilling(user,"vendor-1",{...fields,lines:[{description:"Repair",amount:"150.00",workJobId:"foreign-job"}]},{...source,batchId:"batch-1",sourceDocumentId:"packet-1",pages:[1]})).rejects.toThrow("selected batch");expect(mocks.db.vendorDocument.create).not.toHaveBeenCalled();});
});
