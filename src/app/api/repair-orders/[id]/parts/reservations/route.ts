import { NextResponse } from "next/server";
import { getCurrentUser } from "@/server/auth/current-user";
import { EnterpriseCommandConflictError } from "@/server/enterprise-command/domain";
import { reserveRepairPart } from "@/server/parts-ledger/service";
export async function POST(request:Request,context:{params:Promise<{id:string}>}){try{return NextResponse.json(await reserveRepairPart(await getCurrentUser(),(await context.params).id,await request.json().catch(()=>null)),{status:201});}catch(error){const message=error instanceof Error?error.message:"Reservation request failed.";return NextResponse.json({error:message},{status:message==="Authentication required."?401:message.startsWith("Vehicle capability required")?403:error instanceof EnterpriseCommandConflictError?409:400});}}
