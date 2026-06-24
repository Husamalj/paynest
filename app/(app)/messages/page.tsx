"use client";

import Chat from "@/components/Chat";
import { useLanguage } from "@/lib/i18n/LanguageContext";

export default function MessagesPage() {
  const { lang } = useLanguage();
  const ar = lang === "ar";
  return (
    <div className="space-y-4">
      <div className="page-header">
        <div>
          <h2 className="page-title">{ar ? "المحادثات" : "Messages"}</h2>
          <p className="page-subtitle">{ar ? "تواصل خاص بينك وبين زملائك" : "Private chat with your colleagues"}</p>
        </div>
      </div>
      <Chat />
    </div>
  );
}
