"use client";

import { useEffect, useState } from "react";
import { useRouter, usePathname } from "next/navigation";
import { MessageSquare, X } from "lucide-react";
import { useLanguage } from "@/lib/i18n/LanguageContext";
import api from "@/lib/api";
import Chat from "@/components/Chat";

/**
 * Header chat button.
 *  - In the main app (HR/owner sidebar) it routes to the /messages page.
 *  - In the standalone employee/owner portals (which have no /messages route)
 *    it opens the chat in a popup instead.
 */
export default function ChatLauncher({ className }: { className?: string }) {
  const { lang } = useLanguage();
  const ar = lang === "ar";
  const router = useRouter();
  const pathname = usePathname() || "";
  const [unread, setUnread] = useState(0);
  const [open, setOpen] = useState(false);

  // Portals are not under the (app) layout, so /messages isn't reachable there.
  const isPortal = pathname.startsWith("/employee-portal") || pathname.startsWith("/owner-portal");
  const onMessages = pathname.startsWith("/messages");

  useEffect(() => {
    let alive = true;
    const load = async () => {
      try {
        const r = await api.get("/messages/contacts");
        if (!alive) return;
        const total = (r.data || []).reduce((s: number, c: any) => s + (c.unread || 0), 0);
        setUnread(total);
      } catch {}
    };
    load();
    const t = setInterval(load, 8000);
    return () => { alive = false; clearInterval(t); };
  }, []);

  const handleClick = () => {
    if (isPortal) setOpen(true);
    else if (!onMessages) router.push("/messages");
  };

  return (
    <>
      <button
        onClick={handleClick}
        className={className || "relative p-2 rounded-lg text-slate-500 hover:text-slate-900 hover:bg-slate-100 transition-colors"}
        title={ar ? "المحادثات" : "Messages"}
      >
        <MessageSquare size={18} />
        {unread > 0 && (
          <span className="absolute -top-0.5 -end-0.5 min-w-[16px] h-4 px-1 rounded-full bg-rose-500 text-white text-[10px] font-bold flex items-center justify-center leading-none">
            {unread > 9 ? "9+" : unread}
          </span>
        )}
      </button>

      {open && (
        <div className="fixed inset-0 z-50 bg-black/40 flex items-center justify-center p-3 sm:p-6" onClick={(e) => { if (e.target === e.currentTarget) setOpen(false); }}>
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-4xl h-[85vh] max-h-[680px] flex flex-col overflow-hidden" dir={ar ? "rtl" : "ltr"}>
            <div className="flex items-center justify-between px-5 py-3 border-b border-slate-100 flex-shrink-0">
              <div className="flex items-center gap-2 font-bold text-slate-900"><MessageSquare size={18} className="text-brand-600" />{ar ? "المحادثات" : "Messages"}</div>
              <button onClick={() => setOpen(false)} className="text-slate-400 hover:text-slate-700"><X size={20} /></button>
            </div>
            <div className="flex-1 min-h-0">
              <Chat heightClass="h-full" bare />
            </div>
          </div>
        </div>
      )}
    </>
  );
}
