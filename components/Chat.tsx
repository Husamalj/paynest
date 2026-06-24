"use client";

import { useEffect, useRef, useState } from "react";
import { Send, Paperclip, Search, MessageSquare, X } from "lucide-react";
import { useLanguage } from "@/lib/i18n/LanguageContext";
import api from "@/lib/api";

type Contact = { employee_id: string; name: string; unread: number; last_body: string | null; last_at: string | null };
type Msg = { id: number; sender_id: string; body: string | null; attachment_name: string | null; has_attachment: boolean; mine: boolean; created_at: string };

export default function Chat() {
  const { lang } = useLanguage();
  const ar = lang === "ar";
  const [contacts, setContacts] = useState<Contact[]>([]);
  const [active, setActive] = useState<Contact | null>(null);
  const [msgs, setMsgs] = useState<Msg[]>([]);
  const [text, setText] = useState("");
  const [q, setQ] = useState("");
  const [sending, setSending] = useState(false);
  const [att, setAtt] = useState<{ data: string; name: string } | null>(null);
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

  const pickFile = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const f = e.target.files?.[0];
    if (!f) return;
    if (f.size > 5 * 1024 * 1024) { alert(ar ? "الملف أكبر من 5MB" : "File exceeds 5MB"); return; }
    const data = await new Promise<string>((res, rej) => { const r = new FileReader(); r.onload = () => res(r.result as string); r.onerror = rej; r.readAsDataURL(f); });
    setAtt({ data, name: f.name });
  };

  const send = async () => {
    if (!active || (!text.trim() && !att)) return;
    setSending(true);
    try {
      const r = await api.post("/messages", { to: active.employee_id, body: text.trim(), attachment: att?.data || null, attachment_name: att?.name || null });
      setMsgs((m) => [...m, r.data]);
      setText(""); setAtt(null);
      loadContacts();
    } catch (e: any) { alert(e.message); }
    finally { setSending(false); }
  };

  const fmt = (d: string) => new Date(d).toLocaleString(ar ? "ar" : "en", { hour: "2-digit", minute: "2-digit", day: "2-digit", month: "2-digit" });
  const filtered = contacts.filter((c) => (c.name || c.employee_id).toLowerCase().includes(q.toLowerCase()));

  return (
    <div className="flex h-[calc(100vh-9rem)] min-h-[480px] rounded-2xl border border-slate-200 overflow-hidden bg-white" dir={ar ? "rtl" : "ltr"}>
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
              <div className="w-8 h-8 rounded-full bg-brand-100 text-brand-700 flex items-center justify-center text-sm font-bold">{(active.name || "?")[0]?.toUpperCase()}</div>
              <div className="font-semibold text-slate-900">{active.name || active.employee_id}</div>
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
            <div className="p-3 border-t border-slate-100 flex items-center gap-2 flex-shrink-0">
              <label className="cursor-pointer text-slate-400 hover:text-brand-600"><Paperclip size={18} /><input type="file" className="hidden" onChange={pickFile} /></label>
              {att && <span className="text-xs text-slate-500 max-w-[120px] truncate">{att.name} <button onClick={() => setAtt(null)} className="text-rose-400">✕</button></span>}
              <input value={text} onChange={(e) => setText(e.target.value)} onKeyDown={(e) => { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); send(); } }} placeholder={ar ? "اكتب رسالة..." : "Type a message..."} className="flex-1 px-3 py-2 rounded-xl bg-slate-50 border border-slate-200 text-sm focus:bg-white focus:outline-none" />
              <button onClick={send} disabled={sending || (!text.trim() && !att)} className="btn btn-primary disabled:opacity-50"><Send size={15} /></button>
            </div>
          </>
        )}
      </section>
    </div>
  );
}
