export function vinFromBarcode(value: string) {
  return value.toUpperCase().match(/\b[A-HJ-NPR-Z0-9]{17}\b/)?.[0] ?? null;
}

export function idFromBarcode(value: string) {
  if (!value.includes("DAQ")) return null;
  const field = (code: string) => value.match(new RegExp(`${code}([^\\r\\n]+)`))?.[1]?.trim() ?? "";
  const number = field("DAQ");
  if (!number) return null;
  return {
    name: [field("DAC") || field("DCT"), field("DCS")].filter(Boolean).join(" "),
    number,
    state: field("DAJ")
  };
}
