import { NextResponse } from "next/server";
import { getCurrentUser } from "@/server/auth/current-user";
import { EnterpriseCommandConflictError } from "@/server/enterprise-command/domain";
import { changeVehicleSalesMedia, getVehicleSalesMedia, uploadVehicleEvidence } from "@/server/vehicle-360/service";
import { intakePhotoName } from "@/lib/vehicle-photo-coverage";

function failure(error: unknown) {
  const message = error instanceof Error ? error.message : "Sales media request failed.";
  return NextResponse.json({ error: message }, { status: message === "Authentication required." ? 401 : message.startsWith("Vehicle capability required") || message.includes("mutations are not enabled") ? 403 : error instanceof EnterpriseCommandConflictError ? 409 : message === "Vehicle was not found." ? 404 : 400 });
}

export async function GET(request: Request) {
  try { return NextResponse.json(await getVehicleSalesMedia(await getCurrentUser(), new URL(request.url).searchParams.get("vehicleId") ?? "")); }
  catch (error) { return failure(error); }
}

export async function POST(request: Request) {
  try {
    const actor = await getCurrentUser(), body = await request.json();
    if (body.action === "upload-intake") {
      if (!["image/jpeg", "image/png", "image/webp"].includes(body.contentType)) throw new Error("Intake photos must be JPEG, PNG or WebP.");
      return NextResponse.json(await uploadVehicleEvidence(actor, { ...body, fileName: intakePhotoName(body.angle, body.fileName), category: "PHOTO", subjectType: "INTAKE_PHOTO", subjectId: body.vehicleId, relationship: "SUPPORTS", accessLevel: "INTERNAL", reason: "Capture internal vehicle arrival and condition evidence." }), { status: 201 });
    }
    if (body.action === "upload") return NextResponse.json(await uploadVehicleEvidence(actor, { ...body, category: body.contentType === "video/mp4" ? "OTHER" : "PHOTO", subjectType: "SALES_MEDIA", subjectId: body.vehicleId, relationship: "SUPPORTS", accessLevel: "INTERNAL", reason: "Add vehicle sales media to the internal inventory gallery." }), { status: 201 });
    if (body.action !== "update") throw new Error("Media action is invalid.");
    return NextResponse.json(await changeVehicleSalesMedia(actor, body.vehicleId, body));
  } catch (error) { return failure(error); }
}
