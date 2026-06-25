import { Resend } from "resend";
import { prisma } from "@/lib/prisma";

const FROM_ADDRESS = process.env.FROM_EMAIL ?? "noreply@paynest.app";
const APP_URL = process.env.NEXT_PUBLIC_APP_URL ?? "https://paynest.app";

export type Brand = {
  name: string;
  color: string;
  logo?: string | null;
  replyTo?: string | null;
};

const DEFAULT_BRAND: Brand = { name: "PayNest", color: "#2563eb" };

// Strip characters that would break the email "From" display name.
function safeName(name: string) {
  return name.replace(/["<>\r\n,]/g, "").trim().slice(0, 100) || "PayNest";
}

function send(
  to: string,
  subject: string,
  html: string,
  opts?: { fromName?: string; replyTo?: string | null }
) {
  const key = process.env.RESEND_API_KEY;
  if (!key) return;
  const resend = new Resend(key);
  const from = `${safeName(opts?.fromName ?? "PayNest")} <${FROM_ADDRESS}>`;
  resend.emails
    .send({
      from,
      to,
      subject,
      html,
      ...(opts?.replyTo ? { replyTo: opts.replyTo } : {}),
    })
    .catch((err) => console.error("[email]", subject, err));
}

// Load a company's branding from its settings (falls back to PayNest defaults).
async function loadBrand(companyId: number | null | undefined): Promise<Brand> {
  if (companyId == null) return DEFAULT_BRAND;
  try {
    const s = await prisma.companySettings.findFirst({ where: { companyId } });
    if (!s) return DEFAULT_BRAND;
    return {
      name: (s.emailFromName || s.companyName || "PayNest").trim(),
      color: s.brandColor || DEFAULT_BRAND.color,
      logo: s.logo || null,
      replyTo: s.replyTo || null,
    };
  } catch {
    return DEFAULT_BRAND;
  }
}

// A consistent branded HTML shell around the email body.
function wrap(brand: Brand, inner: string) {
  const head = brand.logo
    ? `<img src="${brand.logo}" alt="${brand.name}" style="max-height:48px;max-width:200px;margin-bottom:16px" />`
    : `<h2 style="color:${brand.color};margin:0 0 16px">${brand.name}</h2>`;
  return `<div style="font-family:sans-serif;max-width:560px;margin:auto;color:#0f172a">
    ${head}
    ${inner}
    <p style="margin-top:32px;color:#64748b;font-size:13px;border-top:1px solid #e2e8f0;padding-top:16px">${brand.name}</p>
  </div>`;
}

function button(url: string, label: string, color: string) {
  return `<a href="${url}" style="display:inline-block;background:${color};color:#fff;padding:12px 24px;border-radius:8px;text-decoration:none;font-weight:bold">${label}</a>`;
}

// ── Platform emails (always PayNest-branded) ────────────────────────────────
export function sendWelcomeCompany(to: string, companyName: string) {
  const b = DEFAULT_BRAND;
  send(to, "Welcome to PayNest!", wrap(b, `
    <h3>Welcome to PayNest, ${companyName}!</h3>
    <p>Your company account has been approved. You can now log in and set up your workspace.</p>
    ${button(`${APP_URL}/login`, "Log In Now", b.color)}`));
}

export function sendPasswordReset(to: string, resetUrl: string) {
  const b = DEFAULT_BRAND;
  send(to, "Reset your PayNest password", wrap(b, `
    <h3>Password Reset Request</h3>
    <p>We received a request to reset your password. This link expires in 1 hour.</p>
    ${button(resetUrl, "Reset Password", b.color)}
    <p>If you didn't request this, you can safely ignore this email.</p>`));
}

export function sendEmailVerification(to: string, verifyUrl: string) {
  const b = DEFAULT_BRAND;
  send(to, "Verify your PayNest email", wrap(b, `
    <h3>Verify Your Email Address</h3>
    <p>Click below to verify your email and activate your PayNest account.</p>
    ${button(verifyUrl, "Verify Email", b.color)}`));
}

// ── Company (white-label) emails — carry the employee's company brand ───────
export async function sendNewEmployeeCredentials(
  companyId: number | null,
  to: string,
  name: string,
  tempPassword: string,
  portalUrl: string
) {
  const b = await loadBrand(companyId);
  send(to, `Your ${b.name} account is ready`, wrap(b, `
    <h3>Welcome, ${name}!</h3>
    <p>Your HR team has created an account for you. Use the credentials below to log in.</p>
    <table style="border-collapse:collapse;width:100%;margin:16px 0">
      <tr><td style="padding:8px;background:#f1f5f9;font-weight:bold">Portal URL</td><td style="padding:8px">${portalUrl}</td></tr>
      <tr><td style="padding:8px;background:#f1f5f9;font-weight:bold">Email</td><td style="padding:8px">${to}</td></tr>
      <tr><td style="padding:8px;background:#f1f5f9;font-weight:bold">Temp Password</td><td style="padding:8px;font-family:monospace">${tempPassword}</td></tr>
    </table>
    <p>You will be asked to change your password on first login.</p>
    ${button(portalUrl, "Log In", b.color)}`), { fromName: b.name, replyTo: b.replyTo });
}

export async function sendLeaveDecision(
  companyId: number | null,
  to: string,
  employeeName: string,
  status: "approved" | "rejected",
  leaveType: string,
  startDate: string,
  endDate: string,
  adminNote?: string | null
) {
  const b = await loadBrand(companyId);
  const approved = status === "approved";
  send(to, `Your leave request has been ${approved ? "approved" : "rejected"}`, wrap(b, `
    <h3>Leave Request ${approved ? "Approved ✅" : "Rejected ❌"}</h3>
    <p>Hi ${employeeName},</p>
    <p>Your <strong>${leaveType}</strong> leave request from <strong>${startDate}</strong> to <strong>${endDate}</strong> has been <strong>${status}</strong>.</p>
    ${adminNote ? `<p><strong>Note from HR:</strong> ${adminNote}</p>` : ""}
    ${button(`${APP_URL}/employee-login`, "View in Portal", b.color)}`), { fromName: b.name, replyTo: b.replyTo });
}

export async function sendPayslipReady(
  companyId: number | null,
  to: string,
  employeeName: string,
  month: number,
  year: number
) {
  const b = await loadBrand(companyId);
  const monthName = new Date(year, month - 1).toLocaleString("en-US", { month: "long" });
  send(to, `Your ${monthName} ${year} payslip is ready`, wrap(b, `
    <h3>Payslip Ready 💼</h3>
    <p>Hi ${employeeName},</p>
    <p>Your payslip for <strong>${monthName} ${year}</strong> is now available in your portal.</p>
    ${button(`${APP_URL}/employee-login`, "View Payslip", b.color)}`), { fromName: b.name, replyTo: b.replyTo });
}

// ── Sales: a demo request submitted from the public landing page ─────────────
export function sendDemoRequest(
  to: string,
  data: { firstName: string; lastName?: string; email: string; company?: string; teamSize?: string; message?: string }
) {
  const b = DEFAULT_BRAND;
  const row = (k: string, v?: string) =>
    v ? `<tr><td style="padding:8px;background:#f1f5f9;font-weight:bold;white-space:nowrap">${k}</td><td style="padding:8px">${v}</td></tr>` : "";
  send(to, `New demo request — ${data.company || `${data.firstName} ${data.lastName ?? ""}`.trim()}`, wrap(b, `
    <h3>New demo request 🚀</h3>
    <table style="border-collapse:collapse;width:100%;margin:16px 0">
      ${row("Name", `${data.firstName} ${data.lastName ?? ""}`.trim())}
      ${row("Work email", data.email)}
      ${row("Company", data.company)}
      ${row("Team size", data.teamSize)}
      ${row("Message", data.message)}
    </table>
    <p style="color:#64748b;font-size:13px">Reply directly to this email to reach the lead.</p>`),
    { fromName: "PayNest Leads", replyTo: data.email });
}
