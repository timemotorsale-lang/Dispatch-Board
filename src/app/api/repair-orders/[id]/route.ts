import { NextResponse } from "next/server";
import { getCurrentUser } from "@/server/auth/current-user";
import { EnterpriseCommandConflictError } from "@/server/enterprise-command/domain";
import { closeDuplicateRepairOrder, getRepairOrderDetail, updateRepairOrderControl } from "@/server/repair-order/service";
function failure(error:unknown){const message=error instanceof Error?error.message:"Repair-order request failed.";const status=message==="Authentication required."?401:message.startsWith("Vehicle capability required")?403:error instanceof EnterpriseCommandConflictError?409:message==="Repair order was not found."?404:400;return NextResponse.json({error:message},{status});}
export async function GET(_request:Request,context:{params:Promise<{id:string}>}){try{return NextResponse.json(await getRepairOrderDetail(await getCurrentUser(),(await context.params).id));}catch(error){return failure(error);}}
export async function PATCH(request:Request,context:{params:Promise<{id:string}>}){try{return NextResponse.json(await updateRepairOrderControl(await getCurrentUser(),(await context.params).id,await request.json().catch(()=>null)));}catch(error){return failure(error);}}
export async function POST(request:Request,context:{params:Promise<{id:string}>}){try{const body=await request.json().catch(()=>null);if(body?.action==="CLOSE_DUPLICATE")return NextResponse.json(await closeDuplicateRepairOrder(await getCurrentUser(),(await context.params).id,body));return NextResponse.json({error:"Unsupported repair-order action."},{status:400});}catch(error){return failure(error);}}
