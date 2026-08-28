import type { Config } from "tailwindcss";

export default {
  darkMode: ["class"],
  // Scan live app code only. Unused shadcn files (sidebar, chart, accordion, …)
  // still live on disk but must not generate homepage CSS.
  // Positive globs only — a `!ui/**` exclude was wiping the files listed below.
  content: [
    "./index.html",
    "./src/App.tsx",
    "./src/main.tsx",
    "./src/pages/**/*.{ts,tsx}",
    "./src/components/landing/**/*.{ts,tsx}",
    "./src/components/nomination/**/*.{ts,tsx}",
    "./src/components/admin/**/*.{ts,tsx}",
    "./src/hooks/**/*.{ts,tsx}",
    "./src/contexts/**/*.{ts,tsx}",
    "./src/lib/**/*.{ts,tsx}",
    "./src/components/ui/badge.tsx",
    "./src/components/ui/button.tsx",
    "./src/components/ui/calendar.tsx",
    "./src/components/ui/command.tsx",
    "./src/components/ui/dialog.tsx",
    "./src/components/ui/input-otp.tsx",
    "./src/components/ui/input.tsx",
    "./src/components/ui/label.tsx",
    "./src/components/ui/popover.tsx",
    "./src/components/ui/select.tsx",
    "./src/components/ui/switch.tsx",
    "./src/components/ui/textarea.tsx",
    "./src/components/ui/toast.tsx",
    "./src/components/ui/toaster.tsx",
  ],
  prefix: "",
  theme: {
    container: {
      center: true,
      padding: "1rem",
      screens: {
        "2xl": "1280px",
      },
    },
    extend: {
      fontFamily: {
        heading: ['"DM Sans"', '"Inter"', 'sans-serif'],
        body: ['"Inter"', '"DM Sans"', 'sans-serif'],
      },
      colors: {
        border: "hsl(var(--border))",
        input: "hsl(var(--input))",
        ring: "hsl(var(--ring))",
        background: "hsl(var(--background))",
        foreground: "hsl(var(--foreground))",
        primary: {
          DEFAULT: "hsl(var(--primary))",
          foreground: "hsl(var(--primary-foreground))",
        },
        secondary: {
          DEFAULT: "hsl(var(--secondary))",
          foreground: "hsl(var(--secondary-foreground))",
        },
        destructive: {
          DEFAULT: "hsl(var(--destructive))",
          foreground: "hsl(var(--destructive-foreground))",
        },
        muted: {
          DEFAULT: "hsl(var(--muted))",
          foreground: "hsl(var(--muted-foreground))",
        },
        accent: {
          DEFAULT: "hsl(var(--accent))",
          foreground: "hsl(var(--accent-foreground))",
        },
        popover: {
          DEFAULT: "hsl(var(--popover))",
          foreground: "hsl(var(--popover-foreground))",
        },
        card: {
          DEFAULT: "hsl(var(--card))",
          foreground: "hsl(var(--card-foreground))",
        },
        sidebar: {
          DEFAULT: "hsl(var(--sidebar-background))",
          foreground: "hsl(var(--sidebar-foreground))",
          primary: "hsl(var(--sidebar-primary))",
          "primary-foreground": "hsl(var(--sidebar-primary-foreground))",
          accent: "hsl(var(--sidebar-accent))",
          "accent-foreground": "hsl(var(--sidebar-accent-foreground))",
          border: "hsl(var(--sidebar-border))",
          ring: "hsl(var(--sidebar-ring))",
        },
      },
      borderRadius: {
        lg: "var(--radius)",
        md: "calc(var(--radius) - 2px)",
        sm: "calc(var(--radius) - 4px)",
      },
    },
  },
  plugins: [require("tailwindcss-animate")],
} satisfies Config;
