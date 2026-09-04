"use client";
import Link from "next/link";
import { useState } from "react";
import { UserPlus } from "lucide-react";
import styles from "./crm-contact-import.module.css";

function suggestions(text: string, person: string) {
  const phone = text.match(/(?:\+?1[\s.-]?)?\(?\d{3}\)?[\s.-]\d{3}[\s.-]\d{4}/)?.[0] ?? "";
  const email = text.match(/[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}/i)?.[0] ?? "";
  const name = person.trim() || text.split(/\s+-\s+|\s+·\s+/)[0].replace(phone, "").trim().slice(0,200);
  return { displayName: name, phoneNumber: phone, email };
}
export function CrmContactImport({ disabled, sourceId, sourceKind, sourceText, person = "", phoneNumber = "", company = "", followUpDate = "" }: { disabled:boolean; sourceId:string; sourceKind:"Quick Update"|"Daily Checklist"; sourceText:string; person?:string; phoneNumber?:string; company?:string; followUpDate?:string }) {
  const [draft,setDraft] = useState<ReturnType<typeof suggestions> & {company:string;followUpDate:string}|null>(null);
  const [saving,setSaving]=useState(false); const [result,setResult]=useState<{href:string;name:string;duplicate:boolean;sourceAlreadyImported:boolean}|null>(null); const [error,setError]=useState("");
  const [candidates,setCandidates]=useState<Array<{id:string;customerNumber:string;displayName:string;phoneNumber:string|null;email:string|null}>>([]);
  async function save(duplicateResolution?:"USE_EXISTING"|"CREATE_NEW",existingCustomerId?:string) { if(!draft||saving)return; setSaving(true);setError("");try{const response=await fetch('/api/coo-workbook/crm-contacts',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({...draft,sourceId,sourceKind,sourceText,duplicateResolution,existingCustomerId})});const payload=await response.json();if(response.status===409&&payload.code==='POSSIBLE_DUPLICATE'){setCandidates(payload.candidates??[]);return;}if(!response.ok)throw new Error(payload.error??'Unable to import contact.');setResult({href:payload.href,name:payload.customer.displayName,duplicate:payload.duplicate,sourceAlreadyImported:payload.sourceAlreadyImported});setCandidates([]);setDraft(null);}catch(error){setError(error instanceof Error?error.message:'Unable to import contact.');}finally{setSaving(false);} }
  return <div className={styles.importer}>
    {!draft && !result ? <button disabled={disabled} type="button" onClick={()=>setDraft({...suggestions(`${sourceText} ${company}`,person),...(phoneNumber ? { phoneNumber } : {}),company,followUpDate})}><UserPlus size={15}/> Add to CRM</button>:null}
    {draft ? <div className={styles.form} role="group" aria-label={`Add ${sourceKind} contact to CRM`}>
      <strong>Review before importing to CRM</strong><p>Suggestions came from this workbook item. Correct anything that was interpreted incorrectly.</p>
      <label>Customer name<input maxLength={200} value={draft.displayName} onChange={event=>setDraft({...draft,displayName:event.target.value})}/></label>
      <label>Phone number<input inputMode="tel" value={draft.phoneNumber} onChange={event=>setDraft({...draft,phoneNumber:event.target.value})}/></label>
      <label>Email address<input type="email" value={draft.email} onChange={event=>setDraft({...draft,email:event.target.value})}/></label>
      <label>Company / relationship<input maxLength={200} value={draft.company} onChange={event=>setDraft({...draft,company:event.target.value})}/></label>
      <label>Follow-up date<input type="date" value={draft.followUpDate} onChange={event=>setDraft({...draft,followUpDate:event.target.value})}/></label>
      <small>The source note will be preserved as an internal CRM note. Contact consent remains unknown until staff verifies it.</small>
      {candidates.length?<section className={styles.duplicates} aria-label="Possible duplicate CRM customers"><strong>Possible duplicate—double-check before adding</strong><p>No customer has been added. Choose a matching record, or confirm this is a different customer.</p>{candidates.map(candidate=><article key={candidate.id}><span><b>{candidate.displayName}</b><small>{[candidate.customerNumber,candidate.phoneNumber,candidate.email].filter(Boolean).join(' · ')}</small></span><button disabled={saving} type="button" onClick={()=>void save('USE_EXISTING',candidate.id)}>Use existing customer</button><Link href={`/crm/customers/${encodeURIComponent(candidate.id)}`}>Review CRM record</Link></article>)}<button disabled={saving} type="button" onClick={()=>void save('CREATE_NEW')}>None match—create new customer</button></section>:null}
      <span>{!candidates.length?<button disabled={saving||!draft.displayName.trim()||(!draft.phoneNumber.trim()&&!draft.email.trim())} type="button" onClick={()=>void save()}>{saving?'Checking…':'Check and import'}</button>:null}<button disabled={saving} type="button" onClick={()=>{setDraft(null);setCandidates([]);setError('')}}>Cancel</button></span>
    </div>:null}
    {result?<p role="status">{result.sourceAlreadyImported?'This workbook item was already imported. ':result.duplicate?'Matched an existing CRM customer. ':'CRM customer created. '}<Link href={result.href}>Open {result.name} →</Link></p>:null}
    {error?<p role="alert">{error}</p>:null}
  </div>;
}
