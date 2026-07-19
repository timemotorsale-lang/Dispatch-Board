import { NextResponse } from "next/server";
import { getCurrentUser } from "@/server/auth/current-user";
import { getControlledExportCsv } from "@/server/governance-operations";
type Context = { params: Promise<{ id: string }> };
export async function GET(_: Request, context: Context) { try { const { id } = await context.params, result = await getControlledExportCsv(await getCurrentUser(), id); return new NextResponse(result.csv, { headers: { "content-type": "text/csv; charset=utf-8", "content-disposition": `attachment; filename="${result.fileName}"`, "x-content-sha256": result.contentHash ?? "" } }); } catch (error) { const message = error instanceof Error ? error.message : "Controlled export is unavailable."; return NextResponse.json({ error: message }, { status: message === "Authentication required." ? 401 : message.includes("authorization") ? 403 : 404 }); } }
