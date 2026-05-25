const express = require('express');
const router = express.Router();
const pool = require('../db/index');
const { requireAuth, requireRole } = require('../middleware/auth');

function getCompanyId(req) {
  return req.user?.companyId || 1;
}

// GET /api/settings
router.get('/', requireAuth, async (req, res) => {
  try {
    const companyId = getCompanyId(req);

    const result = await pool.query(
      `SELECT *
       FROM company_settings
       WHERE company_id = $1
       ORDER BY id
       LIMIT 1`,
      [companyId]
    );

    if (result.rows.length === 0) {
      return res.json({
        id: null,
        company_name: 'PayNest',
        system_mode: 'daily',
        language: 'en',
        req_hours: 8,
        month_days: 26,
        late_tolerance: 0,
        workdays: 'Sun,Mon,Tue,Wed,Thu',
        deduction_rate: 1.0,
        extra_rate: 1.0,
        company_id: companyId,
      });
    }

    res.json(result.rows[0]);
  } catch (err) {
    console.error('GET /api/settings error:', err);
    res.status(500).json({ error: err.message });
  }
});

// PUT /api/settings
router.put('/', requireAuth, requireRole('owner'), async (req, res) => {
  const {
    company_name,
    system_mode,
    language,
    req_hours,
    month_days,
    late_tolerance,
    workdays,
    deduction_rate,
    extra_rate,
  } = req.body;

  try {
    const companyId = getCompanyId(req);

    const existing = await pool.query(
      `SELECT id
       FROM company_settings
       WHERE company_id = $1
       LIMIT 1`,
      [companyId]
    );

    if (existing.rows.length === 0) {
      const result = await pool.query(
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
        VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10)
        RETURNING *`,
        [
          company_name || 'PayNest',
          system_mode || 'daily',
          language || 'en',
          req_hours || 8,
          month_days || 26,
          late_tolerance || 0,
          workdays || 'Sun,Mon,Tue,Wed,Thu',
          deduction_rate || 1.0,
          extra_rate || 1.0,
          companyId,
        ]
      );

      return res.json(result.rows[0]);
    }

    const id = existing.rows[0].id;

    const fields = [];
    const values = [];
    let idx = 1;

    if (company_name !== undefined) {
      fields.push(`company_name = $${idx++}`);
      values.push(company_name);
    }

    if (system_mode !== undefined) {
      fields.push(`system_mode = $${idx++}`);
      values.push(system_mode);
    }

    if (language !== undefined) {
      fields.push(`language = $${idx++}`);
      values.push(language);
    }

    if (req_hours !== undefined) {
      fields.push(`req_hours = $${idx++}`);
      values.push(req_hours);
    }

    if (month_days !== undefined) {
      fields.push(`month_days = $${idx++}`);
      values.push(month_days);
    }

    if (late_tolerance !== undefined) {
      fields.push(`late_tolerance = $${idx++}`);
      values.push(late_tolerance);
    }

    if (workdays !== undefined) {
      fields.push(`workdays = $${idx++}`);
      values.push(workdays);
    }

    if (deduction_rate !== undefined) {
      fields.push(`deduction_rate = $${idx++}`);
      values.push(deduction_rate);
    }

    if (extra_rate !== undefined) {
      fields.push(`extra_rate = $${idx++}`);
      values.push(extra_rate);
    }

    if (fields.length === 0) {
      const current = await pool.query(
        'SELECT * FROM company_settings WHERE id = $1 AND company_id = $2',
        [id, companyId]
      );

      return res.json(current.rows[0]);
    }

    values.push(id);

    const result = await pool.query(
      `UPDATE company_settings
       SET ${fields.join(', ')}
       WHERE id = $${idx}
         AND company_id = $${idx + 1}
       RETURNING *`,
      [...values, companyId]
    );

    res.json(result.rows[0]);
  } catch (err) {
    console.error('PUT /api/settings error:', err);
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;