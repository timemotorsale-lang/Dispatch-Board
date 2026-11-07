"use client";
import {useState} from "react";
import Link from "next/link";
import {DOCUMENT_READING_PROFILES,type DocumentReadingPurpose} from "@/lib/document-reading";
import {DocumentReadingPanel} from "./document-reading-panel";
export function DocumentReadingWorkspace({initialPurpose="SALES"}:{initialPurpose?:DocumentReadingPurpose}){
 const [purpose,setPurpose]=useState(initialPurpose);
 return <section><h1>Read documents</h1><p>Scan paperwork once, review the information and continue in the existing workflow. Original business records and approvals remain separate.</p><label>Document purpose <select value={purpose} onChange={event=>setPurpose(event.target.value as DocumentReadingPurpose)}>{Object.entries(DOCUMENT_READING_PROFILES).map(([key,profile])=><option key={key} value={key}>{profile.label}</option>)}</select></label><DocumentReadingPanel key={purpose} purpose={purpose}/><p><Link href={DOCUMENT_READING_PROFILES[purpose].href}>Open {DOCUMENT_READING_PROFILES[purpose].label.toLowerCase()} workflow</Link> · <Link href="/capture">Capture home</Link></p></section>;
}
