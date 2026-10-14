import { NextResponse } from "next/server";
import { getCurrentUser } from "@/server/auth/current-user";
import { authorizeRepairOrderRelease } from "@/server/quality-control/service";
export async function POST(request:Request,{params}:{params:Promise<{id:string}>}){try{const{id}=await params;return NextResponse.json(await authorizeRepairOrderRelease(await getCurrentUser(),id,await request.json()),{status:201});}catch(error){const message=error instanceof Error?error.message:"Release authorization failed.";return NextResponse.json({error:message},{status:message==="Authentication required."?401:message.startsWith("Vehicle capability required")?403:/version|Idempotency|already/.test(message)?409:400});}}
