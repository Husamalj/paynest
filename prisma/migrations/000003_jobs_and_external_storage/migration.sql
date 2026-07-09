-- Durable payroll jobs and external file storage metadata.
-- Existing base64 columns stay in place for backward compatibility.

ALTER TABLE "uploaded_files"
  ADD COLUMN IF NOT EXISTS "file_url" TEXT,
  ADD COLUMN IF NOT EXISTS "file_storage_key" TEXT;

ALTER TABLE "employee_documents"
  ALTER COLUMN "file_data" DROP NOT NULL,
  ADD COLUMN IF NOT EXISTS "file_url" TEXT,
  ADD COLUMN IF NOT EXISTS "file_storage_key" TEXT,
  ADD COLUMN IF NOT EXISTS "mime_type" VARCHAR(150);

CREATE TABLE IF NOT EXISTS "payroll_jobs" (
  "id" SERIAL PRIMARY KEY,
  "company_id" INTEGER NOT NULL,
  "requested_by" INTEGER NOT NULL,
  "period_month" INTEGER NOT NULL,
  "period_year" INTEGER NOT NULL,
  "system_mode" VARCHAR(20) NOT NULL DEFAULT 'daily',
  "status" VARCHAR(20) NOT NULL DEFAULT 'queued',
  "processed_rows" INTEGER NOT NULL DEFAULT 0,
  "total_rows" INTEGER NOT NULL DEFAULT 0,
  "error" TEXT,
  "result_summary" JSONB,
  "started_at" TIMESTAMP(3),
  "finished_at" TIMESTAMP(3),
  "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS "payroll_jobs_company_id_status_created_at_idx"
  ON "payroll_jobs"("company_id", "status", "created_at");

CREATE INDEX IF NOT EXISTS "payroll_jobs_company_id_period_year_period_month_idx"
  ON "payroll_jobs"("company_id", "period_year", "period_month");
