import { NextResponse } from "next/server";
import { getCurrentUser } from "@/server/auth/current-user";
import { EnterpriseCommandConflictError } from "@/server/enterprise-command/domain";
import { createPart,getPartsWorkspace } from "@/server/parts-ledger/service";
function failure(error:unknown){const message=error instanceof Error?error.message:"Parts request failed.";const status=message==="Authentication required."?401:message.startsWith("Vehicle capability required")?403:error instanceof EnterpriseCommandConflictError?409:400;return NextResponse.json({error:message},{status});}
export async function GET(request:Request){try{return NextResponse.json(await getPartsWorkspace(await getCurrentUser(),new URL(request.url).searchParams.get("query")??""));}catch(error){return failure(error);}}
export async function POST(request:Request){try{const result=await createPart(await getCurrentUser(),await request.json().catch(()=>null));return NextResponse.json(result,{status:result.duplicate?200:201});}catch(error){return failure(error);}}
