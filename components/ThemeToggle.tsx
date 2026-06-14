"use client";

import { useEffect, useState } from "react";
import { Moon, Sun } from "lucide-react";

/** A small light/dark theme switch. Persists to localStorage and toggles the
 *  `dark` class on <html> (works with Tailwind darkMode:'class' + globals.css). */
export default function ThemeToggle({ className = "" }: { className?: string }) {
  const [dark, setDark] = useState(false);

  useEffect(() => {
    setDark(document.documentElement.classList.contains("dark"));
  }, []);

  const toggle = () => {
    const next = !dark;
    setDark(next);
    document.documentElement.classList.toggle("dark", next);
    try { localStorage.setItem("theme", next ? "dark" : "light"); } catch { /* ignore */ }
  };

  return (
    <button
      type="button"
      onClick={toggle}
      title={dark ? "Light mode" : "Dark mode"}
      className={`p-2 rounded-lg text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-700/50 transition-colors ${className}`}
    >
      {dark ? <Sun size={18} /> : <Moon size={18} />}
    </button>
  );
}
