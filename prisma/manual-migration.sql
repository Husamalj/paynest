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
