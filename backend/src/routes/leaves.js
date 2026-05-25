const express = require('express');
const router = express.Router();
const pool = require('../db/index');
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

// GET /api/leaves
router.get('/', requireAuth, requireRole('owner', 'hr', 'employee'), async (req, res) => {
  const { status, employee_id } = req.query;

  try {
    const companyId = getCompanyId(req);

    let query = 'SELECT * FROM leave_requests WHERE company_id = $1';
    const values = [companyId];
    let idx = 2;

    if (req.user.role === 'employee') {
      query += ` AND employee_id = $${idx++}`;
      values.push(req.user.employeeNumber);
    } else if (employee_id) {
      query += ` AND employee_id = $${idx++}`;
      values.push(employee_id);
    }

    if (status) {
      query += ` AND status = $${idx++}`;
      values.push(status);
    }

    query += ' ORDER BY created_at DESC';

    const result = await pool.query(query, values);
    res.json(result.rows);
  } catch (err) {
    console.error('GET /api/leaves error:', err);
    res.status(500).json({ error: err.message });
  }
});

// POST /api/leaves
router.post('/', requireAuth, requireRole('owner', 'hr', 'employee'), async (req, res) => {
  const {
    employee_id,
    employee_name,
    leave_type,
    start_date,
    end_date,
    days_count,
    reason,
  } = req.body;

  try {
    const companyId = getCompanyId(req);

    let finalEmployeeId = employee_id;
    let finalEmployeeName = employee_name;

    if (req.user.role === 'employee') {
      finalEmployeeId = req.user.employeeNumber;
      finalEmployeeName = req.user.name;
    }

    if (!finalEmployeeId || !leave_type || !start_date || !end_date) {
      return res.status(400).json({ error: 'Missing required fields' });
    }

    const result = await pool.query(
      `INSERT INTO leave_requests (
        employee_id,
        employee_name,
        leave_type,
        start_date,
        end_date,
        days_count,
        reason,
        company_id
      )
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
      RETURNING *`,
      [
        finalEmployeeId,
        finalEmployeeName || finalEmployeeId,
        leave_type,
        start_date,
        end_date,
        days_count,
        reason,
        companyId,
      ]
    );

    res.json(result.rows[0]);
  } catch (err) {
    console.error('POST /api/leaves error:', err);
    res.status(500).json({ error: err.message });
  }
});

// PUT /api/leaves/:id
router.put('/:id', requireAuth, requireRole('owner', 'hr'), async (req, res) => {
  const { status, admin_note } = req.body;

  try {
    const companyId = getCompanyId(req);

    const result = await pool.query(
      `UPDATE leave_requests
       SET status = $1, admin_note = $2, updated_at = NOW()
       WHERE id = $3
         AND company_id = $4
       RETURNING *`,
      [status, admin_note || null, req.params.id, companyId]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Leave request not found' });
    }

    const leave = result.rows[0];

    if (status === 'approved') {
      const leaveYear = new Date(leave.start_date).getFullYear();

      if (leave.leave_type === 'annual') {
        await pool.query(
          `INSERT INTO leave_balances (employee_id, year, annual_used, company_id)
           VALUES ($1, $2, $3, $4)
           ON CONFLICT (employee_id, year) DO UPDATE
           SET annual_used = COALESCE(leave_balances.annual_used, 0) + $3,
               company_id = $4`,
          [leave.employee_id, leaveYear, leave.days_count, companyId]
        );
      } else if (leave.leave_type === 'sick') {
        await pool.query(
          `INSERT INTO leave_balances (employee_id, year, sick_used, company_id)
           VALUES ($1, $2, $3, $4)
           ON CONFLICT (employee_id, year) DO UPDATE
           SET sick_used = COALESCE(leave_balances.sick_used, 0) + $3,
               company_id = $4`,
          [leave.employee_id, leaveYear, leave.days_count, companyId]
        );
      }
    }

    res.json(result.rows[0]);
  } catch (err) {
    console.error('PUT /api/leaves/:id error:', err);
    res.status(500).json({ error: err.message });
  }
});

// DELETE /api/leaves/:id
router.delete('/:id', requireAuth, requireRole('owner', 'hr'), async (req, res) => {
  const { id } = req.params;
  const client = await pool.connect();

  try {
    const companyId = getCompanyId(req);

    await client.query('BEGIN');

    const leaveResult = await client.query(
      'SELECT * FROM leave_requests WHERE id = $1 AND company_id = $2',
      [id, companyId]
    );

    if (leaveResult.rows.length === 0) {
      await client.query('ROLLBACK');
      return res.status(404).json({ error: 'Leave request not found' });
    }

    const leave = leaveResult.rows[0];

    if (leave.status === 'approved') {
      const leaveYear = new Date(leave.start_date).getFullYear();
      const days = parseInt(leave.days_count || 0, 10);

      if (leave.leave_type === 'annual') {
        await client.query(
          `UPDATE leave_balances
           SET annual_used = GREATEST(COALESCE(annual_used, 0) - $3, 0)
           WHERE employee_id = $1
             AND year = $2
             AND company_id = $4`,
          [leave.employee_id, leaveYear, days, companyId]
        );
      } else if (leave.leave_type === 'sick') {
        await client.query(
          `UPDATE leave_balances
           SET sick_used = GREATEST(COALESCE(sick_used, 0) - $3, 0)
           WHERE employee_id = $1
             AND year = $2
             AND company_id = $4`,
          [leave.employee_id, leaveYear, days, companyId]
        );
      }
    }

    await client.query(
      'DELETE FROM leave_requests WHERE id = $1 AND company_id = $2',
      [id, companyId]
    );

    await client.query('COMMIT');
    res.json({ success: true });
  } catch (err) {
    await client.query('ROLLBACK');
    console.error('DELETE /api/leaves/:id error:', err);
    res.status(500).json({ error: err.message });
  } finally {
    client.release();
  }
});

// GET /api/leaves/balances
router.get('/balances', requireAuth, requireRole('owner', 'hr', 'employee'), async (req, res) => {
  const { year } = req.query;
  const targetYear = year || new Date().getFullYear();

  try {
    const companyId = getCompanyId(req);
    const mode = await getSystemMode(companyId);

    const values = [targetYear, mode, companyId];
    let employeeFilter = '';

    if (req.user.role === 'employee') {
      employeeFilter = ' AND emp.employee_id = $4';
      values.push(req.user.employeeNumber);
    }

    const result = await pool.query(
      `WITH emp AS (
         SELECT DISTINCT ON (employee_id) employee_id, name
         FROM employees
         WHERE (system_mode = $2 OR system_mode IS NULL)
           AND company_id = $3
           AND base_salary >= 0
           AND employee_id IS NOT NULL
           AND employee_id <> ''
         ORDER BY employee_id, updated_at DESC, id DESC
       ),
       lb AS (
         SELECT employee_id, year,
                MAX(annual_total) as annual_total,
                SUM(annual_used) as annual_used,
                MAX(sick_total) as sick_total,
                SUM(sick_used) as sick_used
         FROM leave_balances
         WHERE year = $1
           AND company_id = $3
         GROUP BY employee_id, year
       )
       SELECT emp.employee_id, emp.name,
              COALESCE(lb.annual_total, 14) as annual_total,
              COALESCE(lb.annual_used, 0) as annual_used,
              COALESCE(lb.sick_total, 14) as sick_total,
              COALESCE(lb.sick_used, 0) as sick_used,
              COALESCE(lb.annual_total, 14) - COALESCE(lb.annual_used, 0) as annual_remaining,
              COALESCE(lb.sick_total, 14) - COALESCE(lb.sick_used, 0) as sick_remaining
       FROM emp
       LEFT JOIN lb ON emp.employee_id = lb.employee_id
       WHERE 1 = 1
       ${employeeFilter}
       ORDER BY emp.name ASC`,
      values
    );

    res.json(result.rows);
  } catch (err) {
    console.error('GET /api/leaves/balances error:', err);
    res.status(500).json({ error: err.message });
  }
});

// GET /api/leaves/holidays
router.get('/holidays', requireAuth, requireRole('owner', 'hr', 'employee'), async (req, res) => {
  try {
    const result = await pool.query(
      'SELECT * FROM official_holidays ORDER BY holiday_date ASC'
    );

    res.json(result.rows);
  } catch (err) {
    console.error('GET /api/holidays error:', err);
    res.status(500).json({ error: err.message });
  }
});

// POST /api/leaves/holidays
router.post('/holidays', requireAuth, requireRole('owner', 'hr'), async (req, res) => {
  const { name, holiday_date } = req.body;

  try {
    const result = await pool.query(
      `INSERT INTO official_holidays (name, holiday_date)
       VALUES ($1, $2)
       ON CONFLICT (holiday_date) DO UPDATE SET name = EXCLUDED.name
       RETURNING *`,
      [name, holiday_date]
    );

    res.json(result.rows[0]);
  } catch (err) {
    console.error('POST /api/holidays error:', err);
    res.status(500).json({ error: err.message });
  }
});

// DELETE /api/leaves/holidays/:id
router.delete('/holidays/:id', requireAuth, requireRole('owner', 'hr'), async (req, res) => {
  try {
    await pool.query('DELETE FROM official_holidays WHERE id = $1', [req.params.id]);
    res.json({ success: true });
  } catch (err) {
    console.error('DELETE /api/holidays/:id error:', err);
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;