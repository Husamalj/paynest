import React, { useState, useEffect, useCallback } from 'react';
import { ClipboardList, X, CheckCircle2, AlertCircle } from 'lucide-react';
import { useLanguage } from '../hooks/useLanguage';
import api from '../utils/api';

const CRITERIA = [
  { key: 'score_accuracy',          labelKey: 'evalAccuracy' },
  { key: 'score_innovation',        labelKey: 'evalInnovation' },
  { key: 'score_speed',             labelKey: 'evalSpeed' },
  { key: 'score_development',       labelKey: 'evalDevelopment' },
  { key: 'score_quality_check',     labelKey: 'evalQualityCheck' },
  { key: 'score_prioritization',    labelKey: 'evalPrioritization' },
  { key: 'score_independence',      labelKey: 'evalIndependence' },
  { key: 'score_deadlines',         labelKey: 'evalDeadlines' },
  { key: 'score_teamwork',          labelKey: 'evalTeamwork' },
  { key: 'score_communication',     labelKey: 'evalCommunication' },
  { key: 'score_knowledge_sharing', labelKey: 'evalKnowledgeSharing' },
  { key: 'score_feedback',          labelKey: 'evalFeedback' },
  { key: 'score_compliance',        labelKey: 'evalCompliance' },
];

const MONTHS_AR = ['يناير','فبراير','مارس','أبريل','مايو','يونيو','يوليو','أغسطس','سبتمبر','أكتوبر','نوفمبر','ديسمبر'];
const MONTHS_EN = ['January','February','March','April','May','June','July','August','September','October','November','December'];

const defaultScores = () => Object.fromEntries(CRITERIA.map(c => [c.key, 3]));

export default function Evaluations() {
  const { t, lang } = useLanguage();
  const ar = lang === 'ar';
  const now = new Date();

  const [employees, setEmployees]       = useState([]);
  const [evaluations, setEvaluations]   = useState([]);
  const [period, setPeriod]             = useState({ month: now.getMonth() + 1, year: now.getFullYear() });
  const [selectedEmp, setSelectedEmp]   = useState(null);
  const [showForm, setShowForm]         = useState(false);
  const [formScores, setFormScores]     = useState(defaultScores());
  const [bonusWorthy, setBonusWorthy]   = useState(false);
  const [recommendations, setRecommendations] = useState('');
  const [loading, setLoading]           = useState(true);
  const [saving, setSaving]             = useState(false);
  const [error, setError]               = useState('');
  const [success, setSuccess]           = useState('');

  const loadEvaluations = useCallback(async (m, y) => {
    try {
      const res = await api.get('/evaluations', { params: { month: m, year: y } });
      setEvaluations(res.data || []);
    } catch (e) {
      console.error('Failed to load evaluations:', e.message);
    }
  }, []);

  useEffect(() => {
    const init = async () => {
      setLoading(true);
      try {
        const res = await api.get('/evaluations/employees');
        setEmployees(res.data || []);
        await loadEvaluations(now.getMonth() + 1, now.getFullYear());
      } catch (e) {
        setError(e.message);
      } finally {
        setLoading(false);
      }
    };
    init();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    loadEvaluations(period.month, period.year);
  }, [period, loadEvaluations]);

  const openForm = async (emp) => {
    setSelectedEmp(emp);
    setError('');
    try {
      const res = await api.get(`/evaluations/${emp.employee_id}`, {
        params: { month: period.month, year: period.year },
      });
      if (res.data) {
        const ev = res.data;
        setFormScores(Object.fromEntries(CRITERIA.map(c => [c.key, ev[c.key] ?? 3])));
        setBonusWorthy(ev.bonus_worthy || false);
        setRecommendations(ev.recommendations || '');
      } else {
        setFormScores(defaultScores());
        setBonusWorthy(false);
        setRecommendations('');
      }
    } catch {
      setFormScores(defaultScores());
      setBonusWorthy(false);
      setRecommendations('');
    }
    setShowForm(true);
  };

  const handleSave = async (e) => {
    e.preventDefault();
    setSaving(true);
    setError('');
    try {
      await api.post('/evaluations', {
        employee_id: selectedEmp.employee_id,
        period_month: period.month,
        period_year: period.year,
        ...formScores,
        bonus_worthy: bonusWorthy,
        recommendations,
      });
      setSuccess(t('evaluationSaved'));
      setShowForm(false);
      await loadEvaluations(period.month, period.year);
      setTimeout(() => setSuccess(''), 4000);
    } catch (e) {
      setError(e.message);
    } finally {
      setSaving(false);
    }
  };

  const months = ar ? MONTHS_AR : MONTHS_EN;
  const yearOptions = [now.getFullYear() - 1, now.getFullYear(), now.getFullYear() + 1];
  const totalInForm = Object.values(formScores).reduce((a, b) => a + b, 0);
  const avgInForm   = (totalInForm / CRITERIA.length).toFixed(1);

  return (
    <div className="space-y-6" dir={ar ? 'rtl' : 'ltr'}>

      {/* Page header */}
      <div className="flex items-center gap-3 pb-2 border-b border-slate-200">
        <ClipboardList className="text-brand-600" size={22} />
        <h2 className="text-xl font-bold text-slate-800">{t('evaluations')}</h2>
      </div>

      {/* Alerts */}
      {error && (
        <div className="flex items-center gap-2 bg-red-50 border border-red-200 text-red-700 rounded-xl p-3 text-sm">
          <AlertCircle size={16} className="shrink-0" />
          {error}
        </div>
      )}
      {success && (
        <div className="flex items-center gap-2 bg-green-50 border border-green-200 text-green-700 rounded-xl p-3 text-sm">
          <CheckCircle2 size={16} className="shrink-0" />
          {success}
        </div>
      )}

      {/* Period selector */}
      <div className="card p-4 flex items-center gap-4 flex-wrap">
        <span className="text-sm font-medium text-slate-600">{t('selectPeriod')}:</span>
        <select
          className="form-input w-40 text-sm"
          value={period.month}
          onChange={e => setPeriod(p => ({ ...p, month: +e.target.value }))}
        >
          {months.map((m, i) => <option key={i + 1} value={i + 1}>{m}</option>)}
        </select>
        <select
          className="form-input w-28 text-sm"
          value={period.year}
          onChange={e => setPeriod(p => ({ ...p, year: +e.target.value }))}
        >
          {yearOptions.map(y => <option key={y} value={y}>{y}</option>)}
        </select>
      </div>

      {/* Employee table */}
      <div className="card overflow-hidden">
        <div className="px-5 py-3 border-b border-slate-100 flex items-center gap-2">
          <ClipboardList size={15} className="text-brand-600" />
          <span className="font-semibold text-slate-700 text-sm">
            {ar ? 'تقرير أداء الموظف الشهري' : 'Monthly Employee Evaluation'} — {months[period.month - 1]} {period.year}
          </span>
        </div>

        {loading ? (
          <div className="p-10 text-center text-slate-400 text-sm">
            {ar ? 'جاري التحميل...' : 'Loading...'}
          </div>
        ) : employees.length === 0 ? (
          <div className="p-10 text-center text-slate-400 text-sm">
            {t('noEvaluableEmployees')}
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-slate-50 text-slate-500 text-xs uppercase tracking-wide">
                  <th className="px-4 py-3 text-start">{t('employeeId')}</th>
                  <th className="px-4 py-3 text-start">{t('name')}</th>
                  <th className="px-4 py-3 text-center">{ar ? 'الحالة' : 'Status'}</th>
                  <th className="px-4 py-3 text-center">{t('totalScore')}</th>
                  <th className="px-4 py-3 text-center">{t('avgScore')}</th>
                  <th className="px-4 py-3 text-center">{ar ? 'مكافأة' : 'Bonus'}</th>
                  <th className="px-4 py-3 text-start">{ar ? 'إجراء' : 'Action'}</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {employees.map(emp => {
                  const ev    = evaluations.find(e => e.employee_id === emp.employee_id);
                  const total = ev ? CRITERIA.reduce((s, c) => s + (ev[c.key] || 0), 0) : null;
                  const avg   = total !== null ? (total / CRITERIA.length).toFixed(1) : null;
                  return (
                    <tr key={emp.employee_id} className="hover:bg-slate-50 transition-colors">
                      <td className="px-4 py-3 font-mono text-xs text-slate-500">{emp.employee_id}</td>
                      <td className="px-4 py-3 font-medium text-slate-800">{emp.name}</td>
                      <td className="px-4 py-3 text-center">
                        {ev
                          ? <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-700">{t('alreadyEvaluated')}</span>
                          : <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium bg-amber-100 text-amber-700">{t('notYetEvaluated')}</span>
                        }
                      </td>
                      <td className="px-4 py-3 text-center font-semibold text-slate-700">
                        {total !== null ? `${total} / 65` : '—'}
                      </td>
                      <td className="px-4 py-3 text-center text-slate-600">
                        {avg !== null ? avg : '—'}
                      </td>
                      <td className="px-4 py-3 text-center">
                        {ev
                          ? (ev.bonus_worthy
                              ? <span className="px-2 py-0.5 rounded-full text-xs font-bold bg-brand-100 text-brand-700">✓</span>
                              : <span className="text-slate-300">—</span>)
                          : <span className="text-slate-300">—</span>
                        }
                      </td>
                      <td className="px-4 py-3">
                        <button
                          className="btn btn-sm btn-primary"
                          onClick={() => openForm(emp)}
                        >
                          {ev ? t('edit') : t('add')}
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Evaluation modal */}
      {showForm && (
        <div
          className="fixed inset-0 bg-black/50 z-50 flex items-start justify-center pt-8 px-4 pb-4"
          onClick={e => { if (e.target === e.currentTarget) setShowForm(false); }}
        >
          <div
            className="bg-white rounded-2xl shadow-2xl w-full max-w-xl max-h-[90vh] flex flex-col"
            dir={ar ? 'rtl' : 'ltr'}
          >
            {/* Modal header — sticky */}
            <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between shrink-0">
              <div>
                <h3 className="font-bold text-slate-800 text-base">
                  {t('evaluationFor')}: <span className="text-brand-600">{selectedEmp?.name}</span>
                </h3>
                <p className="text-xs text-slate-500 mt-0.5">
                  {months[period.month - 1]} {period.year}
                </p>
              </div>
              <button
                onClick={() => setShowForm(false)}
                className="text-slate-400 hover:text-slate-700 transition-colors p-1 rounded-lg hover:bg-slate-100"
              >
                <X size={20} />
              </button>
            </div>

            {/* Scrollable form body */}
            <form onSubmit={handleSave} className="overflow-y-auto flex-1 px-6 py-4 space-y-1">

              {/* 13 criteria */}
              {CRITERIA.map((c, idx) => (
                <div
                  key={c.key}
                  className="flex items-center justify-between gap-3 py-2.5 border-b border-slate-50 last:border-0"
                >
                  <div className="flex items-start gap-2 flex-1 min-w-0">
                    <span className="text-xs text-slate-400 mt-0.5 w-5 shrink-0 text-center">{idx + 1}.</span>
                    <span className="text-sm text-slate-700 leading-snug">{t(c.labelKey)}</span>
                  </div>
                  <div className="flex gap-1 shrink-0">
                    {[1, 2, 3, 4, 5].map(n => (
                      <button
                        type="button"
                        key={n}
                        onClick={() => setFormScores(s => ({ ...s, [c.key]: n }))}
                        className={[
                          'w-8 h-8 rounded-full text-sm font-bold border-2 transition-all',
                          formScores[c.key] === n
                            ? 'bg-brand-600 text-white border-brand-600 scale-110 shadow-sm'
                            : 'bg-white text-slate-400 border-slate-200 hover:border-brand-400 hover:text-brand-600',
                        ].join(' ')}
                      >
                        {n}
                      </button>
                    ))}
                  </div>
                </div>
              ))}

              {/* Bonus worthy toggle */}
              <div className="flex items-center justify-between pt-4 pb-2 border-t border-slate-200 mt-2">
                <span className="text-sm text-slate-700 flex-1 leading-snug">{t('bonusWorthy')}</span>
                <button
                  type="button"
                  onClick={() => setBonusWorthy(b => !b)}
                  className={[
                    'relative w-12 h-6 rounded-full transition-colors shrink-0',
                    bonusWorthy ? 'bg-brand-600' : 'bg-slate-200',
                  ].join(' ')}
                >
                  <span
                    className={[
                      'absolute top-0.5 w-5 h-5 bg-white rounded-full shadow transition-all',
                      bonusWorthy
                        ? (ar ? 'left-0.5' : 'right-0.5')
                        : (ar ? 'right-0.5' : 'left-0.5'),
                    ].join(' ')}
                  />
                </button>
              </div>

              {/* Recommendations */}
              <div className="pt-2">
                <label className="form-label mb-1">{t('evalRecommendations')}</label>
                <textarea
                  className="form-input resize-none"
                  rows={3}
                  placeholder={ar ? 'أدخل توصياتك...' : 'Enter recommendations...'}
                  value={recommendations}
                  onChange={e => setRecommendations(e.target.value)}
                />
              </div>

              {/* Score summary bar */}
              <div className="bg-brand-50 rounded-xl p-3 flex gap-6 text-sm mt-2">
                <div>
                  <span className="text-slate-500">{t('totalScore')}: </span>
                  <strong className="text-brand-700">{totalInForm} / 65</strong>
                </div>
                <div>
                  <span className="text-slate-500">{t('avgScore')}: </span>
                  <strong className="text-brand-700">{avgInForm} / 5</strong>
                </div>
              </div>

              {error && (
                <div className="flex items-center gap-2 bg-red-50 border border-red-200 text-red-700 rounded-lg p-2 text-sm">
                  <AlertCircle size={14} className="shrink-0" />
                  {error}
                </div>
              )}

              {/* Actions */}
              <div className="flex justify-end gap-2 pt-3 pb-1">
                <button
                  type="button"
                  className="btn btn-secondary"
                  onClick={() => setShowForm(false)}
                >
                  {t('cancel')}
                </button>
                <button
                  type="submit"
                  className="btn btn-primary"
                  disabled={saving}
                >
                  {saving
                    ? <span className="text-xs opacity-70">{ar ? 'جاري الحفظ...' : 'Saving...'}</span>
                    : t('saveEvaluation')
                  }
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
