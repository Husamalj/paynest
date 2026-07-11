export const SUBSCRIPTION_STATUSES = ["trialing", "active", "past_due", "suspended", "cancelled"] as const;
export const SUBSCRIPTION_PLANS = ["manual", "starter", "growth", "scale", "enterprise"] as const;

export type SubscriptionStatus = (typeof SUBSCRIPTION_STATUSES)[number];
export type SubscriptionPlan = (typeof SUBSCRIPTION_PLANS)[number];

type CompanySubscriptionLike = {
  isActive?: boolean | null;
  status?: string | null;
  subscriptionStatus?: string | null;
  trialEndsAt?: Date | string | null;
  subscriptionEndsAt?: Date | string | null;
};

function asDate(value: Date | string | null | undefined) {
  if (!value) return null;
  const date = value instanceof Date ? value : new Date(value);
  return Number.isNaN(date.getTime()) ? null : date;
}

export function normalizeSubscriptionStatus(value: unknown): SubscriptionStatus {
  return SUBSCRIPTION_STATUSES.includes(value as SubscriptionStatus)
    ? (value as SubscriptionStatus)
    : "active";
}

export function normalizeSubscriptionPlan(value: unknown): SubscriptionPlan {
  return SUBSCRIPTION_PLANS.includes(value as SubscriptionPlan)
    ? (value as SubscriptionPlan)
    : "manual";
}

export function isCompanySubscriptionBlocked(company: CompanySubscriptionLike, now = new Date()) {
  if (company.status === "pending") return false;
  if (company.isActive === false) return true;

  const subscriptionStatus = normalizeSubscriptionStatus(company.subscriptionStatus);
  if (subscriptionStatus === "cancelled" || subscriptionStatus === "suspended" || subscriptionStatus === "past_due") {
    return true;
  }

  if (subscriptionStatus === "trialing") {
    const trialEndsAt = asDate(company.trialEndsAt);
    return Boolean(trialEndsAt && trialEndsAt.getTime() < now.getTime());
  }

  const subscriptionEndsAt = asDate(company.subscriptionEndsAt);
  return Boolean(subscriptionEndsAt && subscriptionEndsAt.getTime() < now.getTime());
}

export function subscriptionBlockReason(company: CompanySubscriptionLike) {
  const subscriptionStatus = normalizeSubscriptionStatus(company.subscriptionStatus);
  if (company.isActive === false || subscriptionStatus === "suspended") return "Company subscription is suspended.";
  if (subscriptionStatus === "cancelled") return "Company subscription is cancelled.";
  if (subscriptionStatus === "past_due") return "Company subscription payment is past due.";
  if (subscriptionStatus === "trialing") return "Company trial has expired.";
  return "Company subscription is inactive.";
}
