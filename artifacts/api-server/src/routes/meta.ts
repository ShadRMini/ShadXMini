import { Router, type IRouter } from "express";
import { db, paymentMethodsTable, settingsTable, socialLinksTable } from "@workspace/db";
import { asc, eq, sql } from "drizzle-orm";
import { ListPaymentMethodsResponse, ListSocialLinksResponse } from "@workspace/api-zod";
import { getOrCreateCurrentUser } from "../lib/currentUser.js";
import { DEFAULT_VALUES_TO_REJECT } from "../lib/sanitizers.js";
import { requireAdmin } from "../lib/adminAuth.js";
import { rateLimit } from "../lib/rateLimit.js";

const router: IRouter = Router();

router.get("/payment-methods", async (_req, res) => {
  res.set("Cache-Control", "no-store, no-cache, must-revalidate, proxy-revalidate");
  res.set("Pragma", "no-cache");
  res.set("Expires", "0");
  try {
    const rows = await db
      .select()
      .from(paymentMethodsTable)
      .where(eq(paymentMethodsTable.active, true))
      .orderBy(asc(paymentMethodsTable.order));
    
    res.json(
      rows.map((m) => ({
        id: String(m.id),
        code: String(m.code),
        name: m.name,
        subtitle: m.subtitle,
        requiresVerification: Boolean(m.requiresVerification),
        instructions: m.instructions ?? undefined,
        walletAddress: m.walletAddress ?? undefined,
        logoImage: m.logoImage ?? undefined,
        qrImage: m.qrImage ?? undefined,
        showQrFromAddress: Boolean(m.showQrFromAddress),
        minAmount: Number(m.minAmount),
        active: m.active,
        order: m.order !== undefined ? Number(m.order) : 0,
        category: m.category ?? undefined,
        displayConfig: m.displayConfig ?? undefined,
      })),
    );
  } catch (err) {
    console.error("Error in /payment-methods endpoint:", err);
    res.status(500).json({ error: "failed_to_list_payment_methods" });
  }
});

router.get("/social-links", async (_req, res) => {
  const rows = await db.select().from(socialLinksTable).orderBy(asc(socialLinksTable.order));
  res.json(
    ListSocialLinksResponse.parse(
      rows.map((s) => ({ id: String(s.id), platform: s.platform, url: s.url, label: s.label })),
    ),
  );
});

router.get(["/theme", "/theme-settings", "/public/theme-settings", "/admin/theme-settings"], async (_req, res) => {
  try {
    const rows = await db.select().from(settingsTable);
    const map = new Map(rows.map((row) => [row.key, row.value]));

    const themePrimary = String(map.get("theme_primary") || "#C8A45C").trim();
    const themeSecondary = String(map.get("theme_secondary") || "#B8954A").trim();
    const themeAccent = String(map.get("theme_accent") || "#FDE68A").trim();
    const themeBackground = String(map.get("theme_background") || map.get("theme_bg") || "#1A1A1A").trim();
    const themeCard = String(map.get("theme_card") || "#2D2D2D").trim();
    const themeTextPrimary = String(map.get("theme_text_primary") || "#FFFFFF").trim();
    const themeTextSecondary = String(map.get("theme_text_secondary") || "#E5E7EB").trim();
    const themeTextMuted = String(map.get("theme_text_muted") || "#9CA3AF").trim();
    const themeBorder = String(map.get("theme_border") || "rgba(200, 164, 92, 0.25)").trim();
    const themeInputBg = String(map.get("theme_input_bg") || "#3D3D3D").trim();

    const themeHeaderGradientStart = String(map.get("theme_header_gradient_start") || "#1A1A1A").trim();
    const themeHeaderGradientEnd = String(map.get("theme_header_gradient_end") || "#2D2D2D").trim();
    const themeBottomNav = String(map.get("theme_bottom_nav") || "#1A1A1A").trim();
    const themeBottomNavActive = String(map.get("theme_bottom_nav_active") || "#C8A45C").trim();
    const themeSidebarBg = String(map.get("theme_sidebar_bg") || "#1A1A1A").trim();

    const themeFontArabic = String(map.get("theme_font_arabic") || map.get("theme_font") || "Cairo").trim();
    const themeFontEnglish = String(map.get("theme_font_english") || "Inter").trim();
    const themeFontSize = String(map.get("theme_font_size") || "14").trim();
    const themeHeadingSize = String(map.get("theme_heading_size") || "20").trim();

    const themeBorderRadius = String(map.get("theme_border_radius") || map.get("theme_radius") || "16").trim();
    const themeShadow = String(map.get("theme_shadow") || "medium").trim();
    const themePadding = String(map.get("theme_padding") || "24").trim();
    const themeMode = String(map.get("theme_mode") || map.get("theme_default_mode") || "dark").trim();
    const themeDefaultMode = themeMode;
    const themeActivePreset = String(map.get("theme_active_preset") || "gold").trim();

    const SERVER_THEME_PRESETS: Record<string, { dark: any; light: any }> = {
      "gold": {
        dark: { primary: "#C8A45C", secondary: "#B8954A", accent: "#FDE68A", background: "#1A1A1A", card: "#2D2D2D", textPrimary: "#FFFFFF", textSecondary: "#E5E7EB", textMuted: "#9CA3AF", border: "rgba(200, 164, 92, 0.25)", inputBg: "#3D3D3D", headerGradientStart: "#1A1A1A", headerGradientEnd: "#2D2D2D", bottomNav: "#1A1A1A", bottomNavActive: "#C8A45C", sidebar: "#1A1A1A" },
        light: { primary: "#C8A45C", secondary: "#B8954A", accent: "#D97706", background: "#F5F2EB", card: "#FFFFFF", textPrimary: "#1C1917", textSecondary: "#44403C", textMuted: "#78716C", border: "rgba(200, 164, 92, 0.3)", inputBg: "#EFECE6", headerGradientStart: "#F5F2EB", headerGradientEnd: "#EFECE6", bottomNav: "#FFFFFF", bottomNavActive: "#C8A45C", sidebar: "#FFFFFF" }
      },
      "royal-blue": {
        dark: { primary: "#3B82F6", secondary: "#2563EB", accent: "#93C5FD", background: "#0F172A", card: "#1E293B", textPrimary: "#FFFFFF", textSecondary: "#CBD5E1", textMuted: "#94A3B8", border: "rgba(59, 130, 246, 0.25)", inputBg: "#334155", headerGradientStart: "#0F172A", headerGradientEnd: "#1E293B", bottomNav: "#0F172A", bottomNavActive: "#3B82F6", sidebar: "#0F172A" },
        light: { primary: "#3B82F6", secondary: "#2563EB", accent: "#1D4ED8", background: "#F1F5F9", card: "#FFFFFF", textPrimary: "#0F172A", textSecondary: "#334155", textMuted: "#64748B", border: "rgba(59, 130, 246, 0.25)", inputBg: "#E2E8F0", headerGradientStart: "#F1F5F9", headerGradientEnd: "#E2E8F0", bottomNav: "#FFFFFF", bottomNavActive: "#3B82F6", sidebar: "#FFFFFF" }
      },
      "imperial-emerald": {
        dark: { primary: "#10B981", secondary: "#059669", accent: "#6EE7B7", background: "#064E3B", card: "#065F46", textPrimary: "#FFFFFF", textSecondary: "#D1FAE5", textMuted: "#A7F3D0", border: "rgba(16, 185, 129, 0.25)", inputBg: "#047857", headerGradientStart: "#064E3B", headerGradientEnd: "#065F46", bottomNav: "#064E3B", bottomNavActive: "#10B981", sidebar: "#064E3B" },
        light: { primary: "#10B981", secondary: "#059669", accent: "#047857", background: "#ECFDF5", card: "#FFFFFF", textPrimary: "#064E3B", textSecondary: "#065F46", textMuted: "#047857", border: "rgba(16, 185, 129, 0.25)", inputBg: "#D1FAE5", headerGradientStart: "#ECFDF5", headerGradientEnd: "#D1FAE5", bottomNav: "#FFFFFF", bottomNavActive: "#10B981", sidebar: "#FFFFFF" }
      },
      "classic-violet": {
        dark: { primary: "#8B5CF6", secondary: "#7C3AED", accent: "#C4B5FD", background: "#2E1065", card: "#3B0764", textPrimary: "#FFFFFF", textSecondary: "#E9D5FF", textMuted: "#C084FC", border: "rgba(139, 92, 246, 0.25)", inputBg: "#581C87", headerGradientStart: "#2E1065", headerGradientEnd: "#3B0764", bottomNav: "#2E1065", bottomNavActive: "#8B5CF6", sidebar: "#2E1065" },
        light: { primary: "#8B5CF6", secondary: "#7C3AED", accent: "#6D28D9", background: "#F5F3FF", card: "#FFFFFF", textPrimary: "#2E1065", textSecondary: "#4C1D95", textMuted: "#6D28D9", border: "rgba(139, 92, 246, 0.25)", inputBg: "#EDE9FE", headerGradientStart: "#F5F3FF", headerGradientEnd: "#EDE9FE", bottomNav: "#FFFFFF", bottomNavActive: "#8B5CF6", sidebar: "#FFFFFF" }
      },
      "ruby-pink": {
        dark: { primary: "#EC4899", secondary: "#DB2777", accent: "#F9A8D4", background: "#4C0519", card: "#831843", textPrimary: "#FFFFFF", textSecondary: "#FCE7F3", textMuted: "#F472B6", border: "rgba(236, 72, 153, 0.25)", inputBg: "#9D174D", headerGradientStart: "#4C0519", headerGradientEnd: "#831843", bottomNav: "#4C0519", bottomNavActive: "#EC4899", sidebar: "#4C0519" },
        light: { primary: "#EC4899", secondary: "#DB2777", accent: "#BE185D", background: "#FDF2F8", card: "#FFFFFF", textPrimary: "#4C0519", textSecondary: "#831843", textMuted: "#9D174D", border: "rgba(236, 72, 153, 0.25)", inputBg: "#FCE7F3", headerGradientStart: "#FDF2F8", headerGradientEnd: "#FCE7F3", bottomNav: "#FFFFFF", bottomNavActive: "#EC4899", sidebar: "#FFFFFF" }
      },
      "fire-red": {
        dark: { primary: "#EF4444", secondary: "#DC2626", accent: "#FCA5A5", background: "#450A0A", card: "#7F1D1D", textPrimary: "#FFFFFF", textSecondary: "#FEE2E2", textMuted: "#F87171", border: "rgba(239, 68, 68, 0.25)", inputBg: "#991B1B", headerGradientStart: "#450A0A", headerGradientEnd: "#7F1D1D", bottomNav: "#450A0A", bottomNavActive: "#EF4444", sidebar: "#450A0A" },
        light: { primary: "#EF4444", secondary: "#DC2626", accent: "#B91C1C", background: "#FEF2F2", card: "#FFFFFF", textPrimary: "#450A0A", textSecondary: "#7F1D1D", textMuted: "#991B1B", border: "rgba(239, 68, 68, 0.25)", inputBg: "#FEE2E2", headerGradientStart: "#FEF2F2", headerGradientEnd: "#FEE2E2", bottomNav: "#FFFFFF", bottomNavActive: "#EF4444", sidebar: "#FFFFFF" }
      },
      "calm-indigo": {
        dark: { primary: "#4F46E5", secondary: "#4338CA", accent: "#A5B4FC", background: "#1E1B4B", card: "#312E81", textPrimary: "#FFFFFF", textSecondary: "#E0E7FF", textMuted: "#818CF8", border: "rgba(79, 70, 229, 0.25)", inputBg: "#3730A3", headerGradientStart: "#1E1B4B", headerGradientEnd: "#312E81", bottomNav: "#1E1B4B", bottomNavActive: "#4F46E5", sidebar: "#1E1B4B" },
        light: { primary: "#4F46E5", secondary: "#4338CA", accent: "#3730A3", background: "#EEF2FF", card: "#FFFFFF", textPrimary: "#1E1B4B", textSecondary: "#312E81", textMuted: "#4338CA", border: "rgba(79, 70, 229, 0.25)", inputBg: "#E0E7FF", headerGradientStart: "#EEF2FF", headerGradientEnd: "#E0E7FF", bottomNav: "#FFFFFF", bottomNavActive: "#4F46E5", sidebar: "#FFFFFF" }
      },
      "modern-teal": {
        dark: { primary: "#14B8A6", secondary: "#0D9488", accent: "#99F6E4", background: "#042F2E", card: "#115E59", textPrimary: "#FFFFFF", textSecondary: "#CCFBF1", textMuted: "#2DD4BF", border: "rgba(20, 184, 166, 0.25)", inputBg: "#134E4A", headerGradientStart: "#042F2E", headerGradientEnd: "#115E59", bottomNav: "#042F2E", bottomNavActive: "#14B8A6", sidebar: "#042F2E" },
        light: { primary: "#14B8A6", secondary: "#0D9488", accent: "#0F766E", background: "#F0FDFA", card: "#FFFFFF", textPrimary: "#042F2E", textSecondary: "#115E59", textMuted: "#0D9488", border: "rgba(20, 184, 166, 0.25)", inputBg: "#CCFBF1", headerGradientStart: "#F0FDFA", headerGradientEnd: "#CCFBF1", bottomNav: "#FFFFFF", bottomNavActive: "#14B8A6", sidebar: "#FFFFFF" }
      }
    };

    const activePresetObj = SERVER_THEME_PRESETS[themeActivePreset] || SERVER_THEME_PRESETS["gold"];

    const themeLogoSize = String(map.get("theme_logo_size") || map.get("logo_size") || "80px").trim();
    const themeLogoUrl = String(map.get("theme_logo_url") || map.get("brand_logo_url") || map.get("site_logo") || "").trim();
    const themeLogoTextColor = String(map.get("theme_logo_text_color") || "#C8A45C").trim();

    // Helper to get string setting with fallback
    const getSettingStr = (key: string, fallback: string = "") => {
      let val = map.get(key);
      if (typeof val === "string") {
        try {
          const parsed = JSON.parse(val);
          if (typeof parsed === "string") val = parsed;
        } catch {}
      }
      if (val !== undefined && val !== null) {
        const s = String(val).trim().replace(/^"|"$/g, "");
        if (s !== "") return s;
      }
      return fallback;
    };

    const parseJsonSetting = (key: string) => {
      let val = map.get(key);
      if (typeof val === "string") {
        try {
          val = JSON.parse(val);
        } catch {}
      }
      return val && typeof val === "object" ? val : {};
    };

    // Parse legacy/section JSON configs if present for fallback
    const authPagesConfig = parseJsonSetting("auth_pages_config");
    const authStyles = authPagesConfig?.common?.styles || {};

    const productPageStyle = parseJsonSetting("product_page_style");

    const aboutPageConfig = { ...parseJsonSetting("about_page_config"), ...parseJsonSetting("about_us_config") };
    const aboutStyle = aboutPageConfig?.style || {};

    const contactPageConfig = parseJsonSetting("contact_page_config");
    const contactStyles = contactPageConfig?.styles || {};

    const getPageCustomSetting = (key: string, legacyVal?: string) => {
      const dbVal = getSettingStr(key, "");
      const cleanDb = String(dbVal || "").trim().toLowerCase();
      if (cleanDb && !cleanDb.startsWith("var(") && !DEFAULT_VALUES_TO_REJECT.includes(cleanDb)) {
        return String(dbVal).trim();
      }
      const cleanLeg = String(legacyVal || "").trim().toLowerCase();
      if (cleanLeg && !cleanLeg.startsWith("var(") && !DEFAULT_VALUES_TO_REJECT.includes(cleanLeg)) {
        return String(legacyVal).trim();
      }
      return "";
    };

    // Section-specific theme variables (empty if not explicitly customized)
    const authBgColor = getPageCustomSetting("auth_bg_color", authStyles.pageBgColor);
    const authCardColor = getPageCustomSetting("auth_card_color", authStyles.cardBgColor);
    const authTextColor = getPageCustomSetting("auth_text_color", authStyles.inputTextColor);
    const authTitleColor = getPageCustomSetting("auth_title_color", authStyles.titleColor);
    const authBorderColor = getPageCustomSetting("auth_border_color");
    const authButtonColor = getPageCustomSetting("auth_button_color", authStyles.buttonBgColor);
    const authButtonTextColor = getPageCustomSetting("auth_button_text_color");
    const authButtonHoverColor = getPageCustomSetting("auth_button_hover_color");
    const authFontFamily = getSettingStr("auth_font_family", "");
    const authFontSize = getSettingStr("auth_font_size", "");
    const authHeadingSize = getSettingStr("auth_heading_size", "");
    const authRadius = getSettingStr("auth_radius", "");
    const authPadding = getSettingStr("auth_padding", "");
    const authShadow = getSettingStr("auth_shadow", "");

    const productBgColor = getPageCustomSetting("product_bg_color", productPageStyle.bg_color);
    const productCardColor = getPageCustomSetting("product_card_color", productPageStyle.info_box_bg_color);
    const productTextColor = getPageCustomSetting("product_text_color", productPageStyle.text_color);
    const productTitleColor = getPageCustomSetting("product_title_color");
    const productPriceColor = getPageCustomSetting("product_price_color", productPageStyle.price_color);
    const productBorderColor = getPageCustomSetting("product_border_color", productPageStyle.border_color);
    const productButtonColor = getPageCustomSetting("product_button_color", productPageStyle.button_color);
    const productButtonTextColor = getPageCustomSetting("product_button_text_color");
    const productButtonHoverColor = getPageCustomSetting("product_button_hover_color");
    const productFontFamily = getSettingStr("product_font_family", "");
    const productFontSize = getSettingStr("product_font_size", "");
    const productHeadingSize = getSettingStr("product_heading_size", "");
    const productRadius = getSettingStr("product_radius", "");
    const productPadding = getSettingStr("product_padding", "");
    const productShadow = getSettingStr("product_shadow", "");

    const aboutBgColor = getPageCustomSetting("about_bg_color", aboutStyle.bg_color);
    const aboutCardColor = getPageCustomSetting("about_card_color", aboutStyle.section_bg);
    const aboutTextColor = getPageCustomSetting("about_text_color", aboutStyle.text_color);
    const aboutTitleColor = getPageCustomSetting("about_title_color", aboutStyle.title_color);
    const aboutBorderColor = getPageCustomSetting("about_border_color");
    const aboutButtonColor = getPageCustomSetting("about_button_color");
    const aboutButtonTextColor = getPageCustomSetting("about_button_text_color");
    const aboutButtonHoverColor = getPageCustomSetting("about_button_hover_color");
    const aboutFontFamily = getSettingStr("about_font_family", "");
    const aboutFontSize = getSettingStr("about_font_size", "");
    const aboutHeadingSize = getSettingStr("about_heading_size", "");
    const aboutRadius = getSettingStr("about_radius", "");
    const aboutPadding = getSettingStr("about_padding", "");
    const aboutShadow = getSettingStr("about_shadow", "");

    const contactBgColor = getPageCustomSetting("contact_bg_color", contactStyles.bg_color);
    const contactCardColor = getPageCustomSetting("contact_card_color", contactStyles.card_bg);
    const contactTextColor = getPageCustomSetting("contact_text_color", contactStyles.text_color);
    const contactTitleColor = getPageCustomSetting("contact_title_color");
    const contactBorderColor = getPageCustomSetting("contact_border_color");
    const contactButtonColor = getPageCustomSetting("contact_button_color");
    const contactButtonTextColor = getPageCustomSetting("contact_button_text_color");
    const contactButtonHoverColor = getPageCustomSetting("contact_button_hover_color");
    const contactFontFamily = getSettingStr("contact_font_family", "");
    const contactFontSize = getSettingStr("contact_font_size", "");
    const contactHeadingSize = getSettingStr("contact_heading_size", "");
    const contactRadius = getSettingStr("contact_radius", "");
    const contactPadding = getSettingStr("contact_padding", "");
    const contactShadow = getSettingStr("contact_shadow", "");

    // Balance Card Section
    const balanceGradientStart = getSettingStr("balance_gradient_start", "#1E40AF");
    const balanceGradientMid = getSettingStr("balance_gradient_mid", "#3B82F6");
    const balanceGradientEnd = getSettingStr("balance_gradient_end", "#60A5FA");
    const balanceTextColor = getSettingStr("balance_text_color", "#FFFFFF");
    const balanceSubtextColor = getSettingStr("balance_subtext_color", "#E0F2FE");
    const balanceBadgeColor = getSettingStr("balance_badge_color", "#FFFFFF");
    const balanceCurrencyColor = getSettingStr("balance_currency_color", "#FFFFFF");
    const balanceRadius = getSettingStr("balance_radius", "24");
    const balancePadding = getSettingStr("balance_padding", "24");
    const balanceAmountSize = getSettingStr("balance_amount_size", "32");
    const balanceLabelSize = getSettingStr("balance_label_size", "14");
    const balanceShadow = getSettingStr("balance_shadow", "heavy");
    const balanceGlowEnabled = getSettingStr("balance_glow_enabled", "true");
    const balanceGlowColor = getSettingStr("balance_glow_color", "#3B82F6");

    const responseData = {
      // Full raw keys
      theme_primary: themePrimary,
      theme_secondary: themeSecondary,
      theme_accent: themeAccent,
      theme_background: themeBackground,
      theme_text_primary: themeTextPrimary,
      theme_font_arabic: themeFontArabic,
      theme_font_english: themeFontEnglish,
      theme_font_size: themeFontSize,
      theme_border_radius: themeBorderRadius,
      theme_shadow: themeShadow,
      theme_default_mode: themeDefaultMode,
      theme_logo_size: themeLogoSize,
      // Auth Section
      auth_bg_color: authBgColor,
      auth_card_color: authCardColor,
      auth_text_color: authTextColor,
      auth_title_color: authTitleColor,
      auth_border_color: authBorderColor,
      auth_button_color: authButtonColor,
      auth_button_text_color: authButtonTextColor,
      auth_button_hover_color: authButtonHoverColor,
      auth_font_family: authFontFamily,
      auth_font_size: authFontSize,
      auth_heading_size: authHeadingSize,
      auth_radius: authRadius,
      auth_padding: authPadding,
      auth_shadow: authShadow,
      // Product Section
      product_bg_color: productBgColor,
      product_card_color: productCardColor,
      product_text_color: productTextColor,
      product_title_color: productTitleColor,
      product_price_color: productPriceColor,
      product_border_color: productBorderColor,
      product_button_color: productButtonColor,
      product_button_text_color: productButtonTextColor,
      product_button_hover_color: productButtonHoverColor,
      product_font_family: productFontFamily,
      product_font_size: productFontSize,
      product_heading_size: productHeadingSize,
      product_radius: productRadius,
      product_padding: productPadding,
      product_shadow: productShadow,
      // About Section
      about_bg_color: aboutBgColor,
      about_card_color: aboutCardColor,
      about_text_color: aboutTextColor,
      about_title_color: aboutTitleColor,
      about_border_color: aboutBorderColor,
      about_button_color: aboutButtonColor,
      about_button_text_color: aboutButtonTextColor,
      about_button_hover_color: aboutButtonHoverColor,
      about_font_family: aboutFontFamily,
      about_font_size: aboutFontSize,
      about_heading_size: aboutHeadingSize,
      about_radius: aboutRadius,
      about_padding: aboutPadding,
      about_shadow: aboutShadow,
      // Contact Section
      contact_bg_color: contactBgColor,
      contact_card_color: contactCardColor,
      contact_text_color: contactTextColor,
      contact_title_color: contactTitleColor,
      contact_border_color: contactBorderColor,
      contact_button_color: contactButtonColor,
      contact_button_text_color: contactButtonTextColor,
      contact_button_hover_color: contactButtonHoverColor,
      contact_font_family: contactFontFamily,
      contact_font_size: contactFontSize,
      contact_heading_size: contactHeadingSize,
      contact_radius: contactRadius,
      contact_padding: contactPadding,
      contact_shadow: contactShadow,
      // CamelCase Aliases
      authBgColor,
      authCardColor,
      authTextColor,
      authTitleColor,
      authBorderColor,
      authButtonColor,
      authButtonTextColor,
      authButtonHoverColor,
      authFontFamily,
      authFontSize,
      authHeadingSize,
      authRadius,
      authPadding,
      authShadow,
      productBgColor,
      productCardColor,
      productTextColor,
      productTitleColor,
      productPriceColor,
      productBorderColor,
      productButtonColor,
      productButtonTextColor,
      productButtonHoverColor,
      productFontFamily,
      productFontSize,
      productHeadingSize,
      productRadius,
      productPadding,
      productShadow,
      aboutBgColor,
      aboutCardColor,
      aboutTextColor,
      aboutTitleColor,
      aboutBorderColor,
      aboutButtonColor,
      aboutButtonTextColor,
      aboutButtonHoverColor,
      aboutFontFamily,
      aboutFontSize,
      aboutHeadingSize,
      aboutRadius,
      aboutPadding,
      aboutShadow,
      contactBgColor,
      contactCardColor,
      contactTextColor,
      contactTitleColor,
      contactBorderColor,
      contactButtonColor,
      contactButtonTextColor,
      contactButtonHoverColor,
      contactFontFamily,
      contactFontSize,
      contactHeadingSize,
      contactRadius,
      contactPadding,
      contactShadow,
      // Balance Section
      balance_gradient_start: balanceGradientStart,
      balance_gradient_mid: balanceGradientMid,
      balance_gradient_end: balanceGradientEnd,
      balance_text_color: balanceTextColor,
      balance_subtext_color: balanceSubtextColor,
      balance_badge_color: balanceBadgeColor,
      balance_currency_color: balanceCurrencyColor,
      balance_radius: balanceRadius,
      balance_padding: balancePadding,
      balance_amount_size: balanceAmountSize,
      balance_label_size: balanceLabelSize,
      balance_shadow: balanceShadow,
      balance_glow_enabled: balanceGlowEnabled,
      balance_glow_color: balanceGlowColor,
      balanceGradientStart,
      balanceGradientMid,
      balanceGradientEnd,
      balanceTextColor,
      balanceSubtextColor,
      balanceBadgeColor,
      balanceCurrencyColor,
      balanceRadius,
      balancePadding,
      balanceAmountSize,
      balanceLabelSize,
      balanceShadow,
      balanceGlowEnabled,
      balanceGlowColor,
      // Direct alias & structured theme properties
      theme_mode: themeMode,
      theme_active_preset: themeActivePreset,
      activePreset: themeActivePreset,
      dark: activePresetObj.dark,
      light: activePresetObj.light,
      theme_card: themeCard,
      theme_text_secondary: themeTextSecondary,
      theme_text_muted: themeTextMuted,
      theme_border: themeBorder,
      theme_input_bg: themeInputBg,
      theme_header_gradient_start: themeHeaderGradientStart,
      theme_header_gradient_end: themeHeaderGradientEnd,
      theme_bottom_nav: themeBottomNav,
      theme_bottom_nav_active: themeBottomNavActive,
      theme_sidebar_bg: themeSidebarBg,
      theme_padding: themePadding,
      theme_heading_size: themeHeadingSize,
      theme_logo_url: themeLogoUrl,
      theme_logo_text_color: themeLogoTextColor,
      theme_presets: parseJsonSetting("theme_presets"),
      mode: themeMode,
      card: themeCard,
      textSecondary: themeTextSecondary,
      textMuted: themeTextMuted,
      border: themeBorder,
      inputBg: themeInputBg,
      headerGradientStart: themeHeaderGradientStart,
      headerGradientEnd: themeHeaderGradientEnd,
      bottomNav: themeBottomNav,
      bottomNavActive: themeBottomNavActive,
      sidebar: themeSidebarBg,
      padding: themePadding,
      headingSize: themeHeadingSize,
      primary: themePrimary,
      secondary: themeSecondary,
      accent: themeAccent,
      background: themeBackground,
      textPrimary: themeTextPrimary,
      font: themeFontArabic,
      fontArabic: themeFontArabic,
      fontEnglish: themeFontEnglish,
      radius: themeBorderRadius,
      borderRadius: themeBorderRadius,
      shadow: themeShadow,
      defaultMode: themeDefaultMode,
      fontSize: themeFontSize,
      logoSize: themeLogoSize,
      logo_size: themeLogoSize,
    };

    console.log("[API /theme] Retrieved theme configuration successfully:", responseData);
    res.json(responseData);
  } catch (err: any) {
    console.error("[API /theme] Error fetching theme settings:", err);
    res.status(500).json({ error: err?.message || "Failed to load theme settings" });
  }
});

router.put(["/admin/theme-settings", "/theme-settings"], requireAdmin, async (req, res) => {
  try {
    const body = req.body || {};
    const allowedKeys = [
      "theme_primary",
      "theme_secondary",
      "theme_accent",
      "theme_background",
      "theme_text_primary",
      "theme_font_arabic",
      "theme_font_english",
      "theme_font_size",
      "theme_border_radius",
      "theme_shadow",
      "theme_default_mode",
      "theme_logo_size",
      // alias keys
      "primary",
      "secondary",
      "accent",
      "background",
      "textPrimary",
      "fontArabic",
      "fontEnglish",
      "fontSize",
      "radius",
      "borderRadius",
      "shadow",
      "defaultMode",
      "logoSize",
      "logo_size",
    ];

    const updates: { key: string; value: any }[] = [];

    // Direct mapping
    if (body.theme_primary || body.primary) updates.push({ key: "theme_primary", value: String(body.theme_primary || body.primary).trim() });
    if (body.theme_secondary || body.secondary) updates.push({ key: "theme_secondary", value: String(body.theme_secondary || body.secondary).trim() });
    if (body.theme_accent || body.accent) updates.push({ key: "theme_accent", value: String(body.theme_accent || body.accent).trim() });
    if (body.theme_background || body.background) updates.push({ key: "theme_background", value: String(body.theme_background || body.background).trim() });
    if (body.theme_text_primary || body.textPrimary) updates.push({ key: "theme_text_primary", value: String(body.theme_text_primary || body.textPrimary).trim() });
    if (body.theme_font_arabic || body.fontArabic) updates.push({ key: "theme_font_arabic", value: String(body.theme_font_arabic || body.fontArabic).trim() });
    if (body.theme_font_english || body.fontEnglish) updates.push({ key: "theme_font_english", value: String(body.theme_font_english || body.fontEnglish).trim() });
    if (body.theme_font_size || body.fontSize) updates.push({ key: "theme_font_size", value: String(body.theme_font_size || body.fontSize).trim() });
    if (body.theme_border_radius !== undefined || body.radius !== undefined || body.borderRadius !== undefined) {
      updates.push({ key: "theme_border_radius", value: String(body.theme_border_radius ?? body.radius ?? body.borderRadius).trim() });
    }
    if (body.theme_shadow || body.shadow) updates.push({ key: "theme_shadow", value: String(body.theme_shadow || body.shadow).trim() });
    if (body.theme_default_mode || body.defaultMode) updates.push({ key: "theme_default_mode", value: String(body.theme_default_mode || body.defaultMode).trim() });
    if (body.theme_logo_size !== undefined || body.logoSize !== undefined || body.logo_size !== undefined) {
      const rawLogoSize = String(body.theme_logo_size ?? body.logoSize ?? body.logo_size).trim();
      const val = rawLogoSize.includes("px") || rawLogoSize.includes("%") || rawLogoSize.includes("rem") ? rawLogoSize : `${rawLogoSize}px`;
      updates.push({ key: "theme_logo_size", value: val });
    }

    // Section Settings (supports both snake_case and camelCase)
    const sectionMappings: { key: string; aliases: string[] }[] = [
      // Auth
      { key: "auth_bg_color", aliases: ["auth_bg_color", "authBgColor"] },
      { key: "auth_card_color", aliases: ["auth_card_color", "authCardColor"] },
      { key: "auth_text_color", aliases: ["auth_text_color", "authTextColor"] },
      { key: "auth_title_color", aliases: ["auth_title_color", "authTitleColor"] },
      { key: "auth_border_color", aliases: ["auth_border_color", "authBorderColor"] },
      { key: "auth_button_color", aliases: ["auth_button_color", "authButtonColor"] },
      { key: "auth_button_text_color", aliases: ["auth_button_text_color", "authButtonTextColor"] },
      { key: "auth_button_hover_color", aliases: ["auth_button_hover_color", "authButtonHoverColor"] },
      { key: "auth_font_family", aliases: ["auth_font_family", "authFontFamily"] },
      { key: "auth_font_size", aliases: ["auth_font_size", "authFontSize"] },
      { key: "auth_heading_size", aliases: ["auth_heading_size", "authHeadingSize"] },
      { key: "auth_radius", aliases: ["auth_radius", "authRadius"] },
      { key: "auth_padding", aliases: ["auth_padding", "authPadding"] },
      { key: "auth_shadow", aliases: ["auth_shadow", "authShadow"] },

      // Product
      { key: "product_bg_color", aliases: ["product_bg_color", "productBgColor"] },
      { key: "product_card_color", aliases: ["product_card_color", "productCardColor"] },
      { key: "product_text_color", aliases: ["product_text_color", "productTextColor"] },
      { key: "product_title_color", aliases: ["product_title_color", "productTitleColor"] },
      { key: "product_price_color", aliases: ["product_price_color", "productPriceColor"] },
      { key: "product_border_color", aliases: ["product_border_color", "productBorderColor"] },
      { key: "product_button_color", aliases: ["product_button_color", "productButtonColor"] },
      { key: "product_button_text_color", aliases: ["product_button_text_color", "productButtonTextColor"] },
      { key: "product_button_hover_color", aliases: ["product_button_hover_color", "productButtonHoverColor"] },
      { key: "product_font_family", aliases: ["product_font_family", "productFontFamily"] },
      { key: "product_font_size", aliases: ["product_font_size", "productFontSize"] },
      { key: "product_heading_size", aliases: ["product_heading_size", "productHeadingSize"] },
      { key: "product_radius", aliases: ["product_radius", "productRadius"] },
      { key: "product_padding", aliases: ["product_padding", "productPadding"] },
      { key: "product_shadow", aliases: ["product_shadow", "productShadow"] },

      // About
      { key: "about_bg_color", aliases: ["about_bg_color", "aboutBgColor"] },
      { key: "about_card_color", aliases: ["about_card_color", "aboutCardColor"] },
      { key: "about_text_color", aliases: ["about_text_color", "aboutTextColor"] },
      { key: "about_title_color", aliases: ["about_title_color", "aboutTitleColor"] },
      { key: "about_border_color", aliases: ["about_border_color", "aboutBorderColor"] },
      { key: "about_button_color", aliases: ["about_button_color", "aboutButtonColor"] },
      { key: "about_button_text_color", aliases: ["about_button_text_color", "aboutButtonTextColor"] },
      { key: "about_button_hover_color", aliases: ["about_button_hover_color", "aboutButtonHoverColor"] },
      { key: "about_font_family", aliases: ["about_font_family", "aboutFontFamily"] },
      { key: "about_font_size", aliases: ["about_font_size", "aboutFontSize"] },
      { key: "about_heading_size", aliases: ["about_heading_size", "aboutHeadingSize"] },
      { key: "about_radius", aliases: ["about_radius", "aboutRadius"] },
      { key: "about_padding", aliases: ["about_padding", "aboutPadding"] },
      { key: "about_shadow", aliases: ["about_shadow", "aboutShadow"] },

      // Contact
      { key: "contact_bg_color", aliases: ["contact_bg_color", "contactBgColor"] },
      { key: "contact_card_color", aliases: ["contact_card_color", "contactCardColor"] },
      { key: "contact_text_color", aliases: ["contact_text_color", "contactTextColor"] },
      { key: "contact_title_color", aliases: ["contact_title_color", "contactTitleColor"] },
      { key: "contact_border_color", aliases: ["contact_border_color", "contactBorderColor"] },
      { key: "contact_button_color", aliases: ["contact_button_color", "contactButtonColor"] },
      { key: "contact_button_text_color", aliases: ["contact_button_text_color", "contactButtonTextColor"] },
      { key: "contact_button_hover_color", aliases: ["contact_button_hover_color", "contactButtonHoverColor"] },
      { key: "contact_font_family", aliases: ["contact_font_family", "contactFontFamily"] },
      { key: "contact_font_size", aliases: ["contact_font_size", "contactFontSize"] },
      { key: "contact_heading_size", aliases: ["contact_heading_size", "contactHeadingSize"] },
      { key: "contact_radius", aliases: ["contact_radius", "contactRadius"] },
      { key: "contact_padding", aliases: ["contact_padding", "contactPadding"] },
      { key: "contact_shadow", aliases: ["contact_shadow", "contactShadow"] },

      // Theme Core & Presets
      { key: "theme_mode", aliases: ["theme_mode", "mode", "theme_default_mode"] },
      { key: "theme_active_preset", aliases: ["theme_active_preset", "activePreset"] },
      { key: "theme_card", aliases: ["theme_card", "card"] },
      { key: "theme_text_secondary", aliases: ["theme_text_secondary", "textSecondary"] },
      { key: "theme_text_muted", aliases: ["theme_text_muted", "textMuted"] },
      { key: "theme_border", aliases: ["theme_border", "border"] },
      { key: "theme_input_bg", aliases: ["theme_input_bg", "inputBg"] },
      { key: "theme_header_gradient_start", aliases: ["theme_header_gradient_start", "headerGradientStart"] },
      { key: "theme_header_gradient_end", aliases: ["theme_header_gradient_end", "headerGradientEnd"] },
      { key: "theme_bottom_nav", aliases: ["theme_bottom_nav", "bottomNav"] },
      { key: "theme_bottom_nav_active", aliases: ["theme_bottom_nav_active", "bottomNavActive"] },
      { key: "theme_sidebar_bg", aliases: ["theme_sidebar_bg", "sidebar"] },
      { key: "theme_padding", aliases: ["theme_padding", "padding"] },
      { key: "theme_heading_size", aliases: ["theme_heading_size", "headingSize"] },
      { key: "theme_logo_url", aliases: ["theme_logo_url", "logoUrl", "brand_logo_url"] },
      { key: "theme_logo_text_color", aliases: ["theme_logo_text_color", "logoTextColor"] },

      // Balance
      { key: "balance_gradient_start", aliases: ["balance_gradient_start", "balanceGradientStart"] },
      { key: "balance_gradient_mid", aliases: ["balance_gradient_mid", "balanceGradientMid"] },
      { key: "balance_gradient_end", aliases: ["balance_gradient_end", "balanceGradientEnd"] },
      { key: "balance_text_color", aliases: ["balance_text_color", "balanceTextColor"] },
      { key: "balance_subtext_color", aliases: ["balance_subtext_color", "balanceSubtextColor"] },
      { key: "balance_badge_color", aliases: ["balance_badge_color", "balanceBadgeColor"] },
      { key: "balance_currency_color", aliases: ["balance_currency_color", "balanceCurrencyColor"] },
      { key: "balance_radius", aliases: ["balance_radius", "balanceRadius"] },
      { key: "balance_padding", aliases: ["balance_padding", "balancePadding"] },
      { key: "balance_amount_size", aliases: ["balance_amount_size", "balanceAmountSize"] },
      { key: "balance_label_size", aliases: ["balance_label_size", "balanceLabelSize"] },
      { key: "balance_shadow", aliases: ["balance_shadow", "balanceShadow"] },
      { key: "balance_glow_enabled", aliases: ["balance_glow_enabled", "balanceGlowEnabled"] },
      { key: "balance_glow_color", aliases: ["balance_glow_color", "balanceGlowColor"] },
    ];

    for (const mapping of sectionMappings) {
      for (const alias of mapping.aliases) {
        if (body[alias] !== undefined && body[alias] !== null && String(body[alias]).trim() !== "") {
          updates.push({ key: mapping.key, value: String(body[alias]).trim() });
          break;
        }
      }
    }

    // Save all to database
    for (const item of updates) {
      await db
        .insert(settingsTable)
        .values({ key: item.key, value: item.value })
        .onConflictDoUpdate({ target: settingsTable.key, set: { value: item.value } });
    }

    console.log(`[API /admin/theme-settings] Successfully updated ${updates.length} theme properties:`, updates.map((u) => u.key));
    res.json({ ok: true, success: true, updated: updates });
  } catch (err: any) {
    console.error("[API /admin/theme-settings] Error saving theme settings:", err);
    res.status(500).json({ error: err?.message || "Failed to update theme settings" });
  }
});

router.get("/app-settings", async (_req, res) => {
  const rows = await db.select().from(settingsTable);
  const map = new Map(rows.map((row) => [row.key, row.value]));

  const getBool = (key: string, fallback = false) => {
    const value = map.get(key);
    if (typeof value === "boolean") return value;
    if (typeof value === "string") return value === "true";
    return fallback;
  };

  const defaultAboutTitle = "من نحن - متجر ShadXMini";
  const defaultAboutContent =
    "متجر ShadXMini هو وجهتك الرقمية الموثوقة لشحن الألعاب، اشتراكات البرامج، البطاقات الرقمية، والخدمات المالية المباشرة. نحرص على تقديم أعلى سرعة تنفيذ وأعلى معايير الأمان وخدمة عملاء على مدار الساعة.";

  const defaultContactPhone = "+963900000000";
  const defaultContactEmail = "support@shadxmini.com";
  const defaultContactTelegram = "@ShadXMiniSupport";

  const defaultMaintenanceTitle = "الموقع قيد الصيانة المؤقتة";
  const defaultMaintenanceMessage =
    "نعمل حاليًّا على تنفيذ مجموعة من أعمال الصيانة والتحديث لتحسين أداء الموقع، وتعزيز مستوى الأمان، وتطوير تجربة المستخدم بشكل أفضل. نعتذر عن أي إزعاج قد يسببه ذلك، ونرجو منكم التفضل بالعودة لاحقًا.";

  res.json({
    maintenanceMode: getBool("maintenance_mode"),
    maintenanceTitle: String(map.get("maintenance_title") || defaultMaintenanceTitle),
    maintenanceMessage: String(map.get("maintenance_message") || defaultMaintenanceMessage),
    maintenanceIcon: String(map.get("maintenance_icon") || "Wrench"),
    maintenanceContactEnabled: getBool("maintenance_contact_enabled", true),
    maintenanceContactText: String(map.get("maintenance_contact_text") || "تواصل معنا"),
    maintenanceContactUrl: String(map.get("maintenance_contact_url") || "/support"),
    maintenanceEstimatedTime: String(map.get("maintenance_estimated_time") || ""),
    popupEnabled: getBool("store_popup_enabled"),
    popupMessage: String(map.get("store_popup_message") || ""),
    popupLinkText: String(map.get("store_popup_link_text") || ""),
    popupLinkUrl: String(map.get("store_popup_link_url") || ""),
    adminLoginImage: String(map.get("admin_login_image") || ""),
    brandLogoUrl: String(map.get("brand_logo_url") || map.get("site_logo") || ""),
    brand_logo_url: String(map.get("brand_logo_url") || map.get("site_logo") || ""),
    siteLogo: String(map.get("brand_logo_url") || map.get("site_logo") || ""),
    site_logo: String(map.get("brand_logo_url") || map.get("site_logo") || ""),
    siteName: String(map.get("site_name") || "ShadMini"),
    site_name: String(map.get("site_name") || "ShadMini"),
    theme_logo_size: String(map.get("theme_logo_size") || map.get("logo_size") || "80px").trim(),
    logoSize: String(map.get("theme_logo_size") || map.get("logo_size") || "80px").trim(),
    admin_login_title: String(map.get("admin_login_title") || "ShadMini"),
    adminLoginTitle: String(map.get("admin_login_title") || "ShadMini"),
    admin_login_subtitle: String(map.get("admin_login_subtitle") || "لوحة الإدارة الفاخرة"),
    adminLoginSubtitle: String(map.get("admin_login_subtitle") || "لوحة الإدارة الفاخرة"),
    admin_dashboard_welcome: String(map.get("admin_dashboard_welcome") || "مرحبًا بك في لوحة إدارة ShadMini"),
    adminDashboardWelcome: String(map.get("admin_dashboard_welcome") || "مرحبًا بك في لوحة إدارة ShadMini"),
    
    // Dynamic About & Contact Info
    aboutTitle: String(map.get("about_us_title") || defaultAboutTitle),
    aboutContent: String(map.get("about_us_content") || defaultAboutContent),
    contactPhone: String(map.get("support_phone") || map.get("contact_support_phone") || defaultContactPhone),
    contactEmail: String(map.get("support_email") || map.get("contact_support_email") || defaultContactEmail),
    contactTelegram: String(map.get("support_telegram") || map.get("contact_support_telegram") || defaultContactTelegram),
    contactWhatsapp: String(map.get("support_whatsapp") || map.get("contact_support_phone") || defaultContactPhone),
    support_whatsapp: String(map.get("support_whatsapp") || map.get("contact_support_phone") || defaultContactPhone),
    support_telegram: String(map.get("support_telegram") || map.get("contact_support_telegram") || defaultContactTelegram),
    support_email: String(map.get("support_email") || map.get("contact_support_email") || defaultContactEmail),
    support_phone: String(map.get("support_phone") || map.get("contact_support_phone") || defaultContactPhone),

    // Guest Preview Mode Settings
    guestPreviewEnabled: getBool("guest_preview_enabled", true),
    guest_preview_enabled: getBool("guest_preview_enabled", true),
    guestPreviewTitle: String(map.get("guest_preview_title") || "مرحباً بك في ShadMini"),
    guest_preview_title: String(map.get("guest_preview_title") || "مرحباً بك في ShadMini"),
    guestPreviewSubtitle: String(map.get("guest_preview_subtitle") || "استعرض الأقسام الآن، وسجّل دخولك للاستفادة من كل المزايا"),
    guest_preview_subtitle: String(map.get("guest_preview_subtitle") || "استعرض الأقسام الآن، وسجّل دخولك للاستفادة من كل المزايا"),
    guestPreviewLoginButton: String(map.get("guest_preview_login_button") || "تسجيل الدخول"),
    guest_preview_login_button: String(map.get("guest_preview_login_button") || "تسجيل الدخول"),
    guestPreviewRegisterButton: String(map.get("guest_preview_register_button") || "إنشاء حساب جديد"),
    guest_preview_register_button: String(map.get("guest_preview_register_button") || "إنشاء حساب جديد"),
    guestPreviewNote: String(map.get("guest_preview_note") || "لا يمكنك الشراء أو استخدام المتجر بدون حساب. اضغط على أي قسم أو منتج للتسجيل."),
    guest_preview_note: String(map.get("guest_preview_note") || "لا يمكنك الشراء أو استخدام المتجر بدون حساب. اضغط على أي قسم أو منتج للتسجيل."),
  });
});

const getPublicSettingsHandler = async (_req: any, res: any) => {
  const rows = await db.select().from(settingsTable);
  const map = new Map(rows.map((row) => [row.key, row.value]));
  const logo = String(map.get("brand_logo_url") || map.get("site_logo") || "");
  const siteName = String(map.get("site_name") || "ShadMini");
  const adminLoginImage = String(map.get("admin_login_image") || "");

  const getBool = (key: string, fallback = false) => {
    const value = map.get(key);
    if (typeof value === "boolean") return value;
    if (typeof value === "string") return value === "true";
    return fallback;
  };

  const supportWhatsapp = String(map.get("support_whatsapp") || map.get("contact_support_phone") || "+963900000000");
  const supportTelegram = String(map.get("support_telegram") || map.get("contact_support_telegram") || "ShadMiniSupport");
  const supportEmail = String(map.get("support_email") || map.get("contact_support_email") || "support@shadmini.com");
  const supportPhone = String(map.get("support_phone") || map.get("contact_support_phone") || "+963900000000");

  res.json({
    brand_logo_url: logo,
    brandLogoUrl: logo,
    site_logo: logo,
    siteLogo: logo,
    site_name: siteName,
    siteName: siteName,
    theme_logo_size: String(map.get("theme_logo_size") || map.get("logo_size") || "80px").trim(),
    logoSize: String(map.get("theme_logo_size") || map.get("logo_size") || "80px").trim(),
    admin_login_image: adminLoginImage,
    adminLoginImage: adminLoginImage,
    admin_login_title: String(map.get("admin_login_title") || "ShadMini"),
    adminLoginTitle: String(map.get("admin_login_title") || "ShadMini"),
    admin_login_subtitle: String(map.get("admin_login_subtitle") || "لوحة الإدارة الفاخرة"),
    adminLoginSubtitle: String(map.get("admin_login_subtitle") || "لوحة الإدارة الفاخرة"),
    admin_dashboard_welcome: String(map.get("admin_dashboard_welcome") || "مرحبًا بك في لوحة إدارة ShadMini"),
    adminDashboardWelcome: String(map.get("admin_dashboard_welcome") || "مرحبًا بك في لوحة إدارة ShadMini"),
    news_ticker_speed: Number(map.get("news_ticker_speed") || 15),
    support_whatsapp: supportWhatsapp,
    support_telegram: supportTelegram,
    support_email: supportEmail,
    support_phone: supportPhone,
    contact_whatsapp: supportWhatsapp,
    contact_telegram: supportTelegram,
    contact_email: supportEmail,
    contact_phone: supportPhone,
    use_legacy_auth_pages: map.get("use_legacy_auth_pages") === "true",
    useLegacyAuthPages: map.get("use_legacy_auth_pages") === "true",

    // Guest Preview Mode Settings
    guestPreviewEnabled: getBool("guest_preview_enabled", true),
    guest_preview_enabled: getBool("guest_preview_enabled", true),
    guestPreviewTitle: String(map.get("guest_preview_title") || "مرحباً بك في ShadMini"),
    guest_preview_title: String(map.get("guest_preview_title") || "مرحباً بك في ShadMini"),
    guestPreviewSubtitle: String(map.get("guest_preview_subtitle") || "استعرض الأقسام الآن، وسجّل دخولك للاستفادة من كل المزايا"),
    guest_preview_subtitle: String(map.get("guest_preview_subtitle") || "استعرض الأقسام الآن، وسجّل دخولك للاستفادة من كل المزايا"),
    guestPreviewLoginButton: String(map.get("guest_preview_login_button") || "تسجيل الدخول"),
    guest_preview_login_button: String(map.get("guest_preview_login_button") || "تسجيل الدخول"),
    guestPreviewRegisterButton: String(map.get("guest_preview_register_button") || "إنشاء حساب جديد"),
    guest_preview_register_button: String(map.get("guest_preview_register_button") || "إنشاء حساب جديد"),
    guestPreviewNote: String(map.get("guest_preview_note") || "لا يمكنك الشراء أو استخدام المتجر بدون حساب. اضغط على أي قسم أو منتج للتسجيل."),
    guest_preview_note: String(map.get("guest_preview_note") || "لا يمكنك الشراء أو استخدام المتجر بدون حساب. اضغط على أي قسم أو منتج للتسجيل."),

    // Currency Settings (Public)
    base_currency: String(map.get("base_currency") || map.get("primary_currency") || "USD"),
    baseCurrency: String(map.get("base_currency") || map.get("primary_currency") || "USD"),
    currency_symbol: String(map.get("currency_symbol") || "$"),
    currencySymbol: String(map.get("currency_symbol") || "$"),
    usd_to_syp: Number(map.get("usd_to_syp") || map.get("exchange_rate") || 15000),
    usdToSyp: Number(map.get("usd_to_syp") || map.get("exchange_rate") || 15000),
    usd_to_try: Number(map.get("usd_to_try") || 34.5),
    usdToTry: Number(map.get("usd_to_try") || 34.5),
    usd_to_eur: Number(map.get("usd_to_eur") || 0.92),
    usdToEur: Number(map.get("usd_to_eur") || 0.92),
    usd_to_sar: Number(map.get("usd_to_sar") || 3.75),
    usdToSar: Number(map.get("usd_to_sar") || 3.75),
    show_both_currencies: map.get("show_both_currencies") !== undefined ? getBool("show_both_currencies", true) : true,
    showBothCurrencies: map.get("show_both_currencies") !== undefined ? getBool("show_both_currencies", true) : true,
    show_price_in_both: map.get("show_both_currencies") !== undefined ? getBool("show_both_currencies", true) : true,
    currency_decimals: Number(map.get("currency_decimals") || 2),
    currencyDecimals: Number(map.get("currency_decimals") || 2),
    thousands_separator: String(map.get("thousands_separator") || ","),
    thousandsSeparator: String(map.get("thousands_separator") || ","),
    decimal_separator: String(map.get("decimal_separator") || "."),
    decimalSeparator: String(map.get("decimal_separator") || "."),
  });
};

const getPublicCurrencySettingsHandler = async (_req: any, res: any) => {
  try {
    const rows = await db.select().from(settingsTable);
    const map = new Map(rows.map((row) => [row.key, row.value]));
    
    // Check if there is an aggregated currency_settings json object stored
    const aggregatedObj = map.get("currency_settings");
    const agg = aggregatedObj && typeof aggregatedObj === "object" ? aggregatedObj : {};

    const baseCurrency = String(map.get("base_currency") || map.get("primary_currency") || (agg as any).storeCurrency || (agg as any).baseCurrency || "USD");
    const currencySymbol = String(map.get("currency_symbol") || (agg as any).currencySymbol || (baseCurrency === "SYP" ? "ل.س" : "$"));
    const usdToSyp = Number(map.get("usd_to_syp") || map.get("exchange_rate") || (agg as any).usdToSyp || (agg as any).exchangeRate || 15000);
    const usdToTry = Number(map.get("usd_to_try") || (agg as any).usdToTry || 34.5);
    const usdToEur = Number(map.get("usd_to_eur") || (agg as any).usdToEur || 0.92);
    const usdToSar = Number(map.get("usd_to_sar") || (agg as any).usdToSar || 3.75);

    const getBool = (key: string, fallback = false) => {
      const value = map.get(key);
      if (typeof value === "boolean") return value;
      if (typeof value === "string") return value === "true";
      return fallback;
    };

    const showBothCurrencies = map.get("show_both_currencies") !== undefined
      ? getBool("show_both_currencies", true)
      : (agg as any).showBothCurrencies !== undefined
      ? Boolean((agg as any).showBothCurrencies)
      : true;

    const decimals = Number(map.get("currency_decimals") ?? (agg as any).decimals ?? (agg as any).currencyDecimals ?? 2);
    const thousandsSeparator = String(map.get("thousands_separator") || (agg as any).thousandsSeparator || ",");
    const decimalSeparator = String(map.get("decimal_separator") || (agg as any).decimalSeparator || ".");

    res.json({
      baseCurrency,
      base_currency: baseCurrency,
      currencySymbol,
      currency_symbol: currencySymbol,
      usdToSyp,
      usd_to_syp: usdToSyp,
      usdToTry,
      usd_to_try: usdToTry,
      usdToEur,
      usd_to_eur: usdToEur,
      usdToSar,
      usd_to_sar: usdToSar,
      showBothCurrencies,
      show_both_currencies: showBothCurrencies,
      decimals,
      currencyDecimals: decimals,
      currency_decimals: decimals,
      thousandsSeparator,
      thousands_separator: thousandsSeparator,
      decimalSeparator,
      decimal_separator: decimalSeparator,
      exchangeRate: usdToSyp,
      exchange_rate: usdToSyp,
    });
  } catch (err: any) {
    res.json({
      baseCurrency: "USD",
      base_currency: "USD",
      currencySymbol: "$",
      currency_symbol: "$",
      usdToSyp: 15000,
      usd_to_syp: 15000,
      usdToTry: 34.5,
      usdToEur: 0.92,
      usdToSar: 3.75,
      showBothCurrencies: true,
      show_both_currencies: true,
      decimals: 2,
      currencyDecimals: 2,
      currency_decimals: 2,
      thousandsSeparator: ",",
      thousands_separator: ",",
      decimalSeparator: ".",
      decimal_separator: ".",
      exchangeRate: 15000,
      exchange_rate: 15000,
    });
  }
};

router.get("/settings/public", getPublicSettingsHandler);
router.get("/public-settings", getPublicSettingsHandler);
router.get("/public/app-settings", getPublicSettingsHandler);
router.get("/app-settings", getPublicSettingsHandler);
router.get("/public/currency-settings", getPublicCurrencySettingsHandler);
router.get("/currency-settings", getPublicCurrencySettingsHandler);
router.get("/currency/settings", getPublicCurrencySettingsHandler);

// Public Contact Page Config Endpoints
const DEFAULT_PUBLIC_CONTACT_CONFIG = {
  title: "تواصل معنا",
  subtitle: "نحن هنا لمساعدتك. تواصل معنا عبر أي من القنوات التالية",
  channels: [
    {
      id: "whatsapp",
      name: "واتساب",
      icon: "MessageCircle",
      value: "+963900000000",
      link: "https://wa.me/963900000000",
      color: "#25D366",
      active: true,
      order: 1
    },
    {
      id: "telegram",
      name: "تليجرام",
      icon: "Send",
      value: "@ShadXMiniSupport",
      link: "https://t.me/ShadXMiniSupport",
      color: "#0088CC",
      active: true,
      order: 2
    },
    {
      id: "email",
      name: "البريد الإلكتروني",
      icon: "Mail",
      value: "support@shadxmini.com",
      link: "mailto:support@shadxmini.com",
      color: "#C8A45C",
      active: true,
      order: 3
    },
    {
      id: "phone",
      name: "الهاتف",
      icon: "Phone",
      value: "+963 900 000 000",
      link: "tel:+963900000000",
      color: "#3B82F6",
      active: true,
      order: 4
    }
  ],
  sections: {
    channels: { visible: true, title: "قنوات التواصل" },
    form: { visible: true, title: "أرسل لنا رسالة", subtitle: "أو أرسل لنا رسالة مباشرة" },
    faq: { visible: true, title: "الأسئلة الشائعة" },
    map: { visible: false, title: "موقعنا", embed_url: "" }
  },
  form_fields: {
    name: { visible: true, label: "الاسم الكامل", placeholder: "أدخل اسمك الكامل", required: true },
    email: { visible: true, label: "البريد الإلكتروني", placeholder: "أدخل بريدك الإلكتروني", required: true },
    subject: { visible: true, label: "الموضوع", placeholder: "اختر الموضوع", required: true, options: ["استفسار عام", "مشكلة تقنية", "اقتراح", "شكوى", "أخرى"] },
    message: { visible: true, label: "الرسالة", placeholder: "اكتب رسالتك هنا...", required: true }
  },
  faq: [
    { id: "faq1", question: "كيف يمكنني شحن رصيدي؟", answer: "يمكنك شحن رصيدك من خلال صفحة المحفظة باستخدام طرق الدفع المتاحة.", order: 1 },
    { id: "faq2", question: "ما هي مدة معالجة الطلبات؟", answer: "يتم معالجة الطلبات عادة خلال دقائق، وقد تستغرق بعض الطلبات حتى 24 ساعة.", order: 2 },
    { id: "faq3", question: "كيف أتوثيق حسابي؟", answer: "يمكنك توثيق حسابك من خلال صفحة توثيق الهوية في القائمة الجانبية.", order: 3 }
  ],
  styles: {
    bg_color: "",
    card_bg: "",
    title_color: "",
    text_color: "",
    border_color: ""
  }
};

const getPublicContactConfigHandler = async (_req: any, res: any) => {
  try {
    const rows = await db.select().from(settingsTable);
    const map = new Map(rows.map((row) => [row.key, row.value]));

    let config = map.get("contact_page_config");
    if (!config) {
      config = DEFAULT_PUBLIC_CONTACT_CONFIG;
    } else if (typeof config === "string") {
      try { config = JSON.parse(config); } catch { config = DEFAULT_PUBLIC_CONTACT_CONFIG; }
    }

    if (config && config.styles && typeof config.styles === "object") {
      const sanitizedStyles: Record<string, string> = { ...config.styles };
      for (const [key, val] of Object.entries(sanitizedStyles)) {
        if (typeof val === "string" && DEFAULT_VALUES_TO_REJECT.includes(val.trim().toLowerCase())) {
          sanitizedStyles[key] = "";
        }
      }
      config = {
        ...config,
        styles: sanitizedStyles
      };
    }

    const legacyRaw = map.get("use_legacy_contact_page");
    const useLegacy = legacyRaw === true || legacyRaw === "true";

    res.json({
      success: true,
      use_legacy_contact_page: useLegacy,
      useLegacy,
      ...config,
      config,
    });
  } catch (err: any) {
    res.status(500).json({ error: err?.message || "فشل جلب إعدادات صفحة التواصل" });
  }
};

router.get("/public/contact-config", getPublicContactConfigHandler);
router.get("/contact-config", getPublicContactConfigHandler);

const contactRateLimit = rateLimit({
  windowMs: 10 * 60 * 1000,
  max: 5,
  keyPrefix: "contact_msg",
  message: "تم تجاوز عدد الرسائل المسموح بإرسالها. يرجى الانتظار 10 دقائق والمحاولة لاحقاً.",
});

// POST /api/public/contact-messages & /api/contact-messages
const handleCreateContactMessage = async (req: any, res: any) => {
  try {
    const { name, email, subject, message } = req.body || {};

    const trimName = String(name || "").trim();
    const trimEmail = String(email || "").trim();
    const trimSubject = String(subject || "").trim();
    const trimMessage = String(message || "").trim();

    if (!trimName || trimName.length < 2 || trimName.length > 100) {
      return res.status(400).json({ error: "الاسم الكامل يجب أن يتراوح بين حرفين و 100 حرف" });
    }
    if (!trimEmail || trimEmail.length > 150 || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(trimEmail)) {
      return res.status(400).json({ error: "البريد الإلكتروني غير صالح (الحد الأقصى 150 حرف)" });
    }
    if (!trimSubject || trimSubject.length < 3 || trimSubject.length > 200) {
      return res.status(400).json({ error: "الموضوع يجب أن يتراوح بين 3 أحرف و 200 حرف" });
    }
    if (!trimMessage || trimMessage.length < 5 || trimMessage.length > 3000) {
      return res.status(400).json({ error: "الرسالة يجب أن تتراوح بين 5 أحرف و 3000 حرف" });
    }

    let userId: number | null = null;
    try {
      const user = await getOrCreateCurrentUser(req);
      if (user?.id) userId = user.id;
    } catch {
      // Guest
    }

    const inserted: any = await db.execute(sql`
      INSERT INTO contact_messages (user_id, name, email, subject, message, status)
      VALUES (${userId}, ${trimName}, ${trimEmail}, ${trimSubject}, ${trimMessage}, 'new')
      RETURNING *
    `);

    const row = inserted?.rows?.[0] || inserted?.[0] || { id: 1 };
    res.json({
      ok: true,
      message: "تم استلام رسالتك بنجاح! سنقوم بالتواصل معك في أقرب وقت.",
      data: row,
    });
  } catch (error: any) {
    console.error("Save contact message error:", error);
    res.status(500).json({ error: error.message || "فشل إرسال الرسالة، يرجى المحاولة لاحقاً" });
  }
};

router.post("/public/contact-messages", contactRateLimit, handleCreateContactMessage);
router.post("/contact-messages", contactRateLimit, handleCreateContactMessage);
router.post("/contact", contactRateLimit, handleCreateContactMessage);

const getPopupSettingsHandler = async (_req: any, res: any) => {
  const rows = await db.select().from(settingsTable);
  const map = new Map(rows.map((r) => [r.key, r.value]));
  
  const getBool = (key: string, fallback = false) => {
    const v = map.get(key);
    if (typeof v === "boolean") return v;
    if (typeof v === "string") return v === "true";
    return fallback;
  };

  res.json({
    popupEnabled: getBool("popup_enabled", false),
    popupTitle: String(map.get("popup_title") || "مجتمع الواتس أب"),
    popupContent: String(map.get("popup_content") || "انضم إلى مجتمع الواتس أب للاطلاع على كل جديد والخصومات الحصرية."),
    popupImage: String(map.get("popup_image") || ""),
    popupLinkUrl: String(map.get("popup_link_url") || ""),
    popupLinkText: String(map.get("popup_link_text") || "انضم الآن"),
    popupButtonCloseText: String(map.get("popup_button_close_text") || "إغلاق الكل"),
    popupButtonReadText: String(map.get("popup_button_read_text") || "قراءة الكل"),
    popupButtonViewText: String(map.get("popup_button_view_text") || "عرض الكل"),
    popupShowOnlyOnce: getBool("popup_show_only_once", true),
  });
};

router.get("/public/popup-settings", getPopupSettingsHandler);
router.get("/popup-settings", getPopupSettingsHandler);

const getPublicMaintenanceHandler = async (_req: any, res: any) => {
  const rows = await db.select().from(settingsTable);
  const map = new Map(rows.map((r) => [r.key, r.value]));
  const getBool = (key: string, fallback = false) => {
    const v = map.get(key);
    if (typeof v === "boolean") return v;
    if (typeof v === "string") return v === "true";
    return fallback;
  };
  res.json({
    maintenanceMode: getBool("maintenance_mode", false),
    maintenanceTitle: String(map.get("maintenance_title") || "الموقع قيد الصيانة المؤقتة"),
    maintenanceMessage: String(map.get("maintenance_message") || "نعمل حاليًّا على تنفيذ مجموعة من أعمال الصيانة والتحديث لتحسين أداء الموقع."),
    maintenanceIcon: String(map.get("maintenance_icon") || "Wrench"),
    maintenanceContactEnabled: getBool("maintenance_contact_enabled", true),
    maintenanceContactText: String(map.get("maintenance_contact_text") || "تواصل معنا"),
    maintenanceContactUrl: String(map.get("maintenance_contact_url") || "/support"),
    maintenanceEstimatedTime: String(map.get("maintenance_estimated_time") || ""),
  });
};

router.get("/public/maintenance-settings", getPublicMaintenanceHandler);
router.get("/maintenance-settings", getPublicMaintenanceHandler);

// Public Auth Pages (Login / Register) Config Endpoints
const DEFAULT_STORE_AUTH_CONFIG = {
  login: {
    title: "تسجيل الدخول",
    subtitle: "مرحباً بك مجدداً",
    branding: {
      title: "أهلاً بعودتك!",
      subtitle: "سجل دخولك للوصول إلى حسابك وخدماتك",
      icon: "LogIn",
      benefits: [
        { icon: "Shield", text: "حساب آمن ومحمي" },
        { icon: "Zap", text: "خدمات سريعة وموثوقة" },
        { icon: "Headphones", text: "دعم فني على مدار الساعة" },
      ],
    },
    fields: {
      usernameLabel: "اسم المستخدم أو البريد الإلكتروني",
      usernamePlaceholder: "أدخل اسم المستخدم أو البريد",
      passwordLabel: "كلمة المرور",
      passwordPlaceholder: "أدخل كلمة المرور",
      showForgotPassword: true,
      forgotPasswordText: "نسيت كلمة السر؟",
      submitButtonText: "تسجيل الدخول",
      switchToRegisterText: "ليس لديك حساب؟",
      switchToRegisterLink: "إنشاء حساب جديد",
    },
    showGoogleButton: true,
    googleButtonText: "تسجيل الدخول بحساب Google",
    showDivider: true,
    dividerText: "أو",
  },
  register: {
    title: "إنشاء حساب جديد",
    subtitle: "انضم إلينا الآن",
    branding: {
      title: "انضم إلينا",
      subtitle: "أنشئ حسابك الآن وابدأ تجربتك",
      icon: "UserPlus",
      benefits: [
        { icon: "Package", text: "خدمات متنوعة وحصرية" },
        { icon: "ShieldCheck", text: "حساب آمن ومحمي" },
        { icon: "Zap", text: "تنفيذ فوري للطلبات" },
        { icon: "Headphones", text: "دعم فني على مدار الساعة" },
      ],
    },
    fields: {
      usernameLabel: "اسم المستخدم",
      usernamePlaceholder: "أدخل اسم المستخدم",
      usernameHint: "اختر اسم مستخدم فريد",
      passwordLabel: "كلمة المرور",
      passwordPlaceholder: "أدخل كلمة المرور",
      confirmPasswordLabel: "تأكيد كلمة المرور",
      confirmPasswordPlaceholder: "أعد إدخال كلمة المرور",
      emailLabel: "البريد الإلكتروني",
      emailPlaceholder: "example@email.com",
      submitButtonText: "إنشاء الحساب",
      switchToLoginText: "لديك حساب بالفعل؟",
      switchToLoginLink: "تسجيل الدخول",
    },
    passwordRequirements: {
      enabled: true,
      title: "متطلبات كلمة المرور",
      showMinLength: true,
      minLength: 8,
      showUppercase: true,
      uppercaseText: "حرف كبير (A-Z)",
      showLowercase: true,
      lowercaseText: "حرف صغير (a-z)",
      showNumber: true,
      numberText: "رقم واحد (0-9)",
      showSpecial: true,
      specialText: "رمز خاص (@#$%)",
    },
    emailVerification: {
      enabled: true,
      hintText: "سيتم إرسال رمز تحقق لتأكيد البريد الإلكتروني",
    },
    showGoogleButton: true,
    googleButtonText: "التسجيل بحساب Google",
    showDivider: true,
    dividerText: "أو",
  },
  common: {
    backToHomeText: "العودة للصفحة الرئيسية",
    styles: {
      titleColor: "#C8A45C",
      subtitleColor: "#9CA3AF",
      labelColor: "#E5E7EB",
      inputTextColor: "#FFFFFF",
      inputBgColor: "#3D3D3D",
      inputBorderColor: "#4B5563",
      inputFocusBorderColor: "#C8A45C",
      buttonBgColor: "#C8A45C",
      buttonTextColor: "#1A1A1A",
      buttonHoverColor: "#B8954A",
      brandingBgColor: "#C8A45C",
      brandingTextColor: "#FFFFFF",
      brandingIconColor: "#FFFFFF",
    },
  },
};

const getPublicAuthPagesConfigHandler = async (_req: any, res: any) => {
  try {
    const rows = await db.select().from(settingsTable);
    const map = new Map(rows.map((r) => [r.key, r.value]));

    let config = map.get("auth_pages_config");
    if (typeof config === "string") {
      try {
        config = JSON.parse(config);
      } catch {
        config = null;
      }
    }

    const mergedConfig = {
      login: {
        ...DEFAULT_STORE_AUTH_CONFIG.login,
        ...(config?.login || {}),
        branding: {
          ...DEFAULT_STORE_AUTH_CONFIG.login.branding,
          ...(config?.login?.branding || {}),
          benefits: Array.isArray(config?.login?.branding?.benefits)
            ? config.login.branding.benefits
            : DEFAULT_STORE_AUTH_CONFIG.login.branding.benefits,
        },
        fields: {
          ...DEFAULT_STORE_AUTH_CONFIG.login.fields,
          ...(config?.login?.fields || {}),
        },
      },
      register: {
        ...DEFAULT_STORE_AUTH_CONFIG.register,
        ...(config?.register || {}),
        branding: {
          ...DEFAULT_STORE_AUTH_CONFIG.register.branding,
          ...(config?.register?.branding || {}),
          benefits: Array.isArray(config?.register?.branding?.benefits)
            ? config.register.branding.benefits
            : DEFAULT_STORE_AUTH_CONFIG.register.branding.benefits,
        },
        fields: {
          ...DEFAULT_STORE_AUTH_CONFIG.register.fields,
          ...(config?.register?.fields || {}),
        },
        passwordRequirements: {
          ...DEFAULT_STORE_AUTH_CONFIG.register.passwordRequirements,
          ...(config?.register?.passwordRequirements || {}),
        },
        emailVerification: {
          ...DEFAULT_STORE_AUTH_CONFIG.register.emailVerification,
          ...(config?.register?.emailVerification || {}),
        },
      },
      common: {
        ...DEFAULT_STORE_AUTH_CONFIG.common,
        ...(config?.common || {}),
        styles: {
          ...DEFAULT_STORE_AUTH_CONFIG.common.styles,
          ...(config?.common?.styles || {}),
        },
      },
    };

    const useLegacy = map.get("use_legacy_auth_pages") === "true" || map.get("use_legacy_auth_pages") === true;

    res.json({
      success: true,
      config: mergedConfig,
      use_legacy_auth_pages: useLegacy,
      useLegacyAuthPages: useLegacy,
    });
  } catch (err: any) {
    console.error("[Get Public Auth Pages Config Error]:", err);
    res.status(500).json({ error: "فشل جلب إعدادات صفحات الدخول والتسجيل" });
  }
};

router.get("/public/auth-pages-config", getPublicAuthPagesConfigHandler);
router.get("/auth-pages-config", getPublicAuthPagesConfigHandler);
router.get("/api/public/auth-pages-config", getPublicAuthPagesConfigHandler);

const DEFAULT_SHAMCASH_PUBLIC_SETTINGS = {
  wallet_address: "",
  qr_image_url: "",
  qr_size: 280,
  show_qr: true,
  instructions: "يرجى التحويل إلى عنوان المحفظة ثم إدخال رقم العملية للتأكيد الفوري.",
  min_amount: 1,
  page_bg: "#1A1A1A",
  card_bg: "#2D2D2D",
  text_color: "#FFFFFF",
  button_bg: "#C8A45C",
  border_color: "rgba(200, 164, 92, 0.25)",
  input_bg: "#3D3D3D",
};

const getPublicShamCashSettingsHandler = async (_req: any, res: any) => {
  try {
    const rows = await db.select().from(settingsTable).where(eq(settingsTable.key, "shamcash_settings"));
    let storedConfig: any = null;
    if (rows && rows.length > 0 && rows[0].value) {
      storedConfig = typeof rows[0].value === "string" ? JSON.parse(rows[0].value) : rows[0].value;
    }

    const pm = await db.select().from(paymentMethodsTable).where(eq(paymentMethodsTable.code, "sham_cash"));
    const pmData = pm && pm.length > 0 ? pm[0] : null;

    const pmWallet = pmData?.walletAddress && pmData.walletAddress !== "35147b5811bdc0bf07fdb11b85c8a5d" ? pmData.walletAddress : "";

    const config = {
      ...DEFAULT_SHAMCASH_PUBLIC_SETTINGS,
      wallet_address: storedConfig?.wallet_address ?? pmWallet,
      qr_image_url: storedConfig?.qr_image_url ?? pmData?.qrImage ?? "",
      instructions: storedConfig?.instructions ?? pmData?.instructions ?? DEFAULT_SHAMCASH_PUBLIC_SETTINGS.instructions,
      min_amount: storedConfig?.min_amount ?? (pmData?.minAmount ? Number(pmData.minAmount) : 1),
      show_qr: storedConfig?.show_qr ?? true,
      ...(storedConfig || {}),
    };

    res.json(config);
  } catch (err: any) {
    res.status(500).json({ error: "فشل جلب إعدادات شام كاش" });
  }
};

router.get("/public/shamcash-settings", getPublicShamCashSettingsHandler);
router.get("/shamcash-settings", getPublicShamCashSettingsHandler);
router.get("/api/public/shamcash-settings", getPublicShamCashSettingsHandler);

export default router;
