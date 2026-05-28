import { Resend } from "resend";

const resend = new Resend(process.env.RESEND_API_KEY);
const FROM = process.env.FROM_EMAIL ?? "noreply@paynest.app";
const APP_URL = process.env.NEXT_PUBLIC_APP_URL ?? "https://paynest.app";

function send(to: string, subject: string, html: string) {
  if (!process.env.RESEND_API_KEY) return;
  resend.emails
    .send({ from: FROM, to, subject, html })
    .catch((err) => console.error("[email]", subject, err));
}

export function sendWelcomeCompany(to: string, companyName: string) {
  send(
    to,
    "Welcome to PayNest!",
    `<div style="font-family:sans-serif;max-width:560px;margin:auto">
      <h2>Welcome to PayNest, ${companyName}!</h2>
      <p>Your company account has been approved. You can now log in and set up your workspace.</p>
      <a href="${APP_URL}/login" style="display:inline-block;background:#2563eb;color:#fff;padding:12px 24px;border-radius:8px;text-decoration:none;font-weight:bold">Log In Now</a>
      <p style="margin-top:32px;color:#64748b;font-size:13px">PayNest — HR & Payroll for MENA businesses</p>
    </div>`
  );
}

export function sendPasswordReset(to: string, resetUrl: string) {
  send(
    to,
    "Reset your PayNest password",
    `<div style="font-family:sans-serif;max-width:560px;margin:auto">
      <h2>Password Reset Request</h2>
      <p>We received a request to reset the password for your account. Click the button below — this link expires in 1 hour.</p>
      <a href="${resetUrl}" style="display:inline-block;background:#2563eb;color:#fff;padding:12px 24px;border-radius:8px;text-decoration:none;font-weight:bold">Reset Password</a>
      <p>If you didn't request this, you can safely ignore this email.</p>
      <p style="margin-top:32px;color:#64748b;font-size:13px">PayNest — HR & Payroll for MENA businesses</p>
    </div>`
  );
}

export function sendEmailVerification(to: string, verifyUrl: string) {
  send(
    to,
    "Verify your PayNest email",
    `<div style="font-family:sans-serif;max-width:560px;margin:auto">
      <h2>Verify Your Email Address</h2>
      <p>Click the button below to verify your email and activate your PayNest account.</p>
      <a href="${verifyUrl}" style="display:inline-block;background:#2563eb;color:#fff;padding:12px 24px;border-radius:8px;text-decoration:none;font-weight:bold">Verify Email</a>
      <p style="margin-top:32px;color:#64748b;font-size:13px">PayNest — HR & Payroll for MENA businesses</p>
    </div>`
  );
}

export function sendNewEmployeeCredentials(
  to: string,
  name: string,
  tempPassword: string,
  portalUrl: string
) {
  send(
    to,
    "Your PayNest employee account is ready",
    `<div style="font-family:sans-serif;max-width:560px;margin:auto">
      <h2>Welcome, ${name}!</h2>
      <p>Your HR team has created a PayNest account for you. Use the credentials below to log in.</p>
      <table style="border-collapse:collapse;width:100%;margin:16px 0">
        <tr><td style="padding:8px;background:#f1f5f9;font-weight:bold">Portal URL</td><td style="padding:8px">${portalUrl}</td></tr>
        <tr><td style="padding:8px;background:#f1f5f9;font-weight:bold">Email</td><td style="padding:8px">${to}</td></tr>
        <tr><td style="padding:8px;background:#f1f5f9;font-weight:bold">Temp Password</td><td style="padding:8px;font-family:monospace">${tempPassword}</td></tr>
      </table>
      <p>You will be asked to change your password on first login.</p>
      <a href="${portalUrl}" style="display:inline-block;background:#334155;color:#fff;padding:12px 24px;border-radius:8px;text-decoration:none;font-weight:bold">Log In</a>
      <p style="margin-top:32px;color:#64748b;font-size:13px">PayNest — HR & Payroll for MENA businesses</p>
    </div>`
  );
}

export function sendLeaveDecision(
  to: string,
  employeeName: string,
  status: "approved" | "rejected",
  leaveType: string,
  startDate: string,
  endDate: string,
  adminNote?: string | null
) {
  const approved = status === "approved";
  send(
    to,
    `Your leave request has been ${approved ? "approved" : "rejected"}`,
    `<div style="font-family:sans-serif;max-width:560px;margin:auto">
      <h2>Leave Request ${approved ? "Approved ✅" : "Rejected ❌"}</h2>
      <p>Hi ${employeeName},</p>
      <p>Your <strong>${leaveType}</strong> leave request from <strong>${startDate}</strong> to <strong>${endDate}</strong> has been <strong>${status}</strong>.</p>
      ${adminNote ? `<p><strong>Note from HR:</strong> ${adminNote}</p>` : ""}
      <a href="${APP_URL}/employee-login" style="display:inline-block;background:#334155;color:#fff;padding:12px 24px;border-radius:8px;text-decoration:none;font-weight:bold">View in Portal</a>
      <p style="margin-top:32px;color:#64748b;font-size:13px">PayNest — HR & Payroll for MENA businesses</p>
    </div>`
  );
}

export function sendPayslipReady(
  to: string,
  employeeName: string,
  month: number,
  year: number
) {
  const monthName = new Date(year, month - 1).toLocaleString("en-US", { month: "long" });
  send(
    to,
    `Your ${monthName} ${year} payslip is ready`,
    `<div style="font-family:sans-serif;max-width:560px;margin:auto">
      <h2>Payslip Ready 💼</h2>
      <p>Hi ${employeeName},</p>
      <p>Your payslip for <strong>${monthName} ${year}</strong> is now available in your employee portal.</p>
      <a href="${APP_URL}/employee-login" style="display:inline-block;background:#334155;color:#fff;padding:12px 24px;border-radius:8px;text-decoration:none;font-weight:bold">View Payslip</a>
      <p style="margin-top:32px;color:#64748b;font-size:13px">PayNest — HR & Payroll for MENA businesses</p>
    </div>`
  );
}
