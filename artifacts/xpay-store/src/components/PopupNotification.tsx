import React, { useEffect, useState } from "react";
import { useAuth } from "@/lib/auth-context";
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

function apiBaseUrl() {
  return (import.meta.env.VITE_API_URL || "").replace(/\/+$/, "");
}

export function PopupNotification() {
  const { user } = useAuth();
  const [settings, setSettings] = useState<PopupSettings | null>(null);
  const [isOpen, setIsOpen] = useState(false);

  useEffect(() => {
    if (!user) return; // Only show for logged in users

    const baseUrl = apiBaseUrl();
    fetch(`${baseUrl}/api/public/popup-settings`)
      .then((res) => (res.ok ? res.json() : null))
      .then((data) => {
        if (data && data.popupEnabled) {
          const storageKey = `xpay_popup_seen_${user.id}_${data.popupTitle || "default"}`;
          const alreadySeen = localStorage.getItem(storageKey);
          
          if (data.popupShowOnlyOnce && alreadySeen) {
            setIsOpen(false);
          } else {
            setSettings(data);
            setIsOpen(true);
          }
        }
      })
      .catch((err) => {
        console.error("Failed to load popup settings:", err);
      });
  }, [user]);

  if (!isOpen || !settings || !user) return null;

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
      <div className="w-full max-w-lg rounded-2xl border border-[#C8A45C] bg-[#1A1A1A] p-6 text-right shadow-2xl relative overflow-hidden">
        {/* Top absolute close icon */}
        <button
          onClick={handleCloseAll}
          className="absolute top-4 left-4 h-9 w-9 rounded-full bg-[#2D2D2D] border border-[#C8A45C]/30 flex items-center justify-center text-[#E5E7EB] hover:bg-[#C8A45C]/20 hover:text-[#C8A45C] transition-all"
          aria-label="إغلاق"
        >
          <X className="w-5 h-5" />
        </button>

        {/* Icon / Badge */}
        <div className="flex items-center gap-3 mb-4">
          <div className="h-12 w-12 rounded-2xl bg-[#C8A45C]/15 border border-[#C8A45C]/40 flex items-center justify-center text-[#C8A45C] shadow-inner">
            <Bell className="w-6 h-6 animate-bounce" />
          </div>
          <div>
            <span className="text-[11px] px-2.5 py-0.5 rounded-full bg-[#C8A45C]/20 border border-[#C8A45C]/30 text-[#FDE68A] font-bold">
              إشعار هام للمستخدمين
            </span>
            <h3 className="text-xl font-black text-[#C8A45C] mt-1">{settings.popupTitle}</h3>
          </div>
        </div>

        {/* Optional Image */}
        {settings.popupImage && (
          <div className="mb-4 rounded-xl overflow-hidden border border-[#C8A45C]/30 max-h-56 bg-black/40 flex items-center justify-center">
            <img src={settings.popupImage} alt="Popup" className="w-full h-full object-cover max-h-56" />
          </div>
        )}

        {/* Content Description */}
        <div className="text-sm sm:text-base text-[#E5E7EB] leading-relaxed whitespace-pre-line bg-[#2D2D2D]/60 p-4 rounded-xl border border-zinc-700/50 mb-5">
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
              className="flex items-center justify-center gap-2 w-full py-3 px-4 rounded-xl bg-gradient-to-r from-[#C8A45C] to-[#B8954A] text-black font-extrabold shadow-lg hover:opacity-90 transition-all text-sm"
            >
              <span>{settings.popupLinkText}</span>
              <ExternalLink className="w-4 h-4" />
            </a>
          </div>
        )}

        {/* Action Buttons */}
        <div className="grid grid-cols-3 gap-2.5 pt-2 border-t border-zinc-800">
          <button
            onClick={handleCloseAll}
            className="py-2.5 px-3 rounded-xl bg-[#2D2D2D] border border-zinc-700 text-xs sm:text-sm font-bold text-zinc-300 hover:bg-zinc-800 hover:text-white transition-all text-center"
          >
            {settings.popupButtonCloseText || "إغلاق الكل"}
          </button>
          <button
            onClick={handleRead}
            className="py-2.5 px-3 rounded-xl bg-[#2D2D2D] border border-[#C8A45C]/40 text-xs sm:text-sm font-bold text-[#C8A45C] hover:bg-[#C8A45C]/15 transition-all text-center flex items-center justify-center gap-1.5"
          >
            <CheckCircle2 className="w-4 h-4" />
            <span>{settings.popupButtonReadText || "قراءة الكل"}</span>
          </button>
          <button
            onClick={settings.popupLinkUrl ? handleView : handleCloseAll}
            className="py-2.5 px-3 rounded-xl bg-[#C8A45C] text-black text-xs sm:text-sm font-black hover:bg-[#D9B56D] transition-all text-center shadow-md"
          >
            {settings.popupButtonViewText || "عرض الكل"}
          </button>
        </div>
      </div>
    </div>
  );
}
