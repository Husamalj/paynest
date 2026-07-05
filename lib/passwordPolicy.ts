const MIN_PASSWORD_LENGTH = 10;

const COMMON_WEAK_PASSWORDS = new Set([
  "123456",
  "12345678",
  "123456789",
  "password",
  "password123",
  "qwerty123",
  "test123!",
]);

export function passwordPolicyMessage(password: string) {
  if (!password || password.length < MIN_PASSWORD_LENGTH) {
    return `Password must be at least ${MIN_PASSWORD_LENGTH} characters`;
  }

  if (COMMON_WEAK_PASSWORDS.has(password.toLowerCase())) {
    return "Password is too common";
  }

  if (!/[A-Z]/.test(password)) {
    return "Password must include an uppercase letter";
  }

  if (!/[a-z]/.test(password)) {
    return "Password must include a lowercase letter";
  }

  if (!/[0-9]/.test(password)) {
    return "Password must include a number";
  }

  if (!/[^A-Za-z0-9]/.test(password)) {
    return "Password must include a symbol";
  }

  return null;
}

export function assertStrongPassword(password: string) {
  const message = passwordPolicyMessage(password);
  if (message) {
    throw new Error(message);
  }
}
