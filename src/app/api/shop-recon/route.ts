import { NextResponse } from "next/server";
import { getCurrentUser } from "@/server/auth/current-user";
import { getShopReconLanding } from "@/server/shop-completion/service";
export async function GET(){try{return NextResponse.json(await getShopReconLanding(await getCurrentUser()));}catch(error){const message=error instanceof Error?error.message:"Shop & Recon could not be loaded.";return NextResponse.json({error:message},{status:message==="Authentication required."?401:message.startsWith("Vehicle capability required")?403:400});}}
