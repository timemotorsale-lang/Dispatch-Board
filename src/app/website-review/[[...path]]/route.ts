import { NextRequest, NextResponse } from "next/server";
import { getCurrentUser } from "@/server/auth/current-user";
import { reviewAccessStatus, reviewForwardHeaders, reviewRequestAllowed } from "@/server/website-review/gateway";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

async function handle(request: NextRequest) {
  const status = reviewAccessStatus(await getCurrentUser(), process.env);
  const privateHeaders = { "Cache-Control": "no-store, private", "X-Robots-Tag": "noindex, nofollow" };
  if (status === 401 && request.method === "GET") {
    const login = new URL("/login", process.env.DEALERSHIP_REVIEW_ORIGIN || request.url);
    login.searchParams.set("returnTo", request.nextUrl.pathname + request.nextUrl.search);
    return NextResponse.redirect(login, { headers: privateHeaders });
  }
  if (status !== 200) return new Response(status === 503 ? "Private website preview is not configured. Return to Website Console." : "Manager sign-in is required.", { status, headers: privateHeaders });
  if (!reviewRequestAllowed(request, process.env)) return new Response("Not allowed.", { status: 403, headers: privateHeaders });
  if (!request.nextUrl.pathname.startsWith("/website-review/") && request.nextUrl.pathname !== "/website-review") return new Response(null, { status: 404 });
  if (Number(request.headers.get("content-length") ?? 0) > 16000) return new Response(null, { status: 413, headers: privateHeaders });
  try {
    const body = ["GET", "HEAD"].includes(request.method) ? undefined : await request.arrayBuffer();
    if (body && body.byteLength > 16000) return new Response(null, { status: 413, headers: privateHeaders });
    const response = await fetch(`http://website-preview:3100${request.nextUrl.pathname}${request.nextUrl.search}`, {
      method: request.method,
      headers: reviewForwardHeaders(request, process.env.DEALERSHIP_REVIEW_KEY!),
      body,
      redirect: "manual",
      cache: "no-store",
      signal: AbortSignal.timeout(30000)
    });
    const headers = new Headers(privateHeaders);
    for (const name of ["content-type", "x-content-type-options", "permissions-policy", "x-frame-options", "vary"]) {
      const value = response.headers.get(name);
      if (value) headers.set(name, value);
    }
    const location = response.headers.get("location");
    if (location) {
      const destination = new URL(location, "http://website-preview:3100");
      if (destination.origin !== "http://website-preview:3100" || !/^\/website-review(?:\/|$)/.test(destination.pathname)) return new Response("Unexpected preview redirect.", { status: 502, headers: privateHeaders });
      headers.set("location", destination.pathname + destination.search);
    }
    for (const cookie of response.headers.getSetCookie()) if (cookie.startsWith("tms-preview=")) headers.append("set-cookie", cookie);
    return new Response(response.body, { status: response.status, headers });
  } catch {
    return new Response("The private website preview is temporarily unavailable. Return to Website Console and retry.", { status: 503, headers: privateHeaders });
  }
}

export const GET = handle;
export const HEAD = handle;
export const POST = handle;
export const DELETE = handle;
