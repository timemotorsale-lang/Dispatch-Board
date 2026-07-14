import { NextResponse } from "next/server";
import { getCurrentUser } from "@/server/auth/current-user";
import { recordQualityInspection } from "@/server/quality-control/service";
export async function POST(request:Request,{params}:{params:Promise<{id:string}>}){try{const{id}=await params;return NextResponse.json(await recordQualityInspection(await getCurrentUser(),id,await request.json()),{status:201});}catch(error){const message=error instanceof Error?error.message:"Quality inspection failed.";return NextResponse.json({error:message},{status:message==="Authentication required."?401:message.startsWith("Vehicle capability required")?403:/version|Idempotency/.test(message)?409:400});}}
