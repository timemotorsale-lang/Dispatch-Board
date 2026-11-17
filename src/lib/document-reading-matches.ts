export function normalizedBusinessName(value:string){return value.normalize("NFKC").toLocaleLowerCase("en-US").replace(/&/g," and ").replace(/['’.,]/g,"").replace(/[^\p{L}\p{N}]+/gu," ").trim().replace(/\s+/g," ");}
export function normalizedDocumentReference(value:string){return value.normalize("NFKC").toUpperCase().replace(/[^A-Z0-9]/g,"");}
export function possibleDocumentDuplicate(a:Record<string,string>,b:Record<string,string>){
 const name=normalizedBusinessName(a.merchant||""),other=normalizedBusinessName(b.merchant||"");
 if(name.length<3||name!==other)return null;
 const reference=normalizedDocumentReference(a.reference||""),sameReference=reference.length>=3&&reference===normalizedDocumentReference(b.reference||"");
 const validDate=(value:string)=>/^\d{4}-\d{2}-\d{2}$/.test(value)&&Number.isFinite(Date.parse(value))&&new Date(value).toISOString().slice(0,10)===value;
 const sameDate=validDate(a.businessDate||"")&&a.businessDate===b.businessDate;
 const cents=(value:string)=>/^\d+(?:\.\d{1,2})?$/.test(value)&&Number.isSafeInteger(Math.round(Number(value)*100))?Math.round(Number(value)*100):null;
 const amount=cents(a.amount||""),sameAmount=amount!==null&&amount>0&&amount===cents(b.amount||"");
 if(sameReference&&(sameDate||sameAmount))return "Same business and invoice / receipt number, with a matching date or amount.";
 if(sameDate&&sameAmount)return "Same business, document date and amount; the file may be another scan of the same document.";
 return null;
}
export type ReadingChecks={matches:Array<{kind:"VEHICLE"|"VENDOR";id:string;label:string;href:string;reason:string}>;duplicates:Array<{label:string;href:string;reason:string}>;notes:string[]};
