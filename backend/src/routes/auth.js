const express = require('express');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const pool = require('../db');
const { requireAuth, requireRole } = require('../middleware/auth');

const router = express.Router();

const JWT_SECRET = process.env.JWT_SECRET || 'payzen_secret_change_later';

function signToken(user) {
    return jwt.sign(
        {
            userId: user.id,
            companyId: user.company_id,
            role: user.role,
            employeeNumber: user.employee_number,
        },
        JWT_SECRET,
        { expiresIn: '7d' }
    );
}

async function getSystemMode(companyId) {
    const r = await pool.query(
        'SELECT system_mode FROM company_settings WHERE company_id = $1 ORDER BY id LIMIT 1',
        [companyId]
    );

    return r.rows[0]?.system_mode || 'daily';
}

/*
========================
REGISTER COMPANY + OWNER
========================
*/

router.post('/register-company', async (req, res) => {
    const client = await pool.connect();

    try {
        const { companyName, slug, ownerName, email, password } = req.body;

        if (!companyName || !slug || !ownerName || !email || !password) {
            return res.status(400).json({ error: 'Missing required fields' });
        }

        await client.query('BEGIN');

        const existingCompany = await client.query(
            'SELECT id FROM companies WHERE slug = $1',
            [slug]
        );

        if (existingCompany.rows.length > 0) {
            await client.query('ROLLBACK');
            return res.status(409).json({ error: 'Company slug already exists' });
        }

        const existingUser = await client.query(
            'SELECT id FROM users WHERE email = $1',
            [email]
        );

        if (existingUser.rows.length > 0) {
            await client.query('ROLLBACK');
            return res.status(409).json({ error: 'Email already exists' });
        }

        const companyResult = await client.query(
            `
      INSERT INTO companies (name, slug)
      VALUES ($1, $2)
      RETURNING id, name, slug, created_at
      `,
            [companyName, slug]
        );

        const company = companyResult.rows[0];
        const hashedPassword = await bcrypt.hash(password, 10);

        const userResult = await client.query(
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
      RETURNING
        id,
        name,
        email,
        role,
        company_id,
        employee_number,
        must_change_password,
        created_at
      `,
            [
                ownerName,
                email,
                hashedPassword,
                'owner',
                company.id,
                null,
                password === '123456',
            ]
        );

        await client.query(
            `
      INSERT INTO company_settings (company_name, company_id)
      VALUES ($1, $2)
      `,
            [companyName, company.id]
        );

        await client.query('COMMIT');

        const user = userResult.rows[0];
        const token = signToken(user);

        res.status(201).json({
            token,
            user,
            company,
        });
    } catch (err) {
        await client.query('ROLLBACK');
        console.error('Register company error:', err);
        res.status(500).json({ error: 'Register failed' });
    } finally {
        client.release();
    }
});

/*
=========
LOGIN
=========
*/

router.post('/login', async (req, res) => {
    try {
        const { email, password } = req.body;

        if (!email || !password) {
            return res.status(400).json({ error: 'Email and password required' });
        }

        const result = await pool.query(
            `
      SELECT
        users.*,
        companies.name AS company_name,
        companies.slug AS company_slug,
        companies.is_active
      FROM users
      LEFT JOIN companies
        ON companies.id = users.company_id
      WHERE users.email = $1
      LIMIT 1
      `,
            [email]
        );

        if (result.rows.length === 0) {
            return res.status(401).json({ error: 'Invalid credentials' });
        }

        const user = result.rows[0];

        if (
            user.role !== 'super_admin' &&
            user.company_id &&
            user.is_active === false
        ) {
            return res.status(403).json({
                error: 'Company subscription is inactive',
            });
        }

        const validPassword = await bcrypt.compare(password, user.password);

        if (!validPassword) {
            return res.status(401).json({ error: 'Invalid credentials' });
        }

        const token = signToken(user);
        const mustChangePassword = user.must_change_password === true;

        delete user.password;

        res.json({
            token,
            user: {
                ...user,
                must_change_password: mustChangePassword,
            },
        });
    } catch (err) {
        console.error('Login error:', err);
        res.status(500).json({ error: 'Login failed' });
    }
});

/*
=========
CREATE HR FOR CURRENT OWNER COMPANY
=========
*/

router.post('/create-hr', requireAuth, requireRole('owner'), async (req, res) => {
    const client = await pool.connect();

    try {
        const companyId = req.user.companyId;
        const { name, email, password, employee_number } = req.body;

        if (!name || !email) {
            return res.status(400).json({ error: 'Name and email are required' });
        }

        await client.query('BEGIN');

        const existingUser = await client.query(
            'SELECT id FROM users WHERE email = $1',
            [email]
        );

        if (existingUser.rows.length > 0) {
            await client.query('ROLLBACK');
            return res.status(409).json({ error: 'Email already exists' });
        }

        const temporaryPassword = password || '123456';
        const hashedPassword = await bcrypt.hash(temporaryPassword, 10);

        const userResult = await client.query(
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
      RETURNING
        id,
        name,
        email,
        role,
        company_id,
        employee_number,
        must_change_password,
        created_at
      `,
            [
                name,
                email,
                hashedPassword,
                'hr',
                companyId,
                null,
                true,
            ]
        );

        const user = userResult.rows[0];
        const systemMode = await getSystemMode(companyId);
        const employeeId = employee_number || `HR-${user.id}`;

        await client.query(
            `
      INSERT INTO employees (
        employee_id,
        name,
        email,
        base_salary,
        social_security,
        system_mode,
        company_id
      )
      VALUES ($1, $2, $3, $4, $5, $6, $7)
      ON CONFLICT (employee_id, system_mode) DO UPDATE SET
        name = EXCLUDED.name,
        email = EXCLUDED.email,
        company_id = EXCLUDED.company_id,
        updated_at = NOW()
      `,
            [
                employeeId,
                name,
                email,
                0,
                false,
                systemMode,
                companyId,
            ]
        );

        await client.query(
            `
      UPDATE users
      SET employee_number = $1
      WHERE id = $2
      `,
            [employeeId, user.id]
        );

        await client.query('COMMIT');

        res.status(201).json({
            user: {
                ...user,
                employee_number: employeeId,
            },
        });
    } catch (err) {
        await client.query('ROLLBACK');
        console.error('Create HR error:', err);
        res.status(500).json({ error: 'Failed to create HR user' });
    } finally {
        client.release();
    }
});

/*
=========
LIST HR USERS FOR CURRENT OWNER COMPANY
=========
*/

router.get('/company-hrs', requireAuth, requireRole('owner'), async (req, res) => {
    try {
        const result = await pool.query(
            `
      SELECT
        id,
        name,
        email,
        role,
        company_id,
        employee_number,
        must_change_password,
        created_at
      FROM users
      WHERE company_id = $1
        AND role = 'hr'
      ORDER BY created_at DESC
      `,
            [req.user.companyId]
        );

        res.json(result.rows);
    } catch (err) {
        console.error('List HR users error:', err);
        res.status(500).json({ error: 'Failed to load HR users' });
    }
});

/*
=========
DELETE HR USER FROM CURRENT OWNER COMPANY
=========
*/

router.delete('/company-hrs/:id', requireAuth, requireRole('owner'), async (req, res) => {
    const client = await pool.connect();

    try {
        const companyId = req.user.companyId;

        await client.query('BEGIN');

        const hrResult = await client.query(
            `
      SELECT
        id,
        name,
        email,
        employee_number
      FROM users
      WHERE id = $1
        AND company_id = $2
        AND role = 'hr'
      LIMIT 1
      `,
            [req.params.id, companyId]
        );

        if (hrResult.rows.length === 0) {
            await client.query('ROLLBACK');
            return res.status(404).json({ error: 'HR user not found' });
        }

        const hr = hrResult.rows[0];

        if (hr.employee_number) {
            await client.query(
                `
        DELETE FROM employees
        WHERE employee_id = $1
          AND company_id = $2
        `,
                [hr.employee_number, companyId]
            );
        }

        await client.query(
            `
      DELETE FROM users
      WHERE id = $1
        AND company_id = $2
        AND role = 'hr'
      `,
            [req.params.id, companyId]
        );

        await client.query('COMMIT');

        res.json({
            success: true,
            deleted: hr,
        });
    } catch (err) {
        await client.query('ROLLBACK');
        console.error('Delete HR user error:', err);
        res.status(500).json({ error: 'Failed to delete HR user' });
    } finally {
        client.release();
    }
});

/*
=========
CHANGE PASSWORD
=========
*/

router.put('/change-password', requireAuth, async (req, res) => {
    try {
        const { currentPassword, newPassword } = req.body;

        if (!currentPassword || !newPassword) {
            return res.status(400).json({ error: 'Current and new password are required' });
        }

        if (newPassword.length < 6) {
            return res.status(400).json({ error: 'New password must be at least 6 characters' });
        }

        const userResult = await pool.query(
            'SELECT id, password FROM users WHERE id = $1 LIMIT 1',
            [req.user.id]
        );

        if (userResult.rows.length === 0) {
            return res.status(401).json({ error: 'User not found' });
        }

        const user = userResult.rows[0];

        const validPassword = await bcrypt.compare(currentPassword, user.password);

        if (!validPassword) {
            return res.status(400).json({ error: 'Current password is incorrect' });
        }

        const hashedPassword = await bcrypt.hash(newPassword, 10);

        await pool.query(
            `
      UPDATE users
      SET password = $1,
          must_change_password = false
      WHERE id = $2
      `,
            [hashedPassword, req.user.id]
        );

        res.json({ success: true });
    } catch (err) {
        console.error('Change password error:', err);
        res.status(500).json({ error: 'Failed to change password' });
    }
});

/*
=========
GET ME
=========
*/

router.get('/me', requireAuth, async (req, res) => {
    try {
        const result = await pool.query(
            `
      SELECT
        users.id,
        users.name,
        users.email,
        users.role,
        users.company_id,
        users.employee_number,
        users.must_change_password,
        companies.name AS company_name,
        companies.slug AS company_slug,
        companies.is_active
      FROM users
      LEFT JOIN companies
        ON companies.id = users.company_id
      WHERE users.id = $1
      LIMIT 1
      `,
            [req.user.id]
        );

        if (result.rows.length === 0) {
            return res.status(401).json({ error: 'User not found' });
        }

        res.json({
            user: result.rows[0],
        });
    } catch (err) {
        console.error('GET /api/auth/me error:', err);
        res.status(500).json({ error: 'Failed to load user' });
    }
});

module.exports = router;