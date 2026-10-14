import { NextResponse } from "next/server";
import { getCurrentUser } from "@/server/auth/current-user";
import { deleteInventoryConsoleSavedView } from "@/server/inventory-console-saved-views";

export async function DELETE(_request: Request, { params }: { params: Promise<{ id: string }> }) { const { id } = await params; try { await deleteInventoryConsoleSavedView(await getCurrentUser(), id); return NextResponse.json({ ok: true }); } catch (error) { const message = error instanceof Error ? error.message : "Unable to delete this saved view."; const status = message === "Authentication required." ? 401 : message.includes("permission") ? 403 : message.includes("not found") ? 404 : message.includes("required") ? 400 : 500; return NextResponse.json({ error: message }, { status }); } }
