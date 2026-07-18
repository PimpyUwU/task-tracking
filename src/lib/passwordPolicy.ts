/** Shared password policy. Used by the sign-up server action (authoritative
   check) and the sign-up form (live feedback), so the rules can't drift apart.
   Kept out of the "use server" actions module, which may only export async
   functions. */
export const PASSWORD_MIN_LENGTH = 8;

export type PasswordRule = {
  id: string;
  label: string;
  test: (password: string) => boolean;
};

export const PASSWORD_RULES: PasswordRule[] = [
  {
    id: "length",
    label: `At least ${PASSWORD_MIN_LENGTH} characters`,
    test: (p) => p.length >= PASSWORD_MIN_LENGTH,
  },
  {
    id: "case",
    label: "Upper & lowercase letters",
    test: (p) => /[a-z]/.test(p) && /[A-Z]/.test(p),
  },
  {
    id: "number",
    label: "At least one number",
    test: (p) => /\d/.test(p),
  },
  {
    id: "symbol",
    label: "At least one symbol",
    test: (p) => /[^A-Za-z0-9]/.test(p),
  },
];

/** Evaluate every rule so callers can render per-rule pass/fail state. */
export function evaluatePassword(password: string) {
  return PASSWORD_RULES.map((rule) => ({
    id: rule.id,
    label: rule.label,
    passed: rule.test(password),
  }));
}

/**
 * Authoritative validation. Returns a single user-facing error string when the
 * password is too weak, or `null` when every rule passes.
 */
export function validatePassword(password: string): string | null {
  const unmet = PASSWORD_RULES.filter((rule) => !rule.test(password));
  if (unmet.length === 0) return null;
  return `Password needs: ${unmet.map((r) => r.label.toLowerCase()).join(", ")}.`;
}
