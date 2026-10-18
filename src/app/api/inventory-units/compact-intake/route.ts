import { Prisma } from "@prisma/client";
import { NextResponse } from "next/server";
import { getCurrentUser } from "@/server/auth/current-user";
import { EnterpriseCommandConflictError } from "@/server/enterprise-command/domain";
import { getCompactIntake, getCompactIntakeModel, saveCompactIntake } from "@/server/inventory-unit/compact-intake-service";

function failure(error: unknown) {
  if (error instanceof Prisma.PrismaClientKnownRequestError || error instanceof Prisma.PrismaClientUnknownRequestError || error instanceof Prisma.PrismaClientValidationError || error instanceof Prisma.PrismaClientInitializationError || error instanceof Prisma.PrismaClientRustPanicError) {
    return NextResponse.json({ error: "Intake could not be saved. No changes were committed. Reload before retrying." }, { status: 500 });
  }
  const message = error instanceof Error ? error.message : "Compact intake request failed.";
  const status = message === "Authentication required." ? 401 : message.startsWith("Vehicle capability required") ? 403 : error instanceof EnterpriseCommandConflictError ? 409 : 400;
  return NextResponse.json({ error: message }, { status });
}

export async function GET(request: Request) {
  try {
    const query = new URL(request.url).searchParams, actor = await getCurrentUser();
    const vehicleId = query.get("vehicleId"), vin = query.get("vin");
    if (vehicleId && vin) throw new Error("Use either vehicleId or VIN for intake lookup.");
    return NextResponse.json(vehicleId ? await getCompactIntakeModel(actor, vehicleId) : await getCompactIntake(actor, { vin }), { headers: { "Cache-Control": "no-store" } });
  } catch (error) { return failure(error); }
}

export async function POST(request: Request) {
  try {
    const result = await saveCompactIntake(await getCurrentUser(), await request.json().catch(() => null));
    return NextResponse.json(result, { status: result.duplicate ? 200 : 201 });
  } catch (error) { return failure(error); }
}
