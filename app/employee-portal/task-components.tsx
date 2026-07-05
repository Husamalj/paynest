"use client";

import { useEffect, useState } from "react";
import { Send } from "lucide-react";

export function StatusBadge({ status, isRTL }: { status: string; isRTL: boolean }) {
  const labels: Record<string, string> = {
    pending: isRTL ? "بانتظار المشرف" : "Awaiting supervisor",
    supervisor_approved: isRTL ? "موافق عليه" : "Approved",
    approved: isRTL ? "موافق عليه" : "Approved",
    rejected: isRTL ? "مرفوض" : "Rejected",
    in_progress: isRTL ? "قيد التنفيذ" : "In progress",
    completed: isRTL ? "مكتمل" : "Completed",
  };
  const cls: Record<string, string> = {
    pending: "badge-yellow",
    supervisor_approved: "badge-green",
    approved: "badge-green",
    rejected: "badge-red",
    in_progress: "badge-blue",
    completed: "badge-green",
  };
  return <span className={`badge ${cls[status] || "badge-gray"}`}>{labels[status] || status}</span>;
}

export function PriorityBadge({ priority, isRTL }: { priority?: string; isRTL: boolean }) {
  const map: Record<string, { cls: string; ar: string; en: string }> = {
    urgent: { cls: "badge-red", ar: "عاجل", en: "Urgent" },
    high: { cls: "badge-yellow", ar: "أهمية عالية", en: "High" },
    medium: { cls: "badge-blue", ar: "متوسطة", en: "Medium" },
    low: { cls: "badge-gray", ar: "أقل أهمية", en: "Low" },
  };
  const p = map[priority || ""] ? (priority as string) : "medium";
  return <span className={`badge ${map[p].cls}`}>{isRTL ? map[p].ar : map[p].en}</span>;
}

export function TargetProgress({ task, isRTL, onSave }: { task: any; isRTL: boolean; onSave: (v: number) => void }) {
  const tgt = Number(task.targetValue ?? task.target_value);
  const cur = Number(task.currentValue ?? task.current_value ?? 0);
  const pct = tgt > 0 ? Math.min(100, Math.round((cur / tgt) * 100)) : 0;
  const [val, setVal] = useState(String(cur));
  useEffect(() => { setVal(String(cur)); }, [cur]);
  if (!tgt || tgt <= 0) return null;
  const unit = task.unit ? ` ${task.unit}` : "";
  return (
    <div className="mt-2 w-full">
      <div className="flex items-center justify-between text-[11px] text-slate-500 mb-1">
        <span>{isRTL ? "الإنجاز" : "Progress"}: {cur}/{tgt}{unit}</span>
        <span className={`font-bold ${pct >= 100 ? "text-emerald-600" : "text-brand-600"}`}>{pct}%</span>
      </div>
      <div className="h-2 w-full rounded-full bg-slate-100 overflow-hidden">
        <div className={`h-full rounded-full transition-all ${pct >= 100 ? "bg-emerald-500" : "bg-brand-500"}`} style={{ width: `${pct}%` }} />
      </div>
      <div className="flex items-center gap-1.5 mt-1.5">
        <input
          type="number" step="any" value={val} onChange={(e) => setVal(e.target.value)}
          className="w-20 px-2 py-1 rounded-lg border border-slate-200 bg-slate-50 text-xs focus:bg-white focus:outline-none focus:ring-1 focus:ring-brand-500"
        />
        <button type="button" className="btn btn-sm btn-secondary" onClick={() => onSave(Number(val) || 0)}>
          {isRTL ? "تحديث" : "Update"}
        </button>
      </div>
    </div>
  );
}

export function TaskReportBox({ task, isRTL, onSave }: { task: any; isRTL: boolean; onSave: (text: string) => Promise<void> }) {
  const existing = task.report || "";
  const [open, setOpen] = useState(false);
  const [val, setVal] = useState(existing);
  const [busy, setBusy] = useState(false);
  useEffect(() => { setVal(existing); }, [existing]);
  return (
    <div className="mt-2">
      {existing && !open && (
        <div className="text-[11px] bg-sky-50 border border-sky-100 rounded-lg px-2 py-1.5 text-slate-700">
          <span className="font-semibold text-sky-700">{isRTL ? "تقريرك: " : "Your report: "}</span>{existing}
          <button type="button" onClick={() => setOpen(true)} className="text-sky-600 hover:underline ms-2">{isRTL ? "تعديل" : "edit"}</button>
        </div>
      )}
      {!existing && !open && (
        <button type="button" onClick={() => setOpen(true)} className="text-[11px] text-slate-400 hover:text-sky-600 flex items-center gap-1">
          <Send size={11} />{isRTL ? "إرسال تقرير للمشرف" : "Send report to supervisor"}
        </button>
      )}
      {open && (
        <div className="space-y-1.5">
          <textarea rows={2} value={val} onChange={(e) => setVal(e.target.value)} placeholder={isRTL ? "اكتب ما أنجزته..." : "Describe what you've done..."}
            className="w-full text-xs px-2.5 py-2 rounded-lg border border-slate-200 bg-slate-50 focus:bg-white focus:outline-none focus:ring-1 focus:ring-sky-500" />
          <div className="flex gap-1.5">
            <button type="button" disabled={busy} onClick={async () => { setBusy(true); try { await onSave(val); setOpen(false); } finally { setBusy(false); } }} className="btn btn-sm btn-primary">{isRTL ? "إرسال" : "Send"}</button>
            <button type="button" onClick={() => { setVal(existing); setOpen(false); }} className="btn btn-sm btn-secondary">{isRTL ? "إلغاء" : "Cancel"}</button>
          </div>
        </div>
      )}
    </div>
  );
}
