export function formatDocumentPhone(value?: string) {
  const phone = value?.trim().replace(/^(?:phone\s*:\s*)+/i, "") ?? "";
  if (!/^\+?[\d().\s-]+$/.test(phone)) return phone;
  const digits = phone.replace(/\D/g, "");
  if (digits.length === 10 && !phone.startsWith("+")) return digits.replace(/^(\d{3})(\d{3})(\d{4})$/, "$1 $2 $3");
  if (/^1\d{10}$/.test(digits)) return digits.slice(1).replace(/^(\d{3})(\d{3})(\d{4})$/, "$1 $2 $3");
  return phone;
}

export function documentPhoneLine(value?: string) {
  const phone = formatDocumentPhone(value);
  return phone ? `Phone: ${phone}` : "";
}
