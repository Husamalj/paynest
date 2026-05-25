const express = require('express');
const router = express.Router();
const multer = require('multer');
const path = require('path');
const pool = require('../db/index');
const jwt = require('jsonwebtoken');
const { parseAttendanceFile, parseSalaryFile } = require('../utils/excelParser');

const JWT_SECRET =
  process.env.JWT_SECRET || 'paynest_secret_change_later';

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

const storage = multer.memoryStorage();

const upload = multer({
  storage,
  limits: { fileSize: 50 * 1024 * 1024 },
  fileFilter: (req, file, cb) => {
    const ext = path.extname(file.originalname).toLowerCase();
    if (['.xlsx', '.xls', '.csv'].includes(ext)) {
      cb(null, true);
    } else {
      cb(new Error('Only Excel and CSV files are allowed'));
    }
  },
});

async function getSystemMode(companyId) {
  const r = await pool.query(
    'SELECT system_mode FROM company_settings WHERE company_id = $1 ORDER BY id LIMIT 1',
    [companyId]
  );

  return r.rows[0]?.system_mode || 'daily';
}

// GET /api/upload
router.get('/', async (req, res) => {
  try {
    const companyId = getCompanyId(req);
    const mode = await getSystemMode(companyId);

    const result = await pool.query(
      `SELECT *
       FROM uploaded_files
       WHERE (system_mode = $1 OR system_mode IS NULL)
         AND company_id = $2
       ORDER BY created_at DESC
       LIMIT 100`,
      [mode, companyId]
    );

    res.json(result.rows);
  } catch (err) {
    console.error('GET /api/upload error:', err);
    res.status(500).json({ error: err.message });
  }
});

// DELETE /api/upload/:id
router.delete('/:id', async (req, res) => {
  const { id } = req.params;
  const companyId = getCompanyId(req);
  const client = await pool.connect();

  try {
    await client.query('BEGIN');

    const fileResult = await client.query(
      `SELECT *
       FROM uploaded_files
       WHERE id = $1
         AND company_id = $2`,
      [id, companyId]
    );

    if (fileResult.rows.length === 0) {
      await client.query('ROLLBACK');
      return res.status(404).json({ error: 'File not found' });
    }

    const file = fileResult.rows[0];

    if (file.file_type === 'attendance' && file.upload_batch) {
      await client.query(
        `DELETE FROM attendance_records
         WHERE upload_batch = $1
           AND company_id = $2`,
        [file.upload_batch, companyId]
      );
    }

    await client.query(
      `DELETE FROM uploaded_files
       WHERE id = $1
         AND company_id = $2`,
      [id, companyId]
    );

    await client.query('COMMIT');
    res.json({ success: true, deleted: file });
  } catch (err) {
    await client.query('ROLLBACK');
    console.error('DELETE /api/upload error:', err);
    res.status(500).json({ error: err.message });
  } finally {
    client.release();
  }
});

// POST /api/upload
router.post('/', upload.array('files', 10), async (req, res) => {
  const companyId = getCompanyId(req);
  const fileType = req.query.type || 'attendance';
  const batchId = `batch_${Date.now()}`;
  const systemMode = await getSystemMode(companyId);

  if (!req.files || req.files.length === 0) {
    return res.status(400).json({ error: 'No files uploaded' });
  }

  const results = [];
  const client = await pool.connect();

  try {
    await client.query('BEGIN');

    for (const file of req.files) {
      const buffer = file.buffer;
      let rowCount = 0;
      let parsedData = [];
      let employeeCount = 0;

      if (fileType === 'attendance') {
        const records = parseAttendanceFile(buffer, batchId);

        parsedData = records;
        rowCount = records.length;
        employeeCount = new Set(records.map((r) => r.employee_id).filter(Boolean)).size;

        for (const record of records) {
          await client.query(
            `INSERT INTO employees (employee_id, name, system_mode, company_id)
             VALUES ($1, $2, $3, $4)
             ON CONFLICT (employee_id, system_mode) DO UPDATE
             SET name = CASE
                   WHEN employees.company_id = EXCLUDED.company_id
                    AND (
                      employees.name IS NULL
                      OR employees.name = ''
                      OR employees.name = employees.employee_id
                    )
                   THEN EXCLUDED.name
                   ELSE employees.name
                 END,
                 company_id = EXCLUDED.company_id,
                 updated_at = NOW()`,
            [
              record.employee_id,
              record.employee_name || record.employee_id,
              systemMode,
              companyId,
            ]
          );

          const existing = await client.query(
            `SELECT id
             FROM attendance_records
             WHERE employee_id = $1
               AND work_date = $2
               AND system_mode = $3
               AND company_id = $4`,
            [record.employee_id, record.work_date, systemMode, companyId]
          );

          if (existing.rows.length > 0) {
            await client.query(
              `UPDATE attendance_records
               SET clock_in = $1,
                   clock_out = $2,
                   hours_worked = $3,
                   upload_batch = $4,
                   company_id = $8
               WHERE employee_id = $5
                 AND work_date = $6
                 AND system_mode = $7
                 AND company_id = $8`,
              [
                record.clock_in,
                record.clock_out,
                record.hours_worked,
                batchId,
                record.employee_id,
                record.work_date,
                systemMode,
                companyId,
              ]
            );
          } else {
            await client.query(
              `INSERT INTO attendance_records
               (
                 employee_id,
                 work_date,
                 clock_in,
                 clock_out,
                 hours_worked,
                 upload_batch,
                 system_mode,
                 company_id
               )
               VALUES ($1, $2, $3, $4, $5, $6, $7, $8)`,
              [
                record.employee_id,
                record.work_date,
                record.clock_in,
                record.clock_out,
                record.hours_worked,
                batchId,
                systemMode,
                companyId,
              ]
            );
          }
        }
      } else if (fileType === 'salary') {
        const employees = parseSalaryFile(buffer);

        parsedData = employees;
        rowCount = employees.length;
        employeeCount = employees.length;

        for (const emp of employees) {
          await client.query(
            `INSERT INTO employees
             (employee_id, name, base_salary, social_security, system_mode, company_id)
             VALUES ($1, $2, $3, $4, $5, $6)
             ON CONFLICT (employee_id, system_mode) DO UPDATE
             SET name = EXCLUDED.name,
                 base_salary = EXCLUDED.base_salary,
                 social_security = EXCLUDED.social_security,
                 company_id = EXCLUDED.company_id,
                 updated_at = NOW()`,
            [
              emp.employee_id,
              emp.name,
              Number(emp.base_salary) || 0,
              !!emp.social_security,
              systemMode,
              companyId,
            ]
          );
        }
      }

      await client.query(
        `INSERT INTO uploaded_files
         (
           filename,
           original_name,
           file_type,
           upload_batch,
           row_count,
           employee_count,
           system_mode,
           company_id
         )
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8)`,
        [
          file.originalname,
          file.originalname,
          fileType,
          batchId,
          rowCount,
          employeeCount,
          systemMode,
          companyId,
        ]
      );

      results.push({
        filename: file.originalname,
        row_count: rowCount,
        employee_count: employeeCount,
        type: fileType,
        preview: parsedData.slice(0, 10),
      });
    }

    await client.query('COMMIT');

    res.json({
      success: true,
      batch_id: batchId,
      system_mode: systemMode,
      company_id: companyId,
      files: results,
    });
  } catch (err) {
    await client.query('ROLLBACK');
    console.error('POST /api/upload error:', err);
    res.status(500).json({ error: err.message });
  } finally {
    client.release();
  }
});

module.exports = router;
