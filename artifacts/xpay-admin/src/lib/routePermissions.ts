export const ROUTE_PERMISSIONS: Record<string, string | null> = {
  "/": null,                                     // dashboard
  "/orders": "الطلبات",
  "/order-messages": "الطلبات",
  "/identity-verifications": "المستخدمون",
  "/tickets": "الطلبات",
  "/tickets/:id": "الطلبات",
  "/support": "الطلبات",
  "/categories": "الأقسام",
  "/product-groups": "المنتجات",
  "/products": "المنتجات",
  "/banners": "البانرات",
  "/promotions": "البانرات",
  "/api-products": "المزودون",
  "/providers": "المزودون",
  "/providers/:id/products": "المزودون",
  "/api-keys": "المزودون",
  "/provider-reports": "المزودون",
  "/auto-codes": "المنتجات",
  "/payment-methods": "طرق الدفع",
  "/deposits": "الإيداعات",
  "/coupons": "الكوبونات",
  "/vip": "VIP",
  "/currency": "الإعدادات",
  "/currencies": "الإعدادات",
  "/users": "المستخدمون",
  "/admins": "المشرفون",
  "/admin/admins": "المشرفون",
  "/permissions": "المشرفون",
  "/activity": "سجل النشاط",
  "/profile": null,
  "/interface-switcher": "الإعدادات",
  "/settings": "الإعدادات",
  "/theme": "الإعدادات",
  "/auth-pages-settings": "الإعدادات",
  "/auth-settings": "الإعدادات",
  "/product-page-settings": "الإعدادات",
  "/about-settings": "الإعدادات",
  "/contact-settings": "الإعدادات",
  "/deposit-settings": "الإعدادات",
  "/social-links": "الإعدادات",
  "/notifications": "الإشعارات",
  "/languages": "الإعدادات",
  "/news": "الأخبار",
  "/maintenance": "الإعدادات",
  "/reports": "الطلبات",
  "/backup": "النسخ الاحتياطي",
  "/cron-jobs": "الإعدادات",
  "/cron": "الإعدادات",
  "/cache": "الإعدادات",
};

/**
 * Resolves required section for a given path.
 * Supports dynamic segments (e.g., /tickets/123 -> /tickets/:id).
 */
export function resolveRequiredSection(pathname: string): string | null | undefined {
  // 1. Direct match
  if (pathname in ROUTE_PERMISSIONS) {
    return ROUTE_PERMISSIONS[pathname];
  }

  // 2. Dynamic segment match (longest prefix)
  const candidates = Object.keys(ROUTE_PERMISSIONS)
    .filter((k) => k.includes(":"))
    .map((k) => ({
      pattern: k,
      regex: new RegExp("^" + k.replace(/:[^/]+/g, "[^/]+") + "$"),
    }));

  for (const { pattern, regex } of candidates) {
    if (regex.test(pathname)) {
      return ROUTE_PERMISSIONS[pattern];
    }
  }

  // 3. Not classified -> undefined (means: allow, but log)
  return undefined;
}
