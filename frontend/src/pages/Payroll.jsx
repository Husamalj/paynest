import React, { useState, useEffect } from 'react';
import {
  Zap,
  Download,
  ChevronRight,
  ChevronDown,
  CheckCircle2,
  AlertTriangle,
  X,
  Calendar,
  Clock,
  Calculator,
} from 'lucide-react';
import { useLanguage } from '../hooks/useLanguage';
import api from '../utils/api';
import clsx from 'clsx';

function formatCurrency(val) {
  const n = parseFloat(val) || 0;
  return n.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

function getStatusBadge(status, t) {
  const map = {
    'Full Attendance': { cls: 'badge-green', label: t('fullAttendance') },
    'Has Deductions': { cls: 'badge-red', label: t('hasDeductions') },
    'Has Extras': { cls: 'badge-blue', label: t('hasExtras') },
    Absent: { cls: 'badge-gray', label: t('absent') },
  };
  const info = map[status] || { cls: 'badge-gray', label: status };
  return <span className={`badge ${info.cls}`}>{info.label}</span>;
}

function DailyBreakdownRow({ breakdown, t, colSpan }) {
  if (!breakdown || !breakdown.length) return null;
  return (
    <tr>
      <td colSpan={colSpan} className="bg-slate-50 p-0">
        <div className="p-4">
          <p className="font-semibold text-[13px] mb-2 text-slate-700 flex items-center gap-1">
            <Calendar size={13} /> {t('dailyBreakdown')}
          </p>
          <div className="rounded-lg border border-slate-200 overflow-x-auto bg-white">
            <table className="w-full text-xs">
              <thead>
                <tr className="bg-slate-100/60">
                  <th className="px-3 py-2 text-left font-semibold text-slate-600">{t('date')}</th>
                  <th className="px-3 py-2 text-right font-semibold text-slate-600">
                    {t('hoursWorked')}
                  </th>
                  <th className="px-3 py-2 text-right font-semibold text-slate-600">
                    {t('requiredHours')}
                  </th>
                  <th className="px-3 py-2 text-right font-semibold text-slate-600">{t('hourDiff')}</th>
                  <th className="px-3 py-2 text-right font-semibold text-slate-600">
                    {t('adjustment')}
                  </th>
                  <th className="px-3 py-2 text-left font-semibold text-slate-600">{t('status')}</th>
                </tr>
              </thead>
              <tbody>
                {breakdown.map((day, i) => (
                  <tr key={i} className="border-t border-slate-100">
                    <td className="px-3 py-1.5 font-mono">{day.date}</td>
                    <td className="px-3 py-1.5 text-right font-mono">
                      {parseFloat(day.hours_worked || 0).toFixed(2)}
                    </td>
                    <td className="px-3 py-1.5 text-right font-mono">
                      {parseFloat(day.required || 0).toFixed(2)}
                    </td>
                    <td
                      className={clsx(
                        'px-3 py-1.5 text-right font-mono',
                        day.diff < 0
                          ? 'text-rose-600'
                          : day.diff > 0
                          ? 'text-emerald-600'
                          : 'text-slate-500'
                      )}
                    >
                      {day.diff >= 0 ? '+' : ''}
                      {parseFloat(day.diff || 0).toFixed(2)}
                    </td>
                    <td
                      className={clsx(
                        'px-3 py-1.5 text-right font-mono',
                        day.adjustment < 0
                          ? 'text-rose-600'
                          : day.adjustment > 0
                          ? 'text-emerald-600'
                          : 'text-slate-500'
                      )}
                    >
                      {day.adjustment >= 0 ? '+' : ''}
                      {formatCurrency(day.adjustment)}
                    </td>
                    <td className="px-3 py-1.5">
                      <span
                        className={clsx('badge', day.status === 'present' ? 'badge-green' : 'badge-gray')}
                      >
                        {day.status === 'present' ? t('present') : t('absent')}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </td>
    </tr>
  );
}

export default function Payroll({ settings }) {
  const { t } = useLanguage();
  const [payroll, setPayroll] = useState([]);
  const [loading, setLoading] = useState(true);
  const [calculating, setCalculating] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [expandedRows, setExpandedRows] = useState({});
  const [period, setPeriod] = useState({
    month: new Date().getMonth() + 1,
    year: new Date().getFullYear(),
  });
  const [periodInfo, setPeriodInfo] = useState({});

  const isDailyMode = settings?.system_mode === 'daily';

  useEffect(() => {
    loadLatest();
  }, []);

  const loadLatest = async () => {
    setLoading(true);
    try {
      const res = await api.get('/payroll/latest');
      setPayroll(res.data.results || []);
      if (res.data.period_month) {
        setPeriodInfo({ month: res.data.period_month, year: res.data.period_year });
      }
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleCalculate = async () => {
    setCalculating(true);
    setError('');
    setSuccess('');
    try {
      const res = await api.post('/payroll/calculate', period);
      setPayroll(res.data.results || []);
      setPeriodInfo({ month: res.data.period_month, year: res.data.period_year });
      setSuccess(t('calculationDone'));
    } catch (err) {
      setError(err.message);
    } finally {
      setCalculating(false);
    }
  };

  const toggleRow = (idx) => {
    setExpandedRows((prev) => ({ ...prev, [idx]: !prev[idx] }));
  };

  const exportCSV = () => {
    const headers = [
      'Employee ID',
      'Name',
      'Base Salary',
      'Total Hours',
      'Required Hours',
      'Hour Diff',
      'Adjustment',
      'SS Deduction (7.5%)',
      'Bonuses',
      'Deductions',
      'Net Salary',
      'Status',
    ];
    const rows = payroll.map((r) => [
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
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `payroll_${periodInfo.year}_${periodInfo.month}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const months = Array.from({ length: 12 }, (_, i) => ({
    value: i + 1,
    label: new Date(2000, i, 1).toLocaleString('en-US', { month: 'long' }),
  }));

  const colSpan = isDailyMode ? 13 : 12;

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
          <h2 className="page-title">{t('payroll')}</h2>
          <p className="page-subtitle">
            {periodInfo.month &&
              ` · ${months.find((m) => m.value === parseInt(periodInfo.month))?.label} ${
                periodInfo.year
              }`}
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <select
            className="form-select w-auto"
            value={period.month}
            onChange={(e) => setPeriod((p) => ({ ...p, month: parseInt(e.target.value) }))}
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
            value={period.year}
            onChange={(e) => setPeriod((p) => ({ ...p, year: parseInt(e.target.value) }))}
            min={2020}
            max={2100}
          />
          <button className="btn btn-primary" onClick={handleCalculate} disabled={calculating}>
            {calculating ? (
              <>
                <span className="spinner" /> {t('calculating')}
              </>
            ) : (
              <>
                <Zap size={15} /> {t('calculate')}
              </>
            )}
          </button>
          {payroll.length > 0 && (
            <button className="btn btn-secondary" onClick={exportCSV}>
              <Download size={15} /> {t('exportCSV')}
            </button>
          )}
        </div>
      </div>

      {error && (
        <div className="alert alert-error">
          <AlertTriangle size={16} />
          <span className="flex-1">{error}</span>
          <button onClick={() => setError('')} className="opacity-60 hover:opacity-100">
            <X size={14} />
          </button>
        </div>
      )}
      {success && (
        <div className="alert alert-success">
          <CheckCircle2 size={16} />
          <span className="flex-1">{success}</span>
          <button onClick={() => setSuccess('')} className="opacity-60 hover:opacity-100">
            <X size={14} />
          </button>
        </div>
      )}

      {payroll.length === 0 ? (
        <div className="card text-center py-16">
          <Calculator size={36} className="text-slate-300 mx-auto mb-3" />
          <p className="text-slate-500 font-medium">{t('noData')}</p>
          <p className="text-sm text-slate-400 mt-1">{t('uploadFirst')}</p>
        </div>
      ) : (
        <div className="table-wrapper">
          <table>
            <thead>
              <tr>
                {isDailyMode && <th className="w-10"></th>}
                <th>{t('employeeId')}</th>
                <th>{t('name')}</th>
                <th className="text-right">{t('baseSalary')}</th>
                <th className="text-right">{t('totalHours')}</th>
                <th className="text-right">{t('requiredHours')}</th>
                <th className="text-right">{t('hourDiff')}</th>
                <th className="text-right">{t('adjustment')}</th>
                <th>{t('socialSecurity')}</th>
                <th className="text-right">{t('bonusTotal')}</th>
                <th className="text-right">{t('deductionTotal')}</th>
                <th className="text-right">{t('netSalary')}</th>
                <th>{t('status')}</th>
              </tr>
            </thead>
            <tbody>
              {payroll.map((row, idx) => (
                <React.Fragment key={idx}>
                  <tr>
                    {isDailyMode && (
                      <td>
                        {row.daily_breakdown && (
                          <button
                            onClick={() => toggleRow(idx)}
                            className="p-1 text-slate-400 hover:text-slate-700 transition-colors"
                            title={expandedRows[idx] ? t('collapse') : t('expand')}
                          >
                            {expandedRows[idx] ? (
                              <ChevronDown size={14} />
                            ) : (
                              <ChevronRight size={14} />
                            )}
                          </button>
                        )}
                      </td>
                    )}
                    <td className="font-mono text-xs text-slate-500">{row.employee_id}</td>
                    <td className="font-medium text-slate-900">{row.name}</td>
                    <td className="text-right font-mono">{formatCurrency(row.base_salary)}</td>
                    <td className="text-right font-mono">
                      {parseFloat(row.total_hours || 0).toFixed(2)}
                    </td>
                    <td className="text-right font-mono">
                      {parseFloat(row.required_hours || 0).toFixed(2)}
                    </td>
                    <td
                      className={clsx(
                        'text-right font-mono',
                        parseFloat(row.hour_diff) < 0
                          ? 'text-rose-600'
                          : parseFloat(row.hour_diff) > 0
                          ? 'text-emerald-600'
                          : ''
                      )}
                    >
                      {parseFloat(row.hour_diff || 0) >= 0 ? '+' : ''}
                      {parseFloat(row.hour_diff || 0).toFixed(2)}
                    </td>
                    <td
                      className={clsx(
                        'text-right font-mono',
                        parseFloat(row.adjustment) < 0
                          ? 'text-rose-600'
                          : parseFloat(row.adjustment) > 0
                          ? 'text-emerald-600'
                          : ''
                      )}
                    >
                      {parseFloat(row.adjustment || 0) >= 0 ? '+' : ''}
                      {formatCurrency(row.adjustment)}
                    </td>
                    <td>
                      {row.social_security || parseFloat(row.social_security_deduct) > 0 ? (
                        <div>
                          <span className="text-emerald-700 font-semibold text-xs">
                            ✓ {t('yes')}
                          </span>
                          <div className="text-[11px] text-rose-600 font-mono">
                            -{formatCurrency(row.social_security_deduct)}
                          </div>
                        </div>
                      ) : (
                        <span className="text-slate-400 text-xs">{t('no')}</span>
                      )}
                    </td>
                    <td className="text-right font-mono text-emerald-600">
                      {parseFloat(row.bonus_total) > 0
                        ? `+${formatCurrency(row.bonus_total)}`
                        : '-'}
                    </td>
                    <td className="text-right font-mono text-rose-600">
                      {parseFloat(row.deduction_total) > 0
                        ? `-${formatCurrency(row.deduction_total)}`
                        : '-'}
                    </td>
                    <td className="text-right font-mono font-bold text-brand-700">
                      {formatCurrency(row.net_salary)}
                    </td>
                    <td>{getStatusBadge(row.status, t)}</td>
                  </tr>
                  {isDailyMode && expandedRows[idx] && row.daily_breakdown && (
                    <DailyBreakdownRow
                      breakdown={
                        typeof row.daily_breakdown === 'string'
                          ? JSON.parse(row.daily_breakdown)
                          : row.daily_breakdown
                      }
                      t={t}
                      colSpan={colSpan}
                    />
                  )}
                </React.Fragment>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
