import { NextResponse } from "next/server";
import { getCurrentUser } from "@/server/auth/current-user";
import { downloadVehicleEvidence } from "@/server/vehicle-360/service";

export async function GET(_request: Request, context: { params: Promise<{ id: string }> }) {
  try {
    const evidence = await downloadVehicleEvidence(await getCurrentUser(), (await context.params).id);
    const safeName = evidence.fileName.replace(/["\r\n]/g, "_");
    return new NextResponse(evidence.content, { headers: { "cache-control": "private, no-store", "content-disposition": `attachment; filename="${safeName}"`, "content-length": String(evidence.content.byteLength), "content-type": evidence.contentType, "x-content-type-options": "nosniff" } });
  } catch (error) { const message = error instanceof Error ? error.message : "Evidence download failed."; return NextResponse.json({ error: message }, { status: message === "Authentication required." ? 401 : message.startsWith("Vehicle capability required") ? 403 : message.includes("not found") ? 404 : 409 }); }
}
