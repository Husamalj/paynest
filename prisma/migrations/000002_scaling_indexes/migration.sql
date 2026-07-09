-- Scaling indexes for tenant-scoped HR/payroll workloads.
-- Safe on existing databases; all indexes are additive.

CREATE INDEX IF NOT EXISTS "users_company_id_role_idx"
  ON "users"("company_id", "role");

CREATE INDEX IF NOT EXISTS "employees_company_id_name_idx"
  ON "employees"("company_id", "name");

CREATE INDEX IF NOT EXISTS "employees_company_id_department_idx"
  ON "employees"("company_id", "department");

CREATE INDEX IF NOT EXISTS "employee_documents_company_id_employee_id_uploaded_at_idx"
  ON "employee_documents"("company_id", "employee_id", "uploaded_at");

CREATE INDEX IF NOT EXISTS "attendance_records_company_id_work_date_idx"
  ON "attendance_records"("company_id", "work_date");

CREATE INDEX IF NOT EXISTS "attendance_records_company_id_employee_id_work_date_idx"
  ON "attendance_records"("company_id", "employee_id", "work_date");

CREATE INDEX IF NOT EXISTS "attendance_records_company_id_system_mode_work_date_idx"
  ON "attendance_records"("company_id", "system_mode", "work_date");

CREATE INDEX IF NOT EXISTS "payroll_records_company_id_period_year_period_month_idx"
  ON "payroll_records"("company_id", "period_year", "period_month");

CREATE INDEX IF NOT EXISTS "payroll_records_company_id_employee_id_period_year_period_month_idx"
  ON "payroll_records"("company_id", "employee_id", "period_year", "period_month");

CREATE INDEX IF NOT EXISTS "payroll_records_company_id_system_mode_calculated_at_idx"
  ON "payroll_records"("company_id", "system_mode", "calculated_at");

CREATE INDEX IF NOT EXISTS "bonuses_deductions_company_id_period_year_period_month_employee_id_idx"
  ON "bonuses_deductions"("company_id", "period_year", "period_month", "employee_id");

CREATE INDEX IF NOT EXISTS "bonuses_deductions_company_id_system_mode_created_at_idx"
  ON "bonuses_deductions"("company_id", "system_mode", "created_at");

CREATE INDEX IF NOT EXISTS "uploaded_files_company_id_system_mode_created_at_idx"
  ON "uploaded_files"("company_id", "system_mode", "created_at");

CREATE INDEX IF NOT EXISTS "uploaded_files_company_id_period_year_period_month_idx"
  ON "uploaded_files"("company_id", "period_year", "period_month");

CREATE INDEX IF NOT EXISTS "leave_requests_company_id_status_created_at_idx"
  ON "leave_requests"("company_id", "status", "created_at");

CREATE INDEX IF NOT EXISTS "leave_requests_company_id_employee_id_start_date_end_date_idx"
  ON "leave_requests"("company_id", "employee_id", "start_date", "end_date");

CREATE INDEX IF NOT EXISTS "tasks_company_id_employee_id_status_idx"
  ON "tasks"("company_id", "employee_id", "status");

CREATE INDEX IF NOT EXISTS "tasks_company_id_created_at_idx"
  ON "tasks"("company_id", "created_at");

CREATE INDEX IF NOT EXISTS "bonus_tiers_company_id_min_grade_idx"
  ON "bonus_tiers"("company_id", "min_grade");

CREATE INDEX IF NOT EXISTS "job_offers_company_id_created_at_idx"
  ON "job_offers"("company_id", "created_at");

CREATE INDEX IF NOT EXISTS "announcements_company_id_published_created_at_idx"
  ON "announcements"("company_id", "published", "created_at");

CREATE INDEX IF NOT EXISTS "advance_requests_company_id_status_created_at_idx"
  ON "advance_requests"("company_id", "status", "created_at");

CREATE INDEX IF NOT EXISTS "advance_requests_company_id_employee_id_created_at_idx"
  ON "advance_requests"("company_id", "employee_id", "created_at");

CREATE INDEX IF NOT EXISTS "company_events_company_id_event_date_idx"
  ON "company_events"("company_id", "event_date");
