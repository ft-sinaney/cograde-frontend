import type { Config } from "tailwindcss";

const config: Config = {
  darkMode: ["class", '[data-theme="dark"]'],
  content: [
    "./app/**/*.{ts,tsx}",
    "./components/**/*.{ts,tsx}",
    "./lib/**/*.{ts,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        bg: "hsl(var(--bg) / <alpha-value>)",
        "bg-raised": "hsl(var(--bg-raised) / <alpha-value>)",
        "bg-sunken": "hsl(var(--bg-sunken) / <alpha-value>)",
        surface: "hsl(var(--surface) / <alpha-value>)",
        "surface-hover": "hsl(var(--surface-hover) / <alpha-value>)",
        border: "hsl(var(--border) / <alpha-value>)",
        "border-soft": "hsl(var(--border-soft) / <alpha-value>)",
        text: "hsl(var(--text) / <alpha-value>)",
        "text-muted": "hsl(var(--text-muted) / <alpha-value>)",
        "text-faint": "hsl(var(--text-faint) / <alpha-value>)",
        primary: {
          DEFAULT: "hsl(var(--primary) / <alpha-value>)",
          hover: "hsl(var(--primary-hover) / <alpha-value>)",
          soft: "hsl(var(--primary-soft) / <alpha-value>)",
        },
        accent: "hsl(var(--accent) / <alpha-value>)",
        success: "hsl(var(--success) / <alpha-value>)",
        "success-soft": "hsl(var(--success-soft) / <alpha-value>)",
        warning: "hsl(var(--warning) / <alpha-value>)",
        "warning-soft": "hsl(var(--warning-soft) / <alpha-value>)",
        danger: "hsl(var(--danger) / <alpha-value>)",
        "danger-soft": "hsl(var(--danger-soft) / <alpha-value>)",
        info: "hsl(var(--info) / <alpha-value>)",
      },
      fontFamily: {
        sans: [
          "Inter",
          "ui-sans-serif",
          "system-ui",
          "-apple-system",
          "Segoe UI",
          "Roboto",
          "sans-serif",
        ],
      },
      boxShadow: {
        card: "0 1px 2px 0 hsl(var(--shadow-color) / 0.06), 0 4px 16px -4px hsl(var(--shadow-color) / 0.12)",
        raised:
          "0 2px 8px 0 hsl(var(--shadow-color) / 0.10), 0 12px 32px -8px hsl(var(--shadow-color) / 0.22)",
        glow: "0 0 0 1px hsl(var(--primary) / 0.4), 0 0 24px -4px hsl(var(--primary) / 0.5)",
      },
      backgroundImage: {
        "brand-gradient":
          "linear-gradient(135deg, hsl(var(--primary)) 0%, hsl(var(--accent)) 100%)",
        "radial-glow":
          "radial-gradient(ellipse 80% 60% at 50% -10%, hsl(var(--primary) / 0.25), transparent)",
      },
      borderRadius: {
        xl: "0.875rem",
        "2xl": "1.25rem",
      },
      keyframes: {
        "fade-in": {
          "0%": { opacity: "0", transform: "translateY(4px)" },
          "100%": { opacity: "1", transform: "translateY(0)" },
        },
        "spin-slow": {
          "0%": { transform: "rotate(0deg)" },
          "100%": { transform: "rotate(360deg)" },
        },
        shimmer: {
          "0%": { backgroundPosition: "-200% 0" },
          "100%": { backgroundPosition: "200% 0" },
        },
      },
      animation: {
        "fade-in": "fade-in 0.35s ease-out both",
        "spin-slow": "spin-slow 2.4s linear infinite",
        shimmer: "shimmer 2.2s linear infinite",
      },
    },
  },
  plugins: [],
};

export default config;
