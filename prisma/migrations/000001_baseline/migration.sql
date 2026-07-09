-- CreateTable
CREATE TABLE "companies" (
    "id" SERIAL NOT NULL,
    "name" VARCHAR(255) NOT NULL,
    "slug" VARCHAR(100) NOT NULL,
    "status" VARCHAR(20) NOT NULL DEFAULT 'active',
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "max_employees" INTEGER,
    "hidden_pages" JSONB NOT NULL DEFAULT '[]',
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "onboarding_completed" BOOLEAN NOT NULL DEFAULT false,

    CONSTRAINT "companies_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "audit_logs" (
    "id" SERIAL NOT NULL,
    "company_id" INTEGER NOT NULL,
    "user_id" INTEGER NOT NULL,
    "user_name" VARCHAR(255),
    "user_role" VARCHAR(20),
    "action" VARCHAR(50) NOT NULL,
    "entity" VARCHAR(50) NOT NULL,
    "entity_id" VARCHAR(100),
    "changes" JSONB,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "audit_logs_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "users" (
    "id" SERIAL NOT NULL,
    "name" VARCHAR(255) NOT NULL,
    "employee_number" VARCHAR(50),
    "email" VARCHAR(255),
    "password" VARCHAR(255) NOT NULL,
    "role" VARCHAR(20) NOT NULL,
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "must_change_password" BOOLEAN NOT NULL DEFAULT false,
    "company_id" INTEGER,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "email_verified_at" TIMESTAMP(3),

    CONSTRAINT "users_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "company_settings" (
    "id" SERIAL NOT NULL,
    "company_id" INTEGER NOT NULL DEFAULT 1,
    "company_name" VARCHAR(255) NOT NULL DEFAULT 'PayNest',
    "system_mode" VARCHAR(20) NOT NULL DEFAULT 'daily',
    "calc_mode" VARCHAR(20) NOT NULL DEFAULT 'daily',
    "language" VARCHAR(10) NOT NULL DEFAULT 'ar',
    "req_hours" DECIMAL(65,30) NOT NULL DEFAULT 8,
    "month_days" INTEGER NOT NULL DEFAULT 26,
    "late_tolerance" INTEGER NOT NULL DEFAULT 0,
    "workdays" VARCHAR(50) NOT NULL DEFAULT 'Sun,Mon,Tue,Wed,Thu',
    "deduction_rate" DECIMAL(65,30) NOT NULL DEFAULT 1.0,
    "extra_rate" DECIMAL(65,30) NOT NULL DEFAULT 1.0,
    "work_start_time" VARCHAR(5) NOT NULL DEFAULT '09:00',
    "timezone" VARCHAR(60) NOT NULL DEFAULT 'Asia/Amman',
    "logo" TEXT,
    "brand_color" VARCHAR(20),
    "email_from_name" VARCHAR(120),
    "reply_to" VARCHAR(160),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "company_settings_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "employees" (
    "id" SERIAL NOT NULL,
    "company_id" INTEGER NOT NULL DEFAULT 1,
    "employee_id" VARCHAR(50),
    "name" VARCHAR(255) NOT NULL,
    "email" VARCHAR(255) NOT NULL DEFAULT '',
    "religion" VARCHAR(50) NOT NULL DEFAULT '',
    "base_salary" DECIMAL(65,30) NOT NULL DEFAULT 0,
    "phone" VARCHAR(30) NOT NULL DEFAULT '',
    "social_security" BOOLEAN NOT NULL DEFAULT false,
    "remote_days" INTEGER NOT NULL DEFAULT 0,
    "allowance" DECIMAL(10,2) NOT NULL DEFAULT 0,
    "job_title" VARCHAR(255),
    "nationality" VARCHAR(100),
    "gender" VARCHAR(10),
    "national_id" VARCHAR(50),
    "birth_date" DATE,
    "photo_url" TEXT,
    "join_date" DATE,
    "contract_end_date" DATE,
    "department" VARCHAR(50),
    "system_mode" VARCHAR(20) NOT NULL DEFAULT 'daily',
    "work_type" VARCHAR(20) NOT NULL DEFAULT 'standard',
    "workdays" VARCHAR(50),
    "req_hours" DECIMAL(65,30),
    "supervisor_id" INTEGER,
    "supervisor_ids" INTEGER[] DEFAULT ARRAY[]::INTEGER[],
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "employees_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "employee_documents" (
    "id" SERIAL NOT NULL,
    "company_id" INTEGER NOT NULL,
    "employee_id" VARCHAR(50) NOT NULL,
    "document_type" VARCHAR(50) NOT NULL,
    "file_name" VARCHAR(255) NOT NULL,
    "file_data" TEXT NOT NULL,
    "uploaded_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "employee_documents_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "attendance_records" (
    "id" SERIAL NOT NULL,
    "company_id" INTEGER NOT NULL DEFAULT 1,
    "employee_id" VARCHAR(50),
    "work_date" DATE,
    "clock_in" TIME,
    "clock_out" TIME,
    "hours_worked" DECIMAL(65,30) NOT NULL DEFAULT 0,
    "upload_batch" VARCHAR(100),
    "system_mode" VARCHAR(20) NOT NULL DEFAULT 'daily',
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "attendance_records_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "payroll_records" (
    "id" SERIAL NOT NULL,
    "company_id" INTEGER NOT NULL DEFAULT 1,
    "employee_id" VARCHAR(50),
    "period_month" INTEGER,
    "period_year" INTEGER,
    "base_salary" DECIMAL(65,30),
    "total_hours" DECIMAL(65,30),
    "required_hours" DECIMAL(65,30),
    "hour_diff" DECIMAL(65,30),
    "adjustment" DECIMAL(65,30),
    "social_security_deduct" DECIMAL(65,30) NOT NULL DEFAULT 0,
    "bonus_total" DECIMAL(65,30) NOT NULL DEFAULT 0,
    "deduction_total" DECIMAL(65,30) NOT NULL DEFAULT 0,
    "net_salary" DECIMAL(65,30),
    "status" VARCHAR(50),
    "daily_breakdown" JSONB,
    "system_mode" VARCHAR(20) NOT NULL DEFAULT 'daily',
    "calculated_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "payroll_records_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "bonuses_deductions" (
    "id" SERIAL NOT NULL,
    "company_id" INTEGER NOT NULL DEFAULT 1,
    "employee_id" VARCHAR(50),
    "employee_name" VARCHAR(255),
    "type" VARCHAR(50),
    "reason" VARCHAR(255),
    "amount" DECIMAL(65,30),
    "period_month" INTEGER,
    "period_year" INTEGER,
    "system_mode" VARCHAR(20) NOT NULL DEFAULT 'daily',
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "bonuses_deductions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "uploaded_files" (
    "id" SERIAL NOT NULL,
    "company_id" INTEGER NOT NULL DEFAULT 1,
    "filename" VARCHAR(255),
    "original_name" VARCHAR(255),
    "file_type" VARCHAR(50),
    "upload_batch" VARCHAR(100),
    "row_count" INTEGER,
    "employee_count" INTEGER NOT NULL DEFAULT 0,
    "system_mode" VARCHAR(20) NOT NULL DEFAULT 'daily',
    "file_data" TEXT,
    "mime_type" VARCHAR(150),
    "period_month" INTEGER,
    "period_year" INTEGER,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "uploaded_files_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "leave_requests" (
    "id" SERIAL NOT NULL,
    "company_id" INTEGER NOT NULL DEFAULT 1,
    "employee_id" VARCHAR(50),
    "employee_name" VARCHAR(255),
    "leave_type" VARCHAR(50),
    "start_date" DATE,
    "end_date" DATE,
    "days_count" INTEGER,
    "reason" TEXT,
    "status" VARCHAR(20) NOT NULL DEFAULT 'pending',
    "supervisor_status" VARCHAR(20) NOT NULL DEFAULT 'pending',
    "hr_status" VARCHAR(20) NOT NULL DEFAULT 'pending',
    "attachment_url" TEXT,
    "admin_note" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "leave_requests_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "leave_balances" (
    "id" SERIAL NOT NULL,
    "company_id" INTEGER NOT NULL DEFAULT 1,
    "employee_id" VARCHAR(50),
    "year" INTEGER,
    "annual_total" INTEGER NOT NULL DEFAULT 14,
    "annual_used" INTEGER NOT NULL DEFAULT 0,
    "sick_total" INTEGER NOT NULL DEFAULT 14,
    "sick_used" INTEGER NOT NULL DEFAULT 0,

    CONSTRAINT "leave_balances_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "official_holidays" (
    "id" SERIAL NOT NULL,
    "company_id" INTEGER NOT NULL DEFAULT 1,
    "name" VARCHAR(255),
    "holiday_date" DATE NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "official_holidays_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "monthly_salaries" (
    "id" SERIAL NOT NULL,
    "company_id" INTEGER NOT NULL,
    "period_month" INTEGER NOT NULL,
    "period_year" INTEGER NOT NULL,
    "employee_id" VARCHAR(50) NOT NULL,
    "name" VARCHAR(255) NOT NULL,
    "base_salary" DECIMAL(65,30) NOT NULL DEFAULT 0,
    "social_security" BOOLEAN NOT NULL DEFAULT false,
    "system_mode" VARCHAR(20) NOT NULL DEFAULT 'daily',
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "monthly_salaries_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "tasks" (
    "id" SERIAL NOT NULL,
    "company_id" INTEGER NOT NULL DEFAULT 1,
    "task_name" VARCHAR(255) NOT NULL,
    "employee_id" VARCHAR(50),
    "start_date" DATE,
    "deadline" DATE,
    "status" VARCHAR(50) NOT NULL DEFAULT 'pending',
    "priority" VARCHAR(20) NOT NULL DEFAULT 'medium',
    "target_value" DOUBLE PRECISION,
    "current_value" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "unit" VARCHAR(30),
    "attachment" TEXT,
    "attachment_name" VARCHAR(255),
    "report" TEXT,
    "report_at" TIMESTAMP(3),
    "system_mode" VARCHAR(20) NOT NULL DEFAULT 'daily',
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "tasks_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "remote_assignments" (
    "id" SERIAL NOT NULL,
    "company_id" INTEGER NOT NULL DEFAULT 1,
    "employee_id" VARCHAR(50) NOT NULL,
    "start_date" DATE NOT NULL,
    "end_date" DATE NOT NULL,
    "label" VARCHAR(255),
    "note" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "remote_assignments_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "evaluations" (
    "id" SERIAL NOT NULL,
    "company_id" INTEGER NOT NULL DEFAULT 1,
    "evaluator_id" INTEGER NOT NULL,
    "employee_id" VARCHAR(50) NOT NULL,
    "period_month" INTEGER NOT NULL,
    "period_year" INTEGER NOT NULL,
    "score_accuracy" SMALLINT,
    "score_innovation" SMALLINT,
    "score_speed" SMALLINT,
    "score_development" SMALLINT,
    "score_quality_check" SMALLINT,
    "score_prioritization" SMALLINT,
    "score_independence" SMALLINT,
    "score_deadlines" SMALLINT,
    "score_teamwork" SMALLINT,
    "score_communication" SMALLINT,
    "score_knowledge_sharing" SMALLINT,
    "score_feedback" SMALLINT,
    "score_compliance" SMALLINT,
    "bonus_worthy" BOOLEAN NOT NULL DEFAULT false,
    "bonus_amount" INTEGER NOT NULL DEFAULT 0,
    "bonus_override" BOOLEAN NOT NULL DEFAULT false,
    "recommendations" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "evaluations_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "bonus_tiers" (
    "id" SERIAL NOT NULL,
    "company_id" INTEGER NOT NULL DEFAULT 1,
    "min_grade" INTEGER NOT NULL,
    "max_grade" INTEGER NOT NULL,
    "amount" INTEGER NOT NULL DEFAULT 0,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "bonus_tiers_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "job_offers" (
    "id" SERIAL NOT NULL,
    "company_id" INTEGER NOT NULL DEFAULT 1,
    "created_by" INTEGER NOT NULL,
    "name" TEXT,
    "nationality" TEXT,
    "phone1" TEXT,
    "phone2" TEXT,
    "national_id" TEXT,
    "qualifications" TEXT,
    "experience" TEXT,
    "offer_date" TEXT,
    "training_title" TEXT,
    "sector" TEXT,
    "training_hours" TEXT,
    "training_period" TEXT,
    "agreement_duration" TEXT,
    "agreement_type" TEXT,
    "agreement_conditions" TEXT,
    "grant_first" TEXT,
    "grant_second" TEXT,
    "note_second" TEXT,
    "offer_validity" TEXT,
    "joining_date" TEXT,
    "signature_date" TEXT,
    "full_name" TEXT,
    "values" JSONB,
    "kind" VARCHAR(20) NOT NULL DEFAULT 'form',
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "job_offers_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "contact_requests" (
    "id" SERIAL NOT NULL,
    "first_name" VARCHAR(120) NOT NULL,
    "last_name" VARCHAR(120),
    "email" VARCHAR(160) NOT NULL,
    "company" VARCHAR(200),
    "team_size" VARCHAR(40),
    "message" TEXT,
    "read" BOOLEAN NOT NULL DEFAULT false,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "contact_requests_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "job_offer_templates" (
    "id" SERIAL NOT NULL,
    "company_id" INTEGER NOT NULL,
    "image" TEXT NOT NULL,
    "fields" JSONB NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "job_offer_templates_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "announcements" (
    "id" SERIAL NOT NULL,
    "company_id" INTEGER NOT NULL DEFAULT 1,
    "title" VARCHAR(255) NOT NULL,
    "message" TEXT NOT NULL,
    "published" BOOLEAN NOT NULL DEFAULT false,
    "visible_to_employees" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "announcements_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "password_reset_tokens" (
    "id" SERIAL NOT NULL,
    "user_id" INTEGER NOT NULL,
    "token" VARCHAR(64) NOT NULL,
    "expires_at" TIMESTAMP(3) NOT NULL,
    "used" BOOLEAN NOT NULL DEFAULT false,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "password_reset_tokens_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "notifications" (
    "id" SERIAL NOT NULL,
    "company_id" INTEGER NOT NULL,
    "user_id" INTEGER,
    "type" VARCHAR(50) NOT NULL,
    "message" TEXT NOT NULL,
    "link" VARCHAR(255),
    "read" BOOLEAN NOT NULL DEFAULT false,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "notifications_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "advance_requests" (
    "id" SERIAL NOT NULL,
    "company_id" INTEGER NOT NULL,
    "employee_id" VARCHAR(50),
    "employee_name" VARCHAR(255),
    "amount" DECIMAL(65,30) NOT NULL,
    "installments" INTEGER NOT NULL DEFAULT 1,
    "reason" VARCHAR(500),
    "status" VARCHAR(20) NOT NULL DEFAULT 'pending',
    "admin_note" VARCHAR(500),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "advance_requests_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "messages" (
    "id" SERIAL NOT NULL,
    "company_id" INTEGER NOT NULL,
    "sender_id" VARCHAR(50) NOT NULL,
    "receiver_id" VARCHAR(50) NOT NULL,
    "body" TEXT,
    "attachment" TEXT,
    "attachment_name" VARCHAR(255),
    "read" BOOLEAN NOT NULL DEFAULT false,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "messages_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "company_events" (
    "id" SERIAL NOT NULL,
    "company_id" INTEGER NOT NULL,
    "event_date" DATE NOT NULL,
    "title" VARCHAR(255) NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "company_events_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "request_types" (
    "id" SERIAL NOT NULL,
    "company_id" INTEGER NOT NULL,
    "name" VARCHAR(255) NOT NULL,
    "fields" JSONB NOT NULL DEFAULT '[]',
    "active" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "request_types_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "custom_requests" (
    "id" SERIAL NOT NULL,
    "company_id" INTEGER NOT NULL,
    "request_type_id" INTEGER NOT NULL,
    "type_name" VARCHAR(255) NOT NULL,
    "employee_id" VARCHAR(50),
    "employee_name" VARCHAR(255),
    "values" JSONB NOT NULL DEFAULT '{}',
    "status" VARCHAR(20) NOT NULL DEFAULT 'pending',
    "admin_note" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "custom_requests_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "companies_slug_key" ON "companies"("slug");

-- CreateIndex
CREATE INDEX "audit_logs_company_id_created_at_idx" ON "audit_logs"("company_id", "created_at");

-- CreateIndex
CREATE INDEX "employees_supervisor_id_idx" ON "employees"("supervisor_id");

-- CreateIndex
CREATE UNIQUE INDEX "employees_emp_company_uidx" ON "employees"("employee_id", "company_id");

-- CreateIndex
CREATE UNIQUE INDEX "leave_balances_company_employee_year_uidx" ON "leave_balances"("company_id", "employee_id", "year");

-- CreateIndex
CREATE UNIQUE INDEX "official_holidays_company_date_uidx" ON "official_holidays"("company_id", "holiday_date");

-- CreateIndex
CREATE INDEX "monthly_salaries_company_id_period_year_period_month_system_idx" ON "monthly_salaries"("company_id", "period_year", "period_month", "system_mode");

-- CreateIndex
CREATE UNIQUE INDEX "monthly_salary_period_emp_uidx" ON "monthly_salaries"("company_id", "period_year", "period_month", "employee_id", "system_mode");

-- CreateIndex
CREATE UNIQUE INDEX "remote_assignments_company_employee_dates_uidx" ON "remote_assignments"("company_id", "employee_id", "start_date", "end_date");

-- CreateIndex
CREATE UNIQUE INDEX "evaluations_company_id_evaluator_id_employee_id_period_mont_key" ON "evaluations"("company_id", "evaluator_id", "employee_id", "period_month", "period_year");

-- CreateIndex
CREATE INDEX "contact_requests_read_created_at_idx" ON "contact_requests"("read", "created_at");

-- CreateIndex
CREATE UNIQUE INDEX "job_offer_templates_company_id_key" ON "job_offer_templates"("company_id");

-- CreateIndex
CREATE UNIQUE INDEX "password_reset_tokens_token_key" ON "password_reset_tokens"("token");

-- CreateIndex
CREATE INDEX "password_reset_tokens_token_idx" ON "password_reset_tokens"("token");

-- CreateIndex
CREATE INDEX "notifications_company_id_read_created_at_idx" ON "notifications"("company_id", "read", "created_at");

-- CreateIndex
CREATE INDEX "messages_company_id_sender_id_receiver_id_created_at_idx" ON "messages"("company_id", "sender_id", "receiver_id", "created_at");

-- CreateIndex
CREATE INDEX "messages_company_id_receiver_id_read_idx" ON "messages"("company_id", "receiver_id", "read");

-- CreateIndex
CREATE INDEX "request_types_company_id_active_idx" ON "request_types"("company_id", "active");

-- CreateIndex
CREATE INDEX "custom_requests_company_id_status_idx" ON "custom_requests"("company_id", "status");

-- AddForeignKey
ALTER TABLE "audit_logs" ADD CONSTRAINT "audit_logs_company_id_fkey" FOREIGN KEY ("company_id") REFERENCES "companies"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "users" ADD CONSTRAINT "users_company_id_fkey" FOREIGN KEY ("company_id") REFERENCES "companies"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "company_settings" ADD CONSTRAINT "company_settings_company_id_fkey" FOREIGN KEY ("company_id") REFERENCES "companies"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "employees" ADD CONSTRAINT "employees_company_id_fkey" FOREIGN KEY ("company_id") REFERENCES "companies"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "employees" ADD CONSTRAINT "employees_supervisor_id_fkey" FOREIGN KEY ("supervisor_id") REFERENCES "employees"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "employee_documents" ADD CONSTRAINT "employee_documents_company_id_fkey" FOREIGN KEY ("company_id") REFERENCES "companies"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "attendance_records" ADD CONSTRAINT "attendance_records_company_id_fkey" FOREIGN KEY ("company_id") REFERENCES "companies"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "payroll_records" ADD CONSTRAINT "payroll_records_company_id_fkey" FOREIGN KEY ("company_id") REFERENCES "companies"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "bonuses_deductions" ADD CONSTRAINT "bonuses_deductions_company_id_fkey" FOREIGN KEY ("company_id") REFERENCES "companies"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "uploaded_files" ADD CONSTRAINT "uploaded_files_company_id_fkey" FOREIGN KEY ("company_id") REFERENCES "companies"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "leave_requests" ADD CONSTRAINT "leave_requests_company_id_fkey" FOREIGN KEY ("company_id") REFERENCES "companies"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "leave_balances" ADD CONSTRAINT "leave_balances_company_id_fkey" FOREIGN KEY ("company_id") REFERENCES "companies"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "official_holidays" ADD CONSTRAINT "official_holidays_company_id_fkey" FOREIGN KEY ("company_id") REFERENCES "companies"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "tasks" ADD CONSTRAINT "tasks_company_id_fkey" FOREIGN KEY ("company_id") REFERENCES "companies"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "remote_assignments" ADD CONSTRAINT "remote_assignments_company_id_fkey" FOREIGN KEY ("company_id") REFERENCES "companies"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "evaluations" ADD CONSTRAINT "evaluations_company_id_fkey" FOREIGN KEY ("company_id") REFERENCES "companies"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "evaluations" ADD CONSTRAINT "evaluations_evaluator_id_fkey" FOREIGN KEY ("evaluator_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "announcements" ADD CONSTRAINT "announcements_company_id_fkey" FOREIGN KEY ("company_id") REFERENCES "companies"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "notifications" ADD CONSTRAINT "notifications_company_id_fkey" FOREIGN KEY ("company_id") REFERENCES "companies"("id") ON DELETE CASCADE ON UPDATE CASCADE;
