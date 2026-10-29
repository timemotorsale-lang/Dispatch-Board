import { NextRequest, NextResponse } from "next/server";
import { allowPreviewRequest } from "./server/preview-security";
import { samplePolicy } from "../config/sample-policy.mjs";

export function proxy(request: NextRequest) {
  const policy = samplePolicy(process.env);
  if (policy.error) return new NextResponse("Website configuration unavailable.", { status: 503, headers: { "Cache-Control": "no-store" } });
  if (policy.deployment !== "private-review" && !policy.enabled) return NextResponse.next();
  if (!allowPreviewRequest(request, process.env)) return new NextResponse("Private review requires the staff gateway.", { status: 403 });
  const response = NextResponse.next();
  response.headers.set("X-Robots-Tag", "noindex, nofollow, noarchive");
  response.headers.set("Cache-Control", "private, no-store");
  return response;
}

export const config = { matcher: ["/:path*"] };
