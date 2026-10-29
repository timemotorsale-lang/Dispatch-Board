export const sampleMedia: Record<string, { file: string; type: string }> = {
  rav4: { file: "sample-rav4.png", type: "image/png" },
  sedan: { file: "sample-sedan.jpg", type: "image/jpeg" }, truck: { file: "sample-truck.jpg", type: "image/jpeg" },
  coupe: { file: "sample-coupe.jpg", type: "image/jpeg" }, minivan: { file: "sample-minivan.jpg", type: "image/jpeg" },
  electric: { file: "sample-electric.jpg", type: "image/jpeg" }, hatchback: { file: "sample-hatchback.jpg", type: "image/jpeg" },
  wagon: { file: "sample-wagon.jpg", type: "image/jpeg" }, convertible: { file: "sample-convertible.jpg", type: "image/jpeg" },
  van: { file: "sample-van.jpg", type: "image/jpeg" }
};
export function samplePhoto(body: unknown, fuel: unknown) {
  const key = typeof body === "string" ? body.toLowerCase() : "";
  const selected = key === "suv" ? "rav4" : key === "crossover" ? "electric" : key;
  return `/api/sample-media/${Object.hasOwn(sampleMedia, selected) ? selected : fuel === "Electric" ? "electric" : "sedan"}`;
}
export function isSamplePhoto(value: string) {
  return Object.keys(sampleMedia).some(key => value === `/api/sample-media/${key}`);
}
