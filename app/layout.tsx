import "./globals.css";
import { Caveat, Plus_Jakarta_Sans, Tajawal } from "next/font/google";
import { LanguageProvider } from "@/lib/i18n/LanguageContext";

const caveat = Caveat({
  subsets: ["latin"],
  variable: "--font-caveat",
  display: "swap",
});

const sans = Plus_Jakarta_Sans({
  subsets: ["latin"],
  variable: "--font-sans",
  display: "swap",
  weight: ["400", "500", "600", "700", "800"],
});

const arabic = Tajawal({
  subsets: ["arabic"],
  variable: "--font-arabic",
  display: "swap",
  weight: ["400", "500", "700", "800", "900"],
});

export const metadata = { title: "PayNest", description: "HR & Payroll Management" };

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html
      lang="ar"
      dir="rtl"
      className={`${caveat.variable} ${sans.variable} ${arabic.variable}`}
    >
      <body className="min-h-screen bg-slate-50 text-slate-900 antialiased font-sans">
        <LanguageProvider>{children}</LanguageProvider>
      </body>
    </html>
  );
}
