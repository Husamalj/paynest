import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  AlertTriangle,
  Building2,
  Calendar,
  CheckCircle2,
  Clock,
  Save,
  Settings as SettingsIcon,
  UserPlus,
  Trash2,
} from 'lucide-react';
import api from '../utils/api';
import clsx from 'clsx';

const WORKDAYS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
const WORKDAY_LABELS = {
  Sun: 'Sunday',
  Mon: 'Monday',
  Tue: 'Tuesday',
  Wed: 'Wednesday',
  Thu: 'Thursday',
  Fri: 'Friday',
  Sat: 'Saturday',
};

export default function OwnerSetup({ settings, onSettingsSaved }) {
  const navigate = useNavigate();

  const [form, setForm] = useState({
    company_name: 'PayZen',
    system_mode: 'daily',
    language: 'ar',
    req_hours: 8,
    month_days: 26,
    late_tolerance: 0,
    workdays: 'Sun,Mon,Tue,Wed,Thu',
    deduction_rate: 1,
    extra_rate: 1,
  });

  const [hrForm, setHrForm] = useState({
    name: '',
    email: '',
    employee_number: '',
    password: '123456',
  });

  const [hrUsers, setHrUsers] = useState([]);
  const [deletingHrId, setDeletingHrId] = useState(null);

  const [saving, setSaving] = useState(false);
  const [creatingHr, setCreatingHr] = useState(false);
  const [success, setSuccess] = useState('');
  const [error, setError] = useState('');

  useEffect(() => {
    if (!settings) return;

    setForm({
      company_name: settings.company_name || 'PayZen',
      system_mode: settings.system_mode || 'daily',
      language: settings.language || 'ar',
      req_hours: settings.req_hours || 8,
      month_days: settings.month_days || 26,
      late_tolerance: settings.late_tolerance || 0,
      workdays: settings.workdays || 'Sun,Mon,Tue,Wed,Thu',
      deduction_rate: settings.deduction_rate || 1,
      extra_rate: settings.extra_rate || 1,
    });
  }, [settings]);

  useEffect(() => {
    loadHrUsers();
  }, []);

  const loadHrUsers = async () => {
    try {
      const res = await api.get('/auth/company-hrs');
      setHrUsers(res.data || []);
    } catch (err) {
      console.error(err.message);
    }
  };

  const selectedWorkdays = form.workdays ? form.workdays.split(',') : [];

  const toggleWorkday = (day) => {
    const current = form.workdays ? form.workdays.split(',').filter(Boolean) : [];
    const updated = current.includes(day)
      ? current.filter((item) => item !== day)
      : [...current, day];

    const ordered = WORKDAYS.filter((item) => updated.includes(item));
    setForm((prev) => ({ ...prev, workdays: ordered.join(',') }));
  };

  const saveSetup = async (e) => {
    e.preventDefault();
    setSaving(true);
    setSuccess('');
    setError('');

    try {
      const res = await api.put('/settings', form);

      if (onSettingsSaved) {
        onSettingsSaved(res.data);
      }

      setSuccess('Company setup saved successfully.');
      setTimeout(() => navigate('/'), 700);
    } catch (err) {
      setError(err.message);
    } finally {
      setSaving(false);
    }
  };

  const createHr = async (e) => {
    e.preventDefault();
    setCreatingHr(true);
    setSuccess('');
    setError('');

    try {
      await api.post('/auth/create-hr', hrForm);
      await loadHrUsers();

      setSuccess('HR account created successfully. Temporary password: 123456');
      setHrForm({
        name: '',
        email: '',
        employee_number: '',
        password: '123456',
      });
    } catch (err) {
      setError(err.message);
    } finally {
      setCreatingHr(false);
    }
  };

  const deleteHr = async (hr) => {
    const ok = window.confirm(`Delete HR account: ${hr.name}?`);
    if (!ok) return;

    try {
      setDeletingHrId(hr.id);
      setSuccess('');
      setError('');

      await api.delete(`/auth/company-hrs/${hr.id}`);
      await loadHrUsers();

      setSuccess('HR account deleted successfully.');
    } catch (err) {
      setError(err.message);
    } finally {
      setDeletingHrId(null);
    }
  };

  return (
    <div className="min-h-screen bg-slate-50">
      <header className="bg-slate-950 text-white">
        <div className="max-w-5xl mx-auto px-4 py-6 flex items-center gap-3">
          <div className="w-11 h-11 rounded-lg bg-brand-500 flex items-center justify-center">
            <SettingsIcon size={21} />
          </div>

          <div>
            <h1 className="text-xl font-bold">Owner Setup</h1>
            <p className="text-sm text-slate-300">
              جهز نسخة الشركة وحدد نظامها قبل التسليم
            </p>
          </div>
        </div>
      </header>

      <main className="max-w-5xl mx-auto p-4 lg:p-6">
        {error && (
          <div className="alert alert-error mb-4">
            <AlertTriangle size={16} />
            {error}
          </div>
        )}

        {success && (
          <div className="alert alert-success mb-4">
            <CheckCircle2 size={16} />
            {success}
          </div>
        )}

        <form onSubmit={saveSetup} className="space-y-5">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
            <div className="card">
              <div className="card-header">
                <div className="card-title">
                  <Building2 size={16} className="text-brand-600" />
                  Company Package
                </div>
              </div>

              <div className="space-y-4">
                <div>
                  <label className="form-label">Company name</label>
                  <input
                    className="form-input"
                    value={form.company_name}
                    onChange={(e) =>
                      setForm((prev) => ({
                        ...prev,
                        company_name: e.target.value,
                      }))
                    }
                  />
                </div>

                <div>
                  <label className="form-label">Default language</label>
                  <select
                    className="form-select"
                    value={form.language}
                    onChange={(e) =>
                      setForm((prev) => ({
                        ...prev,
                        language: e.target.value,
                      }))
                    }
                  >
                    <option value="ar">Arabic</option>
                    <option value="en">English</option>
                  </select>
                </div>
              </div>
            </div>

            <div className="card">
              <div className="card-header">
                <div className="card-title">
                  <Calendar size={16} className="text-brand-600" />
                  Hidden Payroll Mode
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                {[
                  {
                    value: 'daily',
                    title: 'Daily',
                    desc: 'حساب يوم بيوم مع الغياب والتأخير',
                    Icon: Calendar,
                    activeClass:
                      'border-emerald-500 bg-emerald-50 text-emerald-800',
                  },
                  {
                    value: 'hours',
                    title: 'Hours',
                    desc: 'حساب حسب مجموع ساعات الشهر',
                    Icon: Clock,
                    activeClass:
                      'border-brand-500 bg-brand-50 text-brand-800',
                  },
                ].map((mode) => {
                  const active = form.system_mode === mode.value;

                  return (
                    <button
                      key={mode.value}
                      type="button"
                      onClick={() =>
                        setForm((prev) => ({
                          ...prev,
                          system_mode: mode.value,
                        }))
                      }
                      className={clsx(
                        'rounded-lg border-2 p-4 text-left transition-all',
                        active
                          ? mode.activeClass
                          : 'border-slate-200 hover:bg-slate-50'
                      )}
                    >
                      <mode.Icon size={20} className="mb-2" />
                      <div className="font-bold">{mode.title}</div>
                      <div className="text-xs text-slate-500 mt-1 leading-5">
                        {mode.desc}
                      </div>
                    </button>
                  );
                })}
              </div>

              <p className="text-xs text-slate-500 mt-3">
                This choice controls payroll calculation and HR cannot change it.
              </p>
            </div>
          </div>

          <div className="card">
            <div className="card-header">
              <div className="card-title">
                <Clock size={16} className="text-brand-600" />
                Payroll Rules
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">
              <div>
                <label className="form-label">Daily required hours</label>
                <input
                  type="number"
                  className="form-input"
                  min={1}
                  max={24}
                  step={0.5}
                  value={form.req_hours}
                  onChange={(e) =>
                    setForm((prev) => ({
                      ...prev,
                      req_hours: parseFloat(e.target.value) || 8,
                    }))
                  }
                />
              </div>

              <div>
                <label className="form-label">Month work days</label>
                <input
                  type="number"
                  className="form-input"
                  min={1}
                  max={31}
                  value={form.month_days}
                  onChange={(e) =>
                    setForm((prev) => ({
                      ...prev,
                      month_days: parseInt(e.target.value, 10) || 26,
                    }))
                  }
                />
              </div>

              {form.system_mode === 'daily' && (
                <div>
                  <label className="form-label">Late tolerance</label>
                  <input
                    type="number"
                    className="form-input"
                    min={0}
                    max={180}
                    value={form.late_tolerance}
                    onChange={(e) =>
                      setForm((prev) => ({
                        ...prev,
                        late_tolerance: parseInt(e.target.value, 10) || 0,
                      }))
                    }
                  />
                </div>
              )}

              <div>
                <label className="form-label">Deduction rate</label>
                <input
                  type="number"
                  className="form-input"
                  min={0}
                  max={5}
                  step={0.1}
                  value={form.deduction_rate}
                  onChange={(e) =>
                    setForm((prev) => ({
                      ...prev,
                      deduction_rate: parseFloat(e.target.value) || 1,
                    }))
                  }
                />
              </div>

              <div>
                <label className="form-label">Extra rate</label>
                <input
                  type="number"
                  className="form-input"
                  min={0}
                  max={5}
                  step={0.1}
                  value={form.extra_rate}
                  onChange={(e) =>
                    setForm((prev) => ({
                      ...prev,
                      extra_rate: parseFloat(e.target.value) || 1,
                    }))
                  }
                />
              </div>
            </div>

            {form.system_mode === 'daily' && (
              <div className="mt-5">
                <label className="form-label">Workdays</label>
                <div className="flex flex-wrap gap-2">
                  {WORKDAYS.map((day) => {
                    const selected = selectedWorkdays.includes(day);

                    return (
                      <button
                        key={day}
                        type="button"
                        onClick={() => toggleWorkday(day)}
                        className={clsx(
                          'px-3 py-1.5 rounded-lg border text-sm transition-all',
                          selected
                            ? 'border-brand-500 bg-brand-50 text-brand-800 font-semibold'
                            : 'border-slate-200 text-slate-600 hover:bg-slate-50'
                        )}
                      >
                        {WORKDAY_LABELS[day]}
                      </button>
                    );
                  })}
                </div>
              </div>
            )}
          </div>

          <div className="flex justify-end">
            <button className="btn btn-primary btn-lg" disabled={saving}>
              {saving ? <span className="spinner" /> : <Save size={16} />}
              Save Company Setup
            </button>
          </div>
        </form>

        <form onSubmit={createHr} className="mt-5">
          <div className="card">
            <div className="card-header">
              <div className="card-title">
                <UserPlus size={16} className="text-brand-600" />
                Create HR Account
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
              <div>
                <label className="form-label">HR name</label>
                <input
                  className="form-input"
                  value={hrForm.name}
                  onChange={(e) =>
                    setHrForm((prev) => ({
                      ...prev,
                      name: e.target.value,
                    }))
                  }
                  placeholder="HR Manager"
                />
              </div>

              <div>
                <label className="form-label">HR email</label>
                <input
                  type="email"
                  className="form-input"
                  value={hrForm.email}
                  onChange={(e) =>
                    setHrForm((prev) => ({
                      ...prev,
                      email: e.target.value,
                    }))
                  }
                  placeholder="hr@company.com"
                />
              </div>

              <div>
                <label className="form-label">Employee number</label>
                <input
                  className="form-input"
                  value={hrForm.employee_number}
                  onChange={(e) =>
                    setHrForm((prev) => ({
                      ...prev,
                      employee_number: e.target.value,
                    }))
                  }
                  placeholder="EMP-001"
                />
              </div>

              <div>
                <label className="form-label">Temporary password</label>
                <input
                  className="form-input"
                  value={hrForm.password}
                  onChange={(e) =>
                    setHrForm((prev) => ({
                      ...prev,
                      password: e.target.value,
                    }))
                  }
                />
              </div>
            </div>

            <div className="flex justify-end mt-4">
              <button className="btn btn-secondary" disabled={creatingHr}>
                {creatingHr ? <span className="spinner spinner-dark" /> : <UserPlus size={16} />}
                Create HR
              </button>
            </div>

            <p className="text-xs text-slate-500 mt-3">
              هذا الحساب ينضاف تلقائياً لنفس شركة الـ Owner فقط.
            </p>
          </div>
        </form>

        <div className="card mt-5">
          <div className="card-header">
            <div className="card-title">
              HR Accounts
            </div>
          </div>

          {hrUsers.length === 0 ? (
            <div className="text-sm text-slate-400 text-center py-8">
              No HR accounts yet
            </div>
          ) : (
            <div className="table-wrapper">
              <table>
                <thead>
                  <tr>
                    <th>Name</th>
                    <th>Email</th>
                    <th>Employee #</th>
                    <th>Created</th>
                    <th />
                  </tr>
                </thead>

                <tbody>
                  {hrUsers.map((hr) => (
                    <tr key={hr.id}>
                      <td className="font-medium">{hr.name}</td>
                      <td className="text-sm text-slate-600">{hr.email}</td>
                      <td className="font-mono">{hr.employee_number || '-'}</td>
                      <td className="text-xs text-slate-500">
                        {hr.created_at ? new Date(hr.created_at).toLocaleDateString() : '-'}
                      </td>
                      <td className="text-right">
                        <button
                          className="btn btn-danger btn-sm"
                          disabled={deletingHrId === hr.id}
                          onClick={() => deleteHr(hr)}
                        >
                          {deletingHrId === hr.id ? (
                            <span className="spinner" />
                          ) : (
                            <Trash2 size={14} />
                          )}
                          Delete
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </main>
    </div>
  );
}