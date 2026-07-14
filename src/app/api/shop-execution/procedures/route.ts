import { NextResponse } from "next/server";
import { getCurrentUser } from "@/server/auth/current-user";
import { createWorkProcedure } from "@/server/shop-execution/service";
export async function POST(request:Request){try{return NextResponse.json(await createWorkProcedure(await getCurrentUser(),await request.json()),{status:201});}catch(error){const message=error instanceof Error?error.message:"Procedure request failed.";return NextResponse.json({error:message},{status:message==="Authentication required."?401:message.startsWith("Vehicle capability required")?403:message.includes("version")||message.includes("Idempotency")?409:400});}}
