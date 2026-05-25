import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Calendar, Clock, Building2, Languages, AlertTriangle, ArrowRight } from 'lucide-react';
import { useLanguage } from '../hooks/useLanguage';
import api from '../utils/api';
import clsx from 'clsx';

export default function SystemSelect({ onSettingsSaved }) {
  const { t, toggleLanguage, lang } = useLanguage();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleSelect = async (mode) => {
    setLoading(true);
    setError('');
    try {
      const res = await api.put('/settings', { system_mode: mode });
      if (onSettingsSaved) onSettingsSaved(res.data);
      navigate('/');
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex flex-col items-center justify-center p-6 bg-gradient-to-br from-slate-50 via-brand-50/30 to-slate-100">
      {/* Lang toggle top corner */}
      <div className="absolute top-5 right-5">
        <button onClick={() => toggleLanguage()} className="btn btn-secondary">
          <Languages size={15} />
          {lang === 'en' ? 'العربية' : 'English'}
        </button>
      </div>

      {/* Brand */}
      <div className="text-center mb-12">
        <div className="inline-flex w-16 h-16 rounded-2xl bg-gradient-to-br from-brand-500 to-brand-700 items-center justify-center text-white shadow-elevated mb-4">
          <Building2 size={30} strokeWidth={2.5} />
        </div>
        <h1 className="text-3xl font-bold text-slate-900 mb-2">PayNest</h1>
        <p className="text-sm text-slate-500">{t('selectMode')}</p>
      </div>

      {error && (
        <div className="alert alert-error max-w-xl w-full mb-6">
          <AlertTriangle size={16} />
          {error}
        </div>
      )}

      {/* Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-5 max-w-3xl w-full">
        {[
          {
            value: 'daily',
            label: t('dailyMode'),
            desc: t('dailyModeDesc'),
            Icon: Calendar,
            ring: 'hover:ring-emerald-500/40 hover:border-emerald-400',
            iconBg: 'bg-emerald-50 text-emerald-600',
            btn: 'btn-success',
          },
          {
            value: 'hours',
            label: t('hoursMode'),
            desc: t('hoursModeDesc'),
            Icon: Clock,
            ring: 'hover:ring-brand-500/40 hover:border-brand-400',
            iconBg: 'bg-brand-50 text-brand-600',
            btn: 'btn-primary',
          },
        ].map((mode) => (
          <button
            key={mode.value}
            type="button"
            onClick={() => !loading && handleSelect(mode.value)}
            disabled={loading}
            className={clsx(
              'group bg-white rounded-2xl p-8 text-left border-2 border-transparent transition-all duration-200',
              'shadow-card hover:shadow-elevated hover:-translate-y-1',
              'ring-2 ring-transparent',
              mode.ring,
              loading && 'opacity-70 cursor-not-allowed'
            )}
          >
            <div className={clsx('w-14 h-14 rounded-2xl flex items-center justify-center mb-5', mode.iconBg)}>
              <mode.Icon size={26} strokeWidth={2} />
            </div>
            <h2 className="text-xl font-bold text-slate-900 mb-2">{mode.label}</h2>
            <p className="text-sm text-slate-500 leading-relaxed mb-6">{mode.desc}</p>
            <div className={clsx('btn w-full', mode.btn)}>
              {loading ? <span className="spinner" /> : null}
              {t('selectThisMode')}
              <ArrowRight size={15} className="rtl:rotate-180" />
            </div>
          </button>
        ))}
      </div>

      <p className="mt-8 text-xs text-slate-500">
        {lang === 'en'
          ? 'You can change the mode later in Settings.'
          : 'يمكنك تغيير النظام لاحقاً من الإعدادات.'}
      </p>
    </div>
  );
}
