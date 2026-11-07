import {readingReconciliation,type DocumentReading,type ReadLine} from "./document-reading";
export type SavedDocumentReview={fields:Record<string,string>;lines:ReadLine[];confirmed:boolean};
export function validateDocumentReview(input:unknown,reading:DocumentReading):SavedDocumentReview{
 if(!input||typeof input!=="object")throw new Error("Review values are required.");
 const value=input as SavedDocumentReview;
 if(!value.fields||typeof value.fields!=="object"||Array.isArray(value.fields)||!Array.isArray(value.lines)||typeof value.confirmed!=="boolean"||value.lines.length!==reading.lines.length)throw new Error("Review structure changed. Reopen this read.");
 const keys=new Set(reading.fields.map(f=>f.key));
 if(Object.keys(value.fields).some(key=>!keys.has(key))||Object.values(value.fields).some(v=>typeof v!=="string"||v.length>500))throw new Error("Use the displayed fields with values up to 500 characters.");
 const fields=Object.fromEntries(reading.fields.map(f=>[f.key,value.fields[f.key]??f.value]));
 const lines=reading.lines.map((line,index)=>{const edited=value.lines[index];if(!edited||["partNumber","description","quantity","unitCost","amount"].some(key=>typeof edited[key as keyof ReadLine]!=="string"||String(edited[key as keyof ReadLine]).length>200))throw new Error("Use line values up to 200 characters.");return {...line,partNumber:edited.partNumber,description:edited.description,quantity:edited.quantity,unitCost:edited.unitCost,amount:edited.amount};});
 if(value.confirmed&&readingReconciliation(fields))throw new Error("Check the amounts before confirming this review.");
 if(value.confirmed&&reading.purpose==="PARTS"&&lines.some(line=>!/^\d+(?:\.\d+)?$/.test(line.quantity)||Number(line.quantity)<=0||!/^\d+(?:\.\d{1,2})?$/.test(line.unitCost)||!/^\d+(?:\.\d{1,2})?$/.test(line.amount)||Math.abs(Math.round(Number(line.quantity)*Number(line.unitCost)*100)-Math.round(Number(line.amount)*100))>1))throw new Error("Check quantity × unit cost against each parts line amount before confirming.");
 if(value.confirmed&&reading.purpose==="STATEMENT"&&lines.some(line=>!/^\d{4}-\d{2}-\d{2}$/.test(line.unitCost)||!Number.isFinite(Date.parse(line.unitCost))||new Date(line.unitCost).toISOString().slice(0,10)!==line.unitCost||! /^-?\d+(?:\.\d{1,2})?$/.test(line.amount)))throw new Error("Check each statement date and debit/credit amount before confirming.");
 return {fields,lines,confirmed:value.confirmed};
}
// Text is rendered as React text, never as HTML from an uploaded document.
export function sourceTextSegments(text:string,source:string){
 const start=source?text.indexOf(source):-1;
 if(start<0||text.indexOf(source,start+source.length)>=0)return {before:text,match:"",after:""};
 return {before:text.slice(0,start),match:text.slice(start,start+source.length),after:text.slice(start+source.length)};
}
