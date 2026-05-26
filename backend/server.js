require('dotenv').config();
const express = require('express');
const cors = require('cors');
const path = require('path');
const { runMigrations } = require('./src/db/migrations');

const companiesRoutes = require('./src/routes/companies');
const settingsRoutes = require('./src/routes/settings');
const employeesRoutes = require('./src/routes/employees');
const payrollRoutes = require('./src/routes/payroll');
const bonusesRoutes = require('./src/routes/bonuses');
const leavesRoutes = require('./src/routes/leaves');
const uploadRoutes = require('./src/routes/upload');
const tasksRoutes = require('./src/routes/tasks');
const announcementsRoutes = require('./src/routes/announcements');
const remoteAssignmentsRoutes = require('./src/routes/remote_assignments');
const copilotRoutes = require('./src/routes/copilot');
const authRoutes = require('./src/routes/auth');
const evaluationsRoutes = require('./src/routes/evaluations');

const app = express();
const PORT = process.env.PORT || 3001;

const allowedOrigins = [
  'http://localhost:5173',
  'http://localhost:3000',
  'http://127.0.0.1:5173',
  process.env.FRONTEND_URL,
].filter(Boolean);

app.use(cors({
  origin: allowedOrigins,
  credentials: true,
}));

app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ extended: true, limit: '50mb' }));

app.use('/uploads', express.static(path.join(__dirname, 'uploads')));

app.use('/api/auth', authRoutes);
app.use('/api/companies', companiesRoutes);
app.use('/api/settings', settingsRoutes);
app.use('/api/employees', employeesRoutes);
app.use('/api/payroll', payrollRoutes);
app.use('/api/bonuses', bonusesRoutes);
app.use('/api/leaves', leavesRoutes);
app.use('/api/upload', uploadRoutes);
app.use('/api/tasks', tasksRoutes);
app.use('/api/announcements', announcementsRoutes);
app.use('/api/remote_assignments', remoteAssignmentsRoutes);
app.use('/api/copilot', copilotRoutes);
app.use('/api/evaluations', evaluationsRoutes);

app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

app.use((req, res) => {
  res.status(404).json({ error: `Route not found: ${req.method} ${req.path}` });
});

app.use((err, req, res, next) => {
  console.error('Unhandled error:', err);
  res.status(500).json({ error: err.message || 'Internal server error' });
});

async function startServer() {
  try {
    const pool = require('./src/db/index');

    await pool.ensureDatabaseExists();
    await runMigrations();

    try {
      await pool.query(`
        DELETE FROM remote_assignments
        WHERE id NOT IN (
          SELECT MIN(id) FROM remote_assignments
          GROUP BY employee_id, start_date, end_date
        )
      `);
      console.log('Remote assignments deduplication complete');
    } catch (e) {
      console.warn('Deduplication warning:', e.message);
    }

    app.listen(PORT, () => {
      console.log(`PayNest backend running on port ${PORT}`);
    });
  } catch (err) {
    console.error('Failed to start server:', err);
    process.exit(1);
  }
}

startServer();