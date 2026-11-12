import type { User } from "./users";
import { isValidEmail } from "./validation";

/** Layer 2 of the stack: updates a user's email after validating it. */
export function updateEmail(user: User, email: string): User {
  if (!isValidEmail(email)) {
    throw new Error("invalid email address");
  }
  return { ...user, email: email.trim().toLowerCase() };
}
