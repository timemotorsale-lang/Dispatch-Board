import { describe, expect, it } from "vitest";
import { parseVendorInvoice, type InvoiceJob } from "@/lib/vendor-invoice-scan";
const jobs:InvoiceJob[]=[{id:"job-1",number:"JOB-0012",batchId:"batch-1",batch:"BATCH-100",vehicle:"Sample vehicle",description:"Repair",status:"OPEN"}];
const invoice=`Example Repair LLC
Invoice #: INV-123
Invoice Date: 11/06/2026
Due Date: 2026-12-06
BATCH-100
JOB-0012 Repair labor 100.00
Parts 50.00
Sales Tax 10.25
Invoice Total 160.25`;
describe("vendor invoice scan suggestions",()=>{
 it("suggests an exact VIN match without using ambiguous vehicle descriptions",()=>{const vin="1HGCM82633A004352";const scan=parseVendorInvoice(invoice.replace("JOB-0012",vin),"Example Repair LLC",[{...jobs[0],vehicle:`Sample vehicle ${vin}`}]);expect(scan.lines[0].workJobId).toBe("job-1");const other=parseVendorInvoice(invoice.replace("JOB-0012","Sample vehicle"),"Example Repair LLC",[{...jobs[0],vehicle:"Sample vehicle"}]);expect(other.lines[0].workJobId).toBe("");});
 it("extracts cents, dates and exact work / batch matches with reconciled lines",()=>{
  const scan=parseVendorInvoice(invoice,"Example Repair LLC",jobs);
  expect(scan).toMatchObject({number:"INV-123",issueDate:"2026-11-06",dueDate:"2026-12-06",total:"160.25",tax:"10.25",batchId:"batch-1",vendorDetected:true});
  expect(scan.lines).toEqual([{description:"JOB-0012 Repair labor",amount:"100.00",workJobId:"job-1"},{description:"Parts",amount:"50.00",workJobId:""}]);
 });
 it("does not use balance due, estimates or missing tax to invent invoice values",()=>{
  const scan=parseVendorInvoice("Invoice No: A-100\nBalance Due 50.00\nRepair 200.00\nInvoice Date: 02/30/2026","Other vendor",jobs);
  expect(scan.total).toBe("");expect(scan.tax).toBe("");expect(scan.issueDate).toBe("");expect(scan.lines).toEqual([]);expect(scan.vendorDetected).toBe(false);
 });
 it("requires splitting a combined file with different invoices",()=>{
  const scan=parseVendorInvoice(invoice+"\nInvoice No: INV-456","Example Repair LLC",jobs);
  expect(scan.multipleInvoices).toBe(true);expect(scan.number).toBe("");
 });
 it("does not guess conflicting totals or dates and does not match partial ticket numbers",()=>{
  const scan=parseVendorInvoice(invoice.replace("JOB-0012","JOB-00123")+"\nGrand Total 170.25\nInvoice Date: 11/07/2026","Example Repair LLC",jobs);
  expect(scan.total).toBe("");expect(scan.issueDate).toBe("");expect(scan.lines).toEqual([]);
 });
 it("keeps ambiguous job matches unlinked even when amounts reconcile",()=>{
  const scan=parseVendorInvoice(invoice,"Example Repair LLC",[...jobs,{...jobs[0],id:"job-2"}]);expect(scan.lines[0].workJobId).toBe("");
 });
 it("does not infer a missing due date from terms",()=>{
  const scan=parseVendorInvoice(invoice.replace("Due Date: 2026-12-06","Terms: Net 30"),"Example Repair LLC");expect(scan.dueDate).toBe("");
 });
});
