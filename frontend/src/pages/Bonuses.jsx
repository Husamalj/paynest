import React, { useState, useEffect } from 'react';
import {
  Plus,
  Gift,
  TrendingDown,
  Trash2,
  CheckCircle2,
  AlertTriangle,
  X,
} from 'lucide-react';
import { useLanguage } from '../hooks/useLanguage';
import api from '../utils/api';
import clsx from 'clsx';

function formatCurrency(val) {
  const n = parseFloat(val) || 0;
  return n.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

function formatDate(d) {
  if (!d) return '-';
  return new Date(d).toLocaleDateString();
}

export default function Bonuses() {
  const { t } = useLanguage();
  const [list, setList] = useState([]);
  const [employees, setEmployees] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [filter, setFilter] = useState('all');
  const [form, setForm] = useState({
    employee_id: '',
    employee_name: '',
    type: 'bonus',
    reason: '',
    amount: '',
    period_month: new Date().getMonth() + 1,
    period_year: new Date().getFullYear(),
  });

  useEffect(() => {
    Promise.all([api.get('/bonuses'), api.get('/employees')])
      .then(([bRes, eRes]) => {
        setList(bRes.data || []);
        setEmployees(eRes.data || []);
      })
      .catch((err) => setError(err.message))
      .finally(() => setLoading(false));
  }, []);

  const handleEmployeeChange = (e) => {
    const empId = e.target.value;
    const emp = employees.find((em) => em.employee_id === empId);
    setForm((f) => ({
      ...f,
      employee_id: empId,
      employee_name: emp ? emp.name : '',
    }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    if (!form.employee_id || !form.amount) {
      setError('Please fill in all required fields');
      return;
    }
    try {
      const res = await api.post('/bonuses', { ...form, amount: parseFloat(form.amount) });
      setList((prev) => [res.data, ...prev]);
      setSuccess(`${form.type === 'bonus' ? 'Bonus' : 'Deduction'} added successfully`);
      setShowModal(false);
      setForm((f) => ({
        ...f,
        employee_id: '',
        employee_name: '',
        reason: '',
        amount: '',
        type: 'bonus',
      }));
    } catch (err) {
      setError(err.message);
    }
  };

  const handleDelete = async (id) => {
    if (!window.confirm(t('deleteConfirm'))) return;
    try {
      await api.delete(`/bonuses/${id}`);
      setList((prev) => prev.filter((item) => item.id !== id));
    } catch (err) {
      setError(err.message);
    }
  };

  const filtered = filter === 'all' ? list : list.filter((item) => item.type === filter);
  const totalBonuses = list
    .filter((i) => i.type === 'bonus')
    .reduce((s, i) => s + parseFloat(i.amount || 0), 0);
  const totalDeductions = list
    .filter((i) => i.type === 'deduction')
    .reduce((s, i) => s + parseFloat(i.amount || 0), 0);

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
          <h2 className="page-title">{t('bonuses')}</h2>
        </div>
        <button className="btn btn-primary" onClick={() => setShowModal(true)}>
          <Plus size={15} /> {t('addBonus')}
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

      {/* Summary cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div className="card">
          <div className="flex items-start justify-between">
            <div>
              <div className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider mb-1">
                {t('totalBonuses')}
              </div>
              <div className="text-2xl font-bold text-emerald-600">
                +{formatCurrency(totalBonuses)}
              </div>
            </div>
            <div className="w-11 h-11 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center">
              <Gift size={20} />
            </div>
          </div>
        </div>
        <div className="card">
          <div className="flex items-start justify-between">
            <div>
              <div className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider mb-1">
                {t('totalDeductions')}
              </div>
              <div className="text-2xl font-bold text-rose-600">
                -{formatCurrency(totalDeductions)}
              </div>
            </div>
            <div className="w-11 h-11 rounded-xl bg-rose-50 text-rose-600 flex items-center justify-center">
              <TrendingDown size={20} />
            </div>
          </div>
        </div>
      </div>

      {/* Filter tabs */}
      <div className="tabs">
        {['all', 'bonus', 'deduction'].map((f) => (
          <button
            key={f}
            className={clsx('tab-btn', filter === f && 'active')}
            onClick={() => setFilter(f)}
          >
            {f === 'all' ? t('all') : f === 'bonus' ? t('bonus') : t('deduction')}
            <span className="ml-2 bg-slate-100 rounded-full px-2 py-0.5 text-[10px] font-bold">
              {f === 'all' ? list.length : list.filter((i) => i.type === f).length}
            </span>
          </button>
        ))}
      </div>

      <div className="table-wrapper">
        {filtered.length === 0 ? (
          <div className="text-center py-12 text-sm text-slate-400">{t('noData')}</div>
        ) : (
          <table>
            <thead>
              <tr>
                <th>{t('employee')}</th>
                <th>{t('type')}</th>
                <th>{t('reason')}</th>
                <th className="text-right">{t('amount')}</th>
                <th>{t('period')}</th>
                <th>{t('uploadedAt')}</th>
                <th className="text-right">{t('actions')}</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((item) => (
                <tr key={item.id}>
                  <td>
                    <div className="font-medium text-slate-900">{item.employee_name}</div>
                    <div className="text-[11px] font-mono text-slate-500">{item.employee_id}</div>
                  </td>
                  <td>
                    <span
                      className={clsx(
                        'badge',
                        item.type === 'bonus' ? 'badge-green' : 'badge-red'
                      )}
                    >
                      {item.type === 'bonus' ? <Gift size={11} /> : <TrendingDown size={11} />}
                      {t(item.type)}
                    </span>
                  </td>
                  <td className="text-slate-600 text-sm max-w-[200px] truncate">
                    {item.reason || '-'}
                  </td>
                  <td
                    className={clsx(
                      'text-right font-mono font-semibold',
                      item.type === 'bonus' ? 'text-emerald-600' : 'text-rose-600'
                    )}
                  >
                    {item.type === 'bonus' ? '+' : '-'}
                    {formatCurrency(item.amount)}
                  </td>
                  <td className="text-xs text-slate-500">
                    {new Date(2000, item.period_month - 1, 1).toLocaleString('en-US', {
                      month: 'short',
                    })}{' '}
                    {item.period_year}
                  </td>
                  <td className="text-xs text-slate-500">{formatDate(item.created_at)}</td>
                  <td className="text-right">
                    <button
                      className="btn btn-sm btn-danger"
                      onClick={() => handleDelete(item.id)}
                    >
                      <Trash2 size={12} /> {t('delete')}
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      {showModal && (
        <div
          className="modal-overlay"
          onClick={(e) => {
            if (e.target === e.currentTarget) setShowModal(false);
          }}
        >
          <div className="modal">
            <div className="modal-header">
              <h3 className="modal-title flex items-center gap-2">
                <Plus size={16} className="text-brand-600" /> {t('addBonus')}
              </h3>
              <button className="modal-close" onClick={() => setShowModal(false)}>
                <X size={18} />
              </button>
            </div>
            <form onSubmit={handleSubmit} className="space-y-4">
              {error && (
                <div className="alert alert-error">
                  <AlertTriangle size={14} />
                  {error}
                </div>
              )}
              <div>
                <label className="form-label">{t('employee')} *</label>
                <select
                  className="form-select"
                  value={form.employee_id}
                  onChange={handleEmployeeChange}
                  required
                >
                  <option value="">{t('selectEmployee')}</option>
                  {employees.map((emp) => (
                    <option key={emp.employee_id} value={emp.employee_id}>
                      {emp.name} ({emp.employee_id})
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className="form-label">{t('type')} *</label>
                <div className="flex gap-2">
                  {['bonus', 'deduction'].map((tp) => (
                    <button
                      type="button"
                      key={tp}
                      onClick={() => setForm((f) => ({ ...f, type: tp }))}
                      className={clsx(
                        'flex-1 px-4 py-2 rounded-lg border-2 text-sm font-medium transition-all flex items-center justify-center gap-2',
                        form.type === tp
                          ? tp === 'bonus'
                            ? 'border-emerald-500 bg-emerald-50 text-emerald-700'
                            : 'border-rose-500 bg-rose-50 text-rose-700'
                          : 'border-slate-200 text-slate-600 hover:border-slate-300'
                      )}
                    >
                      {tp === 'bonus' ? <Gift size={14} /> : <TrendingDown size={14} />}
                      {t(tp)}
                    </button>
                  ))}
                </div>
              </div>
              <div>
                <label className="form-label">{t('amount')} *</label>
                <input
                  type="number"
                  className="form-input"
                  value={form.amount}
                  onChange={(e) => setForm((f) => ({ ...f, amount: e.target.value }))}
                  placeholder="0.00"
                  min="0"
                  step="0.01"
                  required
                />
              </div>
              <div>
                <label className="form-label">{t('reason')}</label>
                <input
                  type="text"
                  className="form-input"
                  value={form.reason}
                  onChange={(e) => setForm((f) => ({ ...f, reason: e.target.value }))}
                  placeholder="Optional reason"
                />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="form-label">{t('month')}</label>
                  <select
                    className="form-select"
                    value={form.period_month}
                    onChange={(e) =>
                      setForm((f) => ({ ...f, period_month: parseInt(e.target.value) }))
                    }
                  >
                    {Array.from({ length: 12 }, (_, i) => i + 1).map((m) => (
                      <option key={m} value={m}>
                        {new Date(2000, m - 1, 1).toLocaleString('en-US', { month: 'long' })}
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="form-label">{t('year')}</label>
                  <input
                    type="number"
                    className="form-input"
                    value={form.period_year}
                    onChange={(e) =>
                      setForm((f) => ({ ...f, period_year: parseInt(e.target.value) }))
                    }
                    min={2020}
                    max={2100}
                  />
                </div>
              </div>
              <div className="flex justify-end gap-2 pt-2">
                <button
                  type="button"
                  className="btn btn-secondary"
                  onClick={() => setShowModal(false)}
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
