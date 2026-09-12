// Password policy for the change-password form (decision 2026-09-12). A pure rule, tested
// in isolation like the break and leave rules; the server action only calls it.

export const MIN_PASSWORD_LENGTH = 8;

export type PasswordProblem = "too_short" | "mismatch" | "same_as_current";

/** The one reason a new password is refused, checked in the order the form shows the fields. */
export function passwordProblem(i: { current: string; next: string; confirm: string }): PasswordProblem | null {
  if (i.next.length < MIN_PASSWORD_LENGTH) return "too_short";
  if (i.next !== i.confirm) return "mismatch";
  if (i.next === i.current) return "same_as_current";
  return null;
}
