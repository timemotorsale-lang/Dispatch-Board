export function vinFromBarcode(value: string) {
  return value.toUpperCase().match(/\b[A-HJ-NPR-Z0-9]{17}\b/)?.[0] ?? null;
}

export function idFromBarcode(value: string) {
  if (value.length > 20000 || !/(?:ANSI |AAMVA)/.test(value) || !value.trimStart().startsWith("@")) return null;
  const normalized = value.replace(/[\x1c-\x1f]/g, "\n");
  const field = (code: string) => normalized.match(new RegExp(`(?:^|[\\r\\n]|DL|ID)${code}([^\\r\\n]*)`))?.[1]?.replace(/[\x00-\x1f\x7f]/g, "").trim() ?? "";
  const number = field("DAQ");
  if (!number || number.length > 40) return null;
  const state = field("DAJ");
  if (state && !/^[A-Z]{2}$/.test(state)) return null;
  const name = [field("DAC") || field("DCT"), field("DCS")].filter(Boolean).join(" ") || field("DAA").replaceAll(",", " ");
  if (!name || name.length > 160) return null;
  return {
    name,
    number,
    state
  };
}
