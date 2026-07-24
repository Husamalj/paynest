import "server-only";

import { prisma } from "@/lib/prisma";
import { getEmailFromAddress, getResendClient } from "@/lib/resend";

const FALLBACK_APP_URL = "https://pnest.tech";
const DEFAULT_COLOR = "#2563eb";
const EMAIL_PATTERN = /^[^\s@<>]+@[^\s@<>]+\.[^\s@<>]+$/;
const BRAND_COLOR_PATTERN = /^#[0-9a-f]{6}$/i;

export type Brand = {
  name: string;
  color: string;
  logo?: string | null;
  replyTo?: string | null;
};

const DEFAULT_BRAND: Brand = { name: "PayNest", color: DEFAULT_COLOR };

export function escapeHtml(value: string) {
  return value
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#39;");
}

function validateEmailAddress(value: string, field: string) {
  const email = value.trim();
  if (!EMAIL_PATTERN.test(email)) {
    throw new Error(`Invalid ${field} email address`);
  }
  return email;
}

function validateHttpUrl(value: string, field: string, httpsOnly = false) {
  try {
    const url = new URL(value);
    const allowedProtocol = httpsOnly
      ? url.protocol === "https:"
      : url.protocol === "https:" || url.protocol === "http:";

    if (!allowedProtocol || url.username || url.password) throw new Error();
    return url.toString();
  } catch {
    throw new Error(`Invalid ${field} URL`);
  }
}

function validateBrandColor(value?: string | null) {
  const color = value?.trim() ?? "";
  return BRAND_COLOR_PATTERN.test(color) ? color : DEFAULT_COLOR;
}

function validateLogoUrl(value?: string | null) {
  if (!value?.trim()) return null;
  try {
    return validateHttpUrl(value.trim(), "brand logo", true);
  } catch {
    return null;
  }
}

function normalizeBrand(brand: Brand): Brand {
  return {
    name: brand.name.trim().slice(0, 120) || "PayNest",
    color: validateBrandColor(brand.color),
    logo: validateLogoUrl(brand.logo),
    replyTo: brand.replyTo
      ? validateEmailAddress(brand.replyTo, "reply-to")
      : null,
  };
}

function appUrl(path: string) {
  const base = validateHttpUrl(
    process.env.NEXT_PUBLIC_APP_URL?.trim() || FALLBACK_APP_URL,
    "application",
  );
  return new URL(path, base).toString();
}

// Strip characters that would break the email "From" display name.
function safeName(name: string) {
  return name.replace(/["<>\r\n,]/g, "").trim().slice(0, 100) || "PayNest";
}

function safeSubject(subject: string) {
  return subject.replace(/[\r\n]+/g, " ").trim().slice(0, 200);
}

async function send(
  to: string,
  subject: string,
  html: string,
  opts?: { fromName?: string; replyTo?: string | null },
) {
  const recipient = validateEmailAddress(to, "recipient");
  const replyTo = opts?.replyTo
    ? validateEmailAddress(opts.replyTo, "reply-to")
    : null;
  const resend = getResendClient();
  const from = `${safeName(opts?.fromName ?? "PayNest")} <${getEmailFromAddress()}>`;
  const result = await resend.emails.send({
    from,
    to: recipient,
    subject: safeSubject(subject),
    html,
    ...(replyTo ? { replyTo } : {}),
  });

  if (result.error) {
    console.error("[email]", safeSubject(subject), result.error);
    throw new Error(result.error.message || "Email delivery failed");
  }

  return result.data;
}

// Load a company's branding from its settings (falls back to PayNest defaults).
async function loadBrand(companyId: number | null | undefined): Promise<Brand> {
  if (companyId == null) return DEFAULT_BRAND;
  try {
    const settings = await prisma.companySettings.findFirst({ where: { companyId } });
    if (!settings) return DEFAULT_BRAND;
    return normalizeBrand({
      name: settings.emailFromName || settings.companyName || "PayNest",
      color: settings.brandColor || DEFAULT_COLOR,
      logo: settings.logo,
      replyTo: settings.replyTo,
    });
  } catch (error) {
    console.error("[email] Failed to load company branding:", error);
    return DEFAULT_BRAND;
  }
}

// A consistent branded HTML shell around the email body.
function wrap(brand: Brand, inner: string) {
  const safeBrand = normalizeBrand(brand);
  const brandName = escapeHtml(safeBrand.name);
  const color = validateBrandColor(safeBrand.color);
  const head = safeBrand.logo
    ? `<img src="${escapeHtml(safeBrand.logo)}" alt="${brandName}" style="max-height:48px;max-width:200px;margin-bottom:16px" />`
    : `<h2 style="color:${color};margin:0 0 16px">${brandName}</h2>`;

  return `<div style="font-family:sans-serif;max-width:560px;margin:auto;color:#0f172a">
    ${head}
    ${inner}
    <p style="margin-top:32px;color:#64748b;font-size:13px;border-top:1px solid #e2e8f0;padding-top:16px">${brandName}</p>
  </div>`;
}

function button(url: string, label: string, color: string) {
  const safeUrl = escapeHtml(validateHttpUrl(url, "email action"));
  const safeColor = validateBrandColor(color);
  return `<a href="${safeUrl}" style="display:inline-block;background:${safeColor};color:#fff;padding:12px 24px;border-radius:8px;text-decoration:none;font-weight:bold">${escapeHtml(label)}</a>`;
}

// Platform emails (always PayNest-branded).
export async function sendWelcomeCompany(to: string, companyName: string) {
  const brand = DEFAULT_BRAND;
  return send(to, "Welcome to PayNest!", wrap(brand, `
    <h3>Welcome to PayNest, ${escapeHtml(companyName)}!</h3>
    <p>Your company account has been approved. You can now log in and set up your workspace.</p>
    ${button(appUrl("/login"), "Log In Now", brand.color)}`));
}

export async function sendPasswordReset(to: string, resetUrl: string) {
  const brand = DEFAULT_BRAND;
  return send(to, "Reset your PayNest password", wrap(brand, `
    <h3>Password Reset Request</h3>
    <p>We received a request to reset your password. This link expires in 1 hour.</p>
    ${button(resetUrl, "Reset Password", brand.color)}
    <p>If you didn&#39;t request this, you can safely ignore this email.</p>`));
}

export async function sendEmailVerification(to: string, verifyUrl: string) {
  const brand = DEFAULT_BRAND;
  return send(to, "Verify your PayNest email", wrap(brand, `
    <h3>Verify Your Email Address</h3>
    <p>Click below to verify your email and activate your PayNest account.</p>
    ${button(verifyUrl, "Verify Email", brand.color)}`));
}

// Company (white-label) emails carry the employee's company brand.
export async function sendNewEmployeeCredentials(
  companyId: number | null,
  to: string,
  name: string,
  tempPassword: string,
  portalUrl: string,
) {
  const brand = await loadBrand(companyId);
  const safePortalUrl = validateHttpUrl(portalUrl, "employee portal");
  const recipient = validateEmailAddress(to, "recipient");

  return send(to, `Your ${safeSubject(brand.name)} account is ready`, wrap(brand, `
    <h3>Welcome, ${escapeHtml(name)}!</h3>
    <p>Your HR team has created an account for you. Use the credentials below to log in.</p>
    <table style="border-collapse:collapse;width:100%;margin:16px 0">
      <tr><td style="padding:8px;background:#f1f5f9;font-weight:bold">Portal URL</td><td style="padding:8px">${escapeHtml(safePortalUrl)}</td></tr>
      <tr><td style="padding:8px;background:#f1f5f9;font-weight:bold">Email</td><td style="padding:8px">${escapeHtml(recipient)}</td></tr>
      <tr><td style="padding:8px;background:#f1f5f9;font-weight:bold">Temp Password</td><td style="padding:8px;font-family:monospace">${escapeHtml(tempPassword)}</td></tr>
    </table>
    <p>You will be asked to change your password on first login.</p>
    ${button(safePortalUrl, "Log In", brand.color)}`), {
    fromName: brand.name,
    replyTo: brand.replyTo,
  });
}

export async function sendLeaveDecision(
  companyId: number | null,
  to: string,
  employeeName: string,
  status: "approved" | "rejected",
  leaveType: string,
  startDate: string,
  endDate: string,
  adminNote?: string | null,
) {
  const brand = await loadBrand(companyId);
  const approved = status === "approved";
  return send(to, `Your leave request has been ${status}`, wrap(brand, `
    <h3>Leave Request ${approved ? "Approved" : "Rejected"}</h3>
    <p>Hi ${escapeHtml(employeeName)},</p>
    <p>Your <strong>${escapeHtml(leaveType)}</strong> leave request from <strong>${escapeHtml(startDate)}</strong> to <strong>${escapeHtml(endDate)}</strong> has been <strong>${escapeHtml(status)}</strong>.</p>
    ${adminNote ? `<p><strong>Note from HR:</strong> ${escapeHtml(adminNote).replace(/\r?\n/g, "<br>")}</p>` : ""}
    ${button(appUrl("/employee-login"), "View in Portal", brand.color)}`), {
    fromName: brand.name,
    replyTo: brand.replyTo,
  });
}

export async function sendPayslipReady(
  companyId: number | null,
  to: string,
  employeeName: string,
  month: number,
  year: number,
) {
  if (!Number.isInteger(month) || month < 1 || month > 12) {
    throw new Error("Invalid payslip month");
  }
  if (!Number.isInteger(year) || year < 2000 || year > 9999) {
    throw new Error("Invalid payslip year");
  }

  const brand = await loadBrand(companyId);
  const monthName = new Date(year, month - 1).toLocaleString("en-US", { month: "long" });
  return send(to, `Your ${monthName} ${year} payslip is ready`, wrap(brand, `
    <h3>Payslip Ready</h3>
    <p>Hi ${escapeHtml(employeeName)},</p>
    <p>Your payslip for <strong>${escapeHtml(monthName)} ${escapeHtml(String(year))}</strong> is now available in your portal.</p>
    ${button(appUrl("/employee-login"), "View Payslip", brand.color)}`), {
    fromName: brand.name,
    replyTo: brand.replyTo,
  });
}

// Sales: a demo request submitted from the public landing page.
export async function sendDemoRequest(
  to: string,
  data: {
    firstName: string;
    lastName?: string;
    email: string;
    company?: string;
    teamSize?: string;
    message?: string;
  },
) {
  const brand = DEFAULT_BRAND;
  const contactEmail = validateEmailAddress(data.email, "demo requester");
  const contactName = `${data.firstName} ${data.lastName ?? ""}`.trim();
  const row = (label: string, value?: string) =>
    value
      ? `<tr><td style="padding:8px;background:#f1f5f9;font-weight:bold;white-space:nowrap">${escapeHtml(label)}</td><td style="padding:8px">${escapeHtml(value).replace(/\r?\n/g, "<br>")}</td></tr>`
      : "";

  return send(
    to,
    `New demo request — ${safeSubject(data.company || contactName)}`,
    wrap(brand, `
      <h3>New demo request</h3>
      <table style="border-collapse:collapse;width:100%;margin:16px 0">
        ${row("Name", contactName)}
        ${row("Work email", contactEmail)}
        ${row("Company", data.company)}
        ${row("Team size", data.teamSize)}
        ${row("Message", data.message)}
      </table>
      <p style="color:#64748b;font-size:13px">Reply directly to this email to reach the lead.</p>`),
    { fromName: "PayNest Leads", replyTo: contactEmail },
  );
}
