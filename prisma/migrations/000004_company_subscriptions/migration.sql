ALTER TABLE "companies"
  ADD COLUMN IF NOT EXISTS "subscription_plan" VARCHAR(50) NOT NULL DEFAULT 'manual',
  ADD COLUMN IF NOT EXISTS "subscription_status" VARCHAR(30) NOT NULL DEFAULT 'active',
  ADD COLUMN IF NOT EXISTS "trial_ends_at" TIMESTAMP(3),
  ADD COLUMN IF NOT EXISTS "subscription_ends_at" TIMESTAMP(3),
  ADD COLUMN IF NOT EXISTS "billing_email" VARCHAR(255),
  ADD COLUMN IF NOT EXISTS "billing_notes" TEXT;

CREATE INDEX IF NOT EXISTS "companies_subscription_status_idx"
  ON "companies"("subscription_status");
