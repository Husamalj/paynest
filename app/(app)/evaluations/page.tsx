"use client";

import { useEffect, useState } from "react";
import { AlertTriangle, ClipboardList, Star } from "lucide-react";
import api from "@/lib/api";
import { useLanguage } from "@/lib/i18n/LanguageContext";

const SCORE_KEYS = [
  "score_accuracy", "score_innovation", "score_speed", "score_development",
  "score_quality_check", "score_prioritization", "score_independence",
  "score_deadlines", "score_teamwork", "score_communication",
  "score_knowledge_sharing", "score_feedback", "score_compliance",
];

const MONTHS_AR = ["يناير","فبراير","مارس","أبريل","مايو","يونيو","يوليو","أغسطس","سبتمبر","أكتوبر","نوفمبر","ديسمبر"];
const MONTHS_EN = ["January","February","March","April","May","June","July","August","September","October","November","December"];

function totalScore(ev: any) {
  return SCORE_KEYS.reduce((sum, k) => sum + (parseInt(ev[k]) || 0), 0);
}

function avgScore(ev: any) {
  return (totalScore(ev) / SCORE_KEYS.length).toFixed(1);
}

function ScoreBar({ value, max = 65 }: { value: number; max?: number }) {
  const pct = Math.round((value / max) * 100);
  const color = pct >= 80 ? "bg-emerald-500" : pct >= 60 ? "bg-brand-500" : pct >= 40 ? "bg-amber-400" : "bg-rose-400";
  return (
    <div className="flex items-center gap-2">
      <div className="flex-1 h-1.5 rounded-full bg-slate-100">
        <div className={`h-1.5 rounded-full ${color}`} style={{ width: `${pct}%` }} />
      </div>
      <span className="text-xs font-semibold text-slate-700 w-12 text-right">{value} / {max}</span>
    </div>
  );
}

export default function EvaluationsPage() {
  const { lang } = useLanguage();
  const ar = lang === "ar";
  const now = new Date();
  const role = typeof window !== "undefined" ? localStorage.getItem("role") : null;

  const [month, setMonth] = useState(now.getMonth() + 1);
  const [year, setYear] = useState(now.getFullYear());
  const [evaluations, setEvaluations] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [expandedId, setExpandedId] = useState<number | null>(null);

  useEffect(() => { load(); }, [month, year]);

  const load = async () => {
    setLoading(true);
    setError("");
    try {
      const res = await api.get("/evaluations", { params: { month, year } });
      setEvaluations(res.data || []);
    } catch (e: any) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  };

  const months = ar ? MONTHS_AR : MONTHS_EN;
  const yearOptions = [now.getFullYear() - 1, now.getFullYear(), now.getFullYear() + 1];

  const totalEvaluated = evaluations.length;
  const withBonus = evaluations.filter((e) => e.bonus_worthy).length;
  const overallAvg = totalEvaluated
    ? (evaluations.reduce((s, e) => s + totalScore(e), 0) / totalEvaluated / SCORE_KEYS.length).toFixed(1)
    : "—";

  return (
    <div className="space-y-6" dir={ar ? "rtl" : "ltr"}>
      {/* Header */}
      <div className="flex items-center gap-3 pb-2 border-b border-slate-200">
        <ClipboardList className="text-brand-600" size={22} />
        <h2 className="text-xl font-bold text-slate-800">
          {ar ? "نتائج تقييمات الموظفين" : "Employee Evaluation Results"}
        </h2>
      </div>

      {error && (
        <div className="alert alert-error"><AlertTriangle size={16} />{error}</div>
      )}

      {/* Period selector */}
      <div className="card p-4 flex flex-wrap items-center gap-4">
        <span className="text-sm font-medium text-slate-600">
          {ar ? "الفترة:" : "Period:"}
        </span>
        <select
          className="form-select w-36 text-sm"
          value={month}
          onChange={(e) => setMonth(+e.target.value)}
        >
          {months.map((m, i) => <option key={i + 1} value={i + 1}>{m}</option>)}
        </select>
        <select
          className="form-select w-28 text-sm"
          value={year}
          onChange={(e) => setYear(+e.target.value)}
        >
          {yearOptions.map((y) => <option key={y} value={y}>{y}</option>)}
        </select>
        <span className="text-xs text-slate-400 ms-auto">
          {months[month - 1]} {year}
        </span>
      </div>

      {/* Summary cards */}
      <div className="grid grid-cols-3 gap-4">
        <div className="card text-center py-5">
          <div className="text-2xl font-bold text-slate-900">{totalEvaluated}</div>
          <div className="text-xs text-slate-500 mt-1">{ar ? "تقييمات مقدمة" : "Evaluations Submitted"}</div>
        </div>
        <div className="card text-center py-5">
          <div className="text-2xl font-bold text-brand-600">{overallAvg}</div>
          <div className="text-xs text-slate-500 mt-1">{ar ? "متوسط الأداء" : "Avg Performance"}</div>
        </div>
        <div className="card text-center py-5">
          <div className="text-2xl font-bold text-emerald-600">{withBonus}</div>
          <div className="text-xs text-slate-500 mt-1">{ar ? "مرشحون للمكافأة" : "Bonus Recommended"}</div>
        </div>
      </div>

      {/* Results table */}
      <div className="card overflow-hidden">
        <div className="px-5 py-3 border-b border-slate-100 flex items-center gap-2">
          <ClipboardList size={15} className="text-brand-600" />
          <span className="font-semibold text-slate-700 text-sm">
            {ar ? "تفاصيل التقييمات" : "Evaluation Details"} — {months[month - 1]} {year}
          </span>
        </div>

        {loading ? (
          <div className="flex items-center justify-center py-16 gap-2 text-slate-400">
            <span className="spinner spinner-dark w-5 h-5" />
            {ar ? "جاري التحميل..." : "Loading..."}
          </div>
        ) : evaluations.length === 0 ? (
          <div className="py-16 text-center text-slate-400 text-sm">
            <ClipboardList size={32} className="mx-auto mb-3 opacity-30" />
            {ar ? "لا توجد تقييمات لهذه الفترة" : "No evaluations submitted for this period"}
          </div>
        ) : (
          <div className="divide-y divide-slate-100">
            {evaluations.map((ev) => {
              const total = totalScore(ev);
              const avg = avgScore(ev);
              const isExpanded = expandedId === ev.id;

              return (
                <div key={ev.id} className="hover:bg-slate-50 transition-colors">
                  {/* Summary row */}
                  <button
                    className="w-full px-5 py-4 flex flex-wrap items-center gap-4 text-left"
                    onClick={() => setExpandedId(isExpanded ? null : ev.id)}
                  >
                    {/* Avatar + name */}
                    <div className="flex items-center gap-3 min-w-0 flex-1">
                      <div className="w-9 h-9 rounded-full bg-brand-100 text-brand-700 flex items-center justify-center font-bold text-sm flex-shrink-0">
                        {(ev.employee_name || "?").charAt(0).toUpperCase()}
                      </div>
                      <div className="min-w-0">
                        <div className="font-semibold text-slate-900 truncate">{ev.employee_name || ev.employee_id}</div>
                        {role === "owner" && ev.evaluator_name && (
                          <div className="text-[11px] text-slate-400">
                            {ar ? "بواسطة" : "By"}: {ev.evaluator_name}
                          </div>
                        )}
                      </div>
                    </div>

                    {/* Score bar */}
                    <div className="w-44 hidden sm:block">
                      <ScoreBar value={total} />
                    </div>

                    {/* Avg badge */}
                    <div className="flex items-center gap-1.5 shrink-0">
                      <Star size={13} className="text-amber-400 fill-amber-400" />
                      <span className="text-sm font-bold text-slate-700">{avg}</span>
                      <span className="text-xs text-slate-400">/ 5</span>
                    </div>

                    {/* Bonus badge */}
                    {ev.bonus_worthy ? (
                      <span className="badge badge-green text-[10px] shrink-0">
                        {ar ? "مكافأة ✓" : "Bonus ✓"}
                      </span>
                    ) : (
                      <span className="badge badge-gray text-[10px] shrink-0">
                        {ar ? "بدون مكافأة" : "No bonus"}
                      </span>
                    )}

                    {/* Chevron */}
                    <span className="text-slate-400 text-xs shrink-0">
                      {isExpanded ? "▲" : "▼"}
                    </span>
                  </button>

                  {/* Expanded detail */}
                  {isExpanded && (
                    <div className="px-5 pb-5 bg-slate-50 border-t border-slate-100">
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-8 gap-y-2 mt-4">
                        {[
                          { key: "score_accuracy",          en: "Accuracy at Work",                        ar: "الدقة في العمل" },
                          { key: "score_innovation",        en: "Innovative Problem Solving",              ar: "التفكير المبتكر" },
                          { key: "score_speed",             en: "Task Completion Speed",                   ar: "السرعة في الإنجاز" },
                          { key: "score_development",       en: "Interest in Development",                 ar: "الاهتمام بالتطوير" },
                          { key: "score_quality_check",     en: "Output Quality Verification",             ar: "التأكد من مخرجات العمل" },
                          { key: "score_prioritization",    en: "Prioritization",                          ar: "ترتيب الأولويات" },
                          { key: "score_independence",      en: "Works Independently",                     ar: "العمل دون إشراف" },
                          { key: "score_deadlines",         en: "Meeting Deadlines",                       ar: "الالتزام بالمواعيد" },
                          { key: "score_teamwork",          en: "Teamwork",                                ar: "العمل الجماعي" },
                          { key: "score_communication",     en: "Effective Communication",                 ar: "التواصل الفعال" },
                          { key: "score_knowledge_sharing", en: "Knowledge Sharing",                       ar: "مشاركة المعرفة" },
                          { key: "score_feedback",          en: "Improvement from Feedback",               ar: "التحسن من التغذية الراجعة" },
                          { key: "score_compliance",        en: "Compliance with Instructions",            ar: "الالتزام بالتعليمات" },
                        ].map((c) => {
                          const val = parseInt(ev[c.key]) || 0;
                          return (
                            <div key={c.key} className="flex items-center justify-between gap-3 py-1.5 border-b border-slate-100 last:border-0">
                              <span className="text-xs text-slate-600 flex-1">{ar ? c.ar : c.en}</span>
                              <div className="flex gap-0.5 shrink-0">
                                {[1, 2, 3, 4, 5].map((n) => (
                                  <span
                                    key={n}
                                    className={`w-5 h-5 rounded-full text-[10px] font-bold flex items-center justify-center ${
                                      n <= val
                                        ? "bg-brand-600 text-white"
                                        : "bg-slate-200 text-slate-400"
                                    }`}
                                  >
                                    {n}
                                  </span>
                                ))}
                              </div>
                            </div>
                          );
                        })}
                      </div>

                      {/* Recommendations */}
                      {ev.recommendations && (
                        <div className="mt-4 rounded-lg bg-white border border-slate-200 p-3">
                          <div className="text-xs font-semibold text-slate-500 mb-1">
                            {ar ? "التوصيات" : "Recommendations"}
                          </div>
                          <p className="text-sm text-slate-700">{ev.recommendations}</p>
                        </div>
                      )}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
