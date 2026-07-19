/** @type {import('tailwindcss').Config} */
export default {
  content: ["./index.html", "./src/**/*.{ts,tsx}"],
  theme: {
    extend: {
      colors: {
        space: {
          950: "#060a1a",
          900: "#0a1128",
          800: "#111a3a",
          700: "#1a2650",
        },
        hud: {
          cyan: "#22d3ee",
          teal: "#2dd4bf",
          amber: "#fbbf24",
        },
      },
      fontFamily: {
        display: ["Lexend", "Atkinson Hyperlegible", "system-ui", "sans-serif"],
      },
      boxShadow: {
        glow: "0 0 12px rgba(34,211,238,0.35)",
        glowAmber: "0 0 12px rgba(251,191,36,0.35)",
      },
    },
  },
  plugins: [],
};