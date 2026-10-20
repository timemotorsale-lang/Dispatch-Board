import { NextResponse } from "next/server";
import { getCurrentUser } from "@/server/auth/current-user";
import { attachMoneyReceipt, readMoneyReceipt } from "@/server/money-resources/receipts";
import { MoneyError } from "@/lib/money-resources";
import { moneyError, requireMoneyOrigin } from "@/server/money-resources/http";

export async function GET(_request: Request, context: { params: Promise<{ entryId: string }> }) {
  try {
    const result = await readMoneyReceipt(await getCurrentUser(), (await context.params).entryId);
    return new NextResponse(new Uint8Array(result.bytes), { headers: { "content-type": result.contentType, "cache-control": "private, no-store", "x-content-type-options": "nosniff", "content-disposition": "inline; filename=receipt", "content-security-policy": "sandbox; default-src 'none'" } });
  } catch (error) { return moneyError(error); }
}
export async function POST(request: Request, context: { params: Promise<{ entryId: string }> }) {
  try {
    requireMoneyOrigin(request);
    if (Number(request.headers.get("content-length")) > 11 * 1024 * 1024) throw new MoneyError("Receipt is too large.", 413);
    const actor = await getCurrentUser();
    if (!actor?.isActive) throw new MoneyError("Sign in before attaching a receipt.", 401);
    const form = await request.formData(), file = form.get("file");
    if (!(file instanceof File)) throw new MoneyError("Choose a receipt file.");
    return NextResponse.json(await attachMoneyReceipt(actor, (await context.params).entryId, file), { headers: { "cache-control": "no-store" } });
  } catch (error) { return moneyError(error); }
}
