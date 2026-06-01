"use client";

import { useEffect, useState } from "react";
import { ClipboardList, X } from "lucide-react";
import api from "@/lib/api";

const EVAL_CRITERIA = [
  { key: "score_accuracy",          en: "Accuracy at Work",                        ar: "الدقة في العمل" },
  { key: "score_innovation",        en: "Innovative Problem Solving",              ar: "القدرة على التفكير بطرق مبتكرة لحل المشكلات" },
  { key: "score_speed",             en: "Task Completion Speed",                   ar: "السرعة في انجاز الاعمال الموكلة اليه" },
  { key: "score_development",       en: "Interest in Development & Improvement",   ar: "الاهتمام بتطوير وتحسين مستوى العمل" },
  { key: "score_quality_check",     en: "Output Quality Verification",             ar: "اعادة التأكد من مخرجات العمل" },
  { key: "score_prioritization",    en: "Prioritization",                          ar: "ترتيب الاولويات" },
  { key: "score_independence",      en: "Ability to Work Independently",           ar: "القدرة على العمل بدون اشراف" },
  { key: "score_deadlines",         en: "Meeting Deadlines",                       ar: "الالتزام بالمواعيد النهائية المحددة" },
  { key: "score_teamwork",          en: "Teamwork",                                ar: "العمل ضمن الفريق" },
  { key: "score_communication",     en: "Effective Communication",                 ar: "القدرة على التواصل الفعال" },
  { key: "score_knowledge_sharing", en: "Knowledge & Experience Sharing",          ar: "تبادل المعلومات والخبرات لتسهيل العمل المشترك" },
  { key: "score_feedback",          en: "Performance Improvement from Feedback",    ar: "تحسين الأداء بناءً على التغذية الراجعة" },
  { key: "score_compliance",        en: "Compliance with Management Instructions",  ar: "الالتزام بالتعليمات المقدمة من قبل الإدارة" },
];
const MONTHS_AR = ["يناير","فبراير","مارس","أبريل","مايو","يونيو","يوليو","أغسطس","سبتمبر","أكتوبر","نوفمبر","ديسمبر"];
const MONTHS_EN = ["January","February","March","April","May","June","July","August","September","October","November","December"];
const MAX_TOTAL = EVAL_CRITERIA.length * 5;
const defaultScores = () => Object.fromEntries(EVAL_CRITERIA.map((c) => [c.key, 3])) as Record<string, number>;
const gradeFromScores = (s: Record<string, number>) => (Object.values(s).reduce((a, b) => a + (b || 0), 0) / MAX_TOTAL) * 100;
const bonusForGrade = (grade: number, tiers: { minGrade: number; maxGrade: number; amount: number }[]) => {
  const t = tiers.find((x) => grade >= x.minGrade && grade <= x.maxGrade);
  return t ? t.amount : 0;
};

export default function EvaluationModal({
  employee, month, year, isRTL, onClose, onSaved,
}: {
  employee: any;
  month: number;
  year: number;
  isRTL: boolean;
  onClose: () => void;
  onSaved?: (empId: string) => void;
}) {
  const empId = employee.employeeId || employee.employee_id;
  const [scores, setScores] = useState<Record<string, number>>(defaultScores());
  const [recommendations, setRecommendations] = useState("");
  const [tiers, setTiers] = useState<{ minGrade: number; maxGrade: number; amount: number }[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    let cancelled = false;
    (async () => {
      setLoading(true);
      try {
        const tRes = await api.get("/bonus-tiers").catch(() => ({ data: [] }));
        if (!cancelled) setTiers((tRes.data || []).map((t: any) => ({ minGrade: t.minGrade, maxGrade: t.maxGrade, amount: t.amount })));
        const res = await api.get("/evaluations", { params: { employee_id: empId, month, year } });
        if (!cancelled && res.data) {
          setScores(Object.fromEntries(EVAL_CRITERIA.map((c) => [c.key, res.data[c.key] ?? 3])));
          setRecommendations(res.data.recommendations || "");
        }
      } catch { /* keep defaults */ }
      finally { if (!cancelled) setLoading(false); }
    })();
    return () => { cancelled = true; };
  }, [empId, month, year]);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true); setError("");
    try {
      await api.post("/evaluations", {
        employee_id: empId,
        period_month: month,
        period_year: year,
        ...scores,
        bonus_amount: bonusForGrade(gradeFromScores(scores), tiers),
        recommendations,
      });
      onSaved?.(empId);
      onClose();
    } catch (err: any) { setError(err.message); }
    finally { setSaving(false); }
  };

  return (
    <div className="fixed inset-0 bg-black/40 z-50 flex items-start justify-center pt-8 px-4" onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}>
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-xl max-h-[90vh] overflow-y-auto" dir={isRTL ? "rtl" : "ltr"}>
        <div className="sticky top-0 bg-white px-6 py-4 border-b border-slate-100 flex items-start justify-between z-10">
          <div>
            <h3 className="font-bold text-slate-800 flex items-center gap-2">
              <ClipboardList size={16} className="text-brand-600" />
              {isRTL ? "تقييم الموظف" : "Employee Evaluation"}: {employee.name}
            </h3>
            <p className="text-xs text-slate-500 mt-0.5">{(isRTL ? MONTHS_AR : MONTHS_EN)[month - 1]} {year}</p>
          </div>
          <button onClick={onClose} className="text-slate-400 hover:text-slate-700 mt-0.5"><X size={20} /></button>
        </div>

        {loading ? (
          <div className="flex items-center justify-center py-16 text-slate-400 gap-2"><span className="spinner spinner-dark w-5 h-5" />{isRTL ? "جاري التحميل..." : "Loading..."}</div>
        ) : (
          <form onSubmit={submit} className="px-6 py-5 space-y-3">
            {EVAL_CRITERIA.map((c, idx) => (
              <div key={c.key} className="flex items-center justify-between gap-3 py-2 border-b border-slate-50 last:border-0">
                <div className="flex items-start gap-2 flex-1 min-w-0">
                  <span className="text-xs text-slate-400 mt-0.5 w-5 shrink-0">{idx + 1}.</span>
                  <span className="text-sm text-slate-700 leading-snug">{isRTL ? c.ar : c.en}</span>
                </div>
                <div className="flex gap-1 shrink-0">
                  {[1, 2, 3, 4, 5].map((n) => (
                    <button type="button" key={n} onClick={() => setScores((s) => ({ ...s, [c.key]: n }))}
                      className={`w-8 h-8 rounded-full text-sm font-bold border-2 transition-all ${scores[c.key] === n ? "bg-brand-600 text-white border-brand-600 scale-110" : "bg-white text-slate-400 border-slate-200 hover:border-brand-400 hover:text-brand-600"}`}>
                      {n}
                    </button>
                  ))}
                </div>
              </div>
            ))}

            <div className="pt-3 border-t border-slate-200 flex items-center justify-between text-sm">
              <span className="text-slate-700 font-medium">{isRTL ? "المكافأة التلقائية" : "Automatic Bonus"}</span>
              <strong className="text-emerald-600">{bonusForGrade(gradeFromScores(scores), tiers)} {isRTL ? "د.أ" : "JD"}</strong>
            </div>

            <div>
              <label className="form-label mb-1">{isRTL ? "التوصيات" : "Recommendations"}</label>
              <textarea className="form-textarea" rows={3} placeholder={isRTL ? "أدخل توصياتك..." : "Enter recommendations..."} value={recommendations} onChange={(e) => setRecommendations(e.target.value)} />
            </div>

            <div className="bg-brand-50 rounded-xl p-3 text-sm">
              <span className="text-slate-500">{isRTL ? "الدرجة" : "Grade"}: </span>
              <strong className="text-brand-700">{gradeFromScores(scores).toFixed(1)} / 100</strong>
            </div>

            {error && <div className="text-red-600 text-sm bg-red-50 rounded-lg p-2">{error}</div>}

            <div className="flex justify-end gap-2 pt-2">
              <button type="button" className="btn btn-secondary" onClick={onClose}>{isRTL ? "إلغاء" : "Cancel"}</button>
              <button type="submit" className="btn btn-primary" disabled={saving}>
                {saving ? <><span className="spinner" />{isRTL ? "جاري الحفظ..." : "Saving..."}</> : <><ClipboardList size={15} />{isRTL ? "حفظ التقييم" : "Save Evaluation"}</>}
              </button>
            </div>
          </form>
        )}
      </div>
    </div>
  );
}
