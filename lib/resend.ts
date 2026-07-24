import "server-only";

import { Resend } from "resend";

const EMAIL_PATTERN = /^[^\s@<>]+@[^\s@<>]+\.[^\s@<>]+$/;
let resendClient: Resend | null = null;
const testResendClient = {
  emails: {
    send: async () => ({
      data: { id: "test-email-disabled" },
      error: null,
    }),
  },
} as unknown as Resend;

export class EmailConfigurationError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "EmailConfigurationError";
  }
}

function requireEnvironmentVariable(
  name: "RESEND_API_KEY" | "EMAIL_FROM" | "EMAIL_TEST_TO",
) {
  const value = process.env[name]?.trim();
  if (!value) {
    throw new EmailConfigurationError(
      `Missing required email environment variable: ${name}`,
    );
  }
  return value;
}

function validateEmailAddress(value: string, variable: string) {
  if (!EMAIL_PATTERN.test(value)) {
    throw new EmailConfigurationError(
      `Invalid email address in environment variable: ${variable}`,
    );
  }
  return value;
}

function getConfiguredFrom() {
  const configuredFrom = requireEnvironmentVariable("EMAIL_FROM");
  if (/[\r\n]/.test(configuredFrom)) {
    throw new EmailConfigurationError("Invalid EMAIL_FROM value");
  }

  const displayNameMatch = configuredFrom.match(/^([^<>]+)\s*<([^<>]+)>$/);
  if (displayNameMatch) {
    validateEmailAddress(displayNameMatch[2]!.trim(), "EMAIL_FROM");
    return configuredFrom;
  }

  validateEmailAddress(configuredFrom, "EMAIL_FROM");
  return configuredFrom;
}

export function getResendClient() {
  const apiKey = requireEnvironmentVariable("RESEND_API_KEY");
  if (
    process.env.NODE_ENV === "test"
    || process.env.PAYNEST_DISABLE_EMAIL === "true"
    || apiKey === "re_test_disabled"
  ) {
    return testResendClient;
  }

  if (!resendClient) {
    resendClient = new Resend(apiKey);
  }
  return resendClient;
}

export function getEmailFromAddress() {
  const configuredFrom = getConfiguredFrom();
  const displayNameMatch = configuredFrom.match(/^([^<>]+)\s*<([^<>]+)>$/);
  return displayNameMatch ? displayNameMatch[2]!.trim() : configuredFrom;
}

export function getTestEmailAddresses() {
  return {
    from: getConfiguredFrom(),
    to: validateEmailAddress(
      requireEnvironmentVariable("EMAIL_TEST_TO"),
      "EMAIL_TEST_TO",
    ),
  };
}
