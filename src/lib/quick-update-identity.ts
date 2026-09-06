export function quickUpdateIdentityKey(person: string, phoneNumber: string, company: string) {
  const phoneDigits = phoneNumber.replace(/\D/g, "").slice(-10);
  if (phoneDigits) return `phone:${phoneDigits}`;
  const normalizedPerson = person.toLocaleLowerCase().replace(/\s+/g, " ").trim();
  const normalizedCompany = company.toLocaleLowerCase().replace(/\s+/g, " ").trim();
  return normalizedPerson ? `name:${normalizedPerson}|company:${normalizedCompany}` : "";
}
