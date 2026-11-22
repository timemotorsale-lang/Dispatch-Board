import { NextResponse } from "next/server";
import { getCurrentUser } from "@/server/auth/current-user";
import { uploadRepairProcedurePhoto } from "@/server/vehicle-360/service";

export async function POST(request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const actor = await getCurrentUser();
    if (!actor) return NextResponse.json({ error: "Authentication required." }, { status: 401 });
    const { id } = await params;
    const result = await uploadRepairProcedurePhoto(actor, id, await request.formData());
    return NextResponse.json(result, { status: 201 });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Photo upload failed.";
    const status = message.startsWith("Only the assigned") || message.startsWith("Vehicle capability required") ? 403 : 400;
    return NextResponse.json({ error: message }, { status });
  }
}
