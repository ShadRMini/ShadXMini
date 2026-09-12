import React, { useState, useEffect, useMemo } from "react";
import { NavLink, useLocation } from "react-router-dom";
import { get } from "../lib/api";
import {
  LayoutDashboard, ShoppingCart, MessageSquare, BadgeCheck, LifeBuoy,
  FolderTree, Layers, Package, Image as ImageIcon, Server, Cpu, Code2,
  BarChart3, KeyRound, CreditCard, Wallet, Ticket, Megaphone, Crown,
  Coins, Users, ShieldCheck, Lock, Activity, User, ShieldAlert,
  Settings as SettingsIcon, Palette, Info, Share2, Bell, Languages as LangIcon,
  PowerOff, Database, Clock, HardDrive, ChevronDown, Search, X, History,
  RefreshCw, CheckCircle2, Headphones, LogIn
} from "lucide-react";
import type { SidebarProps } from "./SidebarLegacy";

interface NavItem {
  to: string;
  label: string;
  icon: React.ComponentType<{ size?: number; className?: string }>;
  badgeKey?: "pendingOrders" | "pendingVerifications" | "pendingTickets" | "pendingDeposits";
}

interface NavGroup {
  id: string;
  title: string;
  items: NavItem[];
}

const NEW_NAV_GROUPS: NavGroup[] = [
  // المجموعة 1: العمليات اليومية
  {
    id: "daily_operations",
    title: "العمليات اليومية",
    items: [
      { to: "/", label: "لوحة التحكم", icon: LayoutDashboard },
      { to: "/orders", label: "الطلبات", icon: ShoppingCart, badgeKey: "pendingOrders" },
      { to: "/order-messages", label: "قوالب رسائل الطلبات", icon: MessageSquare },
      { to: "/identity-verifications", label: "طلبات توثيق الهوية", icon: BadgeCheck, badgeKey: "pendingVerifications" },
      { to: "/tickets", label: "تذاكر الدعم الفني", icon: LifeBuoy, badgeKey: "pendingTickets" },
    ],
  },

  // المجموعة 2: المنتجات والمزودون
  {
    id: "products_and_providers",
    title: "المنتجات والمزودون",
    items: [
      { to: "/categories", label: "الأقسام", icon: FolderTree },
      { to: "/product-groups", label: "إدارة المجموعات", icon: Layers },
      { to: "/products", label: "المنتجات", icon: Package },
      { to: "/banners", label: "البنرات والعروض المميزة", icon: ImageIcon },
      { to: "/api-products", label: "منتجات عبر API", icon: Server },
      { to: "/providers", label: "مزودو API", icon: Cpu },
      { to: "/api-keys", label: "مفاتيح API", icon: Code2 },
      { to: "/provider-reports", label: "تقارير المزودين", icon: BarChart3 },
      { to: "/auto-codes", label: "الكود / الأكواد التلقائية", icon: KeyRound },
    ],
  },

  // المجموعة 3: الإدارة المالية والتسويق
  {
    id: "finance_and_marketing",
    title: "الإدارة المالية والتسويق",
    items: [
      { to: "/payment-methods", label: "طرق الدفع", icon: CreditCard },
      { to: "/deposits", label: "طلبات شحن الرصيد", icon: Wallet, badgeKey: "pendingDeposits" },
      { to: "/coupons", label: "كوبونات الخصم", icon: Ticket },
      { to: "/promotions", label: "العروض الترويجية", icon: Megaphone },
      { to: "/vip", label: "عضويات VIP والمستويات", icon: Crown },
      { to: "/currency", label: "عملة المتجر", icon: Coins },
    ],
  },

  // المجموعة 4: إدارة المستخدمين والصلاحيات
  {
    id: "users_and_permissions",
    title: "إدارة المستخدمين والصلاحيات",
    items: [
      { to: "/users", label: "إدارة المستخدمين", icon: Users },
      { to: "/admins", label: "المشرفون", icon: ShieldCheck },
      { to: "/permissions", label: "الصلاحيات", icon: Lock },
      { to: "/activity", label: "سجل النشاط", icon: Activity },
      { to: "/profile", label: "الملف الشخصي", icon: User },
      { to: "/2fa", label: "التحقق الثنائي", icon: ShieldAlert },
    ],
  },

  // المجموعة 5: إعدادات النظام
  {
    id: "system_settings",
    title: "إعدادات النظام",
    items: [
      { to: "/interface-switcher", label: "تبديل الواجهات", icon: Layers },
      { to: "/settings", label: "الإعدادات العامة", icon: SettingsIcon },
      { to: "/theme", label: "تخصيص التصميم", icon: Palette },
      { to: "/auth-pages-settings", label: "تخصيص صفحات الدخول والتسجيل", icon: LogIn },
      { to: "/product-page-settings", label: "تخصيص صفحة المنتج", icon: Package },
      { to: "/about-settings", label: "تخصيص صفحة من نحن", icon: Info },
      { to: "/contact-settings", label: "تخصيص صفحة تواصل معنا", icon: Headphones },
      { to: "/deposit-settings", label: "تخصيص صفحة شحن الرصيد", icon: Wallet },
      { to: "/social-links", label: "الروابط الاجتماعية", icon: Share2 },
      { to: "/notifications", label: "الإشعارات", icon: Bell },
      { to: "/languages", label: "اللغات", icon: LangIcon },
      { to: "/news", label: "الأخبار", icon: Megaphone },
      { to: "/maintenance", label: "وضع الصيانة", icon: PowerOff },
    ],
  },

  // المجموعة 6: الأدوات المتقدمة
  {
    id: "advanced_tools",
    title: "الأدوات المتقدمة",
    items: [
      { to: "/reports", label: "التقارير", icon: BarChart3 },
      { to: "/backup", label: "النسخ الاحتياطي", icon: Database },
      { to: "/cron-jobs", label: "المهام المجدولة (Cron)", icon: Clock },
      { to: "/cache", label: "الذاكرة المؤقتة", icon: HardDrive },
    ],
  },
];

const STORAGE_KEY = "sidebar_expanded_groups";

export default function SidebarNew({
  open,
  setOpen,
  brandLogo,
  loginTitle,
  loginSubtitle,
  onToggleSidebarMode,
  isToggling = false,
}: SidebarProps) {
  const location = useLocation();
  const currentPath = location.pathname;

  // Search query
  const [searchQuery, setSearchQuery] = useState("");

  // Badges state
  const [badges, setBadges] = useState<{
    pendingOrders: number;
    pendingVerifications: number;
    pendingTickets: number;
    pendingDeposits: number;
  }>({
    pendingOrders: 0,
    pendingVerifications: 0,
    pendingTickets: 0,
    pendingDeposits: 0,
  });

  // Expanded groups: load initial from localStorage, default all open
  const [expandedGroups, setExpandedGroups] = useState<string[]>(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEY);
      if (saved) {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed)) return parsed;
      }
    } catch {}
    // Default all groups expanded for immediate accessibility
    return NEW_NAV_GROUPS.map((g) => g.id);
  });

  // Save expanded groups to localStorage
  const toggleGroup = (groupId: string) => {
    setExpandedGroups((prev) => {
      const isExpanded = prev.includes(groupId);
      const updated = isExpanded
        ? prev.filter((id) => id !== groupId)
        : [...prev, groupId];
      try {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(updated));
      } catch {}
      return updated;
    });
  };

  // Auto-expand group containing current route
  useEffect(() => {
    const activeGroup = NEW_NAV_GROUPS.find((group) =>
      group.items.some((item) => {
        if (item.to === "/") return currentPath === "/";
        return currentPath === item.to || currentPath.startsWith(`${item.to}/`);
      })
    );

    if (activeGroup && !expandedGroups.includes(activeGroup.id)) {
      setExpandedGroups((prev) => {
        if (prev.includes(activeGroup.id)) return prev;
        const updated = [...prev, activeGroup.id];
        try {
          localStorage.setItem(STORAGE_KEY, JSON.stringify(updated));
        } catch {}
        return updated;
      });
    }
  }, [currentPath]);

  // Fetch live badges
  const fetchBadges = async () => {
    try {
      const data = await get<any>("/admin/sidebar-badges");
      if (data && typeof data === "object") {
        setBadges({
          pendingOrders: Number(data.pendingOrders || 0),
          pendingVerifications: Number(data.pendingVerifications || 0),
          pendingTickets: Number(data.pendingTickets || 0),
          pendingDeposits: Number(data.pendingDeposits || 0),
        });
      }
    } catch {
      // If badges endpoint fails, try stats
      try {
        const statsData = await get<any>("/admin/stats");
        if (statsData?.stats) {
          setBadges((prev) => ({
            ...prev,
            pendingOrders: Number(statsData.stats.pendingOrders || 0),
            pendingTickets: Number(statsData.stats.pendingTickets || 0),
            pendingDeposits: Number(statsData.stats.pendingDeposits || 0),
          }));
        }
      } catch {}
    }
  };

  useEffect(() => {
    fetchBadges();
    const interval = setInterval(fetchBadges, 20000); // 20s polling
    return () => clearInterval(interval);
  }, []);

  // Filter groups and items based on search query
  const filteredGroups = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    if (!q) return NEW_NAV_GROUPS;

    return NEW_NAV_GROUPS.map((group) => {
      const matchesGroupTitle = group.title.toLowerCase().includes(q);
      const matchedItems = group.items.filter(
        (it) => it.label.toLowerCase().includes(q) || it.to.toLowerCase().includes(q)
      );

      if (matchesGroupTitle) {
        return group; // return full group if title matches
      }

      if (matchedItems.length > 0) {
        return {
          ...group,
          items: matchedItems,
        };
      }

      return null;
    }).filter(Boolean) as NavGroup[];
  }, [searchQuery]);

  // Auto-expand all matching groups when searching
  const isSearching = searchQuery.trim().length > 0;

  return (
    <aside
      className={`fixed lg:static z-40 inset-y-0 right-0 w-72 flex-shrink-0 h-full bg-[#1A1A1A] border-l border-[#C8A45C]/20 transform transition-transform flex flex-col justify-between ${
        open ? "translate-x-0" : "translate-x-full lg:translate-x-0"
      }`}
      dir="rtl"
    >
      {/* Top Header & Brand */}
      <div className="p-4 border-b border-[#C8A45C]/20 flex items-center justify-between flex-shrink-0 bg-[#1A1A1A]">
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
          className="lg:hidden text-zinc-400 hover:text-[#C8A45C] p-1.5 rounded-lg hover:bg-[#2D2D2D] transition cursor-pointer"
          onClick={() => setOpen(false)}
          type="button"
          aria-label="إغلاق القائمة"
        >
          <X size={20} />
        </button>
      </div>

      {/* Quick Search Bar */}
      <div className="p-3 border-b border-[#C8A45C]/15 bg-[#141414] flex-shrink-0">
        <div className="relative">
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="بحث سريع في القوائم..."
            className="w-full bg-[#242424] text-white text-xs placeholder:text-zinc-500 rounded-xl pr-9 pl-8 py-2 border border-[#C8A45C]/25 focus:border-[#C8A45C] focus:outline-none focus:ring-1 focus:ring-[#C8A45C] transition"
          />
          <Search size={15} className="absolute right-3 top-1/2 -translate-y-1/2 text-[#C8A45C] pointer-events-none" />
          {searchQuery && (
            <button
              onClick={() => setSearchQuery("")}
              className="absolute left-2.5 top-1/2 -translate-y-1/2 text-zinc-400 hover:text-white p-0.5 rounded cursor-pointer"
              type="button"
              title="مسح البحث"
            >
              <X size={14} />
            </button>
          )}
        </div>
      </div>

      {/* Accordion Navigation Groups (Scrollable) */}
      <nav className="p-3 space-y-2 flex-1 overflow-y-auto custom-scrollbar">
        {filteredGroups.length === 0 ? (
          <div className="p-6 text-center text-zinc-500 text-xs flex flex-col items-center gap-2">
            <Search size={22} className="text-zinc-600 mb-1" />
            <span>لا توجد نتائج بحث مطابقة</span>
          </div>
        ) : (
          filteredGroups.map((group) => {
            const isExpanded = isSearching || expandedGroups.includes(group.id);

            // Compute total badges in this group to show on collapsed header
            const groupBadgeCount = group.items.reduce((sum, it) => {
              if (it.badgeKey && badges[it.badgeKey]) {
                return sum + (badges[it.badgeKey] || 0);
              }
              return sum;
            }, 0);

            // Check if any item in this group is active
            const hasActiveChild = group.items.some((it) =>
              it.to === "/" ? currentPath === "/" : currentPath === it.to || currentPath.startsWith(`${it.to}/`)
            );

            return (
              <div
                key={group.id}
                className="rounded-xl bg-[#202020]/70 border border-[#C8A45C]/15 overflow-hidden transition-all duration-200"
              >
                {/* Group Accordion Header */}
                <button
                  type="button"
                  onClick={() => toggleGroup(group.id)}
                  className={`w-full px-3 py-2.5 flex items-center justify-between text-right font-bold text-xs transition cursor-pointer ${
                    hasActiveChild
                      ? "text-[#FDE68A] bg-[#C8A45C]/10 border-b border-[#C8A45C]/20"
                      : "text-zinc-300 hover:text-[#FDE68A] hover:bg-[#2A2A2A]"
                  }`}
                  aria-expanded={isExpanded}
                >
                  <div className="flex items-center gap-2 min-w-0">
                    <span className="w-1.5 h-1.5 rounded-full bg-[#C8A45C]" />
                    <span className="truncate">{group.title}</span>
                  </div>

                  <div className="flex items-center gap-2 shrink-0">
                    {/* Badge on Group Header if closed or active */}
                    {groupBadgeCount > 0 && (
                      <span className="min-w-[18px] h-[18px] px-1 bg-[#C8A45C] text-[#1A1A1A] font-black text-[10px] rounded-full flex items-center justify-center shadow-xs">
                        {groupBadgeCount > 99 ? "99+" : groupBadgeCount}
                      </span>
                    )}
                    <ChevronDown
                      size={15}
                      className={`text-[#C8A45C] transition-transform duration-200 ${
                        isExpanded ? "rotate-180" : "rotate-0"
                      }`}
                    />
                  </div>
                </button>

                {/* Group Items Accordion Content */}
                {isExpanded && (
                  <div className="p-1.5 space-y-0.5 animate-in fade-in duration-150">
                    {group.items.map((it) => {
                      const badgeValue = it.badgeKey ? badges[it.badgeKey] : 0;
                      const Icon = it.icon;

                      return (
                        <NavLink
                          key={it.to}
                          to={it.to}
                          end={it.to === "/"}
                          onClick={() => setOpen(false)}
                          className={({ isActive }) =>
                            `flex items-center justify-between px-3 py-2 rounded-lg text-xs font-medium transition-all ${
                              isActive
                                ? "bg-[#C8A45C]/15 border-r-4 border-[#C8A45C] text-[#FDE68A] font-bold shadow-xs"
                                : "text-zinc-300 hover:bg-[#2A2A2A] hover:text-white"
                            }`
                          }
                        >
                          <div className="flex items-center gap-2.5 min-w-0">
                            <Icon size={18} className="text-[#C8A45C] shrink-0" />
                            <span className="truncate">{it.label}</span>
                          </div>

                          {/* Item Badge */}
                          {badgeValue > 0 && (
                            <span
                              className="min-w-[18px] h-[18px] px-1.5 bg-[#C8A45C] text-[#1A1A1A] font-black text-[10px] rounded-full flex items-center justify-center shrink-0 shadow-sm"
                              title={`${badgeValue} عناصر معلقة`}
                            >
                              {badgeValue > 99 ? "99+" : badgeValue}
                            </span>
                          )}
                        </NavLink>
                      );
                    })}
                  </div>
                )}
              </div>
            );
          })
        )}
      </nav>
    </aside>
  );
}
