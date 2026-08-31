import { Router, type IRouter } from "express";
import { db, paymentMethodsTable, settingsTable, socialLinksTable } from "@workspace/db";
import { asc, eq } from "drizzle-orm";
import { ListPaymentMethodsResponse, ListSocialLinksResponse } from "@workspace/api-zod";

const router: IRouter = Router();

router.get("/payment-methods", async (_req, res) => {
  const rows = await db.select().from(paymentMethodsTable).where(eq(paymentMethodsTable.active, true));
  res.json(
    ListPaymentMethodsResponse.parse(
      rows.map((m) => ({
        id: String(m.id),
        code: m.code as "sham_cash" | "sham_cash_auto" | "binance_pay" | "syriatel_cash" | "mtn_cash" | "usdt_auto",
        name: m.name,
        subtitle: m.subtitle,
        instructions: m.instructions ?? undefined,
        walletAddress: m.walletAddress ?? undefined,
        logoImage: m.logoImage ?? undefined,
        qrImage: m.qrImage ?? undefined,
        minAmount: Number(m.minAmount),
        active: m.active,
      })),
    ),
  );
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
    contactPhone: String(map.get("contact_support_phone") || defaultContactPhone),
    contactEmail: String(map.get("contact_support_email") || defaultContactEmail),
    contactTelegram: String(map.get("contact_support_telegram") || defaultContactTelegram),
  });
});

const getPublicSettingsHandler = async (_req: any, res: any) => {
  const rows = await db.select().from(settingsTable);
  const map = new Map(rows.map((row) => [row.key, row.value]));
  const logo = String(map.get("brand_logo_url") || map.get("site_logo") || "");
  const siteName = String(map.get("site_name") || "ShadMini");
  const adminLoginImage = String(map.get("admin_login_image") || "");

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
  });
};

router.get("/settings/public", getPublicSettingsHandler);
router.get("/public-settings", getPublicSettingsHandler);

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

export default router;
