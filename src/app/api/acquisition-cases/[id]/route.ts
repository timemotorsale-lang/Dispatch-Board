import { NextResponse } from "next/server";
import { getCurrentUser } from "@/server/auth/current-user";
import { getAcquisitionCase } from "@/server/acquisition-appraisal/service";

export async function GET(_request: Request, context: { params: Promise<{ id: string }> }) { try { return NextResponse.json(await getAcquisitionCase(await getCurrentUser(), (await context.params).id)); } catch (error) { const message = error instanceof Error ? error.message : "Acquisition case could not be loaded."; return NextResponse.json({ error: message }, { status: message === "Acquisition case was not found." ? 404 : message === "Authentication required." ? 401 : message.startsWith("Vehicle capability required") ? 403 : 400 }); } }
