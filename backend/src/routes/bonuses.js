const express = require('express');
const router = express.Router();
const pool = require('../db/index');
const jwt = require('jsonwebtoken');

const JWT_SECRET =
  process.env.JWT_SECRET || 'payzen_secret_change_later';

function getCompanyId(req) {
  const authHeader = req.headers.authorization;

  if (!authHeader) return 1;

  try {
    const token = authHeader.replace('Bearer ', '');
    const decoded = jwt.verify(token, JWT_SECRET);
    return decoded.companyId || 1;
  } catch {
    return 1;
  }
}

async function getSystemMode(companyId) {
  const r = await pool.query(
    'SELECT system_mode FROM company_settings WHERE company_id = $1 ORDER BY id LIMIT 1',
    [companyId]
  );

  return r.rows[0]?.system_mode || 'daily';
}

// GET /api/bonuses
router.get('/', async (req, res) => {
  const { month, year } = req.query;

  try {
    const companyId = getCompanyId(req);
    const mode = await getSystemMode(companyId);

    let query = `
      SELECT *
      FROM bonuses_deductions
      WHERE (system_mode = $1 OR system_mode IS NULL)
        AND company_id = $2
    `;

    const values = [mode, companyId];

    if (month && year) {
      query += ` AND period_month = $3 AND period_year = $4`;
      values.push(month, year);
    }

    query += ' ORDER BY created_at DESC';

    const result = await pool.query(query, values);
    res.json(result.rows);
  } catch (err) {
    console.error('GET /api/bonuses error:', err);
    res.status(500).json({ error: err.message });
  }
});

// POST /api/bonuses
router.post('/', async (req, res) => {
  const {
    employee_id,
    employee_name,
    type,
    reason,
    amount,
    period_month,
    period_year,
  } = req.body;

  try {
    const companyId = getCompanyId(req);
    const mode = await getSystemMode(companyId);
    const now = new Date();

    const result = await pool.query(
      `INSERT INTO bonuses_deductions
       (
         employee_id,
         employee_name,
         type,
         reason,
         amount,
         period_month,
         period_year,
         system_mode,
         company_id
       )
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9)
       RETURNING *`,
      [
        employee_id,
        employee_name,
        type,
        reason,
        amount,
        period_month || (now.getMonth() + 1),
        period_year || now.getFullYear(),
        mode,
        companyId,
      ]
    );

    res.json(result.rows[0]);
  } catch (err) {
    console.error('POST /api/bonuses error:', err);
    res.status(500).json({ error: err.message });
  }
});

// DELETE /api/bonuses/:id
router.delete('/:id', async (req, res) => {
  try {
    const companyId = getCompanyId(req);

    const result = await pool.query(
      `DELETE FROM bonuses_deductions
       WHERE id = $1
         AND company_id = $2
       RETURNING *`,
      [req.params.id, companyId]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Record not found' });
    }

    res.json({ success: true });
  } catch (err) {
    console.error('DELETE /api/bonuses/:id error:', err);
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;