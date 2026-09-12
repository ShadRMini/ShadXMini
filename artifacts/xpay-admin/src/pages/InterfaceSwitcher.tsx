import React, { useState, useEffect } from "react";
import { get, put } from "../lib/api";
import { toast } from "sonner";
import {
  Layers,
  RotateCcw,
  SlidersHorizontal,
  Sparkles,
  LayoutDashboard,
  Package,
  Server,
  Users,
  Settings,
  Palette,
  Share2,
  Image as ImageIcon,
  LogIn,
  Headphones,
  Info,
  Wallet,
  Compass,
  AlertTriangle,
  CheckCircle2,
  RefreshCw
} from "lucide-react";

interface ToggleItemConfig {
  key: string;
  label: string;
  description: string;
  icon: React.ComponentType<{ size?: number; className?: string }>;
  section: string;
}

const TOGGLE_ITEMS: ToggleItemConfig[] = [
  // المجموعة 1: العمليات اليومية
  {
    key: "use_legacy_dashboard",
    label: "لوحة القيادة",
    description: "تفعيل الواجهة القديمة للوحة القيادة (Dashboard)",
    icon: LayoutDashboard,
    section: "العمليات اليومية",
  },

  // المجموعة 2: المنتجات والمزودون
  {
    key: "use_legacy_product_form",
    label: "نموذج إضافة/تعديل المنتج",
    description: "تفعيل النموذج القديم (التبويبات) بدلاً من الصفحة الواحدة",
    icon: Package,
    section: "المنتجات والمزودون",
  },
  {
    key: "use_legacy_api_products",
    label: "منتجات عبر API",
    description: "تفعيل الواجهة القديمة لعرض منتجات المزود",
    icon: Server,
    section: "المنتجات والمزودون",
  },

  // المجموعة 3: إدارة المستخدمين
  {
    key: "use_legacy_users_page",
    label: "صفحة إدارة المستخدمين",
    description: "تفعيل الواجهة القديمة لإدارة المستخدمين",
    icon: Users,
    section: "إدارة المستخدمين",
  },

  // المجموعة 4: الإعدادات
  {
    key: "use_legacy_settings_page",
    label: "صفحة الإعدادات العامة",
    description: "تفعيل الواجهة القديمة للإعدادات",
    icon: Settings,
    section: "الإعدادات",
  },
  {
    key: "use_legacy_theme_page",
    label: "صفحة تخصيص التصميم",
    description: "تفعيل الواجهة القديمة لتخصيص التصميم",
    icon: Palette,
    section: "الإعدادات",
  },

  // المجموعة 5: المحتوى
  {
    key: "use_legacy_social_links_page",
    label: "صفحة الروابط الاجتماعية",
    description: "تفعيل الواجهة القديمة للروابط الاجتماعية",
    icon: Share2,
    section: "المحتوى",
  },
  {
    key: "use_legacy_banners_page",
    label: "صفحة البانرات والعروض",
    description: "تفعيل الواجهة القديمة للبانرات",
    icon: ImageIcon,
    section: "المحتوى",
  },

  // المجموعة 6: صفحات المتجر
  {
    key: "use_legacy_auth_pages",
    label: "صفحات الدخول والتسجيل",
    description: "تفعيل التصميم القديم لصفحات المصادقة",
    icon: LogIn,
    section: "صفحات المتجر",
  },
  {
    key: "use_legacy_contact_page",
    label: "صفحة تواصل معنا",
    description: "تفعيل التصميم القديم لصفحة التواصل",
    icon: Headphones,
    section: "صفحات المتجر",
  },
  {
    key: "use_legacy_about_page",
    label: "صفحة من نحن",
    description: "تفعيل التصميم القديم لصفحة من نحن",
    icon: Info,
    section: "صفحات المتجر",
  },
  {
    key: "use_legacy_deposit_page",
    label: "صفحة شحن الرصيد",
    description: "تفعيل التصميم القديم لصفحة الإيداع",
    icon: Wallet,
    section: "صفحات المتجر",
  },
  {
    key: "use_legacy_product_page",
    label: "صفحة تفاصيل المنتج",
    description: "تفعيل التصميم القديم لصفحة المنتج في المتجر",
    icon: Package,
    section: "صفحات المتجر",
  },

  // المجموعة 7: القائمة الجانبية والميزات العامة
  {
    key: "use_legacy_sidebar",
    label: "القائمة الجانبية",
    description: "تفعيل ترتيب القائمة الجانبية القديم",
    icon: SlidersHorizontal,
    section: "الميزات العامة",
  },
  {
    key: "guest_preview_enabled",
    label: "استطلاع الزائر (Guest Preview)",
    description: "تفعيل ميزة استعراض المتجر والأقسام للزوار قبل تسجيل الدخول",
    icon: Compass,
    section: "الميزات العامة",
  },
];

interface ToggleSwitchProps {
  label: string;
  description: string;
  settingKey: string;
  icon: React.ComponentType<{ size?: number; className?: string }>;
  value: boolean;
  loading: boolean;
  onToggle: (key: string, newValue: boolean) => Promise<void>;
}

function ToggleSwitch({
  label,
  description,
  settingKey,
  icon: Icon,
  value,
  loading,
  onToggle,
}: ToggleSwitchProps) {
  const [isUpdating, setIsUpdating] = useState(false);

  const handleChange = async (checked: boolean) => {
    setIsUpdating(true);
    try {
      await onToggle(settingKey, checked);
    } finally {
      setIsUpdating(false);
    }
  };

  return (
    <div
      id={`toggle-card-${settingKey}`}
      className={`p-4.5 rounded-2xl border transition-all flex items-center justify-between gap-4 ${
        value
          ? "bg-[#201c14] border-[#C8A45C]/50 shadow-md shadow-[#C8A45C]/5"
          : "bg-[#1A1A1A] border-[#C8A45C]/15 hover:border-[#C8A45C]/30"
      }`}
    >
      <div className="flex items-start gap-3.5 flex-1 min-w-0">
        <div
          className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 transition-colors mt-0.5 ${
            value
              ? "bg-[#C8A45C]/20 border border-[#C8A45C]/50 text-[#FDE68A]"
              : "bg-[#252525] border border-zinc-700/60 text-zinc-400"
          }`}
        >
          <Icon size={19} />
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2">
            <h4 className="font-bold text-white text-sm">{label}</h4>
            {value && (
              <span className="text-[10px] px-2 py-0.5 rounded-full font-bold bg-[#C8A45C]/20 text-[#FDE68A] border border-[#C8A45C]/40">
                مفعّل
              </span>
            )}
          </div>
          <p className="text-xs text-zinc-400 mt-1 leading-relaxed">{description}</p>
          <p className="text-[11px] text-zinc-500 mt-1 font-mono">{settingKey}</p>
        </div>
      </div>

      <div className="shrink-0 flex items-center gap-2">
        {isUpdating && <RefreshCw size={14} className="animate-spin text-[#C8A45C]" />}
        <label className="relative inline-flex items-center cursor-pointer">
          <input
            type="checkbox"
            checked={value}
            disabled={loading || isUpdating}
            onChange={(e) => handleChange(e.target.checked)}
            className="sr-only peer"
          />
          <div className="w-12 h-6.5 bg-zinc-700 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full rtl:peer-checked:after:-translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2.5px] after:start-[3px] after:bg-white after:border-zinc-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-[#C8A45C] peer-disabled:opacity-50"></div>
        </label>
      </div>
    </div>
  );
}

export default function InterfaceSwitcher() {
  const [values, setValues] = useState<Record<string, boolean>>({});
  const [loading, setLoading] = useState(true);
  const [resetting, setResetting] = useState(false);

  const fetchAllSettings = async () => {
    setLoading(true);
    try {
      const results: Record<string, boolean> = {};

      await Promise.all(
        TOGGLE_ITEMS.map(async (item) => {
          try {
            const res = await get<any>(`/admin/settings/${item.key}`);
            const raw = res?.value ?? res?.useLegacy;
            results[item.key] = raw === true || raw === "true";
          } catch {
            results[item.key] = false;
          }
        })
      );

      setValues(results);
    } catch (err) {
      console.error("Failed to load interface settings:", err);
      toast.error("فشل تحميل بعض إعدادات الواجهات");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchAllSettings();
  }, []);

  const handleToggle = async (key: string, newValue: boolean) => {
    const item = TOGGLE_ITEMS.find((t) => t.key === key);
    const label = item?.label || key;

    setValues((prev) => ({ ...prev, [key]: newValue }));

    try {
      await put(`/admin/settings/${key}`, { value: String(newValue), useLegacy: newValue });
      toast.success(`تم ${newValue ? "تفعيل" : "تعطيل"} ${label}`);

      if (key === "use_legacy_sidebar") {
        localStorage.setItem("admin_use_legacy_sidebar", String(newValue));
        window.dispatchEvent(new Event("storage"));
      }
    } catch (err: any) {
      setValues((prev) => ({ ...prev, [key]: !newValue }));
      toast.error(`فشل تحديث إعداد ${label}`);
    }
  };

  const handleDisableAllLegacy = async () => {
    const confirmAction = window.confirm(
      "هل أنت متأكد من إعادة جميع الواجهات للوضع الافتراضي (تعطيل كل الواجهات القديمة)؟"
    );
    if (!confirmAction) return;

    setResetting(true);
    try {
      const legacyKeys = TOGGLE_ITEMS.filter((i) => i.key.startsWith("use_legacy_")).map((i) => i.key);

      await Promise.all(
        legacyKeys.map(async (key) => {
          try {
            await put(`/admin/settings/${key}`, { value: "false", useLegacy: false });
          } catch (e) {
            console.error(`Failed to reset ${key}:`, e);
          }
        })
      );

      setValues((prev) => {
        const next = { ...prev };
        legacyKeys.forEach((k) => {
          next[k] = false;
        });
        return next;
      });

      localStorage.setItem("admin_use_legacy_sidebar", "false");
      window.dispatchEvent(new Event("storage"));

      toast.success("تم إعادة جميع الواجهات إلى الوضع الافتراضي الحديث بنجاح");
    } catch (err: any) {
      toast.error("حدث خطأ أثناء إعادة ضبط الواجهات");
    } finally {
      setResetting(false);
    }
  };

  // Group items by section
  const sections = [
    "العمليات اليومية",
    "المنتجات والمزودون",
    "إدارة المستخدمين",
    "الإعدادات",
    "المحتوى",
    "صفحات المتجر",
    "الميزات العامة",
  ];

  return (
    <div className="space-y-6 pb-12" dir="rtl">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 bg-[#1A1A1A] p-6 rounded-3xl border border-[#C8A45C]/25 shadow-xl">
        <div className="flex items-start gap-4">
          <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-[#C8A45C]/25 to-[#C8A45C]/5 border border-[#C8A45C]/40 flex items-center justify-center text-[#C8A45C] shrink-0 shadow-md">
            <Layers size={24} />
          </div>
          <div>
            <h1 className="text-2xl font-black text-[#C8A45C] tracking-tight">تبديل الواجهات</h1>
            <p className="text-sm text-zinc-300 mt-1 font-medium">
              تحكم في تفعيل الواجهات القديمة (Legacy) أو الجديدة لكل قسم من أقسام النظام.
            </p>
          </div>
        </div>

        <div className="flex items-center gap-3 shrink-0">
          <button
            type="button"
            id="btn-refresh-interface-settings"
            onClick={fetchAllSettings}
            disabled={loading || resetting}
            className="p-2.5 rounded-xl bg-[#252525] hover:bg-[#303030] text-zinc-300 hover:text-white border border-zinc-700 transition cursor-pointer disabled:opacity-50"
            title="تحديث البيانات"
          >
            <RefreshCw size={16} className={loading ? "animate-spin text-[#C8A45C]" : ""} />
          </button>

          <button
            type="button"
            id="btn-disable-all-legacy"
            onClick={handleDisableAllLegacy}
            disabled={loading || resetting}
            className="px-4 py-2.5 rounded-xl bg-gradient-to-r from-amber-600/90 to-amber-700 hover:from-amber-600 hover:to-amber-650 text-white font-bold text-xs flex items-center gap-2 border border-amber-500/40 shadow-md transition cursor-pointer disabled:opacity-50"
          >
            <RotateCcw size={15} className={resetting ? "animate-spin" : ""} />
            <span>{resetting ? "جاري الإعادة..." : "إعادة الكل للوضع الافتراضي"}</span>
          </button>
        </div>
      </div>

      {/* Notice Banner */}
      <div className="p-4 rounded-2xl bg-amber-500/10 border border-amber-500/30 flex items-start gap-3.5 text-amber-200 text-xs leading-relaxed">
        <AlertTriangle size={18} className="text-amber-400 shrink-0 mt-0.5" />
        <div>
          <strong className="font-bold text-amber-300">ملاحظة تنظيمية هامة: </strong>
          تفعيل الواجهة القديمة يعيد السلوك والتصميم السابق للقسم المختار. تم توحيد جميع المفاتيح في هذه
          الصفحة المركزية لمنحك تحكماً شاملاً وسلساً بدلاً من تشتيت الأزرار عبر الصفحات المختلفة.
        </div>
      </div>

      {/* Sections & Switches */}
      <div className="space-y-6">
        {sections.map((sectionTitle) => {
          const items = TOGGLE_ITEMS.filter((i) => i.section === sectionTitle);
          if (items.length === 0) return null;

          return (
            <div
              key={sectionTitle}
              id={`section-${sectionTitle}`}
              className="bg-[#161616] p-6 rounded-3xl border border-[#C8A45C]/20 shadow-md space-y-4"
            >
              <div className="flex items-center justify-between border-b border-[#C8A45C]/15 pb-3">
                <div className="flex items-center gap-2.5">
                  <span className="w-2 h-2 rounded-full bg-[#C8A45C]" />
                  <h3 className="text-sm font-black text-[#FDE68A]">{sectionTitle}</h3>
                </div>
                <span className="text-[11px] text-zinc-400 font-medium">
                  {items.filter((i) => values[i.key]).length} من {items.length} مفعل
                </span>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-3.5">
                {items.map((item) => (
                  <ToggleSwitch
                    key={item.key}
                    label={item.label}
                    description={item.description}
                    settingKey={item.key}
                    icon={item.icon}
                    value={Boolean(values[item.key])}
                    loading={loading}
                    onToggle={handleToggle}
                  />
                ))}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
