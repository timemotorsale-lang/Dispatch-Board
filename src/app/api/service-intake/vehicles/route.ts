import { NextResponse } from "next/server";

export async function POST() {
  return NextResponse.json(
    {
      error: "Vehicle creation has moved to the canonical Add Vehicle workflow.",
      href: "/vehicles/workflows/add-vehicle",
    },
    { status: 410 },
  );
}
