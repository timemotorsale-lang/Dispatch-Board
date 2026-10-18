import { NextResponse } from "next/server";
import { Prisma } from "@prisma/client";
import { getCurrentUser } from "@/server/auth/current-user";
import { EnterpriseCommandConflictError } from "@/server/enterprise-command/domain";
import { createRepairOrder, listRepairOrders } from "@/server/repair-order/service";
function failure(error: unknown) {
  if (error instanceof Prisma.PrismaClientKnownRequestError && ["P2021", "P2022"].includes(error.code)) {
    return NextResponse.json({ error: "Check-in is temporarily unavailable because this database needs an application update. Ask an administrator to apply the pending database migrations, then retry. Do not create another vehicle or inventory unit." }, { status: 503 });
  }
  if (error instanceof Prisma.PrismaClientKnownRequestError || error instanceof Prisma.PrismaClientUnknownRequestError || error instanceof Prisma.PrismaClientValidationError || error instanceof Prisma.PrismaClientInitializationError || error instanceof Prisma.PrismaClientRustPanicError) {
    return NextResponse.json({ error: "Check-in could not be completed. Recheck the inventory link and whether an RO already exists before retrying. Contact an administrator if this continues." }, { status: 500 });
  }
  const message = error instanceof Error ? error.message : "Repair-order request failed.";
  const status = message === "Authentication required." ? 401 : message.startsWith("Vehicle capability required") ? 403 : error instanceof EnterpriseCommandConflictError ? 409 : 400;
  return NextResponse.json({ error: message }, { status });
}
export async function GET(request:Request){try{const url=new URL(request.url);return NextResponse.json(await listRepairOrders(await getCurrentUser(),{page:url.searchParams.get("page"),pageSize:url.searchParams.get("pageSize"),query:url.searchParams.get("query"),state:url.searchParams.get("state"),vehicleId:url.searchParams.get("vehicleId")}));}catch(error){return failure(error);}}
export async function POST(request:Request){try{const result=await createRepairOrder(await getCurrentUser(),await request.json().catch(()=>null));return NextResponse.json(result,{status:result.duplicate?200:201});}catch(error){return failure(error);}}
