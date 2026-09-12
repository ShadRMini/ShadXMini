import React, { useState, useEffect } from "react";
import { get, put } from "../lib/api";
import { toast } from "sonner";
import {
  LogIn,
  UserPlus,
  Palette,
  Eye,
  Save,
  RotateCcw,
  ExternalLink,
  Shield,
  Zap,
  Headphones,
  Package,
  ShieldCheck,
  CheckCircle2,
  AlertCircle,
  Lock,
  User,
  Mail,
  KeyRound,
  Sparkles,
  Sliders,
  ArrowRight,
  Plus,
  Trash2,
  HelpCircle,
  ToggleLeft,
  ToggleRight,
  RefreshCw,
  Info,
  Check,
  X,
} from "lucide-react";

export interface BenefitItem {
  icon: string;
  text: string;
}

export interface AuthPagesConfig {
  login: {
    title: string;
    subtitle: string;
    branding: {
      title: string;
      subtitle: string;
      icon: string;
      benefits: BenefitItem[];
    };
    fields: {
      usernameLabel: string;
      usernamePlaceholder: string;
      passwordLabel: string;
      passwordPlaceholder: string;
      showForgotPassword: boolean;
      forgotPasswordText: string;
      submitButtonText: string;
      switchToRegisterText: string;
      switchToRegisterLink: string;
    };
    showGoogleButton: boolean;
    googleButtonText: string;
    showDivider: boolean;
    dividerText: string;
  };
  register: {
    title: string;
    subtitle: string;
    branding: {
      title: string;
      subtitle: string;
      icon: string;
      benefits: BenefitItem[];
    };
    fields: {
      usernameLabel: string;
      usernamePlaceholder: string;
      usernameHint: string;
      passwordLabel: string;
      passwordPlaceholder: string;
      confirmPasswordLabel: string;
      confirmPasswordPlaceholder: string;
      emailLabel: string;
      emailPlaceholder: string;
      submitButtonText: string;
      switchToLoginText: string;
      switchToLoginLink: string;
    };
    passwordRequirements: {
      enabled: boolean;
      title: string;
      showMinLength: boolean;
      minLength: number;
      showUppercase: boolean;
      uppercaseText: string;
      showLowercase: boolean;
      lowercaseText: string;
      showNumber: boolean;
      numberText: string;
      showSpecial: boolean;
      specialText: string;
    };
    emailVerification: {
      enabled: boolean;
      hintText: string;
    };
    showGoogleButton: boolean;
    googleButtonText: string;
    showDivider: boolean;
    dividerText: string;
  };
  common: {
    backToHomeText: string;
    styles: {
      titleColor: string;
      subtitleColor: string;
      labelColor: string;
      inputTextColor: string;
      inputBgColor: string;
      inputBorderColor: string;
      inputFocusBorderColor: string;
      buttonBgColor: string;
      buttonTextColor: string;
      buttonHoverColor: string;
      brandingBgColor: string;
      brandingTextColor: string;
      brandingIconColor: string;
    };
  };
}

export const DEFAULT_AUTH_PAGES_CONFIG: AuthPagesConfig = {
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

const COLOR_PRESETS = [
  {
    name: "الذهبي الملكي (الافتراضي)",
    theme: {
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
  {
    name: "الأزرق السيبراني (Cyber Blue)",
    theme: {
      titleColor: "#3B82F6",
      subtitleColor: "#94A3B8",
      labelColor: "#F1F5F9",
      inputTextColor: "#FFFFFF",
      inputBgColor: "#1E293B",
      inputBorderColor: "#334155",
      inputFocusBorderColor: "#3B82F6",
      buttonBgColor: "#3B82F6",
      buttonTextColor: "#FFFFFF",
      buttonHoverColor: "#2563EB",
      brandingBgColor: "#2563EB",
      brandingTextColor: "#FFFFFF",
      brandingIconColor: "#FFFFFF",
    },
  },
  {
    name: "الزمردي النقي (Emerald Green)",
    theme: {
      titleColor: "#10B981",
      subtitleColor: "#9CA3AF",
      labelColor: "#E5E7EB",
      inputTextColor: "#FFFFFF",
      inputBgColor: "#1C2E2A",
      inputBorderColor: "#2A453E",
      inputFocusBorderColor: "#10B981",
      buttonBgColor: "#10B981",
      buttonTextColor: "#064E3B",
      buttonHoverColor: "#059669",
      brandingBgColor: "#059669",
      brandingTextColor: "#FFFFFF",
      brandingIconColor: "#FFFFFF",
    },
  },
  {
    name: "الأرجواني الفاخر (Royal Purple)",
    theme: {
      titleColor: "#A855F7",
      subtitleColor: "#A1A1AA",
      labelColor: "#F4F4F5",
      inputTextColor: "#FFFFFF",
      inputBgColor: "#2E1065",
      inputBorderColor: "#4C1D95",
      inputFocusBorderColor: "#A855F7",
      buttonBgColor: "#9333EA",
      buttonTextColor: "#FFFFFF",
      buttonHoverColor: "#7E22CE",
      brandingBgColor: "#7E22CE",
      brandingTextColor: "#FFFFFF",
      brandingIconColor: "#FFFFFF",
    },
  },
  {
    name: "الكهرماني الدافئ (Amber Glow)",
    theme: {
      titleColor: "#F59E0B",
      subtitleColor: "#D1D5DB",
      labelColor: "#F3F4F6",
      inputTextColor: "#FFFFFF",
      inputBgColor: "#2B2418",
      inputBorderColor: "#4A3E26",
      inputFocusBorderColor: "#F59E0B",
      buttonBgColor: "#F59E0B",
      buttonTextColor: "#1A1A1A",
      buttonHoverColor: "#D97706",
      brandingBgColor: "#D97706",
      brandingTextColor: "#FFFFFF",
      brandingIconColor: "#FFFFFF",
    },
  },
];

const AVAILABLE_ICONS = [
  "LogIn",
  "UserPlus",
  "Shield",
  "ShieldCheck",
  "Zap",
  "Headphones",
  "Package",
  "Sparkles",
  "KeyRound",
  "Lock",
  "User",
  "Mail",
  "CheckCircle2",
];

function renderDynamicIcon(iconName: string, className = "w-5 h-5") {
  switch (iconName) {
    case "LogIn":
      return <LogIn className={className} />;
    case "UserPlus":
      return <UserPlus className={className} />;
    case "Shield":
      return <Shield className={className} />;
    case "ShieldCheck":
      return <ShieldCheck className={className} />;
    case "Zap":
      return <Zap className={className} />;
    case "Headphones":
      return <Headphones className={className} />;
    case "Package":
      return <Package className={className} />;
    case "Sparkles":
      return <Sparkles className={className} />;
    case "KeyRound":
      return <KeyRound className={className} />;
    case "Lock":
      return <Lock className={className} />;
    case "User":
      return <User className={className} />;
    case "Mail":
      return <Mail className={className} />;
    default:
      return <CheckCircle2 className={className} />;
  }
}

export default function AuthPagesSettings() {
  const [activeTab, setActiveTab] = useState<"login" | "register" | "styles" | "preview">("login");
  const [config, setConfig] = useState<AuthPagesConfig>(DEFAULT_AUTH_PAGES_CONFIG);
  const [useLegacy, setUseLegacy] = useState<boolean>(false);
  const [loading, setLoading] = useState<boolean>(true);
  const [saving, setSaving] = useState<boolean>(false);
  const [previewMode, setPreviewMode] = useState<"login" | "register">("login");

  // Load configuration
  const fetchConfig = async () => {
    setLoading(true);
    try {
      const data = await get("/admin/auth-pages-config");
      if (data && data.config) {
        setConfig(data.config);
      }
      if (data && data.use_legacy_auth_pages !== undefined) {
        setUseLegacy(data.use_legacy_auth_pages === true || data.use_legacy_auth_pages === "true");
      }
    } catch (err: any) {
      console.warn("Failed to fetch auth pages config, using defaults:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchConfig();
  }, []);

  const handleSave = async () => {
    setSaving(true);
    try {
      await put("/admin/auth-pages-config", {
        config,
        use_legacy_auth_pages: useLegacy,
      });
      toast.success("تم حفظ إعدادات صفحات الدخول والتسجيل بنجاح!");
    } catch (err: any) {
      toast.error(err?.message || "فشل حفظ إعدادات صفحات الدخول والتسجيل");
    } finally {
      setSaving(false);
    }
  };

  const handleReset = () => {
    if (window.confirm("هل أنت متأكد من استعادة الإعدادات الافتراضية لصفحتي الدخول والتسجيل؟")) {
      setConfig(DEFAULT_AUTH_PAGES_CONFIG);
      setUseLegacy(false);
      toast.info("تمت استعادة الإعدادات الافتراضية، يرجى الضغط على حفظ لتطبيقها.");
    }
  };

  // Updaters for nested state
  const updateLogin = (key: keyof AuthPagesConfig["login"], value: any) => {
    setConfig((prev) => ({
      ...prev,
      login: { ...prev.login, [key]: value },
    }));
  };

  const updateLoginBranding = (key: keyof AuthPagesConfig["login"]["branding"], value: any) => {
    setConfig((prev) => ({
      ...prev,
      login: {
        ...prev.login,
        branding: { ...prev.login.branding, [key]: value },
      },
    }));
  };

  const updateLoginFields = (key: keyof AuthPagesConfig["login"]["fields"], value: any) => {
    setConfig((prev) => ({
      ...prev,
      login: {
        ...prev.login,
        fields: { ...prev.login.fields, [key]: value },
      },
    }));
  };

  const updateRegister = (key: keyof AuthPagesConfig["register"], value: any) => {
    setConfig((prev) => ({
      ...prev,
      register: { ...prev.register, [key]: value },
    }));
  };

  const updateRegisterBranding = (key: keyof AuthPagesConfig["register"]["branding"], value: any) => {
    setConfig((prev) => ({
      ...prev,
      register: {
        ...prev.register,
        branding: { ...prev.register.branding, [key]: value },
      },
    }));
  };

  const updateRegisterFields = (key: keyof AuthPagesConfig["register"]["fields"], value: any) => {
    setConfig((prev) => ({
      ...prev,
      register: {
        ...prev.register,
        fields: { ...prev.register.fields, [key]: value },
      },
    }));
  };

  const updatePasswordRequirements = (
    key: keyof AuthPagesConfig["register"]["passwordRequirements"],
    value: any
  ) => {
    setConfig((prev) => ({
      ...prev,
      register: {
        ...prev.register,
        passwordRequirements: { ...prev.register.passwordRequirements, [key]: value },
      },
    }));
  };

  const updateEmailVerification = (
    key: keyof AuthPagesConfig["register"]["emailVerification"],
    value: any
  ) => {
    setConfig((prev) => ({
      ...prev,
      register: {
        ...prev.register,
        emailVerification: { ...prev.register.emailVerification, [key]: value },
      },
    }));
  };

  const updateCommon = (key: keyof AuthPagesConfig["common"], value: any) => {
    setConfig((prev) => ({
      ...prev,
      common: { ...prev.common, [key]: value },
    }));
  };

  const updateStyles = (key: keyof AuthPagesConfig["common"]["styles"], value: string) => {
    setConfig((prev) => ({
      ...prev,
      common: {
        ...prev.common,
        styles: { ...prev.common.styles, [key]: value },
      },
    }));
  };

  const addBenefit = (page: "login" | "register") => {
    const defaultBenefit: BenefitItem = { icon: "CheckCircle2", text: "ميزة إضافية مميزة" };
    if (page === "login") {
      setConfig((prev) => ({
        ...prev,
        login: {
          ...prev.login,
          branding: {
            ...prev.login.branding,
            benefits: [...prev.login.branding.benefits, defaultBenefit],
          },
        },
      }));
    } else {
      setConfig((prev) => ({
        ...prev,
        register: {
          ...prev.register,
          branding: {
            ...prev.register.branding,
            benefits: [...prev.register.branding.benefits, defaultBenefit],
          },
        },
      }));
    }
  };

  const removeBenefit = (page: "login" | "register", index: number) => {
    if (page === "login") {
      setConfig((prev) => ({
        ...prev,
        login: {
          ...prev.login,
          branding: {
            ...prev.login.branding,
            benefits: prev.login.branding.benefits.filter((_, i) => i !== index),
          },
        },
      }));
    } else {
      setConfig((prev) => ({
        ...prev,
        register: {
          ...prev.register,
          branding: {
            ...prev.register.branding,
            benefits: prev.register.branding.benefits.filter((_, i) => i !== index),
          },
        },
      }));
    }
  };

  const updateBenefit = (
    page: "login" | "register",
    index: number,
    field: "icon" | "text",
    value: string
  ) => {
    if (page === "login") {
      const list = [...config.login.branding.benefits];
      list[index] = { ...list[index], [field]: value };
      updateLoginBranding("benefits", list);
    } else {
      const list = [...config.register.branding.benefits];
      list[index] = { ...list[index], [field]: value };
      updateRegisterBranding("benefits", list);
    }
  };

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[400px] text-[#C8A45C] gap-3">
        <div className="w-8 h-8 border-2 border-[#C8A45C] border-t-transparent rounded-full animate-spin" />
        <span className="text-sm font-semibold">جاري تحميل إعدادات صفحات الدخول والتسجيل...</span>
      </div>
    );
  }

  return (
    <div className="space-y-6 pb-20" dir="rtl">
      {/* Header Bar */}
      <div className="flex flex-col lg:flex-row items-start lg:items-center justify-between gap-4 bg-[#242424] p-5 sm:p-6 rounded-2xl border border-[#C8A45C]/20 shadow-md">
        <div>
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-[#C8A45C]/10 border border-[#C8A45C]/30 flex items-center justify-center text-[#C8A45C]">
              <LogIn className="w-5 h-5" />
            </div>
            <div>
              <h1 className="text-xl sm:text-2xl font-bold text-white tracking-wide">
                تخصيص صفحات الدخول والتسجيل
              </h1>
              <p className="text-xs sm:text-sm text-zinc-400 mt-0.5">
                التحكم الكامل بالعناوين والنصوص، المميزات، المتطلبات، والألوان لصفحتي الدخول والتسجيل
              </p>
            </div>
          </div>
        </div>

        {/* Global Controls & Actions */}
        <div className="flex flex-wrap items-center gap-2.5 w-full lg:w-auto">
          <a
            href="/login"
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center gap-1.5 px-3 py-2 bg-zinc-800 hover:bg-zinc-700 text-zinc-200 text-xs rounded-xl font-semibold border border-zinc-700 transition"
          >
            <ExternalLink className="w-3.5 h-3.5" />
            <span>معاينة الدخول</span>
          </a>

          <a
            href="/register"
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center gap-1.5 px-3 py-2 bg-zinc-800 hover:bg-zinc-700 text-zinc-200 text-xs rounded-xl font-semibold border border-zinc-700 transition"
          >
            <ExternalLink className="w-3.5 h-3.5" />
            <span>معاينة التسجيل</span>
          </a>

          <button
            type="button"
            onClick={handleReset}
            className="flex items-center gap-1.5 px-3 py-2 bg-zinc-800 hover:bg-zinc-700 text-zinc-300 text-xs rounded-xl font-semibold border border-zinc-700 transition"
          >
            <RotateCcw className="w-3.5 h-3.5" />
            <span>استعادة الافتراضي</span>
          </button>

          <button
            type="button"
            onClick={handleSave}
            disabled={saving}
            className="flex items-center gap-2 px-5 py-2 bg-[#C8A45C] hover:bg-[#B8954A] text-zinc-950 text-xs font-black rounded-xl shadow-lg transition disabled:opacity-50"
          >
            {saving ? (
              <RefreshCw className="w-4 h-4 animate-spin" />
            ) : (
              <Save className="w-4 h-4" />
            )}
            <span>{saving ? "جاري الحفظ..." : "حفظ التغييرات"}</span>
          </button>
        </div>
      </div>

      {/* Tabs Navigation */}
      <div className="flex flex-wrap items-center gap-2 border-b border-zinc-800 pb-2">
        <button
          type="button"
          onClick={() => setActiveTab("login")}
          className={`flex items-center gap-2 px-4 py-2.5 rounded-xl font-bold text-sm transition ${
            activeTab === "login"
              ? "bg-[#C8A45C] text-zinc-950 shadow-md"
              : "bg-[#242424] text-zinc-300 hover:bg-[#2A2A2A] border border-zinc-800"
          }`}
        >
          <LogIn className="w-4 h-4" />
          <span>صفحة تسجيل الدخول (/login)</span>
        </button>

        <button
          type="button"
          onClick={() => setActiveTab("register")}
          className={`flex items-center gap-2 px-4 py-2.5 rounded-xl font-bold text-sm transition ${
            activeTab === "register"
              ? "bg-[#C8A45C] text-zinc-950 shadow-md"
              : "bg-[#242424] text-zinc-300 hover:bg-[#2A2A2A] border border-zinc-800"
          }`}
        >
          <UserPlus className="w-4 h-4" />
          <span>صفحة إنشاء الحساب (/register)</span>
        </button>

        <button
          type="button"
          onClick={() => setActiveTab("styles")}
          className={`flex items-center gap-2 px-4 py-2.5 rounded-xl font-bold text-sm transition ${
            activeTab === "styles"
              ? "bg-[#C8A45C] text-zinc-950 shadow-md"
              : "bg-[#242424] text-zinc-300 hover:bg-[#2A2A2A] border border-zinc-800"
          }`}
        >
          <Palette className="w-4 h-4" />
          <span>الألوان والمظهر العام</span>
        </button>

        <button
          type="button"
          onClick={() => setActiveTab("preview")}
          className={`flex items-center gap-2 px-4 py-2.5 rounded-xl font-bold text-sm transition mr-auto ${
            activeTab === "preview"
              ? "bg-[#C8A45C] text-zinc-950 shadow-md"
              : "bg-[#242424] text-zinc-300 hover:bg-[#2A2A2A] border border-zinc-800"
          }`}
        >
          <Eye className="w-4 h-4" />
          <span>معاينة حية مدمجة</span>
        </button>
      </div>

      {/* TAB 1: LOGIN PAGE SETTINGS */}
      {activeTab === "login" && (
        <div className="space-y-6">
          {/* Section 1: العناوين الأساسية */}
          <div className="bg-[#242424] p-5 sm:p-6 rounded-2xl border border-zinc-800 space-y-4">
            <h3 className="text-base font-bold text-white flex items-center gap-2">
              <Sliders className="w-4 h-4 text-[#C8A45C]" />
              <span>العناوين الرئيسية للنموذج</span>
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-semibold text-zinc-300 mb-1.5">
                  عنوان الصفحة الرئيسي
                </label>
                <input
                  type="text"
                  value={config.login.title}
                  onChange={(e) => updateLogin("title", e.target.value)}
                  className="w-full bg-[#1E1E1E] border border-zinc-700 rounded-xl px-3.5 py-2.5 text-sm text-white focus:outline-none focus:border-[#C8A45C]"
                  placeholder="تسجيل الدخول"
                />
              </div>
              <div>
                <label className="block text-xs font-semibold text-zinc-300 mb-1.5">
                  النص الترحيبي الفرعي
                </label>
                <input
                  type="text"
                  value={config.login.subtitle}
                  onChange={(e) => updateLogin("subtitle", e.target.value)}
                  className="w-full bg-[#1E1E1E] border border-zinc-700 rounded-xl px-3.5 py-2.5 text-sm text-white focus:outline-none focus:border-[#C8A45C]"
                  placeholder="مرحباً بك مجدداً"
                />
              </div>
            </div>
          </div>

          {/* Section 2: لوحة العلامة التجارية (Branding Side) */}
          <div className="bg-[#242424] p-5 sm:p-6 rounded-2xl border border-zinc-800 space-y-5">
            <div className="flex items-center justify-between">
              <h3 className="text-base font-bold text-white flex items-center gap-2">
                <Sparkles className="w-4 h-4 text-[#C8A45C]" />
                <span>الجانب الأيمن (لوحة العلامة التجارية الترحيبية)</span>
              </h3>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div>
                <label className="block text-xs font-semibold text-zinc-300 mb-1.5">
                  عنوان اللوحة الترحيبية
                </label>
                <input
                  type="text"
                  value={config.login.branding.title}
                  onChange={(e) => updateLoginBranding("title", e.target.value)}
                  className="w-full bg-[#1E1E1E] border border-zinc-700 rounded-xl px-3.5 py-2.5 text-sm text-white focus:outline-none focus:border-[#C8A45C]"
                  placeholder="أهلاً بعودتك!"
                />
              </div>
              <div>
                <label className="block text-xs font-semibold text-zinc-300 mb-1.5">
                  النص الترحيبي للوحة
                </label>
                <input
                  type="text"
                  value={config.login.branding.subtitle}
                  onChange={(e) => updateLoginBranding("subtitle", e.target.value)}
                  className="w-full bg-[#1E1E1E] border border-zinc-700 rounded-xl px-3.5 py-2.5 text-sm text-white focus:outline-none focus:border-[#C8A45C]"
                  placeholder="سجل دخولك للوصول إلى حسابك وخدماتك"
                />
              </div>
              <div>
                <label className="block text-xs font-semibold text-zinc-300 mb-1.5">
                  أيقونة اللوحة الترحيبية
                </label>
                <select
                  value={config.login.branding.icon}
                  onChange={(e) => updateLoginBranding("icon", e.target.value)}
                  className="w-full bg-[#1E1E1E] border border-zinc-700 rounded-xl px-3.5 py-2.5 text-sm text-white focus:outline-none focus:border-[#C8A45C]"
                >
                  {AVAILABLE_ICONS.map((ic) => (
                    <option key={ic} value={ic}>
                      {ic}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            {/* Benefits List */}
            <div className="pt-3 border-t border-zinc-800">
              <div className="flex items-center justify-between mb-3">
                <label className="text-xs font-bold text-zinc-300">
                  قائمة المميزات الترحيبية (تظهر داخل اللوحة الترحيبية)
                </label>
                <button
                  type="button"
                  onClick={() => addBenefit("login")}
                  className="flex items-center gap-1 text-xs text-[#C8A45C] hover:text-[#B8954A] font-bold"
                >
                  <Plus className="w-3.5 h-3.5" />
                  <span>إضافة ميزة</span>
                </button>
              </div>

              <div className="space-y-2.5">
                {config.login.branding.benefits.map((b, idx) => (
                  <div
                    key={idx}
                    className="flex items-center gap-3 bg-[#1E1E1E] p-3 rounded-xl border border-zinc-800"
                  >
                    <select
                      value={b.icon}
                      onChange={(e) => updateBenefit("login", idx, "icon", e.target.value)}
                      className="w-36 bg-zinc-900 border border-zinc-700 rounded-lg px-2.5 py-1.5 text-xs text-white focus:outline-none"
                    >
                      {AVAILABLE_ICONS.map((ic) => (
                        <option key={ic} value={ic}>
                          {ic}
                        </option>
                      ))}
                    </select>

                    <input
                      type="text"
                      value={b.text}
                      onChange={(e) => updateBenefit("login", idx, "text", e.target.value)}
                      className="flex-1 bg-zinc-900 border border-zinc-700 rounded-lg px-3 py-1.5 text-xs text-white focus:outline-none"
                      placeholder="نص الميزة (مثال: حساب آمن ومحمي)"
                    />

                    <button
                      type="button"
                      onClick={() => removeBenefit("login", idx)}
                      className="p-1.5 text-red-400 hover:text-red-300 hover:bg-red-500/10 rounded-lg transition"
                      title="حذف الميزة"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* Section 3: حقول النموذج والنصوص */}
          <div className="bg-[#242424] p-5 sm:p-6 rounded-2xl border border-zinc-800 space-y-4">
            <h3 className="text-base font-bold text-white flex items-center gap-2">
              <User className="w-4 h-4 text-[#C8A45C]" />
              <span>نصوص وحقول نموذج تسجيل الدخول</span>
            </h3>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-semibold text-zinc-300 mb-1.5">
                  تسمية حقل اسم المستخدم
                </label>
                <input
                  type="text"
                  value={config.login.fields.usernameLabel}
                  onChange={(e) => updateLoginFields("usernameLabel", e.target.value)}
                  className="w-full bg-[#1E1E1E] border border-zinc-700 rounded-xl px-3.5 py-2.5 text-sm text-white focus:outline-none focus:border-[#C8A45C]"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-zinc-300 mb-1.5">
                  النص التلميحي لحقل اسم المستخدم (Placeholder)
                </label>
                <input
                  type="text"
                  value={config.login.fields.usernamePlaceholder}
                  onChange={(e) => updateLoginFields("usernamePlaceholder", e.target.value)}
                  className="w-full bg-[#1E1E1E] border border-zinc-700 rounded-xl px-3.5 py-2.5 text-sm text-white focus:outline-none focus:border-[#C8A45C]"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-zinc-300 mb-1.5">
                  تسمية حقل كلمة المرور
                </label>
                <input
                  type="text"
                  value={config.login.fields.passwordLabel}
                  onChange={(e) => updateLoginFields("passwordLabel", e.target.value)}
                  className="w-full bg-[#1E1E1E] border border-zinc-700 rounded-xl px-3.5 py-2.5 text-sm text-white focus:outline-none focus:border-[#C8A45C]"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-zinc-300 mb-1.5">
                  النص التلميحي لحقل كلمة المرور (Placeholder)
                </label>
                <input
                  type="text"
                  value={config.login.fields.passwordPlaceholder}
                  onChange={(e) => updateLoginFields("passwordPlaceholder", e.target.value)}
                  className="w-full bg-[#1E1E1E] border border-zinc-700 rounded-xl px-3.5 py-2.5 text-sm text-white focus:outline-none focus:border-[#C8A45C]"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-zinc-300 mb-1.5">
                  نص زر تسجيل الدخول
                </label>
                <input
                  type="text"
                  value={config.login.fields.submitButtonText}
                  onChange={(e) => updateLoginFields("submitButtonText", e.target.value)}
                  className="w-full bg-[#1E1E1E] border border-zinc-700 rounded-xl px-3.5 py-2.5 text-sm text-white focus:outline-none focus:border-[#C8A45C]"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-zinc-300 mb-1.5">
                  نص التحويل إلى صفحة التسجيل
                </label>
                <div className="grid grid-cols-2 gap-2">
                  <input
                    type="text"
                    value={config.login.fields.switchToRegisterText}
                    onChange={(e) => updateLoginFields("switchToRegisterText", e.target.value)}
                    className="w-full bg-[#1E1E1E] border border-zinc-700 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-[#C8A45C]"
                    placeholder="ليس لديك حساب؟"
                  />
                  <input
                    type="text"
                    value={config.login.fields.switchToRegisterLink}
                    onChange={(e) => updateLoginFields("switchToRegisterLink", e.target.value)}
                    className="w-full bg-[#1E1E1E] border border-zinc-700 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-[#C8A45C]"
                    placeholder="إنشاء حساب جديد"
                  />
                </div>
              </div>
            </div>

            {/* Forgot Password Toggle */}
            <div className="pt-3 border-t border-zinc-800 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div className="flex items-center gap-3">
                <input
                  type="checkbox"
                  id="showForgotPassword"
                  checked={config.login.fields.showForgotPassword}
                  onChange={(e) => updateLoginFields("showForgotPassword", e.target.checked)}
                  className="w-4 h-4 accent-[#C8A45C] rounded cursor-pointer"
                />
                <label htmlFor="showForgotPassword" className="text-xs font-semibold text-zinc-200 cursor-pointer">
                  إظهار رابط "نسيت كلمة المرور؟"
                </label>
              </div>

              {config.login.fields.showForgotPassword && (
                <div className="flex items-center gap-2">
                  <label className="text-xs text-zinc-400">نص الرابط:</label>
                  <input
                    type="text"
                    value={config.login.fields.forgotPasswordText}
                    onChange={(e) => updateLoginFields("forgotPasswordText", e.target.value)}
                    className="bg-[#1E1E1E] border border-zinc-700 rounded-xl px-3 py-1.5 text-xs text-white focus:outline-none focus:border-[#C8A45C]"
                    placeholder="نسيت كلمة السر؟"
                  />
                </div>
              )}
            </div>
          </div>

          {/* Section 4: خيارات Google والفاصل */}
          <div className="bg-[#242424] p-5 sm:p-6 rounded-2xl border border-zinc-800 space-y-4">
            <h3 className="text-base font-bold text-white flex items-center gap-2">
              <KeyRound className="w-4 h-4 text-[#C8A45C]" />
              <span>تسجيل الدخول عبر Google والفاصل</span>
            </h3>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {/* Google Button */}
              <div className="bg-[#1E1E1E] p-4 rounded-xl border border-zinc-800 space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-white">زر تسجيل الدخول عبر Google</span>
                  <input
                    type="checkbox"
                    checked={config.login.showGoogleButton}
                    onChange={(e) => updateLogin("showGoogleButton", e.target.checked)}
                    className="w-4 h-4 accent-[#C8A45C] rounded cursor-pointer"
                  />
                </div>
                {config.login.showGoogleButton && (
                  <div>
                    <label className="block text-xs text-zinc-400 mb-1">نص الزر:</label>
                    <input
                      type="text"
                      value={config.login.googleButtonText}
                      onChange={(e) => updateLogin("googleButtonText", e.target.value)}
                      className="w-full bg-zinc-900 border border-zinc-700 rounded-lg px-3 py-2 text-xs text-white focus:outline-none"
                    />
                  </div>
                )}
              </div>

              {/* Divider */}
              <div className="bg-[#1E1E1E] p-4 rounded-xl border border-zinc-800 space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-white">خط الفاصل بين الخيارات</span>
                  <input
                    type="checkbox"
                    checked={config.login.showDivider}
                    onChange={(e) => updateLogin("showDivider", e.target.checked)}
                    className="w-4 h-4 accent-[#C8A45C] rounded cursor-pointer"
                  />
                </div>
                {config.login.showDivider && (
                  <div>
                    <label className="block text-xs text-zinc-400 mb-1">نص الفاصل:</label>
                    <input
                      type="text"
                      value={config.login.dividerText}
                      onChange={(e) => updateLogin("dividerText", e.target.value)}
                      className="w-full bg-zinc-900 border border-zinc-700 rounded-lg px-3 py-2 text-xs text-white focus:outline-none"
                    />
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* TAB 2: REGISTER PAGE SETTINGS */}
      {activeTab === "register" && (
        <div className="space-y-6">
          {/* Section 1: العناوين الأساسية */}
          <div className="bg-[#242424] p-5 sm:p-6 rounded-2xl border border-zinc-800 space-y-4">
            <h3 className="text-base font-bold text-white flex items-center gap-2">
              <Sliders className="w-4 h-4 text-[#C8A45C]" />
              <span>العناوين الرئيسية لصفحة إنشاء الحساب</span>
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-semibold text-zinc-300 mb-1.5">
                  عنوان الصفحة الرئيسي
                </label>
                <input
                  type="text"
                  value={config.register.title}
                  onChange={(e) => updateRegister("title", e.target.value)}
                  className="w-full bg-[#1E1E1E] border border-zinc-700 rounded-xl px-3.5 py-2.5 text-sm text-white focus:outline-none focus:border-[#C8A45C]"
                  placeholder="إنشاء حساب جديد"
                />
              </div>
              <div>
                <label className="block text-xs font-semibold text-zinc-300 mb-1.5">
                  النص الترحيبي الفرعي
                </label>
                <input
                  type="text"
                  value={config.register.subtitle}
                  onChange={(e) => updateRegister("subtitle", e.target.value)}
                  className="w-full bg-[#1E1E1E] border border-zinc-700 rounded-xl px-3.5 py-2.5 text-sm text-white focus:outline-none focus:border-[#C8A45C]"
                  placeholder="انضم إلينا الآن"
                />
              </div>
            </div>
          </div>

          {/* Section 2: لوحة العلامة التجارية (Branding Side) */}
          <div className="bg-[#242424] p-5 sm:p-6 rounded-2xl border border-zinc-800 space-y-5">
            <h3 className="text-base font-bold text-white flex items-center gap-2">
              <Sparkles className="w-4 h-4 text-[#C8A45C]" />
              <span>الجانب الأيمن (لوحة العلامة التجارية لإنشاء الحساب)</span>
            </h3>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div>
                <label className="block text-xs font-semibold text-zinc-300 mb-1.5">
                  عنوان اللوحة
                </label>
                <input
                  type="text"
                  value={config.register.branding.title}
                  onChange={(e) => updateRegisterBranding("title", e.target.value)}
                  className="w-full bg-[#1E1E1E] border border-zinc-700 rounded-xl px-3.5 py-2.5 text-sm text-white focus:outline-none focus:border-[#C8A45C]"
                  placeholder="انضم إلينا"
                />
              </div>
              <div>
                <label className="block text-xs font-semibold text-zinc-300 mb-1.5">
                  النص الترحيبي للوحة
                </label>
                <input
                  type="text"
                  value={config.register.branding.subtitle}
                  onChange={(e) => updateRegisterBranding("subtitle", e.target.value)}
                  className="w-full bg-[#1E1E1E] border border-zinc-700 rounded-xl px-3.5 py-2.5 text-sm text-white focus:outline-none focus:border-[#C8A45C]"
                  placeholder="أنشئ حسابك الآن وابدأ تجربتك"
                />
              </div>
              <div>
                <label className="block text-xs font-semibold text-zinc-300 mb-1.5">
                  أيقونة اللوحة
                </label>
                <select
                  value={config.register.branding.icon}
                  onChange={(e) => updateRegisterBranding("icon", e.target.value)}
                  className="w-full bg-[#1E1E1E] border border-zinc-700 rounded-xl px-3.5 py-2.5 text-sm text-white focus:outline-none focus:border-[#C8A45C]"
                >
                  {AVAILABLE_ICONS.map((ic) => (
                    <option key={ic} value={ic}>
                      {ic}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            {/* Benefits List */}
            <div className="pt-3 border-t border-zinc-800">
              <div className="flex items-center justify-between mb-3">
                <label className="text-xs font-bold text-zinc-300">
                  قائمة مميزات الانضمام والتسجيل
                </label>
                <button
                  type="button"
                  onClick={() => addBenefit("register")}
                  className="flex items-center gap-1 text-xs text-[#C8A45C] hover:text-[#B8954A] font-bold"
                >
                  <Plus className="w-3.5 h-3.5" />
                  <span>إضافة ميزة</span>
                </button>
              </div>

              <div className="space-y-2.5">
                {config.register.branding.benefits.map((b, idx) => (
                  <div
                    key={idx}
                    className="flex items-center gap-3 bg-[#1E1E1E] p-3 rounded-xl border border-zinc-800"
                  >
                    <select
                      value={b.icon}
                      onChange={(e) => updateBenefit("register", idx, "icon", e.target.value)}
                      className="w-36 bg-zinc-900 border border-zinc-700 rounded-lg px-2.5 py-1.5 text-xs text-white focus:outline-none"
                    >
                      {AVAILABLE_ICONS.map((ic) => (
                        <option key={ic} value={ic}>
                          {ic}
                        </option>
                      ))}
                    </select>

                    <input
                      type="text"
                      value={b.text}
                      onChange={(e) => updateBenefit("register", idx, "text", e.target.value)}
                      className="flex-1 bg-zinc-900 border border-zinc-700 rounded-lg px-3 py-1.5 text-xs text-white focus:outline-none"
                      placeholder="نص الميزة"
                    />

                    <button
                      type="button"
                      onClick={() => removeBenefit("register", idx)}
                      className="p-1.5 text-red-400 hover:text-red-300 hover:bg-red-500/10 rounded-lg transition"
                      title="حذف الميزة"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* Section 3: حقول نموذج إنشاء الحساب */}
          <div className="bg-[#242424] p-5 sm:p-6 rounded-2xl border border-zinc-800 space-y-4">
            <h3 className="text-base font-bold text-white flex items-center gap-2">
              <UserPlus className="w-4 h-4 text-[#C8A45C]" />
              <span>نصوص وتسميات حقول التسجيل</span>
            </h3>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-semibold text-zinc-300 mb-1.5">
                  تسمية حقل اسم المستخدم
                </label>
                <input
                  type="text"
                  value={config.register.fields.usernameLabel}
                  onChange={(e) => updateRegisterFields("usernameLabel", e.target.value)}
                  className="w-full bg-[#1E1E1E] border border-zinc-700 rounded-xl px-3.5 py-2.5 text-sm text-white focus:outline-none focus:border-[#C8A45C]"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-zinc-300 mb-1.5">
                  النص التلميحي لاسم المستخدم (Placeholder)
                </label>
                <input
                  type="text"
                  value={config.register.fields.usernamePlaceholder}
                  onChange={(e) => updateRegisterFields("usernamePlaceholder", e.target.value)}
                  className="w-full bg-[#1E1E1E] border border-zinc-700 rounded-xl px-3.5 py-2.5 text-sm text-white focus:outline-none focus:border-[#C8A45C]"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-zinc-300 mb-1.5">
                  نص التلميح أسفل حقل اسم المستخدم (Hint)
                </label>
                <input
                  type="text"
                  value={config.register.fields.usernameHint}
                  onChange={(e) => updateRegisterFields("usernameHint", e.target.value)}
                  className="w-full bg-[#1E1E1E] border border-zinc-700 rounded-xl px-3.5 py-2.5 text-sm text-white focus:outline-none focus:border-[#C8A45C]"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-zinc-300 mb-1.5">
                  تسمية حقل البريد الإلكتروني
                </label>
                <input
                  type="text"
                  value={config.register.fields.emailLabel}
                  onChange={(e) => updateRegisterFields("emailLabel", e.target.value)}
                  className="w-full bg-[#1E1E1E] border border-zinc-700 rounded-xl px-3.5 py-2.5 text-sm text-white focus:outline-none focus:border-[#C8A45C]"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-zinc-300 mb-1.5">
                  النص التلميحي للبريد الإلكتروني
                </label>
                <input
                  type="text"
                  value={config.register.fields.emailPlaceholder}
                  onChange={(e) => updateRegisterFields("emailPlaceholder", e.target.value)}
                  className="w-full bg-[#1E1E1E] border border-zinc-700 rounded-xl px-3.5 py-2.5 text-sm text-white focus:outline-none focus:border-[#C8A45C]"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-zinc-300 mb-1.5">
                  تسمية حقل كلمة المرور
                </label>
                <input
                  type="text"
                  value={config.register.fields.passwordLabel}
                  onChange={(e) => updateRegisterFields("passwordLabel", e.target.value)}
                  className="w-full bg-[#1E1E1E] border border-zinc-700 rounded-xl px-3.5 py-2.5 text-sm text-white focus:outline-none focus:border-[#C8A45C]"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-zinc-300 mb-1.5">
                  تسمية حقل تأكيد كلمة المرور
                </label>
                <input
                  type="text"
                  value={config.register.fields.confirmPasswordLabel}
                  onChange={(e) => updateRegisterFields("confirmPasswordLabel", e.target.value)}
                  className="w-full bg-[#1E1E1E] border border-zinc-700 rounded-xl px-3.5 py-2.5 text-sm text-white focus:outline-none focus:border-[#C8A45C]"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-zinc-300 mb-1.5">
                  نص زر إنشاء الحساب
                </label>
                <input
                  type="text"
                  value={config.register.fields.submitButtonText}
                  onChange={(e) => updateRegisterFields("submitButtonText", e.target.value)}
                  className="w-full bg-[#1E1E1E] border border-zinc-700 rounded-xl px-3.5 py-2.5 text-sm text-white focus:outline-none focus:border-[#C8A45C]"
                />
              </div>

              <div className="md:col-span-2">
                <label className="block text-xs font-semibold text-zinc-300 mb-1.5">
                  نص التحويل إلى صفحة تسجيل الدخول
                </label>
                <div className="grid grid-cols-2 gap-2">
                  <input
                    type="text"
                    value={config.register.fields.switchToLoginText}
                    onChange={(e) => updateRegisterFields("switchToLoginText", e.target.value)}
                    className="w-full bg-[#1E1E1E] border border-zinc-700 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-[#C8A45C]"
                    placeholder="لديك حساب بالفعل؟"
                  />
                  <input
                    type="text"
                    value={config.register.fields.switchToLoginLink}
                    onChange={(e) => updateRegisterFields("switchToLoginLink", e.target.value)}
                    className="w-full bg-[#1E1E1E] border border-zinc-700 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-[#C8A45C]"
                    placeholder="تسجيل الدخول"
                  />
                </div>
              </div>
            </div>
          </div>

          {/* Section 4: متطلبات كلمة المرور (Password Requirements) */}
          <div className="bg-[#242424] p-5 sm:p-6 rounded-2xl border border-zinc-800 space-y-5">
            <div className="flex items-center justify-between">
              <h3 className="text-base font-bold text-white flex items-center gap-2">
                <ShieldCheck className="w-4 h-4 text-[#C8A45C]" />
                <span>إعدادات صندوق متطلبات كلمة المرور</span>
              </h3>
              <div className="flex items-center gap-2">
                <span className="text-xs text-zinc-400">تفعيل الصندوق:</span>
                <input
                  type="checkbox"
                  checked={config.register.passwordRequirements.enabled}
                  onChange={(e) => updatePasswordRequirements("enabled", e.target.checked)}
                  className="w-4 h-4 accent-[#C8A45C] rounded cursor-pointer"
                />
              </div>
            </div>

            {config.register.passwordRequirements.enabled && (
              <div className="space-y-4 pt-2 border-t border-zinc-800">
                <div>
                  <label className="block text-xs font-semibold text-zinc-300 mb-1">
                    عنوان صندوق المتطلبات
                  </label>
                  <input
                    type="text"
                    value={config.register.passwordRequirements.title}
                    onChange={(e) => updatePasswordRequirements("title", e.target.value)}
                    className="w-full bg-[#1E1E1E] border border-zinc-700 rounded-xl px-3.5 py-2 text-xs text-white focus:outline-none focus:border-[#C8A45C]"
                    placeholder="متطلبات كلمة المرور"
                  />
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  {/* Min length */}
                  <div className="bg-[#1E1E1E] p-3.5 rounded-xl border border-zinc-800 flex items-center justify-between gap-3">
                    <div className="flex items-center gap-2">
                      <input
                        type="checkbox"
                        checked={config.register.passwordRequirements.showMinLength}
                        onChange={(e) => updatePasswordRequirements("showMinLength", e.target.checked)}
                        className="w-4 h-4 accent-[#C8A45C] rounded cursor-pointer"
                      />
                      <span className="text-xs font-bold text-zinc-200">الحد الأدنى للطول:</span>
                    </div>
                    <input
                      type="number"
                      min={4}
                      max={32}
                      value={config.register.passwordRequirements.minLength}
                      onChange={(e) => updatePasswordRequirements("minLength", Number(e.target.value) || 8)}
                      className="w-20 bg-zinc-900 border border-zinc-700 rounded-lg px-2.5 py-1 text-xs text-white text-center focus:outline-none"
                    />
                  </div>

                  {/* Uppercase */}
                  <div className="bg-[#1E1E1E] p-3.5 rounded-xl border border-zinc-800 flex items-center justify-between gap-3">
                    <div className="flex items-center gap-2">
                      <input
                        type="checkbox"
                        checked={config.register.passwordRequirements.showUppercase}
                        onChange={(e) => updatePasswordRequirements("showUppercase", e.target.checked)}
                        className="w-4 h-4 accent-[#C8A45C] rounded cursor-pointer"
                      />
                      <span className="text-xs font-bold text-zinc-200">حرف كبير (A-Z)</span>
                    </div>
                    <input
                      type="text"
                      value={config.register.passwordRequirements.uppercaseText}
                      onChange={(e) => updatePasswordRequirements("uppercaseText", e.target.value)}
                      className="w-40 bg-zinc-900 border border-zinc-700 rounded-lg px-2.5 py-1 text-xs text-white focus:outline-none"
                    />
                  </div>

                  {/* Lowercase */}
                  <div className="bg-[#1E1E1E] p-3.5 rounded-xl border border-zinc-800 flex items-center justify-between gap-3">
                    <div className="flex items-center gap-2">
                      <input
                        type="checkbox"
                        checked={config.register.passwordRequirements.showLowercase}
                        onChange={(e) => updatePasswordRequirements("showLowercase", e.target.checked)}
                        className="w-4 h-4 accent-[#C8A45C] rounded cursor-pointer"
                      />
                      <span className="text-xs font-bold text-zinc-200">حرف صغير (a-z)</span>
                    </div>
                    <input
                      type="text"
                      value={config.register.passwordRequirements.lowercaseText}
                      onChange={(e) => updatePasswordRequirements("lowercaseText", e.target.value)}
                      className="w-40 bg-zinc-900 border border-zinc-700 rounded-lg px-2.5 py-1 text-xs text-white focus:outline-none"
                    />
                  </div>

                  {/* Number */}
                  <div className="bg-[#1E1E1E] p-3.5 rounded-xl border border-zinc-800 flex items-center justify-between gap-3">
                    <div className="flex items-center gap-2">
                      <input
                        type="checkbox"
                        checked={config.register.passwordRequirements.showNumber}
                        onChange={(e) => updatePasswordRequirements("showNumber", e.target.checked)}
                        className="w-4 h-4 accent-[#C8A45C] rounded cursor-pointer"
                      />
                      <span className="text-xs font-bold text-zinc-200">رقم واحد (0-9)</span>
                    </div>
                    <input
                      type="text"
                      value={config.register.passwordRequirements.numberText}
                      onChange={(e) => updatePasswordRequirements("numberText", e.target.value)}
                      className="w-40 bg-zinc-900 border border-zinc-700 rounded-lg px-2.5 py-1 text-xs text-white focus:outline-none"
                    />
                  </div>

                  {/* Special */}
                  <div className="bg-[#1E1E1E] p-3.5 rounded-xl border border-zinc-800 flex items-center justify-between gap-3 md:col-span-2">
                    <div className="flex items-center gap-2">
                      <input
                        type="checkbox"
                        checked={config.register.passwordRequirements.showSpecial}
                        onChange={(e) => updatePasswordRequirements("showSpecial", e.target.checked)}
                        className="w-4 h-4 accent-[#C8A45C] rounded cursor-pointer"
                      />
                      <span className="text-xs font-bold text-zinc-200">رمز خاص (@#$%)</span>
                    </div>
                    <input
                      type="text"
                      value={config.register.passwordRequirements.specialText}
                      onChange={(e) => updatePasswordRequirements("specialText", e.target.value)}
                      className="w-56 bg-zinc-900 border border-zinc-700 rounded-lg px-2.5 py-1 text-xs text-white focus:outline-none"
                    />
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* Section 5: تنبيه التحقق من البريد الإلكتروني & Google Button */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* Email Verification Hint */}
            <div className="bg-[#242424] p-5 rounded-2xl border border-zinc-800 space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-sm font-bold text-white flex items-center gap-2">
                  <Mail className="w-4 h-4 text-[#C8A45C]" />
                  <span>تنبيه التحقق من البريد</span>
                </span>
                <input
                  type="checkbox"
                  checked={config.register.emailVerification.enabled}
                  onChange={(e) => updateEmailVerification("enabled", e.target.checked)}
                  className="w-4 h-4 accent-[#C8A45C] rounded cursor-pointer"
                />
              </div>
              {config.register.emailVerification.enabled && (
                <div>
                  <label className="block text-xs text-zinc-400 mb-1">نص التنبيه:</label>
                  <textarea
                    rows={2}
                    value={config.register.emailVerification.hintText}
                    onChange={(e) => updateEmailVerification("hintText", e.target.value)}
                    className="w-full bg-[#1E1E1E] border border-zinc-700 rounded-lg px-3 py-2 text-xs text-white focus:outline-none resize-none"
                  />
                </div>
              )}
            </div>

            {/* Google Register Button & Divider */}
            <div className="bg-[#242424] p-5 rounded-2xl border border-zinc-800 space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-sm font-bold text-white flex items-center gap-2">
                  <KeyRound className="w-4 h-4 text-[#C8A45C]" />
                  <span>التسجيل بحساب Google</span>
                </span>
                <input
                  type="checkbox"
                  checked={config.register.showGoogleButton}
                  onChange={(e) => updateRegister("showGoogleButton", e.target.checked)}
                  className="w-4 h-4 accent-[#C8A45C] rounded cursor-pointer"
                />
              </div>
              {config.register.showGoogleButton && (
                <div>
                  <label className="block text-xs text-zinc-400 mb-1">نص زر Google:</label>
                  <input
                    type="text"
                    value={config.register.googleButtonText}
                    onChange={(e) => updateRegister("googleButtonText", e.target.value)}
                    className="w-full bg-[#1E1E1E] border border-zinc-700 rounded-lg px-3 py-2 text-xs text-white focus:outline-none"
                  />
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* TAB 3: COLORS & STYLING */}
      {activeTab === "styles" && (
        <div className="space-y-6">
          {/* Presets Bar */}
          <div className="bg-[#242424] p-5 sm:p-6 rounded-2xl border border-zinc-800 space-y-3">
            <h3 className="text-sm font-bold text-white flex items-center gap-2">
              <Sparkles className="w-4 h-4 text-[#C8A45C]" />
              <span>أنماط لونية جاهزة بضغطة واحدة (Presets)</span>
            </h3>
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3">
              {COLOR_PRESETS.map((preset, idx) => (
                <button
                  key={idx}
                  type="button"
                  onClick={() => {
                    setConfig((prev) => ({
                      ...prev,
                      common: {
                        ...prev.common,
                        styles: { ...preset.theme },
                      },
                    }));
                    toast.success(`تم تطبيق نمط: ${preset.name}`);
                  }}
                  className="p-3 bg-[#1E1E1E] hover:bg-[#282828] border border-zinc-700 rounded-xl text-right transition group flex flex-col gap-2"
                >
                  <div className="flex items-center gap-1.5">
                    <span
                      className="w-4 h-4 rounded-full border border-white/20 shrink-0"
                      style={{ backgroundColor: preset.theme.buttonBgColor }}
                    />
                    <span
                      className="w-4 h-4 rounded-full border border-white/20 shrink-0"
                      style={{ backgroundColor: preset.theme.titleColor }}
                    />
                    <span
                      className="w-4 h-4 rounded-full border border-white/20 shrink-0"
                      style={{ backgroundColor: preset.theme.inputBgColor }}
                    />
                  </div>
                  <span className="text-xs font-bold text-zinc-300 group-hover:text-white transition">
                    {preset.name}
                  </span>
                </button>
              ))}
            </div>
          </div>

          {/* Common General Texts */}
          <div className="bg-[#242424] p-5 sm:p-6 rounded-2xl border border-zinc-800 space-y-3">
            <h3 className="text-sm font-bold text-white flex items-center gap-2">
              <ArrowRight className="w-4 h-4 text-[#C8A45C]" />
              <span>نصوص مشتركة</span>
            </h3>
            <div className="max-w-md">
              <label className="block text-xs font-semibold text-zinc-300 mb-1.5">
                نص زر العودة للصفحة الرئيسية
              </label>
              <input
                type="text"
                value={config.common.backToHomeText}
                onChange={(e) => updateCommon("backToHomeText", e.target.value)}
                className="w-full bg-[#1E1E1E] border border-zinc-700 rounded-xl px-3.5 py-2 text-xs text-white focus:outline-none focus:border-[#C8A45C]"
                placeholder="العودة للصفحة الرئيسية"
              />
            </div>
          </div>

          {/* Custom Color Palette Form */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {/* Color 1: Title Color */}
            <div className="bg-[#242424] p-4 rounded-2xl border border-zinc-800 space-y-2">
              <div className="flex items-center justify-between">
                <label className="text-xs font-bold text-white">لون العناوين الرئيسية</label>
                <div
                  className="w-6 h-6 rounded-lg border border-zinc-600 shadow-sm"
                  style={{ backgroundColor: config.common.styles.titleColor }}
                />
              </div>
              <div className="flex items-center gap-2">
                <input
                  type="color"
                  value={config.common.styles.titleColor}
                  onChange={(e) => updateStyles("titleColor", e.target.value)}
                  className="w-9 h-9 rounded-lg cursor-pointer bg-transparent border-0 p-0"
                />
                <input
                  type="text"
                  value={config.common.styles.titleColor}
                  onChange={(e) => updateStyles("titleColor", e.target.value)}
                  className="flex-1 bg-[#1E1E1E] border border-zinc-700 rounded-lg px-2.5 py-1.5 text-xs text-white font-mono uppercase"
                />
              </div>
            </div>

            {/* Color 2: Subtitle Color */}
            <div className="bg-[#242424] p-4 rounded-2xl border border-zinc-800 space-y-2">
              <div className="flex items-center justify-between">
                <label className="text-xs font-bold text-white">لون النصوص الفرعية</label>
                <div
                  className="w-6 h-6 rounded-lg border border-zinc-600 shadow-sm"
                  style={{ backgroundColor: config.common.styles.subtitleColor }}
                />
              </div>
              <div className="flex items-center gap-2">
                <input
                  type="color"
                  value={config.common.styles.subtitleColor}
                  onChange={(e) => updateStyles("subtitleColor", e.target.value)}
                  className="w-9 h-9 rounded-lg cursor-pointer bg-transparent border-0 p-0"
                />
                <input
                  type="text"
                  value={config.common.styles.subtitleColor}
                  onChange={(e) => updateStyles("subtitleColor", e.target.value)}
                  className="flex-1 bg-[#1E1E1E] border border-zinc-700 rounded-lg px-2.5 py-1.5 text-xs text-white font-mono uppercase"
                />
              </div>
            </div>

            {/* Color 3: Label Color */}
            <div className="bg-[#242424] p-4 rounded-2xl border border-zinc-800 space-y-2">
              <div className="flex items-center justify-between">
                <label className="text-xs font-bold text-white">لون تسميات الحقول (Labels)</label>
                <div
                  className="w-6 h-6 rounded-lg border border-zinc-600 shadow-sm"
                  style={{ backgroundColor: config.common.styles.labelColor }}
                />
              </div>
              <div className="flex items-center gap-2">
                <input
                  type="color"
                  value={config.common.styles.labelColor}
                  onChange={(e) => updateStyles("labelColor", e.target.value)}
                  className="w-9 h-9 rounded-lg cursor-pointer bg-transparent border-0 p-0"
                />
                <input
                  type="text"
                  value={config.common.styles.labelColor}
                  onChange={(e) => updateStyles("labelColor", e.target.value)}
                  className="flex-1 bg-[#1E1E1E] border border-zinc-700 rounded-lg px-2.5 py-1.5 text-xs text-white font-mono uppercase"
                />
              </div>
            </div>

            {/* Color 4: Input Text Color */}
            <div className="bg-[#242424] p-4 rounded-2xl border border-zinc-800 space-y-2">
              <div className="flex items-center justify-between">
                <label className="text-xs font-bold text-white">لون نص حقول الإدخال</label>
                <div
                  className="w-6 h-6 rounded-lg border border-zinc-600 shadow-sm"
                  style={{ backgroundColor: config.common.styles.inputTextColor }}
                />
              </div>
              <div className="flex items-center gap-2">
                <input
                  type="color"
                  value={config.common.styles.inputTextColor}
                  onChange={(e) => updateStyles("inputTextColor", e.target.value)}
                  className="w-9 h-9 rounded-lg cursor-pointer bg-transparent border-0 p-0"
                />
                <input
                  type="text"
                  value={config.common.styles.inputTextColor}
                  onChange={(e) => updateStyles("inputTextColor", e.target.value)}
                  className="flex-1 bg-[#1E1E1E] border border-zinc-700 rounded-lg px-2.5 py-1.5 text-xs text-white font-mono uppercase"
                />
              </div>
            </div>

            {/* Color 5: Input Bg Color */}
            <div className="bg-[#242424] p-4 rounded-2xl border border-zinc-800 space-y-2">
              <div className="flex items-center justify-between">
                <label className="text-xs font-bold text-white">خلفية حقول الإدخال</label>
                <div
                  className="w-6 h-6 rounded-lg border border-zinc-600 shadow-sm"
                  style={{ backgroundColor: config.common.styles.inputBgColor }}
                />
              </div>
              <div className="flex items-center gap-2">
                <input
                  type="color"
                  value={config.common.styles.inputBgColor}
                  onChange={(e) => updateStyles("inputBgColor", e.target.value)}
                  className="w-9 h-9 rounded-lg cursor-pointer bg-transparent border-0 p-0"
                />
                <input
                  type="text"
                  value={config.common.styles.inputBgColor}
                  onChange={(e) => updateStyles("inputBgColor", e.target.value)}
                  className="flex-1 bg-[#1E1E1E] border border-zinc-700 rounded-lg px-2.5 py-1.5 text-xs text-white font-mono uppercase"
                />
              </div>
            </div>

            {/* Color 6: Input Border Color */}
            <div className="bg-[#242424] p-4 rounded-2xl border border-zinc-800 space-y-2">
              <div className="flex items-center justify-between">
                <label className="text-xs font-bold text-white">حدود حقول الإدخال</label>
                <div
                  className="w-6 h-6 rounded-lg border border-zinc-600 shadow-sm"
                  style={{ backgroundColor: config.common.styles.inputBorderColor }}
                />
              </div>
              <div className="flex items-center gap-2">
                <input
                  type="color"
                  value={config.common.styles.inputBorderColor}
                  onChange={(e) => updateStyles("inputBorderColor", e.target.value)}
                  className="w-9 h-9 rounded-lg cursor-pointer bg-transparent border-0 p-0"
                />
                <input
                  type="text"
                  value={config.common.styles.inputBorderColor}
                  onChange={(e) => updateStyles("inputBorderColor", e.target.value)}
                  className="flex-1 bg-[#1E1E1E] border border-zinc-700 rounded-lg px-2.5 py-1.5 text-xs text-white font-mono uppercase"
                />
              </div>
            </div>

            {/* Color 7: Focus Border */}
            <div className="bg-[#242424] p-4 rounded-2xl border border-zinc-800 space-y-2">
              <div className="flex items-center justify-between">
                <label className="text-xs font-bold text-white">حدود الحقل عند التركيز (Focus)</label>
                <div
                  className="w-6 h-6 rounded-lg border border-zinc-600 shadow-sm"
                  style={{ backgroundColor: config.common.styles.inputFocusBorderColor }}
                />
              </div>
              <div className="flex items-center gap-2">
                <input
                  type="color"
                  value={config.common.styles.inputFocusBorderColor}
                  onChange={(e) => updateStyles("inputFocusBorderColor", e.target.value)}
                  className="w-9 h-9 rounded-lg cursor-pointer bg-transparent border-0 p-0"
                />
                <input
                  type="text"
                  value={config.common.styles.inputFocusBorderColor}
                  onChange={(e) => updateStyles("inputFocusBorderColor", e.target.value)}
                  className="flex-1 bg-[#1E1E1E] border border-zinc-700 rounded-lg px-2.5 py-1.5 text-xs text-white font-mono uppercase"
                />
              </div>
            </div>

            {/* Color 8: Button Bg */}
            <div className="bg-[#242424] p-4 rounded-2xl border border-zinc-800 space-y-2">
              <div className="flex items-center justify-between">
                <label className="text-xs font-bold text-white">لون خلفية الزر الأساسي</label>
                <div
                  className="w-6 h-6 rounded-lg border border-zinc-600 shadow-sm"
                  style={{ backgroundColor: config.common.styles.buttonBgColor }}
                />
              </div>
              <div className="flex items-center gap-2">
                <input
                  type="color"
                  value={config.common.styles.buttonBgColor}
                  onChange={(e) => updateStyles("buttonBgColor", e.target.value)}
                  className="w-9 h-9 rounded-lg cursor-pointer bg-transparent border-0 p-0"
                />
                <input
                  type="text"
                  value={config.common.styles.buttonBgColor}
                  onChange={(e) => updateStyles("buttonBgColor", e.target.value)}
                  className="flex-1 bg-[#1E1E1E] border border-zinc-700 rounded-lg px-2.5 py-1.5 text-xs text-white font-mono uppercase"
                />
              </div>
            </div>

            {/* Color 9: Button Text */}
            <div className="bg-[#242424] p-4 rounded-2xl border border-zinc-800 space-y-2">
              <div className="flex items-center justify-between">
                <label className="text-xs font-bold text-white">لون نص الزر الأساسي</label>
                <div
                  className="w-6 h-6 rounded-lg border border-zinc-600 shadow-sm"
                  style={{ backgroundColor: config.common.styles.buttonTextColor }}
                />
              </div>
              <div className="flex items-center gap-2">
                <input
                  type="color"
                  value={config.common.styles.buttonTextColor}
                  onChange={(e) => updateStyles("buttonTextColor", e.target.value)}
                  className="w-9 h-9 rounded-lg cursor-pointer bg-transparent border-0 p-0"
                />
                <input
                  type="text"
                  value={config.common.styles.buttonTextColor}
                  onChange={(e) => updateStyles("buttonTextColor", e.target.value)}
                  className="flex-1 bg-[#1E1E1E] border border-zinc-700 rounded-lg px-2.5 py-1.5 text-xs text-white font-mono uppercase"
                />
              </div>
            </div>

            {/* Color 10: Button Hover */}
            <div className="bg-[#242424] p-4 rounded-2xl border border-zinc-800 space-y-2">
              <div className="flex items-center justify-between">
                <label className="text-xs font-bold text-white">لون الزر عند التحويم (Hover)</label>
                <div
                  className="w-6 h-6 rounded-lg border border-zinc-600 shadow-sm"
                  style={{ backgroundColor: config.common.styles.buttonHoverColor }}
                />
              </div>
              <div className="flex items-center gap-2">
                <input
                  type="color"
                  value={config.common.styles.buttonHoverColor}
                  onChange={(e) => updateStyles("buttonHoverColor", e.target.value)}
                  className="w-9 h-9 rounded-lg cursor-pointer bg-transparent border-0 p-0"
                />
                <input
                  type="text"
                  value={config.common.styles.buttonHoverColor}
                  onChange={(e) => updateStyles("buttonHoverColor", e.target.value)}
                  className="flex-1 bg-[#1E1E1E] border border-zinc-700 rounded-lg px-2.5 py-1.5 text-xs text-white font-mono uppercase"
                />
              </div>
            </div>

            {/* Color 11: Branding Panel Bg */}
            <div className="bg-[#242424] p-4 rounded-2xl border border-zinc-800 space-y-2">
              <div className="flex items-center justify-between">
                <label className="text-xs font-bold text-white">خلفية لوحة العلامة التجارية</label>
                <div
                  className="w-6 h-6 rounded-lg border border-zinc-600 shadow-sm"
                  style={{ backgroundColor: config.common.styles.brandingBgColor }}
                />
              </div>
              <div className="flex items-center gap-2">
                <input
                  type="color"
                  value={config.common.styles.brandingBgColor}
                  onChange={(e) => updateStyles("brandingBgColor", e.target.value)}
                  className="w-9 h-9 rounded-lg cursor-pointer bg-transparent border-0 p-0"
                />
                <input
                  type="text"
                  value={config.common.styles.brandingBgColor}
                  onChange={(e) => updateStyles("brandingBgColor", e.target.value)}
                  className="flex-1 bg-[#1E1E1E] border border-zinc-700 rounded-lg px-2.5 py-1.5 text-xs text-white font-mono uppercase"
                />
              </div>
            </div>

            {/* Color 12: Branding Text */}
            <div className="bg-[#242424] p-4 rounded-2xl border border-zinc-800 space-y-2">
              <div className="flex items-center justify-between">
                <label className="text-xs font-bold text-white">نصوص لوحة العلامة التجارية</label>
                <div
                  className="w-6 h-6 rounded-lg border border-zinc-600 shadow-sm"
                  style={{ backgroundColor: config.common.styles.brandingTextColor }}
                />
              </div>
              <div className="flex items-center gap-2">
                <input
                  type="color"
                  value={config.common.styles.brandingTextColor}
                  onChange={(e) => updateStyles("brandingTextColor", e.target.value)}
                  className="w-9 h-9 rounded-lg cursor-pointer bg-transparent border-0 p-0"
                />
                <input
                  type="text"
                  value={config.common.styles.brandingTextColor}
                  onChange={(e) => updateStyles("brandingTextColor", e.target.value)}
                  className="flex-1 bg-[#1E1E1E] border border-zinc-700 rounded-lg px-2.5 py-1.5 text-xs text-white font-mono uppercase"
                />
              </div>
            </div>
          </div>
        </div>
      )}

      {/* TAB 4: LIVE PREVIEW */}
      {activeTab === "preview" && (
        <div className="space-y-6">
          <div className="flex items-center justify-between bg-[#242424] p-4 rounded-xl border border-zinc-800">
            <span className="text-xs font-bold text-zinc-300">اختر الصفحة المراد معاينتها:</span>
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => setPreviewMode("login")}
                className={`px-3 py-1.5 text-xs font-bold rounded-lg transition ${
                  previewMode === "login"
                    ? "bg-[#C8A45C] text-zinc-950"
                    : "bg-[#1E1E1E] text-zinc-300 hover:bg-zinc-800"
                }`}
              >
                صفحة الدخول (/login)
              </button>
              <button
                type="button"
                onClick={() => setPreviewMode("register")}
                className={`px-3 py-1.5 text-xs font-bold rounded-lg transition ${
                  previewMode === "register"
                    ? "bg-[#C8A45C] text-zinc-950"
                    : "bg-[#1E1E1E] text-zinc-300 hover:bg-zinc-800"
                }`}
              >
                صفحة إنشاء الحساب (/register)
              </button>
            </div>
          </div>

          {/* Interactive Simulation Frame */}
          <div className="p-4 sm:p-8 bg-[#121212] rounded-3xl border border-zinc-800 flex justify-center">
            {previewMode === "login" ? (
              <div className="w-full max-w-3xl bg-[#1E1E1E] rounded-3xl overflow-hidden shadow-2xl border border-zinc-800 flex flex-col md:flex-row">
                {/* Branding Side */}
                <div
                  className="w-full md:w-5/12 p-6 flex flex-col justify-between items-center text-center relative overflow-hidden"
                  style={{
                    backgroundColor: config.common.styles.brandingBgColor,
                    color: config.common.styles.brandingTextColor,
                  }}
                >
                  <div className="my-auto py-4 flex flex-col items-center z-10 w-full">
                    <div className="w-14 h-14 rounded-2xl bg-white/20 flex items-center justify-center mb-3">
                      {renderDynamicIcon(config.login.branding.icon, "w-7 h-7 text-white")}
                    </div>
                    <h3 className="text-xl font-black mb-1">{config.login.branding.title}</h3>
                    <p className="text-xs opacity-90 mb-4">{config.login.branding.subtitle}</p>

                    <div className="flex flex-col gap-2 w-full text-right">
                      {config.login.branding.benefits.map((b, i) => (
                        <div key={i} className="flex items-center gap-2 bg-black/15 px-3 py-1.5 rounded-lg text-xs font-semibold">
                          {renderDynamicIcon(b.icon, "w-3.5 h-3.5 shrink-0")}
                          <span>{b.text}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>

                {/* Form Side */}
                <div className="w-full md:w-7/12 p-6 sm:p-8 flex flex-col justify-center">
                  <h2 className="text-2xl font-black mb-1" style={{ color: config.common.styles.titleColor }}>
                    {config.login.title}
                  </h2>
                  <p className="text-xs mb-6" style={{ color: config.common.styles.subtitleColor }}>
                    {config.login.subtitle}
                  </p>

                  <div className="space-y-4">
                    <div>
                      <label className="block text-xs font-semibold mb-1" style={{ color: config.common.styles.labelColor }}>
                        {config.login.fields.usernameLabel}
                      </label>
                      <input
                        type="text"
                        readOnly
                        placeholder={config.login.fields.usernamePlaceholder}
                        className="w-full rounded-xl px-3.5 py-2.5 text-xs transition"
                        style={{
                          backgroundColor: config.common.styles.inputBgColor,
                          color: config.common.styles.inputTextColor,
                          borderColor: config.common.styles.inputBorderColor,
                          borderWidth: "1px",
                        }}
                      />
                    </div>

                    <div>
                      <div className="flex items-center justify-between mb-1">
                        <label className="text-xs font-semibold" style={{ color: config.common.styles.labelColor }}>
                          {config.login.fields.passwordLabel}
                        </label>
                        {config.login.fields.showForgotPassword && (
                          <span className="text-[11px] cursor-pointer" style={{ color: config.common.styles.titleColor }}>
                            {config.login.fields.forgotPasswordText}
                          </span>
                        )}
                      </div>
                      <input
                        type="password"
                        readOnly
                        value="password123"
                        className="w-full rounded-xl px-3.5 py-2.5 text-xs transition"
                        style={{
                          backgroundColor: config.common.styles.inputBgColor,
                          color: config.common.styles.inputTextColor,
                          borderColor: config.common.styles.inputBorderColor,
                          borderWidth: "1px",
                        }}
                      />
                    </div>

                    <button
                      type="button"
                      className="w-full font-black py-3 px-4 rounded-xl text-xs flex items-center justify-center gap-2 shadow-md transition"
                      style={{
                        backgroundColor: config.common.styles.buttonBgColor,
                        color: config.common.styles.buttonTextColor,
                      }}
                    >
                      <LogIn className="w-4 h-4" />
                      <span>{config.login.fields.submitButtonText}</span>
                    </button>

                    {config.login.showDivider && (
                      <div className="relative flex items-center justify-center my-3">
                        <div className="border-t border-zinc-700 w-full" />
                        <span className="bg-[#1E1E1E] px-3 text-[11px] text-zinc-400 absolute">
                          {config.login.dividerText}
                        </span>
                      </div>
                    )}

                    {config.login.showGoogleButton && (
                      <button
                        type="button"
                        className="w-full bg-zinc-800 hover:bg-zinc-700 text-white font-semibold py-2.5 px-3 rounded-xl text-xs border border-zinc-700 flex items-center justify-center gap-2"
                      >
                        <Sparkles className="w-3.5 h-3.5 text-blue-400" />
                        <span>{config.login.googleButtonText}</span>
                      </button>
                    )}

                    <div className="text-center pt-2">
                      <span className="text-xs text-zinc-400">
                        {config.login.fields.switchToRegisterText}{" "}
                        <span className="font-bold underline cursor-pointer" style={{ color: config.common.styles.titleColor }}>
                          {config.login.fields.switchToRegisterLink}
                        </span>
                      </span>
                    </div>
                  </div>
                </div>
              </div>
            ) : (
              <div className="w-full max-w-3xl bg-[#1E1E1E] rounded-3xl overflow-hidden shadow-2xl border border-zinc-800 flex flex-col md:flex-row">
                {/* Branding Side */}
                <div
                  className="w-full md:w-5/12 p-6 flex flex-col justify-between items-center text-center relative overflow-hidden"
                  style={{
                    backgroundColor: config.common.styles.brandingBgColor,
                    color: config.common.styles.brandingTextColor,
                  }}
                >
                  <div className="my-auto py-4 flex flex-col items-center z-10 w-full">
                    <div className="w-14 h-14 rounded-2xl bg-white/20 flex items-center justify-center mb-3">
                      {renderDynamicIcon(config.register.branding.icon, "w-7 h-7 text-white")}
                    </div>
                    <h3 className="text-xl font-black mb-1">{config.register.branding.title}</h3>
                    <p className="text-xs opacity-90 mb-4">{config.register.branding.subtitle}</p>

                    <div className="flex flex-col gap-2 w-full text-right">
                      {config.register.branding.benefits.map((b, i) => (
                        <div key={i} className="flex items-center gap-2 bg-black/15 px-3 py-1.5 rounded-lg text-xs font-semibold">
                          {renderDynamicIcon(b.icon, "w-3.5 h-3.5 shrink-0")}
                          <span>{b.text}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>

                {/* Form Side */}
                <div className="w-full md:w-7/12 p-6 sm:p-8 flex flex-col justify-center">
                  <h2 className="text-2xl font-black mb-1" style={{ color: config.common.styles.titleColor }}>
                    {config.register.title}
                  </h2>
                  <p className="text-xs mb-4" style={{ color: config.common.styles.subtitleColor }}>
                    {config.register.subtitle}
                  </p>

                  <div className="space-y-3">
                    <div>
                      <label className="block text-xs font-semibold mb-1" style={{ color: config.common.styles.labelColor }}>
                        {config.register.fields.usernameLabel}
                      </label>
                      <input
                        type="text"
                        readOnly
                        placeholder={config.register.fields.usernamePlaceholder}
                        className="w-full rounded-xl px-3.5 py-2 text-xs"
                        style={{
                          backgroundColor: config.common.styles.inputBgColor,
                          color: config.common.styles.inputTextColor,
                          borderColor: config.common.styles.inputBorderColor,
                          borderWidth: "1px",
                        }}
                      />
                    </div>

                    <div>
                      <label className="block text-xs font-semibold mb-1" style={{ color: config.common.styles.labelColor }}>
                        {config.register.fields.emailLabel}
                      </label>
                      <input
                        type="email"
                        readOnly
                        placeholder={config.register.fields.emailPlaceholder}
                        className="w-full rounded-xl px-3.5 py-2 text-xs"
                        style={{
                          backgroundColor: config.common.styles.inputBgColor,
                          color: config.common.styles.inputTextColor,
                          borderColor: config.common.styles.inputBorderColor,
                          borderWidth: "1px",
                        }}
                      />
                    </div>

                    <div>
                      <label className="block text-xs font-semibold mb-1" style={{ color: config.common.styles.labelColor }}>
                        {config.register.fields.passwordLabel}
                      </label>
                      <input
                        type="password"
                        readOnly
                        value="Password@123"
                        className="w-full rounded-xl px-3.5 py-2 text-xs"
                        style={{
                          backgroundColor: config.common.styles.inputBgColor,
                          color: config.common.styles.inputTextColor,
                          borderColor: config.common.styles.inputBorderColor,
                          borderWidth: "1px",
                        }}
                      />
                    </div>

                    {/* Requirements mini-box */}
                    {config.register.passwordRequirements.enabled && (
                      <div className="p-3 rounded-xl bg-black/20 border border-zinc-700/60 space-y-1.5 text-[11px]">
                        <span className="font-bold text-zinc-300 block mb-1">
                          {config.register.passwordRequirements.title}
                        </span>
                        <div className="grid grid-cols-2 gap-1 text-emerald-400">
                          {config.register.passwordRequirements.showMinLength && (
                            <div className="flex items-center gap-1">
                              <Check className="w-3 h-3" />
                              <span>{config.register.passwordRequirements.minLength} أحرف على الأقل</span>
                            </div>
                          )}
                          {config.register.passwordRequirements.showUppercase && (
                            <div className="flex items-center gap-1">
                              <Check className="w-3 h-3" />
                              <span>{config.register.passwordRequirements.uppercaseText}</span>
                            </div>
                          )}
                          {config.register.passwordRequirements.showLowercase && (
                            <div className="flex items-center gap-1">
                              <Check className="w-3 h-3" />
                              <span>{config.register.passwordRequirements.lowercaseText}</span>
                            </div>
                          )}
                          {config.register.passwordRequirements.showNumber && (
                            <div className="flex items-center gap-1">
                              <Check className="w-3 h-3" />
                              <span>{config.register.passwordRequirements.numberText}</span>
                            </div>
                          )}
                        </div>
                      </div>
                    )}

                    <button
                      type="button"
                      className="w-full font-black py-2.5 px-4 rounded-xl text-xs flex items-center justify-center gap-2 shadow-md transition"
                      style={{
                        backgroundColor: config.common.styles.buttonBgColor,
                        color: config.common.styles.buttonTextColor,
                      }}
                    >
                      <UserPlus className="w-4 h-4" />
                      <span>{config.register.fields.submitButtonText}</span>
                    </button>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
