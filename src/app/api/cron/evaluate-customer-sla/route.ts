import { NextResponse } from "next/server";
import { evaluateCustomerSlaForSystem } from "@/server/services/customer-sla-service";
import { evaluateCronRequestAuthorization } from "@/server/services/scheduler-attempts";
import { assertCrmSystemFeatureEnabled } from "@/server/services/crm-rollout-service";

async function handle(request: Request) { try { const authorization = evaluateCronRequestAuthorization(request, process.env.CRON_SECRET); if (!authorization.isAuthorized) return NextResponse.json({ error: "Unauthorized cron request." }, { status: 401 }); await assertCrmSystemFeatureEnabled("CRM_SLA"); return NextResponse.json(await evaluateCustomerSlaForSystem()); } catch (error) { return NextResponse.json({ error: error instanceof Error ? error.message : "Unable to evaluate customer SLAs." }, { status: 500 }); } }
export async function GET(request: Request) { return handle(request); }
export async function POST(request: Request) { return handle(request); }
