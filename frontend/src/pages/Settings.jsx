import React, { useState, useEffect } from 'react';
import {
  Calculator,
  Shield,
  Save,
  CheckCircle2,
  AlertTriangle,
  X,
} from 'lucide-react';
import { useLanguage } from '../hooks/useLanguage';
import api from '../utils/api';
import clsx from 'clsx';

const WORKDAYS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

const WORKDAY_LABELS = {
  Sun: { ar: 'الأحد', en: 'Sunday' },
  Mon: { ar: 'الإثنين', en: 'Monday' },
  Tue: { ar: 'الثلاثاء', en: 'Tuesday' },
  Wed: { ar: 'الأربعاء', en: 'Wednesday' },
  Thu: { ar: 'الخميس', en: 'Thursday' },
  Fri: { ar: 'الجمعة', en: 'Friday' },
  Sat: { ar: 'السبت', en: 'Saturday' },
};

export default function Settings({ settings: initialSettings, onSettingsSaved }) {
  const { t, lang } = useLanguage();

  const [form, setForm] = useState({
    company_name: 'PayZen',
    system_mode: 'daily',
    language: 'ar',
    req_hours: 8,
    month_days: 26,
    late_tolerance: 0,
    workdays: 'Sun,Mon,Tue,Wed,Thu',
    deduction_rate: 1.0,
    extra_rate: 1.0,
  });

  const [saving, setSaving] = useState(false);
  const [success, setSuccess] = useState('');
  const [error, setError] = useState('');
  const [employees, setEmployees] = useState([]);
  const [savingEmp, setSavingEmp] = useState({});

  useEffect(() => {
    if (initialSettings) {
      setForm({
        company_name: initialSettings.company_name || 'PayZen',
        system_mode: initialSettings.system_mode || 'daily',
        language: initialSettings.language || 'ar',
        req_hours: initialSettings.req_hours || 8,
        month_days: initialSettings.month_days || 26,
        late_tolerance: initialSettings.late_tolerance || 0,
        workdays: initialSettings.workdays || 'Sun,Mon,Tue,Wed,Thu',
        deduction_rate: initialSettings.deduction_rate || 1.0,
        extra_rate: initialSettings.extra_rate || 1.0,
      });
    }

    api
      .get('/employees')
      .then((res) => setEmployees(res.data || []))
      .catch(() => { });
  }, [initialSettings]);

  const selectedWorkdays = form.workdays ? form.workdays.split(',') : [];

  const toggleWorkday = (day) => {
    const current = form.workdays ? form.workdays.split(',').filter(Boolean) : [];
    const updated = current.includes(day)
      ? current.filter((d) => d !== day)
      : [...current, day];

    const ordered = WORKDAYS.filter((d) => updated.includes(d));
    setForm((f) => ({ ...f, workdays: ordered.join(',') }));
  };

  const handleSave = async (e) => {
    e.preventDefault();
    setSaving(true);
    setError('');
    setSuccess('');

    try {
      const res = await api.put('/settings', form);
      setSuccess(lang === 'ar' ? 'تم حفظ الإعدادات بنجاح' : 'Settings saved successfully');

      if (onSettingsSaved) {
        onSettingsSaved(res.data);
      }
    } catch (err) {
      setError(err.message);
    } finally {
      setSaving(false);
    }
  };

  const handleSSToggle = async (emp, value) => {
    setSavingEmp((prev) => ({ ...prev, [emp.employee_id]: true }));

    try {
      await api.put(`/employees/${emp.employee_id}`, { social_security: value });

      setEmployees((prev) =>
        prev.map((e) =>
          e.employee_id === emp.employee_id
            ? { ...e, social_security: value }
            : e
        )
      );
    } catch (err) {
      setError(err.message);
    } finally {
      setSavingEmp((prev) => ({ ...prev, [emp.employee_id]: false }));
    }
  };

  return (
    <div className="space-y-6">
      <div className="page-header">
        <div>
          <h2 className="page-title">{t('settings')}</h2>
          <p className="page-subtitle">{t('payrollSystemDesc')}</p>
        </div>
      </div>

      {error && (
        <div className="alert alert-error">
          <AlertTriangle size={16} />
          <span className="flex-1">{error}</span>
          <button
            onClick={() => setError('')}
            className="opacity-60 hover:opacity-100"
          >
            <X size={14} />
          </button>
        </div>
      )}

      {success && (
        <div className="alert alert-success">
          <CheckCircle2 size={16} />
          <span className="flex-1">{success}</span>
          <button
            onClick={() => setSuccess('')}
            className="opacity-60 hover:opacity-100"
          >
            <X size={14} />
          </button>
        </div>
      )}

      <form onSubmit={handleSave} className="space-y-5">
        <div className="card">
          <div className="card-header">
            <div className="card-title">
              <Calculator size={16} className="text-brand-600" />
              {t('calculationSettings')}
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            <div>
              <label className="form-label">{t('reqHours')}</label>
              <input
                type="number"
                className="form-input"
                value={form.req_hours}
                onChange={(e) =>
                  setForm((f) => ({
                    ...f,
                    req_hours: parseFloat(e.target.value) || 8,
                  }))
                }
                min={1}
                max={24}
                step={0.5}
              />
              <div className="text-[11px] text-slate-500 mt-1">
                {form.req_hours} {t('hoursPerDay')}
              </div>
            </div>

            <div>
              <label className="form-label">{t('monthDays')}</label>
              <input
                type="number"
                className="form-input"
                value={form.month_days}
                onChange={(e) =>
                  setForm((f) => ({
                    ...f,
                    month_days: parseInt(e.target.value) || 26,
                  }))
                }
                min={1}
                max={31}
              />
              <div className="text-[11px] text-slate-500 mt-1">
                {t('requiredTotalHrs')}: {form.month_days * form.req_hours}{' '}
                {t('hoursPerMonth')}
              </div>
            </div>

            {form.system_mode === 'daily' && (
              <div>
                <label className="form-label">{t('lateTolerance')}</label>
                <input
                  type="number"
                  className="form-input"
                  value={form.late_tolerance}
                  onChange={(e) =>
                    setForm((f) => ({
                      ...f,
                      late_tolerance: parseInt(e.target.value) || 0,
                    }))
                  }
                  min={0}
                  max={120}
                />
                <div className="text-[11px] text-slate-500 mt-1">
                  {form.late_tolerance} mins ={' '}
                  {(form.late_tolerance / 60).toFixed(2)} hrs
                </div>
              </div>
            )}

            <div>
              <label className="form-label">{t('deductionRate')}</label>
              <input
                type="number"
                className="form-input"
                value={form.deduction_rate}
                onChange={(e) =>
                  setForm((f) => ({
                    ...f,
                    deduction_rate: parseFloat(e.target.value) || 1,
                  }))
                }
                min={0}
                max={3}
                step={0.1}
              />
              <div className="text-[11px] text-slate-500 mt-1">
                {t('multiplierDeductions')}
              </div>
            </div>

            <div>
              <label className="form-label">{t('extraRate')}</label>
              <input
                type="number"
                className="form-input"
                value={form.extra_rate}
                onChange={(e) =>
                  setForm((f) => ({
                    ...f,
                    extra_rate: parseFloat(e.target.value) || 1,
                  }))
                }
                min={0}
                max={3}
                step={0.1}
              />
              <div className="text-[11px] text-slate-500 mt-1">
                {t('multiplierExtras')}
              </div>
            </div>
          </div>

          <div className="mt-5">
            <label className="form-label">{t('workdays')}</label>
            <div className="flex gap-1.5 flex-wrap">
              {WORKDAYS.map((day) => {
                const selected = selectedWorkdays.includes(day);

                return (
                  <button
                    type="button"
                    key={day}
                    onClick={() => toggleWorkday(day)}
                    className={clsx(
                      'px-3 py-1.5 rounded-lg text-xs font-medium border transition-all',
                      selected
                        ? 'bg-brand-50 border-brand-500 text-brand-700'
                        : 'bg-white border-slate-200 text-slate-600 hover:border-slate-300'
                    )}
                  >
                    {WORKDAY_LABELS[day]?.[lang] || WORKDAY_LABELS[day]?.en || day}
                  </button>
                );
              })}
            </div>
          </div>
        </div>

        <div className="flex justify-end">
          <button
            type="submit"
            className="btn btn-primary btn-lg"
            disabled={saving}
          >
            {saving ? (
              <>
                <span className="spinner" /> {t('saving')}
              </>
            ) : (
              <>
                <Save size={16} /> {t('save')}
              </>
            )}
          </button>
        </div>
      </form>

      {employees.length > 0 && (
        <div className="card">
          <div className="card-header">
            <div className="card-title">
              <Shield size={16} className="text-violet-600" />
              {t('ssToggle')} (7.5%) — {t('employees')}
            </div>
          </div>

          <div className="table-wrapper">
            <table>
              <thead>
                <tr>
                  <th>{t('employeeId')}</th>
                  <th>{t('name')}</th>
                  <th className="text-right">{t('baseSalary')}</th>
                  <th>{t('ssToggle')}</th>
                  <th className="text-right">{t('ssAmount')}</th>
                </tr>
              </thead>

              <tbody>
                {employees.map((emp) => (
                  <tr key={emp.employee_id}>
                    <td className="font-mono text-xs text-slate-500">
                      {emp.employee_id}
                    </td>

                    <td className="font-medium">{emp.name}</td>

                    <td className="text-right font-mono">
                      {parseFloat(emp.base_salary || 0).toLocaleString('en-US', {
                        minimumFractionDigits: 2,
                      })}
                    </td>

                    <td>
                      <label className="toggle">
                        <input
                          type="checkbox"
                          checked={!!emp.social_security}
                          disabled={!!savingEmp[emp.employee_id]}
                          onChange={(e) => handleSSToggle(emp, e.target.checked)}
                        />
                        <span className="toggle-slider" />
                      </label>
                    </td>

                    <td
                      className={clsx(
                        'text-right font-mono',
                        emp.social_security ? 'text-rose-600' : 'text-slate-300'
                      )}
                    >
                      {emp.social_security
                        ? `-${(parseFloat(emp.base_salary || 0) * 0.075).toLocaleString(
                          'en-US',
                          { minimumFractionDigits: 2 }
                        )}`
                        : '-'}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}