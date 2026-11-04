"use client";
import { useEffect, useId, useRef, useState } from "react";
import styles from "./customer-contact-details.module.css";
type Props = {customerId:string; phone?:string; email?:string; maskedValues?:string[]};
type Contact = {type:"PHONE"|"EMAIL";value:string};
export function CustomerContactDetails(props:Props) { return <ContactDetails key={props.customerId} {...props} />; }
function ContactDetails({customerId,phone,email,maskedValues}:Props) {
 const id=useId();const [contacts,setContacts]=useState<Contact[]|null>(null),[busy,setBusy]=useState(false),[error,setError]=useState("");
 const pending=useRef<AbortController|null>(null);
 useEffect(()=>()=>pending.current?.abort(),[]);
 async function reveal() {
  if(pending.current || contacts) return;
  const controller=new AbortController();pending.current=controller;setBusy(true);setError("");
  try {
   const response=await fetch(`/api/crm/v1/customers/${encodeURIComponent(customerId)}/contact-details`,{cache:"no-store",signal:controller.signal});
   const result=await response.json();
   if(!response.ok) throw new Error(result.error || "Contact details could not be loaded.");
   setContacts(result.contacts);
  } catch(error) { if(!controller.signal.aborted)setError(error instanceof Error?error.message:"Contact details could not be loaded. Try again."); }
  finally {pending.current=null;if(!controller.signal.aborted)setBusy(false);}
 }
 return <div id={id} className={styles.contact}>
  {contacts===null ? <>
   <button className={styles.masked} type="button" title="Click or double-click to show full contact details" aria-label="Reveal customer phone and email" onClick={()=>void reveal()} onDoubleClick={()=>void reveal()} disabled={busy}>{(maskedValues ?? [phone,email]).filter(Boolean).join(" · ") || "Contact details"}</button>
   <button className={styles.action} type="button" aria-controls={id} aria-expanded={false} onClick={()=>void reveal()} disabled={busy}>{busy?"Loading…":"Show contact details"}</button>
  </> : <>
   <div className={styles.values} aria-label="Full customer contact details">{contacts.length ? contacts.map(contact=><div key={`${contact.type}:${contact.value}`}><span>{contact.value}</span>{contact.type==="PHONE" && /^\+?[\d ()-]{7,}$/.test(contact.value) ? <a href={`tel:${contact.value.replace(/[^+\d]/g,"")}`}>Call</a> : contact.type==="EMAIL" && /^[^\s@]+@[^\s@]+$/.test(contact.value) ? <a href={`mailto:${encodeURIComponent(contact.value)}`}>Email</a> : null}</div>):<span>No phone number or email recorded.</span>}</div>
   <button className={styles.action} type="button" aria-controls={id} aria-expanded={true} onClick={()=>{setContacts(null);setError("");}}>Hide contact details</button>
  </>}
  {error && <span role="alert" className={styles.error}>{error}</span>}
 </div>;
}
