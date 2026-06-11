"use client";

import { useEffect, useMemo, useState } from "react";
import { Users, Wallet, DollarSign, TrendingDown, Gift, Shield, AlertTriangle, MapPin, Bell, Calendar, CheckSquare, ChevronLeft, ChevronRight, ChevronDown, Scale, X } from "lucide-react";
import { useLanguage } from "@/lib/i18n/LanguageContext";
import StatCard from "@/components/StatCard";
import api from "@/lib/api";
import clsx from "clsx";

function MiniCalendar({ leaves, isRTL }: { leaves: any[]; isRTL: boolean }) {
  const [cursor, setCursor] = useState(() => { const d = new Date(); return { y: d.getFullYear(), m: d.getMonth() }; });
  const [events, setEvents] = useState<{ id: number; date: string; title: string }[]>([]);
  const [selected, setSelected] = useState<string | null>(null);
  const [newTitle, setNewTitle] = useState("");
  const [saving, setSaving] = useState(false);
  const today = new Date();
  const months = isRTL
    ? ["يناير","فبراير","مارس","أبريل","مايو","يونيو","يوليو","أغسطس","سبتمبر","أكتوبر","نوفمبر","ديسمبر"]
    : ["January","February","March","April","May","June","July","August","September","October","November","December"];
  const dows = isRTL ? ["أحد","إثن","ثلا","أرب","خمي","جمع","سبت"] : ["Su","Mo","Tu","We","Th","Fr","Sa"];

  const loadEvents = (y: number, m: number) => {
    api.get(`/events?month=${m + 1}&year=${y}`).then((r) => setEvents(r.data || [])).catch(() => setEvents([]));
  };
  useEffect(() => { loadEvents(cursor.y, cursor.m); setSelected(null); }, [cursor.y, cursor.m]);

  const leaveDays = new Set<number>();
  for (const l of leaves) {
    const d = new Date(l.startDate || l.start_date);
    if (!isNaN(d.getTime()) && d.getFullYear() === cursor.y && d.getMonth() === cursor.m) leaveDays.add(d.getDate());
  }
  const eventDays = new Set<number>(events.map((e) => parseInt(e.date.substring(8, 10), 10)));
  const dateStr = (day: number) => `${cursor.y}-${String(cursor.m + 1).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
  const selectedEvents = selected ? events.filter((e) => e.date === selected) : [];

  const firstDow = new Date(cursor.y, cursor.m, 1).getDay();
  const daysInMonth = new Date(cursor.y, cursor.m + 1, 0).getDate();
  const cells: (number | null)[] = [...Array(firstDow).fill(null), ...Array.from({ length: daysInMonth }, (_, i) => i + 1)];
  const move = (delta: number) => setCursor((c) => { const d = new Date(c.y, c.m + delta, 1); return { y: d.getFullYear(), m: d.getMonth() }; });

  const addEvent = async () => {
    if (!selected || !newTitle.trim()) return;
    setSaving(true);
    try {
      const r = await api.post("/events", { date: selected, title: newTitle.trim() });
      setEvents((p) => [...p, r.data]); setNewTitle("");
    } catch { /* ignore */ } finally { setSaving(false); }
  };
  const delEvent = async (id: number) => {
    try { await api.delete(`/events?id=${id}`); setEvents((p) => p.filter((e) => e.id !== id)); } catch { /* ignore */ }
  };

  return (
    <div className="card">
      <div className="card-header">
        <div className="card-title"><Calendar size={16} className="text-brand-600" />{isRTL ? "التقويم" : "Calendar"}</div>
        <div className="flex items-center gap-1">
          <button onClick={() => move(-1)} className="p-1 rounded hover:bg-slate-100 text-slate-500"><ChevronLeft size={16} /></button>
          <span className="text-sm font-semibold text-slate-700 min-w-[110px] text-center">{months[cursor.m]} {cursor.y}</span>
          <button onClick={() => move(1)} className="p-1 rounded hover:bg-slate-100 text-slate-500"><ChevronRight size={16} /></button>
        </div>
      </div>
      <div className="grid grid-cols-7 gap-1 text-center">
        {dows.map((d) => <div key={d} className="text-[10px] font-semibold text-slate-400 py-1">{d}</div>)}
        {cells.map((day, i) => {
          if (day === null) return <div key={i} />;
          const isToday = day === today.getDate() && cursor.m === today.getMonth() && cursor.y === today.getFullYear();
          const isSel = selected === dateStr(day);
          const hasLeave = leaveDays.has(day);
          const hasEvent = eventDays.has(day);
          return (
            <button key={i} onClick={() => setSelected(dateStr(day))}
              className={`relative aspect-square flex items-center justify-center text-xs rounded-lg transition-colors ${isToday ? "bg-brand-600 text-white font-bold" : isSel ? "bg-brand-50 ring-1 ring-brand-300 text-brand-700 font-semibold" : "text-slate-600 hover:bg-slate-100"}`}>
              {day}
              <span className="absolute bottom-1 flex gap-0.5">
                {hasLeave && <span className={`w-1 h-1 rounded-full ${isToday ? "bg-white" : "bg-amber-500"}`} />}
                {hasEvent && <span className={`w-1 h-1 rounded-full ${isToday ? "bg-white" : "bg-emerald-500"}`} />}
              </span>
            </button>
          );
        })}
      </div>
      <div className="mt-2 flex items-center gap-3 text-[10px] text-slate-400">
        <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-brand-600" />{isRTL ? "اليوم" : "Today"}</span>
        <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-amber-500" />{isRTL ? "إجازة" : "Leave"}</span>
        <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-emerald-500" />{isRTL ? "حدث" : "Event"}</span>
      </div>

      {selected && (
        <div className="mt-3 pt-3 border-t border-slate-100">
          <div className="text-xs font-semibold text-slate-700 mb-2">{isRTL ? "أحداث يوم" : "Events on"} {selected}</div>
          <div className="space-y-1 mb-2">
            {selectedEvents.length === 0 ? (
              <div className="text-[11px] text-slate-400">{isRTL ? "لا يوجد أحداث" : "No events"}</div>
            ) : selectedEvents.map((e) => (
              <div key={e.id} className="flex items-center justify-between gap-2 text-xs bg-emerald-50 border border-emerald-100 rounded-lg px-2 py-1.5">
                <span className="text-slate-800 truncate">{e.title}</span>
                <button onClick={() => delEvent(e.id)} className="text-rose-400 hover:text-rose-600 flex-shrink-0"><X size={13} /></button>
              </div>
            ))}
          </div>
          <div className="flex gap-2">
            <input className="form-input form-input-sm flex-1" placeholder={isRTL ? "أضف حدث / مناسبة..." : "Add an event..."} value={newTitle}
              onChange={(e) => setNewTitle(e.target.value)} onKeyDown={(e) => { if (e.key === "Enter") addEvent(); }} />
            <button onClick={addEvent} disabled={saving || !newTitle.trim()} className="btn btn-sm btn-primary">{isRTL ? "إضافة" : "Add"}</button>
          </div>
        </div>
      )}
    </div>
  );
}

function formatCurrency(val: unknown) {
  return (parseFloat(String(val)) || 0).toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

function getStatusBadge(status: string, t: (k: any) => string) {
  const map: Record<string, { cls: string; label: string }> = {
    "Full Attendance": { cls: "badge-green", label: t("fullAttendance") },
    "Has Deductions": { cls: "badge-red", label: t("hasDeductions") },
    "Has Extras": { cls: "badge-blue", label: t("hasExtras") },
    Absent: { cls: "badge-gray", label: t("absent") },
  };
  const info = map[status] || { cls: "badge-gray", label: status };
  return <span className={`badge ${info.cls}`}>{info.label}</span>;
}

function buildCopilotInsights(payroll: any[], isRTL: boolean) {
  const label = (ar: string, en: string) => (isRTL ? ar : en);
  const rows = payroll.map((r) => ({ ...r, net_salary: parseFloat(r.net_salary) || 0, hour_diff: parseFloat(r.hour_diff) || 0, adjustment: parseFloat(r.adjustment) || 0, deduction_total: parseFloat(r.deduction_total) || 0, social_security_deduct: parseFloat(r.social_security_deduct) || 0 }));

  if (!rows.length) return [
    { question: label("مين أكثر قسم عنده غياب؟", "Who has the most absence?"), answer: label("لسا ما في كشف رواتب محسوب. ارفع ملفات الحضور والرواتب ثم احسب الرواتب.", "No payroll has been calculated yet. Upload attendance and salary files, then calculate payroll.") },
    { question: label("مين متوقع يترك الشركة؟", "Who may be at risk of leaving?"), answer: label("أحتاج بيانات رواتب وحضور أولاً حتى أعطي مؤشر منطقي.", "I need payroll and attendance data first before giving a useful signal.") },
    { question: label("ليش الإنتاج نازل؟", "Why is productivity down?"), answer: label("بعد حساب الرواتب أقدر أربط فرق الساعات والغياب والخصومات.", "After payroll is calculated, I can connect hour gaps, absence, and deductions.") },
  ];

  const biggestShortfall = [...rows].sort((a, b) => a.hour_diff - b.hour_diff)[0];
  const biggestDeduction = [...rows].sort((a, b) => (Math.abs(b.adjustment) + b.deduction_total + b.social_security_deduct) - (Math.abs(a.adjustment) + a.deduction_total + a.social_security_deduct))[0];
  const lowestNet = [...rows].sort((a, b) => a.net_salary - b.net_salary)[0];
  const highestNet = [...rows].sort((a, b) => b.net_salary - a.net_salary)[0];
  const totalNet = rows.reduce((s, r) => s + r.net_salary, 0);
  const totalDeductions = rows.reduce((s, r) => s + Math.max(0, -r.adjustment) + r.deduction_total + r.social_security_deduct, 0);
  const affected = rows.filter((r) => r.hour_diff < 0 || r.deduction_total > 0 || r.social_security_deduct > 0).length;

  return [
    { question: label("مين أكثر موظف عنده غياب/نقص ساعات؟", "Who has the highest absence or hour gap?"), answer: label(`${biggestShortfall.name} عنده فرق ساعات ${biggestShortfall.hour_diff.toFixed(2)}.`, `${biggestShortfall.name} has an hour gap of ${biggestShortfall.hour_diff.toFixed(2)}.`) },
    { question: label("مين عليه أعلى خصومات؟", "Who has the highest deductions?"), answer: label(`${biggestDeduction.name} عليه أعلى أثر خصومات.`, `${biggestDeduction.name} has the highest deduction impact.`) },
    { question: label("كم صافي الرواتب المتوقع؟", "What is expected net payroll?"), answer: label(`صافي الرواتب الحالي ${formatCurrency(totalNet)} مع خصومات ${formatCurrency(totalDeductions)} على ${affected} موظف.`, `Net payroll is ${formatCurrency(totalNet)} with ${formatCurrency(totalDeductions)} in deductions across ${affected} employees.`) },
    { question: label("مين أعلى وأقل صافي راتب؟", "Who has the highest and lowest net pay?"), answer: label(`أعلى: ${highestNet.name} (${formatCurrency(highestNet.net_salary)}). أقل: ${lowestNet.name} (${formatCurrency(lowestNet.net_salary)}).`, `Highest: ${highestNet.name} (${formatCurrency(highestNet.net_salary)}). Lowest: ${lowestNet.name} (${formatCurrency(lowestNet.net_salary)}).`) },
  ];
}

export default function DashboardPage() {
  const { t, isRTL } = useLanguage();
  const [payroll, setPayroll] = useState<any[]>([]);
  const [employees, setEmployees] = useState<any[]>([]);
  const [remoteAssignments, setRemoteAssignments] = useState<any[]>([]);
  const [announcements, setAnnouncements] = useState<any[]>([]);
  const [leaves, setLeaves] = useState<any[]>([]);
  const [tasks, setTasks] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [settings, setSettings] = useState<any>(null);
  const [onDuty, setOnDuty] = useState<any[]>([]);
  const [onLeaveToday, setOnLeaveToday] = useState<any[]>([]);
  const [onDepartureToday, setOnDepartureToday] = useState<any[]>([]);
  const [dutyOpen, setDutyOpen] = useState(false);
  const [qDuty, setQDuty] = useState("");
  const [qLeave, setQLeave] = useState("");
  const [qDep, setQDep] = useState("");
  const [payrollPeriod, setPayrollPeriod] = useState<{ month: number | null; year: number | null }>({ month: null, year: null });

  useEffect(() => {
    Promise.all([
      api.get("/payroll/latest"),
      api.get("/employees"),
      api.get("/remote-assignments"),
      api.get("/leaves"),
      api.get("/tasks"),
      api.get("/announcements"),
      api.get("/settings"),
      api.get("/dashboard/on-duty").catch(() => ({ data: { on_duty: [] } })),
    ])
      .then(([prRes, empRes, raRes, leavesRes, tasksRes, annRes, setRes, dutyRes]) => {
        setPayroll(prRes.data.results || []);
        setPayrollPeriod({ month: prRes.data.period_month ?? null, year: prRes.data.period_year ?? null });
        setEmployees(empRes.data || []);
        setRemoteAssignments(raRes.data || []);
        setLeaves(leavesRes.data || []);
        setTasks(tasksRes.data || []);
        setAnnouncements(annRes.data || []);
        setSettings(setRes.data);
        setOnDuty(dutyRes.data?.on_duty || []);
        setOnLeaveToday(dutyRes.data?.on_leave || []);
        setOnDepartureToday(dutyRes.data?.on_departure || []);
      })
      .catch((err) => setError(err.message))
      .finally(() => setLoading(false));
  }, []);

  const totals = useMemo(() => ({
    totalBase: payroll.reduce((s, r) => s + (parseFloat(r.base_salary) || 0), 0),
    totalNet: payroll.reduce((s, r) => s + (parseFloat(r.net_salary) || 0), 0),
    totalDeductions: payroll.reduce((s, r) => s + (parseFloat(r.deduction_total) || 0), 0),
    totalBonuses: payroll.reduce((s, r) => s + (parseFloat(r.bonus_total) || 0), 0),
    totalSS: payroll.reduce((s, r) => s + (parseFloat(r.social_security_deduct) || 0), 0),
  }), [payroll]);

  const pendingLeaves = leaves.filter((l) => l.status === "pending").length;
  const openTasks = tasks.filter((t) => t.status !== "completed").length;

  // Employees whose contract ends within the next 30 days (soonest first).
  const expiringContracts = useMemo(() => {
    const today = new Date(); today.setHours(0, 0, 0, 0);
    const horizon = new Date(today); horizon.setDate(horizon.getDate() + 30);
    return employees
      .filter((e) => e.contract_end_date)
      .map((e) => {
        const end = new Date(String(e.contract_end_date).substring(0, 10));
        const days = Math.ceil((end.getTime() - today.getTime()) / 86400000);
        return { ...e, _end: end, _days: days };
      })
      .filter((e) => !isNaN(e._end.getTime()) && e._end >= today && e._end <= horizon)
      .sort((a, b) => a._days - b._days);
  }, [employees]);
  const remoteWorkEmployees = useMemo(() => {
    const seen = new Set<string>();
    return remoteAssignments.filter((a) => { const k = `${a.emp_id}|${a.start_date}|${a.end_date}`; if (seen.has(k)) return false; seen.add(k); return true; }).slice(0, 5);
  }, [remoteAssignments]);

  if (loading) return <div className="flex items-center justify-center py-20 gap-3 text-slate-500"><span className="spinner spinner-dark w-5 h-5" />{t("loadingData")}</div>;

  return (
    <div className="space-y-6">

      {error && <div className="alert alert-error"><AlertTriangle size={16} />{error}</div>}

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 xl:grid-cols-8 gap-4">
        <StatCard title={t("totalEmployees")} value={employees.length} icon={Users} color="brand" />
        <StatCard title={t("totalBaseSalary")} value={formatCurrency(totals.totalBase)} icon={Wallet} color="blue" />
        <StatCard title={t("totalNetPay")} value={formatCurrency(totals.totalNet)} icon={DollarSign} color="green" />
        <StatCard title={isRTL ? "الفرق عن الأساسي" : "Base − Net Difference"} value={formatCurrency(totals.totalBase - totals.totalNet)} icon={Scale} color="purple" />
        <StatCard title={t("totalDeductions")} value={formatCurrency(totals.totalDeductions)} icon={TrendingDown} color="red" />
        <StatCard title={t("totalBonuses")} value={formatCurrency(totals.totalBonuses)} icon={Gift} color="orange" />
        <StatCard title={t("ssDeductions")} value={formatCurrency(totals.totalSS)} icon={Shield} color="purple" />
        <StatCard title={isRTL ? "إجازات معلقة" : "Pending Leaves"} value={pendingLeaves} icon={Calendar} color="orange" />
      </div>

      {/* Today's status — collapsed by default; click to expand into 3 columns */}
      <div className="card">
        <button type="button" onClick={() => setDutyOpen((v) => !v)} className="w-full flex items-center justify-between text-start">
          <div className="card-title">
            <Users size={16} className="text-emerald-600" />{isRTL ? "حالة اليوم" : "Today's Status"}
            <span className="ms-2 px-1.5 py-0.5 rounded-full bg-emerald-50 text-emerald-700 text-[10px] font-bold">{onDuty.length} {isRTL ? "مداوم" : "in"}</span>
            {onLeaveToday.length > 0 && <span className="ms-1 px-1.5 py-0.5 rounded-full bg-amber-50 text-amber-700 text-[10px] font-bold">{onLeaveToday.length} {isRTL ? "إجازة" : "leave"}</span>}
            {onDepartureToday.length > 0 && <span className="ms-1 px-1.5 py-0.5 rounded-full bg-sky-50 text-sky-700 text-[10px] font-bold">{onDepartureToday.length} {isRTL ? "مغادرة" : "out"}</span>}
          </div>
          <div className="flex items-center gap-2">
            <span className="text-xs text-slate-400 hidden sm:inline">{new Date().toLocaleDateString(isRTL ? "ar" : "en", { weekday: "long", day: "numeric", month: "short" })}</span>
            <ChevronDown size={16} className={`text-slate-400 transition-transform ${dutyOpen ? "rotate-180" : ""}`} />
          </div>
        </button>
        {dutyOpen && (
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mt-4 pt-4 border-t border-slate-100">
            {/* Working */}
            <div>
              <div className="text-xs font-semibold text-emerald-700 mb-2 flex items-center gap-1">{isRTL ? "مداومون" : "Working"} <span className="text-slate-400">({onDuty.length})</span></div>
              <input value={qDuty} onChange={(e) => setQDuty(e.target.value)} placeholder={isRTL ? "بحث..." : "Search..."}
                className="w-full mb-2 px-2.5 py-1 rounded-lg border border-slate-200 bg-slate-50 text-xs focus:bg-white focus:outline-none focus:ring-1 focus:ring-emerald-500" />
              <div className="space-y-1.5 max-h-60 overflow-y-auto">
                {(() => { const list = onDuty.filter((e) => `${e.name || ""} ${e.department || ""} ${e.job_title || ""}`.toLowerCase().includes(qDuty.toLowerCase())); return list.length === 0 ? <div className="text-xs text-slate-400">—</div> : list.map((e) => (
                  <div key={e.employee_id} className="flex items-center gap-2 min-w-0">
                    <div className="w-6 h-6 rounded-full bg-emerald-100 text-emerald-700 flex items-center justify-center text-[10px] font-bold flex-shrink-0">{(e.name || "?").charAt(0).toUpperCase()}</div>
                    <div className="min-w-0"><div className="text-xs font-medium text-slate-800 truncate leading-tight">{e.name}</div>{(e.department || e.job_title) && <div className="text-[10px] text-slate-400 truncate leading-tight">{e.department || e.job_title}</div>}</div>
                  </div>
                )); })()}
              </div>
            </div>
            {/* On leave */}
            <div>
              <div className="text-xs font-semibold text-amber-700 mb-2 flex items-center gap-1">{isRTL ? "بإجازة" : "On leave"} <span className="text-slate-400">({onLeaveToday.length})</span></div>
              <input value={qLeave} onChange={(e) => setQLeave(e.target.value)} placeholder={isRTL ? "بحث..." : "Search..."}
                className="w-full mb-2 px-2.5 py-1 rounded-lg border border-slate-200 bg-slate-50 text-xs focus:bg-white focus:outline-none focus:ring-1 focus:ring-amber-500" />
              <div className="space-y-1.5 max-h-60 overflow-y-auto">
                {(() => { const list = onLeaveToday.filter((e) => (e.name || "").toLowerCase().includes(qLeave.toLowerCase())); return list.length === 0 ? <div className="text-xs text-slate-400">—</div> : list.map((e, i) => (
                  <div key={i} className="flex items-center gap-2 min-w-0">
                    <div className="w-6 h-6 rounded-full bg-amber-100 text-amber-700 flex items-center justify-center text-[10px] font-bold flex-shrink-0">{(e.name || "?").charAt(0).toUpperCase()}</div>
                    <div className="text-xs font-medium text-slate-800 truncate leading-tight">{e.name}</div>
                  </div>
                )); })()}
              </div>
            </div>
            {/* On departure */}
            <div>
              <div className="text-xs font-semibold text-sky-700 mb-2 flex items-center gap-1">{isRTL ? "بمغادرة" : "On departure"} <span className="text-slate-400">({onDepartureToday.length})</span></div>
              <input value={qDep} onChange={(e) => setQDep(e.target.value)} placeholder={isRTL ? "بحث..." : "Search..."}
                className="w-full mb-2 px-2.5 py-1 rounded-lg border border-slate-200 bg-slate-50 text-xs focus:bg-white focus:outline-none focus:ring-1 focus:ring-sky-500" />
              <div className="space-y-1.5 max-h-60 overflow-y-auto">
                {(() => { const list = onDepartureToday.filter((e) => (e.name || "").toLowerCase().includes(qDep.toLowerCase())); return list.length === 0 ? <div className="text-xs text-slate-400">—</div> : list.map((e, i) => (
                  <div key={i} className="flex items-center gap-2 min-w-0">
                    <div className="w-6 h-6 rounded-full bg-sky-100 text-sky-700 flex items-center justify-center text-[10px] font-bold flex-shrink-0">{(e.name || "?").charAt(0).toUpperCase()}</div>
                    <div className="text-xs font-medium text-slate-800 truncate leading-tight">{e.name}</div>
                  </div>
                )); })()}
              </div>
            </div>
          </div>
        )}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <div className="card">
          <div className="card-header"><div className="card-title"><MapPin size={16} className="text-brand-600" />{t("remoteWorkStatus")}</div></div>
          {remoteWorkEmployees.length === 0 ? <div className="text-center py-12 text-sm text-slate-400">{t("noData")}</div> : (
            <div className="space-y-3">
              {remoteWorkEmployees.map((a) => (
                <div key={a.id} className="flex items-center justify-between p-3 bg-slate-50 rounded-lg">
                  <div className="flex items-center gap-3 min-w-0">
                    <div className="w-8 h-8 rounded-full bg-brand-100 text-brand-600 flex items-center justify-center text-xs font-semibold flex-shrink-0">{a.name?.[0]?.toUpperCase() || a.emp_id?.[0]}</div>
                    <div className="min-w-0">
                      <div className="text-sm font-medium text-slate-900 truncate">{t("working")}</div>
                      <div className="text-xs text-slate-500">{a.name} • {a.emp_id}</div>
                    </div>
                  </div>
                  <div className="text-right flex-shrink-0">
                    <div className="text-sm font-semibold text-slate-900">{new Date(a.startDate || a.start_date).toLocaleDateString()} → {new Date(a.endDate || a.end_date).toLocaleDateString()}</div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        <div className="card">
          <div className="card-header"><div className="card-title"><Bell size={16} className="text-brand-600" />{t("announcements")}</div></div>
          {announcements.length === 0 ? <div className="text-center py-12 text-sm text-slate-400">{t("noData")}</div> : (
            <div className="space-y-3">
              {announcements.slice(0, 5).map((ann) => (
                <div key={ann.id} className="p-3 bg-blue-50 border border-blue-100 rounded-lg">
                  <div className="text-sm font-semibold text-slate-900 mb-1">{ann.title}</div>
                  <div className="text-xs text-slate-600 mb-2">{ann.message}</div>
                  <div className="text-xs text-slate-400">{ann.createdAt ? new Date(ann.createdAt).toLocaleDateString() : "-"}</div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        <div className="card lg:col-span-2">
          <div className="card-header"><div className="card-title"><Calendar size={16} className="text-amber-500" />{isRTL ? "تنبيهات انتهاء العقود" : "Contract Expiry Reminders"}</div></div>
          {expiringContracts.length === 0 ? (
            <div className="text-center py-12 text-sm text-slate-400">{isRTL ? "لا توجد عقود تنتهي خلال 30 يومًا" : "No contracts ending within 30 days"}</div>
          ) : (
            <div className="table-wrapper">
              <table>
                <thead><tr><th>{t("name")}</th><th>{isRTL ? "القسم" : "Department"}</th><th>{isRTL ? "تاريخ الانتهاء" : "Contract End"}</th><th className="text-right">{isRTL ? "المتبقي" : "Remaining"}</th></tr></thead>
                <tbody>
                  {expiringContracts.slice(0, 8).map((row, idx) => (
                    <tr key={idx}>
                      <td className="font-medium text-slate-900">{row.name}</td>
                      <td className="text-slate-600">{row.department || "-"}</td>
                      <td className="font-mono text-slate-600">{String(row.contract_end_date).substring(0, 10)}</td>
                      <td className="text-right">
                        <span className={clsx("badge", row._days <= 7 ? "badge-red" : row._days <= 14 ? "badge-yellow" : "badge-gray")}>
                          {row._days} {isRTL ? "يوم" : "days"}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
        <MiniCalendar leaves={leaves} isRTL={isRTL} />
      </div>
    </div>
  );
}
