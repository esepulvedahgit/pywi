// Password policy — mirrors the backend validatePassword() rule in server.ts.
// Any change here MUST be reflected in server.ts validatePassword() and vice-versa.
//
// Rules:
//   - Minimum 10 characters
//   - At least one lowercase letter
//   - At least one uppercase letter
//   - At least one digit
//   - At least one special character (non-alphanumeric)

export interface PwCheck {
  minLen: boolean;
  lower: boolean;
  upper: boolean;
  digit: boolean;
  special: boolean;
}

export function checkPassword(pw: string): PwCheck {
  return {
    minLen: pw.length >= 10,
    lower: /[a-z]/.test(pw),
    upper: /[A-Z]/.test(pw),
    digit: /[0-9]/.test(pw),
    special: /[^A-Za-z0-9]/.test(pw),
  };
}

/** Returns true only when all 5 requirements are met. */
export function isValidPassword(pw: string): boolean {
  const c = checkPassword(pw);
  return c.minLen && c.lower && c.upper && c.digit && c.special;
}

/** Returns 0–5: number of requirements currently satisfied. */
export function passwordScore(pw: string): number {
  const c = checkPassword(pw);
  return [c.minLen, c.lower, c.upper, c.digit, c.special].filter(Boolean).length;
}
