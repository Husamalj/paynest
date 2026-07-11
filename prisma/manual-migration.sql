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

-- 9) Scaling indexes for large tenant-scoped datasets. Safe to rerun.
CREATE INDEX IF NOT EXISTS users_company_id_role_idx
  ON users (company_id, role);
CREATE INDEX IF NOT EXISTS employees_company_id_name_idx
  ON employees (company_id, name);
CREATE INDEX IF NOT EXISTS employees_company_id_department_idx
  ON employees (company_id, department);
CREATE INDEX IF NOT EXISTS employee_documents_company_id_employee_id_uploaded_at_idx
  ON employee_documents (company_id, employee_id, uploaded_at);
CREATE INDEX IF NOT EXISTS attendance_records_company_id_work_date_idx
  ON attendance_records (company_id, work_date);
CREATE INDEX IF NOT EXISTS attendance_records_company_id_employee_id_work_date_idx
  ON attendance_records (company_id, employee_id, work_date);
CREATE INDEX IF NOT EXISTS attendance_records_company_id_system_mode_work_date_idx
  ON attendance_records (company_id, system_mode, work_date);
CREATE INDEX IF NOT EXISTS payroll_records_company_id_period_year_period_month_idx
  ON payroll_records (company_id, period_year, period_month);
CREATE INDEX IF NOT EXISTS payroll_records_company_id_employee_id_period_year_period_month_idx
  ON payroll_records (company_id, employee_id, period_year, period_month);
CREATE INDEX IF NOT EXISTS payroll_records_company_id_system_mode_calculated_at_idx
  ON payroll_records (company_id, system_mode, calculated_at);
CREATE INDEX IF NOT EXISTS bonuses_deductions_company_id_period_year_period_month_employee_id_idx
  ON bonuses_deductions (company_id, period_year, period_month, employee_id);
CREATE INDEX IF NOT EXISTS bonuses_deductions_company_id_system_mode_created_at_idx
  ON bonuses_deductions (company_id, system_mode, created_at);
CREATE INDEX IF NOT EXISTS uploaded_files_company_id_system_mode_created_at_idx
  ON uploaded_files (company_id, system_mode, created_at);
CREATE INDEX IF NOT EXISTS uploaded_files_company_id_period_year_period_month_idx
  ON uploaded_files (company_id, period_year, period_month);
CREATE INDEX IF NOT EXISTS leave_requests_company_id_status_created_at_idx
  ON leave_requests (company_id, status, created_at);
CREATE INDEX IF NOT EXISTS leave_requests_company_id_employee_id_start_date_end_date_idx
  ON leave_requests (company_id, employee_id, start_date, end_date);
CREATE INDEX IF NOT EXISTS tasks_company_id_employee_id_status_idx
  ON tasks (company_id, employee_id, status);
CREATE INDEX IF NOT EXISTS tasks_company_id_created_at_idx
  ON tasks (company_id, created_at);
CREATE INDEX IF NOT EXISTS bonus_tiers_company_id_min_grade_idx
  ON bonus_tiers (company_id, min_grade);
CREATE INDEX IF NOT EXISTS job_offers_company_id_created_at_idx
  ON job_offers (company_id, created_at);
CREATE INDEX IF NOT EXISTS announcements_company_id_published_created_at_idx
  ON announcements (company_id, published, created_at);
CREATE INDEX IF NOT EXISTS advance_requests_company_id_status_created_at_idx
  ON advance_requests (company_id, status, created_at);
CREATE INDEX IF NOT EXISTS advance_requests_company_id_employee_id_created_at_idx
  ON advance_requests (company_id, employee_id, created_at);
CREATE INDEX IF NOT EXISTS company_events_company_id_event_date_idx
  ON company_events (company_id, event_date);

-- 10) External storage metadata and durable payroll jobs.
ALTER TABLE uploaded_files
  ADD COLUMN IF NOT EXISTS file_url TEXT,
  ADD COLUMN IF NOT EXISTS file_storage_key TEXT;

ALTER TABLE employee_documents
  ALTER COLUMN file_data DROP NOT NULL,
  ADD COLUMN IF NOT EXISTS file_url TEXT,
  ADD COLUMN IF NOT EXISTS file_storage_key TEXT,
  ADD COLUMN IF NOT EXISTS mime_type VARCHAR(150);

CREATE TABLE IF NOT EXISTS payroll_jobs (
  id SERIAL PRIMARY KEY,
  company_id INTEGER NOT NULL,
  requested_by INTEGER NOT NULL,
  period_month INTEGER NOT NULL,
  period_year INTEGER NOT NULL,
  system_mode VARCHAR(20) NOT NULL DEFAULT 'daily',
  status VARCHAR(20) NOT NULL DEFAULT 'queued',
  processed_rows INTEGER NOT NULL DEFAULT 0,
  total_rows INTEGER NOT NULL DEFAULT 0,
  error TEXT,
  result_summary JSONB,
  started_at TIMESTAMP,
  finished_at TIMESTAMP,
  created_at TIMESTAMP NOT NULL DEFAULT now(),
  updated_at TIMESTAMP NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS payroll_jobs_company_id_status_created_at_idx
  ON payroll_jobs (company_id, status, created_at);
CREATE INDEX IF NOT EXISTS payroll_jobs_company_id_period_year_period_month_idx
  ON payroll_jobs (company_id, period_year, period_month);

-- 11) Company subscription/billing metadata. Payment gateway integration can
-- write to these fields later; super admin can manage them manually now.
ALTER TABLE companies
  ADD COLUMN IF NOT EXISTS subscription_plan VARCHAR(50) NOT NULL DEFAULT 'manual',
  ADD COLUMN IF NOT EXISTS subscription_status VARCHAR(30) NOT NULL DEFAULT 'active',
  ADD COLUMN IF NOT EXISTS trial_ends_at TIMESTAMP,
  ADD COLUMN IF NOT EXISTS subscription_ends_at TIMESTAMP,
  ADD COLUMN IF NOT EXISTS billing_email VARCHAR(255),
  ADD COLUMN IF NOT EXISTS billing_notes TEXT;

CREATE INDEX IF NOT EXISTS companies_subscription_status_idx
  ON companies (subscription_status);
