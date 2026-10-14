import { NextResponse } from "next/server";
import { getCurrentUser } from "@/server/auth/current-user";
import { getRepairOrderCreateOptions } from "@/server/repair-order/service";
export async function GET(){try{return NextResponse.json(await getRepairOrderCreateOptions(await getCurrentUser()));}catch(error){const message=error instanceof Error?error.message:"Unable to load repair-order options.";return NextResponse.json({error:message},{status:message==="Authentication required."?401:message.startsWith("Vehicle capability required")?403:400});}}
