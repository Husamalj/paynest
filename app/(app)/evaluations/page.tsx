"use client";

import { useEffect, useState } from "react";
import { AlertTriangle, CheckCircle2, ClipboardList, Plus, Star, X, Trash2 } from "lucide-react";
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

const MAX_TOTAL = EVAL_CRITERIA.length * 5; // 65

function totalScore(ev: any) {
  return EVAL_CRITERIA.reduce((sum, c) => sum + (parseInt(ev[c.key]) || 0), 0);
}
// Each star = 20% of its criterion; the grade is the average of the 13
// criterion percentages, which simplifies to (totalScore / 65) * 100.
function grade100(ev: any) {
  return ((totalScore(ev) / MAX_TOTAL) * 100).toFixed(1);
}
function gradeFromScores(scores: Record<string, number>) {
  const sum = Object.values(scores).reduce((a: number, b: number) => a + (b || 0), 0);
  return (sum / MAX_TOTAL) * 100;
}
type BonusTier = { minGrade: number; maxGrade: number; amount: number };
// Auto-bonus: amount of the first tier whose [min, max] range contains the grade.
function bonusForGrade(grade: number, tiers: BonusTier[]) {
  const t = tiers.find((x) => grade >= x.minGrade && grade <= x.maxGrade);
  return t ? t.amount : 0;
}
function ScoreBar({ grade }: { grade: number }) {
  const pct = Math.round(grade);
  const color = pct >= 80 ? "bg-emerald-500" : pct >= 60 ? "bg-brand-500" : pct >= 40 ? "bg-amber-400" : "bg-rose-400";
  return (
    <div className="flex items-center gap-2">
      <div className="flex-1 h-1.5 rounded-full bg-slate-100">
        <div className={`h-1.5 rounded-full ${color}`} style={{ width: `${pct}%` }} />
      </div>
      <span className="text-xs font-semibold text-slate-700 w-14 text-right">{grade.toFixed(1)} / 100</span>
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
  const [modalRecs, setModalRecs]       = useState("");
  const [modalSaving, setModalSaving]   = useState(false);
  const [modalError, setModalError]     = useState("");

  // ── Bonus tiers (grade range → amount) ───────────────────────────────────
  const [tiers, setTiers]             = useState<BonusTier[]>([]);
  const [tiersSaving, setTiersSaving] = useState(false);
  const [tiersMsg, setTiersMsg]       = useState("");

  const loadTiers = async () => {
    try {
      const res = await api.get("/bonus-tiers");
      setTiers((res.data || []).map((t: any) => ({
        minGrade: t.minGrade, maxGrade: t.maxGrade, amount: t.amount,
      })));
    } catch { /* ignore */ }
  };

  const saveTiers = async () => {
    setTiersSaving(true); setTiersMsg("");
    try {
      const res = await api.put("/bonus-tiers", { tiers });
      setTiers((res.data || []).map((t: any) => ({
        minGrade: t.minGrade, maxGrade: t.maxGrade, amount: t.amount,
      })));
      setTiersMsg(ar ? "تم حفظ الشرائح" : "Tiers saved");
      setTimeout(() => setTiersMsg(""), 2500);
    } catch (e: any) { setTiersMsg(e.message); }
    finally { setTiersSaving(false); }
  };

  // ── Per-employee bonus exception (override) + bulk apply ──────────────────
  const [bonusEdit, setBonusEdit] = useState<Record<number, string>>({});
  const saveBonus = async (ev: any) => {
    try {
      const amount = parseInt(bonusEdit[ev.id] ?? "", 10);
      await api.patch(`/evaluations/${ev.id}`, { bonus_amount: isNaN(amount) ? 0 : amount });
      setEvaluations((p) => p.map((x) => x.id === ev.id ? { ...x, bonus_amount: isNaN(amount) ? 0 : amount, bonus_worthy: !isNaN(amount) && amount > 0, bonus_override: true } : x));
      setBonusEdit((p) => { const n = { ...p }; delete n[ev.id]; return n; });
      setSuccess(ar ? "تم حفظ الاستثناء" : "Exception saved");
    } catch (e: any) { setError(e.message); }
  };
  const clearBonus = async (ev: any) => {
    try {
      await api.patch(`/evaluations/${ev.id}`, { clear_override: true });
      const amount = bonusForGrade(parseFloat(grade100(ev)), tiers);
      setEvaluations((p) => p.map((x) => x.id === ev.id ? { ...x, bonus_override: false, bonus_amount: amount, bonus_worthy: amount > 0 } : x));
      setSuccess(ar ? "رجع للتلقائي" : "Reverted to tier");
    } catch (e: any) { setError(e.message); }
  };
  const applyTiersAll = async () => {
    try {
      const res = await api.post("/evaluations/apply-tiers", { month, year });
      setSuccess(ar ? `تم تطبيق الشرائح على ${res.data.updated} موظف` : `Applied tiers to ${res.data.updated}`);
      await load();
    } catch (e: any) { setError(e.message); }
  };

  const setTier = (i: number, field: keyof BonusTier, val: number) =>
    setTiers((arr) => arr.map((t, idx) => (idx === i ? { ...t, [field]: val } : t)));
  const addTier    = () => setTiers((arr) => [...arr, { minGrade: 0, maxGrade: 0, amount: 0 }]);
  const removeTier = (i: number) => setTiers((arr) => arr.filter((_, idx) => idx !== i));

  const load = async () => {
    setLoading(true); setError("");
    try {
      const res = await api.get("/evaluations", { params: { month, year } });
      setEvaluations(res.data || []);
    } catch (e: any) { setError(e.message); }
    finally { setLoading(false); }
  };

  const deleteEval = async (id: number) => {
    if (!confirm(ar ? "حذف هذا التقييم؟" : "Delete this evaluation?")) return;
    try {
      await api.delete(`/evaluations?id=${id}`);
      setSuccess(ar ? "تم حذف التقييم" : "Evaluation deleted");
      setTimeout(() => setSuccess(""), 2500);
      load();
    } catch (e: any) { setError(e.message); }
  };

  const loadEmployees = async () => {
    try {
      // Use supervisors endpoint — returns all employees except owner/super_admin (HR included)
      const res = await api.get("/supervisors");
      setEmployees(res.data?.employees || []);
    } catch { /* ignore */ }
  };

  // eslint-disable-next-line react-hooks/exhaustive-deps
  useEffect(() => { load(); }, [month, year]);
  useEffect(() => { loadEmployees(); loadTiers(); }, []);

  const openModal = (empId = "") => {
    setModalEmpId(empId);
    setModalScores(defaultScores());
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
        bonus_amount: bonusForGrade(gradeFromScores(modalScores), tiers),
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
    ? (evaluations.reduce((s, e) => s + parseFloat(grade100(e)), 0) / totalEvaluated).toFixed(1)
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
          <div className="text-2xl font-bold text-brand-600">{overallAvg}{totalEvaluated ? <span className="text-sm font-medium text-slate-400"> / 100</span> : null}</div>
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
              const grade = parseFloat(grade100(ev));
              const isExpanded = expandedId === ev.id;
              return (
                <div key={ev.id} className="hover:bg-slate-50 transition-colors">
                  <div className="flex items-center">
                  <button
                    className="flex-1 px-5 py-4 flex flex-wrap items-center gap-4 text-left"
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
                    <div className="w-44 hidden sm:block"><ScoreBar grade={grade} /></div>
                    <div className="flex items-center gap-1.5 shrink-0">
                      <Star size={13} className="text-amber-400 fill-amber-400" />
                      <span className="text-sm font-bold text-slate-700">{grade.toFixed(1)}</span>
                      <span className="text-xs text-slate-400">/ 100</span>
                    </div>
                    {ev.bonus_worthy || ev.bonus_amount > 0
                      ? <span className="badge badge-green text-[10px] shrink-0">{ar ? `مكافأة ${ev.bonus_amount ? `${ev.bonus_amount} د.أ` : "✓"}` : `Bonus ${ev.bonus_amount ? `${ev.bonus_amount} JD` : "✓"}`}</span>
                      : <span className="badge badge-gray text-[10px] shrink-0">{ar ? "بدون مكافأة" : "No bonus"}</span>
                    }
                    <span className="text-slate-400 text-xs shrink-0">{isExpanded ? "▲" : "▼"}</span>
                  </button>
                  {(role === "owner" || role === "hr") && (
                    <button
                      onClick={() => deleteEval(ev.id)}
                      title={ar ? "حذف" : "Delete"}
                      className="px-4 text-slate-300 hover:text-rose-500 shrink-0"
                    >
                      <Trash2 size={16} />
                    </button>
                  )}
                  </div>

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
                      {(role === "owner" || role === "hr") && (
                        <div className="mt-4 rounded-lg bg-white border border-slate-200 p-3 flex flex-wrap items-center gap-2">
                          <span className="text-xs font-semibold text-slate-500">{ar ? "المكافأة" : "Bonus"}:</span>
                          <span className="text-sm font-bold text-emerald-600">{ev.bonus_amount || 0} {ar ? "د.أ" : "JD"}</span>
                          {ev.bonus_override
                            ? <span className="badge badge-yellow text-[10px]">{ar ? "استثناء" : "Exception"}</span>
                            : <span className="badge badge-gray text-[10px]">{ar ? "حسب الشريحة" : "By tier"}</span>}
                          <div className="flex items-center gap-1 ms-auto">
                            <input type="number" min={0} className="form-input w-24 text-sm py-1" placeholder={ar ? "مبلغ مخصّص" : "Custom"} value={bonusEdit[ev.id] ?? ""} onChange={(e) => setBonusEdit((p) => ({ ...p, [ev.id]: e.target.value }))} />
                            <button className="btn btn-sm btn-primary" onClick={() => saveBonus(ev)}>{ar ? "حفظ استثناء" : "Save exception"}</button>
                            {ev.bonus_override && <button className="btn btn-sm btn-secondary" onClick={() => clearBonus(ev)}>{ar ? "رجوع للتلقائي" : "Use tier"}</button>}
                          </div>
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
                  {employees.map((emp: any) => {
                    const id = emp.employeeId || emp.employee_id;
                    return (
                      <option key={id} value={id}>
                        {emp.name} ({id})
                      </option>
                    );
                  })}
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

              {/* Bonus tiers (grade range → amount). Bonus is auto-applied by grade. */}
              <div className="pt-2 border-t border-slate-200 space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-sm font-semibold text-slate-700">
                    {ar ? "شرائح المكافأة التلقائية" : "Automatic Bonus Tiers"}
                  </span>
                  <button type="button" onClick={addTier} className="text-xs text-brand-600 font-medium hover:text-brand-800">
                    + {ar ? "إضافة شريحة" : "Add tier"}
                  </button>
                </div>
                {tiers.length === 0 ? (
                  <p className="text-xs text-slate-400">
                    {ar ? "لا توجد شرائح — أضف نطاق درجات ومبلغ المكافأة." : "No tiers — add a grade range and bonus amount."}
                  </p>
                ) : (
                  <div className="space-y-1.5">
                    {tiers.map((t, i) => (
                      <div key={i} className="flex items-center gap-2 text-sm">
                        <span className="text-xs text-slate-400 w-10">{ar ? "من" : "From"}</span>
                        <input type="number" min={0} max={100} value={t.minGrade}
                          onChange={(e) => setTier(i, "minGrade", +e.target.value)}
                          className="form-input w-16 py-1 px-2 text-center text-sm" dir="ltr" />
                        <span className="text-xs text-slate-400">{ar ? "إلى" : "to"}</span>
                        <input type="number" min={0} max={100} value={t.maxGrade}
                          onChange={(e) => setTier(i, "maxGrade", +e.target.value)}
                          className="form-input w-16 py-1 px-2 text-center text-sm" dir="ltr" />
                        <span className="text-xs text-slate-400">→</span>
                        <input type="number" min={0} value={t.amount}
                          onChange={(e) => setTier(i, "amount", +e.target.value)}
                          className="form-input w-20 py-1 px-2 text-center text-sm" dir="ltr" />
                        <span className="text-xs text-slate-500">{ar ? "د.أ" : "JD"}</span>
                        <button type="button" onClick={() => removeTier(i)} className="text-slate-300 hover:text-rose-500 ms-auto">
                          <X size={15} />
                        </button>
                      </div>
                    ))}
                  </div>
                )}
                <div className="flex items-center gap-3">
                  <button type="button" onClick={saveTiers} disabled={tiersSaving}
                    className="text-xs btn btn-secondary py-1 px-3">
                    {tiersSaving ? (ar ? "جاري الحفظ..." : "Saving...") : (ar ? "حفظ الشرائح" : "Save tiers")}
                  </button>
                  <button type="button" onClick={applyTiersAll}
                    className="text-xs btn btn-primary py-1 px-3">
                    {ar ? "تطبيق على كل الموظفين" : "Apply to all"}
                  </button>
                  {tiersMsg && <span className="text-xs text-emerald-600">{tiersMsg}</span>}
                </div>
              </div>

              {/* Recommendations */}
              <div>
                <label className="form-label mb-1">{ar ? "التوصيات" : "Recommendations"}</label>
                <textarea className="form-textarea" rows={2} value={modalRecs} onChange={(e) => setModalRecs(e.target.value)} placeholder={ar ? "أدخل توصياتك..." : "Enter recommendations..."} />
              </div>

              {/* Score summary + auto bonus */}
              <div className="bg-brand-50 rounded-xl p-3 flex gap-6 text-sm">
                <div>
                  <span className="text-slate-500">{ar ? "الدرجة" : "Grade"}: </span>
                  <strong className="text-brand-700">{gradeFromScores(modalScores).toFixed(1)} / 100</strong>
                </div>
                <div>
                  <span className="text-slate-500">{ar ? "المكافأة" : "Bonus"}: </span>
                  <strong className="text-emerald-600">
                    {bonusForGrade(gradeFromScores(modalScores), tiers)} {ar ? "د.أ" : "JD"}
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
