import type { Config } from "tailwindcss";

const config: Config = {
  content: [
    "./app/**/*.{ts,tsx}",
    "./components/**/*.{ts,tsx}",
    "./lib/**/*.{ts,tsx}",
  ],
  theme: {
    extend: {
      fontFamily: {
        sans: ["Inter", "system-ui", "sans-serif"],
        arabic: ["Cairo", "Segoe UI", "Tahoma", "sans-serif"],
        caveat: ["var(--font-caveat)", "cursive"],
      },
      colors: {
        brand: {
          50: "#f0f7ff",
          100: "#e0eefe",
          200: "#bae0fd",
          300: "#7cc7fc",
          400: "#36a9f7",
          500: "#0c8ce8",
          600: "#006fc6",
          700: "#0259a1",
          800: "#064b85",
          900: "#0b3f6e",
          950: "#072849",
        },
      },
      boxShadow: {
        soft: "0 1px 2px 0 rgba(15, 23, 42, 0.04), 0 1px 3px 0 rgba(15, 23, 42, 0.05)",
        card: "0 1px 3px 0 rgba(15, 23, 42, 0.06), 0 1px 2px -1px rgba(15, 23, 42, 0.04)",
        elevated: "0 4px 16px -4px rgba(15, 23, 42, 0.08), 0 2px 4px -2px rgba(15, 23, 42, 0.04)",
        "btn-hover": "0 4px 12px -2px rgba(15, 23, 42, 0.12), 0 2px 4px -1px rgba(15, 23, 42, 0.08)",
        "btn-primary-hover": "0 4px 14px -2px rgba(0, 111, 198, 0.35)",
        "btn-success-hover": "0 4px 14px -2px rgba(5, 150, 105, 0.35)",
        "btn-danger-hover": "0 4px 14px -2px rgba(225, 29, 72, 0.35)",
        "card-hover": "0 8px 24px -4px rgba(15, 23, 42, 0.10), 0 4px 8px -2px rgba(15, 23, 42, 0.06)",
      },
      keyframes: {
        "fade-in": {
          "0%": { opacity: "0", transform: "translateY(4px)" },
          "100%": { opacity: "1", transform: "translateY(0)" },
        },
        "slide-in": {
          "0%": { opacity: "0", transform: "translateX(-8px)" },
          "100%": { opacity: "1", transform: "translateX(0)" },
        },
      },
      animation: {
        "fade-in": "fade-in 0.2s ease-out",
        "slide-in": "slide-in 0.2s ease-out",
      },
    },
  },
  plugins: [],
};

export default config;
