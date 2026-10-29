import fs from "node:fs/promises";
import path from "node:path";
import { samplePolicy } from "../../config/sample-policy.mjs";
import { previewEnabled, projectSnapshot, type PublicSnapshot } from "../lib/domain";
import { samplePhoto } from "../lib/sample-media";

export async function getListings(): Promise<PublicSnapshot> {
  const policy = samplePolicy(process.env);
  if (policy.error) return { source: "UNAVAILABLE", listings: [], error: "Website configuration is unavailable. No example inventory has been substituted." };
  if (previewEnabled(process.env)) {
    const observedAt = new Date(Date.now() - 60_000).toISOString();
    const validUntil = new Date(Date.now() + 3_600_000).toISOString();
    try {
      const fixture = JSON.parse(await fs.readFile(path.join(process.cwd(), "fixtures", "inventory.json"), "utf8"));
      fixture.listings = fixture.listings.map((listing: Record<string, unknown>) => ({ ...listing, photo: listing.photo || samplePhoto(listing.body, listing.fuel), observedAt, validUntil }));
      return { source: "PREVIEW", listings: projectSnapshot(fixture, new Date(), { allowSamples: true }) };
    } catch {
      return { source: "UNAVAILABLE", listings: [], error: "Sample inventory is unavailable. No live inventory has been substituted." };
    }
  }
  if (!process.env.DEALERSHIP_LISTINGS_PATH) return { source: "UNCONFIGURED", listings: [] };
  try {
    const source = await fs.readFile(process.env.DEALERSHIP_LISTINGS_PATH, "utf8");
    if (source.length > 5_000_000) throw new Error("Snapshot is too large.");
    return { source: "PUBLISHED", listings: projectSnapshot(JSON.parse(source), new Date(), { requireLive: true }) };
  } catch {
    return { source: "UNAVAILABLE", listings: [], error: "We cannot confirm inventory right now. Please check back or contact the dealership." };
  }
}
