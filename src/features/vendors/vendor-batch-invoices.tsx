"use client";
import { useEffect, useState } from "react";
import { billingMoney } from "@/lib/vendor-billing";
import styles from "./vendor-invoice-intake.module.css";
type Invoice={id:string;number:string;issueDate:string;amountCents:number;status:string;batchId:string|null;direction:string};
export type BatchInvoicePrefill={invoiceNumber:string;invoiceDate:string;totalAmount:string;notes:string};
export function VendorBatchInvoices({vendorId,batchId,revision,onUse}:{vendorId:string;batchId:string;revision:number;onUse?:(fields:BatchInvoicePrefill)=>void}){
  const [rows,setRows]=useState<Invoice[]>([]),[error,setError]=useState("");
  useEffect(()=>{const controller=new AbortController();void fetch(`/api/vendors/${encodeURIComponent(vendorId)}/billing`,{cache:"no-store",signal:controller.signal}).then(async response=>{const data=await response.json();if(!response.ok)throw new Error(data.error);if(!controller.signal.aborted){setRows(data.documents.filter((d:Invoice)=>d.direction==="PAYABLE"&&d.batchId===batchId));setError("");}}).catch(e=>{if(!controller.signal.aborted)setError(e instanceof Error?e.message:"Could not read batch invoices.");});return()=>controller.abort();},[vendorId,batchId,revision]);
  const usable=rows.filter(d=>d.status==="DRAFT"||d.status==="POSTED"),total=usable.reduce((sum,d)=>sum+d.amountCents,0);
  return <section className={styles.intake} aria-label="Invoices applied to batch"><h3>Invoices applied to this batch</h3>{error&&<p role="alert">{error}</p>}{!rows.length&&!error&&<p>No reviewed invoices have been applied. Use “Process into batch” beside an uploaded PDF.</p>}
    {rows.map(d=><p key={d.id}><strong>{d.number}</strong> · {d.issueDate} · {billingMoney(d.amountCents)} · {d.status}</p>)}
    {!!usable.length&&<><p><strong>Reviewed invoice total: {billingMoney(total)}</strong> · {usable.length} draft/posted invoice(s). Disputed and void invoices are excluded. Drafts still require approval.</p>{onUse&&<button type="button" onClick={()=>onUse({invoiceNumber:usable.length===1&&usable[0].number.length<=80?usable[0].number:"",invoiceDate:usable.length===1?usable[0].issueDate:"",totalAmount:(total/100).toFixed(2),notes:`Reviewed invoices linked to this batch: ${usable.map(d=>d.number).join(", ")}. See the batch invoice list for individual amounts, dates and originals.`.slice(0,1200)})}>Fill batch closing fields from reviewed invoices</button>}<p>Multiple invoices retain their own numbers and dates in billing. Applying invoices does not close this batch or authorize payment.</p></>}
  </section>;
}
