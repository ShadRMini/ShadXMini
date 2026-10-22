import { get } from "./api";
import { getThemePreset, THEME_PRESETS, type ThemePreset } from "./theme-presets";

export { getThemePreset, THEME_PRESETS, type ThemePreset };

// ========== Semantic Vars Helpers (Task #91 C11a) ==========

function hexToRgb(hex: string): { r: number; g: number; b: number } | null {
  try {
    const cleaned = hex.replace('#', '').trim();
    if (cleaned.length !== 6 && cleaned.length !== 3) return null;
    const full = cleaned.length === 3
      ? cleaned.split('').map(c => c + c).join('')
      : cleaned;
    return {
      r: parseInt(full.substring(0, 2), 16),
      g: parseInt(full.substring(2, 4), 16),
      b: parseInt(full.substring(4, 6), 16),
    };
  } catch {
    return null;
  }
}

function getContrastTextColor(bgColor: string): string {
  // Handle rgba/rgb
  if (bgColor.startsWith('rgb')) {
    const match = bgColor.match(/\d+/g);
    if (match && match.length >= 3) {
      const [r, g, b] = match.slice(0, 3).map(Number);
      const lum = (0.2126 * r + 0.7152 * g + 0.0722 * b) / 255;
      return lum > 0.4 ? '#000000' : '#FFFFFF';
    }
  }
  
  const rgb = hexToRgb(bgColor);
  if (!rgb) return '#FFFFFF';
  
  // Relative luminance
  const toLinear = (c: number) => {
    const s = c / 255;
    return s <= 0.03928 ? s / 12.92 : Math.pow(s, 2.2);
  };
  const L = 0.2126 * toLinear(rgb.r) + 0.7152 * toLinear(rgb.g) + 0.0722 * toLinear(rgb.b);
  
  return L > 0.4 ? '#000000' : '#FFFFFF';
}

export interface AdminThemeSettings {
  theme_primary: string;
  theme_secondary: string;
  theme_accent: string;
  theme_background: string;
  theme_card: string;
  theme_text_primary: string;
  theme_text_secondary: string;
  theme_text_muted: string;
  theme_border: string;
  theme_input_bg: string;
  theme_header_gradient_start: string;
  theme_header_gradient_end: string;
  theme_bottom_nav: string;
  theme_bottom_nav_active: string;
  theme_sidebar_bg: string;
  theme_font_arabic: string;
  theme_font_english: string;
  theme_font_size: string;
  theme_heading_size: string;
  theme_border_radius: string;
  theme_shadow: string;
  theme_padding: string;
  theme_default_mode: string;
  theme_mode?: string;
  theme_active_preset?: string;
  theme_logo_url: string;
  theme_logo_size: string;
  theme_logo_text_color: string;
  [key: string]: any;
}

export const DEFAULT_ADMIN_THEME: AdminThemeSettings = {
  theme_primary: "#C8A45C",
  theme_secondary: "#B8954A",
  theme_accent: "#FDE68A",
  theme_background: "#1A1A1A",
  theme_card: "#2D2D2D",
  theme_text_primary: "#FFFFFF",
  theme_text_secondary: "#E5E7EB",
  theme_text_muted: "#9CA3AF",
  theme_border: "rgba(200, 164, 92, 0.25)",
  theme_input_bg: "#3D3D3D",
  theme_header_gradient_start: "#1A1A1A",
  theme_header_gradient_end: "#2D2D2D",
  theme_bottom_nav: "#1A1A1A",
  theme_bottom_nav_active: "#C8A45C",
  theme_sidebar_bg: "#1A1A1A",
  theme_font_arabic: "Cairo",
  theme_font_english: "Inter",
  theme_font_size: "14",
  theme_heading_size: "20",
  theme_border_radius: "16",
  theme_shadow: "medium",
  theme_padding: "24",
  theme_default_mode: "dark",
  theme_mode: "dark",
  theme_active_preset: "gold",
  theme_logo_url: "",
  theme_logo_size: "80px",
  theme_logo_text_color: "#C8A45C",
  success: "#10B981",
  warning: "#F59E0B",
  error: "#EF4444",
  info: "#3B82F6",
  binance: "#F0B90B",
  shamcash: "#00875A",
  syriatel: "#E31837",
  mtn: "#FFCC00",
  usdt: "#14B8A6",
  tierPro: "#9CA3AF",
  tierSilver: "#C0C0C0",
  tierDiamond: "#60A5FA",
  tierVip: "#A855F7",
};

let cachedAdminThemeSettings: AdminThemeSettings = { ...DEFAULT_ADMIN_THEME };

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

/**
 * Helper to convert shadow style name to CSS box-shadow
 */
function getShadowCss(level: string, primaryColor: string, isLight = false): string {
  const shadowColor = isLight
    ? "color-mix(in srgb, var(--theme-text-primary, #000) 12%, transparent)"
    : "color-mix(in srgb, var(--theme-background, #000) 60%, transparent)";

  switch (level) {
    case "none":
      return "none";
    case "soft":
      return `0 1px 2px ${shadowColor}`;
    case "medium":
      return `0 4px 12px ${shadowColor}`;
    case "large":
    case "deep":
    case "heavy":
      return `0 8px 24px ${shadowColor}`;
    case "glow":
      return `0 0 24px color-mix(in srgb, ${primaryColor} 30%, transparent)`;
    default:
      return `0 4px 12px ${shadowColor}`;
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

function getHexRgbString(hexStr: string): string {
  let c = (hexStr || "#C8A45C").replace(/^#/, "").trim();
  if (c.length === 3) {
    c = c
      .split("")
      .map((x) => x + x)
      .join("");
  }
  if (c.length !== 6) return "200, 164, 92";
  const num = parseInt(c, 16);
  if (isNaN(num)) return "200, 164, 92";
  return `${(num >> 16) & 255}, ${(num >> 8) & 255}, ${num & 255}`;
}

/**
 * Gets the current active mode (dark or light), prioritizing explicit theme mode or user preference
 */
export function getAdminThemeMode(themeOverride?: Partial<AdminThemeSettings> | null): "dark" | "light" {
  const explicitMode =
    themeOverride?.theme_mode ||
    themeOverride?.mode ||
    themeOverride?.theme_default_mode ||
    themeOverride?.defaultMode;

  if (explicitMode === "light" || explicitMode === "dark") {
    return explicitMode;
  }
  if (explicitMode === "auto") {
    return typeof window !== "undefined" && window.matchMedia("(prefers-color-scheme: dark)").matches
      ? "dark"
      : "light";
  }

  try {
    const saved =
      localStorage.getItem("admin-theme-preference") ||
      localStorage.getItem("theme-preference") ||
      localStorage.getItem("theme_mode");
    if (saved === "light" || saved === "dark") {
      return saved;
    }
    if (saved === "auto") {
      return window.matchMedia("(prefers-color-scheme: dark)").matches ? "dark" : "light";
    }
  } catch {
    // Ignore storage restrictions
  }

  const defaultMode =
    cachedAdminThemeSettings?.theme_mode ||
    cachedAdminThemeSettings?.mode ||
    cachedAdminThemeSettings?.theme_default_mode ||
    cachedAdminThemeSettings?.defaultMode ||
    "dark";

  if (defaultMode === "auto") {
    return typeof window !== "undefined" && window.matchMedia("(prefers-color-scheme: dark)").matches
      ? "dark"
      : "light";
  }
  return defaultMode === "light" ? "light" : "dark";
}

/**
 * Sets the active theme mode preference in Admin
 */
export function setAdminThemeMode(mode: "dark" | "light" | "auto") {
  try {
    localStorage.setItem("admin-theme-preference", mode);
    localStorage.setItem("theme-preference", mode);
    localStorage.setItem("theme_mode", mode);
  } catch {
    // Ignore storage restrictions
  }
  cachedAdminThemeSettings = {
    ...cachedAdminThemeSettings,
    theme_mode: mode,
    theme_default_mode: mode,
  };
  applyAdminTheme(cachedAdminThemeSettings);
  window.dispatchEvent(new CustomEvent("xpay_theme_mode_changed", { detail: { mode } }));
  window.dispatchEvent(new CustomEvent("xpay_theme_change", { detail: { mode } }));
}

/**
 * Toggles between dark and light mode in Admin
 */
export function toggleAdminThemeMode(): "dark" | "light" {
  const current = getAdminThemeMode();
  const next = current === "dark" ? "light" : "dark";
  setAdminThemeMode(next);
  return next;
}

/**
 * Applies dynamic CSS variables and style overrides to the Admin Panel
 * Supports all 27 theme variables, Presets, and Dark/Light/Auto mode.
 */
export function applyAdminTheme(theme?: Partial<AdminThemeSettings> | null | undefined) {
  if (theme) {
    cachedAdminThemeSettings = { ...cachedAdminThemeSettings, ...theme };
  }
  const currentTheme = cachedAdminThemeSettings;

  const currentMode = getAdminThemeMode(theme);
  const isLight = currentMode === "light";

  const root = document.documentElement;
  root.classList.remove("light", "dark", "admin-dark");
  root.classList.add(isLight ? "light" : "dark");
  if (!isLight) {
    root.classList.add("admin-dark");
  }
  root.setAttribute("data-theme", isLight ? "light" : "dark");

  // Resolve Active Preset & Mode Palettes
  const activePresetId = String(
    currentTheme.theme_active_preset || currentTheme.activePreset || currentTheme.preset || "gold"
  ).trim();
  const activePresetObj = getThemePreset(activePresetId);
  const presetLight = currentTheme.light || activePresetObj.light;
  const presetDark = currentTheme.dark || activePresetObj.dark;
  const activePalette = isLight ? presetLight : presetDark;

  const primary = String(
    currentTheme.theme_primary || currentTheme.primary || activePalette.primary || DEFAULT_ADMIN_THEME.theme_primary
  ).trim();
  const secondary = String(
    currentTheme.theme_secondary || currentTheme.secondary || activePalette.secondary || DEFAULT_ADMIN_THEME.theme_secondary
  ).trim();
  const accent = String(
    currentTheme.theme_accent || currentTheme.accent || activePalette.accent || DEFAULT_ADMIN_THEME.theme_accent
  ).trim();

  // Custom dark/light palette resolution
  const customDarkBg = String(currentTheme.theme_background || currentTheme.theme_bg || currentTheme.background || "").trim();
  const customCardBg = String(currentTheme.theme_card || currentTheme.card || "").trim();
  const customTextPrimary = String(currentTheme.theme_text_primary || currentTheme.textPrimary || "").trim();
  const customTextSecondary = String(currentTheme.theme_text_secondary || currentTheme.textSecondary || "").trim();
  const customTextMuted = String(currentTheme.theme_text_muted || currentTheme.textMuted || "").trim();
  const customBorder = String(currentTheme.theme_border || currentTheme.border || "").trim();
  const customInputBg = String(currentTheme.theme_input_bg || currentTheme.inputBg || "").trim();

  const customLightBg = String(currentTheme.light_background || currentTheme.lightBg || "").trim();
  const customLightCard = String(currentTheme.light_card || currentTheme.lightCard || "").trim();
  const customLightText = String(currentTheme.light_text_primary || currentTheme.lightTextPrimary || "").trim();
  const customLightTextSecondary = String(currentTheme.light_text_secondary || currentTheme.lightTextSecondary || "").trim();
  const customLightTextMuted = String(currentTheme.light_text_muted || currentTheme.lightTextMuted || "").trim();
  const customLightBorder = String(currentTheme.light_border || currentTheme.lightBorder || "").trim();
  const customLightInputBg = String(currentTheme.light_input_bg || currentTheme.lightInputBg || "").trim();

  // Distinct Light vs Dark mode palettes derived dynamically from activePreset
  const bgPrimary = isLight
    ? (customLightBg || presetLight.background)
    : (customDarkBg || presetDark.background);

  const bgSecondary = isLight ? (presetLight.card || "#FFFFFF") : "#242424";

  const bgCard = isLight
    ? (customLightCard || presetLight.card)
    : (customCardBg || presetDark.card);

  const bgInput = isLight
    ? (customLightInputBg || presetLight.inputBg)
    : (customInputBg || presetDark.inputBg);

  const textPrimary = isLight
    ? (customLightText || presetLight.textPrimary)
    : (customTextPrimary || presetDark.textPrimary);

  const textSecondary = isLight
    ? (customLightTextSecondary || presetLight.textSecondary)
    : (customTextSecondary || presetDark.textSecondary);

  const textMuted = isLight
    ? (customLightTextMuted || presetLight.textMuted)
    : (customTextMuted || presetDark.textMuted);

  const borderColor = isLight
    ? (customLightBorder || presetLight.border)
    : (customBorder || presetDark.border);

  const shadowColor = isLight
    ? "color-mix(in srgb, var(--theme-text-primary, #000) 12%, transparent)"
    : "color-mix(in srgb, var(--theme-background, #000) 60%, transparent)";

  // Fonts & Typography
  const fontArabic = String(
    currentTheme.theme_font_arabic || currentTheme.fontArabic || currentTheme.theme_font || currentTheme.font || DEFAULT_ADMIN_THEME.theme_font_arabic
  ).trim();
  const fontEnglish = String(
    currentTheme.theme_font_english || currentTheme.fontEnglish || DEFAULT_ADMIN_THEME.theme_font_english
  ).trim();
  const rawFontSize = String(currentTheme.theme_font_size || currentTheme.fontSize || DEFAULT_ADMIN_THEME.theme_font_size).trim();
  const fontSizePx = rawFontSize.includes("px") || rawFontSize.includes("rem") ? rawFontSize : `${rawFontSize}px`;
  const rawHeadingSize = String(currentTheme.theme_heading_size || currentTheme.headingSize || DEFAULT_ADMIN_THEME.theme_heading_size).trim();
  const headingSizePx = rawHeadingSize.includes("px") || rawHeadingSize.includes("rem") ? rawHeadingSize : `${rawHeadingSize}px`;

  // Shape, Spacing & Shadow
  const rawRadius = currentTheme.theme_border_radius ?? currentTheme.theme_radius ?? currentTheme.radius ?? currentTheme.borderRadius ?? DEFAULT_ADMIN_THEME.theme_border_radius;
  const radiusNum = Number(String(rawRadius).replace(/px$/i, ""));
  const radiusPx = Number.isFinite(radiusNum) && radiusNum >= 0 ? `${radiusNum}px` : "16px";
  const rawShadow = String(currentTheme.theme_shadow || currentTheme.shadow || DEFAULT_ADMIN_THEME.theme_shadow).trim();
  const shadowCss = getShadowCss(rawShadow, primary, isLight);
  const rawPadding = String(currentTheme.theme_padding || currentTheme.padding || DEFAULT_ADMIN_THEME.theme_padding).trim();
  const paddingPx = rawPadding.includes("px") || rawPadding.includes("rem") ? rawPadding : `${rawPadding}px`;

  // Header, Bottom Nav, Sidebar
  const headerGradStart = String(
    isLight
      ? (currentTheme.light_header_gradient_start || currentTheme.lightHeaderGradientStart || presetLight.headerGradientStart || bgPrimary)
      : (currentTheme.theme_header_gradient_start || currentTheme.headerGradientStart || presetDark.headerGradientStart || bgPrimary)
  ).trim();
  const headerGradEnd = String(
    isLight
      ? (currentTheme.light_header_gradient_end || currentTheme.lightHeaderGradientEnd || presetLight.headerGradientEnd || bgPrimary)
      : (currentTheme.theme_header_gradient_end || currentTheme.headerGradientEnd || presetDark.headerGradientEnd || bgPrimary)
  ).trim();
  const headerGradient = `linear-gradient(90deg, ${headerGradStart} 0%, ${headerGradEnd} 100%)`;
  const bottomNavBg = String(
    isLight
      ? (currentTheme.light_bottom_nav || currentTheme.lightBottomNav || presetLight.bottomNav || bgPrimary)
      : (currentTheme.theme_bottom_nav || currentTheme.bottomNav || presetDark.bottomNav || bgPrimary)
  ).trim();
  const bottomNavActive = String(
    isLight
      ? (currentTheme.light_bottom_nav_active || currentTheme.lightBottomNavActive || presetLight.bottomNavActive || primary)
      : (currentTheme.theme_bottom_nav_active || currentTheme.bottomNavActive || presetDark.bottomNavActive || primary)
  ).trim();
  const bottomNavActiveBg = `rgba(${getHexRgbString(bottomNavActive)}, 0.2)`;
  const sidebarBg = String(
    isLight
      ? (currentTheme.light_sidebar_bg || currentTheme.lightSidebar || presetLight.sidebar || bgPrimary)
      : (currentTheme.theme_sidebar_bg || currentTheme.sidebar || presetDark.sidebar || bgPrimary)
  ).trim();

  // Logo variables
  const logoUrl = String(currentTheme.theme_logo_url || currentTheme.logoUrl || "").trim();
  const rawLogoSize = String(
    currentTheme.theme_logo_size || currentTheme.logoSize || currentTheme.logo_size || DEFAULT_ADMIN_THEME.theme_logo_size
  ).trim();
  const logoSizePx =
    rawLogoSize.includes("px") || rawLogoSize.includes("%") || rawLogoSize.includes("rem")
      ? rawLogoSize
      : `${rawLogoSize}px`;
  const logoTextColor = String(
    currentTheme.theme_logo_text_color || currentTheme.logoTextColor || accent
  ).trim();

  // 1. Ensure Fonts
  ensureGoogleFontsLoaded(fontArabic, fontEnglish);

  // 2. Set all 27+ root CSS variables
  root.style.setProperty("--theme-mode", currentMode);
  root.style.setProperty("--theme-active-preset", activePresetId);
  root.style.setProperty("--theme-primary", primary);

  // ========== Semantic Vars (Task #91 C11a) ==========
  const textOnPrimary = getContrastTextColor(primary);

  // Semantic status colors (ثابتة - لا تتغير مع الثيم)
  root.style.setProperty("--theme-success", "#10B981");
  root.style.setProperty("--theme-warning", "#F59E0B");
  root.style.setProperty("--theme-error", "#EF4444");
  root.style.setProperty("--theme-info", "#3B82F6");

  // Text color on primary buttons (محسوب ديناميكياً)
  root.style.setProperty("--theme-text-on-primary", textOnPrimary);

  // Card hover (يُحسب من card + text-primary)
  root.style.setProperty(
    "--theme-card-hover",
    `color-mix(in srgb, ${bgCard} 88%, ${textPrimary} 12%)`
  );

  // Brand colors (ثابتة - هوية مزودين)
  root.style.setProperty("--theme-binance", "#F0B90B");
  root.style.setProperty("--theme-shamcash", "#00875A");
  root.style.setProperty("--theme-syriatel", "#E31837");
  root.style.setProperty("--theme-mtn", "#FFCC00");
  root.style.setProperty("--theme-usdt", "#14B8A6");

  // VIP Tier colors (ثابتة - دلالية)
  root.style.setProperty("--theme-tier-pro", "#9CA3AF");
  root.style.setProperty("--theme-tier-silver", "#C0C0C0");
  root.style.setProperty("--theme-tier-diamond", "#60A5FA");
  root.style.setProperty("--theme-tier-vip", "#A855F7");

  root.style.setProperty("--theme-secondary", secondary);
  root.style.setProperty("--theme-accent", accent);
  root.style.setProperty("--theme-background", bgPrimary);
  root.style.setProperty("--theme-bg", bgPrimary);
  root.style.setProperty("--theme-bg-secondary", bgSecondary);
  root.style.setProperty("--theme-card", bgCard);
  root.style.setProperty("--theme-text-primary", textPrimary);
  root.style.setProperty("--theme-text-secondary", textSecondary);
  root.style.setProperty("--theme-text-muted", textMuted);
  root.style.setProperty("--theme-border", borderColor);
  root.style.setProperty("--theme-input", bgInput);
  root.style.setProperty("--theme-input-bg", bgInput);
  root.style.setProperty("--theme-input-border", borderColor);
  root.style.setProperty("--theme-header-bg", bgPrimary);
  root.style.setProperty("--theme-header-gradient-start", headerGradStart);
  root.style.setProperty("--theme-header-gradient-end", headerGradEnd);
  root.style.setProperty("--theme-header-gradient", headerGradient);
  root.style.setProperty("--theme-bottom-nav", bottomNavBg);
  root.style.setProperty("--theme-bottom-nav-active", bottomNavActive);
  root.style.setProperty("--theme-bottom-nav-active-bg", bottomNavActiveBg);
  root.style.setProperty("--theme-sidebar-bg", sidebarBg);
  root.style.setProperty("--theme-footer-bg", bgPrimary);
  root.style.setProperty("--theme-font-arabic", fontArabic);
  root.style.setProperty("--theme-font-english", fontEnglish);
  root.style.setProperty("--theme-font-size", fontSizePx);
  root.style.setProperty("--theme-heading-size", headingSizePx);
  root.style.setProperty("--theme-border-radius", radiusPx);
  root.style.setProperty("--theme-shadow", shadowCss);
  root.style.setProperty("--theme-shadow-color", shadowColor);
  root.style.setProperty("--theme-padding", paddingPx);
  root.style.setProperty("--theme-logo-size", logoSizePx);
  root.style.setProperty("--logo-size", logoSizePx);
  root.style.setProperty("--theme-logo-url", logoUrl);
  root.style.setProperty("--theme-logo-text-color", logoTextColor);

  // Shorthand & legacy CSS variables used across admin & store
  root.style.setProperty("--primary", primary);
  root.style.setProperty("--primary-dark", secondary);
  root.style.setProperty("--accent", accent);
  root.style.setProperty("--background", bgPrimary);
  root.style.setProperty("--card", bgCard);
  root.style.setProperty("--border", borderColor);
  root.style.setProperty("--text-dark", textPrimary);
  root.style.setProperty("--text-light", textSecondary);
  root.style.setProperty("--color-gold", primary);
  root.style.setProperty("--color-gold-dark", secondary);
  root.style.setProperty("--color-gold-light", accent);
  root.style.setProperty("--color-deep-dark", bgPrimary);
  root.style.setProperty("--color-card-dark", bgCard);
  root.style.setProperty("--font-arabic", `'${fontArabic}', sans-serif`);
  root.style.setProperty("--font-english", `'${fontEnglish}', sans-serif`);
  root.style.setProperty("--font-family-arabic", `'${fontArabic}', sans-serif`);
  root.style.setProperty("--font-family-english", `'${fontEnglish}', sans-serif`);
  root.style.setProperty("--font-family-sans", `'${fontArabic}', '${fontEnglish}', system-ui, sans-serif`);
  root.style.setProperty("--app-font-sans", `'${fontArabic}', '${fontEnglish}', system-ui, sans-serif`);
  root.style.setProperty("--radius", radiusPx);

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
      --theme-mode: ${currentMode} !important;
      --theme-active-preset: ${activePresetId} !important;
      --theme-primary: ${primary} !important;
      --theme-success: #10B981 !important;
      --theme-warning: #F59E0B !important;
      --theme-error: #EF4444 !important;
      --theme-info: #3B82F6 !important;
      --theme-text-on-primary: ${textOnPrimary} !important;
      --theme-card-hover: color-mix(in srgb, ${bgCard} 88%, ${textPrimary} 12%) !important;
      --theme-binance: #F0B90B !important;
      --theme-shamcash: #00875A !important;
      --theme-syriatel: #E31837 !important;
      --theme-mtn: #FFCC00 !important;
      --theme-usdt: #14B8A6 !important;
      --theme-tier-pro: #9CA3AF !important;
      --theme-tier-silver: #C0C0C0 !important;
      --theme-tier-diamond: #60A5FA !important;
      --theme-tier-vip: #A855F7 !important;
      --theme-secondary: ${secondary} !important;
      --theme-accent: ${accent} !important;
      --theme-background: ${bgPrimary} !important;
      --theme-bg: ${bgPrimary} !important;
      --theme-bg-secondary: ${bgSecondary} !important;
      --theme-card: ${bgCard} !important;
      --theme-sidebar-bg: ${sidebarBg} !important;
      --theme-header-bg: ${bgPrimary} !important;
      --theme-header-gradient-start: ${headerGradStart} !important;
      --theme-header-gradient-end: ${headerGradEnd} !important;
      --theme-header-gradient: ${headerGradient} !important;
      --theme-bottom-nav: ${bottomNavBg} !important;
      --theme-bottom-nav-active: ${bottomNavActive} !important;
      --theme-bottom-nav-active-bg: ${bottomNavActiveBg} !important;
      --theme-footer-bg: ${bgPrimary} !important;
      --theme-border: ${borderColor} !important;
      --theme-input: ${bgInput} !important;
      --theme-input-bg: ${bgInput} !important;
      --theme-input-border: ${borderColor} !important;
      --theme-text-primary: ${textPrimary} !important;
      --theme-text-secondary: ${textSecondary} !important;
      --theme-text-muted: ${textMuted} !important;
      --theme-font-arabic: '${fontArabic}', sans-serif !important;
      --theme-font-english: '${fontEnglish}', sans-serif !important;
      --theme-font-size: ${fontSizePx} !important;
      --theme-heading-size: ${headingSizePx} !important;
      --theme-border-radius: ${radiusPx} !important;
      --theme-shadow: ${shadowCss} !important;
      --theme-padding: ${paddingPx} !important;
      --theme-logo-size: ${logoSizePx} !important;
      --logo-size: ${logoSizePx} !important;
      --theme-logo-url: ${logoUrl} !important;
      --theme-logo-text-color: ${logoTextColor} !important;

      --primary: ${primary} !important;
      --primary-dark: ${secondary} !important;
      --accent: ${accent} !important;
      --background: ${bgPrimary} !important;
      --card: ${bgCard} !important;
      --border: ${borderColor} !important;
      --color-gold: ${primary} !important;
      --color-gold-dark: ${secondary} !important;
      --color-gold-light: ${accent} !important;
      --radius: ${radiusPx} !important;
      --font-family-arabic: '${fontArabic}', sans-serif !important;
      --font-family-english: '${fontEnglish}', sans-serif !important;
      --font-family-sans: '${fontArabic}', '${fontEnglish}', system-ui, sans-serif !important;
    }

    body {
      background-color: ${bgPrimary} !important;
      color: ${textPrimary} !important;
      font-family: '${fontArabic}', '${fontEnglish}', system-ui, sans-serif !important;
      font-size: ${fontSizePx};
    }

    *, input, select, textarea, button {
      font-family: '${fontArabic}', '${fontEnglish}', system-ui, sans-serif !important;
    }

    /* Helper theme classes */
    .bg-theme-primary { background-color: ${primary} !important; }
    .bg-theme-secondary { background-color: ${secondary} !important; }
    .bg-theme-accent { background-color: ${accent} !important; }
    .bg-theme-background { background-color: ${bgPrimary} !important; }
    .bg-theme-card { background-color: ${bgCard} !important; }
    .bg-theme-sidebar { background-color: ${sidebarBg} !important; }
    .bg-theme-input { background-color: ${bgInput} !important; }
    .text-theme-primary { color: ${primary} !important; }
    .text-theme-text { color: ${textPrimary} !important; }
    .text-theme-secondary { color: ${textSecondary} !important; }
    .text-theme-muted { color: ${textMuted} !important; }
    .text-theme-heading { font-size: ${headingSizePx}; }
    .border-theme { border-color: ${borderColor} !important; }
    .shadow-theme { box-shadow: ${shadowCss} !important; }
    .rounded-theme { border-radius: ${radiusPx} !important; }
    .p-theme { padding: ${paddingPx}; }
    .px-theme { padding-left: ${paddingPx}; padding-right: ${paddingPx}; }
    .py-theme { padding-top: ${paddingPx}; padding-bottom: ${paddingPx}; }
    .font-theme-arabic { font-family: '${fontArabic}', sans-serif !important; }
    .font-theme-english { font-family: '${fontEnglish}', sans-serif !important; }

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

    ${[5, 10, 12, 15, 20, 25, 30, 35, 40, 50, 60, 70, 75, 80, 85, 90, 95]
      .map((op) => {
        const alpha = (op / 100).toFixed(2);
        const pRgb = getHexRgbString(primary);
        const aRgb = getHexRgbString(accent);
        const bgRgb = getHexRgbString(bgPrimary);
        const cardRgb = getHexRgbString(bgCard);
        return `
          .bg-\\[\\#C8A45C\\]\\/${op}, .bg-\\[\\#c8a45c\\]\\/${op} { background-color: rgba(${pRgb}, ${alpha}) !important; }
          .text-\\[\\#C8A45C\\]\\/${op}, .text-\\[\\#c8a45c\\]\\/${op} { color: rgba(${pRgb}, ${alpha}) !important; }
          .border-\\[\\#C8A45C\\]\\/${op}, .border-\\[\\#c8a45c\\]\\/${op} { border-color: rgba(${pRgb}, ${alpha}) !important; }
          .bg-\\[\\#FDE68A\\]\\/${op}, .bg-\\[\\#fde68a\\]\\/${op} { background-color: rgba(${aRgb}, ${alpha}) !important; }
          .text-\\[\\#FDE68A\\]\\/${op}, .text-\\[\\#fde68a\\]\\/${op} { color: rgba(${aRgb}, ${alpha}) !important; }
          .border-\\[\\#FDE68A\\]\\/${op}, .border-\\[\\#fde68a\\]\\/${op} { border-color: rgba(${aRgb}, ${alpha}) !important; }
          .bg-\\[\\#1A1A1A\\]\\/${op}, .bg-\\[\\#1a1a1a\\]\\/${op} { background-color: rgba(${bgRgb}, ${alpha}) !important; }
          .bg-\\[\\#2D2D2D\\]\\/${op}, .bg-\\[\\#2d2d2d\\]\\/${op} { background-color: rgba(${cardRgb}, ${alpha}) !important; }
        `;
      })
      .join("\n")}

    input:focus, select:focus, textarea:focus {
      border-color: ${primary} !important;
    }

    ::-webkit-scrollbar-thumb:hover {
      background: ${primary} !important;
    }
  `;

  console.log("[Admin Theme] Applied Admin Theme successfully:", {
    mode: currentMode,
    preset: activePresetId,
    primary,
    secondary,
    accent,
    background: bgPrimary,
    card: bgCard,
    sidebar: sidebarBg,
    fontArabic,
    fontEnglish,
  });
}

const ADMIN_THEME_CACHE_KEY = "xpay_admin_theme_cache_v2";
const ADMIN_CACHE_VERSION_KEY = "xpay_theme_cache_version";
const CURRENT_ADMIN_CACHE_VERSION = "v2";

function ensureFreshAdminThemeCacheVersion() {
  try {
    if (localStorage.getItem(ADMIN_CACHE_VERSION_KEY) !== CURRENT_ADMIN_CACHE_VERSION) {
      localStorage.removeItem("xpay_admin_theme_cache");
      localStorage.removeItem("xpay_theme_cache");
      localStorage.removeItem("xpay_shamcash_cache");
      localStorage.setItem(ADMIN_CACHE_VERSION_KEY, CURRENT_ADMIN_CACHE_VERSION);
    }
  } catch {}
}

export function getCachedAdminThemeSettings(): AdminThemeSettings | null {
  try {
    ensureFreshAdminThemeCacheVersion();
    const raw = localStorage.getItem(ADMIN_THEME_CACHE_KEY) || localStorage.getItem("xpay_theme_cache_v2");
    if (!raw) return null;
    return JSON.parse(raw);
  } catch {
    return null;
  }
}

export function setCachedAdminThemeSettings(theme: Partial<AdminThemeSettings>) {
  try {
    ensureFreshAdminThemeCacheVersion();
    const serialized = JSON.stringify(theme);
    localStorage.setItem(ADMIN_THEME_CACHE_KEY, serialized);
    localStorage.setItem("xpay_theme_cache_v2", serialized);
  } catch {}
}

/**
 * Broadcasts theme change across active tabs and windows
 */
export function broadcastThemeChange(theme: Partial<AdminThemeSettings>) {
  try {
    if (theme.theme_mode) {
      localStorage.setItem("admin-theme-preference", theme.theme_mode);
      localStorage.setItem("theme-preference", theme.theme_mode);
      localStorage.setItem("theme_mode", theme.theme_mode);
    }
    setCachedAdminThemeSettings(theme);
    localStorage.setItem("xpay_theme_updated", Date.now().toString());
    localStorage.setItem("theme_settings", JSON.stringify(theme));
    window.dispatchEvent(new CustomEvent("xpay_theme_change", { detail: theme }));
  } catch (e) {
    console.warn("[Admin Theme] Could not broadcast theme change:", e);
  }
}

/**
 * Fetches and applies theme from admin API (with public fallback and cache)
 */
export async function loadAndApplyAdminTheme(): Promise<AdminThemeSettings> {
  const cached = getCachedAdminThemeSettings();
  if (cached) {
    applyAdminTheme(cached);
  }

  const endpoints = ["/admin/theme-settings", "/public/theme-settings", "/theme-settings"];
  for (const endpoint of endpoints) {
    try {
      const data = await get<AdminThemeSettings>(endpoint);
      if (data && typeof data === "object") {
        cachedAdminThemeSettings = { ...DEFAULT_ADMIN_THEME, ...data };
        setCachedAdminThemeSettings(data);
        applyAdminTheme(data);
        return data;
      }
    } catch {
      // try next fallback
    }
  }

  if (!cached) {
    applyAdminTheme(DEFAULT_ADMIN_THEME);
  }
  return cached || DEFAULT_ADMIN_THEME;
}
