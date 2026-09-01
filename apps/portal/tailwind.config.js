/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,jsx}'],
  darkMode: 'class',
  theme: {
    extend: {
      colors: {
        erp: {
          bg: '#090d16',
          sidebar: '#0d131f',
          surface: '#111827',
          card: '#161f30',
          'card-hover': '#1c283f',
          border: '#1f2d42',
          'border-light': '#2b3d58',
          text: '#f1f5f9',
          'text-muted': '#94a3b8',
          'text-dim': '#64748b',
          primary: '#2563eb',
          'primary-hover': '#1d4ed8',
          'primary-light': '#3b82f6',
          'primary-glow': 'rgba(37, 99, 235, 0.2)',
          accent: '#0284c7',
          success: '#10b981',
          warning: '#f59e0b',
          danger: '#ef4444',
          purple: '#8b5cf6',
          cyan: '#06b6d4',
        },
      },
      fontFamily: {
        sans: ['Inter', 'system-ui', '-apple-system', 'Segoe UI', 'Roboto', 'sans-serif'],
        mono: ['JetBrains Mono', 'Fira Code', 'Roboto Mono', 'monospace'],
      },
      boxShadow: {
        'erp-sm': '0 1px 2px 0 rgba(0, 0, 0, 0.3)',
        'erp-md': '0 4px 6px -1px rgba(0, 0, 0, 0.4), 0 2px 4px -2px rgba(0, 0, 0, 0.3)',
        'erp-lg': '0 10px 15px -3px rgba(0, 0, 0, 0.5), 0 4px 6px -4px rgba(0, 0, 0, 0.4)',
        'erp-card': '0 0 0 1px rgba(255, 255, 255, 0.05), 0 2px 8px rgba(0, 0, 0, 0.4)',
      },
    },
  },
  plugins: [],
};

