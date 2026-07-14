import { NextResponse } from "next/server";
import { getCurrentUser } from "@/server/auth/current-user";
import { EnterpriseCommandConflictError } from "@/server/enterprise-command/domain";
import { releaseRepairPartReservation } from "@/server/parts-ledger/service";
export async function POST(request:Request,context:{params:Promise<{id:string;reservationId:string}>}){try{const params=await context.params;return NextResponse.json(await releaseRepairPartReservation(await getCurrentUser(),params.id,params.reservationId,await request.json().catch(()=>null)));}catch(error){const message=error instanceof Error?error.message:"Reservation release failed.";return NextResponse.json({error:message},{status:message==="Authentication required."?401:message.startsWith("Vehicle capability required")?403:error instanceof EnterpriseCommandConflictError?409:400});}}
