type QuickUpdateIdentity = {
  company: string;
  identityKey: string;
  person: string;
  phoneNumber: string;
  relatedCustomerId: string | null;
  text: string;
};

function words(value: string) {
  return value.toLocaleLowerCase().replace(/[^a-z0-9]+/g, " ").trim();
}

function phoneDigits(value: string) {
  return value.replace(/\D/g, "").slice(-10);
}

export function quickUpdateMatchesContext(target: QuickUpdateIdentity, candidate: QuickUpdateIdentity, candidateCustomerIds: string[] = []) {
  if (target.identityKey && candidate.identityKey === target.identityKey) return true;
  if (candidate.relatedCustomerId && candidateCustomerIds.includes(candidate.relatedCustomerId)) return true;

  const targetPhone = phoneDigits(target.phoneNumber);
  const candidatePhoneAndText = `${candidate.phoneNumber} ${candidate.text}`.replace(/\D/g, "");
  if (targetPhone && candidatePhoneAndText.includes(targetPhone)) return true;

  const targetPerson = words(target.person);
  const targetText = words(target.text);
  const candidatePerson = words(candidate.person);
  const candidateText = words(candidate.text);
  if (targetPerson.length >= 4 && (candidatePerson === targetPerson || candidateText.includes(targetPerson))) return true;
  if (candidatePerson.length >= 4 && targetText.includes(candidatePerson)) return true;

  const targetCompany = words(target.company);
  const candidateCompany = words(candidate.company);
  return Boolean(targetCompany.length >= 4 && candidateCompany === targetCompany);
}
