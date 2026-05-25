import React, { useState, useEffect } from 'react';
import {
  Plus,
  Palmtree,
  Trash2,
  CheckCircle2,
  XCircle,
  AlertTriangle,
  X,
  Calendar,
  Clock,
  Check,
} from 'lucide-react';
import { useLanguage } from '../hooks/useLanguage';
import api from '../utils/api';
import clsx from 'clsx';

function formatDate(d) {
  if (!d) return '-';
  return new Date(d).toLocaleDateString();
}

function StatusBadge({ status, t }) {
  const map = {
    pending: { cls: 'badge-yellow', label: t('pending') },
    approved: { cls: 'badge-green', label: t('approved') },
    rejected: { cls: 'badge-red', label: t('rejected') },
  };
  const info = map[status] || { cls: 'badge-gray', label: status };
  return <span className={`badge ${info.cls}`}>{info.label}</span>;
}

export default function Leaves() {
  const { t } = useLanguage();
  const [activeTab, setActiveTab] = useState('requests');
  const [leaves, setLeaves] = useState([]);
  const [balances, setBalances] = useState([]);
  const [holidays, setHolidays] = useState([]);
  const [employees, setEmployees] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [showAddLeave, setShowAddLeave] = useState(false);
  const [showAddHoliday, setShowAddHoliday] = useState(false);
  const [leaveFilter, setLeaveFilter] = useState('all');
  const [leaveForm, setLeaveForm] = useState({
    employee_id: '',
    employee_name: '',
    leave_type: 'annual',
    start_date: '',
    end_date: '',
    days_count: '',
    reason: '',
  });
  const [holidayForm, setHolidayForm] = useState({ name: '', holiday_date: '' });

  useEffect(() => {
    loadAll();
  }, []);

  const loadAll = async () => {
    setLoading(true);
    try {
      const [leavesRes, balRes, holRes, empRes] = await Promise.all([
        api.get('/leaves'),
        api.get('/leaves/balances'),
        api.get('/leaves/holidays'),
        api.get('/employees'),
      ]);
      setLeaves(leavesRes.data || []);
      setBalances(balRes.data || []);
      setHolidays(holRes.data || []);
      setEmployees(empRes.data || []);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleStatusUpdate = async (id, status) => {
    try {
      const res = await api.put(`/leaves/${id}`, { status });
      setLeaves((prev) => prev.map((l) => (l.id === id ? res.data : l)));
      setSuccess(`Leave request ${status}`);
      await loadAll();
    } catch (err) {
      setError(err.message);
    }
  };

  const handleAddLeave = async (e) => {
    e.preventDefault();
    setError('');
    try {
      const res = await api.post('/leaves', leaveForm);
      setLeaves((prev) => [res.data, ...prev]);
      setSuccess('Leave request added');
      setShowAddLeave(false);
      setLeaveForm({
        employee_id: '',
        employee_name: '',
        leave_type: 'annual',
        start_date: '',
        end_date: '',
        days_count: '',
        reason: '',
      });
    } catch (err) {
      setError(err.message);
    }
  };

  const handleAddHoliday = async (e) => {
    e.preventDefault();
    setError('');
    try {
      const res = await api.post('/leaves/holidays', holidayForm);
      setHolidays((prev) =>
        [...prev, res.data].sort((a, b) => (a.holiday_date > b.holiday_date ? 1 : -1))
      );
      setSuccess('Holiday added');
      setShowAddHoliday(false);
      setHolidayForm({ name: '', holiday_date: '' });
    } catch (err) {
      setError(err.message);
    }
  };

  const handleDeleteHoliday = async (id) => {
    if (!window.confirm(t('deleteConfirm'))) return;
    try {
      await api.delete(`/leaves/holidays/${id}`);
      setHolidays((prev) => prev.filter((h) => h.id !== id));
    } catch (err) {
      setError(err.message);
    }
  };

  const handleDeleteLeave = async (id) => {
    if (!window.confirm(t('deleteLeaveConfirm'))) return;
    try {
      await api.delete(`/leaves/${id}`);
      setLeaves((prev) => prev.filter((l) => l.id !== id));
      setSuccess(t('leaveDeleted'));
      await loadAll();
    } catch (err) {
      setError(err.message);
    }
  };

  const calcDays = (start, end) => {
    if (!start || !end) return '';
    const diff = (new Date(end) - new Date(start)) / (1000 * 60 * 60 * 24) + 1;
    return Math.max(0, diff);
  };

  const pendingCount = leaves.filter((l) => l.status === 'pending').length;
  const approvedThisMonth = leaves.filter((l) => {
    const d = new Date(l.updated_at);
    const now = new Date();
    return (
      l.status === 'approved' && d.getMonth() === now.getMonth() && d.getFullYear() === now.getFullYear()
    );
  }).length;
  const totalAnnualRemaining = balances.reduce(
    (s, b) => s + parseInt(b.annual_remaining || 0),
    0
  );

  const filteredLeaves =
    leaveFilter === 'all' ? leaves : leaves.filter((l) => l.status === leaveFilter);

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
          <h2 className="page-title">{t('leaves')}</h2>
        </div>
        <button className="btn btn-primary" onClick={() => setShowAddLeave(true)}>
          <Plus size={15} /> {t('addLeave')}
        </button>
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

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="card text-center">
          <div className="text-3xl font-bold text-amber-600">{pendingCount}</div>
          <div className="text-xs text-slate-500 mt-1">{t('pendingRequests')}</div>
        </div>
        <div className="card text-center">
          <div className="text-3xl font-bold text-emerald-600">{approvedThisMonth}</div>
          <div className="text-xs text-slate-500 mt-1">{t('approvedThisMonth')}</div>
        </div>
        <div className="card text-center">
          <div className="text-3xl font-bold text-brand-600">{totalAnnualRemaining}</div>
          <div className="text-xs text-slate-500 mt-1">
            {t('annualLeave')} {t('daysRemaining')}
          </div>
        </div>
      </div>

      <div className="tabs">
        {[
          { key: 'requests', label: t('requestsTitle'), Icon: Clock },
          { key: 'balances', label: t('leaveBalance'), Icon: Palmtree },
          { key: 'holidays', label: t('officialHolidays'), Icon: Calendar },
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

      {activeTab === 'requests' && (
        <div className="space-y-4">
          <div className="flex flex-wrap gap-2">
            {['all', 'pending', 'approved', 'rejected'].map((f) => (
              <button
                key={f}
                className={clsx(
                  'btn btn-sm',
                  leaveFilter === f ? 'btn-primary' : 'btn-secondary'
                )}
                onClick={() => setLeaveFilter(f)}
              >
                {f === 'all' ? t('all') : t(f)}
                <span className="opacity-60 ml-1">
                  ({f === 'all' ? leaves.length : leaves.filter((l) => l.status === f).length})
                </span>
              </button>
            ))}
          </div>
          <div className="table-wrapper">
            {filteredLeaves.length === 0 ? (
              <div className="text-center py-12 text-sm text-slate-400">{t('noData')}</div>
            ) : (
              <table>
                <thead>
                  <tr>
                    <th>{t('employee')}</th>
                    <th>{t('leaveType')}</th>
                    <th>{t('startDate')}</th>
                    <th>{t('endDate')}</th>
                    <th className="text-center">{t('days')}</th>
                    <th>{t('reason')}</th>
                    <th>{t('status')}</th>
                    <th className="text-right">{t('actions')}</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredLeaves.map((leave) => (
                    <tr key={leave.id}>
                      <td>
                        <div className="font-medium">{leave.employee_name}</div>
                        <div className="text-[11px] text-slate-500 font-mono">
                          {leave.employee_id}
                        </div>
                      </td>
                      <td>
                        <span className="badge badge-blue">
                          {leave.leave_type === 'annual'
                            ? t('annualLeave')
                            : leave.leave_type === 'sick'
                            ? t('sickLeave')
                            : leave.leave_type === 'unpaid'
                            ? t('unpaidLeave')
                            : leave.leave_type}
                        </span>
                      </td>
                      <td className="text-sm">{formatDate(leave.start_date)}</td>
                      <td className="text-sm">{formatDate(leave.end_date)}</td>
                      <td className="text-center font-semibold">{leave.days_count}</td>
                      <td className="text-xs text-slate-500 max-w-[160px] truncate">
                        {leave.reason || '-'}
                      </td>
                      <td>
                        <StatusBadge status={leave.status} t={t} />
                      </td>
                      <td className="text-right">
                        <div className="flex gap-1.5 justify-end">
                          {leave.status === 'pending' && (
                            <>
                              <button
                                className="btn btn-sm btn-success"
                                onClick={() => handleStatusUpdate(leave.id, 'approved')}
                              >
                                <Check size={12} /> {t('approve')}
                              </button>
                              <button
                                className="btn btn-sm btn-danger"
                                onClick={() => handleStatusUpdate(leave.id, 'rejected')}
                              >
                                <X size={12} /> {t('reject')}
                              </button>
                            </>
                          )}
                          <button
                            className="btn btn-sm btn-danger"
                            onClick={() => handleDeleteLeave(leave.id)}
                          >
                            <Trash2 size={12} /> {t('delete')}
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        </div>
      )}

      {activeTab === 'balances' && (
        <div className="table-wrapper">
          {balances.length === 0 ? (
            <div className="text-center py-12 text-sm text-slate-400">{t('noData')}</div>
          ) : (
            <table>
              <thead>
                <tr>
                  <th>{t('employee')}</th>
                  <th className="text-center">
                    {t('annualLeave')}: {t('total')}
                  </th>
                  <th className="text-center">
                    {t('annualLeave')}: {t('used')}
                  </th>
                  <th className="text-center">
                    {t('annualLeave')}: {t('remaining')}
                  </th>
                  <th className="text-center">
                    {t('sickLeave')}: {t('total')}
                  </th>
                  <th className="text-center">
                    {t('sickLeave')}: {t('used')}
                  </th>
                  <th className="text-center">
                    {t('sickLeave')}: {t('remaining')}
                  </th>
                </tr>
              </thead>
              <tbody>
                {balances.map((b) => (
                  <tr key={b.employee_id}>
                    <td className="font-medium">{b.name}</td>
                    <td className="text-center">{b.annual_total}</td>
                    <td
                      className={clsx(
                        'text-center',
                        b.annual_used > 0 && 'text-rose-600 font-medium'
                      )}
                    >
                      {b.annual_used}
                    </td>
                    <td className="text-center">
                      <span
                        className={clsx(
                          'badge',
                          b.annual_remaining > 5
                            ? 'badge-green'
                            : b.annual_remaining > 0
                            ? 'badge-yellow'
                            : 'badge-red'
                        )}
                      >
                        {b.annual_remaining}
                      </span>
                    </td>
                    <td className="text-center">{b.sick_total}</td>
                    <td
                      className={clsx(
                        'text-center',
                        b.sick_used > 0 && 'text-rose-600 font-medium'
                      )}
                    >
                      {b.sick_used}
                    </td>
                    <td className="text-center">
                      <span
                        className={clsx(
                          'badge',
                          b.sick_remaining > 5
                            ? 'badge-green'
                            : b.sick_remaining > 0
                            ? 'badge-yellow'
                            : 'badge-red'
                        )}
                      >
                        {b.sick_remaining}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      )}

      {activeTab === 'holidays' && (
        <div className="space-y-4">
          <button className="btn btn-primary" onClick={() => setShowAddHoliday(true)}>
            <Plus size={15} /> {t('addHoliday')}
          </button>
          <div className="table-wrapper">
            {holidays.length === 0 ? (
              <div className="text-center py-12 text-sm text-slate-400">{t('noData')}</div>
            ) : (
              <table>
                <thead>
                  <tr>
                    <th>{t('holidayName')}</th>
                    <th>{t('holidayDate')}</th>
                    <th>Day</th>
                    <th className="text-right">{t('actions')}</th>
                  </tr>
                </thead>
                <tbody>
                  {holidays.map((h) => {
                    const d = new Date(h.holiday_date);
                    return (
                      <tr key={h.id}>
                        <td className="font-medium flex items-center gap-2">
                          <Palmtree size={14} className="text-emerald-600" />
                          {h.name}
                        </td>
                        <td className="font-mono">{formatDate(h.holiday_date)}</td>
                        <td className="text-slate-500 text-sm">
                          {d.toLocaleDateString('en-US', { weekday: 'long' })}
                        </td>
                        <td className="text-right">
                          <button
                            className="btn btn-sm btn-danger"
                            onClick={() => handleDeleteHoliday(h.id)}
                          >
                            <Trash2 size={12} /> {t('delete')}
                          </button>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            )}
          </div>
        </div>
      )}

      {/* Add Leave Modal */}
      {showAddLeave && (
        <div
          className="modal-overlay"
          onClick={(e) => {
            if (e.target === e.currentTarget) setShowAddLeave(false);
          }}
        >
          <div className="modal">
            <div className="modal-header">
              <h3 className="modal-title">{t('addLeave')}</h3>
              <button className="modal-close" onClick={() => setShowAddLeave(false)}>
                <X size={18} />
              </button>
            </div>
            <form onSubmit={handleAddLeave} className="space-y-4">
              <div>
                <label className="form-label">{t('employee')} *</label>
                <select
                  className="form-select"
                  value={leaveForm.employee_id}
                  onChange={(e) => {
                    const emp = employees.find((em) => em.employee_id === e.target.value);
                    setLeaveForm((f) => ({
                      ...f,
                      employee_id: e.target.value,
                      employee_name: emp?.name || '',
                    }));
                  }}
                  required
                >
                  <option value="">{t('selectEmployee')}</option>
                  {employees.map((emp) => (
                    <option key={emp.employee_id} value={emp.employee_id}>
                      {emp.name}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className="form-label">{t('leaveType')} *</label>
                <select
                  className="form-select"
                  value={leaveForm.leave_type}
                  onChange={(e) =>
                    setLeaveForm((f) => ({ ...f, leave_type: e.target.value }))
                  }
                >
                  <option value="annual">{t('annualLeave')}</option>
                  <option value="sick">{t('sickLeave')}</option>
                  <option value="unpaid">{t('unpaidLeave')}</option>
                </select>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="form-label">{t('startDate')} *</label>
                  <input
                    type="date"
                    className="form-input"
                    value={leaveForm.start_date}
                    onChange={(e) => {
                      const start = e.target.value;
                      const days = calcDays(start, leaveForm.end_date);
                      setLeaveForm((f) => ({ ...f, start_date: start, days_count: days }));
                    }}
                    required
                  />
                </div>
                <div>
                  <label className="form-label">{t('endDate')} *</label>
                  <input
                    type="date"
                    className="form-input"
                    value={leaveForm.end_date}
                    onChange={(e) => {
                      const end = e.target.value;
                      const days = calcDays(leaveForm.start_date, end);
                      setLeaveForm((f) => ({ ...f, end_date: end, days_count: days }));
                    }}
                    required
                  />
                </div>
              </div>
              {leaveForm.days_count && (
                <div className="text-sm text-slate-500">
                  📅 {leaveForm.days_count} {t('days')}
                </div>
              )}
              <div>
                <label className="form-label">{t('reason')}</label>
                <textarea
                  className="form-textarea"
                  value={leaveForm.reason}
                  onChange={(e) => setLeaveForm((f) => ({ ...f, reason: e.target.value }))}
                />
              </div>
              <div className="flex justify-end gap-2 pt-2">
                <button
                  type="button"
                  className="btn btn-secondary"
                  onClick={() => setShowAddLeave(false)}
                >
                  {t('cancel')}
                </button>
                <button type="submit" className="btn btn-primary">
                  {t('add')}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Add Holiday Modal */}
      {showAddHoliday && (
        <div
          className="modal-overlay"
          onClick={(e) => {
            if (e.target === e.currentTarget) setShowAddHoliday(false);
          }}
        >
          <div className="modal">
            <div className="modal-header">
              <h3 className="modal-title">{t('addHoliday')}</h3>
              <button className="modal-close" onClick={() => setShowAddHoliday(false)}>
                <X size={18} />
              </button>
            </div>
            <form onSubmit={handleAddHoliday} className="space-y-4">
              <div>
                <label className="form-label">{t('holidayName')} *</label>
                <input
                  type="text"
                  className="form-input"
                  value={holidayForm.name}
                  onChange={(e) => setHolidayForm((f) => ({ ...f, name: e.target.value }))}
                  required
                />
              </div>
              <div>
                <label className="form-label">{t('holidayDate')} *</label>
                <input
                  type="date"
                  className="form-input"
                  value={holidayForm.holiday_date}
                  onChange={(e) =>
                    setHolidayForm((f) => ({ ...f, holiday_date: e.target.value }))
                  }
                  required
                />
              </div>
              <div className="flex justify-end gap-2 pt-2">
                <button
                  type="button"
                  className="btn btn-secondary"
                  onClick={() => setShowAddHoliday(false)}
                >
                  {t('cancel')}
                </button>
                <button type="submit" className="btn btn-primary">
                  {t('add')}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
