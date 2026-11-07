"use client";
import {useEffect,useRef,useState} from "react";
import Image from "next/image";
import {DocumentScanner} from "@/features/mobile-capture/document-scanner";
import {DOCUMENT_READING_PROFILES,readingReconciliation,type DocumentReading,type DocumentReadingPurpose} from "@/lib/document-reading";
import styles from "./document-reading-panel.module.css";
export function applyReadingToForm(form:HTMLFormElement|null,fields:Record<string,string>,mapping:Record<string,string>){
 if(!form)return false;
 const changes=Object.entries(mapping).flatMap(([source,target])=>{const control=form.elements.namedItem(target);return fields[source]&& (control instanceof HTMLInputElement||control instanceof HTMLTextAreaElement||control instanceof HTMLSelectElement)?[{control,value:fields[source]}]:[];});
 const conflicts=changes.filter(({control,value})=>control.value.trim()&&control.value!==value);
 if(conflicts.length&&!window.confirm(`Replace these existing entries with reviewed document values: ${conflicts.map(x=>x.control.name).join(", ")}?`))return false;
 for(const {control,value} of changes){if(control instanceof HTMLSelectElement&&![...control.options].some(o=>o.value===value))continue;control.value=value;control.dispatchEvent(new Event("input",{bubbles:true}));control.dispatchEvent(new Event("change",{bubbles:true}));}
 return true;
}
export function DocumentReadingPanel({purpose,onApply,disabled=false,label}:{purpose:DocumentReadingPurpose;onApply?:(reading:DocumentReading,fields:Record<string,string>,file:File)=>void|Promise<void>;disabled?:boolean;label?:string}){
 const [file,setFile]=useState<File|null>(null),[reading,setReading]=useState<DocumentReading|null>(null),[fields,setFields]=useState<Record<string,string>>({}),[confirmed,setConfirmed]=useState(false),[busy,setBusy]=useState(false),[error,setError]=useState(""),[notice,setNotice]=useState(""),[scanner,setScanner]=useState(false),[preview,setPreview]=useState("");
 const requestRef=useRef<AbortController|null>(null),active=useRef(true);
 useEffect(()=>{active.current=true;return()=>{active.current=false;requestRef.current?.abort();};},[]);
  useEffect(()=>()=>{if(preview)URL.revokeObjectURL(preview);},[preview]);
 function choose(next:File|null){setFile(next);setPreview(next?URL.createObjectURL(next):"");setReading(null);setFields({});setConfirmed(false);setNotice("");setError("");}
 async function read(){if(!file||busy)return;setBusy(true);setError("");setConfirmed(false);setNotice("Reading every page. Keep this review open; no business records are being changed.");const controller=new AbortController();requestRef.current=controller;
  try{const body=new FormData();body.set("file",file);body.set("purpose",purpose);const response=await fetch("/api/document-library/read",{method:"POST",body,signal:controller.signal}),data=await response.json();if(!response.ok)throw new Error(data.error);if(active.current){setReading(data);setFields(Object.fromEntries((data as DocumentReading).fields.map(f=>[f.key,f.value])));setNotice(`Read ${data.pagesRead} of ${data.pageCount} pages. Review against the original before use.`);}}
  catch(error){if(active.current&&!controller.signal.aborted)setError(error instanceof Error?error.message:"Reading failed. Retry the same file.");}finally{if(active.current)setBusy(false);}
 }
 const reconciliation=readingReconciliation(fields);
 async function apply(){if(!reading||!file||!confirmed||busy||reconciliation||reading.duplicateMatches?.length)return;setBusy(true);setError("");try{await onApply?.(reading,fields,file);setNotice("Review finished. Check the destination form and save it separately.");}catch(error){setError(error instanceof Error?error.message:"The destination could not accept the reviewed values. Your review is retained.");}finally{setBusy(false);}}
 function exportReview(){if(!reading)return;const quote=(value:unknown)=>`"${String(value??"").replace(/^[=+@-]/,"'$&").replaceAll('"','""')}"`;const rows=[["File","Page","Field","Reviewed value","Source checksum"],...reading.fields.map(f=>[reading.fileName,f.page,f.label,fields[f.key],reading.checksum]),...reading.lines.map(l=>[reading.fileName,l.page,l.partNumber||l.unitCost,[l.description,l.quantity,l.amount].join(" | "),reading.checksum])];const url=URL.createObjectURL(new Blob([rows.map(r=>r.map(quote).join(",")).join("\r\n")],{type:"text/csv;charset=utf-8"}));const a=document.createElement("a");a.href=url;a.download="reviewed-document-information.csv";a.click();setTimeout(()=>URL.revokeObjectURL(url),1000);}
 return <section className={styles.panel} aria-label={label||`Read ${DOCUMENT_READING_PROFILES[purpose].label.toLowerCase()}`}>
  <h3>{label||`Scan / read ${DOCUMENT_READING_PROFILES[purpose].label.toLowerCase()}`}</h3>
  <p>Read up to {DOCUMENT_READING_PROFILES[purpose].maxPages} pages. Review suggestions before applying them. Reading does not approve, pay, verify signatures or complete delivery.</p>
  <p>The original stays in this session until attached through the destination workflow. Save reviewed information and supporting documents together.</p>
  <div className={styles.actions}><button type="button" disabled={disabled||busy} onClick={()=>setScanner(true)}>Scan with camera</button><label>Choose document<input type="file" disabled={disabled||busy} accept={purpose==="EXPENSE"?"application/pdf,image/jpeg,image/png":"application/pdf,image/jpeg,image/png,image/webp,text/plain"} onChange={event=>choose(event.target.files?.[0]||null)} /></label><button type="button" disabled={disabled||busy||!file} onClick={()=>void read()}>{busy?"Reading / preparing…":reading?"Read again":"Read document"}</button></div>
  {scanner&&<DocumentScanner maxPages={DOCUMENT_READING_PROFILES[purpose].maxPages} onClose={()=>setScanner(false)} onComplete={next=>{choose(next);setScanner(false);}} />}
  {notice&&<p role="status">{notice}</p>}{error&&<p role="alert">{error}</p>}
  {file&&preview&&<details><summary>View original · {file.name}</summary>{file.type==="application/pdf"?<iframe src={preview} title="Original document for OCR review" className={styles.preview}/>:file.type.startsWith("image/")?<Image src={preview} unoptimized alt="Original document for review" width={900} height={1000} className={styles.image}/>:<a href={preview} target="_blank" rel="noreferrer">View original text</a>}</details>}
  {reading&&<><div className={styles.fields}>{reading.fields.map(field=><label key={field.key}>{field.label}<input value={fields[field.key]||""} disabled={busy} maxLength={500} placeholder={field.alternatives?.length?"Conflicting values — check original":"Not read"} onChange={event=>{setFields(current=>({...current,[field.key]:event.target.value}));setConfirmed(false);}}/><small>Page {field.page}: {field.source}{field.alternatives?.length?` · Candidates: ${field.alternatives.join(" / ")}`:""}</small></label>)}</div>
   {reading.lines.length>0&&<div className={styles.scroll}><table><thead><tr><th>Part number</th><th>Description / merchant</th><th>Quantity</th><th>Unit cost / date</th><th>Amount</th><th>Source page</th></tr></thead><tbody>{reading.lines.map((line,index)=><tr key={index}>{(["partNumber","description","quantity","unitCost","amount"] as const).map(key=><td key={key}><input aria-label={`Row ${index+1} ${key}`} disabled={busy} value={line[key]} maxLength={200} onChange={event=>{setReading(current=>current?{...current,lines:current.lines.map((item,row)=>row===index?{...item,[key]:event.target.value}:item)}:current);setConfirmed(false);}}/></td>)}<td>{line.page}</td></tr>)}</tbody></table></div>}
   {reading.duplicateMatches?.length?<div role="alert"><strong>This exact receipt is already attached to spending. Open the existing record instead of creating another expense.</strong>{reading.duplicateMatches.map((match,index)=><p key={index}><a href={match.href}>{match.label}</a></p>)}</div>:null}
   {reading.warnings.map((warning,index)=><p key={index}>{warning}</p>)}{reconciliation&&<p role="alert">{reconciliation}</p>}
   <label className={styles.confirm}><input type="checkbox" checked={confirmed} disabled={busy} onChange={event=>setConfirmed(event.target.checked)}/>I reviewed these values, all pages and any exceptions against the original.</label>
   <div className={styles.actions}>{onApply&&<button type="button" disabled={!confirmed||busy||disabled||Boolean(reconciliation)||Boolean(reading.duplicateMatches?.length)} onClick={()=>void apply()}>Use reviewed information</button>}<button type="button" disabled={!confirmed||busy||Boolean(reconciliation)} onClick={exportReview}>Download reviewed information</button></div>
  </>}
 </section>;
}
