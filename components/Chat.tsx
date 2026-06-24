"use client";

import { useEffect, useRef, useState } from "react";
import { Send, Paperclip, Search, MessageSquare, X } from "lucide-react";
import { useLanguage } from "@/lib/i18n/LanguageContext";
import api from "@/lib/api";

type Contact = { employee_id: string; name: string; unread: number; last_body: string | null; last_at: string | null };
type Msg = { id: number; sender_id: string; body: string | null; attachment_name: string | null; has_attachment: boolean; mine: boolean; created_at: string };

export default function Chat({ heightClass = "h-[calc(100vh-9rem)]", bare = false }: { heightClass?: string; bare?: boolean } = {}) {
  const { lang } = useLanguage();
  const ar = lang === "ar";
  const [contacts, setContacts] = useState<Contact[]>([]);
  const [active, setActive] = useState<Contact | null>(null);
  const [msgs, setMsgs] = useState<Msg[]>([]);
  const [text, setText] = useState("");
  const [q, setQ] = useState("");
  const [sending, setSending] = useState(false);
  const [atts, setAtts] = useState<{ data: string; name: string }[]>([]);
  const [profile, setProfile] = useState<any | null>(null);
  const [profileLoading, setProfileLoading] = useState(false);
  const endRef = useRef<HTMLDivElement>(null);
  const activeRef = useRef<string | null>(null);
  activeRef.current = active?.employee_id ?? null;

  const loadContacts = async () => {
    try { const r = await api.get("/messages/contacts"); setContacts(r.data || []); } catch {}
  };
  const loadThread = async (id: string) => {
    try { const r = await api.get("/messages", { params: { with: id } }); setMsgs(r.data || []); } catch {}
  };

  useEffect(() => { loadContacts(); const t = setInterval(loadContacts, 8000); return () => clearInterval(t); }, []);
  useEffect(() => {
    if (!active) return;
    loadThread(active.employee_id);
    const t = setInterval(() => { if (activeRef.current) loadThread(activeRef.current); }, 4000);
    return () => clearInterval(t);
  }, [active?.employee_id]);
  useEffect(() => { endRef.current?.scrollIntoView({ behavior: "smooth" }); }, [msgs.length]);

  const MAX_FILES = 5;
  const MAX_SIZE = 3 * 1024 * 1024; // 3MB per file — stays under Vercel's 4.5MB request-body limit after base64

  const pickFile = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []);
    e.target.value = ""; // allow re-picking the same file later
    if (!files.length) return;
    const room = MAX_FILES - atts.length;
    if (room <= 0) { alert(ar ? `الحد الأقصى ${MAX_FILES} ملفات` : `Up to ${MAX_FILES} files`); return; }
    const picked = files.slice(0, room);
    if (picked.some((f) => f.size > MAX_SIZE)) { alert(ar ? "كل ملف يجب أن يكون أقل من 3MB" : "Each file must be under 3MB"); return; }
    const read = await Promise.all(
      picked.map((f) => new Promise<{ data: string; name: string }>((res, rej) => {
        const r = new FileReader();
        r.onload = () => res({ data: r.result as string, name: f.name });
        r.onerror = rej;
        r.readAsDataURL(f);
      }))
    );
    setAtts((prev) => [...prev, ...read].slice(0, MAX_FILES));
  };

  const send = async () => {
    if (!active || (!text.trim() && atts.length === 0)) return;
    setSending(true);
    try {
      const created: Msg[] = [];
      if (atts.length === 0) {
        const r = await api.post("/messages", { to: active.employee_id, body: text.trim(), attachment: null, attachment_name: null });
        created.push(r.data);
      } else {
        // One message per file; the text rides along with the first.
        for (let i = 0; i < atts.length; i++) {
          const r = await api.post("/messages", {
            to: active.employee_id,
            body: i === 0 ? text.trim() : "",
            attachment: atts[i].data,
            attachment_name: atts[i].name,
          });
          created.push(r.data);
        }
      }
      setMsgs((m) => [...m, ...created]);
      setText(""); setAtts([]);
      loadContacts();
    } catch (e: any) { alert(e.message); }
    finally { setSending(false); }
  };

  const openProfile = async () => {
    if (!active) return;
    setProfileLoading(true); setProfile(null);
    try { const r = await api.get(`/employees/${active.employee_id}/card`); setProfile(r.data); }
    catch { setProfile({ employee_id: active.employee_id, name: active.name }); }
    finally { setProfileLoading(false); }
  };

  const fmt = (d: string) => new Date(d).toLocaleString(ar ? "ar" : "en", { hour: "2-digit", minute: "2-digit", day: "2-digit", month: "2-digit" });
  const fmtDate = (d: any) => (d ? String(d).substring(0, 10) : "—");
  const filtered = contacts.filter((c) => (c.name || c.employee_id).toLowerCase().includes(q.toLowerCase()));

  return (
    <div className={`flex ${heightClass} ${bare ? "" : "min-h-[480px] rounded-2xl border border-slate-200"} overflow-hidden bg-white`} dir={ar ? "rtl" : "ltr"}>
      {/* Contacts */}
      <aside className={`w-full sm:w-72 border-e border-slate-200 flex flex-col ${active ? "hidden sm:flex" : "flex"}`}>
        <div className="p-3 border-b border-slate-100">
          <div className="relative">
            <Search size={15} className="absolute top-2.5 start-3 text-slate-400" />
            <input value={q} onChange={(e) => setQ(e.target.value)} placeholder={ar ? "بحث عن زميل..." : "Search..."} className="w-full ps-9 pe-3 py-2 rounded-lg bg-slate-50 border border-slate-200 text-sm focus:bg-white focus:outline-none" />
          </div>
        </div>
        <div className="flex-1 overflow-y-auto">
          {filtered.length === 0 ? <div className="text-center text-sm text-slate-400 py-10">{ar ? "لا يوجد زملاء" : "No colleagues"}</div> : filtered.map((c) => (
            <button key={c.employee_id} onClick={() => setActive(c)} className={`w-full flex items-center gap-3 px-3 py-2.5 text-start hover:bg-slate-50 border-b border-slate-50 ${active?.employee_id === c.employee_id ? "bg-brand-50" : ""}`}>
              <div className="w-9 h-9 rounded-full bg-brand-100 text-brand-700 flex items-center justify-center text-sm font-bold flex-shrink-0">{(c.name || "?")[0]?.toUpperCase()}</div>
              <div className="flex-1 min-w-0">
                <div className="text-sm font-semibold text-slate-900 truncate">{c.name || c.employee_id}</div>
                <div className="text-xs text-slate-400 truncate">{c.last_body || (ar ? "ابدأ المحادثة" : "Start chatting")}</div>
              </div>
              {c.unread > 0 && <span className="bg-rose-500 text-white text-[10px] font-bold rounded-full min-w-[18px] h-[18px] px-1 flex items-center justify-center">{c.unread}</span>}
            </button>
          ))}
        </div>
      </aside>

      {/* Thread */}
      <section className={`flex-1 flex flex-col ${active ? "flex" : "hidden sm:flex"}`}>
        {!active ? (
          <div className="flex-1 flex flex-col items-center justify-center text-slate-400 gap-2">
            <MessageSquare size={36} /><span className="text-sm">{ar ? "اختر زميلاً لبدء المحادثة" : "Pick a colleague to start chatting"}</span>
          </div>
        ) : (
          <>
            <div className="h-14 px-4 border-b border-slate-100 flex items-center gap-3 flex-shrink-0">
              <button className="sm:hidden text-slate-400" onClick={() => setActive(null)}><X size={18} /></button>
              <button onClick={openProfile} className="flex items-center gap-3 text-start hover:opacity-80 transition-opacity" title={ar ? "عرض الملف الشخصي" : "View profile"}>
                <div className="w-8 h-8 rounded-full bg-brand-100 text-brand-700 flex items-center justify-center text-sm font-bold">{(active.name || "?")[0]?.toUpperCase()}</div>
                <div className="font-semibold text-slate-900">{active.name || active.employee_id}</div>
              </button>
            </div>
            <div className="flex-1 overflow-y-auto p-4 space-y-2 bg-slate-50/60">
              {msgs.length === 0 && <div className="text-center text-sm text-slate-400 py-10">{ar ? "لا رسائل بعد — قل مرحباً 👋" : "No messages yet — say hi 👋"}</div>}
              {msgs.map((m) => (
                <div key={m.id} className={`flex ${m.mine ? "justify-end" : "justify-start"}`}>
                  <div className={`max-w-[75%] rounded-2xl px-3.5 py-2 text-sm ${m.mine ? "bg-brand-600 text-white" : "bg-white border border-slate-200 text-slate-800"}`}>
                    {m.body && <div className="whitespace-pre-wrap break-words">{m.body}</div>}
                    {m.has_attachment && <a href={`/api/messages/${m.id}/attachment`} target="_blank" rel="noreferrer" className={`flex items-center gap-1.5 text-xs mt-1 underline ${m.mine ? "text-white/90" : "text-brand-600"}`}><Paperclip size={12} />{m.attachment_name}</a>}
                    <div className={`text-[10px] mt-1 ${m.mine ? "text-white/70" : "text-slate-400"}`}>{fmt(m.created_at)}</div>
                  </div>
                </div>
              ))}
              <div ref={endRef} />
            </div>
            <div className="border-t border-slate-100 flex-shrink-0">
              {atts.length > 0 && (
                <div className="flex flex-wrap gap-2 px-3 pt-3">
                  {atts.map((a, i) => (
                    <span key={i} className="inline-flex items-center gap-1 max-w-[200px] bg-slate-100 border border-slate-200 rounded-full ps-2 pe-1 py-1 text-xs text-slate-600">
                      <Paperclip size={11} className="flex-shrink-0" />
                      <span className="truncate">{a.name}</span>
                      <button
                        type="button"
                        onClick={() => setAtts((p) => p.filter((_, idx) => idx !== i))}
                        className="flex-shrink-0 ms-0.5 text-slate-400 hover:text-rose-500 rounded-full p-0.5"
                        aria-label={ar ? "حذف الملف" : "Remove file"}
                      >
                        <X size={12} />
                      </button>
                    </span>
                  ))}
                </div>
              )}
              <div className="p-3 flex items-center gap-2">
                <label className="cursor-pointer text-slate-400 hover:text-brand-600 flex-shrink-0"><Paperclip size={18} /><input type="file" multiple className="hidden" onChange={pickFile} /></label>
                <input value={text} onChange={(e) => setText(e.target.value)} onKeyDown={(e) => { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); send(); } }} placeholder={ar ? "اكتب رسالة..." : "Type a message..."} className="flex-1 px-3 py-2 rounded-xl bg-slate-50 border border-slate-200 text-sm focus:bg-white focus:outline-none" />
                <button onClick={send} disabled={sending || (!text.trim() && atts.length === 0)} className="btn btn-primary disabled:opacity-50 flex-shrink-0"><Send size={15} /></button>
              </div>
            </div>
          </>
        )}
      </section>

      {/* Profile modal */}
      {(profileLoading || profile) && (
        <div className="fixed inset-0 bg-black/40 z-50 flex items-center justify-center p-4" onClick={(e) => { if (e.target === e.currentTarget) setProfile(null); }}>
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-sm max-h-[90vh] overflow-y-auto" dir={ar ? "rtl" : "ltr"}>
            <div className="flex items-center justify-between px-5 py-3 border-b border-slate-100">
              <h3 className="font-bold text-slate-800">{ar ? "الملف الشخصي" : "Profile"}</h3>
              <button onClick={() => setProfile(null)} className="text-slate-400 hover:text-slate-700"><X size={18} /></button>
            </div>
            {profileLoading ? (
              <div className="flex items-center justify-center py-12 text-slate-400 gap-2"><span className="spinner spinner-dark w-5 h-5" />{ar ? "جاري التحميل..." : "Loading..."}</div>
            ) : profile ? (
              <div className="p-5">
                <div className="flex items-center gap-3 mb-4">
                  {profile.photo_url
                    ? <img src={profile.photo_url} alt="" className="w-14 h-14 rounded-full object-cover" />
                    : <div className="w-14 h-14 rounded-full bg-brand-100 text-brand-700 flex items-center justify-center text-xl font-bold">{(profile.name || "?")[0]?.toUpperCase()}</div>}
                  <div className="min-w-0">
                    <div className="font-bold text-slate-900 text-lg truncate">{profile.name || profile.employee_id}</div>
                    <div className="flex items-center gap-2">
                      <span className="text-xs text-slate-400 font-mono">{profile.employee_id}</span>
                      {profile.role_label && <span className={`badge ${profile.role === "owner" || profile.role === "super_admin" ? "badge-purple" : profile.role === "hr" ? "badge-blue" : "badge-gray"}`}>{profile.role_label}</span>}
                    </div>
                  </div>
                </div>

                {profile.restricted ? (
                  <div className="text-center py-6 text-sm text-slate-400">
                    {ar ? "تفاصيل هذا الحساب خاصة." : "This person's details are private."}
                  </div>
                ) : (
                <div className="space-y-3 text-sm">
                  <Field label={ar ? "المسمى الوظيفي" : "Job Title"} value={profile.job_title} />
                  <Field label={ar ? "القسم" : "Department"} value={profile.department} />
                  <Field label={ar ? "البريد الإلكتروني" : "Email"} value={profile.email} mono />
                  <Field label={ar ? "الهاتف" : "Phone"} value={profile.phone} />

                  {profile.can_see_sensitive && (
                    <>
                      <div className="border-t border-slate-100 pt-3 grid grid-cols-2 gap-3">
                        <div>
                          <div className="text-[11px] font-semibold text-slate-400 uppercase mb-0.5">{ar ? "الراتب الأساسي" : "Base Salary"}</div>
                          <div className="font-mono font-semibold text-slate-900">{profile.base_salary != null ? Number(profile.base_salary).toFixed(2) : "—"}</div>
                        </div>
                        <div>
                          <div className="text-[11px] font-semibold text-slate-400 uppercase mb-0.5">{ar ? "الضمان الاجتماعي" : "Social Security"}</div>
                          <div>{profile.social_security ? <span className="badge badge-purple">{ar ? "مفعّل" : "Enabled"}</span> : <span className="badge badge-gray">{ar ? "معطّل" : "Disabled"}</span>}</div>
                        </div>
                        <Field label={ar ? "تاريخ الانضمام" : "Join Date"} value={fmtDate(profile.join_date)} />
                        <Field label={ar ? "انتهاء العقد" : "Contract End"} value={fmtDate(profile.contract_end_date)} />
                      </div>
                      <div className="grid grid-cols-2 gap-3">
                        <div>
                          <div className="text-[11px] font-semibold text-slate-400 uppercase mb-0.5">{ar ? "إجازات سنوية متبقية" : "Annual Leave Left"}</div>
                          <span className="badge badge-green">{profile.annual_remaining ?? "—"} {ar ? "يوم" : "days"}</span>
                        </div>
                        <div>
                          <div className="text-[11px] font-semibold text-slate-400 uppercase mb-0.5">{ar ? "إجازات مرضية متبقية" : "Sick Leave Left"}</div>
                          <span className="badge badge-green">{profile.sick_remaining ?? "—"} {ar ? "يوم" : "days"}</span>
                        </div>
                      </div>
                    </>
                  )}
                </div>
                )}
              </div>
            ) : null}
          </div>
        </div>
      )}
    </div>
  );
}

function Field({ label, value, mono = false }: { label: string; value: any; mono?: boolean }) {
  return (
    <div>
      <div className="text-[11px] font-semibold text-slate-400 uppercase mb-0.5">{label}</div>
      <div className={`text-slate-800 ${mono ? "font-mono break-all" : ""}`}>{value || "—"}</div>
    </div>
  );
}
