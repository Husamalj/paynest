ALTER TABLE "employees"
  ADD COLUMN IF NOT EXISTS "department_number" VARCHAR(50);

CREATE INDEX IF NOT EXISTS "employees_company_id_department_number_idx"
  ON "employees"("company_id", "department_number");
