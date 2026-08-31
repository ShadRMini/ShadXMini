export interface StoreThemeSettings {
  primary: string;
  secondary?: string;
  accent: string;
  background: string;
  textPrimary?: string;
  fontArabic: string;
  fontEnglish: string;
  font?: string;
  radius: string | number;
  borderRadius?: string | number;
  shadow?: string;
  defaultMode?: string;
  fontSize?: string;
  logoSize?: string;
  theme_primary?: string;
  theme_secondary?: string;
  theme_accent?: string;
  theme_background?: string;
  theme_text_primary?: string;
  theme_font_arabic?: string;
  theme_font_english?: string;
  theme_font_size?: string;
  theme_border_radius?: string | number;
  theme_shadow?: string;
  theme_default_mode?: string;
  theme_logo_size?: string;
}

export const DEFAULT_STORE_THEME: StoreThemeSettings = {
  primary: "#C8A45C",
  secondary: "#B8954A",
  accent: "#FDE68A",
  background: "#1A1A1A",
  textPrimary: "#FFFFFF",
  fontArabic: "Cairo",
  fontEnglish: "Inter",
  font: "Cairo",
  radius: "16",
  shadow: "medium",
  defaultMode: "dark",
  fontSize: "14",
  logoSize: "80px",
  theme_primary: "#C8A45C",
  theme_secondary: "#B8954A",
  theme_accent: "#FDE68A",
  theme_background: "#1A1A1A",
  theme_text_primary: "#FFFFFF",
  theme_font_arabic: "Cairo",
  theme_font_english: "Inter",
  theme_font_size: "14",
  theme_border_radius: "16",
  theme_shadow: "medium",
  theme_default_mode: "dark",
  theme_logo_size: "80px",
};

let cachedThemeSettings: StoreThemeSettings = { ...DEFAULT_STORE_THEME };

/**
 * Dynamically loads Google Fonts for Arabic & English
 */
export function ensureGoogleFontsLoaded(arabicFont: string, englishFont: string) {
  try {
    const fonts = Array.from(new Set([arabicFont, englishFont].filter(Boolean)));
    if (fonts.length === 0) return;

    const fontFamiliesQuery = fonts
      .map((f) => `family=${encodeURIComponent(f).replace(/%20/g, "+")}:wght@300;400;500;600;700;800;900`)
      .join("&");

    const fontUrl = `https://fonts.googleapis.com/css2?${fontFamiliesQuery}&display=swap`;
    let link = document.getElementById("xpay-store-google-fonts") as HTMLLinkElement | null;
    if (!link) {
      link = document.createElement("link");
      link.id = "xpay-store-google-fonts";
      link.rel = "stylesheet";
      document.head.appendChild(link);
    }
    if (link.href !== fontUrl) {
      link.href = fontUrl;
    }
  } catch (e) {
    console.warn("[Theme] Could not dynamically inject Google Font:", e);
  }
}

/**
 * Helper to convert shadow style name to CSS box-shadow
 */
function getShadowCss(shadow: string, primaryColor: string, isLight = false): string {
  switch (shadow) {
    case "none":
      return "none";
    case "soft":
      return isLight ? "0 2px 8px rgba(0, 0, 0, 0.05)" : "0 4px 14px rgba(0, 0, 0, 0.15)";
    case "glow":
      return `0 0 25px ${primaryColor}40, 0 4px 15px ${isLight ? "rgba(0,0,0,0.06)" : "rgba(0,0,0,0.3)"}`;
    case "large":
    case "deep":
      return isLight ? "0 10px 25px -3px rgba(0, 0, 0, 0.08)" : "0 15px 35px -5px rgba(0, 0, 0, 0.5)";
    case "medium":
    default:
      return isLight
        ? "0 4px 18px rgba(0, 0, 0, 0.07)"
        : "0 8px 25px -4px rgba(0, 0, 0, 0.35), 0 4px 10px -2px rgba(0, 0, 0, 0.2)";
  }
}

/**
 * Formats a hex color with alpha channel
 */
function hexWithAlpha(hex: string, alphaHex: string): string {
  const cleanHex = hex.trim().replace(/^#/, "");
  if (cleanHex.length === 6) {
    return `#${cleanHex}${alphaHex}`;
  }
  if (cleanHex.length === 3) {
    const expanded = cleanHex
      .split("")
      .map((c) => c + c)
      .join("");
    return `#${expanded}${alphaHex}`;
  }
  return hex;
}

/**
 * Gets the current active mode (dark or light), prioritizing user preference in localStorage
 */
export function getStoreThemeMode(): "dark" | "light" {
  try {
    const saved = localStorage.getItem("theme-preference") || localStorage.getItem("theme_mode");
    if (saved === "light" || saved === "dark") {
      return saved;
    }
  } catch {
    // Ignore storage restrictions
  }
  const defaultMode = cachedThemeSettings?.theme_default_mode || cachedThemeSettings?.defaultMode || "dark";
  return defaultMode === "light" ? "light" : "dark";
}

/**
 * Sets the active theme mode preference
 */
export function setStoreThemeMode(mode: "dark" | "light") {
  try {
    localStorage.setItem("theme-preference", mode);
    localStorage.setItem("theme_mode", mode);
  } catch {
    // Ignore storage restrictions
  }
  applyStoreTheme(cachedThemeSettings);
  window.dispatchEvent(new CustomEvent("xpay_theme_mode_changed", { detail: { mode } }));
  window.dispatchEvent(new CustomEvent("xpay_theme_change", { detail: { mode } }));
}

/**
 * Toggles between dark and light mode
 */
export function toggleStoreThemeMode(): "dark" | "light" {
  const current = getStoreThemeMode();
  const next = current === "dark" ? "light" : "dark";
  setStoreThemeMode(next);
  return next;
}

/**
 * Applies dynamic CSS variables and style overrides to the document
 */
export function applyStoreTheme(theme?: Partial<StoreThemeSettings> | null | undefined) {
  if (theme) {
    cachedThemeSettings = { ...cachedThemeSettings, ...theme };
  }
  const currentTheme = cachedThemeSettings;

  const currentMode = getStoreThemeMode();
  const isLight = currentMode === "light";

  const primary = String(currentTheme.primary || currentTheme.theme_primary || DEFAULT_STORE_THEME.primary).trim();
  const secondary = String(currentTheme.secondary || currentTheme.theme_secondary || DEFAULT_STORE_THEME.secondary).trim();
  const accent = String(currentTheme.accent || currentTheme.theme_accent || DEFAULT_STORE_THEME.accent).trim();

  // Dark & Light customized / standard palettes
  const customDarkBg = String(currentTheme.theme_background || currentTheme.background || "").trim();
  const customTextPrimary = String(currentTheme.theme_text_primary || currentTheme.textPrimary || "").trim();

  const bgPrimary = isLight ? "#F5F2EB" : (customDarkBg || "#1A1A1A");
  const bgSecondary = isLight ? "#FFFFFF" : "#242424";
  const bgCard = isLight ? "#FFFFFF" : "#2D2D2D";
  const bgInput = isLight ? "#F9FAFB" : "#3D3D3D";
  const textPrimary = isLight ? "#111827" : (customTextPrimary || "#FFFFFF");
  const textSecondary = isLight ? "#374151" : "#E5E7EB";
  const textMuted = isLight ? "#6B7280" : "#9CA3AF";
  const borderColor = isLight ? "#D1D5DB" : "#4B5563";
  const shadowColor = isLight ? "rgba(0, 0, 0, 0.08)" : "rgba(0, 0, 0, 0.35)";

  const fontArabic = String(currentTheme.fontArabic || currentTheme.theme_font_arabic || currentTheme.font || DEFAULT_STORE_THEME.fontArabic).trim();
  const fontEnglish = String(currentTheme.fontEnglish || currentTheme.theme_font_english || DEFAULT_STORE_THEME.fontEnglish).trim();
  const rawRadius = currentTheme.radius ?? currentTheme.theme_border_radius ?? DEFAULT_STORE_THEME.radius;
  const radiusNum = Number(rawRadius);
  const radiusPx = Number.isFinite(radiusNum) && radiusNum >= 0 ? `${radiusNum}px` : "16px";
  const rawShadow = String(currentTheme.shadow || currentTheme.theme_shadow || "medium").trim();
  const shadowCss = getShadowCss(rawShadow, primary, isLight);

  const rawLogoSize = String(currentTheme.theme_logo_size || currentTheme.logoSize || DEFAULT_STORE_THEME.theme_logo_size).trim();
  const logoSizePx = rawLogoSize.includes("px") || rawLogoSize.includes("%") || rawLogoSize.includes("rem") ? rawLogoSize : `${rawLogoSize}px`;

  // 1. Ensure Fonts
  ensureGoogleFontsLoaded(fontArabic, fontEnglish);

  // 2. Set root CSS variables & class
  const root = document.documentElement;

  if (isLight) {
    root.classList.remove("dark");
    root.classList.add("light");
    root.setAttribute("data-theme", "light");
  } else {
    root.classList.remove("light");
    root.classList.add("dark");
    root.setAttribute("data-theme", "dark");
  }

  // Exact standard variables
  root.style.setProperty("--bg-primary", bgPrimary);
  root.style.setProperty("--bg-secondary", bgSecondary);
  root.style.setProperty("--bg-card", bgCard);
  root.style.setProperty("--bg-input", bgInput);
  root.style.setProperty("--text-primary", textPrimary);
  root.style.setProperty("--text-secondary", textSecondary);
  root.style.setProperty("--text-muted", textMuted);
  root.style.setProperty("--border-color", borderColor);
  root.style.setProperty("--shadow-color", shadowColor);
  root.style.setProperty("--gold-primary", primary);
  root.style.setProperty("--gold-light", accent);
  root.style.setProperty("--gold-dark", secondary);

  // Specific requested variables
  root.style.setProperty("--theme-primary", primary);
  root.style.setProperty("--theme-secondary", secondary);
  root.style.setProperty("--theme-accent", accent);
  root.style.setProperty("--theme-background", bgPrimary);
  root.style.setProperty("--theme-text-primary", textPrimary);
  root.style.setProperty("--theme-font-arabic", `'${fontArabic}', sans-serif`);
  root.style.setProperty("--theme-font-english", `'${fontEnglish}', sans-serif`);
  root.style.setProperty("--theme-border-radius", radiusPx);
  root.style.setProperty("--theme-shadow", shadowCss);
  root.style.setProperty("--theme-logo-size", logoSizePx);
  root.style.setProperty("--logo-size", logoSizePx);

  // Core & Component CSS Variables
  root.style.setProperty("--primary", primary);
  root.style.setProperty("--primary-dark", secondary);
  root.style.setProperty("--accent", accent);
  root.style.setProperty("--background", bgPrimary);
  root.style.setProperty("--dark", isLight ? "#FFFFFF" : bgPrimary);
  root.style.setProperty("--card", bgCard);
  root.style.setProperty("--card-foreground", textPrimary);
  root.style.setProperty("--color-gold", primary);
  root.style.setProperty("--color-gold-dark", secondary);
  root.style.setProperty("--color-gold-light", accent);
  root.style.setProperty("--color-deep-dark", bgPrimary);
  root.style.setProperty("--radius", radiusPx);
  root.style.setProperty("--font-arabic", `'${fontArabic}', sans-serif`);
  root.style.setProperty("--font-english", `'${fontEnglish}', sans-serif`);
  root.style.setProperty("--app-font-sans", `'${fontArabic}', '${fontEnglish}', sans-serif`);

  // 3. Inject Comprehensive Dynamic Style Tag
  let styleTag = document.getElementById("xpay-dynamic-store-theme") as HTMLStyleElement | null;
  if (!styleTag) {
    styleTag = document.createElement("style");
    styleTag.id = "xpay-dynamic-store-theme";
    document.head.appendChild(styleTag);
  }

  const primaryAlpha20 = hexWithAlpha(primary, "33");
  const primaryAlpha30 = hexWithAlpha(primary, "4D");
  const primaryAlpha10 = hexWithAlpha(primary, "1A");

  styleTag.innerHTML = `
    :root {
      --theme-primary: ${primary} !important;
      --theme-secondary: ${secondary} !important;
      --theme-accent: ${accent} !important;
      --theme-background: ${bgPrimary} !important;
      --theme-text-primary: ${textPrimary} !important;
      --theme-font-arabic: '${fontArabic}', sans-serif !important;
      --theme-font-english: '${fontEnglish}', sans-serif !important;
      --theme-border-radius: ${radiusPx} !important;
      --theme-shadow: ${shadowCss} !important;
      --theme-logo-size: ${logoSizePx} !important;
      --logo-size: ${logoSizePx} !important;
      --header-height: 72px !important;

      --primary: ${primary} !important;
      --primary-dark: ${secondary} !important;
      --accent: ${accent} !important;
      --background: ${bgPrimary} !important;
      --color-gold: ${primary} !important;
      --color-gold-dark: ${secondary} !important;
      --color-gold-light: ${accent} !important;
      --radius: ${radiusPx} !important;
      --font-arabic: '${fontArabic}', sans-serif !important;
      --font-english: '${fontEnglish}', sans-serif !important;
      --app-font-sans: '${fontArabic}', '${fontEnglish}', sans-serif !important;
    }

    body {
      background-color: ${bgPrimary} !important;
      color: ${textPrimary} !important;
      font-family: '${fontArabic}', '${fontEnglish}', sans-serif !important;
    }

    body, html, *, button, input, select, textarea {
      font-family: '${fontArabic}', '${fontEnglish}', sans-serif !important;
    }

    /* Helper theme classes */
    .bg-theme-primary { background-color: ${bgPrimary} !important; }
    .bg-theme-secondary { background-color: ${bgSecondary} !important; }
    .bg-theme-card { background-color: ${bgCard} !important; }
    .bg-theme-input { background-color: ${bgInput} !important; }
    .text-theme-primary { color: ${textPrimary} !important; }
    .text-theme-secondary { color: ${textSecondary} !important; }
    .text-theme-muted { color: ${textMuted} !important; }
    .border-theme { border-color: ${borderColor} !important; }
    .shadow-theme { box-shadow: ${shadowCss} !important; }
    .rounded-theme { border-radius: ${radiusPx} !important; }
    .font-theme-arabic { font-family: '${fontArabic}', sans-serif !important; }
    .font-theme-english { font-family: '${fontEnglish}', sans-serif !important; }

    /* Logo scaling rules */
    .store-brand-logo,
    .theme-logo {
      height: ${logoSizePx};
      max-height: calc(var(--header-height, 72px) - 20px);
      width: auto;
      max-width: 260px;
      object-fit: contain;
    }

    .logo-container {
      height: var(--header-height, 72px);
      display: flex;
      align-items: center;
      overflow: hidden;
    }

    /* Dynamic Brand Primary Overrides */
    .text-\\[\\#C8A45C\\],
    .text-\\[\\#c8a45c\\],
    .text-amber-400,
    .text-yellow-500 {
      color: ${primary} !important;
    }

    .text-\\[\\#FDE68A\\],
    .text-\\[\\#fde68a\\],
    .text-amber-300,
    .text-yellow-300 {
      color: ${accent} !important;
    }

    .bg-\\[\\#C8A45C\\],
    .bg-\\[\\#c8a45c\\] {
      background-color: ${primary} !important;
    }

    .bg-\\[\\#B8954A\\],
    .bg-\\[\\#b8954a\\] {
      background-color: ${secondary} !important;
    }

    .border-\\[\\#C8A45C\\],
    .border-\\[\\#c8a45c\\] {
      border-color: ${primary} !important;
    }

    .border-\\[\\#C8A45C\\]\\/20,
    .border-\\[\\#C8A45C\\]\\/30,
    .border-\\[\\#C8A45C\\]\\/40,
    .border-amber-500\\/20,
    .border-amber-500\\/30 {
      border-color: ${primaryAlpha30} !important;
    }

    .bg-\\[\\#C8A45C\\]\\/10,
    .bg-\\[\\#C8A45C\\]\\/15,
    .bg-\\[\\#C8A45C\\]\\/20,
    .bg-amber-500\\/10,
    .bg-amber-500\\/20 {
      background-color: ${primaryAlpha10} !important;
    }

    /* Card & Box Styling */
    .rounded-theme,
    .rounded-3xl,
    .rounded-2xl,
    .rounded-xl,
    .card-luxury,
    .xpay-brand-card {
      border-radius: ${radiusPx} !important;
    }

    .shadow-theme,
    .shadow-2xl,
    .shadow-xl,
    .shadow-lg,
    .card-luxury,
    .xpay-brand-card {
      box-shadow: ${shadowCss} !important;
    }

    /* Selection Color */
    ::selection {
      background-color: ${primary} !important;
      color: #000000 !important;
    }
  `;
}

/**
 * Fetches and applies theme from backend public API
 */
export async function loadAndApplyStoreTheme(apiBase = ""): Promise<StoreThemeSettings> {
  const endpoints = [
    `${apiBase}/api/public/theme-settings`,
    `${apiBase}/api/theme-settings`,
    `${apiBase}/api/theme`,
  ];

  for (const endpoint of endpoints) {
    try {
      const res = await fetch(endpoint);
      if (res.ok) {
        const data: StoreThemeSettings = await res.json();
        applyStoreTheme(data);
        return data;
      }
    } catch {
      // try next fallback
    }
  }

  applyStoreTheme(DEFAULT_STORE_THEME);
  return DEFAULT_STORE_THEME;
}


