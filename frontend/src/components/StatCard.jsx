import React from 'react';
import clsx from 'clsx';

const palette = {
  brand: { iconWrap: 'bg-brand-50 text-brand-600', accent: 'text-brand-700' },
  green: { iconWrap: 'bg-emerald-50 text-emerald-600', accent: 'text-emerald-700' },
  red: { iconWrap: 'bg-rose-50 text-rose-600', accent: 'text-rose-700' },
  blue: { iconWrap: 'bg-sky-50 text-sky-600', accent: 'text-sky-700' },
  orange: { iconWrap: 'bg-orange-50 text-orange-600', accent: 'text-orange-700' },
  purple: { iconWrap: 'bg-violet-50 text-violet-600', accent: 'text-violet-700' },
  amber: { iconWrap: 'bg-amber-50 text-amber-600', accent: 'text-amber-700' },
  slate: { iconWrap: 'bg-slate-100 text-slate-600', accent: 'text-slate-700' },
};

export default function StatCard({ title, value, subtitle, icon: Icon, color = 'brand', trend }) {
  const c = palette[color] || palette.brand;

  return (
    <div className="card group hover:shadow-elevated transition-shadow animate-fade-in">
      <div className="flex items-start justify-between gap-3">
        <div className="flex-1 min-w-0">
          <p className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider mb-2">
            {title}
          </p>
          <p className="text-[22px] font-bold text-slate-900 leading-tight truncate">
            {value}
          </p>
          {subtitle && (
            <p className="text-xs text-slate-500 mt-1.5 truncate">{subtitle}</p>
          )}
          {trend !== undefined && trend !== null && (
            <p
              className={clsx(
                'text-xs font-semibold mt-2 inline-flex items-center gap-1',
                trend >= 0 ? 'text-emerald-600' : 'text-rose-600'
              )}
            >
              {trend >= 0 ? '↑' : '↓'} {Math.abs(trend).toFixed(1)}%
            </p>
          )}
        </div>
        {Icon && (
          <div
            className={clsx(
              'w-11 h-11 rounded-xl flex items-center justify-center flex-shrink-0',
              c.iconWrap
            )}
          >
            <Icon size={20} strokeWidth={2} />
          </div>
        )}
      </div>
    </div>
  );
}
