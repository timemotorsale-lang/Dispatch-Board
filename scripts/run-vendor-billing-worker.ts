import "dotenv/config";
import { randomUUID } from "node:crypto";
import { prisma } from "../src/server/db/client";
import { createPrismaAuthStore } from "../src/server/auth/store";
import { commandVendorBilling, requireVendorBillingUser } from "../src/server/vendors/vendor-billing-service";
import { chicagoDate } from "../src/lib/vendor-billing";

async function main() {
  const email=process.env.VENDOR_BILLING_WORKER_EMAIL;
  if(!email)throw new Error("Configure VENDOR_BILLING_WORKER_EMAIL with an authorized manager before running monthly billing.");
  const actor=await createPrismaAuthStore(prisma).findUserByEmail(email);requireVendorBillingUser(actor,true);
  const vendors=await prisma.vendor.findMany({where:{organizationId:"org-time-motor-sales",archivedAt:null,status:"ACTIVE",billingAgreements:{some:{active:true,kind:{in:["RENT","SERVICE"]}}}},select:{id:true},orderBy:{id:"asc"}});
  let failed=0,created=0;
  for(const vendor of vendors)try{
    const result=await commandVendorBilling(actor,vendor.id,{action:"GENERATE_DUE",commandKey:randomUUID(),through:chicagoDate()});
    const event=result.events.find(e=>e.action==="GENERATE_DUE");
    const detail=event?.detail as {createdInvoiceIds?:string[]}|undefined;
    created+=detail?.createdInvoiceIds?.length||0;
  }catch{failed++;console.error("Vendor monthly draft generation needs review",{vendorId:vendor.id});}
  console.log(JSON.stringify({vendorsReviewed:vendors.length,draftsCreated:created,failed}));
  if(failed)process.exitCode=1;
}
main().catch(error=>{console.error(error instanceof Error?error.message:"Vendor billing worker failed");process.exitCode=1;}).finally(()=>prisma.$disconnect());
