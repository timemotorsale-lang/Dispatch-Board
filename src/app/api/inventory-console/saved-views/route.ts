import { NextResponse } from "next/server";
import { getCurrentUser } from "@/server/auth/current-user";
import { createInventoryConsoleSavedView, listInventoryConsoleSavedViews } from "@/server/inventory-console-saved-views";

function status(message: string) { return message === "Authentication required." ? 401 : message.includes("Manager access") || message.includes("permission") ? 403 : message.includes("required") || message.includes("invalid") || message.includes("80 characters") ? 400 : 500; }
export async function GET() { try { return NextResponse.json({ savedViews: await listInventoryConsoleSavedViews(await getCurrentUser()) }); } catch (error) { const message = error instanceof Error ? error.message : "Unable to load Inventory Console saved views."; return NextResponse.json({ error: message }, { status: status(message) }); } }
export async function POST(request: Request) { const value = await request.json().catch(() => null); try { return NextResponse.json({ savedView: await createInventoryConsoleSavedView(await getCurrentUser(), value) }, { status: 201 }); } catch (error) { const message = error instanceof Error ? error.message : "Unable to save this Inventory Console view."; return NextResponse.json({ error: message }, { status: status(message) }); } }
