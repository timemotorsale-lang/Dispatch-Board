import { NextResponse } from "next/server";
import { getCurrentUser } from "@/server/auth/current-user";
import { MoneyError } from "@/lib/money-resources";
import { moneyError, requireMoneyOrigin } from "@/server/money-resources/http";
import { assignStaffCompanyAccess } from "@/server/money-resources/staff-access";

export async function POST(request: Request) {
  try {
    requireMoneyOrigin(request);
    const body = await request.json();
    if (!body || typeof body !== "object" || Array.isArray(body)) throw new MoneyError("Use the staff company access form.");
    return NextResponse.json(await assignStaffCompanyAccess(await getCurrentUser(), body), { headers: { "cache-control": "no-store" } });
  } catch (error) { return moneyError(error); }
}
