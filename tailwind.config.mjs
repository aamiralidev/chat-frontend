import scrollbar from 'tailwind-scrollbar'
import plugin from 'tailwindcss/plugin'



export default {
  darkMode: 'class',
  content: [
    "./index.html",
    "./src/**/*.{js,jsx,ts,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        bg: 'var(--bg)',
        text: 'var(--text)',
        border: 'var(--border)',
        primary: 'var(--primary)',
      },
    },
  },
  plugins: [
    plugin(scrollbar({ nocompatible: true })),
  ],
}
