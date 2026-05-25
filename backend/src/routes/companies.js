const express = require('express');
const router = express.Router();
const pool = require('../db/index');

function makeSlug(name) {
    return String(name || '')
        .trim()
        .toLowerCase()
        .replace(/\s+/g, '-')
        .replace(/[^a-z0-9\u0600-\u06FF-]/g, '');
}

// GET /api/companies
router.get('/', async (req, res) => {
    try {
        const result = await pool.query(`
  SELECT
    c.*,
    u.email AS owner_email,
    u.name AS owner_name
  FROM companies c
  LEFT JOIN users u
    ON u.company_id = c.id
   AND u.role = 'owner'
  ORDER BY c.id ASC
`);
        res.json(result.rows);
    } catch (err) {
        console.error('GET /api/companies error:', err);
        res.status(500).json({ error: err.message });
    }
});

// POST /api/companies
router.post('/', async (req, res) => {
    const {
        name,
        system_mode,
        language,
        req_hours,
        month_days,
        late_tolerance,
        workdays,
        deduction_rate,
        extra_rate,
    } = req.body;

    if (!name) {
        return res.status(400).json({ error: 'Company name is required' });
    }

    const client = await pool.connect();

    try {
        await client.query('BEGIN');

        const baseSlug = makeSlug(name) || `company-${Date.now()}`;

        const companyResult = await client.query(
            `INSERT INTO companies (name, slug)
       VALUES ($1, $2)
       RETURNING *`,
            [name, `${baseSlug}-${Date.now()}`]
        );

        const company = companyResult.rows[0];

        await client.query(
            `INSERT INTO company_settings (
         company_name,
         system_mode,
         language,
         req_hours,
         month_days,
         late_tolerance,
         workdays,
         deduction_rate,
         extra_rate,
         company_id
       )
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10)`,
            [
                name,
                system_mode || 'daily',
                language || 'ar',
                req_hours || 8,
                month_days || 26,
                late_tolerance || 0,
                workdays || 'Sun,Mon,Tue,Wed,Thu',
                deduction_rate || 1,
                extra_rate || 1,
                company.id,
            ]
        );

        await client.query('COMMIT');

        res.json({
            success: true,
            company,
        });
    } catch (err) {
        await client.query('ROLLBACK');
        console.error('POST /api/companies error:', err);
        res.status(500).json({ error: err.message });
    } finally {
        client.release();
    }
});
// DELETE /api/companies/:id
router.delete('/:id', async (req, res) => {
    const companyId = Number(req.params.id);

    if (!companyId) {
        return res.status(400).json({ error: 'Invalid company id' });
    }

    // حماية بسيطة: لا تحذف الشركة الأساسية رقم 1
    if (companyId === 1) {
        return res.status(400).json({ error: 'Cannot delete default company' });
    }

    const client = await pool.connect();

    try {
        await client.query('BEGIN');

        await client.query('DELETE FROM remote_assignments WHERE company_id = $1', [companyId]);
        await client.query('DELETE FROM announcements WHERE company_id = $1', [companyId]);
        await client.query('DELETE FROM tasks WHERE company_id = $1', [companyId]);
        await client.query('DELETE FROM official_holidays WHERE company_id = $1', [companyId]);
        await client.query('DELETE FROM leave_balances WHERE company_id = $1', [companyId]);
        await client.query('DELETE FROM leave_requests WHERE company_id = $1', [companyId]);
        await client.query('DELETE FROM uploaded_files WHERE company_id = $1', [companyId]);
        await client.query('DELETE FROM bonuses_deductions WHERE company_id = $1', [companyId]);
        await client.query('DELETE FROM payroll_records WHERE company_id = $1', [companyId]);
        await client.query('DELETE FROM attendance_records WHERE company_id = $1', [companyId]);
        await client.query('DELETE FROM employees WHERE company_id = $1', [companyId]);
        await client.query('DELETE FROM company_settings WHERE company_id = $1', [companyId]);
        await client.query('DELETE FROM users WHERE company_id = $1', [companyId]);
        await client.query('DELETE FROM companies WHERE id = $1', [companyId]);

        await client.query('COMMIT');

        res.json({ success: true });
    } catch (err) {
        await client.query('ROLLBACK');
        console.error('DELETE /api/companies/:id error:', err);
        res.status(500).json({ error: err.message });
    } finally {
        client.release();
    }
});
// PATCH /api/companies/:id/toggle-status
router.patch('/:id/toggle-status', async (req, res) => {
    const companyId = Number(req.params.id);

    if (!companyId) {
        return res.status(400).json({ error: 'Invalid company id' });
    }

    try {
        const result = await pool.query(
            `
      UPDATE companies
      SET is_active = NOT COALESCE(is_active, true)
      WHERE id = $1
      RETURNING *
      `,
            [companyId]
        );

        if (result.rows.length === 0) {
            return res.status(404).json({ error: 'Company not found' });
        }

        res.json(result.rows[0]);
    } catch (err) {
        console.error('PATCH /api/companies/:id/toggle-status error:', err);
        res.status(500).json({ error: err.message });
    }
});
module.exports = router;
