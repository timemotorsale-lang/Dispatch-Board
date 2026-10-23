import { NextRequest, NextResponse } from "next/server";
import { allowPreviewRequest } from "./server/preview-security";

export function proxy(request: NextRequest) {
  if (process.env.DEALERSHIP_HOSTED_REVIEW !== "1") return NextResponse.next();
  if (!allowPreviewRequest(request, process.env)) return new NextResponse("Private review requires the staff gateway.", { status: 403 });
  return NextResponse.next();
}

export const config = { matcher: ["/:path*"] };
