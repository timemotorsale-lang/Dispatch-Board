"use client";
import { useEffect, useRef, useState } from "react";
import { billingMoney } from "@/lib/vendor-billing";
import styles from "./vendor-invoice-intake.module.css";
import { reviewedBatchTotals, type BatchReviewedTotals } from "@/lib/vendor-batch-close";
type Invoice={id:string;number:string;issueDate:string;amountCents:number;taxCents:number;status:string;batchId:string|null;direction:string;lines?:Array<{workJobId:string|null}>};
export type BatchInvoicePrefill={invoiceNumber:string;invoiceDate:string;totalAmount:string;notes:string};
export function VendorBatchInvoices({vendorId,batchId,revision,onUse,onEditInvoice,onSummary,expectedJobs=[]}:{vendorId:string;batchId:string;revision:number;onUse?:(fields:BatchInvoicePrefill)=>void;onEditInvoice?:(id:string)=>void;onSummary?:(totals:BatchReviewedTotals)=>void;expectedJobs?:string[]}){
  const [rows,setRows]=useState<Invoice[]>([]),[error,setError]=useState(""),[canManage,setCanManage]=useState(false);
  const summary=useRef(onSummary),jobKey=[...expectedJobs].sort().join(",");
  useEffect(()=>{summary.current=onSummary;},[onSummary]);
  useEffect(()=>{const controller=new AbortController();void fetch(`/api/vendors/${encodeURIComponent(vendorId)}/billing`,{cache:"no-store",signal:controller.signal}).then(async response=>{const data=await response.json();if(!response.ok)throw new Error(data.error);if(!controller.signal.aborted){const invoices=data.documents.filter((d:Invoice)=>d.direction==="PAYABLE"&&d.batchId===batchId);setRows(invoices);setCanManage(data.canManage===true);setError("");summary.current?.(reviewedBatchTotals(invoices,jobKey?jobKey.split(","):[]));}}).catch(e=>{if(!controller.signal.aborted)setError(e instanceof Error?e.message:"Could not read batch invoices.");});return()=>controller.abort();},[vendorId,batchId,revision,jobKey]);
  const usable=rows.filter(d=>d.status==="DRAFT"||d.status==="POSTED"),total=usable.reduce((sum,d)=>sum+d.amountCents,0);
  const tax=usable.every(d=>Number.isSafeInteger(d.taxCents))?usable.reduce((sum,d)=>sum+d.taxCents,0):null;
  return <section className={styles.intake} aria-label="Invoices applied to batch"><h3>Invoices applied to this batch</h3>{error&&<p role="alert">{error}</p>}{!rows.length&&!error&&<p>No reviewed invoices have been applied. Use “Process into batch” beside an uploaded PDF.</p>}
    {rows.map(d=><div key={d.id}><p><strong>{d.number}</strong> · {d.issueDate} · {billingMoney(d.amountCents)} · {d.status}</p>{d.status==="DRAFT"&&canManage&&onEditInvoice&&<button type="button" aria-label={`Edit invoice ${d.number}`} onClick={()=>onEditInvoice(d.id)}>Edit invoice</button>}{d.status==="POSTED"&&<small>Posted invoice — use an adjustment in Billing to preserve the original.</small>}</div>)}
    {!!usable.length&&<>{tax!==null&&<p>Invoice subtotal before tax: <strong>{billingMoney(total-tax)}</strong> · Invoice tax: <strong>{billingMoney(tax)}</strong></p>}<p><strong>Reviewed invoice total: {billingMoney(total)}</strong> · {usable.length} draft/posted invoice(s), including separately stated tax. Disputed and void invoices are excluded. Drafts still require approval.</p>{onUse&&<button type="button" onClick={()=>onUse({invoiceNumber:usable.length===1&&usable[0].number.length<=80?usable[0].number:"",invoiceDate:usable.length===1?usable[0].issueDate:"",totalAmount:(total/100).toFixed(2),notes:`Reviewed invoices linked to this batch: ${usable.map(d=>d.number).join(", ")}. See the batch invoice list for individual amounts, dates and originals.`.slice(0,1200)})}>Fill batch closing fields from reviewed invoices</button>}<p>Multiple invoices retain their own numbers and dates in billing. Applying invoices does not close this batch or authorize payment.</p></>}
  </section>;
}
