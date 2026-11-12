const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

/** Layer 1 of the stack: basic email validation. */
export function isValidEmail(email: string): boolean {
  return EMAIL_PATTERN.test(email.trim());
}
