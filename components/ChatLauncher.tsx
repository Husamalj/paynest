"use client";

import { useEffect, useState } from "react";
import { useRouter, usePathname } from "next/navigation";
import { MessageSquare } from "lucide-react";
import { useLanguage } from "@/lib/i18n/LanguageContext";
import api from "@/lib/api";

/** Header chat button: navigates to the Messages page (no popup). */
export default function ChatLauncher({ className }: { className?: string }) {
  const { lang } = useLanguage();
  const ar = lang === "ar";
  const router = useRouter();
  const pathname = usePathname();
  const [unread, setUnread] = useState(0);
  const onMessages = (pathname || "").startsWith("/messages");

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

  return (
    <button
      onClick={() => { if (!onMessages) router.push("/messages"); }}
      className={className || "relative p-2 rounded-lg text-slate-500 hover:text-slate-900 hover:bg-slate-100 transition-colors"}
      title={ar ? "المحادثات" : "Messages"}
      aria-disabled={onMessages}
    >
      <MessageSquare size={18} />
      {unread > 0 && (
        <span className="absolute -top-0.5 -end-0.5 min-w-[16px] h-4 px-1 rounded-full bg-rose-500 text-white text-[10px] font-bold flex items-center justify-center leading-none">
          {unread > 9 ? "9+" : unread}
        </span>
      )}
    </button>
  );
}
