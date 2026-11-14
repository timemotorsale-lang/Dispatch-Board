import type {AuthenticatedUser} from "@/server/auth/store";
import {prisma} from "@/server/db/client";
import {moneyAccess} from "@/server/money-resources/service";
import {MoneyError} from "@/lib/money-resources";
import type {DocumentReading} from "@/lib/document-reading";
import {validateDocumentReview,type SavedDocumentReview} from "@/lib/document-reading-review";
import {normalizedBusinessName,possibleDocumentDuplicate,type ReadingChecks} from "@/lib/document-reading-matches";
import {canViewVendorRegistry} from "@/server/vendors/vendor-policy";
import {searchVehicleOperations} from "@/server/vehicle-discovery/service";
import {scopedReadingJob} from "./reading-jobs";

export async function checkReadingReferences(actor:AuthenticatedUser|null,id:string,input:unknown):Promise<ReadingChecks>{
 const job=await scopedReadingJob(actor,id);
 if(job.status!=="READY"||!job.reading)throw new MoneyError("Wait for the reading to finish.",409);
 const reading=job.reading as DocumentReading,access=await moneyAccess(actor);
 let fields:Record<string,string>;
 try{fields=validateDocumentReview({fields:input,lines:reading.lines,confirmed:false},reading).fields;}catch{throw new MoneyError("Use the fields displayed in this review.");}
 const result:ReadingChecks={matches:[],duplicates:[],notes:[]};
 const checks=await Promise.allSettled([
  (async()=>{
   const recent=await prisma.documentReadingJob.findMany({where:{organizationId:job.organizationId,createdByUserId:access.actor.id,purpose:job.purpose,status:"READY",id:{not:id},checksumSha256:{not:job.checksumSha256}},orderBy:{updatedAt:"desc"},take:200,select:{id:true,purpose:true,fileName:true,reading:true,review:true}});
   const duplicates:ReadingChecks["duplicates"]=[];
   for(const other of recent){const prior=other.reading as DocumentReading|null;if(!prior)continue;const saved=other.review as SavedDocumentReview|null,values=saved?.fields??Object.fromEntries(prior.fields.map(f=>[f.key,f.value])),reason=possibleDocumentDuplicate(fields,values);if(reason)duplicates.push({label:other.fileName,href:`/capture/documents?purpose=${other.purpose}&read=${encodeURIComponent(other.id)}`,reason});}
   const notes=["Saved-document checks cover your latest 200 completed reads for this purpose. Possible duplicates require review; nothing is merged or deleted."];
   if(job.purpose==="EXPENSE"&&/^\d{4}-\d{2}-\d{2}$/.test(fields.businessDate||"")&&/^\d+(?:\.\d{1,2})?$/.test(fields.amount||"")&&Number.isSafeInteger(Math.round(Number(fields.amount)*100))&&Math.round(Number(fields.amount)*100)<=2147483647){
    const entries=await prisma.moneyEntry.findMany({where:{organizationId:access.organizationId,...(!access.manager?{employeeId:access.actor.id}:{}),kind:"EXPENSE",approvalStatus:{not:"SUPERSEDED"},businessDate:fields.businessDate},orderBy:{createdAt:"desc"},take:100,select:{merchant:true,businessDate:true,amountCents:true,reference:true}});
    for(const entry of entries){const reason=possibleDocumentDuplicate(fields,{merchant:entry.merchant,businessDate:entry.businessDate,amount:(entry.amountCents/100).toFixed(2),reference:entry.reference||""});if(reason)duplicates.push({label:`Recorded spending · ${entry.merchant} · $${(entry.amountCents/100).toFixed(2)}`,href:`/money-resources?date=${encodeURIComponent(entry.businessDate)}&action=review`,reason});}
   }
   return {duplicates:duplicates.slice(0,10),notes};
  })(),
  (async()=>{
   const matches:ReadingChecks["matches"]=[];
   const name=normalizedBusinessName(fields.merchant||""),token=name.split(" ").find(t=>t.length>=3);
   if(name.length>=3&&token&&canViewVendorRegistry(actor)){
    const vendors=await prisma.vendor.findMany({where:{organizationId:job.organizationId,status:{in:["ACTIVE","PREFERRED"]},archivedAt:null,name:{contains:token,mode:"insensitive"}},select:{id:true,name:true,vendorNumber:true},orderBy:{vendorNumber:"asc"},take:100});
    for(const vendor of vendors.filter(v=>normalizedBusinessName(v.name)===name))matches.push({kind:"VENDOR",id:vendor.id,label:`${vendor.vendorNumber} · ${vendor.name}`,href:`/customers/vendors/${encodeURIComponent(vendor.id)}`,reason:"Business name matches after normalizing punctuation, spacing and & / and. Confirm the vendor before saving."});
   }
   return matches.slice(0,10);
  })(),
  (async()=>{
   const query=fields.vin?.trim().toUpperCase()||fields.stockNumber?.trim();if(!query)return {matches:[],notes:[]} as Pick<ReadingChecks,"matches"|"notes">;
   if(fields.vin&&!/^[A-HJ-NPR-Z0-9]{17}$/.test(query))return {matches:[],notes:["Check the full 17-character VIN before matching a vehicle."]};
   let found:Awaited<ReturnType<typeof searchVehicleOperations>>;
   try{found=await searchVehicleOperations(actor,{query,types:["VEHICLE"],limit:20,returnTo:"/capture/documents"},{organizationId:job.organizationId});}catch(error){if(error instanceof Error&&error.message.startsWith("Vehicle capability required"))return {matches:[],notes:["Vehicle matching is not available for your role. Continue through the authorized vehicle workflow."]};throw error;}
   if(found.restrictedTypes?.includes("VEHICLE"))return {matches:[],notes:["Vehicle matching is not available for your role. Continue through the authorized vehicle workflow."]};
   const ids=found.results.filter(r=>r.type==="VEHICLE").map(r=>r.id);
   const vehicles=ids.length?await prisma.vehicle.findMany({where:{id:{in:ids},organizationId:job.organizationId,mergedIntoVehicleId:null,...(fields.vin?{vin:{equals:query,mode:"insensitive"}}:{stockNumber:{equals:query,mode:"insensitive"}})},select:{id:true,vehicleNumber:true,year:true,make:true,model:true,vin:true,stockNumber:true}}):[];
   const notes:string[]=[];
   if(!vehicles.length)notes.push("No exact vehicle match was returned for the reviewed VIN / stock number. The vehicle has not been linked.");
   const matches=vehicles.map(v=>({kind:"VEHICLE" as const,id:v.id,label:`${v.vehicleNumber} · ${[v.year,v.make,v.model].filter(Boolean).join(" ")}`,href:`/vehicles/360/${encodeURIComponent(v.id)}`,reason:fields.vin?"Full VIN matches an existing vehicle. Confirm this vehicle in the destination workflow.":"Stock number matches an existing vehicle. Confirm its VIN before linking."}));
   if(fields.vin&&fields.stockNumber&&vehicles.some(v=>v.stockNumber?.trim().toUpperCase()!==fields.stockNumber.trim().toUpperCase()))notes.push("The VIN match has a different stock number. Review the original and vehicle record before linking.");
   return {matches,notes};
  })()
 ]);
 if(checks[0].status==="fulfilled"){result.duplicates.push(...checks[0].value.duplicates);result.notes.push(...checks[0].value.notes);}else result.notes.push("Duplicate checks are temporarily unavailable. Review existing records before saving.");
 if(checks[1].status==="fulfilled")result.matches.push(...checks[1].value);else result.notes.push("Vendor matching is temporarily unavailable.");
 if(checks[2].status==="fulfilled"){result.matches.push(...checks[2].value.matches);result.notes.push(...checks[2].value.notes);}else result.notes.push("Vehicle matching is temporarily unavailable.");
 return result;
}
