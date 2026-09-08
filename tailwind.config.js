/** @type {import('tailwindcss').Config} */
export default {
  content: ["./index.html", "./src/**/*.{js,jsx}"],
  darkMode: "class",
  theme: {
    extend: {
      colors: {
        // ── NOTA DE DECISIÓN ────────────────────────────────────────────────
        // El prototipo HTML define primary=#004e34 y primary-container=#006847.
        // El documento de diseño formal ("Institutional Technical Core") define
        // primary=#006847 (el "Verde CFE" institucional).
        // Aquí se usa el documento de diseño como fuente de verdad. Si el HTML
        // original es el correcto, solo hay que invertir estos dos valores.
        "primary-fixed": "#9ff4c9",
        primary: "#006847",
        "primary-dark": "#004e34", // valor del prototipo HTML, conservado por si se necesita
        "tertiary-fixed": "#ffdad7",
        error: "#ba1a1a",
        "on-tertiary-fixed": "#3d0507",
        "on-surface": "#181d1a",
        "on-tertiary-container": "#ffc4c0",
        "surface-container-lowest": "#ffffff",
        "on-error": "#ffffff",
        "on-tertiary": "#ffffff",
        "tertiary-container": "#904340",
        "tertiary-fixed-dim": "#ffb3ae",
        "on-secondary-container": "#00714d",
        "inverse-surface": "#2d312e",
        "on-primary-fixed": "#002114",
        "primary-fixed-dim": "#84d7ae",
        "surface-container": "#ebefea",
        "inverse-on-surface": "#eef2ed",
        "surface-container-highest": "#e0e4de",
        "error-container": "#ffdad6",
        "on-primary-fixed-variant": "#005237",
        "surface-dim": "#d7dbd6",
        "on-secondary": "#ffffff",
        "on-background": "#181d1a",
        "on-primary-container": "#90e4ba",
        "on-tertiary-fixed-variant": "#77302e",
        "secondary-fixed-dim": "#4edea3",
        "primary-container": "#004e34", // ver nota arriba
        background: "#f7faf5",
        secondary: "#006c49",
        // Acento del doc de diseño para "power flow" / estados activos (no existía
        // como token propio en el HTML original; queda disponible como accent-*)
        "accent-emerald": "#10b981",
        "surface-bright": "#f7faf5",
        "secondary-container": "#6cf8bb",
        "surface-container-high": "#e5e9e4",
        "on-surface-variant": "#3f4943",
        "on-primary": "#ffffff",
        "inverse-primary": "#84d7ae",
        "on-secondary-fixed": "#002113",
        "on-error-container": "#93000a",
        "secondary-fixed": "#6ffbbe",
        tertiary: "#722c2b",
        "surface-tint": "#096c4b",
        "surface-variant": "#e0e4de",
        "outline-variant": "#bec9c1",
        "on-secondary-fixed-variant": "#005236",
        outline: "#6f7a72",
        surface: "#f7faf5",
        "surface-container-low": "#f1f5ef",
        // Modo oscuro de alto contraste (monitoreo de larga duración), del doc de diseño
        "dark-surface": "#121212",
      },
      borderRadius: {
        DEFAULT: "0.5rem", // botones/inputs — doc de diseño
        sm: "0.25rem",
        md: "0.75rem",
        lg: "1rem", // bento cards — doc de diseño (el HTML usaba 0.5rem)
        xl: "1.5rem",
        full: "9999px",
      },
      spacing: {
        "bento-gap": "16px",
        "margin-mobile": "16px",
        unit: "8px",
        gutter: "24px",
        "margin-desktop": "40px",
      },
      fontFamily: {
        "title-md": ["Montserrat", "sans-serif"],
        "display-lg": ["Montserrat", "sans-serif"],
        "technical-mono": ["JetBrains Mono", "monospace"],
        "body-lg": ["Inter", "sans-serif"],
        "label-sm": ["Inter", "sans-serif"],
        "headline-lg": ["Montserrat", "sans-serif"],
        "body-md": ["Inter", "sans-serif"],
        "headline-lg-mobile": ["Montserrat", "sans-serif"],
      },
      fontSize: {
        "title-md": ["20px", { lineHeight: "1.4", fontWeight: "600" }],
        "display-lg": ["48px", { lineHeight: "1.2", letterSpacing: "-0.02em", fontWeight: "700" }],
        "technical-mono": ["14px", { lineHeight: "1.5", fontWeight: "400" }],
        "body-lg": ["18px", { lineHeight: "1.6", fontWeight: "400" }],
        "label-sm": ["12px", { lineHeight: "1", letterSpacing: "0.05em", fontWeight: "600" }],
        "headline-lg": ["32px", { lineHeight: "1.3", fontWeight: "600" }],
        "body-md": ["16px", { lineHeight: "1.5", fontWeight: "400" }],
        "headline-lg-mobile": ["24px", { lineHeight: "1.3", fontWeight: "600" }],
      },
      gridTemplateColumns: {
        bento: "repeat(12, minmax(0, 1fr))", // bento grid de 12 columnas — doc de diseño
      },
      backdropBlur: {
        glass: "20px", // glassmorphism de modales/overlays — doc de diseño
      },
      boxShadow: {
        lift: "0 10px 25px -5px rgba(0,0,0,0.1)", // hover "lift" en tarjetas — doc de diseño
      },
    },
  },
  plugins: [require("@tailwindcss/forms"), require("@tailwindcss/container-queries")],
};
