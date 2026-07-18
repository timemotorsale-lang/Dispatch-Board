import { NextResponse } from "next/server";
import { getCurrentUser } from "@/server/auth/current-user";
import { listRetailCompletions, startRetailCompletion } from "@/server/inventory-retail-completion/service";
const status = (message: string) => message.includes("not enabled") ? 409 : message === "Authentication required." ? 401 : message.startsWith("Vehicle capability required") ? 403 : 400;
export async function GET(request: Request) { try { const url = new URL(request.url); return NextResponse.json(await listRetailCompletions(await getCurrentUser(), { locationId: url.searchParams.get("locationId") })); } catch (error) { const message = error instanceof Error ? error.message : "Retail completions could not be loaded."; return NextResponse.json({ error: message }, { status: status(message) }); } }
export async function POST(request: Request) { try { return NextResponse.json(await startRetailCompletion(await getCurrentUser(), await request.json()), { status: 201 }); } catch (error) { const message = error instanceof Error ? error.message : "Retail completion could not be started."; return NextResponse.json({ error: message }, { status: status(message) }); } }
