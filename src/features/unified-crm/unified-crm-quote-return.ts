export function safeCrmQuoteReturn(value: string | string[] | undefined) {
  if (Array.isArray(value)) return "/crm?view=more";
  if (value === "/crm?view=more" || value === "/crm?view=pipeline") return value;
  return "/crm?view=more";
}

export function withCrmQuoteReturn(pathname: string, returnHref: string) {
  const separator = pathname.includes("?") ? "&" : "?";
  return `${pathname}${separator}crmReturnTo=${encodeURIComponent(returnHref)}`;
}
