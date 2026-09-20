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
  popupButtonReadText: string;
  popupButtonViewText: string;
  popupShowOnlyOnce: boolean;
}

export function PopupNotification() {
  const { user } = useAuth();
  const { popupSettings } = useAppData();
  const [isOpen, setIsOpen] = useState(false);

  useEffect(() => {
    if (!user || !popupSettings) {
      setIsOpen(false);
      return;
    }

    if (popupSettings.popupEnabled) {
      const storageKey = `xpay_popup_seen_${user.id}_${popupSettings.popupTitle || "default"}`;
      const alreadySeen = localStorage.getItem(storageKey);
      
      if (popupSettings.popupShowOnlyOnce && alreadySeen) {
        setIsOpen(false);
      } else {
        setIsOpen(true);
      }
    } else {
      setIsOpen(false);
    }
  }, [user, popupSettings]);

  if (!isOpen || !popupSettings || !user) return null;

  const settings: PopupSettings = popupSettings;

  const markAsSeen = () => {
    const storageKey = `xpay_popup_seen_${user.id}_${settings.popupTitle || "default"}`;
    try {
      localStorage.setItem(storageKey, "true");
    } catch {}
    setIsOpen(false);
  };

  const handleCloseAll = () => {
    markAsSeen();
    toast.success("تم إغلاق التنبيه بنجاح");
  };

  const handleRead = () => {
    markAsSeen();
    toast.success("تم تحديث حالة الإشعار كمقروء");
  };

  const handleView = () => {
    markAsSeen();
    if (settings.popupLinkUrl) {
      window.open(settings.popupLinkUrl, "_blank");
    }
  };

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/75 p-4 backdrop-blur-md animate-in fade-in duration-200" dir="rtl">
      <div
        className="w-full max-w-lg rounded-2xl border p-6 text-right shadow-2xl relative overflow-hidden"
        style={{
          backgroundColor: "var(--theme-card)",
          borderColor: "var(--theme-border)",
        }}
      >
        {/* Top absolute close icon */}
        <button
          onClick={handleCloseAll}
          className="absolute top-4 left-4 h-9 w-9 rounded-full border flex items-center justify-center transition-all cursor-pointer"
          style={{
            backgroundColor: "var(--theme-card)",
            borderColor: "var(--theme-border)",
            color: "var(--theme-text-primary)",
          }}
          aria-label="إغلاق"
        >
          <X className="w-5 h-5" />
        </button>

        {/* Icon / Badge */}
        <div className="flex items-center gap-3 mb-4">
          <div
            className="h-12 w-12 rounded-2xl border flex items-center justify-center shadow-inner"
            style={{
              backgroundColor: "rgba(200, 164, 92, 0.15)",
              borderColor: "var(--theme-border)",
              color: "var(--theme-primary)",
            }}
          >
            <Bell className="w-6 h-6 animate-bounce" />
          </div>
          <div>
            <span
              className="text-[11px] px-2.5 py-0.5 rounded-full border font-bold"
              style={{
                backgroundColor: "rgba(200, 164, 92, 0.2)",
                borderColor: "var(--theme-border)",
                color: "var(--theme-accent)",
              }}
            >
              إشعار هام للمستخدمين
            </span>
            <h3 className="text-xl font-black mt-1" style={{ color: "var(--theme-primary)" }}>{settings.popupTitle}</h3>
          </div>
        </div>

        {/* Optional Image */}
        {settings.popupImage && (
          <div className="mb-4 rounded-xl overflow-hidden border max-h-56 bg-black/40 flex items-center justify-center" style={{ borderColor: "var(--theme-border, rgba(200,164,92,0.3))" }}>
            <img src={settings.popupImage} alt="Popup" className="w-full h-full object-cover max-h-56" />
          </div>
        )}

        {/* Content Description */}
        <div
          className="text-sm sm:text-base leading-relaxed whitespace-pre-line p-4 rounded-xl border mb-5"
          style={{
            backgroundColor: "rgba(255,255,255,0.03)",
            borderColor: "var(--theme-border)",
            color: "var(--theme-text-primary)",
          }}
        >
          {settings.popupContent}
        </div>

        {/* Link if provided */}
        {settings.popupLinkUrl && settings.popupLinkText && (
          <div className="mb-6">
            <a
              href={settings.popupLinkUrl}
              target="_blank"
              rel="noreferrer"
              onClick={handleView}
              className="flex items-center justify-center gap-2 w-full py-3 px-4 rounded-xl text-black font-extrabold shadow-lg hover:opacity-90 transition-all text-sm"
              style={{
                backgroundColor: "var(--theme-primary)",
              }}
            >
              <span>{settings.popupLinkText}</span>
              <ExternalLink className="w-4 h-4" />
            </a>
          </div>
        )}

        {/* Action Buttons */}
        <div className="grid grid-cols-3 gap-2.5 pt-2 border-t" style={{ borderColor: "var(--theme-border)" }}>
          <button
            onClick={handleCloseAll}
            className="py-2.5 px-3 rounded-xl border text-xs sm:text-sm font-bold transition-all text-center cursor-pointer"
            style={{
              backgroundColor: "var(--theme-card)",
              borderColor: "var(--theme-border)",
              color: "var(--theme-text-muted)",
            }}
          >
            {settings.popupButtonCloseText || "إغلاق الكل"}
          </button>
          <button
            onClick={handleRead}
            className="py-2.5 px-3 rounded-xl border text-xs sm:text-sm font-bold transition-all text-center flex items-center justify-center gap-1.5 cursor-pointer"
            style={{
              backgroundColor: "var(--theme-card)",
              borderColor: "var(--theme-border)",
              color: "var(--theme-primary)",
            }}
          >
            <CheckCircle2 className="w-4 h-4" />
            <span>{settings.popupButtonReadText || "قراءة الكل"}</span>
          </button>
          <button
            onClick={settings.popupLinkUrl ? handleView : handleCloseAll}
            className="py-2.5 px-3 rounded-xl text-black text-xs sm:text-sm font-black transition-all text-center shadow-md cursor-pointer"
            style={{
              backgroundColor: "var(--theme-primary)",
            }}
          >
            {settings.popupButtonViewText || "عرض الكل"}
          </button>
        </div>
      </div>
    </div>
  );
}
