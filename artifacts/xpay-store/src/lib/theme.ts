import { getThemePreset, THEME_PRESETS, ThemePreset } from "./theme-presets";

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
  auth_bg_color?: string;
  auth_card_color?: string;
  auth_text_color?: string;
  auth_button_color?: string;
  product_bg_color?: string;
  product_card_color?: string;
  product_text_color?: string;
  product_price_color?: string;
  about_bg_color?: string;
  about_card_color?: string;
  about_text_color?: string;
  contact_bg_color?: string;
  contact_card_color?: string;
  contact_text_color?: string;
  [key: string]: any;
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
    if (saved === "auto") {
      return window.matchMedia("(prefers-color-scheme: dark)").matches ? "dark" : "light";
    }
  } catch {
    // Ignore storage restrictions
  }
  const defaultMode = cachedThemeSettings?.theme_mode || cachedThemeSettings?.theme_default_mode || cachedThemeSettings?.defaultMode || "dark";
  if (defaultMode === "auto") {
    return window.matchMedia("(prefers-color-scheme: dark)").matches ? "dark" : "light";
  }
  return defaultMode === "light" ? "light" : "dark";
}

/**
 * Sets the active theme mode preference
 */
export function setStoreThemeMode(mode: "dark" | "light" | "auto") {
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

function getHexRgbString(hexStr: string): string {
  let c = (hexStr || "#C8A45C").replace(/^#/, "").trim();
  if (c.length === 3) {
    c = c.split("").map((x) => x + x).join("");
  }
  if (c.length !== 6) return "200, 164, 92";
  const num = parseInt(c, 16);
  if (isNaN(num)) return "200, 164, 92";
  return `${(num >> 16) & 255}, ${(num >> 8) & 255}, ${num & 255}`;
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

  const root = document.documentElement;
  root.classList.remove("light", "dark");
  root.classList.add(isLight ? "light" : "dark");
  root.setAttribute("data-theme", isLight ? "light" : "dark");

  const activePresetId = String(currentTheme.theme_active_preset || currentTheme.activePreset || currentTheme.preset || "gold").trim();
  const activePresetObj = getThemePreset(activePresetId);
  const presetLight = currentTheme.light || activePresetObj.light;
  const presetDark = currentTheme.dark || activePresetObj.dark;
  const activePalette = isLight ? presetLight : presetDark;

  const primary = String(currentTheme.primary || currentTheme.theme_primary || activePalette.primary).trim();
  const secondary = String(currentTheme.secondary || currentTheme.theme_secondary || activePalette.secondary).trim();
  const accent = String(currentTheme.accent || currentTheme.theme_accent || activePalette.accent).trim();

  // Custom dark/light palette resolution
  const customDarkBg = String(currentTheme.theme_background || currentTheme.background || "").trim();
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

  const shadowColor = isLight ? "rgba(0, 0, 0, 0.08)" : "rgba(0, 0, 0, 0.35)";

  const fontArabic = String(currentTheme.fontArabic || currentTheme.theme_font_arabic || currentTheme.font || DEFAULT_STORE_THEME.fontArabic).trim();
  const fontEnglish = String(currentTheme.fontEnglish || currentTheme.theme_font_english || DEFAULT_STORE_THEME.fontEnglish).trim();
  const rawRadius = currentTheme.radius ?? currentTheme.theme_border_radius ?? currentTheme.borderRadius ?? DEFAULT_STORE_THEME.radius;
  const radiusNum = Number(rawRadius);
  const radiusPx = Number.isFinite(radiusNum) && radiusNum >= 0 ? `${radiusNum}px` : "16px";
  const rawShadow = String(currentTheme.shadow || currentTheme.theme_shadow || "medium").trim();
  const shadowCss = getShadowCss(rawShadow, primary, isLight);

  const headerGradStart = currentTheme.theme_header_gradient_start || currentTheme.headerGradientStart || activePalette.headerGradientStart;
  const headerGradEnd = currentTheme.theme_header_gradient_end || currentTheme.headerGradientEnd || activePalette.headerGradientEnd;
  const bottomNavBg = currentTheme.theme_bottom_nav || currentTheme.bottomNav || activePalette.bottomNav;
  const bottomNavActive = currentTheme.theme_bottom_nav_active || currentTheme.bottomNavActive || activePalette.bottomNavActive;
  const sidebarBg = currentTheme.theme_sidebar_bg || currentTheme.sidebar || activePalette.sidebar;
  const paddingPx = `${currentTheme.theme_padding || currentTheme.padding || 24}px`;
  const headingSizePx = `${currentTheme.theme_heading_size || currentTheme.headingSize || 20}px`;

  // Set Core CSS variables
  root.style.setProperty("--theme-mode", currentMode);
  root.style.setProperty("--theme-primary", primary);
  root.style.setProperty("--theme-secondary", secondary);
  root.style.setProperty("--theme-accent", accent);
  root.style.setProperty("--theme-background", bgPrimary);
  root.style.setProperty("--theme-bg", bgPrimary);
  root.style.setProperty("--theme-card", bgCard);
  root.style.setProperty("--theme-text-primary", textPrimary);
  root.style.setProperty("--theme-text-secondary", textSecondary);
  root.style.setProperty("--theme-text-muted", textMuted);
  root.style.setProperty("--theme-border", borderColor);
  root.style.setProperty("--theme-input-bg", bgInput);
  root.style.setProperty("--theme-header-gradient", `linear-gradient(90deg, ${headerGradStart} 0%, ${headerGradEnd} 100%)`);
  root.style.setProperty("--theme-bottom-nav", bottomNavBg);
  root.style.setProperty("--theme-bottom-nav-active", bottomNavActive);
  root.style.setProperty("--theme-sidebar-bg", sidebarBg);
  root.style.setProperty("--theme-font-arabic", fontArabic);
  root.style.setProperty("--theme-font-english", fontEnglish);
  root.style.setProperty("--theme-font-size", `${currentTheme.theme_font_size || currentTheme.fontSize || 14}px`);
  root.style.setProperty("--theme-heading-size", headingSizePx);
  root.style.setProperty("--theme-border-radius", radiusPx);
  root.style.setProperty("--theme-shadow", shadowCss);
  root.style.setProperty("--theme-padding", paddingPx);
  root.style.setProperty("--theme-logo-size", currentTheme.theme_logo_size || currentTheme.logoSize || "80px");

  // ShamCash CSS variables
  root.style.setProperty("--shamcash-page-bg", currentTheme.shamcash_page_bg || "var(--theme-background)");
  root.style.setProperty("--shamcash-card-bg", currentTheme.shamcash_card_bg || "var(--theme-card)");
  root.style.setProperty("--shamcash-text-color", currentTheme.shamcash_text_color || "var(--theme-text-primary)");
  root.style.setProperty("--shamcash-button-bg", currentTheme.shamcash_button_bg || "var(--theme-primary)");
  root.style.setProperty("--shamcash-border-color", currentTheme.shamcash_border_color || "var(--theme-border)");
  root.style.setProperty("--shamcash-input-bg", currentTheme.shamcash_input_bg || "var(--theme-input-bg)");

  const rawLogoSize = String(currentTheme.theme_logo_size || currentTheme.logoSize || DEFAULT_STORE_THEME.theme_logo_size).trim();
  const logoSizePx = rawLogoSize.includes("px") || rawLogoSize.includes("%") || rawLogoSize.includes("rem") ? rawLogoSize : `${rawLogoSize}px`;

  // 1. Ensure Fonts
  ensureGoogleFontsLoaded(fontArabic, fontEnglish);

  // 2. Set root CSS variables & class
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
  root.style.setProperty("--theme-card", bgCard);
  root.style.setProperty("--theme-sidebar-bg", bgPrimary);
  root.style.setProperty("--theme-input", bgInput);
  root.style.setProperty("--theme-text-primary", textPrimary);
  root.style.setProperty("--theme-text-muted", textMuted);
  root.style.setProperty("--theme-border", borderColor);
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

  // Helper to format font family
  const formatFont = (f?: string) => f ? `'${f}', sans-serif` : `'${fontArabic}', sans-serif`;

  // Helper to format shadow
  const formatShadow = (s?: string) => getShadowCss(s || "medium", primary, isLight);

  // Helper to set or remove custom section properties
  const setOrRemoveProp = (propNames: string[], val?: string) => {
    const cleanVal = String(val || "").trim();
    if (
      cleanVal &&
      cleanVal !== "" &&
      cleanVal !== "initial" &&
      cleanVal !== "none" &&
      !cleanVal.startsWith("var(") &&
      cleanVal.toLowerCase() !== "#1a1a1a" &&
      cleanVal.toLowerCase() !== "#2d2d2d"
    ) {
      propNames.forEach((p) => root.style.setProperty(p, cleanVal));
    } else {
      propNames.forEach((p) => root.style.removeProperty(p));
    }
  };

  // --- Auth Section Variables ---
  setOrRemoveProp(["--auth-bg-color", "--auth-bg"], currentTheme.auth_bg_color || currentTheme.authBgColor);
  setOrRemoveProp(["--auth-card-color", "--auth-card-bg"], currentTheme.auth_card_color || currentTheme.authCardColor);
  setOrRemoveProp(["--auth-text-color", "--auth-text"], currentTheme.auth_text_color || currentTheme.authTextColor);
  setOrRemoveProp(["--auth-title-color", "--auth-title"], currentTheme.auth_title_color || currentTheme.authTitleColor);
  setOrRemoveProp(["--auth-border-color", "--auth-border"], currentTheme.auth_border_color || currentTheme.authBorderColor);
  setOrRemoveProp(["--auth-button-color", "--auth-button-bg"], currentTheme.auth_button_color || currentTheme.authButtonColor);
  setOrRemoveProp(["--auth-button-text-color"], currentTheme.auth_button_text_color || currentTheme.authButtonTextColor);
  setOrRemoveProp(["--auth-button-hover-color"], currentTheme.auth_button_hover_color || currentTheme.authButtonHoverColor);

  if (currentTheme.auth_font_family || currentTheme.authFontFamily) {
    root.style.setProperty("--auth-font-family", formatFont(currentTheme.auth_font_family || currentTheme.authFontFamily));
  } else {
    root.style.removeProperty("--auth-font-family");
  }

  // --- Product Section Variables ---
  setOrRemoveProp(["--product-bg-color", "--product-bg"], currentTheme.product_bg_color || currentTheme.productBgColor);
  setOrRemoveProp(["--product-card-color", "--product-card-bg"], currentTheme.product_card_color || currentTheme.productCardColor);
  setOrRemoveProp(["--product-text-color", "--product-text"], currentTheme.product_text_color || currentTheme.productTextColor);
  setOrRemoveProp(["--product-title-color", "--product-title"], currentTheme.product_title_color || currentTheme.productTitleColor);
  setOrRemoveProp(["--product-price-color", "--product-price"], currentTheme.product_price_color || currentTheme.productPriceColor);
  setOrRemoveProp(["--product-border-color", "--product-border"], currentTheme.product_border_color || currentTheme.productBorderColor);
  setOrRemoveProp(["--product-button-color", "--product-button-bg"], currentTheme.product_button_color || currentTheme.productButtonColor);
  setOrRemoveProp(["--product-button-text-color"], currentTheme.product_button_text_color || currentTheme.productButtonTextColor);
  setOrRemoveProp(["--product-button-hover-color"], currentTheme.product_button_hover_color || currentTheme.productButtonHoverColor);

  if (currentTheme.product_font_family || currentTheme.productFontFamily) {
    root.style.setProperty("--product-font-family", formatFont(currentTheme.product_font_family || currentTheme.productFontFamily));
  } else {
    root.style.removeProperty("--product-font-family");
  }

  // --- About Section Variables ---
  setOrRemoveProp(["--about-bg-color", "--about-bg"], currentTheme.about_bg_color || currentTheme.aboutBgColor);
  setOrRemoveProp(["--about-card-color", "--about-card-bg"], currentTheme.about_card_color || currentTheme.aboutCardColor);
  setOrRemoveProp(["--about-text-color", "--about-text"], currentTheme.about_text_color || currentTheme.aboutTextColor);
  setOrRemoveProp(["--about-title-color", "--about-title"], currentTheme.about_title_color || currentTheme.aboutTitleColor);
  setOrRemoveProp(["--about-border-color", "--about-border"], currentTheme.about_border_color || currentTheme.aboutBorderColor);
  setOrRemoveProp(["--about-button-color", "--about-button-bg"], currentTheme.about_button_color || currentTheme.aboutButtonColor);
  setOrRemoveProp(["--about-button-text-color"], currentTheme.about_button_text_color || currentTheme.aboutButtonTextColor);
  setOrRemoveProp(["--about-button-hover-color"], currentTheme.about_button_hover_color || currentTheme.aboutButtonHoverColor);

  if (currentTheme.about_font_family || currentTheme.aboutFontFamily) {
    root.style.setProperty("--about-font-family", formatFont(currentTheme.about_font_family || currentTheme.aboutFontFamily));
  } else {
    root.style.removeProperty("--about-font-family");
  }

  // --- Contact Section Variables ---
  setOrRemoveProp(["--contact-bg-color", "--contact-bg"], currentTheme.contact_bg_color || currentTheme.contactBgColor);
  setOrRemoveProp(["--contact-card-color", "--contact-card-bg"], currentTheme.contact_card_color || currentTheme.contactCardColor);
  setOrRemoveProp(["--contact-text-color", "--contact-text"], currentTheme.contact_text_color || currentTheme.contactTextColor);
  setOrRemoveProp(["--contact-title-color", "--contact-title"], currentTheme.contact_title_color || currentTheme.contactTitleColor);
  setOrRemoveProp(["--contact-border-color", "--contact-border"], currentTheme.contact_border_color || currentTheme.contactBorderColor);
  setOrRemoveProp(["--contact-button-color", "--contact-button-bg"], currentTheme.contact_button_color || currentTheme.contactButtonColor);
  setOrRemoveProp(["--contact-button-text-color"], currentTheme.contact_button_text_color || currentTheme.contactButtonTextColor);
  setOrRemoveProp(["--contact-button-hover-color"], currentTheme.contact_button_hover_color || currentTheme.contactButtonHoverColor);

  if (currentTheme.contact_font_family || currentTheme.contactFontFamily) {
    root.style.setProperty("--contact-font-family", formatFont(currentTheme.contact_font_family || currentTheme.contactFontFamily));
  } else {
    root.style.removeProperty("--contact-font-family");
  }

  // --- Balance Card Section Variables ---
  const balanceGradStart = currentTheme.balance_gradient_start || currentTheme.balanceGradientStart || "#1E40AF";
  const balanceGradMid = currentTheme.balance_gradient_mid || currentTheme.balanceGradientMid || "#3B82F6";
  const balanceGradEnd = currentTheme.balance_gradient_end || currentTheme.balanceGradientEnd || "#60A5FA";
  const balanceTextColor = currentTheme.balance_text_color || currentTheme.balanceTextColor || "#FFFFFF";
  const balanceSubtextColor = currentTheme.balance_subtext_color || currentTheme.balanceSubtextColor || "#E0F2FE";
  const balanceBadgeColor = currentTheme.balance_badge_color || currentTheme.balanceBadgeColor || "#FFFFFF";
  const balanceCurrencyColor = currentTheme.balance_currency_color || currentTheme.balanceCurrencyColor || "#FFFFFF";
  const balanceRadius = `${currentTheme.balance_radius ?? currentTheme.balanceRadius ?? 24}px`;
  const balancePadding = `${currentTheme.balance_padding ?? currentTheme.balancePadding ?? 24}px`;
  const balanceAmountSize = `${currentTheme.balance_amount_size ?? currentTheme.balanceAmountSize ?? 32}px`;
  const balanceLabelSize = `${currentTheme.balance_label_size ?? currentTheme.balanceLabelSize ?? 14}px`;
  const balanceShadow = formatShadow(currentTheme.balance_shadow || currentTheme.balanceShadow || "heavy");
  const balanceGlowColor = currentTheme.balance_glow_color || currentTheme.balanceGlowColor || "#3B82F6";

  root.style.setProperty("--balance-gradient", `linear-gradient(135deg, ${balanceGradStart} 0%, ${balanceGradMid} 50%, ${balanceGradEnd} 100%)`);
  root.style.setProperty("--balance-text-color", balanceTextColor);
  root.style.setProperty("--balance-subtext-color", balanceSubtextColor);
  root.style.setProperty("--balance-badge-color", balanceBadgeColor);
  root.style.setProperty("--balance-currency-color", balanceCurrencyColor);
  root.style.setProperty("--balance-radius", balanceRadius);
  root.style.setProperty("--balance-padding", balancePadding);
  root.style.setProperty("--balance-amount-size", balanceAmountSize);
  root.style.setProperty("--balance-label-size", balanceLabelSize);
  root.style.setProperty("--balance-shadow", balanceShadow);
  root.style.setProperty("--balance-glow-color", balanceGlowColor);

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
      --theme-card: ${bgCard} !important;
      --theme-sidebar-bg: ${bgPrimary} !important;
      --theme-header-bg: ${bgPrimary} !important;
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
    .bg-theme-primary { background-color: ${primary} !important; }
    .bg-theme-secondary { background-color: ${secondary} !important; }
    .bg-theme-accent { background-color: ${accent} !important; }
    .bg-theme-background { background-color: ${bgPrimary} !important; }
    .bg-theme-card { background-color: ${bgCard} !important; }
    .bg-theme-sidebar { background-color: ${bgPrimary} !important; }
    .bg-theme-input { background-color: ${bgInput} !important; }
    .text-theme-primary { color: ${primary} !important; }
    .text-theme-text { color: ${textPrimary} !important; }
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

const THEME_CACHE_KEY = "xpay_theme_cache";

export function getCachedThemeSettings(): StoreThemeSettings | null {
  try {
    const raw = localStorage.getItem(THEME_CACHE_KEY);
    if (!raw) return null;
    return JSON.parse(raw);
  } catch {
    return null;
  }
}

export function setCachedThemeSettings(theme: StoreThemeSettings) {
  try {
    localStorage.setItem(THEME_CACHE_KEY, JSON.stringify(theme));
  } catch {}
}

/**
 * Fetches and applies theme from backend public API
 */
export async function loadAndApplyStoreTheme(apiBase = ""): Promise<StoreThemeSettings> {
  const cachedTheme = getCachedThemeSettings();
  if (cachedTheme) {
    applyStoreTheme(cachedTheme);
  }

  const endpoints = [
    `${apiBase}/api/public/theme-settings`,
    `${apiBase}/api/theme-settings`,
    `${apiBase}/api/theme`,
  ];

  console.log("[Theme] Fetching theme settings...");
  for (const endpoint of endpoints) {
    try {
      const res = await fetch(endpoint);
      if (res.ok) {
        const data: StoreThemeSettings = await res.json();
        console.log("[Theme] Received from endpoint:", endpoint, data);
        setCachedThemeSettings(data);
        applyStoreTheme(data);
        return data;
      }
    } catch {
      // try next fallback
    }
  }

  if (!cachedTheme) {
    applyStoreTheme(DEFAULT_STORE_THEME);
  }
  return cachedTheme || DEFAULT_STORE_THEME;
}


