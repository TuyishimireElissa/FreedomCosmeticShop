/** @type {import('tailwindcss').Config} */
module.exports = {
  content: ["./App.tsx", "./src/**/*.{ts,tsx}"],
  theme: {
    extend: {
      colors: {
        primary: {
          DEFAULT: "#b76e79",
          foreground: "#fff8f3",
          50: "#fdf2f4",
          100: "#fce4ec",
          200: "#f9c5d4",
          300: "#f399b0",
          400: "#e96d8c",
          500: "#d64d6f",
          600: "#b76e79",
          700: "#9a4f5c",
          800: "#7d3a45",
          900: "#6d3a45",
        },
        background: "#fff8f3",
        foreground: "#6d3a45",
        card: "#ffffff",
        muted: "#fce4ec",
        border: "#f3e0d8",
      },
      fontFamily: {
        sans: ["System"],
      },
    },
  },
  plugins: [],
}
