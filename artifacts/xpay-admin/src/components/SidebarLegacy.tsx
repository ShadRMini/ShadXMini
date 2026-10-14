import React, { useMemo } from "react";
import { NavLink } from "react-router-dom";
import {
  LayoutDashboard, ShoppingCart, Wallet, Users, FolderTree, Package,
  CreditCard, Image as ImageIcon, Megaphone, Share2, Server, Ticket,
  Crown, KeyRound, MessageSquare, Code2, Bell, ShieldCheck, BadgeCheck, Activity,
  Settings as SettingsIcon, Palette, BarChart3, Database, User as UserIcon,
  Lock, Globe, Languages as LangIcon, PowerOff, X, Sparkles, RefreshCw, Headphones, LogIn, Layers
} from "lucide-react";
import { usePermissions } from "../context/PermissionsContext";

export interface SidebarProps {
  open: boolean;
  setOpen: (open: boolean) => void;
  brandLogo: string;
  loginTitle: string;
  loginSubtitle: string;
  onToggleSidebarMode: () => void;
  isToggling?: boolean;
}

interface LegacyNavItem {
  to: string;
  label: string;
  icon: React.ComponentType<{ size?: number; className?: string }>;
  group: string;
  permission?: string | null;
}

// Full legacy nav list with permission mappings
const LEGACY_NAV: LegacyNavItem[] = [
  // Group 1: لوحة الإدارة
  { to: "/", label: "عام", icon: LayoutDashboard, group: "لوحة الإدارة", permission: null },
  { to: "/maintenance", label: "وضع الصيانة", icon: PowerOff, group: "لوحة الإدارة", permission: "الإعدادات" },
  { to: "/news", label: "الأخبار", icon: Megaphone, group: "لوحة الإدارة", permission: "الأخبار" },
  { to: "/users", label: "إدارة المستخدمين (إضافة/حذف)", icon: Users, group: "لوحة الإدارة", permission: "المستخدمون" },
  { to: "/identity-verifications", label: "طلبات توثيق الهوية", icon: BadgeCheck, group: "لوحة الإدارة", permission: "المستخدمون" },

  // Group 2: إدارة المزودين
  { to: "/providers", label: "مزود API", icon: Server, group: "إدارة المزودين", permission: "المزودون" },
  { to: "/api-keys", label: "مفتاح API", icon: Code2, group: "إدارة المزودين", permission: "المزودون" },
  { to: "/provider-reports", label: "تقارير المزودين", icon: BarChart3, group: "إدارة المزودين", permission: "المزودون" },

  // Group 3: الأقسام & المنتجات
  { to: "/categories", label: "الأقسام (إضافة/حذف)", icon: FolderTree, group: "الأقسام & المنتجات", permission: "الأقسام" },
  { to: "/product-groups", label: "إدارة المجموعات", icon: FolderTree, group: "الأقسام & المنتجات", permission: "المنتجات" },
  { to: "/products", label: "المنتجات (إضافة/حذف)", icon: Package, group: "الأقسام & المنتجات", permission: "المنتجات" },
  { to: "/banners", label: "البانرات والعروض المميزة", icon: ImageIcon, group: "الأقسام & المنتجات", permission: "البانرات" },
  { to: "/api-products", label: "منتجات عبر API", icon: Server, group: "الأقسام & المنتجات", permission: "المزودون" },
  { to: "/auto-codes", label: "كود", icon: KeyRound, group: "الأقسام & المنتجات", permission: "المنتجات" },

  // Group 4: الإدارة المالية والتسويق
  { to: "/orders", label: "الطلبات", icon: ShoppingCart, group: "الإدارة المالية والتسويق", permission: "الطلبات" },
  { to: "/order-messages", label: "قوالب رسائل الطلبات", icon: MessageSquare, group: "الإدارة المالية والتسويق", permission: "الطلبات" },
  { to: "/payment-methods", label: "طرق الدفع", icon: CreditCard, group: "الإدارة المالية والتسويق", permission: "طرق الدفع" },
  { to: "/coupons", label: "كوبونات الخصم (إضافة/حذف)", icon: Ticket, group: "الإدارة المالية والتسويق", permission: "الكوبونات" },
  { to: "/vip", label: "عضويات VIP", icon: Crown, group: "الإدارة المالية والتسويق", permission: "VIP" },
  { to: "/currency", label: "عملة المتجر", icon: Globe, group: "الإدارة المالية والتسويق", permission: "الإعدادات" },

  // Group 5: إعدادات النظام
  { to: "/interface-switcher", label: "تبديل الواجهات", icon: Layers, group: "إعدادات النظام", permission: "الإعدادات" },
  { to: "/settings", label: "الإعدادات العامة", icon: SettingsIcon, group: "إعدادات النظام", permission: "الإعدادات" },
  { to: "/theme", label: "تخصيص الهوية والصفحات", icon: Palette, group: "إعدادات النظام", permission: "الإعدادات" },
  { to: "/social-links", label: "الروابط الاجتماعية", icon: Share2, group: "إعدادات النظام", permission: "الإعدادات" },
  { to: "/notifications", label: "الإشعارات", icon: Bell, group: "إعدادات النظام", permission: "الإشعارات" },
  { to: "/cache", label: "الذاكرة المؤقتة (مسح الكاش)", icon: Database, group: "إعدادات النظام", permission: "الإعدادات" },

  // Group 6: الإدارة والصلاحيات
  { to: "/activity", label: "سجل النشاط", icon: Activity, group: "الإدارة والصلاحيات", permission: "سجل النشاط" },
  { to: "/reports", label: "التقارير", icon: BarChart3, group: "الإدارة والصلاحيات", permission: "الطلبات" },
  { to: "/backup", label: "النسخ الاحتياطي", icon: Database, group: "الإدارة والصلاحيات", permission: "النسخ الاحتياطي" },
  { to: "/cron-jobs", label: "المهام المجدولة (Cron)", icon: Activity, group: "الإدارة والصلاحيات", permission: "الإعدادات" },
  { to: "/permissions", label: "الصلاحيات", icon: Lock, group: "الإدارة والصلاحيات", permission: "المشرفون" },
  { to: "/admins", label: "المشرفون (إضافة/حذف)", icon: ShieldCheck, group: "الإدارة والصلاحيات", permission: "المشرفون" },
  { to: "/profile", label: "الملف الشخصي", icon: UserIcon, group: "الإدارة والصلاحيات", permission: null },
  { to: "/languages", label: "اللغات", icon: LangIcon, group: "الإدارة والصلاحيات", permission: "الإعدادات" },
];

export default function SidebarLegacy({
  open,
  setOpen,
  brandLogo,
  loginTitle,
  loginSubtitle,
  onToggleSidebarMode,
  isToggling = false,
}: SidebarProps) {
  const { can, isSuperAdmin } = usePermissions();

  // فلترة العناصر حسب الصلاحيات
  const allowedNav = useMemo(() => {
    return LEGACY_NAV.filter((item) => {
      if (item.permission == null) return true;
      return can(item.permission);
    });
  }, [can, isSuperAdmin]);

  // تجميع العناصر المسموحة فقط في مجموعات وحذف المجموعات الفارغة
  const groups = useMemo(() => {
    return (allowedNav || []).reduce<Record<string, LegacyNavItem[]>>((acc, item) => {
      (acc[item.group] = acc[item.group] || []).push(item);
      return acc;
    }, {});
  }, [allowedNav]);

  return (
    <aside
      className={`fixed lg:static z-40 inset-y-0 right-0 w-72 flex-shrink-0 h-full bg-[#1A1A1A] border-l border-[#C8A45C]/20 transform transition-transform flex flex-col justify-between ${
        open ? "translate-x-0" : "translate-x-full lg:translate-x-0"
      }`}
      dir="rtl"
    >
      {/* Top Header & Brand */}
      <div className="p-5 border-b border-[#C8A45C]/20 flex items-center justify-between flex-shrink-0">
        <div className="flex items-center gap-3">
          {brandLogo ? (
            <img
              src={brandLogo}
              alt={loginTitle}
              onError={() => {}}
              className="h-10 max-w-[140px] object-contain rounded-xl"
            />
          ) : (
            <div>
              <div className="text-xl font-extrabold text-[#FDE68A] tracking-wide">{loginTitle}</div>
              <div className="text-xs text-zinc-400 mt-0.5 font-medium">{loginSubtitle}</div>
            </div>
          )}
        </div>
        <button
          className="lg:hidden text-zinc-400 hover:text-[#C8A45C] cursor-pointer"
          onClick={() => setOpen(false)}
          type="button"
          aria-label="إغلاق القائمة"
        >
          <X size={20} />
        </button>
      </div>

      {/* Navigation Links (Scrollable) */}
      <nav className="p-3 space-y-4 flex-1 overflow-y-auto">
        {Object.entries(groups || {}).map(([group, items]) => {
          if (!items || items.length === 0) return null;
          return (
            <div key={group}>
              <div className="text-xs font-bold text-[#C8A45C] px-3 mb-1.5">{group}</div>
              <div className="space-y-0.5">
                {items.map((it) => {
                  const Icon = it.icon;
                  return (
                    <NavLink
                      key={it.to}
                      to={it.to}
                      end={it.to === "/"}
                      onClick={() => setOpen(false)}
                      className={({ isActive }) =>
                        `flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-all ${
                          isActive
                            ? "bg-[#C8A45C] text-[#1A1A1A] font-black shadow-md shadow-[#C8A45C]/30"
                            : "text-zinc-300 hover:bg-[#2D2D2D] hover:text-[#FDE68A]"
                        }`
                      }
                    >
                      <Icon size={18} className="text-[#C8A45C]" />
                      <span>{it.label}</span>
                    </NavLink>
                  );
                })}
              </div>
            </div>
          );
        })}
      </nav>

      {/* Switch to New Sidebar Mode button */}
      <div className="p-3 border-t border-[#C8A45C]/20 bg-[#141414] flex-shrink-0">
        <button
          type="button"
          onClick={onToggleSidebarMode}
          disabled={isToggling}
          className="w-full flex items-center justify-center gap-2 px-3 py-2 rounded-xl text-xs font-semibold bg-[#2A2A2A] hover:bg-[#333333] text-[#FDE68A] border border-[#C8A45C]/30 hover:border-[#C8A45C] transition-all cursor-pointer disabled:opacity-50"
        >
          <Sparkles size={14} className="text-[#C8A45C]" />
          <span>{isToggling ? "جاري التبديل..." : "التبديل للقائمة الحديثة"}</span>
        </button>
      </div>
    </aside>
  );
}
