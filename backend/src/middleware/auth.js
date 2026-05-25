const jwt = require('jsonwebtoken');
const pool = require('../db');

const JWT_SECRET =
    process.env.JWT_SECRET || 'payzen_secret_change_later';

async function requireAuth(req, res, next) {
    try {
        const authHeader = req.headers.authorization;

        if (!authHeader) {
            return res.status(401).json({ error: 'No token' });
        }

        const token = authHeader.replace('Bearer ', '');
        const decoded = jwt.verify(token, JWT_SECRET);

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
        companies.is_active
      FROM users
      LEFT JOIN companies
        ON companies.id = users.company_id
      WHERE users.id = $1
      LIMIT 1
      `,
            [decoded.userId]
        );

        if (result.rows.length === 0) {
            return res.status(401).json({ error: 'User not found' });
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

        req.user = {
            id: user.id,
            name: user.name,
            email: user.email,
            role: user.role,
            companyId: user.company_id,
            employeeNumber: user.employee_number,
            mustChangePassword: user.must_change_password,
        };

        next();
    } catch (err) {
        return res.status(401).json({ error: 'Invalid token' });
    }
}

function requireRole(...roles) {
    return (req, res, next) => {
        if (!req.user) {
            return res.status(401).json({ error: 'Not authenticated' });
        }

        if (!roles.includes(req.user.role)) {
            return res.status(403).json({ error: 'Forbidden' });
        }

        next();
    };
}

function requireOwnerOrSuperAdmin(req, res, next) {
    if (!req.user) {
        return res.status(401).json({ error: 'Not authenticated' });
    }

    if (req.user.role !== 'owner' && req.user.role !== 'super_admin') {
        return res.status(403).json({ error: 'Forbidden' });
    }

    next();
}

module.exports = {
    requireAuth,
    requireRole,
    requireOwnerOrSuperAdmin,
};
