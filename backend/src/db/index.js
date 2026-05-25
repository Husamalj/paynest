const { Pool } = require('pg');

const pool = process.env.DATABASE_URL
  ? new Pool({
      connectionString: process.env.DATABASE_URL,
      ssl: { rejectUnauthorized: false },
    })
  : new Pool({
      host: process.env.DB_HOST || 'localhost',
      port: process.env.DB_PORT || 5432,
      user: process.env.DB_USER || 'postgres',
      password: process.env.DB_PASSWORD || 'maen1234',
      database: process.env.DB_NAME || 'maenDB',
    });

function quoteIdentifier(value) {
  return `"${String(value).replace(/"/g, '""')}"`;
}

async function ensureDatabaseExists() {
  try {
    await pool.query('SELECT 1');
    return;
  } catch (err) {
    if (err.code !== '3D000') {
      throw err;
    }
  }

  const maintenancePool = new Pool({
    ...dbConfig,
    database: process.env.DB_MAINTENANCE_DB || 'postgres',
  });

  try {
    await maintenancePool.query(`CREATE DATABASE ${quoteIdentifier(dbConfig.database)}`);
    console.log(`Database "${dbConfig.database}" created successfully`);
  } catch (err) {
    if (err.code !== '42P04') {
      throw err;
    }
  } finally {
    await maintenancePool.end();
  }
}

pool.on('error', (err) => {
  console.error('Unexpected error on idle client', err);
});

pool.ensureDatabaseExists = ensureDatabaseExists;

module.exports = pool;
