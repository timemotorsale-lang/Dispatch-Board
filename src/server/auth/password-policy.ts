export const PASSWORD_POLICY_DESCRIPTION =
  "Password must be at least 12 characters and include uppercase, lowercase, number, and symbol.";

export function validateStaffPassword(password: string, inputLabel = "Password") {
  if (password.length < 12) {
    throw new Error(`${inputLabel} must be at least 12 characters.`);
  }

  if (
    !/[A-Z]/.test(password) ||
    !/[a-z]/.test(password) ||
    !/[0-9]/.test(password) ||
    !/[^A-Za-z0-9]/.test(password)
  ) {
    throw new Error(PASSWORD_POLICY_DESCRIPTION);
  }

  if (/password|dispatch123|welcome123|changeme/i.test(password)) {
    throw new Error(`${inputLabel} cannot use a common or default phrase.`);
  }
}
