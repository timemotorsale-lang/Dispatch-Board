"use client";
import { useCallback, useEffect, useId, useRef, useState } from "react";
import styles from "./customer-contact-details.module.css";
type Props = {customerId:string; phone?:string; email?:string; maskedValues?:string[]; surface?:"legacy"|"crm-next"; autoReveal?:boolean};
type Contact = {type:"PHONE"|"EMAIL";value:string};
export function CustomerContactDetails(props:Props) { return <ContactDetails key={props.customerId} {...props} />; }
function ContactDetails({customerId,phone,email,maskedValues,surface="legacy",autoReveal=false}:Props) {
 const id=useId();const [contacts,setContacts]=useState<Contact[]|null>(null),[busy,setBusy]=useState(false),[error,setError]=useState("");
 const pending=useRef<AbortController|null>(null);
 const container=useRef<HTMLDivElement|null>(null);
 const attempted=useRef(false);
 useEffect(()=>()=>{pending.current?.abort();pending.current=null;attempted.current=false;},[]);
 const reveal=useCallback(async () => {
  if(pending.current || contacts) return;
  const controller=new AbortController();pending.current=controller;setBusy(true);setError("");
  try {
   const base=surface==="crm-next"?"/api/crm-next/customers":"/api/crm/v1/customers";
   const response=await fetch(`${base}/${encodeURIComponent(customerId)}/contact-details`,{cache:"no-store",signal:controller.signal});
   const result=await response.json().catch(()=>null);
   if(!response.ok) throw new Error(response.status===401?"Your session expired. Sign in again to see contacts.":result?.error || "Contact details could not be loaded. Retry or open the customer record.");
   if(!Array.isArray(result?.contacts))throw new Error("Contact details could not be loaded. Retry or open the customer record.");
   setContacts(result.contacts);
  } catch(error) { if(!controller.signal.aborted)setError(error instanceof Error?error.message:"Contact details could not be loaded. Try again."); }
  finally {if(pending.current===controller){pending.current=null;if(!controller.signal.aborted)setBusy(false);}}
 },[customerId,surface,contacts]);
 useEffect(()=>{
  if(!autoReveal || attempted.current || !container.current)return;
  const start=()=>{if(attempted.current)return;attempted.current=true;void reveal();};
  if(typeof IntersectionObserver==="undefined"){start();return;}
  const observer=new IntersectionObserver(entries=>{if(entries.some(entry=>entry.isIntersecting)){observer.disconnect();start();}});
  observer.observe(container.current);return()=>observer.disconnect();
 },[autoReveal,reveal]);
 return <div ref={container} id={id} className={styles.contact}>
  {contacts===null ? <>
   <button className={styles.masked} type="button" title="Click or double-click to show full contact details" aria-label="Reveal customer phone and email" onClick={()=>void reveal()} onDoubleClick={()=>void reveal()} disabled={busy}>{(maskedValues ?? [phone,email]).filter(Boolean).join(" · ") || "Contact details"}</button>
   <button className={styles.action} type="button" aria-controls={id} aria-expanded={false} onClick={()=>void reveal()} disabled={busy}>{busy?"Loading…":error?"Retry contact details":"Show contact details"}</button>
  </> : <>
   <div className={styles.values} aria-label="Full customer contact details">{contacts.length ? contacts.map(contact=><div key={`${contact.type}:${contact.value}`}><span>{contact.value}</span>{contact.type==="PHONE" && /^\+?[\d ()-]{7,}$/.test(contact.value) ? <a href={`tel:${contact.value.replace(/[^+\d]/g,"")}`}>Call</a> : contact.type==="EMAIL" && /^[^\s@]+@[^\s@]+$/.test(contact.value) ? <a href={`mailto:${encodeURIComponent(contact.value)}`}>Email</a> : null}</div>):<span>No phone number or email recorded.</span>}</div>
   <button className={styles.action} type="button" aria-controls={id} aria-expanded={true} onClick={()=>{setContacts(null);setError("");}}>Hide contact details</button>
  </>}
  {error && <span role="alert" className={styles.error}>{error}</span>}
 </div>;
}
