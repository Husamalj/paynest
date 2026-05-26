const pool = require('./index');

async function runMigrations() {
  const client = await pool.connect();
  try {
    await client.query(`
      CREATE TABLE IF NOT EXISTS company_settings (
        id SERIAL PRIMARY KEY,
        company_name VARCHAR(255) DEFAULT 'PayNest',
        system_mode VARCHAR(20) DEFAULT 'daily',
        language VARCHAR(10) DEFAULT 'ar',
        req_hours DECIMAL DEFAULT 8,
        month_days INTEGER DEFAULT 26,
        late_tolerance INTEGER DEFAULT 0,
        workdays VARCHAR(50) DEFAULT 'Sun,Mon,Tue,Wed,Thu',
        deduction_rate DECIMAL DEFAULT 1.0,
        extra_rate DECIMAL DEFAULT 1.0,
        created_at TIMESTAMP DEFAULT NOW()
      );
    `);

    await client.query(`
      CREATE TABLE IF NOT EXISTS employees (
        id SERIAL PRIMARY KEY,
        employee_id VARCHAR(50),
        name VARCHAR(255) NOT NULL,
        base_salary DECIMAL DEFAULT 0,
        social_security BOOLEAN DEFAULT FALSE,
        remote_days INTEGER DEFAULT 0,
        system_mode VARCHAR(20) DEFAULT 'daily',
        created_at TIMESTAMP DEFAULT NOW(),
        updated_at TIMESTAMP DEFAULT NOW()
      );
    `);

    await client.query(`
      CREATE TABLE IF NOT EXISTS attendance_records (
        id SERIAL PRIMARY KEY,
        employee_id VARCHAR(50),
        work_date DATE,
        clock_in TIME,
        clock_out TIME,
        hours_worked DECIMAL DEFAULT 0,
        upload_batch VARCHAR(100),
        system_mode VARCHAR(20) DEFAULT 'daily',
        created_at TIMESTAMP DEFAULT NOW()
      );
    `);

    await client.query(`
      CREATE TABLE IF NOT EXISTS payroll_records (
        id SERIAL PRIMARY KEY,
        employee_id VARCHAR(50),
        period_month INTEGER,
        period_year INTEGER,
        base_salary DECIMAL,
        total_hours DECIMAL,
        required_hours DECIMAL,
        hour_diff DECIMAL,
        adjustment DECIMAL,
        social_security_deduct DECIMAL DEFAULT 0,
        bonus_total DECIMAL DEFAULT 0,
        deduction_total DECIMAL DEFAULT 0,
        net_salary DECIMAL,
        status VARCHAR(50),
        daily_breakdown JSONB,
        system_mode VARCHAR(20) DEFAULT 'daily',
        calculated_at TIMESTAMP DEFAULT NOW()
      );
    `);

    await client.query(`
      CREATE TABLE IF NOT EXISTS bonuses_deductions (
        id SERIAL PRIMARY KEY,
        employee_id VARCHAR(50),
        employee_name VARCHAR(255),
        type VARCHAR(50),
        reason VARCHAR(255),
        amount DECIMAL,
        period_month INTEGER,
        period_year INTEGER,
        system_mode VARCHAR(20) DEFAULT 'daily',
        created_at TIMESTAMP DEFAULT NOW()
      );
    `);

    await client.query(`
      CREATE TABLE IF NOT EXISTS uploaded_files (
        id SERIAL PRIMARY KEY,
        filename VARCHAR(255),
        original_name VARCHAR(255),
        file_type VARCHAR(50),
        upload_batch VARCHAR(100),
        row_count INTEGER,
        employee_count INTEGER DEFAULT 0,
        system_mode VARCHAR(20) DEFAULT 'daily',
        created_at TIMESTAMP DEFAULT NOW()
      );
    `);

    await client.query(`
      CREATE TABLE IF NOT EXISTS leave_requests (
        id SERIAL PRIMARY KEY,
        employee_id VARCHAR(50),
        employee_name VARCHAR(255),
        leave_type VARCHAR(50),
        start_date DATE,
        end_date DATE,
        days_count INTEGER,
        reason TEXT,
        status VARCHAR(20) DEFAULT 'pending',
        admin_note TEXT,
        created_at TIMESTAMP DEFAULT NOW(),
        updated_at TIMESTAMP DEFAULT NOW()
      );
    `);

    await client.query(`
      CREATE TABLE IF NOT EXISTS leave_balances (
        id SERIAL PRIMARY KEY,
        employee_id VARCHAR(50),
        year INTEGER,
        annual_total INTEGER DEFAULT 14,
        annual_used INTEGER DEFAULT 0,
        sick_total INTEGER DEFAULT 14,
        sick_used INTEGER DEFAULT 0,
        UNIQUE(employee_id, year)
      );
    `);

    await client.query(`
      CREATE TABLE IF NOT EXISTS official_holidays (
        id SERIAL PRIMARY KEY,
        name VARCHAR(255),
        holiday_date DATE UNIQUE,
        created_at TIMESTAMP DEFAULT NOW()
      );
    `);

    await client.query(`
      CREATE TABLE IF NOT EXISTS tasks (
        id SERIAL PRIMARY KEY,
        task_name VARCHAR(255) NOT NULL,
        employee_id VARCHAR(50),
        deadline DATE,
        status VARCHAR(50) DEFAULT 'pending',
        system_mode VARCHAR(20) DEFAULT 'daily',
        created_at TIMESTAMP DEFAULT NOW(),
        updated_at TIMESTAMP DEFAULT NOW()
      );
    `);

    await client.query(`
      CREATE TABLE IF NOT EXISTS remote_assignments (
        id SERIAL PRIMARY KEY,
        employee_id VARCHAR(50) NOT NULL,
        start_date DATE NOT NULL,
        end_date DATE NOT NULL,
        note TEXT,
        created_at TIMESTAMP DEFAULT NOW()
      );
    `);

    await client.query(`
      CREATE TABLE IF NOT EXISTS announcements (
        id SERIAL PRIMARY KEY,
        title VARCHAR(255) NOT NULL,
        message TEXT NOT NULL,
        published BOOLEAN DEFAULT FALSE,
        visible_to_employees BOOLEAN DEFAULT TRUE,
        created_at TIMESTAMP DEFAULT NOW(),
        updated_at TIMESTAMP DEFAULT NOW()
      );
    `);

    // ---- Evaluations table ----
    await client.query(`
      CREATE TABLE IF NOT EXISTS evaluations (
        id               SERIAL PRIMARY KEY,
        company_id       INTEGER NOT NULL DEFAULT 1,
        evaluator_id     INTEGER NOT NULL,
        employee_id      VARCHAR(50) NOT NULL,
        period_month     INTEGER NOT NULL,
        period_year      INTEGER NOT NULL,
        score_accuracy          SMALLINT CHECK (score_accuracy BETWEEN 1 AND 5),
        score_innovation        SMALLINT CHECK (score_innovation BETWEEN 1 AND 5),
        score_speed             SMALLINT CHECK (score_speed BETWEEN 1 AND 5),
        score_development       SMALLINT CHECK (score_development BETWEEN 1 AND 5),
        score_quality_check     SMALLINT CHECK (score_quality_check BETWEEN 1 AND 5),
        score_prioritization    SMALLINT CHECK (score_prioritization BETWEEN 1 AND 5),
        score_independence      SMALLINT CHECK (score_independence BETWEEN 1 AND 5),
        score_deadlines         SMALLINT CHECK (score_deadlines BETWEEN 1 AND 5),
        score_teamwork          SMALLINT CHECK (score_teamwork BETWEEN 1 AND 5),
        score_communication     SMALLINT CHECK (score_communication BETWEEN 1 AND 5),
        score_knowledge_sharing SMALLINT CHECK (score_knowledge_sharing BETWEEN 1 AND 5),
        score_feedback          SMALLINT CHECK (score_feedback BETWEEN 1 AND 5),
        score_compliance        SMALLINT CHECK (score_compliance BETWEEN 1 AND 5),
        bonus_worthy     BOOLEAN DEFAULT FALSE,
        recommendations  TEXT,
        created_at       TIMESTAMP DEFAULT NOW(),
        updated_at       TIMESTAMP DEFAULT NOW(),
        UNIQUE (company_id, evaluator_id, employee_id, period_month, period_year)
      );
    `);

    // ---- ALTER: ensure system_mode column exists on existing installs ----
    await client.query(`
  CREATE TABLE IF NOT EXISTS companies (
    id SERIAL PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    slug VARCHAR(100) UNIQUE NOT NULL,
    created_at TIMESTAMP DEFAULT NOW()
  );
`);

    await client.query(`
  CREATE TABLE IF NOT EXISTS users (
    id SERIAL PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    employee_number VARCHAR(50),
    password VARCHAR(255) NOT NULL,
    role VARCHAR(20) NOT NULL,
    company_id INTEGER REFERENCES companies(id),
    created_at TIMESTAMP DEFAULT NOW()
  );
`);
    const alters = [
      `ALTER TABLE employees ADD COLUMN IF NOT EXISTS email VARCHAR(255) DEFAULT ''`,
      `ALTER TABLE users ADD COLUMN IF NOT EXISTS email VARCHAR(255)`,
      `ALTER TABLE users ADD COLUMN IF NOT EXISTS is_active BOOLEAN DEFAULT TRUE`,
      `ALTER TABLE employees ADD COLUMN IF NOT EXISTS system_mode VARCHAR(20) DEFAULT 'daily'`,
      `ALTER TABLE employees ADD COLUMN IF NOT EXISTS religion VARCHAR(50) DEFAULT ''`,
      `ALTER TABLE attendance_records ADD COLUMN IF NOT EXISTS system_mode VARCHAR(20) DEFAULT 'daily'`,
      `ALTER TABLE payroll_records ADD COLUMN IF NOT EXISTS system_mode VARCHAR(20) DEFAULT 'daily'`,
      `ALTER TABLE bonuses_deductions ADD COLUMN IF NOT EXISTS system_mode VARCHAR(20) DEFAULT 'daily'`,
      `ALTER TABLE uploaded_files ADD COLUMN IF NOT EXISTS system_mode VARCHAR(20) DEFAULT 'daily'`,
      `ALTER TABLE uploaded_files ADD COLUMN IF NOT EXISTS employee_count INTEGER DEFAULT 0`,
      `ALTER TABLE company_settings ADD COLUMN IF NOT EXISTS company_id INTEGER DEFAULT 1`,
      `ALTER TABLE employees ADD COLUMN IF NOT EXISTS company_id INTEGER DEFAULT 1`,
      `ALTER TABLE attendance_records ADD COLUMN IF NOT EXISTS company_id INTEGER DEFAULT 1`,
      `ALTER TABLE payroll_records ADD COLUMN IF NOT EXISTS company_id INTEGER DEFAULT 1`,
      `ALTER TABLE bonuses_deductions ADD COLUMN IF NOT EXISTS company_id INTEGER DEFAULT 1`,
      `ALTER TABLE uploaded_files ADD COLUMN IF NOT EXISTS company_id INTEGER DEFAULT 1`,
      `ALTER TABLE leave_requests ADD COLUMN IF NOT EXISTS company_id INTEGER DEFAULT 1`,
      `ALTER TABLE leave_balances ADD COLUMN IF NOT EXISTS company_id INTEGER DEFAULT 1`,
      `ALTER TABLE official_holidays ADD COLUMN IF NOT EXISTS company_id INTEGER DEFAULT 1`,
      `ALTER TABLE tasks ADD COLUMN IF NOT EXISTS company_id INTEGER DEFAULT 1`,
      `ALTER TABLE remote_assignments ADD COLUMN IF NOT EXISTS company_id INTEGER DEFAULT 1`,
      `ALTER TABLE announcements ADD COLUMN IF NOT EXISTS company_id INTEGER DEFAULT 1`,
      `ALTER TABLE companies ADD COLUMN IF NOT EXISTS status VARCHAR(20) DEFAULT 'active'`,
      `ALTER TABLE companies ADD COLUMN IF NOT EXISTS is_active BOOLEAN DEFAULT TRUE`,
      `ALTER TABLE employees ADD COLUMN IF NOT EXISTS supervisor_user_id INTEGER REFERENCES users(id)`,
    ];
    for (const sql of alters) {
      try {
        await client.query(sql);
      } catch (e) {
        // Ignore — column may already exist
      }
    }

    // Add label column to remote_assignments if missing
    try {
      await client.query(`ALTER TABLE remote_assignments ADD COLUMN IF NOT EXISTS label VARCHAR(255)`);
    } catch (e) {
      // ignore
    }

    // Deduplicate existing exact-duplicate remote assignments (keep lowest id)
    try {
      await client.query(`
        DELETE FROM remote_assignments a
        USING remote_assignments b
        WHERE a.id > b.id
          AND a.employee_id = b.employee_id
          AND a.start_date = b.start_date
          AND a.end_date = b.end_date
      `);
    } catch (e) {
      // ignore
    }

    // Ensure uniqueness for exact remote assignments (employee + start + end)
    try {
      await client.query(`CREATE UNIQUE INDEX IF NOT EXISTS remote_assignments_unique_idx ON remote_assignments (employee_id, start_date, end_date)`);
    } catch (e) {
      // ignore
    }

    // Drop & recreate the unique constraint on employees so it is (employee_id, system_mode)
    try {
      await client.query(`ALTER TABLE employees DROP CONSTRAINT IF EXISTS employees_employee_id_key`);
    } catch (e) { }
    try {
      await client.query(
        `CREATE UNIQUE INDEX IF NOT EXISTS employees_emp_mode_uidx
         ON employees (employee_id, system_mode)`
      );
    } catch (e) { }

    // Insert default settings if none exist
    const settingsCheck = await client.query('SELECT id FROM company_settings LIMIT 1');
    if (settingsCheck.rows.length === 0) {
      await client.query(`
        INSERT INTO company_settings (company_name, system_mode, language, req_hours, month_days, late_tolerance, workdays, deduction_rate, extra_rate)
        VALUES ('PayNest', 'daily', 'ar', 8, 26, 0, 'Sun,Mon,Tue,Wed,Thu', 1.0, 1.0)
      `);
    }

    console.log('Database migrations completed successfully');
  } catch (err) {
    console.error('Migration error:', err);
    throw err;
  } finally {
    client.release();
  }
}

module.exports = { runMigrations };
