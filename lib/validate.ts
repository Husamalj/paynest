import { promises as dns } from "dns";
import { parsePhoneNumberFromString } from "libphonenumber-js";

/**
 * Validation helpers for user-supplied contact info.
 * Used by employee add/edit and company signup.
 */

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

/**
 * Validates that an email is well-formed AND its domain can actually
 * receive mail (has MX records, or at least an A record as fallback).
 * This rejects typo / fake domains like "gmal.com" or "test@nope.xyz".
 *
 * Throws an Error with a friendly message when invalid.
 */
export async function assertDeliverableEmail(email: string): Promise<void> {
  const value = (email || "").trim();
  if (!value || !EMAIL_RE.test(value)) {
    throw new Error("Please enter a valid email address.");
  }
  const domain = value.split("@")[1].toLowerCase();

  let hasMx = false;
  try {
    const records = await dns.resolveMx(domain);
    hasMx = Array.isArray(records) && records.length > 0;
  } catch {
    hasMx = false;
  }

  // Fallback: some valid domains accept mail via their A/AAAA record.
  if (!hasMx) {
    try {
      const a = await dns.resolve(domain);
      if (a && a.length > 0) return;
    } catch {
      /* ignore */
    }
    throw new Error(
      `The email domain "${domain}" can't receive mail. Please use a real, working email address.`
    );
  }
}

/**
 * Validates a phone number using libphonenumber-js, which enforces the
 * correct national number length and prefixes per country. The phone is
 * stored as an international number (e.g. "+962790000000"), so the dial
 * code itself tells us which country's rules to apply.
 *
 * A Jordanian number must be a valid Jordanian number, a Saudi number must
 * be a valid Saudi number, etc. — wrong length or wrong prefix is rejected.
 *
 * Throws an Error with a friendly message when invalid.
 */
export function assertValidPhone(phone: string): void {
  const raw = (phone || "").trim();
  if (!raw) {
    throw new Error("Please enter a valid phone number.");
  }
  // Must be in international form so the country can be detected from the dial code.
  const value = raw.startsWith("+") ? raw : `+${raw}`;
  const parsed = parsePhoneNumberFromString(value);
  if (!parsed) {
    throw new Error("Please enter a valid phone number with a country code.");
  }
  if (!parsed.isValid()) {
    const country = parsed.country ? parsed.country : "this country";
    throw new Error(
      `That phone number isn't valid for ${country}. Please check the country and number.`
    );
  }
}
