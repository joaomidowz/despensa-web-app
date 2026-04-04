/** @type {import('tailwindcss').Config} */
export default {
  content: ["./index.html", "./src/**/*.{ts,tsx}"],
  theme: {
    extend: {
      colors: {
        surface: "var(--background)",
        ink: "var(--foreground)",
        primary: "var(--primary)",
        secondary: "var(--secundary)",
        tertiary: "var(--terciary)",
        card: "var(--white)",
        muted: "var(--color-gray-500)",
        border: "var(--gray-border)",
      },
      fontFamily: {
        body: ["var(--font-body)"],
      },
      boxShadow: {
        panel: "0 24px 80px rgba(57, 52, 156, 0.14)",
      },
      backgroundImage: {
        "hero-grid":
          "linear-gradient(rgba(82, 75, 224, 0.10) 1px, transparent 1px), linear-gradient(90deg, rgba(82, 75, 224, 0.10) 1px, transparent 1px)",
      },
    },
  },
  plugins: [],
};
