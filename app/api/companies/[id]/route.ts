import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireAuth, requireRole, errorResponse, HttpError } from "@/lib/auth";
import { hiddenPageAliases } from "@/lib/responseShape";
import { HIDDEN_PAGE_KEYS, normalizeHiddenPages } from "@/lib/pageRegistry";
import { logAuditForCompany } from "@/lib/audit";
import { invalidateCompanyContext } from "@/lib/companyContext";
import { normalizeSubscriptionPlan, normalizeSubscriptionStatus } from "@/lib/subscription";

export const runtime = "nodejs";

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const session = await requireAuth(req);
    requireRole(session, ["super_admin"]);
    const { id } = await params;
    const body = await req.json();

    // toggle-status: flip isActive
    if (body.toggleStatus) {
      const current = await prisma.company.findUnique({ where: { id: Number(id) } });
      if (!current) throw new HttpError(404, "Company not found");
      const updated = await prisma.company.update({
        where: { id: Number(id) },
        data: { isActive: !current.isActive, status: !current.isActive ? "active" : "suspended" },
      });
      await logAuditForCompany(session, updated.id, "update", "company", updated.id, {
        isActive: { from: current.isActive, to: updated.isActive },
        status: { from: current.status, to: updated.status },
      });
      return NextResponse.json(updated);
    }

    if (typeof body.isActive === "boolean") {
      const current = await prisma.company.findUnique({ where: { id: Number(id) } });
      if (!current) throw new HttpError(404, "Company not found");
      const updated = await prisma.company.update({
        where: { id: Number(id) },
        data: { isActive: body.isActive, status: body.isActive ? "active" : "suspended" },
      });
      await logAuditForCompany(session, updated.id, "update", "company", updated.id, {
        isActive: { from: current.isActive, to: updated.isActive },
        status: { from: current.status, to: updated.status },
      });
      return NextResponse.json({ company: updated });
    }

    // Update maxEmployees (subscription cap)
    if (body.maxEmployees !== undefined) {
      const current = await prisma.company.findUnique({ where: { id: Number(id) } });
      if (!current) throw new HttpError(404, "Company not found");
      const parsed =
        body.maxEmployees === null || body.maxEmployees === ""
          ? null
          : Math.max(0, parseInt(String(body.maxEmployees), 10) || 0);
      const updated = await prisma.company.update({
        where: { id: Number(id) },
        data: { maxEmployees: parsed },
      });
      await logAuditForCompany(session, updated.id, "update", "company", updated.id, {
        maxEmployees: { from: current.maxEmployees, to: updated.maxEmployees },
      });
      return NextResponse.json(updated);
    }

    if (
      body.subscriptionPlan !== undefined ||
      body.subscription_plan !== undefined ||
      body.subscriptionStatus !== undefined ||
      body.subscription_status !== undefined ||
      body.trialEndsAt !== undefined ||
      body.trial_ends_at !== undefined ||
      body.subscriptionEndsAt !== undefined ||
      body.subscription_ends_at !== undefined ||
      body.billingEmail !== undefined ||
      body.billing_email !== undefined ||
      body.billingNotes !== undefined ||
      body.billing_notes !== undefined
    ) {
      const current = await prisma.company.findUnique({ where: { id: Number(id) } });
      if (!current) throw new HttpError(404, "Company not found");

      const parseDate = (value: unknown) => {
        if (value === undefined) return undefined;
        if (value === null || value === "") return null;
        const date = new Date(String(value));
        if (Number.isNaN(date.getTime())) throw new HttpError(400, "Invalid subscription date");
        return date;
      };

      const field = (camel: string, snake: string) =>
        Object.prototype.hasOwnProperty.call(body, camel) ? body[camel] : body[snake];
      const subscriptionPlan = field("subscriptionPlan", "subscription_plan");
      const subscriptionStatus = field("subscriptionStatus", "subscription_status");
      const trialEndsAt = parseDate(field("trialEndsAt", "trial_ends_at"));
      const subscriptionEndsAt = parseDate(field("subscriptionEndsAt", "subscription_ends_at"));
      const billingEmail = field("billingEmail", "billing_email");
      const billingNotes = field("billingNotes", "billing_notes");

      const data: any = {};
      if (subscriptionPlan !== undefined) data.subscriptionPlan = normalizeSubscriptionPlan(subscriptionPlan);
      if (subscriptionStatus !== undefined) {
        data.subscriptionStatus = normalizeSubscriptionStatus(subscriptionStatus);
        data.isActive = !["cancelled", "suspended", "past_due"].includes(data.subscriptionStatus);
        data.status = data.isActive ? "active" : "suspended";
      }
      if (trialEndsAt !== undefined) data.trialEndsAt = trialEndsAt;
      if (subscriptionEndsAt !== undefined) data.subscriptionEndsAt = subscriptionEndsAt;
      if (billingEmail !== undefined) data.billingEmail = billingEmail ? String(billingEmail).trim() : null;
      if (billingNotes !== undefined) data.billingNotes = billingNotes ? String(billingNotes).trim() : null;

      const updated = await prisma.company.update({
        where: { id: Number(id) },
        data,
      });
      await logAuditForCompany(session, updated.id, "update", "company", updated.id, {
        subscriptionPlan: { from: current.subscriptionPlan, to: updated.subscriptionPlan },
        subscriptionStatus: { from: current.subscriptionStatus, to: updated.subscriptionStatus },
        trialEndsAt: { from: current.trialEndsAt, to: updated.trialEndsAt },
        subscriptionEndsAt: { from: current.subscriptionEndsAt, to: updated.subscriptionEndsAt },
        billingEmail: { from: current.billingEmail, to: updated.billingEmail },
      });
      return NextResponse.json(updated);
    }

    // Update hidden pages/modules for this company.
    if (body.hiddenPages !== undefined || body.hidden_pages !== undefined) {
      const raw = body.hiddenPages ?? body.hidden_pages;
      if (!Array.isArray(raw) || raw.some((v) => typeof v !== "string")) {
        throw new HttpError(400, "hiddenPages must be an array of page keys");
      }
      const requested = Array.from(new Set(raw.map((v) => v.trim()).filter(Boolean)));
      const invalid = requested.filter((key) => !HIDDEN_PAGE_KEYS.has(key));
      if (invalid.length > 0) {
        throw new HttpError(400, `Invalid hidden page keys: ${invalid.join(", ")}`);
      }

      const unique = normalizeHiddenPages(requested);
      const current = await prisma.company.findUnique({ where: { id: Number(id) } });
      if (!current) throw new HttpError(404, "Company not found");
      const updated = await prisma.company.update({
        where: { id: Number(id) },
        data: { hiddenPages: unique },
      });
      invalidateCompanyContext(updated.id);
      await logAuditForCompany(session, updated.id, "update", "company", updated.id, {
        hiddenPages: { from: normalizeHiddenPages(current.hiddenPages), to: unique },
      });
      return NextResponse.json({
        ...updated,
        ...hiddenPageAliases({ hiddenPages: unique }),
      });
    }

    throw new HttpError(400, "Invalid request body");
  } catch (err) {
    return errorResponse(err);
  }
}

export async function DELETE(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const session = await requireAuth(req);
    requireRole(session, ["super_admin"]);
    const { id } = await params;
    const companyId = Number(id);
    if (companyId === 1) throw new HttpError(400, "Cannot delete default company");

    await prisma.$transaction([
      prisma.remoteAssignment.deleteMany({ where: { companyId } }),
      prisma.announcement.deleteMany({ where: { companyId } }),
      prisma.notification.deleteMany({ where: { companyId } }),
      prisma.auditLog.deleteMany({ where: { companyId } }),
      prisma.task.deleteMany({ where: { companyId } }),
      prisma.officialHoliday.deleteMany({ where: { companyId } }),
      prisma.leaveBalance.deleteMany({ where: { companyId } }),
      prisma.leaveRequest.deleteMany({ where: { companyId } }),
      prisma.uploadedFile.deleteMany({ where: { companyId } }),
      prisma.bonusDeduction.deleteMany({ where: { companyId } }),
      prisma.bonusTier.deleteMany({ where: { companyId } }),
      prisma.jobOffer.deleteMany({ where: { companyId } }),
      prisma.evaluation.deleteMany({ where: { companyId } }),
      prisma.payrollRecord.deleteMany({ where: { companyId } }),
      prisma.attendanceRecord.deleteMany({ where: { companyId } }),
      prisma.employeeDocument.deleteMany({ where: { companyId } }),
      prisma.employee.deleteMany({ where: { companyId } }),
      prisma.companySettings.deleteMany({ where: { companyId } }),
      prisma.user.deleteMany({ where: { companyId } }),
      prisma.company.delete({ where: { id: companyId } }),
    ]);

    return NextResponse.json({ success: true });
  } catch (err) {
    return errorResponse(err);
  }
}
