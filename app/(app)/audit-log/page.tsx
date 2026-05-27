"use client";

import { useEffect, useState } from "react";
import { ScrollText, AlertTriangle, ChevronDown, ChevronRight, User, Clock as ClockIcon } from "lucide-react";
import api from "@/lib/api";
import { useLanguage } from "@/lib/i18n/LanguageContext";

const ENTITIES = ["", "employee", "settings", "bonus", "leave", "supervisor", "upload", "task", "evaluation", "announcement", "holiday"];
const ACTIONS  = ["", "create", "update", "delete", "approve", "reject", "upload"];

const ENTITY_LABELS: Record<string, { ar: string; en: string }> = {
  employee:     { ar: "موظف",        en: "Employee" },
  settings:     { ar: "إعدادات",     en: "Settings" },
  bonus:        { ar: "مكافأة/خصم",   en: "Bonus/Ded." },
  leave:        { ar: "إجازة",        en: "Leave" },
  supervisor:   { ar: "مشرف",         en: "Supervisor" },
  upload:       { ar: "رفع ملف",      en: "Upload" },
  task:         { ar: "مهمة",         en: "Task" },
  evaluation:   { ar: "تقييم",        en: "Evaluation" },
  announcement: { ar: "إعلان",        en: "Announcement" },
  holiday:      { ar: "عطلة",         en: "Holiday" },
};

const ACTION_COLORS: Record<string, string> = {
  create:  "badge-green",
  update:  "badge-blue",
  delete:  "badge-red",
  approve: "badge-green",
  reject:  "badge-red",
  upload:  "badge-purple",
};

export default function AuditLogPage() {
  const { lang } = useLanguage();
  const ar = lang === "ar";
  const [logs, setLogs]       = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError]     = useState("");
  const [entity, setEntity]   = useState("");
  const [action, setAction]   = useState("");
  const [from, setFrom]       = useState("");
  const [to, setTo]           = useState("");
  const [expanded, setExpanded] = useState<Set<number>>(new Set());

  const load = async () => {
    setLoading(true); setError("");
    try {
      const params: any = {};
      if (entity) params.entity = entity;
      if (action) params.action = action;
      if (from)   params.from   = from;
      if (to)     params.to     = to;
      const res = await api.get("/audit-log", { params });
      setLogs(res.data || []);
    } catch (e: any) { setError(e.message); }
    finally { setLoading(false); }
  };

  useEffect(() => { load(); /* eslint-disable-next-line */ }, [entity, action, from, to]);

  const toggle = (id: number) => {
    setExpanded((p) => { const n = new Set(p); n.has(id) ? n.delete(id) : n.add(id); return n; });
  };

  return (
    <div className="space-y-6" dir={ar ? "rtl" : "ltr"}>
      <div className="flex items-center gap-3 pb-2 border-b border-slate-200">
        <ScrollText className="text-brand-600" size={22} />
        <h2 className="text-xl font-bold text-slate-800">{ar ? "سجل التعديلات" : "Audit Log"}</h2>
      </div>

      {error && <div className="alert alert-error"><AlertTriangle size={16} />{error}</div>}

      {/* Filters */}
      <div className="card p-4 flex flex-wrap items-center gap-3">
        <span className="text-sm font-medium text-slate-600">{ar ? "النوع:" : "Entity:"}</span>
        <select className="form-select w-36 text-sm" value={entity} onChange={(e) => setEntity(e.target.value)}>
          {ENTITIES.map((en) => (
            <option key={en} value={en}>
              {en === "" ? (ar ? "الكل" : "All") : (ENTITY_LABELS[en]?.[lang as "ar" | "en"] || en)}
            </option>
          ))}
        </select>
        <span className="text-sm font-medium text-slate-600 ms-2">{ar ? "الإجراء:" : "Action:"}</span>
        <select className="form-select w-36 text-sm" value={action} onChange={(e) => setAction(e.target.value)}>
          {ACTIONS.map((a) => <option key={a} value={a}>{a === "" ? (ar ? "الكل" : "All") : a}</option>)}
        </select>
        <span className="text-sm font-medium text-slate-600 ms-2">{ar ? "من:" : "From:"}</span>
        <input type="date" className="form-input w-36 text-sm" value={from} onChange={(e) => setFrom(e.target.value)} />
        <span className="text-sm font-medium text-slate-600">{ar ? "إلى:" : "To:"}</span>
        <input type="date" className="form-input w-36 text-sm" value={to} onChange={(e) => setTo(e.target.value)} />
      </div>

      {/* Logs table */}
      <div className="card overflow-hidden">
        <div className="card-header"><div className="card-title"><ScrollText size={16} className="text-brand-600" />{logs.length} {ar ? "إدخال" : "entries"}</div></div>
        {loading ? (
          <div className="flex items-center justify-center py-10 gap-2 text-slate-400">
            <span className="spinner spinner-dark w-5 h-5" />
            {ar ? "جاري التحميل..." : "Loading..."}
          </div>
        ) : logs.length === 0 ? (
          <div className="text-center py-12 text-sm text-slate-400">{ar ? "لا توجد سجلات" : "No entries"}</div>
        ) : (
          <div className="divide-y divide-slate-100">
            {logs.map((log) => {
              const isOpen = expanded.has(log.id);
              const hasChanges = log.changes && Object.keys(log.changes).length > 0;
              return (
                <div key={log.id} className="hover:bg-slate-50 transition-colors">
                  <button onClick={() => hasChanges && toggle(log.id)} className="w-full px-4 py-3 flex flex-wrap items-center gap-3 text-left">
                    {hasChanges && (
                      <span className="text-slate-400 shrink-0">{isOpen ? <ChevronDown size={14} /> : <ChevronRight size={14} />}</span>
                    )}
                    {!hasChanges && <span className="w-3.5 shrink-0" />}
                    <span className="text-xs font-mono text-slate-400 w-44 shrink-0 flex items-center gap-1">
                      <ClockIcon size={11} />
                      {new Date(log.createdAt).toLocaleString(ar ? "ar-EG" : "en-US")}
                    </span>
                    <span className={`badge text-xs shrink-0 ${ACTION_COLORS[log.action] || "badge-gray"}`}>{log.action}</span>
                    <span className="text-sm font-medium text-slate-800 shrink-0">
                      {ENTITY_LABELS[log.entity]?.[lang as "ar" | "en"] || log.entity}
                    </span>
                    {log.entityId && (
                      <span className="text-xs font-mono text-slate-500 shrink-0">#{log.entityId}</span>
                    )}
                    <span className="ms-auto flex items-center gap-1.5 text-xs text-slate-500 shrink-0">
                      <User size={11} /> {log.userName} <span className="badge badge-gray text-[10px]">{log.userRole}</span>
                    </span>
                  </button>
                  {isOpen && hasChanges && (
                    <div className="px-4 pb-4 bg-slate-50 border-t border-slate-100">
                      <pre className="text-xs bg-white border border-slate-200 rounded-lg p-3 overflow-x-auto whitespace-pre-wrap max-h-96">
                        {JSON.stringify(log.changes, null, 2)}
                      </pre>
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
