import { NextResponse } from "next/server";
import { getCurrentUser } from "@/server/auth/current-user";
import { extractDocumentText } from "@/server/document-library/text-extraction";
import { frontIdFieldsFromText } from "@/features/mobile-capture/id-capture-fields";

export const runtime = "nodejs";
const MAX_BYTES = 8 * 1024 * 1024;
const headers = { "Cache-Control": "no-store", "Pragma": "no-cache" };

export async function POST(request: Request) {
  const actor = await getCurrentUser();
  if (!actor) return NextResponse.json({ error: "Sign in to read an ID front." }, { status: 401, headers });
  if (!actor.isActive) return NextResponse.json({ error: "An active app account is required." }, { status: 403, headers });
  const origin = request.headers.get("origin");
  if (origin && origin !== new URL(request.url).origin) return NextResponse.json({ error: "Open ID capture from this app." }, { status: 403, headers });
  if (Number(request.headers.get("content-length")) > MAX_BYTES + 65536) return NextResponse.json({ error: "Use an ID image under 8 MB." }, { status: 413, headers });
  try {
    const form = await request.formData();
    const file = form.get("file");
    if (!(file instanceof File) || !file.size || file.size > MAX_BYTES || !["image/jpeg", "image/png", "image/webp"].includes(file.type)) return NextResponse.json({ error: "Choose a JPEG, PNG, or WebP ID image under 8 MB." }, { status: 400, headers });
    const bytes = new Uint8Array(await file.arrayBuffer());
    const jpeg = bytes[0] === 255 && bytes[1] === 216 && bytes[2] === 255;
    const png = bytes[0] === 137 && bytes[1] === 80 && bytes[2] === 78 && bytes[3] === 71;
    const webp = new TextDecoder().decode(bytes.slice(0, 4)) === "RIFF" && new TextDecoder().decode(bytes.slice(8, 12)) === "WEBP";
    if (!((file.type === "image/jpeg" && jpeg) || (file.type === "image/png" && png) || (file.type === "image/webp" && webp))) return NextResponse.json({ error: "This file is not a supported ID photo." }, { status: 400, headers });
    const extraction = await extractDocumentText({ bytes, contentType: file.type, fileName: "id-front-photo" });
    const fields = frontIdFieldsFromText(extraction.text);
    return NextResponse.json({ fields, method: extraction.method, needsReview: true, warnings: ["Check every field against the physical ID. Unread fields are left blank.", ...(extraction.text ? [] : ["No text was read. Retake the photo or enter the visible fields manually."])] }, { headers });
  } catch {
    return NextResponse.json({ error: "The ID photo could not be read. Retake it or enter the fields manually." }, { status: 422, headers });
  }
}
