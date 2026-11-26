import { NextResponse } from "next/server";
import { getCurrentUser } from "@/server/auth/current-user";
import { PartsQuoteError } from "@/server/repair-parts-quotes/domain";
import { checkoutRepairPartsQuote, saveRepairPartsQuote } from "@/server/repair-parts-quotes/service";

export async function POST(request: Request) {
  try {
    const actor = await getCurrentUser();
    if (!actor) throw new PartsQuoteError("Sign in to manage parts quotes.", 401);
    const body = await request.json().catch(() => null);
    if (!body || typeof body.repairOrderId !== "string" || !body.repairOrderId || body.repairOrderId.length > 128) {
      throw new PartsQuoteError("Select a repair order.");
    }
    if (body.action === "save" && body.quote && typeof body.quote === "object" && !Array.isArray(body.quote)) {
      await saveRepairPartsQuote(actor, body.repairOrderId, body.quote);
      return NextResponse.json({ message: "Quote saved." }, { status: 201 });
    }
    if (body.action === "checkout" && typeof body.quoteId === "string" && body.quoteId.length === 36) {
      return NextResponse.json(await checkoutRepairPartsQuote(actor, body.repairOrderId, body.quoteId, body.purchasedOn));
    }
    throw new PartsQuoteError("Choose a valid quote action.");
  } catch (error) {
    if (error instanceof PartsQuoteError) return NextResponse.json({ error: error.message }, { status: error.status });
    console.error("Parts quote request failed", error);
    return NextResponse.json({ error: "The request couldn’t be confirmed. Reload the workbook and check the quote before trying again." }, { status: 500 });
  }
}
