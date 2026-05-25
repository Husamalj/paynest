const express = require('express');
const router = express.Router();
const pool = require('../db/index');

// GET /api/remote_assignments - current and future assignments (deduplicated)
router.get('/', async (req, res) => {
  try {
    // Clean up any duplicate rows first (keep lowest id per employee+start+end)
    await pool.query(`
      DELETE FROM remote_assignments
      WHERE id NOT IN (
        SELECT MIN(id) FROM remote_assignments
        GROUP BY employee_id, start_date, end_date
      )
    `);
    const result = await pool.query(
      `SELECT ra.*, e.name, e.employee_id as emp_id, e.base_salary
       FROM remote_assignments ra
       LEFT JOIN employees e ON ra.employee_id = e.employee_id
       WHERE ra.end_date >= CURRENT_DATE
       ORDER BY ra.start_date ASC`
    );
    res.json(result.rows);
  } catch (err) {
    console.error('GET /api/remote_assignments error:', err);
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
