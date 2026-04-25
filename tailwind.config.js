/** @type {import('tailwindcss').Config} */
module.exports = {
  darkMode: ['class'],
  content: ['./index.html', './src/**/*.{ts,tsx}'],
  theme: {
    extend: {
      colors: {
        // shadcn/ui compatibility tokens
        border: 'hsl(var(--border))',
        input: 'hsl(var(--input))',
        ring: 'hsl(var(--ring))',
        background: 'hsl(var(--background))',
        foreground: 'hsl(var(--foreground))',
        primary: {
          DEFAULT: 'hsl(var(--primary))',
          foreground: 'hsl(var(--primary-foreground))',
        },
        secondary: {
          DEFAULT: 'hsl(var(--secondary))',
          foreground: 'hsl(var(--secondary-foreground))',
        },
        destructive: {
          DEFAULT: 'hsl(var(--destructive))',
          foreground: 'hsl(var(--destructive-foreground))',
        },
        muted: {
          DEFAULT: 'hsl(var(--muted))',
          foreground: 'hsl(var(--muted-foreground))',
        },
        accent: {
          DEFAULT: 'hsl(var(--accent))',
          foreground: 'hsl(var(--accent-foreground))',
        },
        popover: {
          DEFAULT: 'hsl(var(--popover))',
          foreground: 'hsl(var(--popover-foreground))',
        },
        card: {
          DEFAULT: 'hsl(var(--card))',
          foreground: 'hsl(var(--card-foreground))',
        },
        // ── Lucid Git design tokens ───────────────────────────────────────
        // bg0 — canvas / outermost shell
        'lg-bg-primary':    '#0b0d13',
        // bg1 — sidebar, panels
        'lg-bg-base':       '#10131c',
        // bg2 — topbar, section headers
        'lg-bg-secondary':  '#161a27',
        // bg3 — elevated surfaces, dropdowns
        'lg-bg-overlay':    '#1d2235',
        // bg4 — hover targets, chips
        'lg-bg-elevated':   '#242a3d',
        // hover bg
        'lg-bg-hover':      '#1e2436',
        // borders
        'lg-border':        '#252d42',
        'lg-border-strong': '#2f3a54',
        // text
        'lg-text-primary':  '#dde1f0',
        'lg-text-secondary':'#8b94b0',
        'lg-text-muted':    '#4e5870',
        // accent colours
        'lg-accent':        '#e8622f',
        'lg-accent-blue':   '#4d9dff',
        'lg-success':       '#2ec573',
        'lg-warning':       '#f5a832',
        'lg-error':         '#e84545',
        'lg-purple':        '#a27ef0',
        // lock aliases
        'lg-lock-mine':     '#2ec573',
        'lg-lock-other':    '#e8622f',
      },
      borderRadius: {
        lg: 'var(--radius)',
        md: 'calc(var(--radius) - 2px)',
        sm: 'calc(var(--radius) - 4px)',
      },
      fontFamily: {
        sans: ['IBM Plex Sans', 'system-ui', 'sans-serif'],
        mono: ['JetBrains Mono', 'Cascadia Code', 'Consolas', 'monospace'],
      },
    },
  },
  plugins: [require('tailwindcss-animate')],
}
