import { NextResponse } from "next/server";
import { getCurrentUser } from "@/server/auth/current-user";
import { EnterpriseCommandConflictError } from "@/server/enterprise-command/domain";
import { createRepairPartDemand,getRepairPartsReadiness } from "@/server/parts-ledger/service";
function failure(error:unknown){const message=error instanceof Error?error.message:"Repair parts request failed.";const status=message==="Authentication required."?401:message.startsWith("Vehicle capability required")?403:error instanceof EnterpriseCommandConflictError?409:message==="Repair order was not found."?404:400;return NextResponse.json({error:message},{status});}
export async function GET(_request:Request,context:{params:Promise<{id:string}>}){try{return NextResponse.json(await getRepairPartsReadiness(await getCurrentUser(),(await context.params).id));}catch(error){return failure(error);}}
export async function POST(request:Request,context:{params:Promise<{id:string}>}){try{return NextResponse.json(await createRepairPartDemand(await getCurrentUser(),(await context.params).id,await request.json().catch(()=>null)),{status:201});}catch(error){return failure(error);}}
