-- Manual migration for the evaluation-grade / auto-bonus / job-offer features.
-- Run this on the Neon/Postgres database if you cannot use `prisma db push`.
-- Safe to run once; uses IF NOT EXISTS where possible.

-- 1) Auto-bonus amount stored on each evaluation
ALTER TABLE evaluations
  ADD COLUMN IF NOT EXISTS bonus_amount INTEGER NOT NULL DEFAULT 0;

-- 2) Company-wide grade -> bonus tiers
CREATE TABLE IF NOT EXISTS bonus_tiers (
  id          SERIAL PRIMARY KEY,
  company_id  INTEGER     NOT NULL DEFAULT 1,
  min_grade   INTEGER     NOT NULL,
  max_grade   INTEGER     NOT NULL,
  amount      INTEGER     NOT NULL DEFAULT 0,
  created_at  TIMESTAMP   NOT NULL DEFAULT now()
);

-- 3) Saved job / training offers
CREATE TABLE IF NOT EXISTS job_offers (
  id                   SERIAL PRIMARY KEY,
  company_id           INTEGER   NOT NULL DEFAULT 1,
  created_by           INTEGER   NOT NULL,
  name                 TEXT,
  nationality          TEXT,
  phone1               TEXT,
  phone2               TEXT,
  national_id          TEXT,
  qualifications       TEXT,
  experience           TEXT,
  offer_date           TEXT,
  training_title       TEXT,
  sector               TEXT,
  training_hours       TEXT,
  training_period      TEXT,
  agreement_duration   TEXT,
  agreement_type       TEXT,
  agreement_conditions TEXT,
  grant_first          TEXT,
  grant_second         TEXT,
  note_second          TEXT,
  offer_validity       TEXT,
  joining_date         TEXT,
  signature_date       TEXT,
  full_name            TEXT,
  created_at           TIMESTAMP NOT NULL DEFAULT now(),
  updated_at           TIMESTAMP NOT NULL DEFAULT now()
);

-- 4) New salary-file fields on employees (email already exists)
ALTER TABLE employees ADD COLUMN IF NOT EXISTS join_date DATE;
ALTER TABLE employees ADD COLUMN IF NOT EXISTS contract_end_date DATE;
ALTER TABLE employees ADD COLUMN IF NOT EXISTS department VARCHAR(50);

-- 5) Platform-level contact/demo requests
CREATE TABLE IF NOT EXISTS contact_requests (
  id          SERIAL PRIMARY KEY,
  first_name  VARCHAR(120) NOT NULL,
  last_name   VARCHAR(120),
  email       VARCHAR(160) NOT NULL,
  company     VARCHAR(200),
  team_size   VARCHAR(40),
  message     TEXT,
  read        BOOLEAN NOT NULL DEFAULT false,
  created_at  TIMESTAMP NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS contact_requests_read_created_at_idx
  ON contact_requests (read, created_at);

-- 6) Per-company hidden pages/modules controlled by super admin
ALTER TABLE companies
  ADD COLUMN IF NOT EXISTS hidden_pages JSONB NOT NULL DEFAULT '[]'::jsonb;

-- 7) Owner onboarding completion flag
ALTER TABLE companies
  ADD COLUMN IF NOT EXISTS onboarding_completed BOOLEAN NOT NULL DEFAULT false;

-- 8) Tenant-safe uniqueness. Any business table unique key must include
-- company_id so one company cannot collide with or update another company's
-- records when employee numbers/dates are reused.
ALTER TABLE leave_balances
  DROP CONSTRAINT IF EXISTS leave_balances_employee_id_year_key;
DROP INDEX IF EXISTS leave_balances_employee_id_year_key;
CREATE UNIQUE INDEX IF NOT EXISTS leave_balances_company_employee_year_uidx
  ON leave_balances (company_id, employee_id, year);

ALTER TABLE official_holidays
  DROP CONSTRAINT IF EXISTS official_holidays_holiday_date_key;
DROP INDEX IF EXISTS official_holidays_holiday_date_key;
CREATE UNIQUE INDEX IF NOT EXISTS official_holidays_company_date_uidx
  ON official_holidays (company_id, holiday_date);

ALTER TABLE remote_assignments
  DROP CONSTRAINT IF EXISTS remote_assignments_unique_idx;
DROP INDEX IF EXISTS remote_assignments_unique_idx;
CREATE UNIQUE INDEX IF NOT EXISTS remote_assignments_company_employee_dates_uidx
  ON remote_assignments (company_id, employee_id, start_date, end_date);
