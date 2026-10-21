import { NextResponse } from "next/server";
import { getCurrentUser } from "@/server/auth/current-user";
import { prisma } from "@/server/db/client";
import { moneyAccess } from "@/server/money-resources/service";
import { businessDate, csvCell, MoneyError, moneyToday, signedExpense } from "@/lib/money-resources";
import { moneyError } from "@/server/money-resources/http";

export async function GET(request: Request) {
  try {
    const access = await moneyAccess(await getCurrentUser());
    if (!access.manager) throw new MoneyError("Management access is required for journal exports.", 403);
    const day = businessDate(new URL(request.url).searchParams.get("date") || moneyToday());
    const entries = await prisma.moneyEntry.findMany({ where: { organizationId: access.organizationId, businessDate: day }, include: { employee: { select: { name: true } }, account: { select: { label: true } } }, orderBy: { createdAt: "asc" }, take: 10001 });
    if (entries.length > 10000) throw new MoneyError("This day exceeds the export limit. Ask accounting for a scoped export.", 413);
    const headers = ["record_id", "date", "employee", "kind", "merchant", "purpose", "funding", "amount_usd", "expense_effect_usd", "approval", "receipt", "vehicle_id", "repair_order_id", "inventory_cost_id", "reference"];
    const rows = entries.map(row => [row.id, row.businessDate, row.employee.name, row.kind, row.merchant, row.purpose, row.account?.label || row.paymentMethod, (row.amountCents / 100).toFixed(2), (signedExpense(row) / 100).toFixed(2), row.approvalStatus, row.receiptDocumentId ? "Attached" : row.receiptExplanation ? "Exception explained" : "Pending", row.vehicleId, row.repairOrderId, row.inventoryCostId, row.reference]);
    return new NextResponse([headers, ...rows].map(row => row.map(csvCell).join(",")).join("\r\n"), { headers: { "content-type": "text/csv; charset=utf-8", "content-disposition": `attachment; filename=operational-money-journal-${day}.csv`, "cache-control": "private, no-store" } });
  } catch (error) { return moneyError(error); }
}
