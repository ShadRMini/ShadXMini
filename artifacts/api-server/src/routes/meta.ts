import { Router, type IRouter } from "express";
import { db, paymentMethodsTable, settingsTable, socialLinksTable } from "@workspace/db";
import { asc, eq, sql } from "drizzle-orm";
import { ListPaymentMethodsResponse, ListSocialLinksResponse } from "@workspace/api-zod";
import { getOrCreateCurrentUser } from "../lib/currentUser.js";

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
    const themeTextPrimary = String(map.get("theme_text_primary") || "#FFFFFF").trim();
    const themeFontArabic = String(map.get("theme_font_arabic") || map.get("theme_font") || "Cairo").trim();
    const themeFontEnglish = String(map.get("theme_font_english") || "Inter").trim();
    const themeBorderRadius = String(map.get("theme_border_radius") || map.get("theme_radius") || "16").trim();
    const themeShadow = String(map.get("theme_shadow") || "medium").trim();
    const themeDefaultMode = String(map.get("theme_default_mode") || "dark").trim();
    const themeFontSize = String(map.get("theme_font_size") || "14").trim();
    const themeLogoSize = String(map.get("theme_logo_size") || map.get("logo_size") || "80px").trim();

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
      // Direct alias properties
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

router.put(["/admin/theme-settings", "/theme-settings"], async (req, res) => {
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
    bg_color: "#1A1A1A",
    card_bg: "#2D2D2D",
    title_color: "#C8A45C",
    text_color: "#E5E7EB",
    border_color: "#C8A45C"
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

// POST /api/public/contact-messages & /api/contact-messages
const handleCreateContactMessage = async (req: any, res: any) => {
  try {
    const { name, email, subject, message } = req.body || {};

    if (!name || typeof name !== "string" || !name.trim()) {
      return res.status(400).json({ error: "الاسم الكامل مطلوب" });
    }
    if (!email || typeof email !== "string" || !email.trim()) {
      return res.status(400).json({ error: "البريد الإلكتروني مطلوب" });
    }
    if (!subject || typeof subject !== "string" || !subject.trim()) {
      return res.status(400).json({ error: "الموضوع مطلوب" });
    }
    if (!message || typeof message !== "string" || message.trim().length < 5) {
      return res.status(400).json({ error: "الرسالة يجب أن تحتوي على 5 أحرف على الأقل" });
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
      VALUES (${userId}, ${name.trim()}, ${email.trim()}, ${subject.trim()}, ${message.trim()}, 'new')
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

router.post("/public/contact-messages", handleCreateContactMessage);
router.post("/contact-messages", handleCreateContactMessage);
router.post("/contact", handleCreateContactMessage);

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

export default router;
