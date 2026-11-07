type LinkedRecord={labelSnapshot:string;recordType:string;relationshipType:string};
type Batch={id:string;batchNumber:string;title?:string};

export function vendorLinkedWorkLabel(link:LinkedRecord,batches:Batch[]) {
  const prefix="INVOICE_BATCH:";
  if(link.relationshipType.startsWith(prefix)){
    const batch=batches.find(b=>b.id===link.relationshipType.slice(prefix.length));
    const invoice=link.labelSnapshot.split(/ · batch /i)[0];
    const batchLabel=batch ? (/^VI-[A-F0-9]+$/i.test(batch.batchNumber)?batch.title||"Invoice intake":batch.batchNumber):"Batch unavailable";
    return {title:`${invoice} · ${batchLabel}`,detail:"Vendor invoice linked to batch"};
  }
  const words=(value:string)=>value.split(":")[0].toLowerCase().replaceAll("_"," ").replace(/^./,c=>c.toUpperCase());
  return {title:link.labelSnapshot,detail:`${words(link.recordType)} · ${words(link.relationshipType)}`};
}

export function vendorWorkTicketLabel(number:string,notes?:string|null) {
  if(!/^VJ-I-[A-F0-9]+$/i.test(number))return number;
  const invoice=/^Prepared from reviewed invoice (.+?); original /i.exec(notes||"")?.[1];
  return invoice?`Invoice ${invoice}`:"Imported work ticket";
}
