export type BatchCloseFields={invoiceDate:string;invoiceNumber:string;notes:string;totalAmount:string};
export type BatchCloseDraft=Partial<BatchCloseFields>&{totalSource?:"MANUAL"|"REVIEWED_INVOICES"};
type Batch={id:string;jobCount:number;jobTotal:number;reviewedSubtotalCents?:number};

// Derive untouched fields from the selected batch. Explicit edits, including an intentional blank, win.
export function vendorBatchCloseFields(batch:Batch|null,draft:BatchCloseDraft|undefined,today:string):BatchCloseFields {
  const cents=batch?.reviewedSubtotalCents??(batch?Math.round(batch.jobTotal*100):NaN);
  const totalAmount=batch&&(batch.jobCount>0||batch.reviewedSubtotalCents!==undefined)&&Number.isSafeInteger(cents)&&cents>=0?(cents/100).toFixed(2):"";
  return {invoiceDate:draft?.invoiceDate??today,invoiceNumber:draft?.invoiceNumber??"",notes:draft?.notes??"",totalAmount:draft?.totalAmount??totalAmount};
}

export type BatchReviewedTotals={subtotalCents:number;taxCents:number;totalCents:number;complete:boolean};
export function reviewedBatchTotals(rows:Array<{status:string;amountCents:number;taxCents:number;lines?:Array<{workJobId:string|null}>}>,expectedJobs:string[]):BatchReviewedTotals {
  const usable=rows.filter(r=>r.status==="DRAFT"||r.status==="POSTED");
  const valid=usable.every(r=>Number.isSafeInteger(r.amountCents)&&Number.isSafeInteger(r.taxCents)&&r.amountCents>=r.taxCents&&r.taxCents>=0);
  const covered=new Set(usable.flatMap(r=>r.lines?.map(l=>l.workJobId).filter(Boolean)||[]));
  const totalCents=usable.reduce((sum,r)=>sum+r.amountCents,0),taxCents=usable.reduce((sum,r)=>sum+r.taxCents,0);
  return {subtotalCents:totalCents-taxCents,taxCents,totalCents,complete:usable.length>0&&valid&&expectedJobs.every(id=>covered.has(id))};
}
