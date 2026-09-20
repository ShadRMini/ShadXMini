import React from "react";
import { apiFetch } from "./api-client";
import {
  LogIn,
  UserPlus,
  Shield,
  ShieldCheck,
  Zap,
  Headphones,
  Package,
  Sparkles,
  KeyRound,
  Lock,
  User,
  Mail,
  CheckCircle2,
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

export function renderAuthIcon(iconName: string, className = "w-5 h-5") {
  const iconMap: Record<string, React.ComponentType<{ className?: string }>> = {
    LogIn,
    UserPlus,
    Shield,
    ShieldCheck,
    Zap,
    Headphones,
    Package,
    Sparkles,
    KeyRound,
    Lock,
    User,
    Mail,
  };

  const Component = iconMap[iconName] || CheckCircle2;
  return React.createElement(Component, { className });
}

export async function fetchAuthPagesConfig(baseUrl: string): Promise<{
  config: AuthPagesConfig;
  useLegacy: boolean;
}> {
  try {
    const data = await apiFetch<any>("/api/public/auth-pages-config");
    if (data) {
      return {
        config: data.config ? { ...DEFAULT_AUTH_PAGES_CONFIG, ...data.config } : DEFAULT_AUTH_PAGES_CONFIG,
        useLegacy: data.use_legacy_auth_pages === true || data.use_legacy_auth_pages === "true",
      };
    }
  } catch (e) {
    console.warn("Failed to fetch auth pages config, falling back to defaults:", e);
  }
  return {
    config: DEFAULT_AUTH_PAGES_CONFIG,
    useLegacy: false,
  };
}
