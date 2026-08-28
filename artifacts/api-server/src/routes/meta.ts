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

router.get("/theme", async (_req, res) => {
  const rows = await db.select().from(settingsTable);
  const map = new Map(rows.map((row) => [row.key, row.value]));

  const normalizeThemeColor = (key: string, fallback: string, legacyValues: string[] = []) => {
    const value = String(map.get(key) || fallback).trim();
    return legacyValues.includes(value.toLowerCase()) ? fallback : value;
  };

  res.json({
    primary: normalizeThemeColor("theme_primary", "#58E8FF", ["#0052cc"]),
    accent: normalizeThemeColor("theme_accent", "#D94CFF", ["#f97316"]),
    background: normalizeThemeColor("theme_bg", "#07091B", ["#0a1628"]),
    font: String(map.get("theme_font") || "Cairo"),
    radius: String(map.get("theme_radius") || "16"),
  });
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
    admin_login_image: adminLoginImage,
    adminLoginImage: adminLoginImage,
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

export default router;
