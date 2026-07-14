import { NextResponse } from "next/server";
import { getCurrentUser } from "@/server/auth/current-user";
import { getShopPlanningWorkspace } from "@/server/shop-planning/service";
export async function GET(){try{return NextResponse.json(await getShopPlanningWorkspace(await getCurrentUser()));}catch(error){const message=error instanceof Error?error.message:"Shop planning workspace failed.";return NextResponse.json({error:message},{status:message==="Authentication required."?401:message.startsWith("Vehicle capability required")?403:400});}}
