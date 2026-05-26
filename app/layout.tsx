import "./globals.css";
import { Caveat } from "next/font/google";
import { LanguageProvider } from "@/lib/i18n/LanguageContext";

const caveat = Caveat({ subsets: ["latin"], variable: "--font-caveat", display: "swap" });

export const metadata = { title: "PayNest", description: "HR & Payroll Management" };

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="ar" dir="rtl" className={caveat.variable}>
      <body className="min-h-screen bg-slate-50 text-slate-900">
        <LanguageProvider>{children}</LanguageProvider>
      </body>
    </html>
  );
}
