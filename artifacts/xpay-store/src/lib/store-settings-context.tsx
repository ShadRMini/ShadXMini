import React, { createContext, useContext, useEffect, useState } from "react";
import { getPublicJson } from "./public-api";

export interface StoreSettings {
  siteName: string;
  brandLogoUrl: string;
  themeLogoSize: string;
  adminLoginTitle: string;
  adminLoginSubtitle: string;
  adminDashboardWelcome: string;
  aboutTitle: string;
  aboutContent: string;
  contactPhone: string;
  contactEmail: string;
  contactTelegram: string;
  guestPreviewEnabled: boolean;
  guest_preview_enabled: boolean;
  guestPreviewTitle: string;
  guest_preview_title: string;
  guestPreviewSubtitle: string;
  guest_preview_subtitle: string;
  guestPreviewLoginButton: string;
  guest_preview_login_button: string;
  guestPreviewRegisterButton: string;
  guest_preview_register_button: string;
  guestPreviewNote: string;
  guest_preview_note: string;
  [key: string]: any;
}

const defaultStoreSettings: StoreSettings = {
  siteName: "ShadMini",
  brandLogoUrl: "",
  themeLogoSize: "80px",
  adminLoginTitle: "ShadMini",
  adminLoginSubtitle: "لوحة الإدارة الفاخرة",
  adminDashboardWelcome: "مرحبًا بك في لوحة إدارة ShadMini",
  aboutTitle: "من نحن",
  aboutContent: "",
  contactPhone: "",
  contactEmail: "",
  contactTelegram: "",
  guestPreviewEnabled: false,
  guest_preview_enabled: false,
  guestPreviewTitle: "مرحباً بك في ShadMini",
  guest_preview_title: "مرحباً بك في ShadMini",
  guestPreviewSubtitle: "استعرض الأقسام الآن، وسجّل دخولك للاستفادة من كل المزايا",
  guest_preview_subtitle: "استعرض الأقسام الآن، وسجّل دخولك للاستفادة من كل المزايا",
  guestPreviewLoginButton: "تسجيل الدخول",
  guest_preview_login_button: "تسجيل الدخول",
  guestPreviewRegisterButton: "إنشاء حساب جديد",
  guest_preview_register_button: "إنشاء حساب جديد",
  guestPreviewNote: "لا يمكنك الشراء أو استخدام المتجر بدون حساب. اضغط على أي قسم أو منتج للتسجيل.",
  guest_preview_note: "لا يمكنك الشراء أو استخدام المتجر بدون حساب. اضغط على أي قسم أو منتج للتسجيل.",
};

const StoreSettingsContext = createContext<StoreSettings>(defaultStoreSettings);

export function StoreSettingsProvider({ children }: { children: React.ReactNode }) {
  const [settings, setSettings] = useState<StoreSettings>(defaultStoreSettings);

  const fetchSettings = () => {
    getPublicJson<any>("/settings/public")
      .then((data) => {
        if (data) {
          const sName = String(data.siteName || data.site_name || data.storeName || data.store_name || "ShadMini").trim();
          const bLogo = String(data.brandLogoUrl || data.brand_logo_url || data.siteLogo || data.site_logo || "").trim();
          const lSize = String(data.theme_logo_size || data.logoSize || "80px").trim();

          setSettings((prev) => ({
            ...prev,
            ...data,
            siteName: sName || "ShadMini",
            brandLogoUrl: bLogo,
            themeLogoSize: lSize,
          }));

          // Synchronize document title with dynamic store name
          if (sName) {
            document.title = sName;
          }
        }
      })
      .catch(() => {
        // Fallback to app-settings
        getPublicJson<any>("/app-settings")
          .then((data) => {
            if (data) {
              const sName = String(data.siteName || data.site_name || "ShadMini").trim();
              const bLogo = String(data.brandLogoUrl || data.brand_logo_url || data.siteLogo || data.site_logo || "").trim();
              const lSize = String(data.theme_logo_size || data.logoSize || "80px").trim();

              setSettings((prev) => ({
                ...prev,
                ...data,
                siteName: sName || "ShadMini",
                brandLogoUrl: bLogo,
                themeLogoSize: lSize,
              }));

              if (sName) {
                document.title = sName;
              }
            }
          })
          .catch(() => {});
      });
  };

  useEffect(() => {
    fetchSettings();

    // Listen for storage or focus events to refresh branding if updated
    const handleStorage = (e: StorageEvent) => {
      if (e.key === "site_name" || e.key === "store_name" || e.key === "brand_logo_url") {
        fetchSettings();
      }
    };
    window.addEventListener("storage", handleStorage);
    window.addEventListener("focus", fetchSettings);

    return () => {
      window.removeEventListener("storage", handleStorage);
      window.removeEventListener("focus", fetchSettings);
    };
  }, []);

  return (
    <StoreSettingsContext.Provider value={settings}>
      {children}
    </StoreSettingsContext.Provider>
  );
}

export function useStoreSettings(): StoreSettings {
  return useContext(StoreSettingsContext);
}
