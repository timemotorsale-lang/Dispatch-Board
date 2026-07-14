import { NextResponse } from "next/server";
import { getCurrentUser } from "@/server/auth/current-user";
import { getShopExecutionWorkspace } from "@/server/shop-execution/service";
function failure(error:unknown){const message=error instanceof Error?error.message:"Shop execution request failed.";return NextResponse.json({error:message},{status:message==="Authentication required."?401:message.startsWith("Vehicle capability required")?403:400});}
export async function GET(){try{return NextResponse.json(await getShopExecutionWorkspace(await getCurrentUser()));}catch(error){return failure(error);}}
