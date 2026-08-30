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
  shadow?: string;
  defaultMode?: string;
  fontSize?: string;
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
};

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
 * Applies dynamic CSS variables and style overrides to the document
 */
export function applyStoreTheme(theme: Partial<StoreThemeSettings> | null | undefined) {
  if (!theme) return;

  const primary = String(theme.primary || theme.theme_primary || DEFAULT_STORE_THEME.primary).trim();
  const secondary = String(theme.secondary || theme.theme_secondary || DEFAULT_STORE_THEME.secondary).trim();
  const accent = String(theme.accent || theme.theme_accent || DEFAULT_STORE_THEME.accent).trim();
  const background = String(theme.background || theme.theme_background || DEFAULT_STORE_THEME.background).trim();
  const textPrimary = String(theme.textPrimary || theme.theme_text_primary || DEFAULT_STORE_THEME.textPrimary).trim();
  const fontArabic = String(theme.fontArabic || theme.theme_font_arabic || theme.font || DEFAULT_STORE_THEME.fontArabic).trim();
  const fontEnglish = String(theme.fontEnglish || theme.theme_font_english || DEFAULT_STORE_THEME.fontEnglish).trim();
  const rawRadius = theme.radius ?? theme.theme_border_radius ?? DEFAULT_STORE_THEME.radius;
  const radiusNum = Number(rawRadius);
  const radiusPx = Number.isFinite(radiusNum) && radiusNum >= 0 ? `${radiusNum}px` : "16px";
  const defaultMode = String(theme.defaultMode || theme.theme_default_mode || "dark").trim();

  // 1. Ensure Fonts
  ensureGoogleFontsLoaded(fontArabic, fontEnglish);

  // 2. Set root CSS variables
  const root = document.documentElement;
  root.style.setProperty("--primary", primary);
  root.style.setProperty("--primary-dark", secondary);
  root.style.setProperty("--accent", accent);
  root.style.setProperty("--background", background);
  root.style.setProperty("--dark", background);
  root.style.setProperty("--color-gold", primary);
  root.style.setProperty("--color-gold-dark", secondary);
  root.style.setProperty("--color-gold-light", accent);
  root.style.setProperty("--color-deep-dark", background);
  root.style.setProperty("--radius", radiusPx);
  root.style.setProperty("--font-arabic", `'${fontArabic}', sans-serif`);
  root.style.setProperty("--font-english", `'${fontEnglish}', sans-serif`);
  root.style.setProperty("--app-font-sans", `'${fontArabic}', '${fontEnglish}', sans-serif`);

  // Dark or Light mode class
  if (defaultMode === "light") {
    root.classList.remove("dark");
    root.classList.add("light");
  } else {
    root.classList.remove("light");
    root.classList.add("dark");
  }

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
      --primary: ${primary} !important;
      --primary-dark: ${secondary} !important;
      --accent: ${accent} !important;
      --background: ${background} !important;
      --color-gold: ${primary} !important;
      --color-gold-dark: ${secondary} !important;
      --color-gold-light: ${accent} !important;
      --radius: ${radiusPx} !important;
      --font-arabic: '${fontArabic}', sans-serif !important;
      --font-english: '${fontEnglish}', sans-serif !important;
      --app-font-sans: '${fontArabic}', '${fontEnglish}', sans-serif !important;
    }

    body {
      background-color: ${background} !important;
      color: ${textPrimary} !important;
      font-family: '${fontArabic}', '${fontEnglish}', sans-serif !important;
    }

    * {
      font-family: '${fontArabic}', '${fontEnglish}', sans-serif !important;
    }

    /* Dynamic Brand Gold Overrides */
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

    /* Selection Color */
    ::selection {
      background-color: ${primary} !important;
      color: #000000 !important;
    }
  `;

  console.log("[Theme Engine] Applied Storefront Theme successfully:", {
    primary,
    secondary,
    accent,
    background,
    fontArabic,
    fontEnglish,
    radius: radiusPx,
  });
}

/**
 * Fetches and applies theme from backend
 */
export async function loadAndApplyStoreTheme(apiBase = ""): Promise<StoreThemeSettings> {
  try {
    const res = await fetch(`${apiBase}/api/theme`);
    if (!res.ok) {
      throw new Error(`HTTP_${res.status}`);
    }
    const data: StoreThemeSettings = await res.json();
    applyStoreTheme(data);
    return data;
  } catch (err) {
    console.warn("[Theme Engine] Failed to load remote theme, using defaults:", err);
    applyStoreTheme(DEFAULT_STORE_THEME);
    return DEFAULT_STORE_THEME;
  }
}
