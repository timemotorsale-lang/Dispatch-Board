import { NextResponse } from "next/server";
import { isTrustedAppMutation } from "@/lib/app-request-origin";
import { getDealsUser as getCurrentUser } from "@/server/auth/workflow-user";
import { executeTestDrive, readTestDrive } from "@/server/deal-continuity/test-drive";
import { dealIdentityFailure } from "@/server/deal-continuity/http";
type Context = { params: Promise<{ id: string }> };
const headers = { "Cache-Control": "private, no-store", Vary: "Cookie" };
export async function GET(_request: Request, context: Context) {
  try { return NextResponse.json(await readTestDrive(await getCurrentUser(), (await context.params).id), { headers }); }
  catch (error) { return dealIdentityFailure(error); }
}
export async function POST(request: Request, context: Context) {
  if (!isTrustedAppMutation(request)) return NextResponse.json({ error: "Open this action from the application." }, { status: 403, headers });
  try { return NextResponse.json(await executeTestDrive(await getCurrentUser(), (await context.params).id, await request.json()), { headers }); }
  catch (error) { return dealIdentityFailure(error); }
}
