import React, { useEffect, useState } from "react";
import { useAuth } from "@/lib/auth-context";
import { useAppData } from "@/contexts/AppDataContext";
import { ExternalLink, X, Bell, CheckCircle2 } from "lucide-react";
import { toast } from "sonner";

interface PopupSettings {
  popupEnabled: boolean;
  popupTitle: string;
  popupContent: string;
  popupImage: string;
  popupLinkUrl: string;
  popupLinkText: string;
  popupButtonCloseText: string;
  popupButtonViewText: string;
  popupShowOnlyOnce: boolean;
  popupDelaySeconds?: number;
  popupStartDate?: string | null;
  popupEndDate?: string | null;
  popupShowTo?: "all" | "logged_in" | "guest";
}

export function PopupNotification() {
  const { user } = useAuth();
  const { popupSettings } = useAppData();
  const [isOpen, setIsOpen] = useState(false);

  useEffect(() => {
    if (!popupSettings) {
      setIsOpen(false);
      return;
    }

    if (!popupSettings.popupEnabled) {
      setIsOpen(false);
      return;
    }

    // 1) فحص الاستهداف
    const showTo = popupSettings.popupShowTo ?? "all";
    const isLoggedIn = !!user;
    if (showTo === "logged_in" && !isLoggedIn) {
      setIsOpen(false);
      return;
    }
    if (showTo === "guest" && isLoggedIn) {
      setIsOpen(false);
      return;
    }

    // 2) فحص الجدولة
    const now = Date.now();
    if (popupSettings.popupStartDate) {
      const start = new Date(popupSettings.popupStartDate).getTime();
      if (Number.isFinite(start) && now < start) {
        setIsOpen(false);
        return;
      }
    }
    if (popupSettings.popupEndDate) {
      const end = new Date(popupSettings.popupEndDate).getTime();
      if (Number.isFinite(end) && now > end) {
        setIsOpen(false);
        return;
      }
    }

    // 3) فحص "شوهد سابقاً"
    const userId = user?.id ?? "guest";
    const storageKey = `xpay_popup_seen_${userId}_${popupSettings.popupTitle || "default"}`;
    const alreadySeen = localStorage.getItem(storageKey);
    if (popupSettings.popupShowOnlyOnce && alreadySeen) {
      setIsOpen(false);
      return;
    }

    // 4) تأخير الظهور
    const delay = Math.max(0, Math.min(30, popupSettings.popupDelaySeconds ?? 0));
    if (delay === 0) {
      setIsOpen(true);
      return;
    }
    const timer = setTimeout(() => setIsOpen(true), delay * 1000);
    return () => clearTimeout(timer);
  }, [user, popupSettings]);

  if (!isOpen || !popupSettings) return null;

  const settings: PopupSettings = popupSettings;

  const markAsSeen = () => {
    const userId = user?.id ?? "guest";
    const storageKey = `xpay_popup_seen_${userId}_${settings.popupTitle || "default"}`;
    try {
      localStorage.setItem(storageKey, "true");
    } catch {}
    setIsOpen(false);
  };

  const handleCloseAll = () => {
    markAsSeen();
    toast.success("تم إغلاق التنبيه بنجاح");
  };

  const handleView = () => {
    markAsSeen();
    if (settings.popupLinkUrl) {
      window.open(settings.popupLinkUrl, "_blank");
    }
  };

  return (
    <div
      className="fixed inset-0 z-[100] flex items-center justify-center p-4"
      dir="rtl"
      style={{ backgroundColor: "rgba(0, 0, 0, 0.8)", backdropFilter: "blur(8px)" }}
      onClick={handleCloseAll}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        className="w-full max-w-lg rounded-3xl overflow-hidden shadow-2xl animate-in fade-in zoom-in-95 duration-200 relative"
        style={{
          background: "linear-gradient(135deg, var(--theme-card, #1A1A1A) 0%, var(--theme-background, #0a0a0a) 100%)",
          border: "1.5px solid color-mix(in srgb, var(--theme-primary, #C8A45C) 40%, transparent)",
          boxShadow: "0 25px 60px -15px color-mix(in srgb, var(--theme-primary, #C8A45C) 25%, transparent), 0 0 0 1px color-mix(in srgb, var(--theme-primary, #C8A45C) 10%, transparent)",
        }}
      >
        {/* زر الإغلاق — أعلى اليسار (RTL) */}
        <button
          onClick={handleCloseAll}
          className="absolute top-3 left-3 z-10 h-9 w-9 rounded-full flex items-center justify-center transition-all cursor-pointer hover:scale-110"
          style={{
            backgroundColor: "rgba(0, 0, 0, 0.6)",
            border: "1px solid color-mix(in srgb, var(--theme-primary, #C8A45C) 30%, transparent)",
            color: "var(--theme-primary, #C8A45C)",
          }}
          aria-label="إغلاق"
        >
          <X className="w-4 h-4" />
        </button>

        {/* الصورة (اختيارية) */}
        {settings.popupImage && (
          <div className="relative w-full h-44 sm:h-52 bg-gradient-to-br from-zinc-900 to-black overflow-hidden">
            <img
              src={settings.popupImage}
              alt=""
              className="w-full h-full object-cover"
              loading="eager"
            />
            <div
              className="absolute inset-0 pointer-events-none"
              style={{
                background: "linear-gradient(to bottom, transparent 60%, var(--theme-card, #1A1A1A) 100%)",
              }}
            />
          </div>
        )}

        {/* المحتوى */}
        <div className={`px-6 sm:px-7 ${settings.popupImage ? "-mt-8 relative" : "pt-8"} pb-6`}>
          {/* شارة علوية */}
          <div className="flex justify-center mb-4">
            <span
              className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-[11px] font-bold"
              style={{
                backgroundColor: "color-mix(in srgb, var(--theme-primary, #C8A45C) 12%, transparent)",
                border: "1px solid color-mix(in srgb, var(--theme-primary, #C8A45C) 35%, transparent)",
                color: "var(--theme-accent, #FDE68A)",
              }}
            >
              <Bell className="w-3 h-3" />
              إشعار هام
            </span>
          </div>

          {/* العنوان */}
          <h3
            className="text-xl sm:text-2xl font-black text-center mb-3 leading-tight"
            style={{
              background: "linear-gradient(135deg, var(--theme-accent, #FDE68A) 0%, var(--theme-primary, #C8A45C) 100%)",
              WebkitBackgroundClip: "text",
              WebkitTextFillColor: "transparent",
              backgroundClip: "text",
            }}
          >
            {settings.popupTitle}
          </h3>

          {/* فاصل ذهبي مزخرف */}
          <div className="flex items-center justify-center gap-2 mb-4">
            <div className="h-px w-8" style={{ background: "linear-gradient(to right, transparent, var(--theme-primary, #C8A45C))" }} />
            <div className="w-1.5 h-1.5 rounded-full" style={{ background: "var(--theme-primary, #C8A45C)" }} />
            <div className="h-px w-8" style={{ background: "linear-gradient(to left, transparent, var(--theme-primary, #C8A45C))" }} />
          </div>

          {/* النص */}
          <div
            className="text-sm sm:text-base leading-relaxed whitespace-pre-line text-center mb-6 px-2"
            style={{ color: "var(--theme-text-primary, #E5E7EB)" }}
          >
            {settings.popupContent}
          </div>

          {/* زر CTA (رابط خارجي إن وُجد) */}
          {settings.popupLinkUrl && settings.popupLinkText ? (
            <a
              href={settings.popupLinkUrl}
              target="_blank"
              rel="noreferrer"
              onClick={handleView}
              className="flex items-center justify-center gap-2 w-full py-3.5 px-5 rounded-2xl font-black text-sm sm:text-base transition-all hover:scale-[1.02] active:scale-95 mb-2 cursor-pointer"
              style={{
                background: "linear-gradient(135deg, var(--theme-accent, #FDE68A) 0%, var(--theme-primary, #C8A45C) 100%)",
                color: "var(--theme-background, #0a0a0a)",
                boxShadow: "0 8px 24px -8px color-mix(in srgb, var(--theme-primary, #C8A45C) 60%, transparent)",
              }}
            >
              <span>{settings.popupLinkText}</span>
              <ExternalLink className="w-4 h-4" />
            </a>
          ) : (
            <button
              onClick={handleCloseAll}
              className="flex items-center justify-center gap-2 w-full py-3.5 px-5 rounded-2xl font-black text-sm sm:text-base transition-all hover:scale-[1.02] active:scale-95 mb-2 cursor-pointer"
              style={{
                background: "linear-gradient(135deg, var(--theme-accent, #FDE68A) 0%, var(--theme-primary, #C8A45C) 100%)",
                color: "var(--theme-background, #0a0a0a)",
                boxShadow: "0 8px 24px -8px color-mix(in srgb, var(--theme-primary, #C8A45C) 60%, transparent)",
              }}
            >
              <CheckCircle2 className="w-4 h-4" />
              <span>{settings.popupButtonViewText || "موافق"}</span>
            </button>
          )}

          {/* زر الإغلاق النصي */}
          <button
            onClick={handleCloseAll}
            className="w-full py-2 text-xs sm:text-sm font-bold transition-opacity hover:opacity-70 cursor-pointer"
            style={{ color: "var(--theme-text-muted, #9CA3AF)" }}
          >
            {settings.popupButtonCloseText || "إغلاق"}
          </button>
        </div>
      </div>
    </div>
  );
}
