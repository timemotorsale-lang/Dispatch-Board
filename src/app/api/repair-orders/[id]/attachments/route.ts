import { NextResponse } from "next/server";
import { getCurrentUser } from "@/server/auth/current-user";
import { EnterpriseCommandConflictError } from "@/server/enterprise-command/domain";
import { uploadRepairOrderAttachment } from "@/server/vehicle-360/service";

export async function POST(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const actor = await getCurrentUser();
  if (!actor) return NextResponse.json({ error: "Sign in to attach a document or photo." }, { status: 401 });
  try {
    const { id } = await params;
    const result = await uploadRepairOrderAttachment(actor, id, await request.formData());
    return NextResponse.json({ duplicate: result.duplicate, status: result.evidence.status }, { status: result.duplicate ? 200 : 201 });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Could not attach the file.";
    const status = message.startsWith("Vehicle capability required") ? 403 : message === "Repair order was not found." ? 404 : error instanceof EnterpriseCommandConflictError ? 409 : 400;
    return NextResponse.json({ error: message }, { status });
  }
}
