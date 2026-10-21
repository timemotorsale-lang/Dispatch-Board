import { Prisma } from "@prisma/client";
import { NextResponse } from "next/server";
import { getCurrentUser } from "@/server/auth/current-user";
import { getRepairOrderDetail } from "@/server/repair-order/service";
import { executeServiceClosePartsCommand } from "@/server/service-close-parts/service";
export async function POST(request: Request, context: { params: Promise<{ id: string }> }) {
  try {
    const actor = await getCurrentUser(), { id } = await context.params;
    await getRepairOrderDetail(actor, id);
    const raw = await request.json();
    if (!raw || !["GENERATE_INVOICE_PACKAGE", "CLOSE_REPAIR_ORDER"].includes(raw.action)) return NextResponse.json({ error: "Unsupported repair closeout action." }, { status: 400 });
    const result = await executeServiceClosePartsCommand(actor, { ...raw, subjectId: id }, { enforceRollout: true });
    return NextResponse.json(result);
  } catch (error) {
    if (error instanceof Prisma.PrismaClientKnownRequestError || error instanceof Prisma.PrismaClientUnknownRequestError || error instanceof Prisma.PrismaClientValidationError || error instanceof Prisma.PrismaClientInitializationError || error instanceof Prisma.PrismaClientRustPanicError) return NextResponse.json({ error: "Closeout is unavailable. Ask an administrator to check database setup; retry the same action rather than creating another RO." }, { status: 503 });
    const message = error instanceof Error ? error.message : "Repair closeout failed.";
    return NextResponse.json({ error: message.startsWith("Invalid `prisma") ? "Closeout is unavailable. Ask an administrator to check database setup." : message }, { status: message === "Authentication required." ? 401 : message.startsWith("Vehicle capability required") ? 403 : /version|idempotency/i.test(message) ? 409 : 400 });
  }
}
