import { NextResponse } from "next/server";
import { getCurrentUser } from "@/server/auth/current-user";
import { isTrustedAppMutation } from "@/lib/app-request-origin";
import { changeCustomerDeposit, DepositError, depositScope, findDepositVehicles, getDepositReceipt, listCustomerDeposits } from "@/server/crm-next/customer-sales-deposits";
import { renderDepositReceiptPdf } from "@/server/crm-next/customer-deposit-receipt-pdf";
import { depositReceiptCsp, renderCustomerDepositReceipt, renderDepositReceiptBody } from "@/server/crm-next/customer-deposit-receipt";

type Context = { params: Promise<{ customerId: string }> };
const headers = { "cache-control": "private, no-store", "x-content-type-options": "nosniff" };
const failure = (error: unknown) => error instanceof DepositError
  ? NextResponse.json({ error: error.message }, { status: error.status, headers })
  : NextResponse.json({ error: "The deposit action could not be confirmed. Reopen the list or retry the same action." }, { status: 503, headers });

export async function GET(request: Request, { params }: Context) {
  try {
    const scope = await depositScope(await getCurrentUser(), (await params).customerId);
    const query = new URL(request.url).searchParams;
    if (query.has("vehicleSearch")) return NextResponse.json({ vehicles: await findDepositVehicles(scope, query.get("vehicleSearch") ?? "") }, { headers });
    if (query.has("printPreview")) {
      const receipt = await getDepositReceipt(scope, query.get("printPreview") ?? "");
      return NextResponse.json({ printHtml: renderDepositReceiptBody(receipt) }, { headers });
    }
    if (query.has("receipt")) {
      const receipt = await getDepositReceipt(scope, query.get("receipt") ?? "");
      const download = query.get("download") === "1";
      if (download) {
        try {
          const pdf = await renderDepositReceiptPdf(receipt);
          return new NextResponse(new Uint8Array(pdf), { headers: { ...headers, "content-type": "application/pdf",
            "content-disposition": `attachment; filename="deposit-${receipt.id.replace(/[^a-zA-Z0-9-]/g, "")}.pdf"` } });
        } catch (error) {
          // Preserve the original spelling when the PDF's standard font lacks a character.
          if (!(error instanceof Error) || !error.message.startsWith("WinAnsi cannot encode ")) throw error;
        }
      }
      return new NextResponse(renderCustomerDepositReceipt(receipt, !download && query.get("print") === "1", download), { headers: {
        ...(download ? { "content-disposition": `attachment; filename="deposit-${receipt.id.replace(/[^a-zA-Z0-9-]/g, "")}.html"` } : {}),
        ...headers, "content-type": "text/html; charset=utf-8",
        "content-security-policy": depositReceiptCsp
      } });
    }
    return NextResponse.json(await listCustomerDeposits(scope), { headers });
  } catch (error) { return failure(error); }
}

export async function POST(request: Request, { params }: Context) {
  if (!isTrustedAppMutation(request)) return failure(new DepositError("Open this customer in the app to record a deposit.", 403));
  try {
    const scope = await depositScope(await getCurrentUser(), (await params).customerId, true);
    const body = await request.json().catch(() => null);
    if (!body || typeof body !== "object" || Array.isArray(body)) throw new DepositError("Choose a deposit action.");
    return NextResponse.json(await changeCustomerDeposit(scope, body), { headers });
  } catch (error) { return failure(error); }
}
