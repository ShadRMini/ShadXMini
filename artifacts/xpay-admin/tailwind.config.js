/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        gold: {
          DEFAULT: "#C8A45C",
          dark: "#B8954A",
          light: "#FDE68A",
        },
        brand: {
          DEFAULT: "#C8A45C",
          gold: "#C8A45C",
          "gold-dark": "#B8954A",
          "gold-light": "#FDE68A",
          dark: "#1A1A1A",
          beige: "#F5F2EB",
          50: "#FAF6ED",
          100: "#F4ECD6",
          200: "#EBD9AC",
          300: "#DEC37F",
          400: "#D3B266",
          500: "#C8A45C",
          600: "#B8954A",
          700: "#967537",
          800: "#755928",
          900: "#543F1B",
        },
        dark: {
          DEFAULT: "#1A1A1A",
          surface: "#242424",
          muted: "#2A2A2A",
        },
        beige: "#F5F2EB",
      },
      fontFamily: {
        arabic: ["Cairo", "sans-serif"],
        english: ["Inter", "sans-serif"],
        sans: ["Cairo", "Inter", "sans-serif"],
      },
      boxShadow: {
        gold: "0 4px 20px -2px rgba(200, 164, 92, 0.25)",
        "gold-lg": "0 10px 25px -3px rgba(200, 164, 92, 0.35)",
        luxury: "0 10px 30px -5px rgba(26, 26, 26, 0.08)",
      },
    },
  },
  plugins: [],
};
