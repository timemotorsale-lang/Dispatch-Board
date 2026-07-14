import { NextResponse } from "next/server";
import { getCurrentUser } from "@/server/auth/current-user";
import { dispatchRepairJob } from "@/server/shop-execution/service";
export async function POST(request:Request,{params}:{params:Promise<{id:string}>}){try{const{id}=await params;return NextResponse.json(await dispatchRepairJob(await getCurrentUser(),id,await request.json()));}catch(error){const message=error instanceof Error?error.message:"Dispatch request failed.";return NextResponse.json({error:message},{status:message==="Authentication required."?401:message.startsWith("Vehicle capability required")?403:message.includes("version")||message.includes("Idempotency")?409:400});}}
