import React, { useState, useEffect, useMemo } from 'react';
import {
  BarChart3,
  Clock,
  History,
  Download,
  AlertTriangle,
  TrendingUp,
  Users,
} from 'lucide-react';
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  BarChart,
  Bar,
  Legend,
} from 'recharts';
import { useLanguage } from '../hooks/useLanguage';
import api from '../utils/api';
import clsx from 'clsx';

function formatCurrency(val) {
  const n = parseFloat(val) || 0;
  return n.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

function formatDate(val) {
  if (!val) return '-';
  const d = new Date(val);
  if (Number.isNaN(d.getTime())) return String(val);
  return d.toLocaleDateString();
}

export default function Reports({ settings }) {
  const { t, isRTL } = useLanguage();
  const [payrollHistory, setPayrollHistory] = useState([]);
  const [periodPayroll, setPeriodPayroll] = useState([]);
  const [periodEmployees, setPeriodEmployees] = useState([]);
  const [selectedEmployeeId, setSelectedEmployeeId] = useState('');
  const [employeeDetails, setEmployeeDetails] = useState(null);
  const [employeeLoading, setEmployeeLoading] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [activeTab, setActiveTab] = useState('monthly');
  const [selectedMonth, setSelectedMonth] = useState(new Date().getMonth() + 1);
  const [selectedYear, setSelectedYear] = useState(new Date().getFullYear());

  useEffect(() => {
    api
      .get('/payroll/history')
      .then((res) => setPayrollHistory(res.data || []))
      .catch((err) => setError(err.message));
  }, []);

  useEffect(() => {
    loadPeriodData();
  }, [selectedMonth, selectedYear]);

  const loadPeriodData = async () => {
    setLoading(true);
    setError('');
    try {
      const [periodRes, empRes] = await Promise.all([
        api.get('/payroll/period', { params: { month: selectedMonth, year: selectedYear } }),
        api.get('/payroll/period-employees', { params: { month: selectedMonth, year: selectedYear } }),
      ]);

      let payrollRows = periodRes.data?.results || [];
      const employees = empRes.data || [];

      if (!payrollRows.length && employees.length) {
        await api.post('/payroll/calculate', { month: selectedMonth, year: selectedYear });
        const refreshed = await api.get('/payroll/period', {
          params: { month: selectedMonth, year: selectedYear },
        });
        payrollRows = refreshed.data?.results || [];
      }

      setPeriodPayroll(payrollRows);
      setPeriodEmployees(employees);
      setSelectedEmployeeId('');
      setEmployeeDetails(null);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const loadEmployeeDetails = async (employeeId) => {
    setSelectedEmployeeId(employeeId);
    if (!employeeId) {
      setEmployeeDetails(null);
      return;
    }
    setEmployeeLoading(true);
    setError('');
    try {
      const res = await api.get('/payroll/employee-activity', {
        params: { employee_id: employeeId, month: selectedMonth, year: selectedYear },
      });
      setEmployeeDetails(res.data || null);
    } catch (err) {
      setError(err.message);
    } finally {
      setEmployeeLoading(false);
    }
  };

  const totals = useMemo(() => {
    const totalNet = periodPayroll.reduce((s, r) => s + (parseFloat(r.net_salary) || 0), 0);
    const totalBase = periodPayroll.reduce((s, r) => s + (parseFloat(r.base_salary) || 0), 0);
    const totalAdj = periodPayroll.reduce((s, r) => s + (parseFloat(r.adjustment) || 0), 0);
    const totalSS = periodPayroll.reduce(
      (s, r) => s + (parseFloat(r.social_security_deduct) || 0),
      0
    );
    const totalBonuses = periodPayroll.reduce((s, r) => s + (parseFloat(r.bonus_total) || 0), 0);
    const totalDeductions = periodPayroll.reduce(
      (s, r) => s + (parseFloat(r.deduction_total) || 0),
      0
    );
    return { totalNet, totalBase, totalAdj, totalSS, totalBonuses, totalDeductions };
  }, [periodPayroll]);

  const trendData = useMemo(
    () =>
      [...payrollHistory].reverse().map((h) => ({
        label:
          new Date(2000, h.period_month - 1, 1).toLocaleString('en-US', { month: 'short' }) +
          ' ' +
          h.period_year,
        net: parseFloat(h.total_net) || 0,
        base: parseFloat(h.total_base) || 0,
      })),
    [payrollHistory]
  );

  const downloadCSV = (csv, filename) => {
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    a.click();
    URL.revokeObjectURL(url);
  };

  const exportMonthlyCSV = () => {
    const data = periodPayroll;
    if (!data.length) return;
    const headers = [
      'Employee ID',
      'Name',
      'Base Salary',
      'Total Hours',
      'Required Hours',
      'Hour Diff',
      'Adjustment',
      'SS Deduct',
      'Bonuses',
      'Deductions',
      'Net Salary',
      'Status',
    ];
    const rows = data.map((r) => [
      r.employee_id,
      r.name,
      r.base_salary,
      r.total_hours,
      r.required_hours,
      r.hour_diff,
      r.adjustment,
      r.social_security_deduct,
      r.bonus_total,
      r.deduction_total,
      r.net_salary,
      r.status,
    ]);
    const csv = [headers, ...rows].map((row) => row.map((v) => `"${v ?? ''}"`).join(',')).join('\n');
    downloadCSV(csv, `payroll_report_${selectedYear}_${selectedMonth}.csv`);
  };

  const months = Array.from({ length: 12 }, (_, i) => ({
    value: i + 1,
    label: new Date(2000, i, 1).toLocaleString('en-US', { month: 'long' }),
  }));

  const attendanceRows = employeeDetails?.attendance || [];
  const attendanceTotal = attendanceRows.reduce(
    (sum, row) => sum + (parseFloat(row.hours_worked) || 0),
    0
  );

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20 gap-3 text-slate-500">
        <span className="spinner spinner-dark w-5 h-5" />
        {t('loadingData')}
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="page-header">
        <div>
          <h2 className="page-title">{t('reports')}</h2>
          <p className="page-subtitle">{t('monthlyReport')} / {t('attendanceReport')}</p>
        </div>
        <div className="flex gap-2 items-center">
          <select
            className="form-select w-auto"
            value={selectedMonth}
            onChange={(e) => setSelectedMonth(parseInt(e.target.value))}
          >
            {months.map((m) => (
              <option key={m.value} value={m.value}>
                {m.label}
              </option>
            ))}
          </select>
          <input
            type="number"
            className="form-input w-24"
            value={selectedYear}
            onChange={(e) => setSelectedYear(parseInt(e.target.value))}
            min={2020}
            max={2100}
          />
        </div>
      </div>

      {error && (
        <div className="alert alert-error">
          <AlertTriangle size={16} />
          {error}
        </div>
      )}

      <div className="tabs">
        {[
          { key: 'monthly', label: t('monthlyReport'), Icon: BarChart3 },
          { key: 'attendance', label: t('attendanceReport'), Icon: Clock },
          { key: 'history', label: t('history'), Icon: History },
        ].map((tab) => (
          <button
            key={tab.key}
            className={clsx('tab-btn flex items-center gap-1.5', activeTab === tab.key && 'active')}
            onClick={() => setActiveTab(tab.key)}
          >
            <tab.Icon size={14} />
            {tab.label}
          </button>
        ))}
      </div>

      {activeTab === 'monthly' && (
        <div className="space-y-5">
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3">
            <div className="card border-l-4 border-l-emerald-500">
              <div className="text-[11px] text-slate-500 font-semibold uppercase mb-1">
                {t('totalBaseSalary')}
              </div>
              <div className="text-lg font-bold">{formatCurrency(totals.totalBase)}</div>
            </div>
            <div className="card border-l-4 border-l-brand-500">
              <div className="text-[11px] text-slate-500 font-semibold uppercase mb-1">
                {t('adjustment')}
              </div>
              <div
                className={clsx(
                  'text-lg font-bold',
                  totals.totalAdj >= 0 ? 'text-emerald-600' : 'text-rose-600'
                )}
              >
                {totals.totalAdj >= 0 ? '+' : ''}
                {formatCurrency(totals.totalAdj)}
              </div>
            </div>
            <div className="card border-l-4 border-l-brand-700">
              <div className="text-[11px] text-slate-500 font-semibold uppercase mb-1">
                {t('totalNetPay')}
              </div>
              <div className="text-lg font-bold text-brand-700">{formatCurrency(totals.totalNet)}</div>
            </div>
            <div className="card border-l-4 border-l-violet-500">
              <div className="text-[11px] text-slate-500 font-semibold uppercase mb-1">
                {t('ssDeductions')}
              </div>
              <div className="text-lg font-bold text-violet-700">{formatCurrency(totals.totalSS)}</div>
            </div>
            <div className="card border-l-4 border-l-orange-500">
              <div className="text-[11px] text-slate-500 font-semibold uppercase mb-1">
                {t('totalBonuses')}
              </div>
              <div className="text-lg font-bold text-orange-600">
                +{formatCurrency(totals.totalBonuses)}
              </div>
            </div>
            <div className="card border-l-4 border-l-rose-500">
              <div className="text-[11px] text-slate-500 font-semibold uppercase mb-1">
                {t('totalDeductions')}
              </div>
              <div className="text-lg font-bold text-rose-600">
                -{formatCurrency(totals.totalDeductions)}
              </div>
            </div>
          </div>

          <div className="flex justify-end">
            <button
              className="btn btn-primary"
              onClick={exportMonthlyCSV}
              disabled={!periodPayroll.length}
            >
              <Download size={15} /> {t('exportCSV')}
            </button>
          </div>

          <div className="table-wrapper">
            {periodPayroll.length === 0 ? (
              <div className="text-center py-12 text-sm text-slate-400">{t('noData')}</div>
            ) : (
              <table>
                <thead>
                  <tr>
                    <th>{t('employeeId')}</th>
                    <th>{t('name')}</th>
                    <th className="text-right">{t('baseSalary')}</th>
                    <th className="text-right">{t('adjustment')}</th>
                    <th className="text-right">{t('socialSecurityDeduct')}</th>
                    <th className="text-right">{t('bonusTotal')}</th>
                    <th className="text-right">{t('deductionTotal')}</th>
                    <th className="text-right">{t('netSalary')}</th>
                    <th>{t('status')}</th>
                  </tr>
                </thead>
                <tbody>
                  {periodPayroll.map((r, idx) => (
                    <tr key={idx}>
                      <td className="font-mono text-xs text-slate-500">{r.employee_id}</td>
                      <td className="font-medium">{r.name}</td>
                      <td className="text-right font-mono">{formatCurrency(r.base_salary)}</td>
                      <td
                        className={clsx(
                          'text-right font-mono',
                          parseFloat(r.adjustment) < 0
                            ? 'text-rose-600'
                            : parseFloat(r.adjustment) > 0
                            ? 'text-emerald-600'
                            : ''
                        )}
                      >
                        {parseFloat(r.adjustment || 0) >= 0 ? '+' : ''}
                        {formatCurrency(r.adjustment)}
                      </td>
                      <td className="text-right font-mono text-rose-600">
                        {parseFloat(r.social_security_deduct) > 0
                          ? `-${formatCurrency(r.social_security_deduct)}`
                          : '-'}
                      </td>
                      <td className="text-right font-mono text-emerald-600">
                        {parseFloat(r.bonus_total) > 0
                          ? `+${formatCurrency(r.bonus_total)}`
                          : '-'}
                      </td>
                      <td className="text-right font-mono text-rose-600">
                        {parseFloat(r.deduction_total) > 0
                          ? `-${formatCurrency(r.deduction_total)}`
                          : '-'}
                      </td>
                      <td className="text-right font-mono font-bold text-brand-700">
                        {formatCurrency(r.net_salary)}
                      </td>
                      <td>
                        <span
                          className={clsx(
                            'badge',
                            r.status === 'Full Attendance'
                              ? 'badge-green'
                              : r.status === 'Has Deductions'
                              ? 'badge-red'
                              : r.status === 'Has Extras'
                              ? 'badge-blue'
                              : 'badge-gray'
                          )}
                        >
                          {r.status}
                        </span>
                      </td>
                    </tr>
                  ))}
                  <tr className="bg-slate-50 font-semibold">
                    <td colSpan={2} className="font-bold">
                      TOTAL ({periodPayroll.length} {t('employees')})
                    </td>
                    <td className="text-right font-mono">{formatCurrency(totals.totalBase)}</td>
                    <td
                      className={clsx(
                        'text-right font-mono',
                        totals.totalAdj < 0 ? 'text-rose-600' : 'text-emerald-600'
                      )}
                    >
                      {totals.totalAdj >= 0 ? '+' : ''}
                      {formatCurrency(totals.totalAdj)}
                    </td>
                    <td className="text-right font-mono text-rose-600">
                      -{formatCurrency(totals.totalSS)}
                    </td>
                    <td className="text-right font-mono text-emerald-600">
                      +{formatCurrency(totals.totalBonuses)}
                    </td>
                    <td className="text-right font-mono text-rose-600">
                      -{formatCurrency(totals.totalDeductions)}
                    </td>
                    <td className="text-right font-mono text-brand-700 font-bold text-base">
                      {formatCurrency(totals.totalNet)}
                    </td>
                    <td></td>
                  </tr>
                </tbody>
              </table>
            )}
          </div>
        </div>
      )}

      {activeTab === 'attendance' && (
        <div className="space-y-4">
          <div className="card">
            <div className="card-header">
              <div className="card-title">
                <Users size={16} className="text-brand-600" />
                {t('employeeActivity')}
              </div>
            </div>
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
              <div>
                <label className="form-label">{t('employee')}</label>
                <select
                  className="form-select"
                  value={selectedEmployeeId}
                  onChange={(e) => loadEmployeeDetails(e.target.value)}
                >
                  <option value="">{t('selectEmployee')}</option>
                  {periodEmployees.map((emp) => (
                    <option key={emp.employee_id} value={emp.employee_id}>
                      {emp.name || emp.employee_id}
                    </option>
                  ))}
                </select>
                <div className="text-xs text-slate-500 mt-2">
                  {periodEmployees.length
                    ? `${periodEmployees.length} ${t('employees')}`
                    : t('noEmployees')}
                </div>
              </div>
              <div className="lg:col-span-2">
                {employeeLoading ? (
                  <div className="flex items-center gap-2 text-sm text-slate-500">
                    <span className="spinner spinner-dark w-4 h-4" />
                    {t('loadingData')}
                  </div>
                ) : !selectedEmployeeId ? (
                  <div className="text-sm text-slate-400">{t('selectEmployee')}</div>
                ) : attendanceRows.length === 0 ? (
                  <div className="text-sm text-slate-400">{t('noData')}</div>
                ) : (
                  <div>
                    <div className="text-xs text-slate-500 mb-2">
                      {t('totalHours')}: {attendanceTotal.toFixed(2)}
                    </div>
                    <div className="table-wrapper">
                      <table>
                        <thead>
                          <tr>
                            <th className="py-3">{t('date')}</th>
                            <th className="py-3">{t('clockIn')}</th>
                            <th className="py-3">{t('clockOut')}</th>
                            <th className="py-3 text-right">{t('hoursWorked')}</th>
                          </tr>
                        </thead>
                        <tbody>
                          {attendanceRows.map((row, idx) => (
                            <tr key={idx}>
                              <td className="py-3 font-mono text-xs text-slate-500">
                                {formatDate(row.work_date)}
                              </td>
                              <td className="py-3 font-mono text-xs">{row.clock_in || '-'}</td>
                              <td className="py-3 font-mono text-xs">{row.clock_out || '-'}</td>
                              <td className="py-3 text-right font-mono">
                                {parseFloat(row.hours_worked || 0).toFixed(2)}
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      )}

      {activeTab === 'history' && (
        <div className="space-y-5">
          {trendData.length > 0 && (
            <div className="card">
              <div className="card-header">
                <div className="card-title">
                  <TrendingUp size={16} className="text-brand-600" />
                  {t('monthlyTrend')}
                </div>
              </div>
              <div className="h-72">
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart data={trendData} margin={{ left: -10, right: 8, top: 8 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" vertical={false} />
                    <XAxis
                      dataKey="label"
                      tick={{ fontSize: 11, fill: '#64748b' }}
                      reversed={isRTL}
                    />
                    <YAxis tick={{ fontSize: 11, fill: '#64748b' }} orientation={isRTL ? 'right' : 'left'} />
                    <Tooltip
                      contentStyle={{ borderRadius: 10, border: '1px solid #e2e8f0', fontSize: 12 }}
                      formatter={(v) => formatCurrency(v)}
                    />
                    <Legend wrapperStyle={{ fontSize: 11 }} />
                    <Line
                      type="monotone"
                      dataKey="base"
                      stroke="#94a3b8"
                      strokeWidth={2}
                      name={t('baseSalary')}
                      dot={{ r: 3 }}
                    />
                    <Line
                      type="monotone"
                      dataKey="net"
                      stroke="#0c8ce8"
                      strokeWidth={2.5}
                      name={t('netSalary')}
                      dot={{ r: 4 }}
                    />
                  </LineChart>
                </ResponsiveContainer>
              </div>
            </div>
          )}

          <div className="table-wrapper">
            {payrollHistory.length === 0 ? (
              <div className="text-center py-12 text-sm text-slate-400">{t('noData')}</div>
            ) : (
              <table className="table-fixed">
                <colgroup>
                  <col className="period" />
                  <col className="employees" />
                  <col className="base" />
                  <col className="net" />
                  <col className="calculated" />
                </colgroup>
                <thead>
                  <tr>
                    <th className="align-middle">{t('period')}</th>
                    <th className="text-right align-middle">{t('employees')}</th>
                    <th className="text-right align-middle">{t('totalBaseSalary')}</th>
                    <th className="text-right align-middle">{t('totalNetPay')}</th>
                    <th className="align-middle">{t('calculated')}</th>
                  </tr>
                </thead>
                <tbody>
                  {payrollHistory.map((h, idx) => (
                    <tr key={idx}>
                      <td className="font-medium align-middle">
                        {new Date(2000, h.period_month - 1, 1).toLocaleString('en-US', {
                          month: 'long',
                        })}{' '}
                        {h.period_year}
                      </td>
                      <td className="text-right align-middle">{h.employee_count}</td>
                      <td className="text-right font-mono align-middle">{formatCurrency(h.total_base)}</td>
                      <td className="text-right font-mono font-bold text-brand-700 align-middle">
                        {formatCurrency(h.total_net)}
                      </td>
                      <td className="text-xs text-slate-500 align-middle">
                        {new Date(h.calculated_at).toLocaleDateString()}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
