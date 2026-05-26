"use client";

import { useEffect, useState } from "react";
import { AlertTriangle, CheckCircle2, ClipboardList, Plus, Star, X } from "lucide-react";
import api from "@/lib/api";
import { useLanguage } from "@/lib/i18n/LanguageContext";

const EVAL_CRITERIA = [
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
];

const MONTHS_AR = ["يناير","فبراير","مارس","أبريل","مايو","يونيو","يوليو","أغسطس","سبتمبر","أكتوبر","نوفمبر","ديسمبر"];
const MONTHS_EN = ["January","February","March","April","May","June","July","August","September","October","November","December"];

const defaultScores = () => Object.fromEntries(EVAL_CRITERIA.map((c) => [c.key, 3]));

function totalScore(ev: any) {
  return EVAL_CRITERIA.reduce((sum, c) => sum + (parseInt(ev[c.key]) || 0), 0);
}
function avgScore(ev: any) {
  return (totalScore(ev) / EVAL_CRITERIA.length).toFixed(1);
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
  const [year, setYear]   = useState(now.getFullYear());
  const [evaluations, setEvaluations] = useState<any[]>([]);
  const [employees, setEmployees]     = useState<any[]>([]);
  const [loading, setLoading]         = useState(true);
  const [error, setError]             = useState("");
  const [success, setSuccess]         = useState("");
  const [expandedId, setExpandedId]   = useState<number | null>(null);

  // ── Add Evaluation Modal ─────────────────────────────────────────────────
  const [showModal, setShowModal]       = useState(false);
  const [modalEmpId, setModalEmpId]     = useState("");
  const [modalScores, setModalScores]   = useState<Record<string, number>>(defaultScores());
  const [modalBonus, setModalBonus]     = useState(false);
  const [modalRecs, setModalRecs]       = useState("");
  const [modalSaving, setModalSaving]   = useState(false);
  const [modalError, setModalError]     = useState("");

  useEffect(() => { load(); }, [month, year]);
  useEffect(() => { loadEmployees(); }, []);

  const load = async () => {
    setLoading(true); setError("");
    try {
      const res = await api.get("/evaluations", { params: { month, year } });
      setEvaluations(res.data || []);
    } catch (e: any) { setError(e.message); }
    finally { setLoading(false); }
  };

  const loadEmployees = async () => {
    try {
      const res = await api.get("/employees");
      setEmployees(res.data || []);
    } catch { /* ignore */ }
  };

  const openModal = (empId = "") => {
    setModalEmpId(empId);
    setModalScores(defaultScores());
    setModalBonus(false);
    setModalRecs("");
    setModalError("");
    setShowModal(true);
  };

  const submitEval = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!modalEmpId) { setModalError(ar ? "اختر موظفًا" : "Select an employee"); return; }
    setModalSaving(true); setModalError("");
    try {
      await api.post("/evaluations", {
        employee_id: modalEmpId,
        period_month: month,
        period_year: year,
        ...modalScores,
        bonus_worthy: modalBonus,
        recommendations: modalRecs,
      });
      setSuccess(ar ? "تم حفظ التقييم بنجاح" : "Evaluation saved successfully");
      setShowModal(false);
      setTimeout(() => setSuccess(""), 3000);
      load();
    } catch (err: any) { setModalError(err.message); }
    finally { setModalSaving(false); }
  };

  const months = ar ? MONTHS_AR : MONTHS_EN;
  const yearOptions = [now.getFullYear() - 1, now.getFullYear(), now.getFullYear() + 1];

  const totalEvaluated = evaluations.length;
  const withBonus = evaluations.filter((e) => e.bonus_worthy).length;
  const overallAvg = totalEvaluated
    ? (evaluations.reduce((s, e) => s + totalScore(e), 0) / totalEvaluated / EVAL_CRITERIA.length).toFixed(1)
    : "—";

  return (
    <div className="space-y-6" dir={ar ? "rtl" : "ltr"}>
      {/* Header */}
      <div className="flex items-center justify-between pb-2 border-b border-slate-200">
        <div className="flex items-center gap-3">
          <ClipboardList className="text-brand-600" size={22} />
          <h2 className="text-xl font-bold text-slate-800">
            {ar ? "نتائج تقييمات الموظفين" : "Employee Evaluation Results"}
          </h2>
        </div>
        {(role === "owner" || role === "hr") && (
          <button className="btn btn-primary gap-2" onClick={() => openModal()}>
            <Plus size={15} />
            {ar ? "إضافة تقييم" : "Add Evaluation"}
          </button>
        )}
      </div>

      {error   && <div className="alert alert-error"><AlertTriangle size={16} />{error}</div>}
      {success && <div className="alert alert-success"><CheckCircle2 size={16} />{success}</div>}

      {/* Period selector */}
      <div className="card p-4 flex flex-wrap items-center gap-4">
        <span className="text-sm font-medium text-slate-600">{ar ? "الفترة:" : "Period:"}</span>
        <select className="form-select w-36 text-sm" value={month} onChange={(e) => setMonth(+e.target.value)}>
          {months.map((m, i) => <option key={i + 1} value={i + 1}>{m}</option>)}
        </select>
        <select className="form-select w-28 text-sm" value={year} onChange={(e) => setYear(+e.target.value)}>
          {yearOptions.map((y) => <option key={y} value={y}>{y}</option>)}
        </select>
        <span className="text-xs text-slate-400 ms-auto">{months[month - 1]} {year}</span>
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
                  <button
                    className="w-full px-5 py-4 flex flex-wrap items-center gap-4 text-left"
                    onClick={() => setExpandedId(isExpanded ? null : ev.id)}
                  >
                    <div className="flex items-center gap-3 min-w-0 flex-1">
                      <div className="w-9 h-9 rounded-full bg-brand-100 text-brand-700 flex items-center justify-center font-bold text-sm flex-shrink-0">
                        {(ev.employee_name || "?").charAt(0).toUpperCase()}
                      </div>
                      <div className="min-w-0">
                        <div className="font-semibold text-slate-900 truncate">{ev.employee_name || ev.employee_id}</div>
                        {ev.evaluator_name && (
                          <div className="text-[11px] text-slate-400">
                            {ar ? "بواسطة" : "By"}: {ev.evaluator_name}
                          </div>
                        )}
                      </div>
                    </div>
                    <div className="w-44 hidden sm:block"><ScoreBar value={total} /></div>
                    <div className="flex items-center gap-1.5 shrink-0">
                      <Star size={13} className="text-amber-400 fill-amber-400" />
                      <span className="text-sm font-bold text-slate-700">{avg}</span>
                      <span className="text-xs text-slate-400">/ 5</span>
                    </div>
                    {ev.bonus_worthy
                      ? <span className="badge badge-green text-[10px] shrink-0">{ar ? "مكافأة ✓" : "Bonus ✓"}</span>
                      : <span className="badge badge-gray text-[10px] shrink-0">{ar ? "بدون مكافأة" : "No bonus"}</span>
                    }
                    <span className="text-slate-400 text-xs shrink-0">{isExpanded ? "▲" : "▼"}</span>
                  </button>

                  {isExpanded && (
                    <div className="px-5 pb-5 bg-slate-50 border-t border-slate-100">
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-8 gap-y-2 mt-4">
                        {EVAL_CRITERIA.map((c) => {
                          const val = parseInt(ev[c.key]) || 0;
                          return (
                            <div key={c.key} className="flex items-center justify-between gap-3 py-1.5 border-b border-slate-100 last:border-0">
                              <span className="text-xs text-slate-600 flex-1">{ar ? c.ar : c.en}</span>
                              <div className="flex gap-0.5 shrink-0">
                                {[1, 2, 3, 4, 5].map((n) => (
                                  <span key={n} className={`w-5 h-5 rounded-full text-[10px] font-bold flex items-center justify-center ${n <= val ? "bg-brand-600 text-white" : "bg-slate-200 text-slate-400"}`}>
                                    {n}
                                  </span>
                                ))}
                              </div>
                            </div>
                          );
                        })}
                      </div>
                      {ev.recommendations && (
                        <div className="mt-4 rounded-lg bg-white border border-slate-200 p-3">
                          <div className="text-xs font-semibold text-slate-500 mb-1">{ar ? "التوصيات" : "Recommendations"}</div>
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

      {/* ── Add Evaluation Modal ─────────────────────────────────────────── */}
      {showModal && (
        <div className="fixed inset-0 bg-black/40 z-50 flex items-start justify-center pt-8 px-4" onClick={(e) => { if (e.target === e.currentTarget) setShowModal(false); }}>
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-xl max-h-[90vh] overflow-y-auto" dir={ar ? "rtl" : "ltr"}>
            {/* Header */}
            <div className="sticky top-0 bg-white px-6 py-4 border-b border-slate-100 flex items-center justify-between z-10">
              <h3 className="font-bold text-slate-800 flex items-center gap-2">
                <ClipboardList size={16} className="text-brand-600" />
                {ar ? "إضافة تقييم" : "Add Evaluation"} — {months[month - 1]} {year}
              </h3>
              <button onClick={() => setShowModal(false)} className="text-slate-400 hover:text-slate-700"><X size={20} /></button>
            </div>

            <form onSubmit={submitEval} className="px-6 py-5 space-y-4">
              {/* Employee picker */}
              <div>
                <label className="form-label">{ar ? "اختر الموظف" : "Select Employee"} *</label>
                <select className="form-select" value={modalEmpId} onChange={(e) => setModalEmpId(e.target.value)} required>
                  <option value="">{ar ? "-- اختر --" : "-- Choose --"}</option>
                  {employees.map((emp: any) => (
                    <option key={emp.employee_id || emp.employeeId} value={emp.employee_id || emp.employeeId}>
                      {emp.name} ({emp.employee_id || emp.employeeId})
                    </option>
                  ))}
                </select>
              </div>

              {/* Score criteria */}
              <div className="space-y-1">
                {EVAL_CRITERIA.map((c, idx) => (
                  <div key={c.key} className="flex items-center justify-between gap-3 py-2 border-b border-slate-50 last:border-0">
                    <div className="flex items-start gap-2 flex-1 min-w-0">
                      <span className="text-xs text-slate-400 mt-0.5 w-5 shrink-0">{idx + 1}.</span>
                      <span className="text-sm text-slate-700 leading-snug">{ar ? c.ar : c.en}</span>
                    </div>
                    <div className="flex gap-1 shrink-0">
                      {[1, 2, 3, 4, 5].map((n) => (
                        <button type="button" key={n}
                          onClick={() => setModalScores((s) => ({ ...s, [c.key]: n }))}
                          className={`w-8 h-8 rounded-full text-sm font-bold border-2 transition-all ${
                            modalScores[c.key] === n
                              ? "bg-brand-600 text-white border-brand-600 scale-110"
                              : "bg-white text-slate-400 border-slate-200 hover:border-brand-400 hover:text-brand-600"
                          }`}>
                          {n}
                        </button>
                      ))}
                    </div>
                  </div>
                ))}
              </div>

              {/* Bonus toggle */}
              <div className="flex items-center justify-between pt-2 border-t border-slate-200">
                <span className="text-sm text-slate-700 flex-1">
                  {ar ? "هل يستحق مكافأة (100–125 دينار)؟" : "Deserves a bonus (100–125 JD)?"}
                </span>
                <button type="button" onClick={() => setModalBonus((b) => !b)}
                  className={`relative w-12 h-6 rounded-full transition-all shrink-0 ${modalBonus ? "bg-brand-600" : "bg-slate-200"}`}>
                  <span className={`absolute top-0.5 w-5 h-5 bg-white rounded-full shadow transition-all ${modalBonus ? (ar ? "left-0.5" : "right-0.5") : (ar ? "right-0.5" : "left-0.5")}`} />
                </button>
              </div>

              {/* Recommendations */}
              <div>
                <label className="form-label mb-1">{ar ? "التوصيات" : "Recommendations"}</label>
                <textarea className="form-textarea" rows={2} value={modalRecs} onChange={(e) => setModalRecs(e.target.value)} placeholder={ar ? "أدخل توصياتك..." : "Enter recommendations..."} />
              </div>

              {/* Score summary */}
              <div className="bg-brand-50 rounded-xl p-3 flex gap-6 text-sm">
                <div>
                  <span className="text-slate-500">{ar ? "المجموع" : "Total"}: </span>
                  <strong className="text-brand-700">{Object.values(modalScores).reduce((a: number, b: number) => a + b, 0)} / 65</strong>
                </div>
                <div>
                  <span className="text-slate-500">{ar ? "المعدل" : "Avg"}: </span>
                  <strong className="text-brand-700">
                    {(Object.values(modalScores).reduce((a: number, b: number) => a + b, 0) / EVAL_CRITERIA.length).toFixed(1)}
                  </strong>
                </div>
              </div>

              {modalError && <div className="text-red-600 text-sm bg-red-50 rounded-lg p-2">{modalError}</div>}

              <div className="flex justify-end gap-2 pt-1">
                <button type="button" className="btn btn-secondary" onClick={() => setShowModal(false)}>{ar ? "إلغاء" : "Cancel"}</button>
                <button type="submit" className="btn btn-primary" disabled={modalSaving}>
                  {modalSaving
                    ? <><span className="spinner" />{ar ? "جاري الحفظ..." : "Saving..."}</>
                    : <><ClipboardList size={15} />{ar ? "حفظ التقييم" : "Save Evaluation"}</>
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
