import session from "express-session";
import type { RequestHandler, Request, Response, NextFunction } from "express";
import { db, settingsTable } from "@workspace/db";
import { eq } from "drizzle-orm";

const isProduction = process.env.NODE_ENV === "production";
const sessionSecret = process.env["SESSION_SECRET"] || "";

if (isProduction && (!sessionSecret || sessionSecret === "xpay-dev-secret")) {
  throw new Error("SESSION_SECRET must be configured with a strong value in production.");
}

declare module "express-session" {
  interface SessionData {
    adminId?: number;
    adminUsername?: string;
    adminRole?: string;
  }
}

export const sessionMiddleware: RequestHandler = session({
  secret: sessionSecret || "xpay-dev-secret",
  resave: false,
  saveUninitialized: false,
  cookie: {
    httpOnly: true,
    secure: isProduction,
    sameSite: isProduction ? "none" : "lax",
    maxAge: 1000 * 60 * 60 * 24 * 7,
  },
});

export function requireAdmin(req: Request, res: Response, next: NextFunction) {
  if (!req.session.adminId) {
    res.status(401).json({ error: "غير مصرح" });
    return;
  }
  next();
}

// ============================================================
// Permission Middleware — Task #89
// ============================================================

const PERMISSIONS_MATRIX_KEY = "admin_permissions_matrix";

/**
 * Cache for permissions matrix (invalidated on update).
 * TTL: 60 seconds — adequate for rare updates.
 */
let cachedMatrix: Record<string, Record<string, boolean>> | null = null;
let cacheTimestamp = 0;
const CACHE_TTL_MS = 60 * 1000;

export function invalidatePermissionsCache() {
  cachedMatrix = null;
  cacheTimestamp = 0;
}

export async function getPermissionsMatrix(): Promise<Record<string, Record<string, boolean>>> {
  const now = Date.now();
  if (cachedMatrix && now - cacheTimestamp < CACHE_TTL_MS) {
    return cachedMatrix;
  }
  
  const [row] = await db
    .select()
    .from(settingsTable)
    .where(eq(settingsTable.key, PERMISSIONS_MATRIX_KEY))
    .limit(1);
  
  cachedMatrix = (row?.value as Record<string, Record<string, boolean>>) || {};
  cacheTimestamp = now;
  return cachedMatrix;
}

/**
 * Resolves permissions for a given admin role and optional per-admin custom permissions.
 */
export async function getAdminPermissions(
  role: string,
  customPerms?: Record<string, boolean> | null
): Promise<{ allowedSections: string[]; permissionsMap: Record<string, boolean> }> {
  if (role === "super_admin") {
    const permissionsMap = Object.fromEntries(ADMIN_SECTIONS.map((sec) => [sec, true]));
    return { allowedSections: [...ADMIN_SECTIONS], permissionsMap };
  }

  const matrix = await getPermissionsMatrix();
  const rolePerms = matrix[role] || {};

  const permissionsMap: Record<string, boolean> = {};
  const allowedSections: string[] = [];

  for (const sec of ADMIN_SECTIONS) {
    let allowed = false;
    if (customPerms && typeof customPerms[sec] === "boolean") {
      allowed = customPerms[sec];
    } else {
      allowed = !!rolePerms[sec];
    }
    permissionsMap[sec] = allowed;
    if (allowed) {
      allowedSections.push(sec);
    }
  }

  return { allowedSections, permissionsMap };
}

/**
 * Middleware factory: requires a specific section permission.
 * @param section - One of the 16 Arabic section names
 */
export function requirePermission(section: string): RequestHandler {
  return async (req: Request, res: Response, next: NextFunction) => {
    // 1. Must be logged in
    if (!req.session.adminId) {
      res.status(401).json({ error: "غير مصرح" });
      return;
    }
    
    const role = req.session.adminRole || "admin";
    
    // 2. super_admin has full access
    if (role === "super_admin") {
      next();
      return;
    }
    
    try {
      // 3. Load matrix
      const matrix = await getPermissionsMatrix();
      const rolePerms = matrix[role] || {};
      
      // 4. Check permission
      if (!rolePerms[section]) {
        console.warn(
          `[Permission Denied] admin=${req.session.adminUsername} role=${role} section="${section}" path=${req.originalUrl}`
        );
        res.status(403).json({
          error: "لا تملك صلاحية الوصول لهذا القسم",
          code: "PERMISSION_DENIED",
          required: section,
          role,
        });
        return;
      }
      
      next();
    } catch (err: any) {
      console.error("[requirePermission] Error:", err);
      res.status(500).json({ error: "فشل التحقق من الصلاحيات" });
    }
  };
}

// ============================================================
// Route Classifier + Global Permission Middleware — Task #89
// ============================================================

export const ADMIN_SECTIONS = [
  "الطلبات",
  "الإيداعات",
  "المستخدمون",
  "الأقسام",
  "المنتجات",
  "طرق الدفع",
  "البانرات",
  "الأخبار",
  "المزودون",
  "الكوبونات",
  "VIP",
  "الإشعارات",
  "الإعدادات",
  "النسخ الاحتياطي",
  "المشرفون",
  "سجل النشاط",
] as const;

export type AdminSection = (typeof ADMIN_SECTIONS)[number];

/**
 * Normalizes an admin route URL path for classification.
 */
export function normalizeAdminPath(rawPath: string): string {
  if (!rawPath) return "/admin";
  let p = rawPath.split("?")[0].trim();
  if (p.startsWith("/api/")) {
    p = p.slice(4);
  } else if (p === "/api") {
    p = "/";
  }
  if (!p.startsWith("/")) {
    p = "/" + p;
  }
  if (!p.startsWith("/admin")) {
    p = "/admin" + p;
  }
  // Remove trailing slashes (except root)
  if (p.length > 1 && p.endsWith("/")) {
    p = p.replace(/\/+$/, "");
  }
  return p;
}

/**
 * Classifies an admin route path into one of the 16 permission sections,
 * or returns null for bypass/unprotected routes.
 */
export function classifyAdminRoute(path: string, body?: any): AdminSection | null {
  const p = normalizeAdminPath(path);

  // 1. Bypass routes (login, logout, me, dashboard, profile, 2FA)
  if (
    p === "/admin/login" ||
    p === "/admin/logout" ||
    p === "/admin/me" ||
    p === "/admin/status" ||
    p === "/admin/dashboard" ||
    p === "/admin/profile" ||
    p.startsWith("/admin/2fa")
  ) {
    return null;
  }

  // 2. Bulk delete dispatcher: maps resource to its section
  if (p === "/admin/bulk-delete" && body?.resource) {
    const res = String(body.resource).toLowerCase();
    if (res === "orders" || res === "tickets" || res === "order-messages") return "الطلبات";
    if (res === "deposits" || res === "shamcash") return "الإيداعات";
    if (res === "users" || res === "identity-verifications" || res === "api-keys") return "المستخدمون";
    if (res === "categories") return "الأقسام";
    if (res === "products" || res === "product-groups" || res === "auto-codes") return "المنتجات";
    if (res === "payment-methods") return "طرق الدفع";
    if (res === "banners") return "البانرات";
    if (res === "news") return "الأخبار";
    if (res === "providers") return "المزودون";
    if (res === "coupons") return "الكوبونات";
    if (res === "vip-memberships" || res === "vip") return "VIP";
    if (res === "notifications") return "الإشعارات";
    if (res === "social-links") return "الإعدادات";
    return "الإعدادات";
  }

  // 3. Section route matchers
  // VIP checks (explicit VIP routes or VIP actions on users)
  if (
    p === "/admin/vip-memberships" ||
    p.startsWith("/admin/vip-memberships/") ||
    p === "/admin/vip" ||
    p.startsWith("/admin/vip/") ||
    p.includes("/vip-level") ||
    p.includes("/vip-details")
  ) {
    return "VIP";
  }

  // الطلبات: orders, order-messages, tickets, reports
  if (
    p === "/admin/orders" ||
    p.startsWith("/admin/orders/") ||
    p === "/admin/order-messages" ||
    p.startsWith("/admin/order-messages/") ||
    p === "/admin/tickets" ||
    p.startsWith("/admin/tickets/") ||
    p === "/admin/reports" ||
    p.startsWith("/admin/reports/")
  ) {
    return "الطلبات";
  }

  // الإيداعات: deposits, shamcash
  if (
    p === "/admin/deposits" ||
    p.startsWith("/admin/deposits/") ||
    p === "/admin/shamcash" ||
    p.startsWith("/admin/shamcash/") ||
    p === "/admin/shamcash-orders" ||
    p.startsWith("/admin/shamcash-orders/")
  ) {
    return "الإيداعات";
  }

  // المستخدمون: users, identity-verifications, api-keys
  if (
    p === "/admin/users" ||
    p.startsWith("/admin/users/") ||
    p === "/admin/identity-verifications" ||
    p.startsWith("/admin/identity-verifications/") ||
    p === "/admin/api-keys" ||
    p.startsWith("/admin/api-keys/")
  ) {
    return "المستخدمون";
  }

  // الأقسام: categories
  if (p === "/admin/categories" || p.startsWith("/admin/categories/")) {
    return "الأقسام";
  }

  // المنتجات: products, product-groups, auto-codes, product-page-config, product-page-settings, product-changes-log, import-products
  if (
    p === "/admin/products" ||
    p.startsWith("/admin/products/") ||
    p === "/admin/product-groups" ||
    p.startsWith("/admin/product-groups/") ||
    p === "/admin/auto-codes" ||
    p.startsWith("/admin/auto-codes/") ||
    p === "/admin/product-page-config" ||
    p === "/admin/product-page-settings" ||
    p === "/admin/product-changes-log" ||
    p === "/admin/import-products"
  ) {
    return "المنتجات";
  }

  // طرق الدفع: payment-methods
  if (p === "/admin/payment-methods" || p.startsWith("/admin/payment-methods/")) {
    return "طرق الدفع";
  }

  // البانرات: banners
  if (p === "/admin/banners" || p.startsWith("/admin/banners/")) {
    return "البانرات";
  }

  // الأخبار: news
  if (p === "/admin/news" || p.startsWith("/admin/news/")) {
    return "الأخبار";
  }

  // المزودون: providers, provider-products, provider-reports
  if (
    p === "/admin/providers" ||
    p.startsWith("/admin/providers/") ||
    p === "/admin/provider-products" ||
    p.startsWith("/admin/provider-products/") ||
    p === "/admin/provider-reports" ||
    p.startsWith("/admin/provider-reports/")
  ) {
    return "المزودون";
  }

  // الكوبونات: coupons
  if (p === "/admin/coupons" || p.startsWith("/admin/coupons/")) {
    return "الكوبونات";
  }

  // الإشعارات: notifications, telegram
  if (
    p === "/admin/notifications" ||
    p.startsWith("/admin/notifications/") ||
    p === "/admin/telegram" ||
    p.startsWith("/admin/telegram/")
  ) {
    return "الإشعارات";
  }

  // المشرفون: admins, permissions
  if (
    p === "/admin/admins" ||
    p.startsWith("/admin/admins/") ||
    p === "/admin/permissions" ||
    p.startsWith("/admin/permissions/")
  ) {
    return "المشرفون";
  }

  // النسخ الاحتياطي: backup, import
  if (
    p === "/admin/backup" ||
    p.startsWith("/admin/backup/") ||
    p === "/admin/import" ||
    p.startsWith("/admin/import/")
  ) {
    return "النسخ الاحتياطي";
  }

  // سجل النشاط: activity, activity-log
  if (
    p === "/admin/activity" ||
    p.startsWith("/admin/activity/") ||
    p === "/admin/activity-log" ||
    p.startsWith("/admin/activity-log/")
  ) {
    return "سجل النشاط";
  }

  // الإعدادات: settings, social-links, theme-presets, theme-settings, currency-settings, maintenance-settings, shamcash-settings, popup-settings, about-config, contact-config, deposit-config, auth-pages-config, clear-cache, cron
  if (
    p === "/admin/settings" ||
    p.startsWith("/admin/settings/") ||
    p === "/admin/social-links" ||
    p.startsWith("/admin/social-links/") ||
    p === "/admin/theme-presets" ||
    p.startsWith("/admin/theme-presets/") ||
    p === "/admin/theme-settings" ||
    p.startsWith("/admin/theme-settings/") ||
    p === "/admin/currency-settings" ||
    p === "/admin/maintenance-settings" ||
    p === "/admin/shamcash-settings" ||
    p === "/admin/popup-settings" ||
    p === "/admin/about-config" ||
    p === "/admin/contact-config" ||
    p === "/admin/deposit-config" ||
    p === "/admin/auth-pages-config" ||
    p === "/admin/clear-cache" ||
    p === "/admin/cron" ||
    p.startsWith("/admin/cron/")
  ) {
    return "الإعدادات";
  }

  // Fallback: unclassified route
  return null;
}

/**
 * Global Admin Permission Middleware for /admin/* routes.
 * Intercepts requests, classifies section, and enforces RBAC permissions.
 */
export const adminPermissionsMiddleware: RequestHandler = async (req: Request, res: Response, next: NextFunction) => {
  const path = req.path || req.originalUrl || "";
  const normPath = normalizeAdminPath(path);

  // 1. Check if public/bypass route (login, logout)
  if (normPath === "/admin/login" || normPath === "/admin/logout") {
    next();
    return;
  }

  // 2. Must be authenticated for any other /admin/* endpoint
  if (!req.session.adminId) {
    res.status(401).json({ error: "غير مصرح" });
    return;
  }

  // 3. User session endpoints bypass section checks (me, dashboard, profile, 2FA)
  if (
    normPath === "/admin/me" ||
    normPath === "/admin/status" ||
    normPath === "/admin/dashboard" ||
    normPath === "/admin/profile" ||
    normPath.startsWith("/admin/2fa")
  ) {
    next();
    return;
  }

  const role = req.session.adminRole || "admin";

  // 4. super_admin has unrestricted access
  if (role === "super_admin") {
    next();
    return;
  }

  // 5. Classify the route to one of the 16 sections
  const section = classifyAdminRoute(normPath, req.body);

  if (!section) {
    // Unclassified admin route - fail closed for non-super_admin
    console.warn(
      `[Permission Denied: Unclassified Route] admin=${req.session.adminUsername} role=${role} path=${req.originalUrl}`
    );
    res.status(403).json({
      error: "لا تملك صلاحية الوصول لهذا القسم",
      code: "PERMISSION_DENIED",
      role,
    });
    return;
  }

  try {
    // 6. Check matrix permission
    const matrix = await getPermissionsMatrix();
    const rolePerms = matrix[role] || {};

    if (!rolePerms[section]) {
      console.warn(
        `[Permission Denied] admin=${req.session.adminUsername} role=${role} section="${section}" path=${req.originalUrl}`
      );
      res.status(403).json({
        error: "لا تملك صلاحية الوصول لهذا القسم",
        code: "PERMISSION_DENIED",
        required: section,
        role,
      });
      return;
    }

    next();
  } catch (err: any) {
    console.error("[adminPermissionsMiddleware] Error:", err);
    res.status(500).json({ error: "فشل التحقق من الصلاحيات" });
  }
};

