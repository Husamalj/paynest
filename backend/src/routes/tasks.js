const express = require('express');
const router = express.Router();
const pool = require('../db/index');
const { requireAuth, requireRole } = require('../middleware/auth');

function getCompanyId(req) {
  return req.user?.companyId || 1;
}

// GET /api/tasks
router.get('/', requireAuth, requireRole('owner', 'hr', 'employee'), async (req, res) => {
  try {
    const companyId = getCompanyId(req);

    let query = `
      SELECT *
      FROM tasks
      WHERE company_id = $1
    `;

    const values = [companyId];

    if (req.user.role === 'employee') {
      query += ` AND employee_id = $2`;
      values.push(req.user.employeeNumber);
    }

    query += ` ORDER BY created_at DESC`;

    const result = await pool.query(query, values);

    res.json(result.rows);
  } catch (err) {
    console.error('GET /api/tasks error:', err);
    res.status(500).json({ error: err.message });
  }
});

// POST /api/tasks
router.post('/', requireAuth, requireRole('owner', 'hr'), async (req, res) => {
  const { task_name, employee_id, deadline, status } = req.body;

  try {
    const companyId = getCompanyId(req);

    if (!task_name || !employee_id) {
      return res.status(400).json({ error: 'Task name and employee are required' });
    }

    const result = await pool.query(
      `INSERT INTO tasks (
        task_name,
        employee_id,
        deadline,
        status,
        company_id
      )
      VALUES ($1, $2, $3, $4, $5)
      RETURNING *`,
      [
        task_name,
        employee_id,
        deadline || null,
        status || 'pending',
        companyId,
      ]
    );

    res.json(result.rows[0]);
  } catch (err) {
    console.error('POST /api/tasks error:', err);
    res.status(500).json({ error: err.message });
  }
});

// PUT /api/tasks/:id
router.put('/:id', requireAuth, requireRole('owner', 'hr', 'employee'), async (req, res) => {
  const { task_name, employee_id, deadline, status } = req.body;

  try {
    const companyId = getCompanyId(req);

    if (req.user.role === 'employee') {
      const result = await pool.query(
        `UPDATE tasks
         SET status = $1,
             updated_at = NOW()
         WHERE id = $2
           AND company_id = $3
           AND employee_id = $4
         RETURNING *`,
        [
          status || 'completed',
          req.params.id,
          companyId,
          req.user.employeeNumber,
        ]
      );

      if (result.rows.length === 0) {
        return res.status(404).json({ error: 'Task not found' });
      }

      return res.json(result.rows[0]);
    }

    const updates = [];
    const values = [];
    let idx = 1;

    if (task_name !== undefined) {
      updates.push(`task_name = $${idx++}`);
      values.push(task_name);
    }

    if (employee_id !== undefined) {
      updates.push(`employee_id = $${idx++}`);
      values.push(employee_id);
    }

    if (deadline !== undefined) {
      updates.push(`deadline = $${idx++}`);
      values.push(deadline || null);
    }

    if (status !== undefined) {
      updates.push(`status = $${idx++}`);
      values.push(status);
    }

    updates.push(`updated_at = NOW()`);

    if (updates.length === 1) {
      return res.status(400).json({ error: 'No fields to update' });
    }

    values.push(req.params.id);
    values.push(companyId);

    const result = await pool.query(
      `UPDATE tasks
       SET ${updates.join(', ')}
       WHERE id = $${idx}
         AND company_id = $${idx + 1}
       RETURNING *`,
      values
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Task not found' });
    }

    res.json(result.rows[0]);
  } catch (err) {
    console.error('PUT /api/tasks/:id error:', err);
    res.status(500).json({ error: err.message });
  }
});

// DELETE /api/tasks/:id
router.delete('/:id', requireAuth, requireRole('owner', 'hr'), async (req, res) => {
  try {
    const companyId = getCompanyId(req);

    await pool.query(
      `DELETE FROM tasks
       WHERE id = $1
         AND company_id = $2`,
      [req.params.id, companyId]
    );

    res.json({ success: true });
  } catch (err) {
    console.error('DELETE /api/tasks/:id error:', err);
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;