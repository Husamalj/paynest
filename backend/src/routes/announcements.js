const express = require('express');
const router = express.Router();
const pool = require('../db/index');
const { requireAuth, requireRole } = require('../middleware/auth');

function getCompanyId(req) {
  return req.user?.companyId || 1;
}

// GET /api/announcements
router.get('/', requireAuth, requireRole('owner', 'hr', 'employee'), async (req, res) => {
  try {
    const companyId = getCompanyId(req);
    const all = req.query.all === 'true';

    let sql;
    const values = [companyId];

    if (req.user.role === 'employee') {
      sql = `
        SELECT *
        FROM announcements
        WHERE published = TRUE
          AND visible_to_employees = TRUE
          AND company_id = $1
        ORDER BY created_at DESC
      `;
    } else {
      sql = all
        ? `
          SELECT *
          FROM announcements
          WHERE company_id = $1
          ORDER BY created_at DESC
        `
        : `
          SELECT *
          FROM announcements
          WHERE published = TRUE
            AND company_id = $1
          ORDER BY created_at DESC
        `;
    }

    const result = await pool.query(sql, values);

    res.json(result.rows);
  } catch (err) {
    console.error('GET /api/announcements error:', err);
    res.status(500).json({ error: err.message });
  }
});

// POST /api/announcements
router.post('/', requireAuth, requireRole('owner', 'hr'), async (req, res) => {
  const { title, message, published, visible_to_employees } = req.body;

  try {
    const companyId = getCompanyId(req);

    if (!title || !message) {
      return res.status(400).json({ error: 'Title and message are required' });
    }

    const result = await pool.query(
      `INSERT INTO announcements (
        title,
        message,
        published,
        visible_to_employees,
        company_id
      )
      VALUES ($1, $2, $3, $4, $5)
      RETURNING *`,
      [
        title,
        message,
        published || false,
        visible_to_employees !== false,
        companyId,
      ]
    );

    res.json(result.rows[0]);
  } catch (err) {
    console.error('POST /api/announcements error:', err);
    res.status(500).json({ error: err.message });
  }
});

// PUT /api/announcements/:id
router.put('/:id', requireAuth, requireRole('owner', 'hr'), async (req, res) => {
  const { title, message, published, visible_to_employees } = req.body;

  try {
    const companyId = getCompanyId(req);

    const updates = [];
    const values = [];
    let idx = 1;

    if (title !== undefined) {
      updates.push(`title = $${idx++}`);
      values.push(title);
    }

    if (message !== undefined) {
      updates.push(`message = $${idx++}`);
      values.push(message);
    }

    if (published !== undefined) {
      updates.push(`published = $${idx++}`);
      values.push(published);
    }

    if (visible_to_employees !== undefined) {
      updates.push(`visible_to_employees = $${idx++}`);
      values.push(visible_to_employees);
    }

    updates.push(`updated_at = NOW()`);

    if (updates.length === 1) {
      return res.status(400).json({ error: 'No fields to update' });
    }

    values.push(req.params.id);
    values.push(companyId);

    const result = await pool.query(
      `UPDATE announcements
       SET ${updates.join(', ')}
       WHERE id = $${idx}
         AND company_id = $${idx + 1}
       RETURNING *`,
      values
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Announcement not found' });
    }

    res.json(result.rows[0]);
  } catch (err) {
    console.error('PUT /api/announcements/:id error:', err);
    res.status(500).json({ error: err.message });
  }
});

// DELETE /api/announcements/:id
router.delete('/:id', requireAuth, requireRole('owner', 'hr'), async (req, res) => {
  try {
    const companyId = getCompanyId(req);

    await pool.query(
      `DELETE FROM announcements
       WHERE id = $1
         AND company_id = $2`,
      [req.params.id, companyId]
    );

    res.json({ success: true });
  } catch (err) {
    console.error('DELETE /api/announcements/:id error:', err);
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;