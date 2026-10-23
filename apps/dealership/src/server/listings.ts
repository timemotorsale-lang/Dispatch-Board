import fs from "node:fs/promises";
import { previewEnabled, projectSnapshot, type PublicSnapshot } from "../lib/domain";

export async function getListings(): Promise<PublicSnapshot> {
  if (previewEnabled(process.env)) {
    const observedAt = new Date(Date.now() - 60_000).toISOString();
    const validUntil = new Date(Date.now() + 3_600_000).toISOString();
    return { source: "PREVIEW", listings: projectSnapshot({ schemaVersion: 1, listings: [
      { id: "sample-rav4", publication: "APPROVED", year: 2021, make: "Toyota", model: "RAV4", trim: "XLE AWD", mileage: 78214, price: 18995, body: "SUV", drivetrain: "AWD", transmission: "Automatic", fuel: "Gasoline", availability: "AVAILABLE", photo: "/listing-media/sample-rav4.png", sourceVersion: 1, priceVersion: 1, observedAt, validUntil },
      { id: "sample-coming-soon", publication: "APPROVED", year: 2021, make: "Toyota", model: "RAV4", trim: "Details awaiting publication", mileage: 64000, price: 21995, body: "SUV", drivetrain: "AWD", transmission: "Automatic", fuel: "Gasoline", availability: "COMING_SOON", photo: null, sourceVersion: 1, priceVersion: 1, observedAt, validUntil }
    ] }) };
  }
  if (!process.env.DEALERSHIP_LISTINGS_PATH) return { source: "UNCONFIGURED", listings: [] };
  try {
    const source = await fs.readFile(process.env.DEALERSHIP_LISTINGS_PATH, "utf8");
    if (source.length > 5_000_000) throw new Error("Snapshot is too large.");
    return { source: "PUBLISHED", listings: projectSnapshot(JSON.parse(source)) };
  } catch {
    return { source: "UNAVAILABLE", listings: [], error: "We cannot confirm inventory right now. Please check back or contact the dealership." };
  }
}
