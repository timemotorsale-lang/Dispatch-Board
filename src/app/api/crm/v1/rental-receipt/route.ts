import { NextResponse } from "next/server";
import { getDealsUser } from "@/server/auth/workflow-user";
import { readRentalPaymentReceipt } from "@/server/sales-documents/dashboard-operations";
import { SalesDocumentsError } from "@/server/sales-documents/domain";
import { renderRentalReceiptHtml, renderRentalReceiptPdf, RentalReceiptUnsupportedTextError } from "@/server/sales-documents/rental-receipt-pdf";

const privateHeaders = { "Cache-Control": "private, no-store", "X-Content-Type-Options": "nosniff" };

export async function GET(request: Request) {
  try {
    const params = new URL(request.url).searchParams;
    const receipt = await readRentalPaymentReceipt(await getDealsUser(), {
      draftId: params.get("draftId") ?? "", paymentId: params.get("paymentId") ?? ""
    });
    try {
      const bytes = await renderRentalReceiptPdf(receipt);
      return new NextResponse(new Uint8Array(bytes), { headers: {
        ...privateHeaders, "Content-Type": "application/pdf", "Content-Disposition": `inline; filename="${receipt.receiptNumber}.pdf"`
      } });
    } catch (error) {
      if (!(error instanceof RentalReceiptUnsupportedTextError)) throw error;
      return new NextResponse(renderRentalReceiptHtml(receipt), { headers: {
        ...privateHeaders, "Content-Type": "text/html; charset=utf-8",
        "Content-Security-Policy": "default-src 'none'; img-src data:; style-src 'unsafe-inline'; frame-ancestors 'none'; base-uri 'none'"
      } });
    }
  } catch (error) {
    if (error instanceof SalesDocumentsError) return NextResponse.json({ error: error.message }, { status: error.status });
    return NextResponse.json({ error: "The receipt could not be opened. Reopen the saved payment to retry." }, { status: 503 });
  }
}
