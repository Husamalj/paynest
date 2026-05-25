const express = require('express');
const router = express.Router();
const pool = require('../db/index');
const bcrypt = require('bcryptjs');
const { requireAuth, requireRole } = require('../middleware/auth');

function getCompanyId(req) {
  return req.user?.companyId || 1;
}

async function getSystemMode(companyId) {
  const r = await pool.query(
    'SELECT system_mode FROM company_settings WHERE company_id = $1 ORDER BY id LIMIT 1',
    [companyId]
  );

  return r.rows[0]?.system_mode || 'daily';
}

// GET /api/employees
router.get('/', requireAuth, requireRole('owner', 'hr'), async (req, res) => {
  try {
    const companyId = getCompanyId(req);
    const mode = await getSystemMode(companyId);

    const result = await pool.query(
      `SELECT *
       FROM employees
       WHERE (system_mode = $1 OR system_mode IS NULL)
         AND company_id = $2
       ORDER BY name ASC`,
      [mode, companyId]
    );

    res.json(result.rows);
  } catch (err) {
    console.error('GET /api/employees error:', err);
    res.status(500).json({ error: err.message });
  }
});
// GET /api/employees/me
router.get('/me', requireAuth, requireRole('employee'), async (req, res) => {
  try {
    const companyId = getCompanyId(req);
    const mode = await getSystemMode(companyId);
    const employeeId = req.user.employeeNumber;

    if (!employeeId) {
      return res.status(404).json({ error: 'Employee number not found' });
    }

    const result = await pool.query(
      `SELECT *
       FROM employees
       WHERE employee_id = $1
         AND (system_mode = $2 OR system_mode IS NULL)
         AND company_id = $3
       LIMIT 1`,
      [employeeId, mode, companyId]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Employee not found' });
    }

    res.json(result.rows[0]);
  } catch (err) {
    console.error('GET /api/employees/me error:', err);
    res.status(500).json({ error: err.message });
  }
});
// GET /api/employees/:id
router.get('/:id', requireAuth, requireRole('owner', 'hr'), async (req, res) => {
  try {
    const companyId = getCompanyId(req);
    const mode = await getSystemMode(companyId);

    const result = await pool.query(
      `SELECT *
       FROM employees
       WHERE employee_id = $1
         AND (system_mode = $2 OR system_mode IS NULL)
         AND company_id = $3
       LIMIT 1`,
      [req.params.id, mode, companyId]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Employee not found' });
    }

    res.json(result.rows[0]);
  } catch (err) {
    console.error('GET /api/employees/:id error:', err);
    res.status(500).json({ error: err.message });
  }
});

// PUT /api/employees/:id
router.put('/:id', requireAuth, requireRole('owner', 'hr'), async (req, res) => {
  const { name, email, base_salary, social_security, remote_days, religion } = req.body;

  try {
    const companyId = getCompanyId(req);
    const mode = await getSystemMode(companyId);

    const fields = [];
    const values = [];
    let idx = 1;

    if (name !== undefined) {
      fields.push(`name = $${idx++}`);
      values.push(name);
    }

    if (email !== undefined) {
      fields.push(`email = $${idx++}`);
      values.push(email || '');
    }

    if (base_salary !== undefined) {
      fields.push(`base_salary = $${idx++}`);
      values.push(Number(base_salary) || 0);
    }

    if (social_security !== undefined) {
      fields.push(`social_security = $${idx++}`);
      values.push(social_security);
    }

    if (remote_days !== undefined) {
      fields.push(`remote_days = $${idx++}`);
      values.push(remote_days);
    }

    if (religion !== undefined) {
      fields.push(`religion = $${idx++}`);
      values.push(religion || '');
    }

    fields.push(`company_id = $${idx++}`);
    values.push(companyId);

    fields.push(`updated_at = NOW()`);

    values.push(req.params.id);
    values.push(mode);
    values.push(companyId);

    const result = await pool.query(
      `UPDATE employees
       SET ${fields.join(', ')}
       WHERE employee_id = $${idx}
         AND (system_mode = $${idx + 1} OR system_mode IS NULL)
         AND company_id = $${idx + 2}
       RETURNING *`,
      values
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Employee not found' });
    }

    if (email !== undefined) {
      await pool.query(
        `
        UPDATE users
        SET name = COALESCE($1, name),
            email = COALESCE(NULLIF($2, ''), email),
            employee_number = $3,
            company_id = $4
        WHERE employee_number = $3
          AND company_id = $4
          AND role = 'employee'
        `,
        [name || null, email || '', req.params.id, companyId]
      );
    }

    res.json(result.rows[0]);
  } catch (err) {
    console.error('PUT /api/employees/:id error:', err);
    res.status(500).json({ error: err.message });
  }
});

// POST /api/employees
router.post('/', requireAuth, requireRole('owner', 'hr'), async (req, res) => {
  const { employee_id, name, email, base_salary, social_security, religion } = req.body;

  try {
    const companyId = getCompanyId(req);
    const mode = await getSystemMode(companyId);

    const result = await pool.query(
      `INSERT INTO employees (
         employee_id,
         name,
         email,
         base_salary,
         social_security,
         religion,
         system_mode,
         company_id
       )
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
       ON CONFLICT (employee_id, system_mode) DO UPDATE SET
         name = EXCLUDED.name,
         email = EXCLUDED.email,
         base_salary = EXCLUDED.base_salary,
         social_security = EXCLUDED.social_security,
         religion = EXCLUDED.religion,
         company_id = EXCLUDED.company_id,
         updated_at = NOW()
       RETURNING *`,
      [
        employee_id,
        name,
        email || '',
        Number(base_salary) || 0,
        social_security || false,
        religion || '',
        mode,
        companyId,
      ]
    );

    if (email) {
      const existingUser = await pool.query(
        'SELECT id FROM users WHERE email = $1',
        [email]
      );

      if (existingUser.rows.length === 0) {
        const hashedPassword = await bcrypt.hash('123456', 10);

        await pool.query(
          `
          INSERT INTO users (
            name,
            email,
            password,
            role,
            company_id,
            employee_number,
            must_change_password
          )
          VALUES ($1, $2, $3, $4, $5, $6, $7)
          `,
          [
            name,
            email,
            hashedPassword,
            'employee',
            companyId,
            employee_id,
            true,
          ]
        );
      } else {
        await pool.query(
          `
          UPDATE users
          SET employee_number = $1,
              company_id = $2,
              role = 'employee'
          WHERE email = $3
          `,
          [employee_id, companyId, email]
        );
      }
    }

    res.json(result.rows[0]);
  } catch (err) {
    console.error('POST /api/employees error:', err);
    res.status(500).json({ error: err.message });
  }
});

// DELETE /api/employees/:id
router.delete('/:id', requireAuth, requireRole('owner', 'hr'), async (req, res) => {
  try {
    const companyId = getCompanyId(req);
    const mode = await getSystemMode(companyId);

    await pool.query(
      `DELETE FROM users
       WHERE employee_number = $1
         AND company_id = $2
         AND role = 'employee'`,
      [req.params.id, companyId]
    );

    await pool.query(
      `DELETE FROM employees
       WHERE employee_id = $1
         AND system_mode = $2
         AND company_id = $3`,
      [req.params.id, mode, companyId]
    );

    res.json({ success: true });
  } catch (err) {
    console.error('DELETE /api/employees/:id error:', err);
    res.status(500).json({ error: err.message });
  }
});

// GET /api/employees/:id/remote_assignments
router.get(
  '/:id/remote_assignments',
  requireAuth,
  requireRole('owner', 'hr'),
  async (req, res) => {
    try {
      const companyId = getCompanyId(req);

      const result = await pool.query(
        `SELECT *
         FROM remote_assignments
         WHERE employee_id = $1
           AND company_id = $2
         ORDER BY start_date DESC`,
        [req.params.id, companyId]
      );

      res.json(result.rows);
    } catch (err) {
      console.error('GET /api/employees/:id/remote_assignments error:', err);
      res.status(500).json({ error: err.message });
    }
  }
);

// POST /api/employees/:id/remote_assignments
router.post(
  '/:id/remote_assignments',
  requireAuth,
  requireRole('owner', 'hr'),
  async (req, res) => {
    const { start_date, end_date, note, label } = req.body;

    try {
      const companyId = getCompanyId(req);

      const existing = await pool.query(
        `SELECT *
         FROM remote_assignments
         WHERE employee_id = $1
           AND start_date = $2
           AND end_date = $3
           AND company_id = $4
         LIMIT 1`,
        [req.params.id, start_date, end_date, companyId]
      );

      if (existing.rows.length > 0) {
        return res.json(existing.rows[0]);
      }

      const result = await pool.query(
        `INSERT INTO remote_assignments (
           employee_id,
           start_date,
           end_date,
           note,
           label,
           company_id
         )
         VALUES ($1, $2, $3, $4, $5, $6)
         RETURNING *`,
        [
          req.params.id,
          start_date,
          end_date,
          note || null,
          label || null,
          companyId,
        ]
      );

      res.json(result.rows[0]);
    } catch (err) {
      console.error('POST /api/employees/:id/remote_assignments error:', err);
      res.status(500).json({ error: err.message });
    }
  }
);

// DELETE /api/employees/:id/remote_assignments/:rid
router.delete(
  '/:id/remote_assignments/:rid',
  requireAuth,
  requireRole('owner', 'hr'),
  async (req, res) => {
    try {
      const companyId = getCompanyId(req);

      await pool.query(
        `DELETE FROM remote_assignments
         WHERE id = $1
           AND employee_id = $2
           AND company_id = $3`,
        [req.params.rid, req.params.id, companyId]
      );

      res.json({ success: true });
    } catch (err) {
      console.error('DELETE /api/employees/:id/remote_assignments/:rid error:', err);
      res.status(500).json({ error: err.message });
    }
  }
);

module.exports = router;