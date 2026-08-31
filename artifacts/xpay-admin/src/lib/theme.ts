import { get } from "./api";

export interface AdminThemeSettings {
  theme_primary: string;
  theme_secondary: string;
  theme_accent: string;
  theme_background: string;
  theme_text_primary: string;
  theme_font_arabic: string;
  theme_font_english: string;
  theme_font_size: string;
  theme_border_radius: string | number;
  theme_shadow: string;
  theme_default_mode: string;
  theme_logo_size: string;
  [key: string]: any;
}

export const DEFAULT_ADMIN_THEME: AdminThemeSettings = {
  theme_primary: "#C8A45C",
  theme_secondary: "#B8954A",
  theme_accent: "#FDE68A",
  theme_background: "#1A1A1A",
  theme_text_primary: "#FFFFFF",
  theme_font_arabic: "Changa",
  theme_font_english: "Inter",
  theme_font_size: "14",
  theme_border_radius: "16",
  theme_shadow: "medium",
  theme_default_mode: "dark",
  theme_logo_size: "80px",
};

/**
 * Dynamically injects Google Fonts link into document head
 */
export function ensureGoogleFontsLoaded(arabicFont: string, englishFont: string) {
  try {
    const fonts = Array.from(new Set([arabicFont, englishFont].filter(Boolean)));
    if (fonts.length === 0) return;

    const fontFamiliesQuery = fonts
      .map((f) => `family=${encodeURIComponent(f).replace(/%20/g, "+")}:wght@300;400;500;600;700;800;900`)
      .join("&");

    const fontUrl = `https://fonts.googleapis.com/css2?${fontFamiliesQuery}&display=swap`;
    let link = document.getElementById("xpay-admin-google-fonts") as HTMLLinkElement | null;
    if (!link) {
      link = document.createElement("link");
      link.id = "xpay-admin-google-fonts";
      link.rel = "stylesheet";
      document.head.appendChild(link);
    }
    if (link.href !== fontUrl) {
      link.href = fontUrl;
    }
  } catch (e) {
    console.warn("[Admin Theme] Could not dynamically inject Google Font:", e);
  }
}

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
 * Applies dynamic CSS variables and style overrides to the Admin Panel
 */
export function applyAdminTheme(theme: Partial<AdminThemeSettings> | null | undefined) {
  if (!theme) return;

  const primary = String(theme.theme_primary || theme.primary || DEFAULT_ADMIN_THEME.theme_primary).trim();
  const secondary = String(theme.theme_secondary || theme.secondary || DEFAULT_ADMIN_THEME.theme_secondary).trim();
  const accent = String(theme.theme_accent || theme.accent || DEFAULT_ADMIN_THEME.theme_accent).trim();
  const background = String(theme.theme_background || theme.background || DEFAULT_ADMIN_THEME.theme_background).trim();
  const textPrimary = String(theme.theme_text_primary || theme.textPrimary || DEFAULT_ADMIN_THEME.theme_text_primary).trim();
  const fontArabic = String(theme.theme_font_arabic || theme.fontArabic || theme.font || DEFAULT_ADMIN_THEME.theme_font_arabic).trim();
  const fontEnglish = String(theme.theme_font_english || theme.fontEnglish || DEFAULT_ADMIN_THEME.theme_font_english).trim();
  const rawRadius = theme.theme_border_radius ?? theme.radius ?? DEFAULT_ADMIN_THEME.theme_border_radius;
  const radiusNum = Number(rawRadius);
  const radiusPx = Number.isFinite(radiusNum) && radiusNum >= 0 ? `${radiusNum}px` : "16px";
  const rawLogoSize = String(theme.theme_logo_size || theme.logoSize || DEFAULT_ADMIN_THEME.theme_logo_size).trim();
  const logoSizePx = rawLogoSize.includes("px") || rawLogoSize.includes("%") || rawLogoSize.includes("rem") ? rawLogoSize : `${rawLogoSize}px`;

  // 1. Ensure Fonts
  ensureGoogleFontsLoaded(fontArabic, fontEnglish);

  // 2. Set root CSS variables
  const root = document.documentElement;
  root.style.setProperty("--primary", primary);
  root.style.setProperty("--primary-dark", secondary);
  root.style.setProperty("--accent", accent);
  root.style.setProperty("--background", background);
  root.style.setProperty("--color-gold", primary);
  root.style.setProperty("--color-gold-dark", secondary);
  root.style.setProperty("--color-gold-light", accent);
  root.style.setProperty("--font-family-arabic", `'${fontArabic}', sans-serif`);
  root.style.setProperty("--font-family-english", `'${fontEnglish}', sans-serif`);
  root.style.setProperty("--font-family-sans", `'${fontArabic}', '${fontEnglish}', system-ui, sans-serif`);
  root.style.setProperty("--radius", radiusPx);
  root.style.setProperty("--theme-logo-size", logoSizePx);
  root.style.setProperty("--logo-size", logoSizePx);

  // 3. Inject Dynamic Style Tag
  let styleTag = document.getElementById("xpay-dynamic-admin-theme") as HTMLStyleElement | null;
  if (!styleTag) {
    styleTag = document.createElement("style");
    styleTag.id = "xpay-dynamic-admin-theme";
    document.head.appendChild(styleTag);
  }

  const primaryAlpha30 = hexWithAlpha(primary, "4D");
  const primaryAlpha15 = hexWithAlpha(primary, "26");

  styleTag.innerHTML = `
    :root {
      --primary: ${primary} !important;
      --primary-dark: ${secondary} !important;
      --accent: ${accent} !important;
      --background: ${background} !important;
      --color-gold: ${primary} !important;
      --color-gold-dark: ${secondary} !important;
      --color-gold-light: ${accent} !important;
      --radius: ${radiusPx} !important;
      --font-family-arabic: '${fontArabic}', sans-serif !important;
      --font-family-english: '${fontEnglish}', sans-serif !important;
      --font-family-sans: '${fontArabic}', '${fontEnglish}', system-ui, sans-serif !important;
    }

    body {
      background-color: ${background} !important;
      color: ${textPrimary} !important;
      font-family: '${fontArabic}', '${fontEnglish}', system-ui, sans-serif !important;
    }

    *, input, select, textarea, button {
      font-family: '${fontArabic}', '${fontEnglish}', system-ui, sans-serif !important;
    }

    /* Dynamic Brand Gold Classes in Admin */
    .text-\\[\\#C8A45C\\],
    .text-\\[\\#c8a45c\\] {
      color: ${primary} !important;
    }

    .text-\\[\\#FDE68A\\],
    .text-\\[\\#fde68a\\] {
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
    .border-\\[\\#C8A45C\\]\\/40 {
      border-color: ${primaryAlpha30} !important;
    }

    .bg-\\[\\#C8A45C\\]\\/10,
    .bg-\\[\\#C8A45C\\]\\/15,
    .bg-\\[\\#C8A45C\\]\\/20 {
      background-color: ${primaryAlpha15} !important;
    }

    input:focus, select:focus, textarea:focus {
      border-color: ${primary} !important;
    }

    ::-webkit-scrollbar-thumb:hover {
      background: ${primary} !important;
    }
  `;

  console.log("[Admin Theme] Applied Admin Theme successfully:", {
    primary,
    secondary,
    accent,
    background,
    fontArabic,
    fontEnglish,
  });
}

/**
 * Broadcasts theme change across active tabs and windows
 */
export function broadcastThemeChange(theme: Partial<AdminThemeSettings>) {
  try {
    localStorage.setItem("xpay_theme_updated", Date.now().toString());
    localStorage.setItem("theme_settings", JSON.stringify(theme));
    window.dispatchEvent(new CustomEvent("xpay_theme_change", { detail: theme }));
  } catch (e) {
    console.warn("[Admin Theme] Could not broadcast theme change:", e);
  }
}

/**
 * Fetches and applies theme from admin API
 */
export async function loadAndApplyAdminTheme(): Promise<AdminThemeSettings> {
  try {
    const data = await get<AdminThemeSettings>("/admin/theme-settings");
    applyAdminTheme(data);
    return data;
  } catch (err) {
    console.warn("[Admin Theme] Failed to load remote theme, using defaults:", err);
    applyAdminTheme(DEFAULT_ADMIN_THEME);
    return DEFAULT_ADMIN_THEME;
  }
}
