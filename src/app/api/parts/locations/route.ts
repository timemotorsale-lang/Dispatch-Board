import { NextResponse } from "next/server";
import { getCurrentUser } from "@/server/auth/current-user";
import { createPartStockLocation } from "@/server/parts-ledger/service";
export async function POST(request:Request){try{return NextResponse.json(await createPartStockLocation(await getCurrentUser(),await request.json().catch(()=>null)),{status:201});}catch(error){const message=error instanceof Error?error.message:"Stock location request failed.";return NextResponse.json({error:message},{status:message==="Authentication required."?401:message.startsWith("Vehicle capability required")?403:400});}}
