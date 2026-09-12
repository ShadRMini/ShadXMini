import React from "react";
import { useLocation, Link } from "wouter";
import { Lock, LogIn } from "lucide-react";
import { useStoreSettings } from "@/lib/store-settings-context";

interface LoginRequiredModalProps {
  isOpen: boolean;
  onClose: () => void;
  title?: string;
  message?: string;
  loginButtonText?: string;
  cancelButtonText?: string;
  registerLinkText?: string;
  redirectUrl?: string;
}

export default function LoginRequiredModal({
  isOpen,
  onClose,
  title,
  message,
  loginButtonText,
  cancelButtonText,
  registerLinkText,
  redirectUrl,
}: LoginRequiredModalProps) {
  const [, setLocation] = useLocation();
  const storeSettings = useStoreSettings();

  if (!isOpen) return null;

  const displayTitle =
    title ||
    storeSettings.guest_preview_title ||
    storeSettings.guestPreviewTitle ||
    "تسجيل الدخول مطلوب";

  const displayMessage =
    message ||
    storeSettings.guest_preview_message ||
    storeSettings.guest_preview_subtitle ||
    storeSettings.guestPreviewSubtitle ||
    "للمتابعة في عملية الشراء، يجب عليك تسجيل الدخول إلى حسابك أولاً.";

  const displayLoginBtn =
    loginButtonText ||
    storeSettings.guest_preview_login_btn ||
    storeSettings.guest_preview_login_button ||
    storeSettings.guestPreviewLoginButton ||
    "تسجيل الدخول";

  const displayCancelBtn =
    cancelButtonText ||
    storeSettings.guest_preview_cancel_btn ||
    "لاحقاً";

  const displayRegisterLink =
    registerLinkText ||
    storeSettings.guest_preview_register_link ||
    "ليس لديك حساب؟ إنشاء حساب جديد";

  const handleLoginClick = () => {
    if (redirectUrl) {
      try {
        sessionStorage.setItem("redirect_after_login", redirectUrl);
      } catch {
        // ignore
      }
    }
    onClose();
    setLocation("/login");
  };

  const handleRegisterClick = () => {
    if (redirectUrl) {
      try {
        sessionStorage.setItem("redirect_after_login", redirectUrl);
      } catch {
        // ignore
      }
    }
    onClose();
    setLocation("/register");
  };

  return (
    <div
      className="fixed inset-0 z-[9999] bg-black/75 backdrop-blur-sm flex items-center justify-center p-4 animate-in fade-in duration-200"
      dir="rtl"
    >
      <div
        className="max-w-md w-full rounded-3xl p-6 sm:p-8 text-center shadow-2xl relative border animate-in zoom-in-95 duration-200"
        style={{
          backgroundColor: "var(--theme-card, #242424)",
          borderColor: "var(--theme-accent, #C8A45C)",
          color: "var(--theme-text-primary, #FFFFFF)",
        }}
      >
        {/* أيقونة القفل */}
        <div
          className="w-20 h-20 mx-auto rounded-full flex items-center justify-center mb-4 border"
          style={{
            backgroundColor: "rgba(200, 164, 92, 0.15)",
            borderColor: "var(--theme-primary, #C8A45C)",
          }}
        >
          <Lock size={40} style={{ color: "var(--theme-primary, #C8A45C)" }} />
        </div>

        {/* العنوان */}
        <h2
          className="text-2xl font-black mb-3 tracking-wide"
          style={{ color: "var(--theme-primary, #FDE68A)" }}
        >
          {displayTitle}
        </h2>

        {/* النص التوضيحي */}
        <p
          className="text-sm mb-6 leading-relaxed"
          style={{ color: "var(--theme-text-muted, #9CA3AF)" }}
        >
          {displayMessage}
        </p>

        {/* الأزرار */}
        <div className="flex gap-3">
          <button
            onClick={handleLoginClick}
            className="flex-1 py-3 rounded-xl font-bold text-sm flex items-center justify-center gap-2 transition active:scale-95 cursor-pointer shadow-lg"
            style={{
              backgroundColor: "var(--theme-primary, #C8A45C)",
              color: "var(--theme-text-on-primary, #1A1A1A)",
            }}
          >
            <LogIn size={16} />
            {displayLoginBtn}
          </button>

          <button
            onClick={onClose}
            className="flex-1 py-3 rounded-xl font-bold text-sm transition active:scale-95 cursor-pointer"
            style={{
              backgroundColor: "var(--theme-background, #1A1A1A)",
              color: "var(--theme-text-primary, #FFFFFF)",
              border: "1px solid var(--theme-secondary, rgba(200,164,92,0.4))",
            }}
          >
            {displayCancelBtn}
          </button>
        </div>

        {/* رابط إنشاء حساب */}
        <button
          onClick={handleRegisterClick}
          className="block w-full mt-5 text-sm hover:underline cursor-pointer transition text-center"
          style={{ color: "var(--theme-primary, #C8A45C)" }}
        >
          {displayRegisterLink.includes("؟") ? (
            <>
              {displayRegisterLink.split("؟")[0]}؟{" "}
              <strong>{displayRegisterLink.split("؟")[1]?.trim() || "إنشاء حساب جديد"}</strong>
            </>
          ) : (
            <strong>{displayRegisterLink}</strong>
          )}
        </button>
      </div>
    </div>
  );
}
