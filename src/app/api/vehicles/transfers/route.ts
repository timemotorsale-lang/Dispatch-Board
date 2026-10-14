import { NextResponse } from "next/server";
import { getCurrentUser } from "@/server/auth/current-user";
import { applyInventoryImport, exportInventory, previewInventoryImport } from "@/server/inventory-transfer/service";

export async function POST(request: Request) {
  try {
    if (Number(request.headers.get("content-length") ?? 0) > 3 * 1024 * 1024) return NextResponse.json({ error: "Transfer request is too large." }, { status: 413 });
    const body = await request.text();
    if (new TextEncoder().encode(body).length > 3 * 1024 * 1024) return NextResponse.json({ error: "Transfer request is too large." }, { status: 413 });
    const input = JSON.parse(body);
    const user = await getCurrentUser();
    const headers = { "Cache-Control": "no-store" };
    if (input.action === "preview-import") return NextResponse.json(await previewInventoryImport(user, input), { headers });
    if (input.action === "apply-import") return NextResponse.json(await applyInventoryImport(user, input), { headers });
    if (input.action === "preview-export") return NextResponse.json(await exportInventory(user, input), { headers });
    if (input.action === "export") {
      const result = await exportInventory(user, input, true);
      if (!("csv" in result)) throw new Error("Export did not generate a file.");
      return new Response(result.csv, { headers: { ...headers, "Content-Type": "text/csv; charset=utf-8", "Content-Disposition": `attachment; filename="inventory-${new Date().toISOString().slice(0, 10)}.csv"` } });
    }
    return NextResponse.json({ error: "Choose a valid transfer action." }, { status: 400, headers });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Transfer failed.";
    const safe = error instanceof SyntaxError ? "Invalid transfer request." : message.includes("prisma.") ? "Data transfer is temporarily unavailable." : message;
    return NextResponse.json({ error: safe }, { status: message === "Authentication required." ? 401 : message.startsWith("Vehicle capability required") ? 403 : 400, headers: { "Cache-Control": "no-store" } });
  }
}
