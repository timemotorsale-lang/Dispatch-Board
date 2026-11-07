export const DOCUMENT_READING_PROFILES = {
  EXPENSE: {label:"Spending receipt",href:"/money-resources",maxPages:10},
  PURCHASE: {label:"Inventory purchase",href:"/vehicles/import-export?mode=import&kind=documents",maxPages:28},
  VENDOR_INVOICE: {label:"Vendor invoice",href:"/customers/vendors",maxPages:24},
  CLAIM_AUTHORIZATION: {label:"Claim authorization",href:"/vehicles/claims-workspace",maxPages:28},
  CLAIM_ESTIMATE: {label:"Claim estimate / supplement",href:"/vehicles/claims-workspace",maxPages:28},
  SALES: {label:"Sales / lease document",href:"/sales-documents",maxPages:28},
  PARTS: {label:"Parts invoice / packing slip",href:"/vehicles/parts-receiving",maxPages:28},
  TITLE: {label:"Title / lien / registration",href:"/vehicles/registry",maxPages:28},
  TRANSPORT: {label:"Transport / delivery receipt",href:"/vehicles/disposition-wholesale",maxPages:28},
  WARRANTY: {label:"Warranty / return / credit",href:"/vehicles/parts-counter",maxPages:28},
  STATEMENT: {label:"Bank / card statement",href:"/money-resources",maxPages:28},
  BUSINESS_CARD: {label:"Business contact",href:"/crm-next/new",maxPages:10}
} as const;
export type DocumentReadingPurpose=keyof typeof DOCUMENT_READING_PROFILES;
export type ReadField={key:string;label:string;value:string;page:number;source:string;alternatives?:string[]};
export type ReadLine={partNumber:string;description:string;quantity:string;unitCost:string;amount:string;page:number};
export type ReadPage={page:number;text:string;method:string};
export type DocumentReading={purpose:DocumentReadingPurpose;fileName:string;checksum:string;pageCount:number;pagesRead:number;fields:ReadField[];lines:ReadLine[];warnings:string[];needsReview:true;duplicateMatches?:Array<{label:string;href:string}>};
export function isDocumentReadingPurpose(value:unknown):value is DocumentReadingPurpose{return typeof value==="string"&&Object.hasOwn(DOCUMENT_READING_PROFILES,value);}
export function documentReadingPurposeFromText(text:string):DocumentReadingPurpose|null{
 if(/\b(?:packing slip|part number|parts invoice)\b/i.test(text))return "PARTS";
 if(/\b(?:statement period|opening balance|closing balance|account statement)\b/i.test(text))return "STATEMENT";
 if(/\b(?:bill of lading|carrier signature|transport invoice)\b/i.test(text))return "TRANSPORT";
 if(/\b(?:return authorization|warranty claim|RMA)\b/i.test(text))return "WARRANTY";
 if(/\b(?:certificate of title|title number|lienholder)\b/i.test(text))return "TITLE";
 if(/\b(?:claim communication authorization|direction to pay)\b/i.test(text))return "CLAIM_AUTHORIZATION";
 if(/\b(?:lease agreement|retail installment|buyer['’]s order)\b/i.test(text))return "SALES";
 if(/\b(?:buyer['’]s? fee|auction invoice|bill of sale)\b/i.test(text))return "PURCHASE";
 if(/\b(?:invoice number|invoice #)\b/i.test(text))return "VENDOR_INVOICE";
 if(/\b(?:receipt number|receipt #|cash receipt|gallons|paid with)\b/i.test(text))return "EXPENSE";
 return null;
}
const money=(value:string)=>{const text=value.replace(/[$,\s]/g,"");return /^\d+(?:\.\d{1,2})?$/.test(text)?Number(text).toFixed(2):"";};
function date(value:string){const match=value.match(/^(\d{1,2})[/-](\d{1,2})[/-](\d{4})$/);const text=match?`${match[3]}-${match[1].padStart(2,"0")}-${match[2].padStart(2,"0")}`:value;return /^\d{4}-\d{2}-\d{2}$/.test(text)&&Number.isFinite(Date.parse(text))&&new Date(text).toISOString().slice(0,10)===text?text:"";}
export function parseDocumentReading(purpose:DocumentReadingPurpose,pages:ReadPage[]):Pick<DocumentReading,"fields"|"lines"|"warnings">{
 const fields:ReadField[]=[],warnings:string[]=[],lines:ReadLine[]=[];
 const add=(key:string,label:string,pattern:RegExp,convert=(v:string)=>v.trim())=>{
  const candidates=pages.flatMap(page=>[...page.text.matchAll(new RegExp(pattern.source,pattern.flags.includes("g")?pattern.flags:pattern.flags+"g"))].map(match=>({value:convert(match[1]||match[0]),page:page.page,source:match[0].trim().slice(0,250)}))).filter(x=>x.value);
  const distinct=[...new Set(candidates.map(x=>x.value))];if(!distinct.length)return;
  if(distinct.length>1){warnings.push(`Conflicting ${label.toLowerCase()} values; review the original pages.`);fields.push({key,label,value:"",page:candidates[0].page,source:candidates[0].source,alternatives:distinct});}else fields.push({key,label,...candidates[0]});
 };
 add("vin","VIN",/\b([A-HJ-NPR-Z0-9]{17})\b/gi,v=>v.toUpperCase());
 add("stockNumber","Stock number",/\bStock\s*(?:number|no\.?|#)\s*[:#-]?\s*([A-Z0-9-]+)/gi);
 add("reference","Invoice / receipt number",/\b(?:invoice|receipt)\s*(?:number|no\.?|#)\s*[:#-]?\s*([A-Z0-9-]+)/gi);
 add("businessDate","Document date",/\b(?:invoice date|receipt date|purchase date|date)\s*[:#]\s*(\d{4}-\d{2}-\d{2}|\d{1,2}[/-]\d{1,2}[/-]\d{4})\b/gi,date);
 add("merchant","Merchant / vendor",/^(?:merchant|vendor|seller|supplier|company)\s*:\s*([^\n]+)/gim);
 add("amount","Total ($)",/^(?:grand total|invoice total|receipt total|total due|total amount|total)\s*[:$ ]+\$?\s*([\d,]+\.\d{2})\s*$/gim,money);
 add("subtotal","Subtotal ($)",/^subtotal\s*[:$ ]+\$?\s*([\d,]+\.\d{2})\s*$/gim,money);
 add("tax","Separately stated tax ($)",/^(?:sales tax|tax)\s*[:$ ]+\$?\s*([\d,]+\.\d{2})\s*$/gim,money);
 add("tip","Tip ($)",/^(?:tip|gratuity)\s*[:$ ]+\$?\s*([\d,]+\.\d{2})\s*$/gim,money);
 add("fees","Other fees ($)",/^(?:fees|service charge)\s*[:$ ]+\$?\s*([\d,]+\.\d{2})\s*$/gim,money);
 add("discount","Discount ($)",/^discount\s*[:$ ]+\$?\s*([\d,]+\.\d{2})\s*$/gim,money);
 add("purchaseOrderNumber","Purchase order",/\b(?:purchase order|PO)\s*(?:number|no\.?|#)?\s*[:#]\s*([A-Z0-9-]+)/gi);
 add("claimNumber","Claim number",/\bclaim\s*(?:number|no\.?|#)\s*[:#-]?\s*([A-Z0-9-]+)/gi);
 if(purpose==="CLAIM_ESTIMATE"){
  add("estimateTotal","Estimate / supplement total ($)",/\b(?:estimate total|net estimate total|supplement amount|approved repair amount)\s*[:$ ]+\$?\s*([\d,]+\.\d{2})/gi,money);
  add("deductible","Deductible ($)",/\bdeductible\s*[:$ ]+\$?\s*([\d,]+\.\d{2})/gi,money);
  warnings.push("Estimate totals and supplement amounts are proposals, not approved repairs. Record a reviewed approval separately.");
 }
 if(purpose==="CLAIM_AUTHORIZATION"||purpose==="SALES"){
  add("signer","Printed signer name",/^(?:printed (?:signer )?name|signer(?: name)?|customer name|buyer name)\s*:\s*([^\n]+)/gim);
  add("signedDate","Signature date",/\b(?:signed date|signature date|date signed)\s*:\s*(\d{4}-\d{2}-\d{2}|\d{1,2}[/-]\d{1,2}[/-]\d{4})/gi,date);
  warnings.push("Reading printed details does not verify a signature, signer authority, consent, POA acceptance or completion of a signed packet.");
 }
 if(purpose==="TITLE"){
  add("owner","Printed owner",/^(?:owner|registered owner)\s*:\s*([^\n]+)/gim);add("lienholder","Lienholder",/^lienholder\s*:\s*([^\n]+)/gim);add("titleNumber","Title number",/\btitle\s*(?:number|no\.?|#)\s*[:#-]?\s*([A-Z0-9-]+)/gi);
  warnings.push("Staff must verify title status, liens, ownership and receiving-agency acceptance; OCR does not clear title requirements.");
 }
 if(purpose==="TRANSPORT"){
  add("carrier","Carrier",/^carrier\s*:\s*([^\n]+)/gim);add("billOfLading","Bill of lading",/\b(?:bill of lading|BOL)\s*(?:number|no\.?|#)?\s*[:#]\s*([A-Z0-9-]+)/gi);
  warnings.push("Printed transport dates do not establish actual delivery or custody. Confirm the handoff separately.");
 }
 if(purpose==="WARRANTY"){
  add("returnNumber","Return / warranty reference",/\b(?:RMA|return authorization|warranty claim)\s*(?:number|no\.?|#)?\s*[:#]\s*([A-Z0-9-]+)/gi);add("credit","Credit amount ($)",/\bcredit (?:amount|total)\s*[:$ ]+\$?\s*([\d,]+\.\d{2})/gi,money);
 }
 if(purpose==="PARTS")for(const page of pages)for(const row of page.text.split(/\n/)){
  const m=row.trim().match(/^([A-Z0-9][A-Z0-9-]{2,})\s+(.+?)\s+(\d+(?:\.\d+)?)\s+\$?([\d,]+\.\d{2})\s+\$?([\d,]+\.\d{2})$/i);
  if(m){const qty=Number(m[3]),unit=money(m[4]),amount=money(m[5]);if(Math.round(qty*Number(unit)*100)!==Math.round(Number(amount)*100)){warnings.push(`Part ${m[1]} has conflicting quantity, unit cost and total.`);continue;}lines.push({partNumber:m[1],description:m[2],quantity:m[3],unitCost:unit,amount,page:page.page});}
 }
 if(purpose==="STATEMENT"){
  for(const page of pages)for(const row of page.text.split(/\n/)){
   const m=row.trim().match(/^(\d{4}-\d{2}-\d{2}|\d{1,2}\/\d{1,2}\/\d{4})\s+(.+?)\s+(-?\$?[\d,]+\.\d{2})(?:\s+(CR|DR))?$/i);
   if(m&&date(m[1])){const value=money(m[3].replace(/^-/,'').replace('$',''));lines.push({partNumber:"",description:m[2],quantity:"1",unitCost:date(m[1]),amount:(m[3].startsWith('-')||m[4]?.toUpperCase()==="CR"?"-":"")+value,page:page.page});}
  }warnings.push("Statement rows require date, debit/credit direction, account and duplicate review. They are not new expenses or recorded payments.");
 }
 if(purpose==="BUSINESS_CARD"){
  add("companyName","Business name",/^(?:company|business name)\s*:\s*([^\n]+)/gim);
  add("displayName","Contact name",/^(?:name|contact)\s*:\s*([^\n]+)/gim);add("email","Email",/\b([A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,})\b/gi);add("phoneNumber","Phone",/\b((?:\+1[ .-]?)?\(?\d{3}\)?[ .-]\d{3}[ .-]\d{4})\b/g);
 }
 const text=pages.map(p=>p.text).join('\n');
 if(purpose==="EXPENSE"){
  if(!fields.some(f=>f.key==="merchant")){const first=pages[0]?.text.split(/\n/).map(l=>l.trim()).find(l=>/^[A-Za-z][A-Za-z0-9 '&.,-]{2,79}$/.test(l)&&!/(?:receipt|invoice|total|date|tax|welcome|thank you)/i.test(l));if(first)fields.push({key:"merchant",label:"Suggested merchant",value:first,page:1,source:`First printed business line: ${first}. Confirm the merchant.`});}
  if(!fields.some(f=>f.key==="businessDate"))add("businessDate","Receipt date",/\b(\d{1,2}\/\d{1,2}\/\d{4})\b/g,date);
  const category=/\b(gasoline|diesel|fuel|gallons)\b/i.test(text)?"Fuel":/\b(parts|brake pads|oil filter)\b/i.test(text)?"Parts":/\b(towing|transport|freight)\b/i.test(text)?"Transport":/\b(repair|labor)\b/i.test(text)?"Repairs":"";
  if(category)fields.push({key:"category",label:"Suggested category",value:category,page:1,source:"Suggested from receipt wording; review before applying."});
 }
 if(!fields.length&&!lines.length)warnings.push("No structured fields were read. Try a clearer scan or enter details manually; no values were invented.");
 return {fields,lines,warnings};
}
export function readingReconciliation(fields:Record<string,string>){
 if(!fields.amount||!fields.subtotal||!fields.tax)return "";
 if(![fields.amount,fields.subtotal,fields.tax,fields.tip||"0",fields.fees||"0",fields.discount||"0"].every(v=>/^\d+(?:\.\d{1,2})?$/.test(v)))return "Use valid dollar amounts.";
 const total=[fields.subtotal,fields.tax,fields.tip||"0",fields.fees||"0"].reduce((sum,value)=>sum+Math.round(Number(value)*100),0)-Math.round(Number(fields.discount||"0")*100);
 return total!==Math.round(Number(fields.amount)*100)?"Subtotal plus tax, tips and fees minus discounts does not match the total. Review the original before applying.":"";
}
