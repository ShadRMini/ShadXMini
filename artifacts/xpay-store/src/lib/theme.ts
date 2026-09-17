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

  const primary = String(currentTheme.primary || currentTheme.theme_primary || DEFAULT_STORE_THEME.primary).trim();
  const secondary = String(currentTheme.secondary || currentTheme.theme_secondary || DEFAULT_STORE_THEME.secondary).trim();
  const accent = String(currentTheme.accent || currentTheme.theme_accent || DEFAULT_STORE_THEME.accent).trim();

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

  // Distinct Light vs Dark mode palettes
  const bgPrimary = isLight
    ? (customLightBg || "#F5F2EB")
    : (customDarkBg || "#1A1A1A");

  const bgSecondary = isLight ? "#FFFFFF" : "#242424";

  const bgCard = isLight
    ? (customLightCard || "#FFFFFF")
    : (customCardBg || "#2D2D2D");

  const bgInput = isLight
    ? "#EFECE6"
    : (customInputBg || "#3D3D3D");

  const textPrimary = isLight
    ? (customLightText || "#111827")
    : (customTextPrimary || "#FFFFFF");

  const textSecondary = isLight
    ? "#374151"
    : (customTextSecondary || "#E5E7EB");

  const textMuted = isLight
    ? "#6B7280"
    : (customTextMuted || "#9CA3AF");

  const borderColor = isLight
    ? "rgba(0, 0, 0, 0.12)"
    : (customBorder || "rgba(200, 164, 92, 0.25)");

  const shadowColor = isLight ? "rgba(0, 0, 0, 0.08)" : "rgba(0, 0, 0, 0.35)";

  const fontArabic = String(currentTheme.fontArabic || currentTheme.theme_font_arabic || currentTheme.font || DEFAULT_STORE_THEME.fontArabic).trim();
  const fontEnglish = String(currentTheme.fontEnglish || currentTheme.theme_font_english || DEFAULT_STORE_THEME.fontEnglish).trim();
  const rawRadius = currentTheme.radius ?? currentTheme.theme_border_radius ?? currentTheme.borderRadius ?? DEFAULT_STORE_THEME.radius;
  const radiusNum = Number(rawRadius);
  const radiusPx = Number.isFinite(radiusNum) && radiusNum >= 0 ? `${radiusNum}px` : "16px";
  const rawShadow = String(currentTheme.shadow || currentTheme.theme_shadow || "medium").trim();
  const shadowCss = getShadowCss(rawShadow, primary, isLight);

  const headerGradStart = currentTheme.theme_header_gradient_start || currentTheme.headerGradientStart || bgPrimary;
  const headerGradEnd = currentTheme.theme_header_gradient_end || currentTheme.headerGradientEnd || bgCard;
  const bottomNavBg = currentTheme.theme_bottom_nav || currentTheme.bottomNav || bgPrimary;
  const bottomNavActive = currentTheme.theme_bottom_nav_active || currentTheme.bottomNavActive || primary;
  const sidebarBg = currentTheme.theme_sidebar_bg || currentTheme.sidebar || bgPrimary;
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
  root.style.setProperty("--theme-border", isLight ? "rgba(0, 0, 0, 0.1)" : hexWithAlpha(primary, "33"));
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

  // --- Auth Section Variables ---
  const authBg = currentTheme.auth_bg_color || currentTheme.authBgColor || "#1A1A1A";
  const authCard = currentTheme.auth_card_color || currentTheme.authCardColor || "#2D2D2D";
  const authText = currentTheme.auth_text_color || currentTheme.authTextColor || "#FFFFFF";
  const authTitle = currentTheme.auth_title_color || currentTheme.authTitleColor || "#C8A45C";
  const authBorder = currentTheme.auth_border_color || currentTheme.authBorderColor || "#C8A45C";
  const authButton = currentTheme.auth_button_color || currentTheme.authButtonColor || "#C8A45C";
  const authButtonText = currentTheme.auth_button_text_color || currentTheme.authButtonTextColor || "#1A1A1A";
  const authButtonHover = currentTheme.auth_button_hover_color || currentTheme.authButtonHoverColor || "#B8954A";
  const authFont = formatFont(currentTheme.auth_font_family || currentTheme.authFontFamily);
  const authFontSize = `${currentTheme.auth_font_size || currentTheme.authFontSize || 14}px`;
  const authHeadingSize = `${currentTheme.auth_heading_size || currentTheme.authHeadingSize || 20}px`;
  const authRadius = `${currentTheme.auth_radius || currentTheme.authRadius || 16}px`;
  const authPadding = `${currentTheme.auth_padding || currentTheme.authPadding || 24}px`;
  const authShadow = formatShadow(currentTheme.auth_shadow || currentTheme.authShadow);

  root.style.setProperty("--auth-bg-color", authBg);
  root.style.setProperty("--auth-card-color", authCard);
  root.style.setProperty("--auth-text-color", authText);
  root.style.setProperty("--auth-title-color", authTitle);
  root.style.setProperty("--auth-border-color", authBorder);
  root.style.setProperty("--auth-button-color", authButton);
  root.style.setProperty("--auth-button-text-color", authButtonText);
  root.style.setProperty("--auth-button-hover-color", authButtonHover);
  root.style.setProperty("--auth-font-family", authFont);
  root.style.setProperty("--auth-font-size", authFontSize);
  root.style.setProperty("--auth-heading-size", authHeadingSize);
  root.style.setProperty("--auth-radius", authRadius);
  root.style.setProperty("--auth-padding", authPadding);
  root.style.setProperty("--auth-shadow", authShadow);

  // --- Product Section Variables ---
  const productBg = currentTheme.product_bg_color || currentTheme.productBgColor || "#1A1A1A";
  const productCard = currentTheme.product_card_color || currentTheme.productCardColor || "#2D2D2D";
  const productText = currentTheme.product_text_color || currentTheme.productTextColor || "#FFFFFF";
  const productTitle = currentTheme.product_title_color || currentTheme.productTitleColor || "#FDE68A";
  const productPrice = currentTheme.product_price_color || currentTheme.productPriceColor || "#C8A45C";
  const productBorder = currentTheme.product_border_color || currentTheme.productBorderColor || "#C8A45C";
  const productButton = currentTheme.product_button_color || currentTheme.productButtonColor || "#C8A45C";
  const productButtonText = currentTheme.product_button_text_color || currentTheme.productButtonTextColor || "#1A1A1A";
  const productButtonHover = currentTheme.product_button_hover_color || currentTheme.productButtonHoverColor || "#B8954A";
  const productFont = formatFont(currentTheme.product_font_family || currentTheme.productFontFamily);
  const productFontSize = `${currentTheme.product_font_size || currentTheme.productFontSize || 14}px`;
  const productHeadingSize = `${currentTheme.product_heading_size || currentTheme.productHeadingSize || 20}px`;
  const productRadius = `${currentTheme.product_radius || currentTheme.productRadius || 16}px`;
  const productPadding = `${currentTheme.product_padding || currentTheme.productPadding || 24}px`;
  const productShadow = formatShadow(currentTheme.product_shadow || currentTheme.productShadow);

  root.style.setProperty("--product-bg-color", productBg);
  root.style.setProperty("--product-card-color", productCard);
  root.style.setProperty("--product-text-color", productText);
  root.style.setProperty("--product-title-color", productTitle);
  root.style.setProperty("--product-price-color", productPrice);
  root.style.setProperty("--product-border-color", productBorder);
  root.style.setProperty("--product-button-color", productButton);
  root.style.setProperty("--product-button-text-color", productButtonText);
  root.style.setProperty("--product-button-hover-color", productButtonHover);
  root.style.setProperty("--product-font-family", productFont);
  root.style.setProperty("--product-font-size", productFontSize);
  root.style.setProperty("--product-heading-size", productHeadingSize);
  root.style.setProperty("--product-radius", productRadius);
  root.style.setProperty("--product-padding", productPadding);
  root.style.setProperty("--product-shadow", productShadow);

  // --- About Section Variables ---
  const aboutBg = currentTheme.about_bg_color || currentTheme.aboutBgColor || "#1A1A1A";
  const aboutCard = currentTheme.about_card_color || currentTheme.aboutCardColor || "#2D2D2D";
  const aboutText = currentTheme.about_text_color || currentTheme.aboutTextColor || "#FFFFFF";
  const aboutTitle = currentTheme.about_title_color || currentTheme.aboutTitleColor || "#C8A45C";
  const aboutBorder = currentTheme.about_border_color || currentTheme.aboutBorderColor || "#C8A45C";
  const aboutButton = currentTheme.about_button_color || currentTheme.aboutButtonColor || "#C8A45C";
  const aboutButtonText = currentTheme.about_button_text_color || currentTheme.aboutButtonTextColor || "#1A1A1A";
  const aboutButtonHover = currentTheme.about_button_hover_color || currentTheme.aboutButtonHoverColor || "#B8954A";
  const aboutFont = formatFont(currentTheme.about_font_family || currentTheme.aboutFontFamily);
  const aboutFontSize = `${currentTheme.about_font_size || currentTheme.aboutFontSize || 14}px`;
  const aboutHeadingSize = `${currentTheme.about_heading_size || currentTheme.aboutHeadingSize || 20}px`;
  const aboutRadius = `${currentTheme.about_radius || currentTheme.aboutRadius || 16}px`;
  const aboutPadding = `${currentTheme.about_padding || currentTheme.aboutPadding || 24}px`;
  const aboutShadow = formatShadow(currentTheme.about_shadow || currentTheme.aboutShadow);

  root.style.setProperty("--about-bg-color", aboutBg);
  root.style.setProperty("--about-card-color", aboutCard);
  root.style.setProperty("--about-text-color", aboutText);
  root.style.setProperty("--about-title-color", aboutTitle);
  root.style.setProperty("--about-border-color", aboutBorder);
  root.style.setProperty("--about-button-color", aboutButton);
  root.style.setProperty("--about-button-text-color", aboutButtonText);
  root.style.setProperty("--about-button-hover-color", aboutButtonHover);
  root.style.setProperty("--about-font-family", aboutFont);
  root.style.setProperty("--about-font-size", aboutFontSize);
  root.style.setProperty("--about-heading-size", aboutHeadingSize);
  root.style.setProperty("--about-radius", aboutRadius);
  root.style.setProperty("--about-padding", aboutPadding);
  root.style.setProperty("--about-shadow", aboutShadow);

  // --- Contact Section Variables ---
  const contactBg = currentTheme.contact_bg_color || currentTheme.contactBgColor || "#1A1A1A";
  const contactCard = currentTheme.contact_card_color || currentTheme.contactCardColor || "#2D2D2D";
  const contactText = currentTheme.contact_text_color || currentTheme.contactTextColor || "#FFFFFF";
  const contactTitle = currentTheme.contact_title_color || currentTheme.contactTitleColor || "#C8A45C";
  const contactBorder = currentTheme.contact_border_color || currentTheme.contactBorderColor || "#C8A45C";
  const contactButton = currentTheme.contact_button_color || currentTheme.contactButtonColor || "#C8A45C";
  const contactButtonText = currentTheme.contact_button_text_color || currentTheme.contactButtonTextColor || "#1A1A1A";
  const contactButtonHover = currentTheme.contact_button_hover_color || currentTheme.contactButtonHoverColor || "#B8954A";
  const contactFont = formatFont(currentTheme.contact_font_family || currentTheme.contactFontFamily);
  const contactFontSize = `${currentTheme.contact_font_size || currentTheme.contactFontSize || 14}px`;
  const contactHeadingSize = `${currentTheme.contact_heading_size || currentTheme.contactHeadingSize || 20}px`;
  const contactRadius = `${currentTheme.contact_radius || currentTheme.contactRadius || 16}px`;
  const contactPadding = `${currentTheme.contact_padding || currentTheme.contactPadding || 24}px`;
  const contactShadow = formatShadow(currentTheme.contact_shadow || currentTheme.contactShadow);

  root.style.setProperty("--contact-bg-color", contactBg);
  root.style.setProperty("--contact-card-color", contactCard);
  root.style.setProperty("--contact-text-color", contactText);
  root.style.setProperty("--contact-title-color", contactTitle);
  root.style.setProperty("--contact-border-color", contactBorder);
  root.style.setProperty("--contact-button-color", contactButton);
  root.style.setProperty("--contact-button-text-color", contactButtonText);
  root.style.setProperty("--contact-button-hover-color", contactButtonHover);
  root.style.setProperty("--contact-font-family", contactFont);
  root.style.setProperty("--contact-font-size", contactFontSize);
  root.style.setProperty("--contact-heading-size", contactHeadingSize);
  root.style.setProperty("--contact-radius", contactRadius);
  root.style.setProperty("--contact-padding", contactPadding);
  root.style.setProperty("--contact-shadow", contactShadow);

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
      --theme-border: ${isLight ? "rgba(0, 0, 0, 0.1)" : primaryAlpha20} !important;
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

      ${authBg ? `--auth-bg-color: ${authBg} !important;` : ""}
      ${authCard ? `--auth-card-color: ${authCard} !important;` : ""}
      ${authText ? `--auth-text-color: ${authText} !important;` : ""}
      ${authButton ? `--auth-button-color: ${authButton} !important;` : ""}

      ${productBg ? `--product-bg-color: ${productBg} !important;` : ""}
      ${productCard ? `--product-card-color: ${productCard} !important;` : ""}
      ${productText ? `--product-text-color: ${productText} !important;` : ""}
      ${productPrice ? `--product-price-color: ${productPrice} !important;` : ""}

      ${aboutBg ? `--about-bg-color: ${aboutBg} !important;` : ""}
      ${aboutCard ? `--about-card-color: ${aboutCard} !important;` : ""}
      ${aboutText ? `--about-text-color: ${aboutText} !important;` : ""}

      ${contactBg ? `--contact-bg-color: ${contactBg} !important;` : ""}
      ${contactCard ? `--contact-card-color: ${contactCard} !important;` : ""}
      ${contactText ? `--contact-text-color: ${contactText} !important;` : ""}
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

/**
 * Fetches and applies theme from backend public API
 */
export async function loadAndApplyStoreTheme(apiBase = ""): Promise<StoreThemeSettings> {
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


