const express = require('express');
const router = express.Router();
const pool = require('../db/index');
const { requireAuth, requireRole } = require('../middleware/auth');

/*
=========
GET /api/evaluations/employees
Owner → all company employees
HR    → only employees where supervisor_user_id = current user's id
=========
*/
router.get('/employees', requireAuth, requireRole('owner', 'hr'), async (req, res) => {
  const cid = req.user.companyId;
  try {
    let result;
    if (req.user.role === 'owner') {
      result = await pool.query(
        `SELECT employee_id, name, email, supervisor_user_id
         FROM employees
         WHERE company_id = $1
         ORDER BY name ASC`,
        [cid]
      );
    } else {
      result = await pool.query(
        `SELECT employee_id, name, email, supervisor_user_id
         FROM employees
         WHERE company_id = $1
           AND supervisor_user_id = $2
         ORDER BY name ASC`,
        [cid, req.user.id]
      );
    }
    res.json(result.rows);
  } catch (err) {
    console.error('GET /api/evaluations/employees error:', err);
    res.status(500).json({ error: err.message });
  }
});

/*
=========
GET /api/evaluations?month=&year=
Owner → all evals for company in period
HR    → only their own submissions
=========
*/
router.get('/', requireAuth, requireRole('owner', 'hr'), async (req, res) => {
  const { month, year } = req.query;
  const cid = req.user.companyId;
  try {
    let result;
    if (req.user.role === 'owner') {
      result = await pool.query(
        `SELECT e.*, emp.name AS employee_name
         FROM evaluations e
         JOIN employees emp
           ON emp.employee_id = e.employee_id
          AND emp.company_id  = e.company_id
         WHERE e.company_id    = $1
           AND e.period_month  = $2
           AND e.period_year   = $3
         ORDER BY emp.name ASC`,
        [cid, month, year]
      );
    } else {
      result = await pool.query(
        `SELECT e.*, emp.name AS employee_name
         FROM evaluations e
         JOIN employees emp
           ON emp.employee_id = e.employee_id
          AND emp.company_id  = e.company_id
         WHERE e.company_id    = $1
           AND e.evaluator_id  = $2
           AND e.period_month  = $3
           AND e.period_year   = $4
         ORDER BY emp.name ASC`,
        [cid, req.user.id, month, year]
      );
    }
    res.json(result.rows);
  } catch (err) {
    console.error('GET /api/evaluations error:', err);
    res.status(500).json({ error: err.message });
  }
});

/*
=========
PUT /api/evaluations/assign-supervisor/:employeeId
Owner only — assign (or clear) a supervisor for an employee
=========
*/
router.put('/assign-supervisor/:employeeId', requireAuth, requireRole('owner'), async (req, res) => {
  const { supervisor_user_id } = req.body;
  try {
    const result = await pool.query(
      `UPDATE employees
       SET supervisor_user_id = $1
       WHERE employee_id = $2
         AND company_id  = $3
       RETURNING *`,
      [supervisor_user_id || null, req.params.employeeId, req.user.companyId]
    );
    if (!result.rows.length) return res.status(404).json({ error: 'Employee not found' });
    res.json(result.rows[0]);
  } catch (err) {
    console.error('PUT /api/evaluations/assign-supervisor error:', err);
    res.status(500).json({ error: err.message });
  }
});

/*
=========
GET /api/evaluations/:employeeId?month=&year=
Fetch single evaluation (by caller+employee+period) to pre-fill the form
=========
*/
router.get('/:employeeId', requireAuth, requireRole('owner', 'hr'), async (req, res) => {
  const { month, year } = req.query;
  try {
    const result = await pool.query(
      `SELECT * FROM evaluations
       WHERE company_id    = $1
         AND evaluator_id  = $2
         AND employee_id   = $3
         AND period_month  = $4
         AND period_year   = $5
       LIMIT 1`,
      [req.user.companyId, req.user.id, req.params.employeeId, month, year]
    );
    res.json(result.rows[0] || null);
  } catch (err) {
    console.error('GET /api/evaluations/:employeeId error:', err);
    res.status(500).json({ error: err.message });
  }
});

/*
=========
POST /api/evaluations
Create or update (upsert) an evaluation
=========
*/
router.post('/', requireAuth, requireRole('owner', 'hr'), async (req, res) => {
  const cid = req.user.companyId;
  const {
    employee_id, period_month, period_year,
    score_accuracy, score_innovation, score_speed, score_development,
    score_quality_check, score_prioritization, score_independence,
    score_deadlines, score_teamwork, score_communication,
    score_knowledge_sharing, score_feedback, score_compliance,
    bonus_worthy, recommendations,
  } = req.body;

  try {
    const result = await pool.query(
      `INSERT INTO evaluations (
        company_id, evaluator_id, employee_id, period_month, period_year,
        score_accuracy, score_innovation, score_speed, score_development,
        score_quality_check, score_prioritization, score_independence,
        score_deadlines, score_teamwork, score_communication,
        score_knowledge_sharing, score_feedback, score_compliance,
        bonus_worthy, recommendations, updated_at
      ) VALUES (
        $1, $2, $3, $4, $5,
        $6, $7, $8, $9, $10, $11, $12,
        $13, $14, $15, $16, $17, $18,
        $19, $20, NOW()
      )
      ON CONFLICT (company_id, evaluator_id, employee_id, period_month, period_year)
      DO UPDATE SET
        score_accuracy          = EXCLUDED.score_accuracy,
        score_innovation        = EXCLUDED.score_innovation,
        score_speed             = EXCLUDED.score_speed,
        score_development       = EXCLUDED.score_development,
        score_quality_check     = EXCLUDED.score_quality_check,
        score_prioritization    = EXCLUDED.score_prioritization,
        score_independence      = EXCLUDED.score_independence,
        score_deadlines         = EXCLUDED.score_deadlines,
        score_teamwork          = EXCLUDED.score_teamwork,
        score_communication     = EXCLUDED.score_communication,
        score_knowledge_sharing = EXCLUDED.score_knowledge_sharing,
        score_feedback          = EXCLUDED.score_feedback,
        score_compliance        = EXCLUDED.score_compliance,
        bonus_worthy            = EXCLUDED.bonus_worthy,
        recommendations         = EXCLUDED.recommendations,
        updated_at              = NOW()
      RETURNING *`,
      [
        cid, req.user.id, employee_id, period_month, period_year,
        score_accuracy, score_innovation, score_speed, score_development,
        score_quality_check, score_prioritization, score_independence,
        score_deadlines, score_teamwork, score_communication,
        score_knowledge_sharing, score_feedback, score_compliance,
        bonus_worthy ?? false, recommendations ?? null,
      ]
    );
    res.json(result.rows[0]);
  } catch (err) {
    console.error('POST /api/evaluations error:', err);
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
