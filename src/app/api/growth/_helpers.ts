import { NextResponse } from "next/server";

export async function readJson(request: Request) {
  return request.json().catch(() => ({}));
}

export function growthApiError(error: unknown) {
  const message = error instanceof Error ? error.message : "Growth Console request failed.";
  const status = message === "Authentication required."
    ? 401
    : message.includes("cannot run") || message.includes("locked")
      ? 403
      : message.includes("not found")
        ? 404
        : message.includes("required") || message.includes("cannot become")
          ? 400
          : 500;

  return NextResponse.json({
    error: message,
    liveSendLocked: true,
    paidSpendLocked: true,
    sourceMutationLocked: true
  }, { status });
}
