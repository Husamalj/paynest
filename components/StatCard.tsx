"use client";

import React from "react";
import clsx from "clsx";
import { LucideIcon } from "lucide-react";

const palette: Record<string, { iconWrap: string; accent: string }> = {
  brand: { iconWrap: "bg-brand-50 text-brand-600", accent: "text-brand-700" },
  green: { iconWrap: "bg-emerald-50 text-emerald-600", accent: "text-emerald-700" },
  red: { iconWrap: "bg-rose-50 text-rose-600", accent: "text-rose-700" },
  blue: { iconWrap: "bg-sky-50 text-sky-600", accent: "text-sky-700" },
  orange: { iconWrap: "bg-orange-50 text-orange-600", accent: "text-orange-700" },
  purple: { iconWrap: "bg-violet-50 text-violet-600", accent: "text-violet-700" },
  amber: { iconWrap: "bg-amber-50 text-amber-600", accent: "text-amber-700" },
  slate: { iconWrap: "bg-slate-100 text-slate-600", accent: "text-slate-700" },
};

interface StatCardProps {
  title: string;
  value: React.ReactNode;
  subtitle?: string;
  icon?: LucideIcon;
  color?: keyof typeof palette;
  trend?: number | null;
}

export default function StatCard({ title, value, subtitle, icon: Icon, color = "brand", trend }: StatCardProps) {
  const c = palette[color] || palette.brand;

  return (
    <div className="card group hover:shadow-elevated transition-shadow animate-fade-in p-4">
      <div className="flex flex-col gap-2">
        <div className="flex items-center justify-between gap-2">
          <p className="text-[10px] font-semibold text-slate-500 uppercase tracking-wider leading-tight line-clamp-2">{title}</p>
          {Icon && (
            <div className={clsx("w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0", c.iconWrap)}>
              <Icon size={15} strokeWidth={2} />
            </div>
          )}
        </div>
        <p className="text-[20px] font-bold text-slate-900 leading-tight truncate">{value}</p>
        {subtitle && <p className="text-xs text-slate-500 truncate">{subtitle}</p>}
        {trend !== undefined && trend !== null && (
          <p className={clsx("text-xs font-semibold inline-flex items-center gap-1", trend >= 0 ? "text-emerald-600" : "text-rose-600")}>
            {trend >= 0 ? "↑" : "↓"} {Math.abs(trend).toFixed(1)}%
          </p>
        )}
      </div>
    </div>
  );
}
