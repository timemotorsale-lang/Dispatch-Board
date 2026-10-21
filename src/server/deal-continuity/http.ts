import { NextResponse } from "next/server";
import { Prisma } from "@prisma/client";
import { SalesDocumentsError } from "@/server/sales-documents/domain";
import { EnterpriseCommandConflictError } from "@/server/enterprise-command/domain";
export function dealIdentityFailure(error: unknown) {
  if (error instanceof EnterpriseCommandConflictError) return NextResponse.json({ error: error.message }, { status: 409 });
  if (error instanceof Prisma.PrismaClientKnownRequestError || error instanceof Prisma.PrismaClientUnknownRequestError || error instanceof Prisma.PrismaClientValidationError) return NextResponse.json({ error: "Shared deal records need an application/database check. Your entered details have been retained; do not create duplicate customers or vehicles." }, { status: 503 });
  const message = error instanceof Error ? error.message : "Shared records could not be loaded.";
  return NextResponse.json({ error: message }, { status: error instanceof SalesDocumentsError ? error.status : /sign in|authentication/i.test(message) ? 401 : /capability|required.*permission|not available for this viewer/i.test(message) ? 403 : 400 });
}
