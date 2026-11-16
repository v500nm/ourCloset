/** @type {import('tailwindcss').Config} */
module.exports = {
  darkMode: 'class',
  content: [
    './src/pages/**/*.{js,ts,jsx,tsx,mdx}',
    './src/components/**/*.{js,ts,jsx,tsx,mdx}',
    './src/features/**/*.{js,ts,jsx,tsx,mdx}',
    './src/app/**/*.{js,ts,jsx,tsx,mdx}',
  ],
  theme: {
    extend: {
      /* ───── Tailoring Workshop Palette (from DESIGN.md) ───── */
      colors: {
        /* Named brand tokens */
        'ink-bottle': '#1F3B33',
        'raw-silk': '#EDE6D6',
        brass: '#B8935A',
        sindoor: '#C1543A',
        'dusk-mauve': '#9A7B85',
        'charcoal-thread': '#2B2A28',

        /* Material Design 3 surface system */
        surface: '#faf9f7',
        'surface-dim': '#dadad8',
        'surface-bright': '#faf9f7',
        'surface-container-lowest': '#ffffff',
        'surface-container-low': '#f4f3f2',
        'surface-container': '#eeeeec',
        'surface-container-high': '#e9e8e6',
        'surface-container-highest': '#e3e2e0',
        'on-surface': '#1a1c1b',
        'on-surface-variant': '#414845',
        'inverse-surface': '#2f3130',
        'inverse-on-surface': '#f1f1ef',

        /* Outline */
        outline: '#727975',
        'outline-variant': '#c1c8c4',

        /* Primary */
        primary: '#08251e',
        'on-primary': '#ffffff',
        'primary-container': '#1f3b33',
        'on-primary-container': '#87a59b',
        'inverse-primary': '#aecdc2',
        'surface-tint': '#48645b',

        /* Secondary (brass family) */
        secondary: '#785926',
        'on-secondary': '#ffffff',
        'secondary-container': '#fed394',
        'on-secondary-container': '#795a26',

        /* Tertiary (dusk-mauve family) */
        tertiary: '#301a22',
        'on-tertiary': '#ffffff',
        'tertiary-container': '#472f38',
        'on-tertiary-container': '#b796a0',

        /* Error */
        error: '#ba1a1a',
        'on-error': '#ffffff',
        'error-container': '#ffdad6',
        'on-error-container': '#93000a',

        /* Fixed tones */
        'primary-fixed': '#cae9de',
        'primary-fixed-dim': '#aecdc2',
        'on-primary-fixed': '#032019',
        'on-primary-fixed-variant': '#304c44',
        'secondary-fixed': '#ffddae',
        'secondary-fixed-dim': '#e9c083',
        'on-secondary-fixed': '#281800',
        'on-secondary-fixed-variant': '#5d4210',
        'tertiary-fixed': '#fed9e4',
        'tertiary-fixed-dim': '#e1bdc8',
        'on-tertiary-fixed': '#2a151d',
        'on-tertiary-fixed-variant': '#594049',

        background: '#faf9f7',
        'on-background': '#1a1c1b',
        'surface-variant': '#e3e2e0',
      },

      /* ───── Typography (Domine / Inter / JetBrains Mono) ───── */
      fontFamily: {
        'display': ['Domine', 'Georgia', 'serif'],
        'body': ['Inter', 'system-ui', 'sans-serif'],
        'mono': ['JetBrains Mono', 'Menlo', 'monospace'],
      },
      fontSize: {
        'display-lg': ['42px', { lineHeight: '48px', letterSpacing: '-0.02em', fontWeight: '700' }],
        'display-lg-mobile': ['32px', { lineHeight: '36px', fontWeight: '700' }],
        'headline-md': ['24px', { lineHeight: '32px', fontWeight: '600' }],
        'body-md': ['16px', { lineHeight: '24px', fontWeight: '400' }],
        'body-sm': ['14px', { lineHeight: '20px', fontWeight: '400' }],
        'label-spec': ['12px', { lineHeight: '16px', letterSpacing: '0.05em', fontWeight: '500' }],
        'utility-mono': ['13px', { lineHeight: '18px', fontWeight: '400' }],
      },

      /* ───── Spacing (4px unit, 8px rhythm) ───── */
      spacing: {
        'unit': '4px',
        'gutter': '16px',
        'margin-mobile': '16px',
        'margin-desktop': '32px',
        'container-max': '1200px',
      },

      /* ───── Shapes (Tailoring Workshop) ───── */
      borderRadius: {
        'sm': '0.125rem',
        DEFAULT: '0.25rem',
        'md': '0.375rem',
        'lg': '0.5rem',
        'xl': '0.75rem',
        'full': '9999px',
      },

      maxWidth: {
        'container': '1200px',
      },
    },
  },
  plugins: [],
};
