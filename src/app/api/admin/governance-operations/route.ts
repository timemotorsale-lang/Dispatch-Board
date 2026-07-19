import { NextResponse } from "next/server";
import { getCurrentUser } from "@/server/auth/current-user";
import { executeGovernanceOperation, getGovernanceOperations } from "@/server/governance-operations";

function failure(error: unknown) { const message = error instanceof Error ? error.message : "Governance operation failed."; const status = message === "Authentication required." ? 401 : message.includes("authorization") ? 403 : message.includes("Expected version") || message.includes("concurrently") ? 409 : 400; return NextResponse.json({ error: message }, { status }); }
export async function GET() { try { return NextResponse.json(await getGovernanceOperations(await getCurrentUser())); } catch (error) { return failure(error); } }
export async function POST(request: Request) { try { return NextResponse.json(await executeGovernanceOperation(await getCurrentUser(), await request.json().catch(() => null)), { status: 201 }); } catch (error) { return failure(error); } }
