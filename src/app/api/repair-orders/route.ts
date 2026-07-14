import { NextResponse } from "next/server";
import { getCurrentUser } from "@/server/auth/current-user";
import { EnterpriseCommandConflictError } from "@/server/enterprise-command/domain";
import { createRepairOrder, listRepairOrders } from "@/server/repair-order/service";
function failure(error:unknown){const message=error instanceof Error?error.message:"Repair-order request failed.";const status=message==="Authentication required."?401:message.startsWith("Vehicle capability required")?403:error instanceof EnterpriseCommandConflictError?409:400;return NextResponse.json({error:message},{status});}
export async function GET(request:Request){try{const url=new URL(request.url);return NextResponse.json(await listRepairOrders(await getCurrentUser(),{page:url.searchParams.get("page"),pageSize:url.searchParams.get("pageSize"),query:url.searchParams.get("query"),state:url.searchParams.get("state")}));}catch(error){return failure(error);}}
export async function POST(request:Request){try{const result=await createRepairOrder(await getCurrentUser(),await request.json().catch(()=>null));return NextResponse.json(result,{status:result.duplicate?200:201});}catch(error){return failure(error);}}
