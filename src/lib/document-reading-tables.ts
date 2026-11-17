import type {ReadLine,ReadPage} from "./document-reading";
type Column="partNumber"|"description"|"quantity"|"unitCost"|"amount"|"date"|"debit"|"credit"|"balance";
const aliases:Record<Column,string[]>={partNumber:["part number","part no","part #","part","sku","item code"],description:["description","merchant","details"],quantity:["quantity","qty"],unitCost:["unit price","unit cost","price"],amount:["extended price","line total","amount","total"],date:["transaction date","posted date","date"],debit:["debit","withdrawal","withdrawals"],credit:["credit","deposit","deposits"],balance:["running balance","balance"]};
const normalized=(value:string)=>value.trim().toLowerCase().replace(/\./g,"").replace(/\s+/g," ");
function header(text:string,wanted:Column[]){
 const divided=text.trim().split(/\s*\|\s*|\t+| {2,}/).filter(Boolean);
 let columns=divided.map(value=>(Object.keys(aliases) as Column[]).find(key=>aliases[key].includes(normalized(value))));
 if(columns.some(c=>!c)||columns.length<3){
  let rest=normalized(text);columns=[];
  const choices=(Object.keys(aliases) as Column[]).flatMap(key=>aliases[key].map(value=>({key,value}))).sort((a,b)=>b.value.length-a.value.length);
  while(rest){const found=choices.find(c=>rest===c.value||rest.startsWith(c.value+" "));if(!found)return null;columns.push(found.key);rest=rest.slice(found.value.length).trim();}
 }
 return columns.length===wanted.length&&new Set(columns).size===wanted.length&&wanted.every(c=>columns.includes(c))?columns as Column[]:null;
}
function values(text:string,columns:Column[]){
 let divided=text.includes("|")?text.split("|").map(s=>s.trim()):text.includes("\t")?text.split("\t").map(s=>s.trim()):text.trim().split(/ {2,}/);
 if(divided.length===columns.length+2&&!divided[0]&&!divided.at(-1))divided=divided.slice(1,-1);
 if(divided.length===columns.length)return Object.fromEntries(columns.map((c,i)=>[c,divided[i]]));
 // Description is the only variable-width column; the remaining columns each contain one token.
 const words=text.trim().split(/\s+/),description=columns.indexOf("description"),right=columns.length-description-1;
 if(words.length<columns.length||description<0)return null;
 const cells=[...words.slice(0,description),words.slice(description,words.length-right).join(" "),...(right?words.slice(-right):[])];
 return Object.fromEntries(columns.map((c,i)=>[c,cells[i]]));
}
function dollars(raw:string){const text=raw.replace(/[$,]/g,"");return /^\d+(?:\.\d{1,2})?$/.test(text)&&Number.isSafeInteger(Math.round(Number(text)*100))?Number(text).toFixed(2):null;}
function isoDate(raw:string){const m=raw.match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})$/),value=m?`${m[3]}-${m[1].padStart(2,"0")}-${m[2].padStart(2,"0")}`:raw;return /^\d{4}-\d{2}-\d{2}$/.test(value)&&Number.isFinite(Date.parse(value))&&new Date(value).toISOString().slice(0,10)===value?value:null;}
export function readPartsTable(pages:ReadPage[]){
 const lines:ReadLine[]=[],warnings:string[]=[];
 for(const page of pages){let columns:Column[]|null=null,pending:string[]=[],unsupported=false;
  const rows=page.text.split(/\n/);
  for(const row of rows){
   const next=header(row,["partNumber","description","quantity","unitCost","amount"]);
   if(next){if(pending.length)warnings.push(`Page ${page.page}: an incomplete parts row needs manual review.`);columns=next;pending=[];unsupported=false;continue;}
   if(/\b(?:part|sku|item code)\b/i.test(row)&&/\bdescription\b/i.test(row)&&/\b(?:qty|quantity)\b/i.test(row)){warnings.push(`Page ${page.page}: the parts table has unsupported columns; review and enter those rows manually.`);unsupported=true;columns=null;pending=[];continue;}
   if(unsupported)continue;
   if(!row.trim()||/^(?:subtotal|grand total|invoice total|total|tax|freight|shipping|discount)\b/i.test(row.trim())){if(pending.length)warnings.push(`Page ${page.page}: an incomplete parts row needs manual review.`);pending=[];if(/^(?:subtotal|grand total|invoice total|total)\b/i.test(row.trim()))columns=null;continue;}
   if(columns&&pending.length){const own=values(row,columns);if(own&&/^[A-Z0-9][A-Z0-9._/-]{1,79}$/i.test(own.partNumber)&&/^\d+(?:\.\d+)?$/.test(own.quantity)&&dollars(own.unitCost)!==null&&dollars(own.amount)!==null){warnings.push(`Page ${page.page}: an incomplete parts row needs manual review.`);pending=[];if(!/\d/.test(own.partNumber)){warnings.push(`Page ${page.page}: a wrapped description or new part row is ambiguous; enter it after reviewing the original.`);continue;}}}
   const source=[...pending,row.trim()].join("\n"),text=source.replace(/\n/g," ");
   const cells=columns?values(text,columns):null;
   const legacy=!columns?text.match(/^([A-Z0-9][A-Z0-9-]{2,})\s+(.+?)\s+(\d+(?:\.\d+)?)\s+\$?([\d,]+\.\d{2})\s+\$?([\d,]+\.\d{2})$/i):null;
   const v=cells??(legacy?{partNumber:legacy[1],description:legacy[2],quantity:legacy[3],unitCost:legacy[4],amount:legacy[5]}:null);
   const cost=v?dollars(v.unitCost):null,amount=v?dollars(v.amount):null;
   if(v&&/^[A-Z0-9][A-Z0-9._/-]{1,79}$/i.test(v.partNumber)&&v.description&&/^\d+(?:\.\d+)?$/.test(v.quantity)&&Number(v.quantity)>0&&cost!==null&&amount!==null){
    lines.push({partNumber:v.partNumber,description:v.description,quantity:v.quantity,unitCost:cost,amount,page:page.page,source});pending=[];continue;
   }
   if(columns&&pending.length<2){pending.push(row.trim());}else{if(pending.length)warnings.push(`Page ${page.page}: an incomplete parts row needs manual review.`);pending=[];}
  }
  if(pending.length)warnings.push(`Page ${page.page}: an incomplete parts row needs manual review.`);
 }
 return {lines,warnings:[...new Set(warnings)]};
}
export function readStatementColumns(pages:ReadPage[]){
 const lines:ReadLine[]=[],warnings:string[]=[],handled=new Set<string>();
 for(const page of pages){let columns:Column[]|null=null,unsupported=false;
  for(const row of page.text.split(/\n/)){
   const next=header(row,["date","description","debit","credit"])??header(row,["date","description","debit","credit","balance"]);if(next){columns=next;unsupported=false;continue;}
   if(/\bdate\b/i.test(row)&&/\b(?:description|merchant|details)\b/i.test(row)&&/\b(?:debit|credit|balance)\b/i.test(row)){warnings.push(`Page ${page.page}: the statement table has unsupported columns; no transaction amounts were inferred from that table.`);unsupported=true;columns=null;continue;}
   if(!/\b(?:\d{4}-\d{2}-\d{2}|\d{1,2}\/\d{1,2}\/\d{4})\b/.test(row))continue;
   if(unsupported){handled.add(`${page.page}:${row}`);continue;}
   if(!columns)continue;
   handled.add(`${page.page}:${row}`);
   const v=values(row,columns),date=v?isoDate(v.date):null;
   const debit=v&&["","-","—"].includes(v.debit)?"0.00":v?dollars(v.debit):null,credit=v&&["","-","—"].includes(v.credit)?"0.00":v?dollars(v.credit):null;
   if(!v||!date||!v.description||debit===null||credit===null||(Number(debit)>0)===(Number(credit)>0)){warnings.push(`Page ${page.page}: a statement row has an unclear debit/credit direction; review the original.`);continue;}
   lines.push({partNumber:"",description:v.description,quantity:"1",unitCost:date,amount:Number(credit)>0?`-${credit}`:debit,page:page.page,source:row.trim()});
  }
 }
 return {lines,warnings,handled};
}
