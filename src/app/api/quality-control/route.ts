import { NextResponse } from "next/server";
import { getCurrentUser } from "@/server/auth/current-user";
import { getQualityControlWorkspace } from "@/server/quality-control/service";
export async function GET(){try{return NextResponse.json(await getQualityControlWorkspace(await getCurrentUser()));}catch(error){const message=error instanceof Error?error.message:"Quality-control workspace failed.";return NextResponse.json({error:message},{status:message==="Authentication required."?401:message.startsWith("Vehicle capability required")?403:400});}}
